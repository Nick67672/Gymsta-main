import { useState, useEffect, useCallback, useRef } from 'react';
import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, RefreshControl, Modal, ActivityIndicator, Dimensions, Alert, Animated } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import { LogIn, MessageSquare, Bell } from 'lucide-react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import StoryViewer from '@/components/StoryViewer';

import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useBlocking } from '@/context/BlockingContext';
import Colors from '@/constants/Colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/Spacing';
import { Typography } from '@/constants/Typography';
import FeedPost from '../../components/Post';
import StoriesRail from '../../components/StoriesRail';
import WorkoutPost from '../../components/WorkoutPost';
import { Story, Profile, Post, Workout } from '../../types/social';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface TikTokStyleFeedSelectorProps {
  activeTab: 'explore' | 'following' | 'my-gym';
  activeTabIndex: number;
  setActiveTab: (tab: 'explore' | 'following' | 'my-gym') => void;
  setActiveTabIndex: (index: number) => void;
  translateX: Animated.Value;
  colors: any;
  panRef: any;
  /** Optional tint color override (e.g. white for Arete theme) */
  overrideTintColor?: string;
}

const TikTokStyleFeedSelector: React.FC<TikTokStyleFeedSelectorProps> = ({
  activeTab,
  activeTabIndex,
  setActiveTab,
  setActiveTabIndex,
  translateX,
  colors,
  panRef,
  overrideTintColor
}) => {
  const tabs = [
    { key: 'explore', label: 'Explore' },
    { key: 'following', label: 'Following' },
    { key: 'my-gym', label: 'My Gym' }
  ];

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX, velocityX } = event.nativeEvent;
      const threshold = screenWidth * 0.25;
      
      let newIndex = activeTabIndex;
      
      if (translationX > threshold || velocityX > 500) {
        // Swipe right - go to previous tab
        newIndex = Math.max(0, activeTabIndex - 1);
      } else if (translationX < -threshold || velocityX < -500) {
        // Swipe left - go to next tab
        newIndex = Math.min(tabs.length - 1, activeTabIndex + 1);
      }
      
      // Animate back to position
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
      
      if (newIndex !== activeTabIndex) {
        setActiveTabIndex(newIndex);
        setActiveTab(tabs[newIndex].key as 'explore' | 'following' | 'my-gym');
      }
    }
  };

  const selectTab = (index: number) => {
    setActiveTabIndex(index);
    setActiveTab(tabs[index].key as 'explore' | 'following' | 'my-gym');
  };

  const getRotatedTabs = () => {
    // Always put the active tab in the center (index 1)
    const rotatedTabs = [];
    const totalTabs = tabs.length;
    
    for (let i = 0; i < totalTabs; i++) {
      const tabIndex = (activeTabIndex - 1 + i + totalTabs) % totalTabs;
      rotatedTabs.push({
        ...tabs[tabIndex],
        originalIndex: tabIndex,
        displayIndex: i
      });
    }
    
    return rotatedTabs;
  };

  const getTabStyle = (displayIndex: number, originalIndex: number) => {
    const isActive = originalIndex === activeTabIndex;
    const distance = Math.abs(displayIndex - 1); // Distance from center (index 1)
    
    return {
      opacity: isActive ? 1 : 0.6 - (distance * 0.2),
      transform: [
        {
          scale: isActive ? 1.1 : 1 - (distance * 0.1)
        }
      ]
    };
  };

  const rotatedTabs = getRotatedTabs();

  const tintColor = overrideTintColor ?? colors.tint;

  return (
    <PanGestureHandler
      ref={panRef}
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
    >
      <Animated.View style={[tikTokStyles.container, { backgroundColor: colors.background }]}>
        <View style={tikTokStyles.tabsContainer}>
          {rotatedTabs.map((tab, displayIndex) => (
            <TouchableOpacity
              key={`${tab.key}-${tab.originalIndex}`}
              style={[tikTokStyles.tab, getTabStyle(displayIndex, tab.originalIndex)]}
              onPress={() => selectTab(tab.originalIndex)}
              activeOpacity={0.7}
            >
              <Animated.Text
                style={[
                  tikTokStyles.tabText,
                  {
                    color: tab.originalIndex === activeTabIndex ? tintColor : colors.textSecondary,
                    fontWeight: tab.originalIndex === activeTabIndex ? '700' : '600'
                  }
                ]}
              >
                {tab.label}
              </Animated.Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={[tikTokStyles.indicator, { backgroundColor: tintColor }]} />
      </Animated.View>
    </PanGestureHandler>
  );
};

export default function HomeScreen() {
  const { theme, setTheme } = useTheme();
  const colors = Colors[theme];
  const { isAuthenticated, showAuthModal, user } = useAuth();
  const { blockedUserIds, blockingLoading } = useBlocking();
  
  // State for badge counts
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  
  // Collapsible header state
  const headerHeight = 160; // Increased height for more spacing between header and content
  const [scrollY] = useState(new Animated.Value(0));
  const [headerTranslateY] = useState(new Animated.Value(0));
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollDirection = useRef<'up' | 'down'>('down');
  
  const [activeTab, setActiveTab] = useState<'explore' | 'following' | 'my-gym'>('explore');
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const panRef = useRef(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followingPosts, setFollowingPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [followingWorkouts, setFollowingWorkouts] = useState<Workout[]>([]);
  const [following, setFollowing] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedStories, setSelectedStories] = useState<Story[]>([]);
  const [showingStories, setShowingStories] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [currentUserGym, setCurrentUserGym] = useState<string | null>(null);
  const [gymWorkouts, setGymWorkouts] = useState<Workout[]>([]);

  // Debug log for active tab changes
  useEffect(() => {
    console.log('🔍 [DEBUG] Active tab changed', {
      activeTab,
      currentUserGym,
      hasGym: !!currentUserGym,
      timestamp: new Date().toISOString()
    });
  }, [activeTab, currentUserGym]);

  const videoRefs = useRef<{ [key: string]: any }>({});
  const [flaggedPosts, setFlaggedPosts] = useState<{ [postId: string]: boolean }>({});
  const [flagging, setFlagging] = useState<{ [postId: string]: boolean }>({});
  const channelsRef = useRef<{
    posts?: any;
    likes?: any;
    stories?: any;
    notifications?: any;
  }>({});
  
  const loadFeed = useCallback(async () => {
    // If the user is not authenticated, skip personalised feed loading.
    if (!isAuthenticated || !user) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: feedPosts, error: feedError } = await supabase.rpc('get_feed_posts');

      if (feedError) throw feedError;

      const { data: followingData, error: followingError } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', user.id);

      if (followingError) throw followingError;

      const followingIds = followingData.map(f => f.following_id);

      const userAndFollowingPosts = (feedPosts as Post[]).filter(
        (p: Post) => p.user_id === user.id || followingIds.includes(p.user_id)
      );

      setPosts(feedPosts as Post[]);
      setFollowingPosts(userAndFollowingPosts);
      
    } catch (err: any) {
      console.error('Error loading feed:', err);
      setError('Could not load your feed. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, user]);

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

      const profiles = (followingData as any[])
        .map((f: any) => f.following as Profile)
        .filter(Boolean);

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: storiesData } = await supabase
        .from('stories')
        .select('user_id')
        .in('user_id', profiles.map(p => p.id))
        .gte('created_at', twentyFourHoursAgo);

      const profilesWithStoryStatus = profiles.map(profile => ({
        ...profile,
        has_story: storiesData?.some((s: any) => s.user_id === profile.id) || false
      }));

      setFollowing(profilesWithStoryStatus as Profile[]);
    } catch (err) {
      console.error('Error loading following:', err);
    }
  };

  const loadStories = async (userId: string) => {
    if (!isAuthenticated) {
      showAuthModal();
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

  const loadPosts = useCallback(async () => {
    try {
      // Get current user's gym
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('gym')
          .eq('id', user.id)
          .single();
        
        setCurrentUserGym(profile?.gym || null);
      } else {
        setCurrentUserId(null);
      }

      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (
            id,
            username,
            avatar_url,
            is_verified,
            gym
          ),
          likes (
            id,
            user_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get comment counts for all posts
      const postIds = data?.map(post => post.id) || [];
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
      
      const postsWithMediaType = (data || []).map(post => ({
        ...post,
        media_type: post.media_type || 'image',
        comments_count: commentCounts[post.id] || 0
      }));
      
      // Filter out posts from blocked users
      const filteredPosts = postsWithMediaType.filter(post => 
        !blockedUserIds.includes((post.profiles as any).id)
      );
      
      setPosts(filteredPosts as Post[]);
    } catch (err) {
      // Capture Supabase PostgrestError details if available for easier debugging
      if (typeof err === 'object' && err !== null) {
        const { message, details, code } = err as any;
        const errorMsg = message || details || code || 'Failed to load posts';
        setError(errorMsg);
      } else {
        setError('Failed to load posts');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [blockedUserIds]);

  const loadGymWorkouts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentUserGym) {
        console.log('🔍 [DEBUG] loadGymWorkouts: User or gym not available', {
          user: user?.id,
          currentUserGym,
          hasUser: !!user,
          hasGym: !!currentUserGym
        });
        return;
      }

      console.log('🔍 [DEBUG] loadGymWorkouts: Starting query', {
        userId: user.id,
        currentUserGym,
        timestamp: new Date().toISOString()
      });

      const { data: workouts, error } = await supabase
        .from('workouts')
        .select(`
          id,
          user_id,
          exercises,
          created_at,
          profiles!inner (
            username,
            avatar_url,
            gym
          ),
          workout_sharing_information!inner (
            title,
            caption,
            photo_url,
            is_my_gym
          )
        `)
        .eq('profiles.gym', currentUserGym)
        .eq('workout_sharing_information.is_my_gym', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('❌ [DEBUG] loadGymWorkouts: Query error', error);
        throw error;
      }

      console.log('✅ [DEBUG] loadGymWorkouts: Query successful', {
        workoutsCount: workouts?.length || 0,
        workouts: workouts?.map(w => ({
          id: w.id,
          userId: w.user_id,
          username: w.profiles?.[0]?.username,
          userGym: w.profiles?.[0]?.gym,
          hasSharingInfo: !!w.workout_sharing_information,
          isMyGym: w.workout_sharing_information?.[0]?.is_my_gym,
          title: w.workout_sharing_information?.[0]?.title,
          created: w.created_at
        })) || [],
        currentUserGym,
        timestamp: new Date().toISOString()
      });

      setGymWorkouts((workouts || []) as Workout[]);
    } catch (err) {
      console.error('❌ [DEBUG] loadGymWorkouts: Caught error', {
        error: err,
        currentUserGym,
        timestamp: new Date().toISOString()
      });
    }
  };

  const loadFollowingContent = async () => {
    if (!isAuthenticated) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get list of users the current user follows
      const { data: followingData, error: followingError } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', user.id);

      if (followingError) throw followingError;

      const followingIds = followingData?.map(f => f.following_id) || [];
      
      if (followingIds.length === 0) {
        setFollowingPosts([]);
        setFollowingWorkouts([]);
        return;
      }

      // Load posts from followed users
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          id,
          user_id,
          caption,
          image_url,
          media_type,
          created_at,
          product_id,
          profiles (
            id,
            username,
            avatar_url,
            is_verified,
            gym
          ),
          likes (
            id,
            user_id
          )
        `)
        .in('user_id', followingIds)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      const postsWithMediaType = (postsData || []).map(post => ({
        ...post,
        media_type: post.media_type || 'image'
      }));

      // Load workouts from followed users
      const { data: workoutsData, error: workoutsError } = await supabase
        .from('workouts')
        .select(`
          id,
          user_id,
          exercises,
          created_at,
          profiles (
            username,
            avatar_url,
            gym
          ),
          workout_sharing_information (
            title,
            caption,
            photo_url,
            is_my_gym
          )
        `)
        .in('user_id', followingIds)
        .order('created_at', { ascending: false });

      if (workoutsError) throw workoutsError;

      setFollowingPosts(postsWithMediaType as Post[]);
      setFollowingWorkouts(workoutsData || []);
    } catch (err) {
      console.error('Error loading following content:', err);
    }
  };

  const loadUnreadCounts = async () => {
    if (!isAuthenticated || !user) {
      setUnreadNotifications(0);
      setUnreadMessages(0);
      return;
    }

    try {
      // Load unread notifications count
      const { count: notificationCount, error: notificationError } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (notificationError) {
        console.error('Error loading notification count:', notificationError);
      } else {
        setUnreadNotifications(notificationCount || 0);
      }

      // Load unread messages count (you'll need to implement this based on your messages table structure)
      // For now, setting a placeholder - you can implement based on your chat/messages schema
      setUnreadMessages(0);
      
    } catch (error) {
      console.error('Error loading unread counts:', error);
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

      // optimistic: add like to UI immediately
      const tempLike = { id: String(Date.now()), user_id: user.id };
      const originalPosts = [...posts];
      const addLikeLocal = (arr: Post[]) => arr.map(post => post.id===postId && !post.likes.some(l=>l.user_id===user.id)?{...post,likes:[...post.likes,tempLike]}:post);
      setPosts(addLikeLocal);
      setFollowingPosts(addLikeLocal);

      const { data: insertedRows, error } = await supabase
        .from('likes')
        .insert({ post_id: postId, user_id: user.id })
        .select('id, user_id');

      if (error) {
        console.error('Error liking post:', error);
        // rollback
        setPosts(originalPosts);
        setFollowingPosts(originalPosts);
      } else {
        const newLike = insertedRows?.[0] || tempLike;
        const replaceTemp = (posts: Post[]) => posts.map(post => {
          if (post.id === postId) {
            const filtered = post.likes.filter(l => l.user_id !== user.id); // remove any previous
            return { ...post, likes: [...filtered, newLike] };
          }
          return post;
        });
        setPosts(replaceTemp);
        setFollowingPosts(replaceTemp);
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
      let likeId: string | null = null;
      const removeLocal = (arr: Post[]) => arr.map(post => {
        if (post.id === postId) {
          const targetLike = post.likes.find(l => l.user_id === user.id);
          if (targetLike) likeId = targetLike.id;
          return { ...post, likes: post.likes.filter(l => l.user_id !== user.id) };
        }
        return post;
      });
      setPosts(removeLocal);
      setFollowingPosts(removeLocal);

      let query = supabase.from('likes').delete();
      if (likeId) {
        query = query.eq('id', likeId);
      } else {
        query = query.eq('post_id', postId).eq('user_id', user.id);
      }

      const { error } = await query;

      if (error) {
        console.error('Error unliking post:', error);
        // rollback
        setPosts(originalPosts);
        setFollowingPosts(originalPosts);
      }
    } catch (err) {
      console.error('Error in handleUnlike function:', err);
    }
  };

  const toggleVideoPlayback = (postId: string) => {
    if (playingVideo === postId) {
      if (videoRefs.current[postId]) {
        videoRefs.current[postId].pauseAsync();
      }
      setPlayingVideo(null);
    } else {
      if (playingVideo && videoRefs.current[playingVideo]) {
        videoRefs.current[playingVideo].pauseAsync();
      }
      
      if (videoRefs.current[postId]) {
        videoRefs.current[postId].playAsync();
      }
      setPlayingVideo(postId);
    }
  };

  const navigateToProfile = (userId: string, username: string) => {
    if (userId === currentUserId) {
      router.push('/profile');
    } else {
      router.push(`/${username}`);
    }
  };



  const handleDeletePost = async (postId: string) => {
    // Keep a copy of the original posts lists in case we need to revert
    const originalPosts = [...posts];
    const originalFollowingPosts = [...followingPosts];

    // Optimistically remove the post from the UI for a snappy response
    setPosts(prev => prev.filter(p => p.id !== postId));
    setFollowingPosts(prev => prev.filter(p => p.id !== postId));

    // Attempt to delete from the database
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (error) {
      // If the delete fails, show an error and revert the UI changes
      Alert.alert('Error', 'Failed to delete post. Please try again.');
      setPosts(originalPosts);
      setFollowingPosts(originalFollowingPosts);
    }
  };

  const handleFlagPost = async (postId: string) => {
    if (!isAuthenticated) {
      showAuthModal();
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // The real-time listener will handle the UI update.
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error flagging post:', error);
      }
    } catch (err) {
      console.error('Error in handleFlagPost function:', err);
    }
  };

  // Handle comment count updates
  const handleCommentCountChange = useCallback((postId: string, count: number) => {
    const updatePostCommentCount = (posts: Post[]) => 
      posts.map(post => 
        post.id === postId ? { ...post, comments_count: count } : post
      );
    
    setPosts(updatePostCommentCount);
    setFollowingPosts(updatePostCommentCount);
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Always load explore posts first (works for guests too)
      loadPosts();

      if (blockingLoading) return;

      loadFeed();
      loadFollowing();
      loadGymWorkouts();
      loadUnreadCounts();

      // Setup Supabase real-time subscriptions
      // ... (rest of the subscription logic remains the same)

    }, [isAuthenticated, blockingLoading, loadFeed, loadPosts])
  );

  // Separate useEffect for channel subscriptions to avoid multiple subscriptions
  // We only create real-time subscriptions once the user is authenticated. This
  // prevents the scenario where a channel is subscribed before login and then
  // Supabase attempts a second subscribe when the session token changes,
  // triggering the "subscribe can only be called a single time per channel
  // instance" error.
  useEffect(() => {
    if (blockingLoading) return;
    if (!isAuthenticated) return;

    console.log('🚀 Setting up real-time subscriptions...');

    // Clean up existing channels
    if (channelsRef.current.posts) {
      channelsRef.current.posts.unsubscribe();
    }
    if (channelsRef.current.likes) {
      channelsRef.current.likes.unsubscribe();
    }
    if (channelsRef.current.stories) {
      channelsRef.current.stories.unsubscribe();
    }
    if (channelsRef.current.notifications) {
      channelsRef.current.notifications.unsubscribe();
    }

    // Test real-time connection
    const testChannel = supabase.channel('test-connection-' + Date.now())
      .subscribe((status) => {
        console.log('🔗 Test channel status:', status);
      });

    const handlePostInsert = (payload: any) => {
      const newPost = {
        ...payload.new,
        user_id: payload.new.user_id, // Ensure user_id is mapped
        profiles: {
          id: payload.new.profiles?.id,
          username: payload.new.profiles?.username,
          avatar_url: payload.new.profiles?.avatar_url,
          is_verified: payload.new.profiles?.is_verified,
          gym: payload.new.profiles?.gym,
        },
        likes: [],
      };

      // Add the new post only if it's not from a blocked user
      if (!blockedUserIds.includes(newPost.user_id)) {
        setPosts(currentPosts => [newPost, ...currentPosts]);
        
        // Also add to following feed if the author is followed
        const isFollowing = following.some(f => f.id === newPost.user_id);
        if (isFollowing || newPost.user_id === user?.id) {
          setFollowingPosts(currentPosts => [newPost, ...currentPosts]);
        }
      }
    };

    const postsChannel = supabase.channel('posts-channel-' + Date.now())
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts'
        },
        handlePostInsert
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'posts'
        },
        (payload) => {
          console.log('🗑️ Post deletion detected:', payload.old.id);
          // Remove the deleted post from all feeds
          setPosts(currentPosts => currentPosts.filter(p => p.id !== payload.old.id));
          setFollowingPosts(currentPosts => currentPosts.filter(p => p.id !== payload.old.id));
        }
      )
      .subscribe();

    const likesChannel = supabase.channel('likes-channel-' + Date.now())
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes'
        },
        (payload) => {
          console.log('🔥 Main feed - Likes change detected:', payload);
          
          if (payload.eventType === 'INSERT') {
            const { post_id } = payload.new;
            const newLike = { id: payload.new.id, user_id: payload.new.user_id };

            const addLikeToPost = (posts: Post[]) => posts.map(post => {
              if (post.id === post_id && !post.likes.some(l => l.id === newLike.id)) {
                return { ...post, likes: [...post.likes, newLike] };
              }
              return post;
            });
            
            setPosts(addLikeToPost);
            setFollowingPosts(addLikeToPost);

          } else if (payload.eventType === 'DELETE') {
            const deletedLikeId = payload.old.id;
            if (!deletedLikeId) return;

            const removeLikeFromPost = (posts: Post[]) => posts.map(post => {
              if (post.likes.some(l => l.id === deletedLikeId)) {
                return { ...post, likes: post.likes.filter(l => l.id !== deletedLikeId) };
              }
              return post;
            });

            setPosts(removeLikeFromPost);
            setFollowingPosts(removeLikeFromPost);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Main feed likes subscription status:', status);
      });

    const storiesChannel = supabase.channel('stories-channel-' + Date.now())
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

    // Notifications channel for real-time badge updates
    const notificationsChannel = supabase.channel('notifications-channel-' + Date.now())
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          console.log('🔔 Notification change detected:', payload);
          // Reload unread counts when notifications change
          loadUnreadCounts();
        }
      )
      .subscribe();

    // Store channels in ref
    channelsRef.current = {
      posts: postsChannel,
      likes: likesChannel,
      stories: storiesChannel,
      notifications: notificationsChannel
    };

    return () => {
      testChannel.unsubscribe();
      postsChannel.unsubscribe();
      likesChannel.unsubscribe();
      storiesChannel.unsubscribe();
      notificationsChannel.unsubscribe();
    };
  }, [blockingLoading, isAuthenticated, blockedUserIds, following, user]);

  // Load gym workouts when currentUserGym changes
  useEffect(() => {
    if (currentUserGym) {
      loadGymWorkouts();
    }
  }, [currentUserGym]);

  // Ensure dark mode for Arete gym
  useEffect(() => {
    if (currentUserGym?.toLowerCase().includes('arete') && theme !== 'dark') {
      setTheme('dark');
    }
  }, [currentUserGym, theme]);

  // Fetch current user's gym on mount and whenever the Supabase user changes
  useEffect(() => {
    const fetchUserGym = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setCurrentUserGym(null);
          return;
        }
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('gym')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        setCurrentUserGym(profile?.gym || null);
      } catch (err) {
        console.error('Error fetching user gym:', err);
        setCurrentUserGym(null);
      }
    };

    fetchUserGym();
  }, [user]);

  // Header animation logic - Complete collapse
  const handleScroll = useCallback((event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const diff = currentScrollY - lastScrollY.current;
    
    // Determine scroll direction
    if (diff > 0) {
      scrollDirection.current = 'down';
    } else if (diff < 0) {
      scrollDirection.current = 'up';
    }
    
    // Hide entire header when scrolling down, show when scrolling up
    if (Math.abs(diff) > 5) { // Threshold to prevent jittery animations
      if (scrollDirection.current === 'down' && currentScrollY > 20 && isHeaderVisible) {
        // Hide entire header completely
        setIsHeaderVisible(false);
        Animated.timing(headerTranslateY, {
          toValue: -headerHeight - 50, // Extra offset to completely hide including status bar
          duration: 250,
          useNativeDriver: true,
        }).start();
      } else if (scrollDirection.current === 'up' && !isHeaderVisible) {
        // Show header
        setIsHeaderVisible(true);
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start();
      }
    }
    
    lastScrollY.current = currentScrollY;
    
    // Stop video playback when scrolling
    if (playingVideo) {
      setPlayingVideo(null);
    }
  }, [headerTranslateY, isHeaderVisible, playingVideo]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPosts();
    loadFeed();
    loadFollowing();
    loadGymWorkouts();
    loadUnreadCounts();
    setRefreshing(false);
  };

  // Filter posts based on active tab
  const filteredPosts = activeTab === 'my-gym' && currentUserGym
    ? posts.filter(post => (post.profiles as any).gym === currentUserGym)
    : activeTab === 'following'
    ? followingPosts
    : posts;

  // Get combined and sorted gym content (posts + workouts)
  const getGymContent = () => {
    if (!currentUserGym) {
      console.log('🔍 [DEBUG] getGymContent: No currentUserGym available');
      return [];
    }
    
    const gymPosts = posts.filter(post => (post.profiles as any).gym === currentUserGym);
    const gymWorkoutItems = gymWorkouts.map(workout => ({
      ...workout,
      type: 'workout' as const
    }));
    const gymPostItems = gymPosts.map(post => ({
      ...post,
      type: 'post' as const
    }));
    
    // Combine and sort by created_at
    const combinedContent = [...gymPostItems, ...gymWorkoutItems].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    console.log('🔍 [DEBUG] getGymContent: Combined content', {
      currentUserGym,
      gymPostsCount: gymPosts.length,
      gymWorkoutsCount: gymWorkouts.length,
      combinedContentCount: combinedContent.length,
      posts: gymPosts.map(p => ({ id: p.id, caption: p.caption?.substring(0, 50) })),
      workouts: gymWorkouts.map(w => ({ id: w.id, title: w.workout_sharing_information?.[0]?.title })),
      timestamp: new Date().toISOString()
    });
    
    return combinedContent;
  };

  // ---------------------------
  // Virtualised list helpers
  // ---------------------------

  // Individual post renderer for FlashList
  const renderPost = useCallback(
    ({ item }: { item: Post }) => (
      <FeedPost
        post={item}
        colors={colors}
        playingVideo={playingVideo}
        currentUserId={currentUserId}
        flaggedPosts={flaggedPosts}
        flagging={flagging}
        setFlagging={setFlagging}
        setFlaggedPosts={setFlaggedPosts}
        isAuthenticated={isAuthenticated}
        showAuthModal={showAuthModal}
        toggleVideoPlayback={toggleVideoPlayback}
        navigateToProfile={navigateToProfile}
        handleLike={handleLike}
        handleUnlike={handleUnlike}
        handleDeletePost={handleDeletePost}
        videoRefs={videoRefs}
        onCommentCountChange={handleCommentCountChange}
      />
    ),
    [colors, playingVideo, currentUserId, flaggedPosts, flagging, handleDeletePost, handleCommentCountChange]
  );

  const renderExploreItem = ({ item }: { item: Post }) => (
    <FeedPost
      post={item}
      colors={colors}
      playingVideo={playingVideo}
      currentUserId={currentUserId}
      flaggedPosts={flaggedPosts}
      flagging={flagging}
      setFlagging={setFlagging}
      setFlaggedPosts={setFlaggedPosts}
      isAuthenticated={isAuthenticated}
      showAuthModal={showAuthModal}
      toggleVideoPlayback={toggleVideoPlayback}
      navigateToProfile={navigateToProfile}
      handleLike={handleLike}
      handleUnlike={handleUnlike}
      videoRefs={videoRefs}
      handleDeletePost={handleDeletePost}
      onCommentCountChange={handleCommentCountChange}
    />
  );

  const renderFollowingItem = ({ item }: { item: Post | Workout }) => {
    if ('caption' in item) { // It's a Post
      return (
        <FeedPost
          post={item}
          colors={colors}
          playingVideo={playingVideo}
          currentUserId={currentUserId}
          flaggedPosts={flaggedPosts}
          flagging={flagging}
          setFlagging={setFlagging}
          setFlaggedPosts={setFlaggedPosts}
          isAuthenticated={isAuthenticated}
          showAuthModal={showAuthModal}
          toggleVideoPlayback={toggleVideoPlayback}
          navigateToProfile={navigateToProfile}
          handleLike={handleLike}
          handleUnlike={handleUnlike}
          videoRefs={videoRefs}
          handleDeletePost={handleDeletePost}
        />
      );
    } else {
      // It's a Workout
      return (
        <WorkoutPost
          workout={item}
          colors={colors}
          currentUserId={currentUserId}
          isAuthenticated={isAuthenticated}
          showAuthModal={showAuthModal}
          navigateToProfile={navigateToProfile}
          handleLike={handleLike}
          handleUnlike={handleUnlike}
          handleDeletePost={handleDeletePost}
          onCommentCountChange={handleCommentCountChange}
        />
      );
    }
  };

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Completely Collapsible Header */}
      <Animated.View
        style={[
          styles.animatedHeader,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
      >
        {/* Header Content */}
        <View style={styles.headerContent}>
          {/* Logo/Brand */}
          <View style={styles.logoContainer}>
            <Text style={[styles.logoText, { color: colors.text }]}>ReRack</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.headerActions}>
            {isAuthenticated ? (
              <>
                <TouchableOpacity
                  style={[styles.headerButton, { backgroundColor: colors.backgroundSecondary }]}
                  onPress={() => router.push('/notifications')}
                >
                  <Bell size={24} color={colors.text} />
                  {unreadNotifications > 0 && (
                    <View style={[styles.badge, { backgroundColor: colors.error }]}>
                      <Text style={styles.badgeText}>{unreadNotifications > 99 ? '99+' : unreadNotifications}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.headerButton, { backgroundColor: colors.backgroundSecondary }]}
                  onPress={() => router.push('/chat')}
                >
                  <MessageSquare size={24} color={colors.text} />
                  {unreadMessages > 0 && (
                    <View style={[styles.badge, { backgroundColor: colors.error }]}>
                      <Text style={styles.badgeText}>{unreadMessages > 99 ? '99+' : unreadMessages}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.loginButton, { backgroundColor: colors.tint }]}
                onPress={showAuthModal}
              >
                <LogIn size={20} color="#fff" />
                <Text style={styles.loginText}>Sign In</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Tab Selector */}
        <TikTokStyleFeedSelector
          activeTab={activeTab}
          activeTabIndex={activeTabIndex}
          setActiveTab={setActiveTab}
          setActiveTabIndex={setActiveTabIndex}
          translateX={translateX}
          colors={colors}
          panRef={panRef}
        />
      </Animated.View>

      {/* Main Content - No padding, header overlays */}
      <View style={styles.contentContainer}>
        {/* Stories Rail */}
        {activeTab !== 'my-gym' && stories.length > 0 && (
          <View style={{ paddingTop: headerHeight + 15 }}>
            <StoriesRail
              following={following}
              theme={theme}
              loadStories={loadStories}
              isAuthenticated={isAuthenticated}
              showAuthModal={showAuthModal}
            />
          </View>
        )}

        {/* Feed Content */}
        {loading ? (
          <View style={[styles.loadingContainer, { paddingTop: headerHeight + 30 }]}>
            <ActivityIndicator size="large" color={colors.tint} />
          </View>
        ) : error ? (
          <View style={[styles.errorContainer, { paddingTop: headerHeight + 30 }]}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.tint }]} onPress={loadFeed}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {activeTab === 'my-gym' ? (
              <ScrollView
                style={styles.gymWorkoutsContainer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                contentContainerStyle={{ 
                  paddingTop: headerHeight + 30, // Increased padding for better spacing
                  paddingBottom: 20 
                }}
              >
                {(() => {
                  console.log('🔍 [DEBUG] My Gym Tab: Rendering content', {
                    activeTab,
                    currentUserGym,
                    hasGym: !!currentUserGym,
                    timestamp: new Date().toISOString()
                  });
                  
                  const gymContent = getGymContent();
                  
                  console.log('🔍 [DEBUG] My Gym Tab: Gym content details', {
                    gymContentLength: gymContent.length,
                    contentTypes: gymContent.map(item => item.type),
                    timestamp: new Date().toISOString()
                  });
                  
                  return gymContent.length > 0 ? (
                    <>
                      {gymContent.map((item) => (
                        item.type === 'post' ? (
                          <FeedPost
                            key={`post-${item.id}`}
                            post={item}
                            colors={colors}
                            playingVideo={playingVideo}
                            currentUserId={currentUserId}
                            flaggedPosts={flaggedPosts}
                            flagging={flagging}
                            setFlagging={setFlagging}
                            setFlaggedPosts={setFlaggedPosts}
                            isAuthenticated={isAuthenticated}
                            showAuthModal={showAuthModal}
                            toggleVideoPlayback={toggleVideoPlayback}
                            navigateToProfile={navigateToProfile}
                            handleLike={handleLike}
                            handleUnlike={handleUnlike}
                            handleDeletePost={handleDeletePost}
                            videoRefs={videoRefs}
                            onCommentCountChange={handleCommentCountChange}
                          />
                        ) : (
                          <WorkoutPost
                            key={`workout-${item.id}`}
                            workout={item}
                            colors={colors}
                            currentUserId={currentUserId}
                            isAuthenticated={isAuthenticated}
                            showAuthModal={showAuthModal}
                            navigateToProfile={navigateToProfile}
                            handleLike={handleLike}
                            handleUnlike={handleUnlike}
                            handleDeletePost={handleDeletePost}
                            onCommentCountChange={handleCommentCountChange}
                          />
                        )
                      ))}
                    </>
                  ) : (
                    <View style={styles.emptyGymContainer}>
                      <Text style={[styles.emptyGymText, { color: colors.textSecondary }]}>
                        No posts or workouts from your gym yet
                      </Text>
                    </View>
                  );
                })()}
              </ScrollView>
            ) : (
              <FlashList
                data={filteredPosts}
                renderItem={renderPost}
                estimatedItemSize={400}
                keyExtractor={(item) => item.id}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                contentContainerStyle={{ 
                  paddingTop: headerHeight + 30, // Increased padding for better spacing from header
                  paddingBottom: 100 
                }}
                showsVerticalScrollIndicator={false}
              />
            )}
          </>
        )}
      </View>

      {/* Modals and other components remain the same */}
      <Modal
        visible={showingStories}
        animationType="fade"
        onRequestClose={() => setShowingStories(false)}
      >
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
  animatedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    borderBottomWidth: 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 50, // Account for status bar
    paddingBottom: Spacing.sm,
  },
  logoContainer: {
    flex: 1,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    gap: Spacing.xs,
  },
  loginText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  contentContainer: {
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
    paddingHorizontal: Spacing.lg,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  retryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 20,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  gymWorkoutsContainer: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
  logo: {
    ...Typography.logo,
    marginBottom: Spacing.xs,
  },
  headerButtons: {
    position: 'absolute',
    right: Spacing.lg,
    top: 50,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
    gap: Spacing.md,
  },
  signInButton: {
    borderRadius: BorderRadius.lg,
  },
  signInGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  signInText: {
    marginLeft: Spacing.xs,
    ...Typography.buttonSmall,
    color: '#fff',
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  messageBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },

  error: {
    textAlign: 'center',
    marginTop: 20,
  },
  storiesContainer: {
    paddingVertical: 10,
  },
  storiesContent: {
    paddingHorizontal: 15,
    gap: 15,
  },
  storyItem: {
    alignItems: 'center',
    width: 80,
  },
  storyRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    padding: 2,
    backgroundColor: '#E5E5E5',
    marginBottom: 4,
  },
  activeStoryRing: {
    backgroundColor: '#3B82F6',
  },
  storyAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#fff',
  },
  storyUsername: {
    fontSize: 12,
    textAlign: 'center',
  },
  feed: {
    flex: 1,
  },
  post: {
    marginBottom: 20,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 25,
  },
  profilePic: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  username: {
    fontWeight: '600',
  },
  imageContainer: {
    paddingHorizontal: 25,
    alignItems: 'center',
  },
  postImage: {
    width: '100%',
    height: 400,
    borderRadius: 16,
  },
  videoWrapper: {
    width: Dimensions.get('window').width,
    aspectRatio: 16/9,
    maxHeight: 400,
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 15,
    position: 'relative',
  },
  videoBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContent: {
    width: '100%',
    height: '100%',
  },
  videoPlayButton: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 30,
    padding: 10,
  },
  postContent: {
    paddingHorizontal: 25,
    paddingVertical: 10,
  },
  postContentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '100%',
  },
  captionContainer: {
    marginBottom: 10,
  },
  caption: {
    marginTop: 4,
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
  },
  likeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 12,
    alignSelf: 'flex-start',
  },
  flagButton: {
    padding: 8,
    marginRight: 4,
    borderRadius: 8,
  },
  likes: {
    fontSize: 14,
    fontWeight: '500',
  },
  seeProductButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginLeft: 25,
    marginTop: 0,
    backgroundColor: '#3B82F6',
  },
  seeProductText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  toggleButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    position: 'relative',
  },
  toggleText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
  },


  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadMoreButton: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  loadMoreText: {
    ...Typography.bodyMedium,
    color: 'white',
  },
  emptyGymContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  emptyGymText: {
    fontSize: 18,
    textAlign: 'center',
  },
});

const tikTokStyles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  tab: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.xs,
  },
  tabText: {
    ...Typography.bodyLarge,
    textAlign: 'center',
  },
  indicator: {
    height: 2,
    width: 30,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    borderRadius: 1,
  },
});