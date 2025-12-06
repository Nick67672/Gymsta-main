import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, ScrollView, Modal, RefreshControl, Alert, Platform, Animated, Dimensions } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Plus, CircleCheck as CheckCircle2, Clock, MessageCircle, Trash2 } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useBlocking } from '@/context/BlockingContext';
import Colors from '@/constants/Colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/Spacing';
import { Typography } from '@/constants/Typography';
import StoryViewer from '@/components/StoryViewer';
import { getAvatarUrl } from '@/lib/avatarUtils';
import { useFocusEffect } from '@react-navigation/native';

interface Story {
  id: string;
  media_url: string;
  user_id: string;
}

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  has_story: boolean;
}

interface ChatPreview {
  id: string;
  last_message: string;
  created_at: string;
  participants: {
    id: string;
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
  }[];
  recent_message?: {
    message: string;
    created_at: string;
  };
}

export default function ChatScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { isAuthenticated, showAuthModal } = useAuth();
  const { blockedUserIds } = useBlocking();
  
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [following, setFollowing] = useState<Profile[]>([]);
  const [selectedStories, setSelectedStories] = useState<Story[]>([]);
  const [showingStories, setShowingStories] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [deletingChat, setDeletingChat] = useState<string | null>(null);

  // Keep references to active realtime channels so we can clean them up and
  // avoid subscribing to the same channel instance multiple times.
  const channelsRef = useRef<{
    messages?: any;
    chat?: any;
    stories?: any;
  }>({});

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    // Get current user's ID
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
      }
    });
  }, [isAuthenticated]);

  const loadFollowing = async () => {
    if (!isAuthenticated) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: followingData, error: followingError } = await supabase
        .from('followers')
        .select(`
          following:following_id(
            id,
            username,
            avatar_url
          )
        `)
        .eq('follower_id', user.id);

      if (followingError) throw followingError;

      const profiles = (followingData
        .map((f: any) => f.following)
        .filter(Boolean) as Profile[]);

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: storiesData } = await supabase
        .from('stories')
        .select('user_id')
        .in('user_id', profiles.map(p => p.id))
        .gte('created_at', twentyFourHoursAgo);

      const profilesWithStoryStatus = profiles.map(profile => ({
        ...profile,
        has_story: storiesData?.some(s => s.user_id === profile.id) || false
      }));

      setFollowing(profilesWithStoryStatus as Profile[]);
    } catch (err) {
      console.error('Error loading following:', err);
    }
  };

  const loadStories = async (userId: string) => {
    if (!isAuthenticated) {
      router.push('/auth?mode=signup');
      return;
    }
    
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: stories, error } = await supabase
        .from('stories')
        .select('id, media_url, user_id')
        .eq('user_id', userId)
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (stories && stories.length > 0) {
        setSelectedStories(stories);
        setShowingStories(true);
      }
    } catch (err) {
      console.error('Error loading stories:', err);
    }
  };

  const loadChats = async () => {
    if (!currentUserId || !isAuthenticated) return;
    
    try {
      // Get all chats where the current user is a participant
      const { data: userChats, error: chatsError } = await supabase
        .from('a_chat_users')
        .select(`
          chat:a_chat!inner (
            id,
            last_message,
            created_at,
            a_chat_users!inner (
              user_id,
              profiles:user_id (
                id,
                username,
                avatar_url,
                is_verified
              )
            )
          )
        `)
        .eq('user_id', currentUserId)
        .order('chat(created_at)', { ascending: false });

      if (chatsError) throw chatsError;

      if (userChats) {
        // Transform the data to get the other participant's info
        const transformedChats = userChats.map(({ chat }: any) => ({
          id: chat.id,
          last_message: chat.last_message,
          created_at: chat.created_at,
          participants: chat.a_chat_users
            .map((user: any) => user.profiles as Profile)
            .filter((profile: Profile) => profile.id !== currentUserId)
        }));

        // Filter out chats with blocked users
        const nonBlockedChats = transformedChats.filter(chat => 
          !chat.participants.some((participant: { id: string; username: string; avatar_url: string | null; is_verified: boolean }) => 
            blockedUserIds.includes(participant.id)
          )
        );

        // Now fetch the most recent message for each chat
        const chatsWithRecentMessages = await Promise.all(
          nonBlockedChats.map(async (chat) => {
            const { data: messages, error: messagesError } = await supabase
              .from('a_chat_messages')
              .select('message, created_at')
              .eq('chat_id', chat.id)
              .order('created_at', { ascending: false })
              .limit(1);
            
            if (messagesError) {
              console.error('Error fetching recent message:', messagesError);
              return chat;
            }
            
            return {
              ...chat,
              recent_message: messages && messages.length > 0 ? messages[0] : undefined
            };
          })
        );

        setChats(chatsWithRecentMessages);
      }
    } catch (err) {
      console.error('Error loading chats:', err);
      setError('Failed to load chats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    if (!isAuthenticated || !currentUserId) return;
    setRefreshing(true);
    loadChats();
    loadFollowing();
  }, [currentUserId, isAuthenticated]);

  // Reload chats & story status every time the screen regains focus. This
  // covers the case where the user starts a brand-new conversation on a
  // different screen and then navigates back here.
  useFocusEffect(
    useCallback(() => {
      // Don't run if we haven't determined auth state yet.
      if (!currentUserId || !isAuthenticated) return;

      loadChats();
      loadFollowing();
      setNavigating(false);
    }, [currentUserId, isAuthenticated])
  );

  useEffect(() => {
    if (!currentUserId || !isAuthenticated) return;

    // Clean up any previously created channels to avoid duplicate
    // subscriptions which can trigger the `subscribe can only be called a
    // single time per channel instance` error.
    if (channelsRef.current.messages) {
      channelsRef.current.messages.unsubscribe();
    }
    if (channelsRef.current.chat) {
      channelsRef.current.chat.unsubscribe();
    }
    if (channelsRef.current.stories) {
      channelsRef.current.stories.unsubscribe();
    }

    // Add a unique suffix to each channel name so that Supabase returns a new
    // channel instance every time.
    const uniqueSuffix = Date.now();

    const messagesChannel = supabase
      .channel(`chat_messages-${uniqueSuffix}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'a_chat_messages'
        },
        (payload) => {
          // When a new message is received, update the corresponding chat
          const chatId = payload.new.chat_id;
          const message = payload.new.message;
          const created_at = payload.new.created_at;

          setChats(prevChats => {
            const chatExists = prevChats.some(chat => chat.id === chatId);

            if (!chatExists) {
              // If this chat is not yet in state, trigger a full reload so the
              // brand-new conversation appears in the list immediately.
              // We intentionally *do not* mutate state here because we need the
              // participants/blocked-user filtering logic from `loadChats`.
              loadChats();
              return prevChats;
            }

            // Chat already exists – update its preview and resort list.
            const updatedChats = prevChats
              .map(chat => {
                if (chat.id === chatId) {
                  return {
                    ...chat,
                    last_message: message,
                    recent_message: { message, created_at }
                  };
                }
                return chat;
              })
              .sort((a, b) => {
                const aDate = a.recent_message?.created_at || a.created_at;
                const bDate = b.recent_message?.created_at || b.created_at;
                return new Date(bDate).getTime() - new Date(aDate).getTime();
              });

            return updatedChats;
          });
        }
      )
      .subscribe();

    const chatChannel = supabase
      .channel(`chat_updates-${uniqueSuffix}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'a_chat'
        },
        () => {
          loadChats();
        }
      )
      .subscribe();

    const storiesChannel = supabase
      .channel(`stories_changes-${uniqueSuffix}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stories'
        },
        () => {
          loadFollowing();
        }
      )
      .subscribe();

    // Store in ref so we can access them for cleanup next time
    channelsRef.current = {
      messages: messagesChannel,
      chat: chatChannel,
      stories: storiesChannel,
    };

    return () => {
      messagesChannel.unsubscribe();
      chatChannel.unsubscribe();
      storiesChannel.unsubscribe();
    };
  }, [currentUserId, isAuthenticated]);

  const formatTime = (dateString: string) => {
    const now = new Date();
    const messageDate = new Date(dateString);
    const diffInDays = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));
    const diffInHours = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60));
    const diffInMinutes = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) {
      return 'now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h`;
    } else if (diffInDays === 1) {
      return '1d';
    } else if (diffInDays < 7) {
      return `${diffInDays}d`;
    } else {
      // More than a week ago - show date
      return messageDate.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const handleNewChat = () => {
    if (!isAuthenticated) {
      router.push('/auth?mode=signup');
      return;
    }
    router.push('/chat/search');
  };

  const handleAvatarPress = (username: string) => {
    // Prevent navigating twice if already in a transition
    if (navigating) return;
    setNavigating(true);
    router.push(`/${username}`);
  };

  const handleDeleteChat = async (chatId: string) => {
            try {
              setDeletingChat(chatId);
      
      // Add haptic feedback for delete action
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
              
              // Delete all messages in the chat
              const { error: messagesError } = await supabase
                .from('a_chat_messages')
                .delete()
                .eq('chat_id', chatId);

              if (messagesError) throw messagesError;

              // Delete chat users
              const { error: chatUsersError } = await supabase
                .from('a_chat_users')
                .delete()
                .eq('chat_id', chatId);

              if (chatUsersError) throw chatUsersError;

              // Delete the chat itself
              const { error: chatError } = await supabase
                .from('a_chat')
                .delete()
                .eq('id', chatId);

              if (chatError) throw chatError;

              // Remove from local state
              setChats(prev => prev.filter(chat => chat.id !== chatId));
      
      // Success haptic feedback
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
            } catch (error) {
              console.error('Error deleting chat:', error);
              Alert.alert('Error', 'Failed to delete conversation. Please try again.');
      
      // Error haptic feedback
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
            } finally {
              setDeletingChat(null);
            }
  };

  // Swipeable Chat Item Component
  const SwipeableChatItem = ({ chat, index, colors }: { chat: ChatPreview; index: number; colors: any }) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const { width: screenWidth } = Dimensions.get('window');
    const deleteWidth = 80;
    const threshold = deleteWidth * 0.6;

    const onGestureEvent = Animated.event(
      [{ nativeEvent: { translationX: translateX } }],
      { useNativeDriver: true }
    );

    const onHandlerStateChange = (event: any) => {
      if (event.nativeEvent.state === State.END) {
        const { translationX: tx } = event.nativeEvent;
        
        if (tx < -threshold) {
          // Swipe left to delete
          Animated.timing(translateX, {
            toValue: -deleteWidth,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            handleDeleteChat(chat.id);
          });
        } else {
          // Reset position
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }).start();
        }
      }
    };

    const otherParticipant = chat.participants[0];
    if (!otherParticipant) return null;

    return (
      <View style={styles.swipeableContainer}>
        {/* Delete Background */}
        <View style={[styles.deleteBackground, { backgroundColor: colors.error }]}>
          <Trash2 size={24} color="#fff" />
        </View>
        
        {/* Swipeable Content */}
        <PanGestureHandler onGestureEvent={onGestureEvent} onHandlerStateChange={onHandlerStateChange}>
          <Animated.View
            style={[
              styles.chatPreview,
              {
                backgroundColor: colors.card,
                marginBottom: index === chats.length - 1 ? 0 : 16,
                transform: [{ translateX }],
                width: '100%',
              },
            ]}>
            <TouchableOpacity
              style={styles.chatRow}
              onPress={() => {
                if (navigating) return;
                setNavigating(true);
                router.push(`/chat/${otherParticipant.username}`);
              }}
              activeOpacity={0.95}>
              
              <View style={styles.avatarContainer}>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    handleAvatarPress(otherParticipant.username);
                  }}
                  activeOpacity={0.8}>
                  <Image
                    source={{
                      uri: getAvatarUrl(otherParticipant.avatar_url ?? null, otherParticipant.username ?? '')
                    }}
                    style={styles.avatar}
                  />
                </TouchableOpacity>
              </View>
              
              <View style={styles.chatInfo}>
                <View style={styles.topLine}>
                  <View style={styles.usernameContainer}>
                    <Text style={[styles.username, { color: colors.text }]}>
                      {otherParticipant.username}
                    </Text>
                    {otherParticipant.is_verified && (
                      <CheckCircle2 size={16} color="#fff" fill="#3B82F6" />
                    )}
                  </View>
                  <View style={styles.timeContainer}>
                    <Clock size={12} color={colors.textSecondary} />
                    <Text style={[styles.time, { color: colors.textSecondary }]}>
                      {formatTime(chat.recent_message?.created_at || chat.created_at)}
                    </Text>
                  </View>
                </View>
                <Text 
                  style={[styles.lastMessage, { color: colors.textSecondary }]}
                  numberOfLines={2}>
                  {chat.recent_message?.message || chat.last_message || 'No messages yet'}
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </PanGestureHandler>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Modern Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Messages</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {chats.length > 0 ? `${chats.length} conversation${chats.length !== 1 ? 's' : ''}` : 'Stay connected'}
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.newChatButton, { backgroundColor: colors.tint }]}
            onPress={handleNewChat}>
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {!isAuthenticated ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconContainer, { backgroundColor: colors.card }]}>
            <MessageCircle size={48} color={colors.textSecondary} />
          </View>
          <Text style={[styles.emptyText, { color: colors.text }]}>Sign in to view your messages</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Connect with other users and start conversations
          </Text>
          <TouchableOpacity
            style={[styles.signInButton, { backgroundColor: colors.tint }]}
            onPress={() => router.push('/auth?mode=signin')}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      ) : loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading conversations...</Text>
        </View>
      ) : (
        <ScrollView 
          style={[styles.chatList]} 
           contentContainerStyle={{ paddingBottom: 150 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.tint}
              colors={[colors.tint]}
            />
          }
          showsVerticalScrollIndicator={false}>
          
          {/* Enhanced Stories Section */}
          {following.filter(profile => profile.has_story).length > 0 && (
            <View style={[styles.storiesSection, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Stories</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.storiesContent}>
                {following.filter(profile => profile.has_story).map((profile) => (
                  <TouchableOpacity
                    key={profile.id}
                    style={styles.storyItem}
                    onPress={() => loadStories(profile.id)}>
                    <View style={[styles.storyRing, { borderColor: colors.tint }]}>
                      <Image
                        source={{
                          uri: getAvatarUrl(profile.avatar_url, profile.username)
                        }}
                        style={styles.storyAvatar}
                      />
                    </View>
                    <Text style={[styles.storyUsername, { color: colors.textSecondary }]} numberOfLines={1}>
                      {profile.username}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Enhanced Chat List */}
          {chats.length > 0 ? (
            <View style={styles.chatsSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent</Text>
              {chats.map((chat, index) => (
                <SwipeableChatItem 
                    key={chat.id}
                  chat={chat}
                  index={index}
                  colors={colors}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconContainer, { backgroundColor: colors.card }]}>
                <MessageCircle size={48} color={colors.textSecondary} />
              </View>
              <Text style={[styles.emptyText, { color: colors.text }]}>No messages yet</Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Start a conversation by tapping the plus button
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      <Modal
        visible={showingStories}
        animationType="fade"
        onRequestClose={() => setShowingStories(false)}>
        <StoryViewer
          stories={selectedStories}
          onComplete={() => setShowingStories(false)}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 45,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...Typography.h1,
    letterSpacing: -0.5,
  },
  subtitle: {
    ...Typography.bodyLarge,
    marginTop: Spacing.xs,
  },
  newChatButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.medium,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    textAlign: 'center',
    fontSize: 16,
  },
  chatList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.md,
    letterSpacing: -0.3,
  },
  storiesSection: {
    marginBottom: Spacing.xl,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.light,
  },
  storiesContent: {
    gap: Spacing.md,
  },
  storyItem: {
    alignItems: 'center',
    width: 80,
  },
  storyRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    padding: 3,
    borderWidth: 2,
    marginBottom: Spacing.sm,
  },
  storyAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  storyUsername: {
    ...Typography.caption,
    fontWeight: '500',
    textAlign: 'center',
  },
  chatsSection: {
    marginBottom: 20,
  },
  chatPreview: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: BorderRadius.xl,
    alignItems: 'flex-start',
    ...Shadows.light,
    minHeight: 80,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    width: '100%',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
    marginTop: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#fff',
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 56,
    paddingVertical: 2,
  },
  topLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  username: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  time: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  lastMessage: {
    fontSize: 15,
    lineHeight: 20,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  signInButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Swipeable chat item styles
  swipeableContainer: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: BorderRadius.xl,
  },
  deleteBackground: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
  },
});