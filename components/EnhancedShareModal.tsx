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
} from 'react-native';
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
import { componentPadding } from '@/constants/Layout';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
  const { profile: currentUserProfile, user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'friends' | 'social' | 'external'>('friends');
  const [following, setFollowing] = useState<Profile[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<Profile[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState('');
  const [shareStats, setShareStats] = useState<any>(null);
  const [recentShares, setRecentShares] = useState<RecentShare[]>([]);
  const [showShareStats, setShowShareStats] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  
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
    try {
      // Load following users
      if (currentUser) {
        const { data: followingData, error: followingError } = await supabase
          .from('follows')
          .select(`
            following:profiles!follows_following_id_fkey (
              id,
              username,
              avatar_url,
              is_verified
            )
          `)
          .eq('follower_id', currentUser.id);

        if (!followingError && followingData) {
          setFollowing(followingData.map(f => f.following));
        }
      }

      // Load share stats
      const stats = await sharingService.getShareStats(content.id, content.type);
      setShareStats(stats);

      // Load recent shares
      if (stats.recentShares) {
        setRecentShares(stats.recentShares);
      }
    } catch (error) {
      console.error('Error loading share data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
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
      const userIds = selectedUsers.map(user => user.id);
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
        
        // Reload share stats
        const stats = await sharingService.getShareStats(content.id, content.type);
        setShareStats(stats);
      } else {
        Alert.alert('Error', 'Failed to copy link');
      }
    } catch (error) {
      console.error('Error copying link:', error);
      Alert.alert('Error', 'Failed to copy link');
    }
  };

  const handleEmailShare = async () => {
    setIsSharing(true);
    
    try {
      const result = await sharingService.shareViaEmail(content);
      
      if (result.success) {
        if (Platform.OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
        // Reload share stats
        const stats = await sharingService.getShareStats(content.id, content.type);
        setShareStats(stats);
      } else {
        Alert.alert('Sharing Failed', result.error || 'Failed to share via email');
      }
    } catch (error) {
      console.error('Error sharing via email:', error);
      Alert.alert('Sharing Failed', 'Failed to share via email');
    } finally {
      setIsSharing(false);
    }
  };

  const socialShareOptions: ShareOption[] = [
    {
      id: 'instagram',
      title: 'Instagram',
      subtitle: 'Share to Stories or Feed',
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
      subtitle: 'Share to your profile',
      icon: <Facebook size={24} color="#FFFFFF" />,
      color: '#1877F2',
      action: () => handleSocialShare('facebook'),
      type: 'social',
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp',
      subtitle: 'Share to contacts',
      icon: <MessageSquare size={24} color="#FFFFFF" />,
      color: '#25D366',
      action: () => handleSocialShare('whatsapp'),
      type: 'social',
    },
    {
      id: 'telegram',
      title: 'Telegram',
      subtitle: 'Share to channels',
      icon: <Send size={24} color="#FFFFFF" />,
      color: '#0088CC',
      action: () => handleSocialShare('telegram'),
      type: 'social',
    },
  ];

  const externalShareOptions: ShareOption[] = [
    {
      id: 'share',
      title: 'Share to...',
      subtitle: 'Use system share sheet',
      icon: <Share2 size={24} color="#FFFFFF" />,
      color: '#007AFF',
      action: handleExternalShare,
      type: 'external',
    },
    {
      id: 'copy',
      title: 'Copy Link',
      subtitle: 'Copy to clipboard',
      icon: <Copy size={24} color="#FFFFFF" />,
      color: '#34C759',
      action: handleCopyLink,
      type: 'external',
    },
    {
      id: 'email',
      title: 'Email',
      subtitle: 'Share via email',
      icon: <Mail size={24} color="#FFFFFF" />,
      color: '#FF9500',
      action: handleEmailShare,
      type: 'external',
    },
  ];

  const filteredFollowing = following.filter((user) =>
    user.username.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderUserItem = ({ item }: { item: Profile }) => {
    const isSelected = selectedUsers.some(user => user.id === item.id);
    
    return (
      <TouchableOpacity
        style={[
          styles.userItem,
          isSelected && { backgroundColor: colors.tint + '20' }
        ]}
        onPress={() => handleToggleUser(item)}
        activeOpacity={0.7}
      >
        <Image
          source={{
            uri: item.avatar_url || `https://source.unsplash.com/random/50x50/?portrait&${item.id}`,
          }}
          style={styles.userAvatar}
        />
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.text }]}>
            {item.username}
          </Text>
          {item.is_verified && (
            <CheckCircle size={14} color="#3B82F6" style={styles.verifiedIcon} />
          )}
        </View>
        {isSelected && (
          <View style={[styles.checkmark, { backgroundColor: colors.tint }]}>
            <CheckCircle size={16} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderShareOption = ({ item }: { item: ShareOption }) => (
    <TouchableOpacity
      style={[styles.shareOption, { backgroundColor: item.color }]}
      onPress={item.action}
      activeOpacity={0.8}
      disabled={isSharing}
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
      {isSharing && <ActivityIndicator size="small" color="#FFFFFF" />}
    </TouchableOpacity>
  );

  const renderShareStats = () => {
    if (!shareStats || shareStats.totalShares === 0) return null;

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
              {shareStats.totalShares} total shares
            </Text>
          </View>
          <ChevronRight 
            size={20} 
            color={colors.textSecondary}
            style={[
              styles.statsChevron,
              showShareStats && { transform: [{ rotate: '90deg' }] }
            ]}
          />
        </TouchableOpacity>
        
        {showShareStats && (
          <View style={styles.statsDetails}>
            {Object.keys(shareStats.byPlatform).length > 0 && (
              <View style={styles.statsSection}>
                <Text style={[styles.statsSectionTitle, { color: colors.text }]}>
                  By Platform
                </Text>
                {Object.entries(shareStats.byPlatform).map(([platform, count]) => (
                  <View key={platform} style={styles.statsRow}>
                    <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>
                      {platform}
                    </Text>
                    <Text style={[styles.statsValue, { color: colors.text }]}>
                      {count}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            
            {recentShares.length > 0 && (
              <View style={styles.statsSection}>
                <Text style={[styles.statsSectionTitle, { color: colors.text }]}>
                  Recent Shares
                </Text>
                {recentShares.slice(0, 3).map((share) => (
                  <View key={share.id} style={styles.recentShare}>
                    <Image
                      source={{ uri: share.avatar_url || 'https://placehold.co/32x32' }}
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
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
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

            {/* Content */}
            {activeTab === 'friends' && (
              <View style={styles.tabContent}>
                {/* Message Input */}
                <View style={[styles.messageInputContainer, { backgroundColor: colors.inputBackground }]}>
                  <TextInput
                    style={[styles.messageInput, { color: colors.text }]}
                    placeholder="Add a message (optional)"
                    placeholderTextColor={colors.textSecondary}
                    value={message}
                    onChangeText={setMessage}
                    multiline
                    maxLength={500}
                  />
                </View>

                {/* Search */}
                <View style={[styles.searchContainer, { backgroundColor: colors.inputBackground }]}>
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

                {/* Users List */}
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.tint} />
                  </View>
                ) : (
                  <FlatList
                    data={filteredFollowing}
                    renderItem={renderUserItem}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.usersList}
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
                  contentContainerStyle={styles.shareOptionsList}
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
                  contentContainerStyle={styles.shareOptionsList}
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
    maxHeight: screenHeight * 0.9,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  modalContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: componentPadding.large,
    paddingTop: componentPadding.large,
    paddingBottom: componentPadding.medium,
  },
  headerLeft: {
    flex: 1,
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
    marginLeft: componentPadding.medium,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    marginHorizontal: componentPadding.large,
    marginBottom: componentPadding.medium,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: componentPadding.medium,
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
    marginLeft: componentPadding.small,
  },
  statsDetails: {
    paddingHorizontal: componentPadding.medium,
    paddingBottom: componentPadding.medium,
  },
  statsSection: {
    marginTop: componentPadding.medium,
  },
  statsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: componentPadding.small,
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
    marginRight: componentPadding.small,
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
    marginHorizontal: componentPadding.large,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: componentPadding.medium,
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
    paddingHorizontal: componentPadding.large,
    paddingTop: componentPadding.medium,
  },
  messageInputContainer: {
    borderRadius: 12,
    padding: componentPadding.medium,
    marginBottom: componentPadding.medium,
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
    paddingHorizontal: componentPadding.medium,
    marginBottom: componentPadding.medium,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: componentPadding.small,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  usersList: {
    paddingBottom: componentPadding.large,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: componentPadding.medium,
    paddingHorizontal: componentPadding.small,
    borderRadius: 12,
    marginBottom: 4,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: componentPadding.medium,
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
    paddingBottom: componentPadding.large,
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: componentPadding.medium,
    borderRadius: 12,
    marginBottom: 8,
  },
  shareOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: componentPadding.medium,
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