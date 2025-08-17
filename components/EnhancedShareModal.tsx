import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
  Animated,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  X, 
  Send, 
  CheckCircle, 
  Search, 
  Copy,
  Instagram,
  Facebook,
  Twitter,
  MessageSquare,
  Mail,
  Users,
  Globe,
  Share2,
  Zap,
  ExternalLink,
  MessageCircle,
  Heart,
  Bookmark,
  MoreHorizontal,
  ChevronRight,
  Lock,
  UserPlus,
  Link,
  Smartphone,
  Monitor,
  Tablet,
  SmartphoneIcon,
  MonitorIcon,
  TabletIcon,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Profile } from '@/types/social';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import sharingService, { ShareableContent } from '@/lib/sharingService';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { getAvatarUrl } from '@/lib/avatarUtils';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenHeight < 700;
const isMediumScreen = screenHeight >= 700 && screenHeight < 800;

interface EnhancedShareModalProps {
  content: ShareableContent;
  onClose: () => void;
  colors: any;
}

interface ShareOption {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  action: () => void;
  type: 'internal' | 'external' | 'social';
}

interface RecentShare {
  id: string;
  username: string;
  avatar_url: string;
  shared_at: string;
  platform: string;
}

export const EnhancedShareModal: React.FC<EnhancedShareModalProps> = ({ 
  content, 
  onClose, 
  colors 
}) => {
  const insets = useSafeAreaInsets();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'friends' | 'social' | 'external'>('friends');
  const [following, setFollowing] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareStats, setShareStats] = useState<any>(null);
  const [showShareStats, setShowShareStats] = useState(false);
  const [recentShares, setRecentShares] = useState<RecentShare[]>([]);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load following list
      const { data: followingData, error: followingError } = await supabase
        .from('follows')
        .select(`
          followed_id,
          profiles!follows_followed_id_fkey (
            id,
            username,
            avatar_url,
            is_verified
          )
        `)
        .eq('follower_id', currentUser?.id)
        .eq('status', 'accepted');

      if (followingError) throw followingError;

      const followingProfiles = followingData?.map(item => item.profiles).filter(Boolean) as unknown as Profile[];
      setFollowing(followingProfiles);

      // Load share stats
      const stats = await sharingService.getShareStats(content.id, content.type);
      setShareStats(stats);

      // Load recent shares
      const { data: recentSharesData, error: recentSharesError } = await supabase
        .from('post_shares')
        .select(`
          id,
          created_at,
          share_medium,
          profiles!post_shares_sharer_id_fkey (
            username,
            avatar_url
          )
        `)
        .eq('post_id', content.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!recentSharesError && recentSharesData) {
        const recent = recentSharesData.map((share: any) => {
          const rawProfile = (share as any).profiles;
          const profile = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile;
          return {
            id: share.id,
            username: profile?.username || 'Unknown',
            avatar_url: profile?.avatar_url || '',
            shared_at: share.created_at,
            platform: share.share_medium || 'unknown',
          };
        });
        setRecentShares(recent);
      }
    } catch (error) {
      console.error('Error loading share modal data:', error);
    }
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleToggleUser = (user: Profile) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const handleDirectMessage = async () => {
    if (selectedUsers.length === 0 || !currentUser) {
      Alert.alert('No Recipients', 'Please select at least one person to share with.');
      return;
    }

    setIsSending(true);
    
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      const userIds = selectedUsers.map(user => user.id).filter(Boolean) as string[];
      const results = await sharingService.shareToUsers(content, userIds, message);
      
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;
      
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      if (successCount > 0) {
        Alert.alert(
          'Content Shared! 🎉',
          failureCount > 0 
            ? `Successfully shared with ${successCount} ${successCount === 1 ? 'person' : 'people'}. ${failureCount} ${failureCount === 1 ? 'share' : 'shares'} failed.`
            : `Successfully shared with ${selectedUsers.map((u) => u.username).join(', ')}.`,
          [{ text: 'OK', onPress: handleClose }]
        );
      } else {
        Alert.alert(
          'Sharing Failed',
          'All shares failed. Please check your connection and try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error sharing content:', error);
      setIsSending(false);
      
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      Alert.alert(
        'Sharing Failed',
        'There was an error sharing the content. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleSocialShare = async (platform: 'instagram' | 'twitter' | 'facebook' | 'whatsapp' | 'telegram') => {
    setIsSharing(true);
    
    try {
      const result = await sharingService.shareToSocialMedia(content, platform);
      
      if (result.success) {
        if (Platform.OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
        // Reload share stats
        const stats = await sharingService.getShareStats(content.id, content.type);
        setShareStats(stats);
      } else {
        Alert.alert('Sharing Failed', result.error || 'Failed to share content');
      }
    } catch (error) {
      console.error(`Error sharing to ${platform}:`, error);
      Alert.alert('Sharing Failed', `Failed to share to ${platform}`);
    } finally {
      setIsSharing(false);
    }
  };

  const handleExternalShare = async () => {
    setIsSharing(true);
    
    try {
      const result = await sharingService.shareContent(content);
      
      if (result.success) {
        if (Platform.OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
        // Reload share stats
        const stats = await sharingService.getShareStats(content.id, content.type);
        setShareStats(stats);
      }
    } catch (error) {
      console.error('Error sharing externally:', error);
      Alert.alert('Sharing Failed', 'Failed to share content');
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      const result = await sharingService.copyLink(content);
      
      if (result.success) {
        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        Alert.alert('Link Copied! 📋', 'Content link copied to clipboard');
      } else {
        Alert.alert('Copy Failed', result.error || 'Failed to copy link');
      }
    } catch (error) {
      console.error('Error copying link:', error);
      Alert.alert('Copy Failed', 'Failed to copy link');
    }
  };

  const handleEmailShare = async () => {
    try {
      const result = await sharingService.shareViaEmail(content);
      
      if (result.success) {
        if (Platform.OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        Alert.alert('Email Share Failed', result.error || 'Failed to share via email');
      }
    } catch (error) {
      console.error('Error sharing via email:', error);
      Alert.alert('Email Share Failed', 'Failed to share via email');
    }
  };

  const filteredFollowing = following.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const socialShareOptions: ShareOption[] = [
    {
      id: 'instagram',
      title: 'Instagram',
      subtitle: 'Share to your story or post',
      icon: <Instagram size={24} color="#FFFFFF" />,
      color: '#E4405F',
      action: () => handleSocialShare('instagram'),
      type: 'social',
    },
    {
      id: 'twitter',
      title: 'Twitter',
      subtitle: 'Share to your timeline',
      icon: <Twitter size={24} color="#FFFFFF" />,
      color: '#1DA1F2',
      action: () => handleSocialShare('twitter'),
      type: 'social',
    },
    {
      id: 'facebook',
      title: 'Facebook',
      subtitle: 'Share to your wall',
      icon: <Facebook size={24} color="#FFFFFF" />,
      color: '#1877F2',
      action: () => handleSocialShare('facebook'),
      type: 'social',
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp',
      subtitle: 'Send to contacts',
      icon: <MessageSquare size={24} color="#FFFFFF" />,
      color: '#25D366',
      action: () => handleSocialShare('whatsapp'),
      type: 'social',
    },
    {
      id: 'telegram',
      title: 'Telegram',
      subtitle: 'Send to channels or chats',
      icon: <Send size={24} color="#FFFFFF" />,
      color: '#0088CC',
      action: () => handleSocialShare('telegram'),
      type: 'social',
    },
  ];

  const externalShareOptions: ShareOption[] = [
    {
      id: 'native',
      title: 'More Options',
      subtitle: 'Use system share sheet',
      icon: <Share2 size={24} color="#FFFFFF" />,
      color: '#6366F1',
      action: handleExternalShare,
      type: 'external',
    },
    {
      id: 'copy',
      title: 'Copy Link',
      subtitle: 'Copy to clipboard',
      icon: <Copy size={24} color="#FFFFFF" />,
      color: '#10B981',
      action: handleCopyLink,
      type: 'external',
    },
    {
      id: 'email',
      title: 'Email',
      subtitle: 'Send via email',
      icon: <Mail size={24} color="#FFFFFF" />,
      color: '#F59E0B',
      action: handleEmailShare,
      type: 'external',
    },
  ];

  const renderUserItem = ({ item }: { item: Profile }) => {
    const isSelected = selectedUsers.some(user => user.id === item.id);
    
    return (
      <TouchableOpacity
        style={[
          styles.userItem,
          { backgroundColor: isSelected ? colors.tint + '15' : 'transparent' }
        ]}
        onPress={() => handleToggleUser(item)}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Image
          source={{ uri: getAvatarUrl(item.avatar_url, item.username) }}
          style={styles.userAvatar}
        />
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.text }]}>
            {item.username}
          </Text>
          {item.is_verified && (
            <View style={styles.verifiedIcon}>
              <CheckCircle size={16} color={colors.tint} />
            </View>
          )}
        </View>
        <View style={[
          styles.checkmark,
          { backgroundColor: isSelected ? colors.tint : 'transparent' }
        ]}>
          {isSelected && <CheckCircle size={16} color="#FFFFFF" />}
        </View>
      </TouchableOpacity>
    );
  };

  const renderShareOption = ({ item }: { item: ShareOption }) => (
    <TouchableOpacity
      style={[styles.shareOption, { backgroundColor: item.color }]}
      onPress={item.action}
      activeOpacity={0.8}
    >
      <View style={styles.shareOptionIcon}>
        {item.icon}
      </View>
      <View style={styles.shareOptionText}>
        <Text style={styles.shareOptionTitle}>{item.title}</Text>
        {item.subtitle && (
          <Text style={styles.shareOptionSubtitle}>{item.subtitle}</Text>
        )}
      </View>
      <ChevronRight size={20} color="#FFFFFF" />
    </TouchableOpacity>
  );

  const renderShareStats = () => {
    if (!shareStats) return null;

    return (
      <View style={[styles.statsContainer, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={styles.statsHeader}
          onPress={() => setShowShareStats(!showShareStats)}
        >
          <View style={styles.statsInfo}>
            <Text style={[styles.statsTitle, { color: colors.text }]}>
              Share Statistics
            </Text>
            <Text style={[styles.statsSubtitle, { color: colors.textSecondary }]}>
              {shareStats.total_shares || 0} total shares
            </Text>
          </View>
          <ChevronRight 
            size={20} 
            color={colors.textSecondary}
            style={[
              styles.statsChevron,
              { transform: [{ rotate: showShareStats ? '90deg' : '0deg' }] }
            ]}
          />
        </TouchableOpacity>

        {showShareStats && (
          <View style={styles.statsDetails}>
            <View style={styles.statsSection}>
              <Text style={[styles.statsSectionTitle, { color: colors.text }]}>
                Share Breakdown
              </Text>
              <View style={styles.statsRow}>
                <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>
                  External shares
                </Text>
                <Text style={[styles.statsValue, { color: colors.text }]}>
                  {shareStats.external_shares || 0}
                </Text>
              </View>
              <View style={styles.statsRow}>
                <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>
                  Direct messages
                </Text>
                <Text style={[styles.statsValue, { color: colors.text }]}>
                  {shareStats.direct_shares || 0}
                </Text>
              </View>
              <View style={styles.statsRow}>
                <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>
                  Copy links
                </Text>
                <Text style={[styles.statsValue, { color: colors.text }]}>
                  {shareStats.copy_shares || 0}
                </Text>
              </View>
            </View>

            {recentShares.length > 0 && (
              <View style={styles.statsSection}>
                <Text style={[styles.statsSectionTitle, { color: colors.text }]}>
                  Recent Shares
                </Text>
                {recentShares.map((share) => (
                  <View key={share.id} style={styles.recentShare}>
                    <Image
                      source={{ uri: getAvatarUrl(share.avatar_url, share.username) }}
                      style={styles.recentShareAvatar}
                    />
                    <View style={styles.recentShareInfo}>
                      <Text style={[styles.recentShareUser, { color: colors.text }]}>
                        {share.username}
                      </Text>
                      <Text style={[styles.recentSharePlatform, { color: colors.textSecondary }]}>
                        via {share.platform}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={true}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={handleClose}
        />
        
        <Animated.View 
          style={[
            styles.modalContainer,
            {
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ]
            }
          ]}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                        <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20} 
              style={{ flex: 1 }}
            >
              {/* Drag Handle */}
              <View style={styles.dragHandle}>
                <View style={[styles.dragIndicator, { backgroundColor: colors.border }]} />
              </View>
              
              {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <TouchableOpacity 
                  onPress={handleClose} 
                  style={styles.closeButton} 
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.headerCenter}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                  Share {content.type === 'workout' ? 'Workout' : 'Post'}
                </Text>
                <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                  {content.authorUsername ? `by ${content.authorUsername}` : ''}
                </Text>
              </View>
              
              <View style={styles.headerRight}>
                <TouchableOpacity 
                  style={[styles.sendButton, { backgroundColor: colors.tint }]}
                  onPress={activeTab === 'friends' ? handleDirectMessage : handleExternalShare}
                  disabled={activeTab === 'friends' ? selectedUsers.length === 0 || isSending : isSharing}
                >
                  {isSending || isSharing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Send size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {renderShareStats()}

            {/* Tabs */}
            <View style={[styles.tabContainer, { borderBottomColor: colors.border }]}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'friends' && { borderBottomColor: colors.tint }
                ]}
                onPress={() => setActiveTab('friends')}
              >
                <Users size={20} color={activeTab === 'friends' ? colors.tint : colors.textSecondary} />
                <Text style={[
                  styles.tabText,
                  { color: activeTab === 'friends' ? colors.tint : colors.textSecondary }
                ]}>
                  Friends
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'social' && { borderBottomColor: colors.tint }
                ]}
                onPress={() => setActiveTab('social')}
              >
                <Globe size={20} color={activeTab === 'social' ? colors.tint : colors.textSecondary} />
                <Text style={[
                  styles.tabText,
                  { color: activeTab === 'social' ? colors.tint : colors.textSecondary }
                ]}>
                  Social
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'external' && { borderBottomColor: colors.tint }
                ]}
                onPress={() => setActiveTab('external')}
              >
                <ExternalLink size={20} color={activeTab === 'external' ? colors.tint : colors.textSecondary} />
                <Text style={[
                  styles.tabText,
                  { color: activeTab === 'external' ? colors.tint : colors.textSecondary }
                ]}>
                  More
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tab Content */}
            <View style={[styles.tabContent, { paddingBottom: insets.bottom }]}>
              {activeTab === 'friends' && (
                <View style={styles.tabContent}>
                  {/* Message Input */}
                  <View style={[styles.messageInputContainer, { backgroundColor: colors.card }]}>
                                      <TextInput
                    style={[styles.messageInput, { color: colors.text }]}
                    placeholder="Add a message (optional)..."
                    placeholderTextColor={colors.textSecondary}
                    value={message}
                    onChangeText={setMessage}
                    multiline
                    maxLength={500}
                    textAlignVertical="top"
                    returnKeyType="default"
                    blurOnSubmit={false}
                  />
                  </View>

                  {/* Search */}
                  <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
                    <Search size={20} color={colors.textSecondary} />
                    <TextInput
                      style={[styles.searchInput, { color: colors.text }]}
                      placeholder="Search friends..."
                      placeholderTextColor={colors.textSecondary}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      returnKeyType="search"
                      autoCorrect={false}
                      autoCapitalize="none"
                    />
                  </View>

                  {/* Users List */}
                  {following.length === 0 ? (
                    <View style={styles.loadingContainer}>
                      <Users size={48} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                      <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                        No friends found. Follow some people to share with them!
                      </Text>
                    </View>
                  ) : (
                    <FlatList
                      data={filteredFollowing}
                      renderItem={renderUserItem}
                      keyExtractor={(item) => item.id || item.username}
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={[styles.usersList, { paddingBottom: 24 + insets.bottom }]}
                      keyboardShouldPersistTaps="always"
                    />
                  )}
                </View>
              )}

              {activeTab === 'social' && (
                <View style={styles.tabContent}>
                  <FlatList
                    data={socialShareOptions}
                    renderItem={renderShareOption}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[styles.shareOptionsList, { paddingBottom: 24 + insets.bottom }]}
                    keyboardShouldPersistTaps="always"
                  />
                </View>
              )}

              {activeTab === 'external' && (
                <View style={styles.tabContent}>
                  <FlatList
                    data={externalShareOptions}
                    renderItem={renderShareOption}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[styles.shareOptionsList, { paddingBottom: 24 + insets.bottom }]}
                    keyboardShouldPersistTaps="always"
                  />
                </View>
              )}
            </View>
            </KeyboardAvoidingView>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    maxHeight: isSmallScreen ? screenHeight * 0.9 : screenHeight * 0.85, // Responsive height for different screen sizes
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  modalContent: {
    flex: 1,
    paddingBottom: 0, // Remove padding bottom as it's handled in content
  },
  dragHandle: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerLeft: {
    width: 60,
  },
  closeButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  headerRight: {
    width: 60,
    alignItems: 'flex-end',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  statsInfo: {
    flex: 1,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  statsSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  statsChevron: {
    marginLeft: Spacing.sm,
  },
  statsDetails: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  statsSection: {
    marginTop: Spacing.md,
  },
  statsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statsLabel: {
    fontSize: 14,
    textTransform: 'capitalize',
  },
  statsValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  recentShare: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  recentShareAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: Spacing.sm,
  },
  recentShareInfo: {
    flex: 1,
  },
  recentShareUser: {
    fontSize: 14,
    fontWeight: '500',
  },
  recentSharePlatform: {
    fontSize: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginHorizontal: Spacing.lg,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 20,
  },
  messageInputContainer: {
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  messageInput: {
    fontSize: 16,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
  usersList: {
    paddingBottom: 40, // Increased padding for better mobile spacing
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: 12,
    marginBottom: 6,
    minHeight: 56,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: Spacing.lg,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
  },
  verifiedIcon: {
    marginLeft: 4,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareOptionsList: {
    paddingBottom: 40, // Increased padding for better mobile spacing
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: 8,
  },
  shareOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  shareOptionText: {
    flex: 1,
  },
  shareOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  shareOptionSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 2,
  },
});

export default EnhancedShareModal; 