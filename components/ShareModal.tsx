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
  Share,
  Clipboard,
  Platform,
} from 'react-native';
import { 
  X, 
  Send, 
  CheckCircle, 
  Search, 
  Link, 
  MessageCircle, 
  ExternalLink,
  Copy,
  Instagram,
  Facebook,
  Twitter,
  MessageSquare,
  Mail,
  MoreHorizontal,
  Users,
  Globe,
  Lock,
  ChevronRight,
  Heart,
  Bookmark,
  Share2,
  UserPlus,
  Zap
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Profile } from '@/types/social';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ShareModalProps {
  postId: string;
  postUrl?: string;
  postTitle?: string;
  postImageUrl?: string;
  authorUsername?: string;
  onClose: () => void;
  colors: any;
}

interface ShareOption {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  action: () => void;
  type: 'internal' | 'external';
}

interface RecentShare {
  id: string;
  username: string;
  avatar_url: string;
  shared_at: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({ 
  postId, 
  postUrl, 
  postTitle, 
  postImageUrl, 
  authorUsername,
  onClose, 
  colors 
}) => {
  const { profile: currentUserProfile, user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'friends' | 'external'>('friends');
  const [following, setFollowing] = useState<Profile[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<Profile[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState('');
  const [shareStats, setShareStats] = useState<any>(null);
  const [recentShares, setRecentShares] = useState<RecentShare[]>([]);
  const [showShareStats, setShowShareStats] = useState(false);
  
  // Animation values
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Animate modal entrance
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    loadData();
  }, []);

  const loadData = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      // Load following users with better error handling
      const { data: followingData, error: followingError } = await supabase
        .from('followers')
        .select('following_id, profiles!followers_following_id_fkey(id, username, avatar_url, is_verified)')
        .eq('follower_id', currentUser.id);

      if (followingError) {
        console.error('Error loading following users:', followingError);
        // Set empty array but continue - user can still use external sharing
        setFollowing([]);
      } else {
        const followingList = (followingData || [])
          .map((item: any) => item.profiles)
          .filter(Boolean) as Profile[];
        setFollowing(followingList);
      }

      // Load share statistics with better error handling
      try {
        const { data: statsData, error: statsError } = await supabase
          .rpc('get_post_share_stats', { post_uuid: postId });

        if (statsError) {
          console.error('Error loading share stats:', statsError);
          // Set default stats but continue
          setShareStats({ total_shares: 0, direct_message_shares: 0, external_shares: 0, story_reposts: 0, unique_sharers: 0 });
          setRecentShares([]);
        } else if (statsData && statsData.length > 0) {
          setShareStats(statsData[0]);
          setRecentShares(statsData[0].recent_sharers || []);
        } else {
          // Set default stats if no data
          setShareStats({ total_shares: 0, direct_message_shares: 0, external_shares: 0, story_reposts: 0, unique_sharers: 0 });
          setRecentShares([]);
        }
      } catch (statsErr) {
        console.error('Error in share stats RPC:', statsErr);
        // Set default stats and continue
        setShareStats({ total_shares: 0, direct_message_shares: 0, external_shares: 0, story_reposts: 0, unique_sharers: 0 });
        setRecentShares([]);
      }

    } catch (err) {
      console.error('Error loading share data:', err);
      // Set defaults and continue - don't block the modal
      setFollowing([]);
      setShareStats({ total_shares: 0, direct_message_shares: 0, external_shares: 0, story_reposts: 0, unique_sharers: 0 });
      setRecentShares([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  const handleToggleUser = (user: Profile) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    setSelectedUsers((prev) =>
      prev.find((u) => u.id === user.id) 
        ? prev.filter((u) => u.id !== user.id) 
        : [...prev, user]
    );
  };

  const handleDirectMessage = async () => {
    if (selectedUsers.length === 0 || !currentUser || !currentUserProfile) {
      Alert.alert('No Recipients', 'Please select at least one person to share with.');
      return;
    }

    if (!postId) {
      Alert.alert('Error', 'Invalid post. Please try again.');
      return;
    }

    setIsSending(true);
    
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      console.log('Starting to share post:', postId, 'to users:', selectedUsers.map(u => u.username));
      
      const sharePromises = selectedUsers.map(async (selectedUser) => {
        console.log(`Sharing to user: ${selectedUser.username} (${selectedUser.id})`);
        
        try {
          // Find or create chat
          let chatId: string | null = null;

          const { data: currentUserChats, error: currentChatsErr } = await supabase
            .from('a_chat_users')
            .select('chat_id')
            .eq('user_id', currentUser.id);

          if (currentChatsErr) {
            console.error('Error fetching current user chats:', currentChatsErr);
            throw new Error(`Failed to load your chats: ${currentChatsErr.message}`);
          }

          console.log('Current user chats:', currentUserChats);

        if (currentUserChats && currentUserChats.length > 0) {
          const chatIds = currentUserChats.map((c: any) => c.chat_id);

          const { data: sharedChats, error: sharedChatErr } = await supabase
            .from('a_chat_users')
            .select('chat_id')
            .eq('user_id', selectedUser.id)
            .in('chat_id', chatIds);

          if (sharedChatErr) {
            console.error('Error finding shared chats:', sharedChatErr);
            throw new Error(`Failed to find existing chat with ${selectedUser.username}: ${sharedChatErr.message}`);
          }

          console.log('Shared chats found:', sharedChats);

          if (sharedChats && sharedChats.length > 0) {
            chatId = sharedChats[0].chat_id;
            console.log('Using existing chat:', chatId);
          }
        }

        if (!chatId) {
          console.log('Creating new chat...');
          const { data: newChat, error: chatError } = await supabase
            .from('a_chat')
            .insert({ last_message: 'Shared a post.' })
            .select('id')
            .single();

          if (chatError) {
            console.error('Error creating chat:', chatError);
            throw new Error(`Failed to create chat with ${selectedUser.username}: ${chatError.message}`);
          }
          
          chatId = newChat.id;
          console.log('Created new chat:', chatId);

          const { data: maxIdData, error: maxIdError } = await supabase
            .from('a_chat_users')
            .select('id')
            .order('id', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (maxIdError) {
            console.error('Error getting max ID:', maxIdError);
            throw maxIdError;
          }
          
          const nextId = (maxIdData?.id || 0) + 1;
          console.log('Using next ID:', nextId);

          const { error: usersInsertError } = await supabase.from('a_chat_users').insert([
            { id: nextId, chat_id: chatId, user_id: currentUser.id },
            { id: nextId + 1, chat_id: chatId, user_id: selectedUser.id },
          ]);

          if (usersInsertError) {
            console.error('Error inserting chat users:', usersInsertError);
            throw usersInsertError;
          }
          
          console.log('Successfully created chat users');
        }

        // Send message with shared post
        console.log('Sending message with shared post...');
        const messageData = {
          chat_id: chatId,
          user_id: currentUser.id,
          message_type: 'post',
          post_id: postId,
          message: message.trim() || ' ',
        };
        
        console.log('Message data:', messageData);
        
        const { data: insertedMessage, error: messageError } = await supabase
          .from('a_chat_messages')
          .insert(messageData)
          .select('*')
          .single();

                  if (messageError) {
            console.error('Error sending message:', messageError);
            throw new Error(`Failed to send message to ${selectedUser.username}: ${messageError.message}`);
          }
        
        console.log('Successfully inserted message:', insertedMessage);

        // Update last message
        const { error: lastMessageError } = await supabase
          .from('a_chat')
          .update({ last_message: 'Shared a post.' })
          .eq('id', chatId);
        
        if (lastMessageError) {
          console.error('Error updating last message:', lastMessageError);
          throw lastMessageError;
        }

        console.log('Successfully updated last message');

        // Track the share
        const { data: shareData, error: shareError } = await supabase.from('post_shares').insert({
          post_id: postId,
          sharer_id: currentUser.id,
          recipient_id: selectedUser.id,
          share_type: 'direct_message',
          share_medium: 'chat',
          message: message.trim() || null,
        }).select('*').single();
        
        if (shareError) {
          console.error('Error tracking share:', shareError);
          // Don't throw here as the message was sent successfully
        } else {
          console.log('Successfully tracked share:', shareData);
        }

        return true;
        } catch (shareError) {
          console.error(`Error sharing to ${selectedUser.username}:`, shareError);
          // Return false instead of throwing to allow other shares to continue
          return false;
        }
      });

      const results = await Promise.all(sharePromises);
      const successCount = results.filter(Boolean).length;
      const failureCount = results.length - successCount;
      
      console.log(`Sharing completed: ${successCount} successful, ${failureCount} failed`);

      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      if (successCount > 0) {
        Alert.alert(
          'Post Shared! 🎉',
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
      console.error('Error sharing post:', error);
      setIsSending(false);
      
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      Alert.alert(
        'Sharing Failed',
        'There was an error sharing the post. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      const link = postUrl || `https://rerack.app/post/${postId}`;
      await Clipboard.setString(link);
      
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // Track the share
      await supabase.from('post_shares').insert({
        post_id: postId,
        sharer_id: currentUser?.id,
        share_type: 'copy_link',
        share_medium: 'copy',
      });

      Alert.alert('Link Copied! 📋', 'Post link copied to clipboard');
    } catch (err) {
      console.error('Error copying link:', err);
      Alert.alert('Error', 'Failed to copy link');
    }
  };

  const handleExternalShare = async () => {
    try {
      const shareContent = {
        title: postTitle || `Check out this post by ${authorUsername}`,
        message: `Check out this amazing post on ReRack! ${postUrl || `https://rerack.app/post/${postId}`}`,
        url: postUrl || `https://rerack.app/post/${postId}`,
      };

      const result = await Share.share(shareContent);
      
      if (result.action === Share.sharedAction) {
        // Track the share
        await supabase.from('post_shares').insert({
          post_id: postId,
          sharer_id: currentUser?.id,
          share_type: 'external_link',
          share_medium: result.activityType || 'unknown',
        });

        if (Platform.OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (err) {
      console.error('Error sharing externally:', err);
      Alert.alert('Error', 'Failed to share post');
    }
  };

  const externalShareOptions: ShareOption[] = [
    {
      id: 'share',
      title: 'Share to...',
      icon: <Share2 size={24} color="#FFFFFF" />,
      color: '#007AFF',
      action: handleExternalShare,
      type: 'external',
    },
    {
      id: 'copy',
      title: 'Copy Link',
      icon: <Copy size={24} color="#FFFFFF" />,
      color: '#34C759',
      action: handleCopyLink,
      type: 'external',
    },
  ];

  const filteredFollowing = following.filter((user) =>
    user.username.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderUserItem = ({ item }: { item: Profile }) => {
    const isSelected = selectedUsers.some((u) => u.id === item.id);
    
    return (
      <TouchableOpacity
        style={[styles.userItem, { backgroundColor: colors.card }]}
        onPress={() => handleToggleUser(item)}
        activeOpacity={0.7}
      >
        <View style={styles.userInfo}>
          <Image
            source={{ 
              uri: item.avatar_url || `https://api.dicebear.com/8.x/avataaars/svg?seed=${item.username}` 
            }}
            style={styles.avatar}
          />
          <View style={styles.userDetails}>
            <Text style={[styles.username, { color: colors.text }]}>{item.username}</Text>
            {item.is_verified && (
              <CheckCircle size={16} color="#3B82F6" style={styles.verifiedIcon} />
            )}
          </View>
        </View>
        
        <Animated.View 
          style={[
            styles.checkbox,
            { 
              borderColor: isSelected ? colors.tint : colors.border,
              backgroundColor: isSelected ? colors.tint : 'transparent',
            }
          ]}
        >
          {isSelected && <CheckCircle size={16} color="#FFFFFF" />}
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const renderExternalOption = ({ item }: { item: ShareOption }) => (
    <TouchableOpacity
      style={[styles.externalOption, { backgroundColor: item.color }]}
      onPress={item.action}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={[item.color, `${item.color}DD`]}
        style={styles.externalOptionGradient}
      >
        {item.icon}
        <Text style={styles.externalOptionText}>{item.title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderShareStats = () => {
    if (!shareStats || !showShareStats) return null;

    return (
      <View style={[styles.shareStatsContainer, { backgroundColor: colors.card }]}>
        <Text style={[styles.shareStatsTitle, { color: colors.text }]}>Share Statistics</Text>
        <View style={styles.shareStatsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.tint }]}>
              {shareStats.total_shares || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.tint }]}>
              {shareStats.direct_message_shares || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Messages</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.tint }]}>
              {shareStats.external_shares || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>External</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal visible transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View 
        style={[
          styles.overlay, 
          { 
            opacity: fadeAnim,
            backgroundColor: 'rgba(0,0,0,0.6)' 
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.overlayTouchable} 
          onPress={handleClose}
          activeOpacity={1}
        />
        
        <Animated.View
          style={[
            styles.modal,
            {
              backgroundColor: colors.background,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ]
            }
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.headerCenter}>
              <Text style={[styles.title, { color: colors.text }]}>Share Post</Text>
              {shareStats && (
                <TouchableOpacity 
                  onPress={() => setShowShareStats(!showShareStats)}
                  style={styles.statsToggle}
                >
                  <Text style={[styles.statsText, { color: colors.textSecondary }]}>
                    {shareStats.total_shares || 0} shares
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.headerRight}>
              <TouchableOpacity 
                style={[styles.sendButton, { backgroundColor: colors.tint }]}
                onPress={activeTab === 'friends' ? handleDirectMessage : handleExternalShare}
                disabled={activeTab === 'friends' ? selectedUsers.length === 0 || isSending : isSending}
              >
                {isSending ? (
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
                activeTab === 'external' && { borderBottomColor: colors.tint }
              ]}
              onPress={() => setActiveTab('external')}
            >
              <Globe size={20} color={activeTab === 'external' ? colors.tint : colors.textSecondary} />
              <Text style={[
                styles.tabText,
                { color: activeTab === 'external' ? colors.tint : colors.textSecondary }
              ]}>
                Share
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {activeTab === 'friends' ? (
              <>
                {/* Search */}
                <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
                  <Search size={20} color={colors.textSecondary} />
                  <TextInput
                    ref={searchInputRef}
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder="Search friends..."
                    placeholderTextColor={colors.textSecondary}
                    value={searchText}
                    onChangeText={setSearchText}
                  />
                </View>

                {/* Selected Users */}
                {selectedUsers.length > 0 && (
                  <View style={styles.selectedUsersContainer}>
                    <Text style={[styles.selectedUsersTitle, { color: colors.text }]}>
                      Selected ({selectedUsers.length})
                    </Text>
                    <FlatList
                      data={selectedUsers}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[styles.selectedUserChip, { backgroundColor: colors.tint }]}
                          onPress={() => handleToggleUser(item)}
                        >
                          <Image
                            source={{ 
                              uri: item.avatar_url || `https://api.dicebear.com/8.x/avataaars/svg?seed=${item.username}` 
                            }}
                            style={styles.selectedUserAvatar}
                          />
                          <Text style={styles.selectedUserName}>{item.username}</Text>
                          <X size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                      )}
                      keyExtractor={(item) => item.id!}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.selectedUsersList}
                    />
                  </View>
                )}

                {/* Friends List */}
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.tint} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                      Loading friends...
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={filteredFollowing}
                    renderItem={renderUserItem}
                    keyExtractor={(item) => item.id!}
                    style={styles.friendsList}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                      <View style={styles.emptyContainer}>
                        <Users size={48} color={colors.textSecondary} />
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                          {searchText ? 'No friends found' : 'No friends to share with'}
                        </Text>
                      </View>
                    }
                  />
                )}

                {/* Message Input */}
                {selectedUsers.length > 0 && (
                  <View style={[styles.messageContainer, { borderTopColor: colors.border }]}>
                    <TextInput
                      style={[
                        styles.messageInput,
                        { 
                          color: colors.text,
                          backgroundColor: colors.card,
                          borderColor: colors.border
                        }
                      ]}
                      placeholder="Add a message..."
                      placeholderTextColor={colors.textSecondary}
                      value={message}
                      onChangeText={setMessage}
                      multiline
                      maxLength={200}
                    />
                  </View>
                )}
              </>
            ) : (
              <View style={styles.externalShareContainer}>
                <FlatList
                  data={externalShareOptions}
                  renderItem={renderExternalOption}
                  keyExtractor={(item) => item.id}
                  numColumns={2}
                  columnWrapperStyle={styles.externalOptionsRow}
                  contentContainerStyle={styles.externalOptionsList}
                />
              </View>
            )}
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
    alignItems: 'center',
  },
  overlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modal: {
    width: screenWidth,
    maxHeight: screenHeight * 0.85,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    width: 60,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    width: 60,
    alignItems: 'flex-end',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statsToggle: {
    marginTop: 4,
  },
  statsText: {
    fontSize: 12,
    fontWeight: '500',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareStatsContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  shareStatsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  shareStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 8,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  selectedUsersContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  selectedUsersTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  selectedUsersList: {
    paddingVertical: 8,
  },
  selectedUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  selectedUserAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  selectedUserName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  friendsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  username: {
    fontSize: 16,
    fontWeight: '500',
  },
  verifiedIcon: {
    marginLeft: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageContainer: {
    borderTopWidth: 1,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 44,
    maxHeight: 100,
  },
  externalShareContainer: {
    flex: 1,
    padding: 16,
  },
  externalOptionsList: {
    paddingVertical: 8,
  },
  externalOptionsRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  externalOption: {
    width: (screenWidth - 48) / 2,
    height: 80,
    borderRadius: 16,
    overflow: 'hidden',
  },
  externalOptionGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  externalOptionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
}); 