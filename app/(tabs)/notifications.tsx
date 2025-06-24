import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Heart, UserPlus, MessageCircle, CircleCheck as CheckCircle2, Check, X } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import Colors from '@/constants/Colors';

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

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { isAuthenticated, showAuthModal } = useAuth();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      showAuthModal();
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
                id: notification.id, // We'll use the notification ID for now
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
          if (!existingNotification) {
            allNotifications.push({
              id: `like_${like.id}`,
              type: 'like',
              created_at: like.created_at,
              read: false,
              actor: like.profiles,
              post: like.posts
            });
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
          if (!existingNotification) {
            allNotifications.push({
              id: `follow_${follow.id}`,
              type: 'follow',
              created_at: follow.created_at,
              read: false,
              actor: follow.profiles
            });
          }
        });
      }

      // Sort by date
      allNotifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setNotifications(allNotifications);
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
    if (!notification.followRequest) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Find the actual follow request
      const { data: followRequestData, error: findError } = await supabase
        .from('follow_requests')
        .select('id')
        .eq('requester_id', notification.followRequest.requester_id)
        .eq('requested_id', user.id)
        .single();

      if (findError || !followRequestData) {
        Alert.alert('Error', 'Follow request not found.');
        loadNotifications(); // Refresh to remove stale notification
        return;
      }

      // Create the follow relationship
      const { error: followError } = await supabase
        .from('followers')
        .insert({
          follower_id: notification.followRequest.requester_id,
          following_id: notification.followRequest.requested_id,
        });

      if (followError) throw followError;

      // Delete the follow request (this will also trigger cleanup of the notification)
      const { error: deleteError } = await supabase
        .from('follow_requests')
        .delete()
        .eq('id', followRequestData.id);

      if (deleteError) throw deleteError;

      // Refresh notifications
      loadNotifications();
      
      Alert.alert('Follow Request Accepted', `${notification.actor.username} is now following you.`);
    } catch (error) {
      console.error('Error accepting follow request:', error);
      Alert.alert('Error', 'Failed to accept follow request. Please try again.');
    }
  };

  const handleDeclineFollowRequest = async (notification: Notification) => {
    if (!notification.followRequest) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Find the actual follow request
      const { data: followRequestData, error: findError } = await supabase
        .from('follow_requests')
        .select('id')
        .eq('requester_id', notification.followRequest.requester_id)
        .eq('requested_id', user.id)
        .single();

      if (findError || !followRequestData) {
        Alert.alert('Error', 'Follow request not found.');
        loadNotifications(); // Refresh to remove stale notification
        return;
      }

      // Delete the follow request (this will also trigger cleanup of the notification)
      const { error } = await supabase
        .from('follow_requests')
        .delete()
        .eq('id', followRequestData.id);

      if (error) throw error;

      // Refresh notifications
      loadNotifications();
      
      Alert.alert('Follow Request Declined', `You declined ${notification.actor.username}'s follow request.`);
    } catch (error) {
      console.error('Error declining follow request:', error);
      Alert.alert('Error', 'Failed to decline follow request. Please try again.');
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

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Sign in to see your notifications
          </Text>
          <TouchableOpacity 
            style={[styles.signInButton, { backgroundColor: colors.tint }]}
            onPress={() => router.push('/auth')}>
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {error ? (
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
          notifications.map((notification) => (
            <View
              key={notification.id}
              style={[
                styles.notificationItem,
                { 
                  backgroundColor: notification.read ? colors.background : colors.backgroundSecondary,
                  borderBottomColor: colors.border 
                }
              ]}
            >
              <TouchableOpacity
                style={styles.notificationContent}
                onPress={() => handleNotificationPress(notification)}
                activeOpacity={notification.type === 'follow_request' ? 1 : 0.7}
              >
                <View style={styles.avatarContainer}>
                  <Image
                    source={{
                      uri: notification.actor.avatar_url ||
                        `https://source.unsplash.com/random/40x40/?portrait&${notification.actor.id}`,
                    }}
                    style={styles.avatar}
                  />
                  <View style={styles.iconContainer}>
                    {getNotificationIcon(notification.type)}
                  </View>
                </View>

                <View style={styles.textContainer}>
                  <View style={styles.textRow}>
                    <Text style={[styles.username, { color: colors.text }]}>
                      {notification.actor.username}
                    </Text>
                    {notification.actor.is_verified && (
                      <CheckCircle2 size={14} color="#fff" fill="#3B82F6" />
                    )}
                    <Text style={[styles.actionText, { color: colors.text }]}>
                      {' '}{getNotificationText(notification)}
                    </Text>
                  </View>
                  <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                    {formatTime(notification.created_at)}
                  </Text>
                </View>

                {(notification.post || notification.workout) && (
                  <View style={styles.mediaContainer}>
                    <Image
                      source={{
                        uri: notification.post?.image_url || notification.workout?.progress_image_url || ''
                      }}
                      style={styles.mediaImage}
                    />
                  </View>
                )}
              </TouchableOpacity>

              {notification.type === 'follow_request' && (
                <View style={styles.followRequestActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton, { backgroundColor: colors.tint }]}
                    onPress={() => handleAcceptFollowRequest(notification)}
                  >
                    <Check size={18} color="#fff" />
                    <Text style={styles.actionButtonText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.declineButton, { backgroundColor: colors.textSecondary }]}
                    onPress={() => handleDeclineFollowRequest(notification)}
                  >
                    <X size={18} color="#fff" />
                    <Text style={styles.actionButtonText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
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
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  backButton: {
    padding: 8,
    marginRight: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
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
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  signInButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  notificationItem: {
    borderBottomWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  iconContainer: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 2,
  },
  textContainer: {
    flex: 1,
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
  },
  actionText: {
    fontSize: 15,
    fontWeight: '400',
  },
  timeText: {
    fontSize: 13,
    marginTop: 2,
  },
  mediaContainer: {
    marginLeft: 8,
  },
  mediaImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  followRequestActions: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  acceptButton: {
    flex: 1,
  },
  declineButton: {
    flex: 1,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
}); 