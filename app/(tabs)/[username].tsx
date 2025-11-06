import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Alert, Platform, FlatList } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { MessageSquare, MoreVertical, CircleCheck as CheckCircle2, Heart, Grid3x3, Activity, Dumbbell, UserPlus, UserCheck } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useBlocking } from '@/context/BlockingContext';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import StoryViewer from '@/components/StoryViewer';
import WorkoutDetailModal from '@/components/WorkoutDetailModal';
import { ThemedButton } from '@/components/ThemedButton';
import { goBack } from '@/lib/goBack';
import { getAvatarUrl } from '@/lib/avatarUtils';

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
  progress_image_url?: string | null;
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
  type?: string; // Added to distinguish between posts and workouts
}

type ProfileFeedItem =
  | (Post & { type: 'post'; comments_count: number })
  | ({
      type: 'workout';
      id: string;
      created_at: string;
      exercises: any[];
      workout_sharing_information?: any[];
      image_url: string | null;
      caption: string | null;
      comments_count: number;
      likes?: { id: string; user_id: string }[];
    });

interface Follower {
  id: string;
  follower_id: string;
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
  } | null;
}

interface Following {
  id: string;
  following_id: string;
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
  } | null;
}

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { isAuthenticated, showAuthModal } = useAuth();
  const { blockUser, isUserBlocked } = useBlocking();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<ProfileFeedItem[]>([]);
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
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [following, setFollowing] = useState<Following[]>([]);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [flaggedPosts, setFlaggedPosts] = useState<{ [postId: string]: boolean }>({});
  const [flagging, setFlagging] = useState<{ [postId: string]: boolean }>({});
  const videoRefs = useRef<{ [key: string]: any }>({});

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
      console.log('Loading profile for username:', username);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('Auth error in loadProfile:', authError);
        throw authError;
      }

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
          const { data: followRequestData, error: followRequestError } = await supabase
            .from('follow_requests')
            .select('id')
            .eq('requester_id', user.id)
            .eq('requested_id', profileData.id)
            .maybeSingle();
          
          if (followRequestError) {
            console.error('Error checking follow request:', followRequestError);
          }
          
          followRequestSent = !!followRequestData;
          
          console.log('Follow request check for', profileData.username, ':', {
            followRequestSent,
            hasData: !!followRequestData
          });
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
        .select('id, created_at, exercises')
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

      // Load user's posts with likes and profiles
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('id, caption, image_url, created_at, user_id, media_type, product_id, likes(id, user_id), profiles(id, username, avatar_url, is_verified)')
        .eq('user_id', profileData.id)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      
      // Get comment counts for user's posts
      const postIds = postsData?.map(post => post.id) || [];
      let commentCounts: { [postId: string]: number } = {};
      
      if (postIds.length > 0) {
        const { data: commentsData } = await supabase
          .from('comments')
          .select('post_id, id')
          .in('post_id', postIds);
        
        // Count comments per post
        commentCounts = (commentsData || []).reduce((acc, comment) => {
          acc[comment.post_id] = (acc[comment.post_id] || 0) + 1;
          return acc;
        }, {} as { [postId: string]: number });
      }

      // Load user's workout posts (no likes relationship on workouts)
      const { data: workoutPostsData, error: workoutPostsError } = await supabase
        .from('workouts')
        .select(`
          id, 
          created_at, 
          exercises,
          workout_sharing_information (*)
        `)
        .eq('user_id', profileData.id)
        .order('created_at', { ascending: false });

      if (workoutPostsError) {
        console.error('Error loading workout posts:', workoutPostsError);
      }

      // Combine posts and workouts, marking workouts with type
      const postsWithCommentCount: ProfileFeedItem[] = (postsData || []).map(post => ({
        ...post,
        comments_count: commentCounts[post.id] || 0,
        type: 'post'
      }));

      const workoutPosts: ProfileFeedItem[] = (workoutPostsData || []).map((workout: any) => ({ 
        type: 'workout',
        id: workout.id,
        created_at: workout.created_at,
        exercises: workout.exercises,
        workout_sharing_information: workout.workout_sharing_information,
        image_url: workout.workout_sharing_information?.[0]?.photo_url || null,
        caption: workout.workout_sharing_information?.[0]?.caption || null,
        comments_count: 0,
        likes: []
      }));

      const combinedPosts: ProfileFeedItem[] = [...postsWithCommentCount, ...workoutPosts]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setPosts(combinedPosts);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!profile || !currentUserId) return;

    if (!isAuthenticated) {
      showAuthModal();
        return;
      }

    setFollowLoading(true);

    try {
      if (profile.is_following) {
        // --- UNFOLLOW ---
        const { error } = await supabase
          .from('followers')
          .delete()
          .match({ follower_id: currentUserId, following_id: profile.id });

        if (error) throw error;

      } else if (profile.is_private) {
        // --- PRIVATE PROFILE: REQUEST OR WITHDRAW REQUEST ---
        if (profile.follow_request_sent) {
          // Withdraw the existing follow request.
          const { error } = await supabase
          .from('follow_requests')
          .delete()
            .match({ requester_id: currentUserId, requested_id: profile.id });

          if (error) throw error;
          Alert.alert('Request Withdrawn', 'Your follow request has been withdrawn.');

      } else {
          // Send a new follow request.
          const { error } = await supabase
            .from('follow_requests')
            .insert({ requester_id: currentUserId, requested_id: profile.id });

          if (error) throw error;
          Alert.alert('Request Sent', 'Your follow request has been sent.');
        }

        } else {
        // --- PUBLIC PROFILE: FOLLOW ---
        const { error } = await supabase
            .from('followers')
          .insert({ follower_id: currentUserId, following_id: profile.id });

        if (error) throw error;
          }

      // Optimistically update the profile state instead of reloading
      if (profile.is_following) {
        // Just unfollowed
        setProfile(prev => prev ? {
          ...prev,
          is_following: false,
          _count: {
            ...prev._count,
            followers: prev._count.followers - 1
          }
        } : null);
      } else if (profile.is_private) {
        // Private profile - toggle follow request state
        setProfile(prev => prev ? {
          ...prev,
          follow_request_sent: !prev.follow_request_sent
        } : null);
      } else {
        // Public profile - just followed
        setProfile(prev => prev ? {
          ...prev,
          is_following: true,
          _count: {
            ...prev._count,
            followers: prev._count.followers + 1
          }
        } : null);
      }

    } catch (error) {
      const errorMessage = (error as Error).message;
      console.error('Error in handleFollow:', errorMessage);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
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
              goBack();
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
              goBack();
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
    if (!isAuthenticated) {
      showAuthModal();
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const tempLike = { id: String(Date.now()), user_id: user.id };
      const originalPosts = [...posts];

      // Optimistically update UI
      setPosts(arr => arr.map(post => post.id === postId && (post as any).likes && !(post as any).likes.some((l: any) => l.user_id === user.id)
        ? { ...post, likes: [ ...(post as any).likes || [], tempLike ] }
        : post
      ));

      const { data: insertedRows, error } = await supabase
        .from('likes')
        .insert({ post_id: postId, user_id: user.id })
        .select('id, user_id');

      if (error) {
        console.error('Error liking post:', error);
        // Rollback on failure
        setPosts(originalPosts);
      } else {
        const newLike = insertedRows?.[0] || tempLike;
        // Replace temporary like with real one
        setPosts(arr => arr.map(post => post.id === postId
          ? { ...post, likes: ([...(post as any).likes || []].filter((l: any) => l.user_id !== user.id)).concat(newLike) }
          : post
        ));
      }
    } catch (err) {
      console.error('Error in handleLike function:', err);
    }
  };

  const handleUnlike = async (postId: string) => {
    if (!isAuthenticated) {
      showAuthModal();
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const originalPosts = [...posts];

      // Optimistically update UI
      setPosts(arr => arr.map(post => post.id === postId
        ? { ...post, likes: ([...(post as any).likes || []].filter((l: any) => l.user_id !== user.id)) }
        : post
      ));

      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error unliking post:', error);
        // Rollback on failure
        setPosts(originalPosts);
      }
    } catch (err) {
      console.error('Error in handleUnlike function:', err);
    }
  };

  const toggleVideoPlayback = (postId: string) => {
    setPlayingVideo(playingVideo === postId ? null : postId);
  };

  const navigateToProfile = (userId: string, username: string) => {
    if (userId === currentUserId) {
      router.push('/(tabs)/profile');
    } else {
      router.push(`/${username}`);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      // Remove from local state
      setPosts(posts.filter(p => p.id !== postId));
    } catch (error) {
      console.error('Error deleting post:', error);
      Alert.alert('Error', 'Failed to delete post');
    }
  };

  const loadFollowers = async () => {
    if (!profile) return;
    
    setLoadingFollowers(true);
    try {
      const { data: followersData, error: followersError } = await supabase
        .from('followers')
        .select(`
          id,
          follower_id,
          profiles!followers_follower_id_fkey (
            id,
            username,
            avatar_url,
            is_verified
          )
        `)
        .eq('following_id', profile.id)
        .order('created_at', { ascending: false });

      if (followersError) {
        console.error('Error loading followers:', followersError);
        return;
      }

      // Transform the data to match our interface
      const transformedFollowers = (followersData || []).map((follower: any) => ({
        id: follower.id,
        follower_id: follower.follower_id,
        profiles: Array.isArray(follower.profiles) ? follower.profiles[0] : follower.profiles
      }));

      setFollowers(transformedFollowers);
    } catch (error) {
      console.error('Error loading followers:', error);
    } finally {
      setLoadingFollowers(false);
    }
  };

  const handleShowFollowers = () => {
    setShowFollowersModal(true);
    loadFollowers();
  };

  const loadFollowing = async () => {
    if (!profile) return;
    
    setLoadingFollowing(true);
    try {
      const { data: followingData, error: followingError } = await supabase
        .from('followers')
        .select(`
          id,
          following_id,
          profiles!followers_following_id_fkey (
            id,
            username,
            avatar_url,
            is_verified
          )
        `)
        .eq('follower_id', profile.id)
        .order('created_at', { ascending: false });

      if (followingError) {
        console.error('Error loading following:', followingError);
        return;
      }

      // Transform the data to match our interface
      const transformedFollowing = (followingData || []).map((following: any) => ({
        id: following.id,
        following_id: following.following_id,
        profiles: Array.isArray(following.profiles) ? following.profiles[0] : following.profiles
      }));

      setFollowing(transformedFollowing);
    } catch (error) {
      console.error('Error loading following:', error);
    } finally {
      setLoadingFollowing(false);
    }
  };

  const handleShowFollowing = () => {
    setShowFollowingModal(true);
    loadFollowing();
  };

  // Load profile when username changes
  useEffect(() => {
    if (username) {
      loadProfile();
    }
  }, [username]);

  // Reload profile when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (username) {
        loadProfile();
      }
    }, [username])
  );

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
          filter: `requester_id=eq.${currentUserId}`,
        },
        (payload: any) => {
          // Only update if the change affects the current user's request to this profile
          if (payload.new?.requested_id === profile.id || payload.old?.requested_id === profile.id) {
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

  // --------------------------------------------------
  // 🔴 Real-time likes sync for this profile's posts
  // --------------------------------------------------
  useEffect(() => {
    const channel = supabase
      .channel(`user-profile-likes-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'likes' },
        (payload) => {
          setPosts((prev) =>
            prev.map((post: any) => {
              const affectedPostId = (payload.new as any)?.post_id ?? (payload.old as any)?.post_id;
              if (post.id !== affectedPostId) return post;

              if (payload.eventType === 'INSERT') {
                // Ignore duplicate like already present
                if ((post.likes || []).some((l: any) => l.id === payload.new.id)) return post;
                return {
                  ...post,
                  likes: [
                    ...(post.likes || []),
                    { id: payload.new.id as string, user_id: payload.new.user_id as string },
                  ],
                };
              }

              if (payload.eventType === 'DELETE') {
                return {
                  ...post,
                  likes: (post.likes || []).filter((l: any) => l.id !== payload.old.id),
                };
              }

              return post;
            })
          );
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

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

  const postGridItems = posts.filter((p: any) => (p as any).type === 'post');

  // Profile header component for FlatList
  const renderProfileHeader = () => (
    <>
      <TouchableOpacity 
        onPress={profile.has_story ? () => setShowingStories(true) : undefined}
        style={[
          styles.profileImageContainer,
          profile.has_story && styles.hasStoryRing,
          { backgroundColor: colors.background }
        ]}>
          <Image
            source={{ 
              uri: getAvatarUrl(profile.avatar_url, profile.username)
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
            <ThemedButton
              title={profile.is_following ? 'Following' : profile.follow_request_sent ? 'Requested' : 'Follow'}
              onPress={handleFollow}
              variant={(profile.is_following || profile.follow_request_sent) ? 'secondary' : 'primary'}
              size="medium"
              disabled={followLoading}
              loading={followLoading}
              icon={
                profile.is_following ? (
                  <UserCheck size={18} color={colors.tint} />
                ) : profile.follow_request_sent ? (
                  <UserPlus size={18} color={colors.tint} />
                ) : (
                  <UserPlus size={18} color="#fff" />
                )
              }
              style={{ 
                flex: 1, 
                borderColor: colors.tint, 
                borderWidth: (profile.is_following || profile.follow_request_sent) ? 1.5 : 0, 
                minWidth: 120,
                maxWidth: 120
              }}
              textStyle={(profile.is_following || profile.follow_request_sent) ? { color: colors.tint } : undefined}
            />

            <ThemedButton
              title="Message"
              onPress={startChat}
              variant="secondary"
              size="medium"
              disabled={chatLoading}
              loading={chatLoading}
              icon={<MessageSquare size={18} color={colors.tint} />}
              style={{ flex: 1, borderColor: colors.tint, borderWidth: 1.5 }}
              textStyle={{ color: colors.tint }}
            />
            
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
          borderTopColor: colors.border, 
          borderBottomColor: colors.border,
          backgroundColor: colors.background
        }
      ]}>
        <View style={[styles.statItem, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[styles.statNumber, { color: colors.tint }]}>
            {profile.is_private && !profile.is_following && currentUserId !== profile.id ? '-' : formatNumber(posts.length)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Posts</Text>
        </View>
        <TouchableOpacity 
          style={[styles.statItem, { backgroundColor: colors.backgroundSecondary }]}
          onPress={handleShowFollowers}
        >
          <Text style={[styles.statNumber, { color: colors.tint }]}>{formatNumber(profile._count.followers)}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Followers</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.statItem, { backgroundColor: colors.backgroundSecondary }]}
          onPress={handleShowFollowing}
        >
          <Text style={[styles.statNumber, { color: colors.tint }]}>
            {profile.is_private && !profile.is_following && currentUserId !== profile.id ? '-' : formatNumber(profile._count.following)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Following</Text>
        </TouchableOpacity>
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
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => {
          if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          goBack();
        }}>
          <Text style={[styles.logo, { color: colors.tint }]}>← Back</Text>
        </TouchableOpacity>
      </View>

      {/* Content based on active tab */}
      {profile.is_private && !profile.is_following && currentUserId !== profile.id ? (
        <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 20 }}>
          {renderProfileHeader()}
          <View style={styles.privateAccountContainer}>
            <Text style={[styles.privateAccountTitle, { color: colors.text }]}>This Account is Private</Text>
            <Text style={[styles.privateAccountText, { color: colors.textSecondary }]}>
              Follow this account to see their {activeTab === 'posts' ? 'posts' : activeTab === 'lifts' ? 'lift records' : 'workouts'}.
            </Text>
          </View>
        </ScrollView>
      ) : activeTab === 'posts' ? (
        <FlatList
          data={postGridItems}
          numColumns={3}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderProfileHeader}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.postItem}
              activeOpacity={0.9}
              onPress={() => {
                if ((item as any).type === 'workout') {
                  setSelectedWorkoutId(item.id);
                  setShowWorkoutModal(true);
                } else {
                  router.push(`/(tabs)/post/${item.id}`);
                }
              }}
            >
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.postImage} />
              ) : (
                <View style={[styles.noImageContainer, { backgroundColor: colors.backgroundSecondary }]}> 
                  <Text style={[styles.noImageText, { color: colors.textSecondary }]}> 
                    No image 
                  </Text> 
                </View>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={() => (
            <View style={styles.postsGrid}>
              <Text style={[styles.progressText, { color: colors.textSecondary }]}>No posts to show yet.</Text>
            </View>
          )}
        />
        ) : activeTab === 'lifts' ? (
          <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 20 }}>
            {renderProfileHeader()}
            {lifts.length === 0 ? (
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
            )}
          </ScrollView>
        ) : (
          <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 20 }}>
            {renderProfileHeader()}
            {workouts.length === 0 ? (
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
            )}
          </ScrollView>
        )}

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

      {/* Followers modal */}
      <Modal
        visible={showFollowersModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFollowersModal(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalBackground || 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Followers</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowFollowersModal(false)}>
                <Text style={[styles.closeButtonText, { color: colors.text }]}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.followersContainer}>
              {loadingFollowers ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.tint} />
                </View>
              ) : followers.length === 0 ? (
                <View style={styles.emptyFollowersContainer}>
                  <Text style={[styles.emptyFollowersText, { color: colors.textSecondary }]}>
                    No followers yet
                  </Text>
                </View>
              ) : (
                followers.map((follower) => (
                  <TouchableOpacity
                    key={follower.id}
                    style={[styles.followerItem, { backgroundColor: colors.background }]}
                    onPress={() => {
                      setShowFollowersModal(false);
                      router.push(`/${follower.profiles?.username}`);
                    }}>
                    <Image 
                      source={{ 
                        uri: getAvatarUrl(follower.profiles?.avatar_url ?? null, follower.profiles?.username ?? '')
                      }} 
                      style={styles.followerAvatar} 
                    />
                    <View style={styles.followerInfo}>
                      <View style={styles.followerUsernameContainer}>
                        <Text style={[styles.followerUsername, { color: colors.text }]}>
                          {follower.profiles?.username || 'Unknown User'}
                        </Text>
                        {follower.profiles?.is_verified && (
                          <CheckCircle2 size={16} color="#fff" fill="#3B82F6" />
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Following modal */}
      <Modal
        visible={showFollowingModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFollowingModal(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalBackground || 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Following</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowFollowingModal(false)}>
                <Text style={[styles.closeButtonText, { color: colors.text }]}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.followersContainer}>
              {loadingFollowing ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.tint} />
                </View>
              ) : following.length === 0 ? (
                <View style={styles.emptyFollowersContainer}>
                  <Text style={[styles.emptyFollowersText, { color: colors.textSecondary }]}>
                    Not following anyone yet
                  </Text>
                </View>
              ) : (
                following.map((followingUser) => (
                  <TouchableOpacity
                    key={followingUser.id}
                    style={[styles.followerItem, { backgroundColor: colors.background }]}
                    onPress={() => {
                      setShowFollowingModal(false);
                      router.push(`/${followingUser.profiles?.username}`);
                    }}>
                    <Image 
                      source={{ 
                        uri: getAvatarUrl(followingUser.profiles?.avatar_url ?? null, followingUser.profiles?.username ?? '')
                      }} 
                      style={styles.followerAvatar} 
                    />
                    <View style={styles.followerInfo}>
                      <View style={styles.followerUsernameContainer}>
                        <Text style={[styles.followerUsername, { color: colors.text }]}>
                          {followingUser.profiles?.username || 'Unknown User'}
                        </Text>
                        {followingUser.profiles?.is_verified && (
                          <CheckCircle2 size={16} color="#fff" fill="#3B82F6" />
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
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
    paddingHorizontal: Layout.horizontalPadding,
    paddingTop: 60,
    paddingBottom: 12,
  },
  logo: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  profileImageContainer: {
    alignSelf: 'center',
    marginTop: 12,
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
    paddingHorizontal: Layout.horizontalPadding,
    marginTop: 10,
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
    marginTop: 15,
    paddingHorizontal: Layout.horizontalPadding,
    gap: Layout.gap,
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
    paddingHorizontal: Layout.horizontalPadding - 1,
    paddingVertical: 10,
    marginTop: 10,
    marginBottom: 5,
    borderTopWidth: 1,
    borderBottomWidth: 1,
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
    paddingVertical: 5,
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
    paddingHorizontal: Layout.horizontalPadding - 1,
    marginTop: 6,
    marginBottom: 6,
  },
  toggleButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: '50%',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 24,
  },
  followersContainer: {
    maxHeight: 400,
    padding: 15,
  },
  emptyFollowersContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyFollowersText: {
    fontSize: 16,
    textAlign: 'center',
  },
  followerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 5,
    borderRadius: 8,
    marginBottom: 8,
  },
  followerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  followerInfo: {
    flex: 1,
  },
  followerUsernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  followerUsername: {
    fontSize: 16,
    fontWeight: '600',
  },
  privateAccountContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privateAccountTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  privateAccountText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Additional styles to match my profile
  editButtonContainer: {
    borderRadius: 25,
    minWidth: 140,
    maxWidth: 160,
    minHeight: 36,
    shadowColor: '#00D4FF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
    flex: 0,
  },
  editButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 25,
    minWidth: 140,
    maxWidth: 160,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    flex: 1,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
    textAlign: 'center',
    lineHeight: 20,
  },
  workoutPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  workoutPlaceholderText: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  workoutBadgeOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(108, 92, 231, 0.9)',
    borderRadius: 10,
    padding: 3,
  },
  draftsFolder: {
    width: '100%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  draftsText: {
    marginTop: 8,
    fontWeight: '600',
    fontSize: 12,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  postItem: {
    width: '33.333%',
    aspectRatio: 1,
    padding: 1,
  },
});