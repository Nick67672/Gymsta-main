import { Share, Clipboard, Platform, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';

export interface ShareableContent {
  id: string;
  type: 'post' | 'workout';
  title?: string;
  description?: string;
  imageUrl?: string;
  authorUsername?: string;
  authorId?: string;
  url?: string;
  metadata?: {
    exerciseCount?: number;
    totalVolume?: number;
    totalSets?: number;
    duration?: number;
    likes?: number;
    comments?: number;
  };
}

export interface ShareResult {
  success: boolean;
  platform?: string;
  error?: string;
}

export class SharingService {
  private static instance: SharingService;
  
  public static getInstance(): SharingService {
    if (!SharingService.instance) {
      SharingService.instance = new SharingService();
    }
    return SharingService.instance;
  }

  /**
   * Generate a shareable URL for content
   */
  private generateShareUrl(content: ShareableContent): string {
    const baseUrl = 'https://gymsta.app';
    
    if (content.url) {
      return content.url;
    }
    
    if (content.type === 'post') {
      return `${baseUrl}/post/${content.id}`;
    } else if (content.type === 'workout') {
      return `${baseUrl}/workout/${content.id}`;
    }
    
    return baseUrl;
  }

  /**
   * Generate share text based on content type
   */
  private generateShareText(content: ShareableContent): string {
    const baseText = content.description || 
      (content.type === 'workout' ? 'Check out my workout on Gymsta!' : 'Check out this post on Gymsta!');
    
    const url = this.generateShareUrl(content);
    
    if (content.type === 'workout' && content.metadata) {
      const { exerciseCount, totalVolume, totalSets } = content.metadata;
      let workoutText = baseText;
      
      if (exerciseCount) {
        workoutText += `\n\n💪 ${exerciseCount} exercises`;
      }
      if (totalSets) {
        workoutText += ` • ${totalSets} sets`;
      }
      if (totalVolume) {
        workoutText += ` • ${this.formatVolume(totalVolume)} total volume`;
      }
      
      workoutText += `\n\n${url}`;
      return workoutText;
    }
    
    return `${baseText}\n\n${url}`;
  }

  /**
   * Format volume for display
   */
  private formatVolume(volume: number): string {
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}k kg`;
    }
    return `${volume} kg`;
  }

  /**
   * Share content using native share dialog
   */
  async shareContent(content: ShareableContent): Promise<ShareResult> {
    try {
      const shareText = this.generateShareText(content);
      const url = this.generateShareUrl(content);
      
      const shareContent = {
        title: content.title || `Check out this ${content.type} by ${content.authorUsername || 'a Gymsta user'}`,
        message: shareText,
        url: url,
      };

      const result = await Share.share(shareContent);
      
      if (result.action === Share.sharedAction) {
        // Track the share
        await this.trackShare(content, 'external_share', result.activityType || 'native_share');
        
        if (Platform.OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
        return {
          success: true,
          platform: result.activityType || 'native_share'
        };
      }
      
      return { success: false };
    } catch (error) {
      console.error('Error sharing content:', error);
      return {
        success: false,
        error: 'Failed to share content'
      };
    }
  }

  /**
   * Share to specific social media platforms
   */
  async shareToSocialMedia(content: ShareableContent, platform: 'instagram' | 'twitter' | 'facebook' | 'whatsapp' | 'telegram'): Promise<ShareResult> {
    try {
      const shareText = this.generateShareText(content);
      const url = this.generateShareUrl(content);
      
      let shareUrl: string;
      
      switch (platform) {
        case 'twitter':
          const twitterText = encodeURIComponent(shareText);
          shareUrl = `https://twitter.com/intent/tweet?text=${twitterText}`;
          break;
          
        case 'facebook':
          shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
          break;
          
        case 'whatsapp':
          const whatsappText = encodeURIComponent(shareText);
          shareUrl = `whatsapp://send?text=${whatsappText}`;
          break;
          
        case 'telegram':
          const telegramText = encodeURIComponent(shareText);
          shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${telegramText}`;
          break;
          
        case 'instagram':
          // Instagram doesn't support direct sharing via URL, so we'll copy to clipboard
          await Clipboard.setString(shareText);
          if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          Alert.alert(
            'Instagram Sharing',
            'Content copied to clipboard! Open Instagram and paste it in your story or post.',
            [{ text: 'OK' }]
          );
          await this.trackShare(content, 'external_share', 'instagram');
          return { success: true, platform: 'instagram' };
          
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }
      
      const supported = await Linking.canOpenURL(shareUrl);
      if (supported) {
        await Linking.openURL(shareUrl);
        await this.trackShare(content, 'external_share', platform);
        
        if (Platform.OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
        return { success: true, platform };
      } else {
        throw new Error(`Cannot open ${platform} app`);
      }
    } catch (error) {
      console.error(`Error sharing to ${platform}:`, error);
      return {
        success: false,
        error: `Failed to share to ${platform}`
      };
    }
  }

  /**
   * Copy content link to clipboard
   */
  async copyLink(content: ShareableContent): Promise<ShareResult> {
    try {
      const url = this.generateShareUrl(content);
      await Clipboard.setString(url);
      
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      await this.trackShare(content, 'copy_link', 'clipboard');
      
      return { success: true, platform: 'clipboard' };
    } catch (error) {
      console.error('Error copying link:', error);
      return {
        success: false,
        error: 'Failed to copy link'
      };
    }
  }

  /**
   * Share content via email
   */
  async shareViaEmail(content: ShareableContent): Promise<ShareResult> {
    try {
      const shareText = this.generateShareText(content);
      const url = this.generateShareUrl(content);
      
      const emailUrl = `mailto:?subject=${encodeURIComponent(content.title || `Check out this ${content.type} on Gymsta`)}&body=${encodeURIComponent(shareText)}`;
      
      const supported = await Linking.canOpenURL(emailUrl);
      if (supported) {
        await Linking.openURL(emailUrl);
        await this.trackShare(content, 'external_share', 'email');
        
        if (Platform.OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
        return { success: true, platform: 'email' };
      } else {
        throw new Error('No email app available');
      }
    } catch (error) {
      console.error('Error sharing via email:', error);
      return {
        success: false,
        error: 'Failed to share via email'
      };
    }
  }

  /**
   * Share content to specific users via in-app messaging
   */
  async shareToUsers(content: ShareableContent, userIds: string[], message?: string): Promise<ShareResult[]> {
    const results: ShareResult[] = [];
    
    for (const userId of userIds) {
      try {
        await this.shareToUser(content, userId, message);
        results.push({ success: true, platform: 'in_app_message' });
      } catch (error) {
        console.error(`Error sharing to user ${userId}:`, error);
        results.push({ 
          success: false, 
          error: `Failed to share to user ${userId}` 
        });
      }
    }
    
    return results;
  }

  /**
   * Share content to a single user via in-app messaging
   */
  private async shareToUser(content: ShareableContent, userId: string, message?: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Find or create chat
    let chatId: string | null = null;

    const { data: currentUserChats, error: currentChatsErr } = await supabase
      .from('a_chat_users')
      .select('chat_id')
      .eq('user_id', user.id);

    if (currentChatsErr) throw currentChatsErr;

    const { data: targetUserChats, error: targetChatsErr } = await supabase
      .from('a_chat_users')
      .select('chat_id')
      .eq('user_id', userId);

    if (targetChatsErr) throw targetChatsErr;

    // Find existing chat
    const existingChat = currentUserChats?.find(chat => 
      targetUserChats?.some(targetChat => targetChat.chat_id === chat.chat_id)
    );

    if (existingChat) {
      chatId = existingChat.chat_id;
    } else {
      // Create new chat
      const { data: newChat, error: createChatError } = await supabase
        .from('a_chat')
        .insert({
          created_by: user.id,
          last_message: `Shared a ${content.type}.`,
          last_message_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (createChatError) throw createChatError;
      chatId = newChat.id;

      // Add users to chat
      const { error: addUsersError } = await supabase
        .from('a_chat_users')
        .insert([
          { chat_id: chatId, user_id: user.id },
          { chat_id: chatId, user_id: userId }
        ]);

      if (addUsersError) throw addUsersError;
    }

    // Send message with shared content
    const messageData = {
      chat_id: chatId,
      sender_id: user.id,
      message: message || `Check out this ${content.type}!`,
      message_type: content.type === 'workout' ? 'workout_share' : 'post_share',
      post_id: content.type === 'post' ? content.id : null,
      workout_id: content.type === 'workout' ? content.id : null,
    };

    const { error: messageError } = await supabase
      .from('a_chat_messages')
      .insert(messageData);

    if (messageError) throw messageError;

    // Update last message
    await supabase
      .from('a_chat')
      .update({ 
        last_message: `Shared a ${content.type}.`,
        last_message_at: new Date().toISOString()
      })
      .eq('id', chatId);

    // Track the share
    await this.trackShare(content, 'direct_message', 'chat', userId);
  }

  /**
   * Track sharing activity in database
   */
  private async trackShare(
    content: ShareableContent, 
    shareType: string, 
    shareMedium: string, 
    recipientId?: string
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const shareData: any = {
        sharer_id: user.id,
        share_type: shareType,
        share_medium: shareMedium,
        message: content.description || null,
      };

      if (content.type === 'post') {
        shareData.post_id = content.id;
      } else if (content.type === 'workout') {
        shareData.workout_id = content.id;
      }

      if (recipientId) {
        shareData.recipient_id = recipientId;
      }

      await supabase.from('content_shares').insert(shareData);
    } catch (error) {
      console.error('Error tracking share:', error);
      // Don't throw error as tracking is not critical
    }
  }

  /**
   * Get sharing statistics for content
   */
  async getShareStats(contentId: string, contentType: 'post' | 'workout'): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('content_shares')
        .select('*')
        .eq(contentType === 'post' ? 'post_id' : 'workout_id', contentId);

      if (error) throw error;

      const stats = {
        totalShares: data?.length || 0,
        byPlatform: {} as Record<string, number>,
        byType: {} as Record<string, number>,
        recentShares: data?.slice(-5) || []
      };

      data?.forEach(share => {
        // Count by platform
        const platform = share.share_medium || 'unknown';
        stats.byPlatform[platform] = (stats.byPlatform[platform] || 0) + 1;

        // Count by type
        const type = share.share_type || 'unknown';
        stats.byType[type] = (stats.byType[type] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error getting share stats:', error);
      return {
        totalShares: 0,
        byPlatform: {},
        byType: {},
        recentShares: []
      };
    }
  }
}

export default SharingService.getInstance(); 