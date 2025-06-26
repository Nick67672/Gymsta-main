import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, RefreshControl, Alert, Animated, Dimensions, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Heart, UserPlus, MessageCircle, CircleCheck as CheckCircle2, Check, X, Trash2 } from 'lucide-react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useBlocking } from '@/context/BlockingContext';
import Colors from '@/constants/Colors';
import StoryViewer from '@/components/StoryViewer';
import WorkoutDetailModal from '@/components/WorkoutDetailModal';
import GradientButton from '@/components/GradientButton';
import { useRouter } from 'expo-router';

interface Notification {
  id: string;
  type: 'like' | 'follow' | 'comment' | 'workout_like' | 'follow_request';
  created_at: string;
  read: boolean;
  actor: {
    id: string;
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
  post?: {
    id: string;
    image_url: string;
  };
  workout?: {
    id: string;
    progress_image_url: string | null;
  };
  followRequest?: {
    id: string;
    requester_id: string;
    requested_id: string;
  };
}

const SwipeableNotification = ({ 
  notification, 
  colors, 
  onPress, 
  onDelete, 
  children 
}: {
  notification: Notification;
  colors: any;
  onPress: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}) => {
  const translateX = new Animated.Value(0);
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const screenWidth = Dimensions.get('window').width;
  const deleteThreshold = screenWidth * 0.3; // 30% of screen width

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { 
      useNativeDriver: true,
      listener: (event: any) => {
        const { translationX } = event.nativeEvent;
        setIsSwipeActive(translationX > 10); // Show delete background when swiping right
      }
    }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX } = event.nativeEvent;
      
      if (translationX > deleteThreshold) {
        // Swipe right past threshold - delete
        Animated.timing(translateX, {
          toValue: screenWidth,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          onDelete();
        });
      } else {
        // Snap back to original position
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
        setIsSwipeActive(false);
      }
    }
  };

  return (
    <View style={styles.swipeContainer}>
      {/* Delete background - only visible when swiping */}
      {isSwipeActive && (
        <View style={styles.deleteBackground}>
        <Trash2 size={24} color="white" />
        <Text style={styles.deleteText}>Delete</Text>
      </View>
      )}
      
      {/* Swipeable notification */}
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={10}
      >
        <Animated.View
          style={[
            styles.swipeableItem,
            {
              transform: [{ translateX }],
            },
          ]}
        >
          <TouchableOpacity
            onPress={onPress}
            activeOpacity={notification.type === 'follow_request' ? 1 : 0.7}
          >
            {children}
          </TouchableOpacity>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { isAuthenticated, showAuthModal } = useAuth();
  const router = useRouter();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [swipedNotifications, setSwipedNotifications] = useState<Set<string>>(new Set());

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      showAuthModal();
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load dismissed notifications first
      let dismissedNotifications: string[] = [];
      try {
        const dismissedNotificationsStr = await AsyncStorage.getItem('dismissedNotifications');
        dismissedNotifications = dismissedNotificationsStr ? JSON.parse(dismissedNotificationsStr) : [];
        console.log('🔍 Dismissed notifications loaded:', dismissedNotifications);
      } catch (error) {
        console.error('Error loading dismissed notifications:', error);
      }

      // Get likes on user's posts
      const { data: likesData } = await supabase
        .from('likes')
        .select(`
          id,
          created_at,
          user_id,
          posts!inner (
            id,
            image_url,
            user_id
          ),
          profiles (
            id,
            username,
            avatar_url,
            is_verified
          )
        `)
        .eq('posts.user_id', user.id)
        .neq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      // Get new followers
      const { data: followersData } = await supabase
        .from('followers')
        .select(`
          id,
          created_at,
          follower_id,
          profiles!followers_follower_id_fkey (
            id,
            username,
            avatar_url,
            is_verified
          )
        `)
        .eq('following_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      // Get notifications (including follow requests)
      const { data: notificationsData } = await supabase
        .from('notifications')
        .select(`
          id,
          type,
          created_at,
          read,
          actor_id,
          post_id,
          profiles!notifications_actor_id_fkey (
            id,
            username,
            avatar_url,
            is_verified
          ),
          posts (
            id,
            image_url
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      // Combine and format notifications
      const allNotifications: Notification[] = [];

      // Add notifications from the notifications table
      if (notificationsData) {
        notificationsData.forEach((notification: any) => {
          const baseNotification = {
            id: notification.id,
            type: notification.type,
            created_at: notification.created_at,
            read: notification.read,
            actor: notification.profiles
          };

          if (notification.type === 'follow_request') {
            // For follow requests, we need to get the follow request details
            allNotifications.push({
              ...baseNotification,
              followRequest: {
                id: notification.id, // This will be looked up properly in the handler
                requester_id: notification.actor_id,
                requested_id: user.id
              }
            });
          } else if (notification.type === 'like' && notification.posts) {
            allNotifications.push({
              ...baseNotification,
              post: notification.posts
            });
          } else {
            allNotifications.push(baseNotification);
          }
        });
      }

      // Add like notifications (legacy - keeping for now)
      if (likesData) {
        likesData.forEach((like: any) => {
          // Skip if we already have this from notifications table
          const existingNotification = allNotifications.find(n => 
            n.type === 'like' && n.actor.id === like.profiles.id && n.post?.id === like.posts.id
          );
          
          // Check if this notification was dismissed
          const notificationKey = `like_${like.profiles.id}_${like.posts.id}`;
          const isDismissed = dismissedNotifications.includes(notificationKey);
          
          if (!existingNotification && !isDismissed) {
            allNotifications.push({
              id: `like_${like.id}`,
              type: 'like',
              created_at: like.created_at,
              read: false,
              actor: like.profiles,
              post: like.posts
            });
          } else if (isDismissed) {
            console.log(`🚫 Skipping dismissed like notification: ${notificationKey}`);
          }
        });
      }

      // Add follow notifications (legacy - keeping for now)
      if (followersData) {
        followersData.forEach((follow: any) => {
          // Skip if we already have this from notifications table
          const existingNotification = allNotifications.find(n => 
            n.type === 'follow' && n.actor.id === follow.profiles.id
          );
          
          // Check if this notification was dismissed
          const notificationKey = `follow_${follow.profiles.id}`;
          const isDismissed = dismissedNotifications.includes(notificationKey);
          
          if (!existingNotification && !isDismissed) {
            allNotifications.push({
              id: `follow_${follow.id}`,
              type: 'follow',
              created_at: follow.created_at,
              read: false,
              actor: follow.profiles
            });
          } else if (isDismissed) {
            console.log(`🚫 Skipping dismissed follow notification: ${notificationKey}`);
          }
        });
      }

      // Remove duplicates with special handling for follow requests and follows
      const uniqueNotifications = new Map();
      
      allNotifications.forEach(notification => {
        // Create a unique key based on type and actor
        let key = `${notification.type}_${notification.actor.id}`;
        
        // For post-related notifications, include post ID to allow multiple likes from same user on different posts
        if (notification.post) {
          key += `_${notification.post.id}`;
        }
        
        const existing = uniqueNotifications.get(key);
        
        // Special handling for follow vs follow_request from same user
        if (notification.type === 'follow' || notification.type === 'follow_request') {
          const followKey = `follow_${notification.actor.id}`;
          const followRequestKey = `follow_request_${notification.actor.id}`;
          
          const existingFollow = uniqueNotifications.get(followKey);
          const existingFollowRequest = uniqueNotifications.get(followRequestKey);
          
          if (notification.type === 'follow') {
            // If we have a follow notification, keep it and remove any follow_request
            uniqueNotifications.set(followKey, notification);
            if (existingFollowRequest) {
              uniqueNotifications.delete(followRequestKey);
            }
          } else if (notification.type === 'follow_request') {
            // Only keep follow_request if there's no follow notification from same user
            if (!existingFollow) {
              uniqueNotifications.set(followRequestKey, notification);
            }
          }
        } else {
          // For other notification types, keep the most recent
          if (!existing || new Date(notification.created_at) > new Date(existing.created_at)) {
            uniqueNotifications.set(key, notification);
          }
        }
      });
      
      // Convert back to array and sort by date
      const deduplicatedNotifications = Array.from(uniqueNotifications.values());
      deduplicatedNotifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Final filtering for any remaining dismissed notifications (mainly for notifications table entries)
      const finalFilteredNotifications = deduplicatedNotifications.filter(notification => {
        let notificationKey = '';
        if (notification.type === 'like' && notification.post) {
          notificationKey = `like_${notification.actor.id}_${notification.post.id}`;
        } else if (notification.type === 'follow') {
          notificationKey = `follow_${notification.actor.id}`;
        } else if (notification.type === 'follow_request') {
          notificationKey = `follow_request_${notification.actor.id}`;
        } else {
          notificationKey = notification.id;
        }
        
        const shouldInclude = !dismissedNotifications.includes(notificationKey);
        if (!shouldInclude) {
          console.log(`🚫 Final filter: removing dismissed notification: ${notificationKey}`);
        }
        
        return shouldInclude;
      });

      console.log(`📊 Notifications: ${allNotifications.length} total, ${deduplicatedNotifications.length} after deduplication, ${finalFilteredNotifications.length} after final filtering`);
      
      // Log current notifications for debugging
      finalFilteredNotifications.forEach(notification => {
        let key = '';
        if (notification.type === 'like' && notification.post) {
          key = `like_${notification.actor.id}_${notification.post.id}`;
        } else if (notification.type === 'follow') {
          key = `follow_${notification.actor.id}`;
        } else if (notification.type === 'follow_request') {
          key = `follow_request_${notification.actor.id}`;
        } else {
          key = notification.id;
        }
        console.log(`📋 Final notification: ${notification.type} from ${notification.actor.username} (key: ${key})`);
      });
      
      setNotifications(finalFilteredNotifications);
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, showAuthModal]);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const formatTime = (dateString: string) => {
    const now = new Date();
    const notificationDate = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - notificationDate.getTime()) / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);
    const diffInWeeks = Math.floor(diffInDays / 7);

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h`;
    if (diffInDays < 7) return `${diffInDays}d`;
    if (diffInWeeks < 4) return `${diffInWeeks}w`;
    return notificationDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getNotificationText = (notification: Notification) => {
    switch (notification.type) {
      case 'like':
        return 'liked your post';
      case 'follow':
        return 'started following you';
      case 'comment':
        return 'commented on your post';
      case 'workout_like':
        return 'liked your workout';
      case 'follow_request':
        return 'wants to follow you';
      default:
        return '';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart size={20} color="#E91E63" fill="#E91E63" />;
      case 'follow':
        return <UserPlus size={20} color={colors.tint} />;
      case 'comment':
        return <MessageCircle size={20} color={colors.tint} />;
      case 'workout_like':
        return <Heart size={20} color="#E91E63" fill="#E91E63" />;
      case 'follow_request':
        return <UserPlus size={20} color="#FF9500" />;
      default:
        return <Heart size={20} color={colors.tint} />;
    }
  };

  const handleAcceptFollowRequest = async (notification: Notification) => {
    if (!notification.followRequest || processingRequest) return;
    
    setProcessingRequest(notification.id);
    
    try {
      const { requester_id, requested_id } = notification.followRequest;
      
      const { error } = await supabase.rpc('accept_follow_request', {
        p_requester_id: requester_id,
        p_requested_id: requested_id,
      });

      if (error) {
        throw new Error(`Failed to accept follow request: ${error.message}`);
      }

      // Optimistically remove the notification
        setNotifications(prev => prev.filter(n => n.id !== notification.id));

    } catch (err) {
      console.error(err);
      Alert.alert('Error', (err as Error).message);
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleDeclineFollowRequest = async (notification: Notification) => {
    if (!notification.followRequest || processingRequest) return;

    setProcessingRequest(notification.id);
    
    try {
      const { requester_id, requested_id } = notification.followRequest;

      // Deleting the follow_request will trigger the notification cleanup
      const { error } = await supabase
        .from('follow_requests')
        .delete()
        .match({ requester_id: requester_id, requested_id: requested_id });
        
      if (error) {
        throw new Error(`Failed to decline follow request: ${error.message}`);
      }

      // Optimistically remove the notification
      setNotifications(prev => prev.filter(n => n.id !== notification.id));

    } catch (err) {
      console.error(err);
      Alert.alert('Error', (err as Error).message);
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    if (notification.type === 'like' || notification.type === 'comment') {
      if (notification.post) {
        router.push(`/profile/${notification.post.id}`);
      }
    } else if (notification.type === 'follow') {
      router.push(`/${notification.actor.username}`);
    } else if (notification.type === 'follow_request') {
      // For follow requests, we handle them with accept/decline buttons, not navigation
      return;
    }
  };

  const handleDeleteNotification = async (notification: Notification) => {
    try {
      // Remove from UI immediately
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create a unique identifier for this notification
      let notificationKey = '';
      if (notification.type === 'like' && notification.post) {
        notificationKey = `like_${notification.actor.id}_${notification.post.id}`;
      } else if (notification.type === 'follow') {
        notificationKey = `follow_${notification.actor.id}`;
      } else if (notification.type === 'follow_request') {
        notificationKey = `follow_request_${notification.actor.id}`;
      } else {
        notificationKey = notification.id;
      }
      
      console.log(`🗑️ Deleting notification: ${notification.type} from ${notification.actor.username} (key: ${notificationKey})`);
      console.log('Full notification object:', JSON.stringify(notification, null, 2));

      // Store dismissed notification in local storage or create a dismissed_notifications table
      // For now, let's use a simple approach and mark it as read in the notifications table
      if (!notification.id.startsWith('like_') && !notification.id.startsWith('follow_')) {
        // If it's in the notifications table, delete it
        const { error } = await supabase
          .from('notifications')
          .delete()
          .eq('id', notification.id);

        if (error) {
          console.error('Error deleting notification:', error);
        }
             } else {
         // For legacy notifications, store the dismissal locally
         try {
           const dismissedNotificationsStr = await AsyncStorage.getItem('dismissedNotifications');
           const dismissedNotifications = dismissedNotificationsStr ? JSON.parse(dismissedNotificationsStr) : [];
           console.log('📦 Current dismissed notifications before adding:', dismissedNotifications);
           if (!dismissedNotifications.includes(notificationKey)) {
             dismissedNotifications.push(notificationKey);
             await AsyncStorage.setItem('dismissedNotifications', JSON.stringify(dismissedNotifications));
             console.log('✅ Added to dismissed notifications:', notificationKey);
             console.log('📦 Updated dismissed notifications:', dismissedNotifications);
           } else {
             console.log('⚠️ Notification key already in dismissed list:', notificationKey);
           }
         } catch (error) {
           console.error('Error storing dismissed notification:', error);
         }
       }
      
      // Remove from swiped set
      setSwipedNotifications(prev => {
        const newSet = new Set(prev);
        newSet.delete(notification.id);
        return newSet;
      });
      
    } catch (error) {
      console.error('Error deleting notification:', error);
      // Re-add to UI if deletion failed
      loadNotifications();
    }
  };

  const handleAvatarPress = (username: string) => {
    router.push(`/${username}`);
  };

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={[styles.backButton, { backgroundColor: colors.backgroundSecondary }]}
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Sign in to see your notifications
          </Text>
          <GradientButton
            title="Sign In"
            onPress={() => router.push('/auth')}
            variant="logo"
            size="medium"
            style={{ marginTop: 24 }}
          />
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={[styles.backButton, { backgroundColor: colors.backgroundSecondary }]}
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </View>
    );
  }

  const renderNotification = ({ item }: { item: Notification }) => {
  return (
            <SwipeableNotification
        key={item.id}
        notification={item}
              colors={colors}
        onPress={() => handleNotificationPress(item)}
        onDelete={() => handleDeleteNotification(item)}
      >
        <Pressable
          style={[
            styles.notificationCard,
            { 
              backgroundColor: colors.background,
              borderColor: colors.border,
              shadowColor: colors.text,
            },
            !item.read && [styles.notificationCardUnread, { borderLeftColor: colors.tint }]
          ]}
          onPress={(e) => {
            e.stopPropagation(); // Prevent notification press from firing
            handleNotificationPress(item);
          }}
              >
          {!item.read && <View style={[styles.unreadIndicator, { backgroundColor: colors.tint }]} />}
          
                <View style={styles.notificationContent}>
                <View style={styles.avatarContainer}>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation(); // Prevent notification press from firing
                  handleAvatarPress(item.actor.username);
                }}
                activeOpacity={0.8}
              >
                  <Image
                    source={{
                    uri: item.actor.avatar_url ||
                      `https://source.unsplash.com/random/100x100/?person&${item.actor.id}`,
                    }}
                    style={styles.avatar}
                  />
              </TouchableOpacity>
              <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
                {getNotificationIcon(item.type)}
                  </View>
                </View>

                <View style={styles.textContainer}>
                  <View style={styles.textRow}>
                    <Text style={[styles.username, { color: colors.text }]}>
                  {item.actor.username}
                    </Text>
                {item.actor.is_verified && (
                  <View style={styles.verificationBadge}>
                    <CheckCircle2 size={16} color="#fff" fill="#3B82F6" />
                  </View>
                    )}
                    <Text style={[styles.actionText, { color: colors.text }]}>
                  {getNotificationText(item)}
                    </Text>
                  </View>
                  <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                {formatTime(item.created_at)}
                  </Text>
                </View>

            {(item.post || item.workout) && (
                  <View style={styles.mediaContainer}>
                    <Image
                      source={{
                    uri: item.post?.image_url || item.workout?.progress_image_url || ''
                      }}
                      style={styles.mediaImage}
                    />
                  </View>
                )}
                </View>

          {item.type === 'follow_request' && (
                <View style={styles.followRequestActions}>
                  <TouchableOpacity
                      style={[
                        styles.actionButton, 
                        styles.acceptButton, 
                  processingRequest === item.id && { opacity: 0.7 }
                      ]}
                onPress={() => handleAcceptFollowRequest(item)}
                disabled={processingRequest === item.id}
                  >
                {processingRequest === item.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                    <Check size={18} color="#fff" />
                      )}
                      <Text style={styles.actionButtonText}>
                  {processingRequest === item.id ? 'Processing...' : 'Accept'}
                      </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                style={[styles.actionButton, styles.declineButton]}
                onPress={() => handleDeclineFollowRequest(item)}
                disabled={processingRequest === item.id}
                  >
                    <X size={18} color="#fff" />
                    <Text style={styles.actionButtonText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              )}
        </Pressable>
              </SwipeableNotification>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={[styles.backButton, { backgroundColor: colors.backgroundSecondary }]}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 32, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator style={{ marginTop: 32 }} size="large" color={colors.tint} />
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No notifications yet
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              When people like your posts or follow you, you'll see it here
            </Text>
          </View>
        ) : (
          notifications.map((notification) => renderNotification({ item: notification }))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 10,
    marginRight: 15,
    borderRadius: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.7,
  },
  signInButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  notificationCard: {
    marginVertical: 6,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
  },
  notificationCardUnread: {
    borderLeftWidth: 4,
    shadowOpacity: 0.08,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarBorder: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    borderRadius: 14,
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  textContainer: {
    flex: 1,
    paddingRight: 8,
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: 6,
  },
  verificationBadge: {
    marginRight: 6,
    marginTop: 1,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 20,
  },
  timeText: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
    opacity: 0.6,
  },
  mediaContainer: {
    marginLeft: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mediaImage: {
    width: 52,
    height: 52,
  },
  followRequestActions: {
    flexDirection: 'row',
    paddingTop: 16,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#10B981',
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: 8,
    right: 8,
  },
  // Swipe styles
  swipeContainer: {
    position: 'relative',
    marginVertical: 6,
  },
  deleteBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: 32,
    gap: 12,
    borderRadius: 16,
  },
  deleteText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  swipeableItem: {
    backgroundColor: 'transparent',
  },
}); 