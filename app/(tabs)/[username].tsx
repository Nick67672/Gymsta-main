import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MessageSquare, MoreVertical, CircleCheck as CheckCircle2, Heart, Grid3x3, Activity, Dumbbell, UserPlus, UserCheck } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useBlocking } from '@/context/BlockingContext';
import Colors from '@/constants/Colors';
import StoryViewer from '@/components/StoryViewer';
import WorkoutDetailModal from '@/components/WorkoutDetailModal';

interface ProfileStory {
  id: string;
  media_url: string;
  user_id: string;
  created_at?: string;
}

interface Profile {
  id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  gym: string | null;
  is_early_adopter: boolean;
  is_verified: boolean;
  is_private: boolean;
  _count: {
    followers: number;
    following: number;
  };
  is_following: boolean;
  has_story: boolean;
  follow_request_sent: boolean;
}

interface WorkoutSummary {
  id: string;
  progress_image_url: string | null;
  created_at: string;
  exercises: {
    name: string;
  }[] | null;
}

interface Post {
  id: string;
  caption: string | null;
  image_url: string;
  created_at: string;
  likes: {
    id: string;
    user_id: string;
  }[];
}

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { isAuthenticated, showAuthModal } = useAuth();
  const { blockUser, isUserBlocked } = useBlocking();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [stories, setStories] = useState<ProfileStory[]>([]);
  const [lifts, setLifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'workouts' | 'lifts'>('posts');
  const [showingStories, setShowingStories] = useState(false);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);

  // Format numbers for better display (e.g., 1.2K, 1.5M)
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toString();
  };

  useEffect(() => {
    // Get current user's ID
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
      }
    });
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Get profile with follower counts
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          bio,
          avatar_url,
          gym,
          is_early_adopter,
          is_verified,
          is_private,
          followers!followers_following_id_fkey(count),
          following:followers!followers_follower_id_fkey(count)
        `)
        .eq('username', username)
        .single();

      if (profileError) throw profileError;

      if (!profileData) {
        setError('Profile not found');
        return;
      }

      // If this is the current user's profile, redirect to the profile tab
      if (user && profileData.id === user.id) {
        router.replace('/(tabs)/profile');
        return;
      }

      // Check if the current user is following this profile
      let isFollowing = false;
      let followRequestSent = false;
      if (user) {
        const { data: followData } = await supabase
          .from('followers')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', profileData.id)
          .maybeSingle();
        
        isFollowing = !!followData;

        // Check if there's a pending follow request
        if (!isFollowing) {
          const { data: followRequestData } = await supabase
            .from('follow_requests')
            .select('id')
            .eq('requester_id', user.id)
            .eq('requested_id', profileData.id)
            .maybeSingle();
          
          followRequestSent = !!followRequestData;
        }
      }

      // Load user's stories
      const { data: storiesData } = await supabase
        .from('stories')
        .select('id, media_url')
        .eq('user_id', profileData.id)
        .order('created_at', { ascending: true });

      setStories((storiesData as ProfileStory[]) || []);

      // Load user's workouts
      const { data: workoutsData, error: workoutsError } = await supabase
        .from('workouts')
        .select('id, created_at, progress_image_url, exercises')
        .eq('user_id', profileData.id)
        .order('created_at', { ascending: false });

      if (!workoutsError) {
        setWorkouts(workoutsData || []);
      }

      setProfile({
        ...profileData,
        is_private: profileData.is_private || false,
        _count: {
          followers: profileData.followers?.[0]?.count || 0,
          following: profileData.following?.[0]?.count || 0,
        },
        is_following: isFollowing,
        has_story: !!(storiesData && storiesData.length > 0),
        follow_request_sent: followRequestSent
      });

      // Load user's posts with likes
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('id, caption, image_url, created_at, likes(id, user_id)')
        .eq('user_id', profileData.id)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      setPosts(postsData || []);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!profile || followLoading) return;

    setFollowLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to follow users');
        return;
      }

      // Check if user is blocked or has blocked the target user
      console.log('Checking if user is blocked:', profile.username);
      if (isUserBlocked(profile.id)) {
        console.log('User has blocked the target user');
        Alert.alert('Cannot Follow', 'You have blocked this user. Unblock them to follow.');
        return;
      }

      // Check if the target user has blocked the current user
      console.log('Checking if target user has blocked current user');
      const { data: blockedByTarget, error: blockCheckError } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', profile.id)
        .eq('blocked_id', user.id)
        .maybeSingle();

      if (blockCheckError) {
        console.error('Error checking if blocked by target:', blockCheckError);
        // Continue anyway if the table doesn't exist or there's an error
      }

      if (blockedByTarget) {
        console.log('Target user has blocked current user');
        Alert.alert('Cannot Follow', 'This user has blocked you and you cannot follow them.');
        return;
      }

      console.log('No blocking issues found, proceeding with follow logic');

      if (profile.is_following) {
        // Unfollow
        await supabase
          .from('followers')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', profile.id);

        setProfile(prev => prev ? {
          ...prev,
          is_following: false,
          _count: {
            ...prev._count,
            followers: prev._count.followers - 1
          }
        } : null);
      } else if (profile.follow_request_sent) {
        // Cancel follow request
        const { error: cancelError } = await supabase
          .from('follow_requests')
          .delete()
          .eq('requester_id', user.id)
          .eq('requested_id', profile.id);

        if (cancelError) throw cancelError;

        setProfile(prev => prev ? {
          ...prev,
          follow_request_sent: false
        } : null);

        Alert.alert('Follow Request Cancelled', 'Your follow request has been cancelled.');
      } else {
        // Check if account is private
        if (profile.is_private) {
          // Check if follow request already exists
          const { data: existingRequest } = await supabase
            .from('follow_requests')
            .select('id')
            .eq('requester_id', user.id)
            .eq('requested_id', profile.id)
            .maybeSingle();

          if (existingRequest) {
            Alert.alert('Request Already Sent', 'You have already sent a follow request to this user.');
            return;
          }

          // Send follow request
          await supabase
            .from('follow_requests')
            .insert({
              requester_id: user.id,
              requested_id: profile.id,
            });

          // Update profile state to show request sent
          setProfile(prev => prev ? {
            ...prev,
            follow_request_sent: true
          } : null);

          Alert.alert('Follow Request Sent', 'Your follow request has been sent. You will be notified when they respond.');
        } else {
          // Public account - follow directly
          console.log('Attempting to follow user:', profile.username, 'Profile ID:', profile.id);
          
          const { error: followError } = await supabase
            .from('followers')
            .insert({
              follower_id: user.id,
              following_id: profile.id,
            });

          if (followError) {
            console.error('Follow error:', followError);
            throw followError;
          }

          console.log('Successfully followed user:', profile.username);

          setProfile(prev => prev ? {
            ...prev,
            is_following: true,
            _count: {
              ...prev._count,
              followers: prev._count.followers + 1
            }
          } : null);
        }
      }
    } catch (err) {
      console.error('Error following/unfollowing:', err);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to update follow status';
      if (err instanceof Error) {
        if (err.message.includes('23505')) {
          errorMessage = 'You are already following this user';
        } else if (err.message.includes('42501')) {
          errorMessage = 'Permission denied. Please check your account status.';
        } else {
          errorMessage = `Error: ${err.message}`;
        }
      }
      
      Alert.alert('Follow Error', errorMessage);
      setError(errorMessage);
      // Reload profile to ensure correct state
      loadProfile();
    } finally {
      setFollowLoading(false);
    }
  };

  const startChat = async () => {
    if (!profile || !currentUserId || chatLoading) return;

    setChatLoading(true);
    try {
      // Check if a chat already exists between the two users
      const { data: userChats, error: chatsError } = await supabase
        .from('a_chat_users')
        .select('chat_id')
        .eq('user_id', currentUserId);
      if (chatsError) throw chatsError;

      let chatId: string | null = null;
      if (userChats && userChats.length > 0) {
        const chatIds = userChats.map((chat) => chat.chat_id);
        const { data: sharedChat, error: sharedError } = await supabase
          .from('a_chat_users')
          .select('chat_id')
          .eq('user_id', profile.id)
          .in('chat_id', chatIds)
          .maybeSingle();
        if (sharedError) throw sharedError;
        if (sharedChat) {
          chatId = sharedChat.chat_id;
        }
      }

      if (!chatId) {
        // Create new chat if none exists
        const { data: newChat, error: chatError } = await supabase
          .from('a_chat')
          .insert({ last_message: '' })
          .select()
          .single();
        if (chatError) throw chatError;
        if (!newChat) throw new Error('Failed to create chat');
        chatId = newChat.id;

        // Get the last chat user ID
        const { data: lastUser, error: lastUserError } = await supabase
          .from('a_chat_users')
          .select('id')
          .order('id', { ascending: false })
          .limit(1)
          .single();
        if (lastUserError && lastUserError.code !== 'PGRST116') {
          throw lastUserError;
        }
        const startId = (lastUser?.id || 0) + 1;
        // Add chat participants (both users)
        const { error: usersError } = await supabase
          .from('a_chat_users')
          .insert([
            { id: startId, chat_id: chatId, user_id: currentUserId },
            { id: startId + 1, chat_id: chatId, user_id: profile.id }
          ]);
        if (usersError) throw usersError;
      }

      // Navigate to the chat
      router.push(`/chat/${profile.username}`);
    } catch (err) {
      console.error('Error starting chat:', err);
      setError('Failed to start chat');
    } finally {
      setChatLoading(false);
    }
  };

  const handleBlockUser = async () => {
    if (!profile) return;
    
    try {
      setBlocking(true);
      setShowMenu(false);
      
      await blockUser(profile.id);
      
      Alert.alert(
        'User Blocked', 
        `You have blocked ${profile.username}. They will no longer be able to message you, and you won't see their posts.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to avoid showing blocked user's profile
              router.back();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error blocking user:', error);
      Alert.alert('Error', 'Failed to block user. Please try again.');
    } finally {
      setBlocking(false);
    }
  };

  const handleReportUser = async () => {
    if (!profile) return;
    
    try {
      setReporting(true);
      setShowMenu(false);
      
      // Update the is_reported column to true in the profiles table
      const { error: reportError } = await supabase
        .from('profiles')
        .update({ is_reported: true })
        .eq('id', profile.id);

      if (reportError) throw reportError;
      
      Alert.alert(
        'User Reported', 
        `You have reported ${profile.username}. Our team will review this report and take appropriate action.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back after reporting
              router.back();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error reporting user:', error);
      Alert.alert('Error', 'Failed to report user. Please try again.');
    } finally {
      setReporting(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!isAuthenticated) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Optimistically update the UI immediately
      setPosts(currentPosts => 
        currentPosts.map(post => {
          if (post.id === postId) {
            const newLike = { id: `temp-${Date.now()}`, user_id: user.id };
            return {
              ...post,
              likes: [...post.likes, newLike]
            };
          }
          return post;
        })
      );

      const { error } = await supabase
        .from('likes')
        .insert({
          post_id: postId,
          user_id: user.id,
        });

      if (error) {
        // Revert optimistic update on error
        setPosts(currentPosts => 
          currentPosts.map(post => {
            if (post.id === postId) {
              return {
                ...post,
                likes: post.likes.filter(like => !like.id.toString().startsWith('temp-'))
              };
            }
            return post;
          })
        );
        throw error;
      }

      // Refresh the post data to get the real like ID from database
      const { data: updatedPost } = await supabase
        .from('posts')
        .select(`
          id,
          likes (
            id,
            user_id
          )
        `)
        .eq('id', postId)
        .single();

      if (updatedPost) {
        setPosts(currentPosts => 
          currentPosts.map(post => {
            if (post.id === postId) {
              return {
                ...post,
                likes: updatedPost.likes
              };
            }
            return post;
          })
        );
      }

    } catch (err) {
      console.error('Error liking post:', err);
    }
  };

  const handleUnlike = async (postId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Find the like to remove for optimistic update
      const currentPost = posts.find(p => p.id === postId);
      const likeToRemove = currentPost?.likes.find(like => like.user_id === user.id);
      
      // Optimistically update the UI immediately
      setPosts(currentPosts => 
        currentPosts.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              likes: post.likes.filter(like => like.user_id !== user.id)
            };
          }
          return post;
        })
      );

      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);

      if (error) {
        // Revert optimistic update on error
        if (likeToRemove) {
          setPosts(currentPosts => 
            currentPosts.map(post => {
              if (post.id === postId) {
                return {
                  ...post,
                  likes: [...post.likes, likeToRemove]
                };
              }
              return post;
            })
          );
        }
        throw error;
      }

    } catch (err) {
      console.error('Error unliking post:', err);
    }
  };

  // Load profile when username changes
  useEffect(() => {
    if (username) {
      loadProfile();
    }
  }, [username]);

  // Set up real-time subscription for follower changes
  useEffect(() => {
    if (!profile?.id || !currentUserId) return;

    const subscription = supabase
      .channel(`followers_changes_${profile.id}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'followers',
          filter: `following_id=eq.${profile.id}`,
        },
        (payload: any) => {
          // Only reload if the change affects the current user's relationship with this profile
          if (payload.new?.follower_id === currentUserId || payload.old?.follower_id === currentUserId) {
            loadProfile();
          } else {
            // Just update the follower count without full reload
            setProfile(prev => prev ? {
              ...prev,
              _count: {
                ...prev._count,
                followers: payload.eventType === 'INSERT' 
                  ? prev._count.followers + 1 
                  : prev._count.followers - 1
              }
            } : null);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [profile?.id, currentUserId]);

  // Set up real-time subscription for follow request changes
  useEffect(() => {
    if (!profile?.id || !currentUserId) return;

    const subscription = supabase
      .channel(`follow_requests_changes_${profile.id}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'follow_requests',
          filter: `requested_id=eq.${profile.id}`,
        },
        (payload: any) => {
          // Only update if the change affects the current user's request to this profile
          if (payload.new?.requester_id === currentUserId || payload.old?.requester_id === currentUserId) {
            setProfile(prev => prev ? {
              ...prev,
              follow_request_sent: payload.eventType === 'INSERT'
            } : null);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [profile?.id, currentUserId]);

  // Set up real-time subscription for likes changes
  useEffect(() => {
    if (!profile?.id) return;
    
    const likesChannel = supabase.channel('username-profile-likes-channel-' + Date.now())
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes'
        },
        async (payload) => {
          // When likes change, update the specific post in our posts array
          if (payload.eventType === 'INSERT') {
            const { post_id } = payload.new;
            setPosts(currentPosts => 
              currentPosts.map(post => {
                if (post.id === post_id) {
                  return {
                    ...post,
                    likes: [...post.likes, { id: payload.new.id, user_id: payload.new.user_id }]
                  };
                }
                return post;
              })
            );
          } else if (payload.eventType === 'DELETE') {
            const { post_id } = payload.old;
            setPosts(currentPosts => 
              currentPosts.map(post => {
                if (post.id === post_id) {
                  return {
                    ...post,
                    likes: post.likes.filter(like => like.id !== payload.old.id)
                  };
                }
                return post;
              })
            );
          }
        }
      )
      .subscribe();

    return () => {
      likesChannel.unsubscribe();
    };
  }, [profile?.id]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.error, { color: colors.error }]}>{error || 'Failed to load profile'}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.logo, { color: colors.tint }]}>← Back</Text>
          </TouchableOpacity>
      </View>

      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 20 }}>
        <TouchableOpacity 
          onPress={profile.has_story ? () => setShowingStories(true) : undefined}
          style={[
            styles.profileImageContainer,
            profile.has_story && styles.hasStoryRing,
            { backgroundColor: colors.background }
          ]}>
            <Image
              source={{ 
                uri: profile.avatar_url || 'https://source.unsplash.com/random/200x200/?portrait'
              }}
              style={styles.profileImage}
            />
        </TouchableOpacity>

        <View style={styles.profileInfo}>
          <View style={styles.usernameContainer}>
            <Text style={[styles.username, { color: colors.text }]}>{profile.username}</Text>
            {profile.is_verified && (
              <CheckCircle2 size={20} color="#fff" fill="#3B82F6" />
            )}
          </View>
          <Text style={[styles.bio, { color: colors.textSecondary }]}>{profile.bio || 'No bio yet'}</Text>
          {profile.gym && (
            <View style={styles.gymContainer}>
              <Text style={[styles.gymLabel, { color: colors.textSecondary }]}>📍 </Text>
              <Text style={[styles.gymName, { color: colors.text }]}>{profile.gym}</Text>
            </View>
          )}
          
          {currentUserId && currentUserId !== profile.id && (
            <View style={[
              styles.buttonContainer,
              styles.singleButtonContainer
            ]}>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.primaryButton,
                  (profile.is_following || profile.follow_request_sent) && [styles.followingButton, { backgroundColor: colors.background, borderColor: colors.tint }],
                  followLoading && styles.buttonDisabled
                ]}
                onPress={handleFollow}
                disabled={followLoading}>
                {followLoading ? (
                  <ActivityIndicator size="small" color={(profile.is_following || profile.follow_request_sent) ? colors.tint : '#fff'} />
                ) : (
                  <View style={styles.buttonContent}>
                    {profile.is_following ? (
                      <UserCheck size={18} color={colors.tint} />
                    ) : profile.follow_request_sent ? (
                      <UserPlus size={18} color={colors.tint} />
                    ) : (
                      <UserPlus size={18} color="#fff" />
                    )}
                    <Text style={[
                      styles.buttonText,
                      (profile.is_following || profile.follow_request_sent) && { color: colors.tint }
                    ]}>
                      {profile.is_following ? 'Following' : profile.follow_request_sent ? 'Requested' : 'Follow'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.secondaryButton, { backgroundColor: colors.background, borderColor: colors.tint }, chatLoading && styles.buttonDisabled]}
                onPress={startChat}
                disabled={chatLoading}>
                {chatLoading ? (
                  <ActivityIndicator size="small" color={colors.tint} />
                ) : (
                  <View style={styles.buttonContent}>
                    <MessageSquare size={18} color={colors.tint} />
                    <Text style={[styles.buttonText, styles.secondaryButtonText, { color: colors.tint }]}>Message</Text>
                  </View>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.moreButton}
                onPress={() => setShowMenu(true)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MoreVertical size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={[
          styles.statsContainer, 
          { 
            backgroundColor: colors.background
          }
        ]}>
          <View style={[styles.statItem, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.statNumber, { color: colors.tint }]}>{formatNumber(posts.length)}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Posts</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.statNumber, { color: colors.tint }]}>{formatNumber(profile._count.followers)}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Followers</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.statNumber, { color: colors.tint }]}>{formatNumber(profile._count.following)}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Following</Text>
          </View>
        </View>

        {/* Toggle Tabs */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, activeTab === 'posts' && styles.activeToggle]}
            onPress={() => setActiveTab('posts')}
          >
            <Grid3x3 size={20} color={activeTab === 'posts' ? colors.tint : colors.text} />
            {activeTab === 'posts' && (
              <View style={[styles.underline, { backgroundColor: colors.tint }]} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleButton, activeTab === 'lifts' && styles.activeToggle]}
            onPress={() => setActiveTab('lifts')}
          >
            <Activity size={20} color={activeTab === 'lifts' ? colors.tint : colors.text} />
            {activeTab === 'lifts' && (
              <View style={[styles.underline, { backgroundColor: colors.tint }]} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleButton, activeTab === 'workouts' && styles.activeToggle]}
            onPress={() => setActiveTab('workouts')}
          >
            <Dumbbell size={20} color={activeTab === 'workouts' ? colors.tint : colors.text} />
            {activeTab === 'workouts' && (
              <View style={[styles.underline, { backgroundColor: colors.tint }]} />
            )}
          </TouchableOpacity>
        </View>

        {/* Content based on active tab */}
        {activeTab === 'posts' ? (
        <View style={styles.postsGrid}>
          {posts.map((post) => (
            <TouchableOpacity
              key={post.id}
              style={styles.postContainer}
              onPress={() => router.push(`/profile/${post.id}`)}>
              <View style={styles.postImageContainer}>
                <Image source={{ uri: post.image_url }} style={styles.postImage} />
                <View style={styles.postOverlay}>
                  <View style={styles.likeBadge}>
                    <Heart size={14} color="#fff" fill="#fff" />
                    <Text style={styles.likesText}>{formatNumber(post.likes?.length || 0)}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        ) : activeTab === 'lifts' ? (
          lifts.length === 0 ? (
            <View style={styles.progressContainer}>
              <Text style={[styles.progressText, { color: colors.textSecondary }]}>No lift records to show yet.</Text>
              <Text style={[styles.progressSubText, { color: colors.textSecondary }]}>Start tracking your lifts to see progress here.</Text>
            </View>
          ) : (
            <View style={styles.postsGrid}>
              {lifts.map((lift) => (
                <TouchableOpacity
                  key={lift.id}
                  style={styles.postContainer}>
                  <View style={[styles.liftContainer, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, borderWidth: 1 }]}>
                    <Text style={[styles.liftName, { color: colors.text }]}>
                      {lift.exercise_name}
                    </Text>
                    <Text style={[styles.liftWeight, { color: colors.tint }]}>
                      {lift.weight}kg
                    </Text>
                    <Text style={[styles.liftReps, { color: colors.textSecondary }]}>
                      {lift.reps} reps
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
          )
        ) : (
          workouts.length === 0 ? (
            <View style={styles.progressContainer}>
              <Text style={[styles.progressText, { color: colors.textSecondary }]}>No workouts to show yet.</Text>
            </View>
          ) : (
            <View style={styles.postsGrid}>
              {workouts.map((workout) => (
                <TouchableOpacity
                  key={workout.id}
                  style={styles.workoutCard}
                  onPress={() => {
                    setSelectedWorkoutId(workout.id);
                    setShowWorkoutModal(true);
                  }}
                  activeOpacity={0.9}>
                  {workout.progress_image_url ? (
                    <View style={styles.workoutImageContainer}>
                      <Image source={{ uri: workout.progress_image_url }} style={styles.workoutImage} />
                      <View style={styles.workoutOverlay}>
                        <View style={[styles.exerciseBadge, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
                          <Dumbbell size={14} color="#fff" />
                          <Text style={styles.exerciseBadgeText}>
                            {workout.exercises?.length || 0}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View style={[styles.noImageWorkoutContainer, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                      <View style={[styles.workoutIconContainer, { backgroundColor: colors.tint + '20' }]}>
                        <Dumbbell size={24} color={colors.tint} />
                      </View>
                      <Text style={[styles.workoutTitle, { color: colors.text }]} numberOfLines={1}>
                        {workout.exercises?.[0]?.name || 'Workout'}
                      </Text>
                      <Text style={[styles.workoutSubtitle, { color: colors.textSecondary }]}>
                        {workout.exercises?.length || 0} exercises
                      </Text>
                      <Text style={[styles.workoutDate, { color: colors.textSecondary }]}>
                        {new Date(workout.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )
        )}
      </ScrollView>

      <Modal
        visible={showingStories}
        animationType="fade"
        onRequestClose={() => setShowingStories(false)}>
        <StoryViewer
          stories={stories}
          onComplete={() => setShowingStories(false)}
        />
      </Modal>

      <WorkoutDetailModal
        workoutId={selectedWorkoutId}
        visible={showWorkoutModal}
        onClose={() => {
          setShowWorkoutModal(false);
          setSelectedWorkoutId(null);
        }}
      />

      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={styles.menuPopup}>
            <TouchableOpacity 
              style={[styles.blockButton, blocking && styles.buttonDisabled]} 
              onPress={handleBlockUser}
              disabled={blocking}
            >
              {blocking ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.blockButtonText}>Block User</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.reportButton, reporting && styles.buttonDisabled]}
              onPress={handleReportUser}
              disabled={reporting}
            >
              {reporting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.reportButtonText}>Report User</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  error: {
    textAlign: 'center',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  logo: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  profileImageContainer: {
    alignSelf: 'center',
    marginTop: 20,
    padding: 5,
    borderRadius: 75,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileInfo: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 15,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  bio: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  gymContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  gymLabel: {
    fontSize: 16,
    marginRight: 4,
  },
  gymName: {
    fontSize: 16,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 25,
    paddingHorizontal: 20,
    gap: 12,
    alignItems: 'center',
  },
  singleButtonContainer: {
    justifyContent: 'center',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButton: {
    backgroundColor: '#6C5CE7',
  },
  secondaryButton: {
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  secondaryButtonText: {
    // Color set through component
  },
  followingButton: {
    borderWidth: 1.5,
    backgroundColor: 'transparent',
    shadowOpacity: 0.05,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    marginTop: 15,
    marginBottom: 5,
  },
  statItem: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 60,
    flex: 1,
    marginHorizontal: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 5,
  },
  postContainer: {
    width: '33.33%',
    padding: 5,
  },
  postImageContainer: {
    position: 'relative',
  },
  postImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
  },
  postOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    borderRadius: 8,
  },
  likeBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likesText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  hasStoryRing: {
    padding: 4,
    backgroundColor: '#3B82F6',
  },
  postTime: {
    fontSize: 12,
  },
  moreButton: {
    backgroundColor: 'transparent',
    padding: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuPopup: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    elevation: 5,
  },
  blockButton: {
    backgroundColor: '#6C5CE7',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  blockButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  reportButton: {
    backgroundColor: '#DC3545',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  reportButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginTop: 10,
    marginBottom: 10,
  },
  toggleButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    position: 'relative',
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '500',
  },
  activeToggleText: {
    fontWeight: '600',
  },
  underline: {
    position: 'absolute',
    bottom: 0,
    width: '50%',
    height: 2,
    borderRadius: 1,
  },
  activeToggle: {},
  progressContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    fontSize: 16,
    textAlign: 'center',
  },
  progressSubText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  noImageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  noImageText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  liftContainer: {
    padding: 15,
    borderRadius: 12,
    overflow: 'hidden',
  },
  liftName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  liftWeight: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  liftReps: {
    fontSize: 14,
    fontWeight: '500',
  },
  workoutCard: {
    width: '33.33%',
    padding: 5,
  },
  workoutImageContainer: {
    position: 'relative',
  },
  workoutImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
  },
  workoutOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  exerciseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  exerciseBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  noImageWorkoutContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  workoutIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  workoutTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  workoutSubtitle: {
    fontSize: 12,
    marginBottom: 2,
    textAlign: 'center',
  },
  workoutDate: {
    fontSize: 11,
    textAlign: 'center',
  },
});