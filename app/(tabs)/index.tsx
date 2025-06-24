import { useState, useEffect, useCallback, useRef } from 'react';
import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, RefreshControl, Modal, ActivityIndicator, Dimensions, Alert, Animated } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import { LogIn, MessageSquare, Bell } from 'lucide-react-native';
import { FlashList } from '@shopify/flash-list';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import StoryViewer from '@/components/StoryViewer';
import WorkoutDetailModal from '@/components/WorkoutDetailModal';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useBlocking } from '@/context/BlockingContext';
import Colors from '@/constants/Colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/Spacing';
import { Typography } from '@/constants/Typography';
import FeedPost from '../../components/Post';
import StoriesRail from '../../components/StoriesRail';
import WorkoutCard from '../../components/WorkoutCard';
import { Story, Profile, Post, Workout } from '../../types/social';

const { width: screenWidth } = Dimensions.get('window');

interface TikTokStyleFeedSelectorProps {
  activeTab: 'explore' | 'following' | 'my-gym';
  activeTabIndex: number;
  setActiveTab: (tab: 'explore' | 'following' | 'my-gym') => void;
  setActiveTabIndex: (index: number) => void;
  translateX: Animated.Value;
  colors: any;
  panRef: any;
}

const TikTokStyleFeedSelector: React.FC<TikTokStyleFeedSelectorProps> = ({
  activeTab,
  activeTabIndex,
  setActiveTab,
  setActiveTabIndex,
  translateX,
  colors,
  panRef
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
                    color: tab.originalIndex === activeTabIndex ? colors.tint : colors.textSecondary,
                    fontWeight: tab.originalIndex === activeTabIndex ? '700' : '600'
                  }
                ]}
              >
                {tab.label}
              </Animated.Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={[tikTokStyles.indicator, { backgroundColor: colors.tint }]} />
      </Animated.View>
    </PanGestureHandler>
  );
};

export default function HomeScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { isAuthenticated, showAuthModal } = useAuth();
  const { blockedUserIds, blockingLoading } = useBlocking();
  
  const [activeTab, setActiveTab] = useState<'explore' | 'following' | 'my-gym'>('explore');
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const panRef = useRef(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followingPosts, setFollowingPosts] = useState<Post[]>([]);
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
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const videoRefs = useRef<{ [key: string]: any }>({});
  const [flaggedPosts, setFlaggedPosts] = useState<{ [postId: string]: boolean }>({});
  const [flagging, setFlagging] = useState<{ [postId: string]: boolean }>({});
  const channelsRef = useRef<{
    posts?: any;
    likes?: any;
    stories?: any;
  }>({});
  
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
          id,
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
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const postsWithMediaType = (data || []).map(post => ({
        ...post,
        media_type: post.media_type || 'image'
      }));
      
      // Filter out posts from blocked users
      const filteredPosts = postsWithMediaType.filter(post => 
        !blockedUserIds.includes((post.profiles as any).id)
      );
      
      setPosts(filteredPosts as Post[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [blockedUserIds]);

  const loadGymWorkouts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentUserGym) return;

      const { data: workouts, error } = await supabase
        .from('workouts')
        .select(`
          id,
          user_id,
          exercises,
          created_at,
          progress_image_url,
          profiles!inner (
            username,
            avatar_url,
            gym
          )
        `)
        .eq('is_private', false)
        .eq('profiles.gym', currentUserGym)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setGymWorkouts((workouts || []) as Workout[]);
    } catch (err) {
      console.error('Error loading gym workouts:', err);
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
          progress_image_url,
          profiles (
            username,
            avatar_url,
            gym
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

  const handleLike = async (postId: string) => {
    if (!isAuthenticated) {
      showAuthModal();
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Optimistically update the UI immediately
      const updateLikes = (currentPosts: Post[]) => 
        currentPosts.map(post => {
          if (post.id === postId) {
            const newLike = { id: `temp-${Date.now()}`, user_id: user.id };
            return {
              ...post,
              likes: [...post.likes, newLike]
            };
          }
          return post;
        });
      
      setPosts(updateLikes);
      setFollowingPosts(updateLikes);

      const { error } = await supabase
        .from('likes')
        .insert({
          post_id: postId,
          user_id: user.id,
        });

      if (error) {
        // Revert optimistic update on error
        const revertLikes = (currentPosts: Post[]) => 
          currentPosts.map(post => {
            if (post.id === postId) {
              return {
                ...post,
                likes: post.likes.filter(like => !like.id.toString().startsWith('temp-'))
              };
            }
            return post;
          });
        
        setPosts(revertLikes);
        setFollowingPosts(revertLikes);
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
        const updateFinalLikes = (currentPosts: Post[]) => 
          currentPosts.map(post => {
            if (post.id === postId) {
              return {
                ...post,
                likes: updatedPost.likes
              };
            }
            return post;
          });
        
        setPosts(updateFinalLikes);
        setFollowingPosts(updateFinalLikes);
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
      const currentPost = posts.find(p => p.id === postId) || followingPosts.find(p => p.id === postId);
      const likeToRemove = currentPost?.likes.find(like => like.user_id === user.id);
      
      // Optimistically update the UI immediately
      const removeOptimisticLike = (currentPosts: Post[]) => 
        currentPosts.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              likes: post.likes.filter(like => like.user_id !== user.id)
            };
          }
          return post;
        });
      
      setPosts(removeOptimisticLike);
      setFollowingPosts(removeOptimisticLike);
      
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);

      if (error) {
        // Revert optimistic update on error
        if (likeToRemove) {
          const revertUnlike = (currentPosts: Post[]) => 
            currentPosts.map(post => {
              if (post.id === postId) {
                return {
                  ...post,
                  likes: [...post.likes, likeToRemove]
                };
              }
              return post;
            });
          
          setPosts(revertUnlike);
          setFollowingPosts(revertUnlike);
        }
        throw error;
      }

    } catch (err) {
      console.error('Error unliking post:', err);
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

  const handleWorkoutPress = (workoutId: string) => {
    if (!isAuthenticated) {
      showAuthModal();
      return;
    }
    
    setSelectedWorkoutId(workoutId);
    setShowWorkoutModal(true);
  };

  useEffect(() => {
    // Don't load posts until blocking context is ready
    if (blockingLoading) return;
    
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
      }
    });

    loadPosts();
    loadFollowing();
    loadGymWorkouts();
    loadFollowingContent();
  }, [blockingLoading, blockedUserIds]);

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

    // Test real-time connection
    const testChannel = supabase.channel('test-connection-' + Date.now())
      .subscribe((status) => {
        console.log('🔗 Test channel status:', status);
      });

    const postsChannel = supabase.channel('posts-channel-' + Date.now())
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts'
        },
        async (payload) => {
          const { data: newPost, error } = await supabase
            .from('posts')
            .select(`
              id,
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
            .eq('id', payload.new.id)
            .single();

          if (!error && newPost) {
            const postWithMediaType = {
              ...newPost,
              media_type: newPost.media_type || 'image'
            };
            setPosts(currentPosts => [postWithMediaType, ...currentPosts]);
          }
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
          // Efficiently update posts state instead of reloading all posts
          if (payload.eventType === 'INSERT') {
            const { post_id } = payload.new;
            console.log('➕ Adding like to post:', post_id);
            setPosts(currentPosts => 
              currentPosts.map(post => {
                if (post.id === post_id) {
                  console.log('✅ Updated post likes for:', post_id);
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
            console.log('➖ Removing like from post:', post_id);
            console.log('🗑️ Deleted like payload:', payload.old);
            setPosts(currentPosts => 
              currentPosts.map(post => {
                if (post.id === post_id) {
                  console.log('🔍 Current likes before filter:', post.likes);
                  const updatedLikes = post.likes.filter(like => like.id !== payload.old.id);
                  console.log('🔍 Updated likes after filter:', updatedLikes);
                  console.log('✅ Updated post likes for:', post_id);
                  return {
                    ...post,
                    likes: updatedLikes
                  };
                }
                return post;
              })
            );
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

    // Store channels in ref
    channelsRef.current = {
      posts: postsChannel,
      likes: likesChannel,
      stories: storiesChannel
    };

    return () => {
      testChannel.unsubscribe();
      postsChannel.unsubscribe();
      likesChannel.unsubscribe();
      storiesChannel.unsubscribe();
    };
  }, [blockingLoading, isAuthenticated]); // Re-run when auth status changes

  // Load gym workouts when currentUserGym changes
  useEffect(() => {
    if (currentUserGym) {
      loadGymWorkouts();
    }
  }, [currentUserGym]);

  const handleScroll = () => {
    if (playingVideo) {
      setPlayingVideo(null);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPosts();
    loadFollowing();
    loadGymWorkouts();
    loadFollowingContent();
  };

  // Filter posts based on active tab
  const filteredPosts = activeTab === 'my-gym' && currentUserGym
    ? posts.filter(post => (post.profiles as any).gym === currentUserGym)
    : activeTab === 'following'
    ? followingPosts
    : posts;

  // Get combined and sorted gym content (posts + workouts)
  const getGymContent = () => {
    if (!currentUserGym) return [];
    
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
        videoRefs={videoRefs}
      />
    ),
    [colors, playingVideo, currentUserId, flaggedPosts, flagging]
  );

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.push('/')} activeOpacity={0.7}>
          <Text style={[styles.logo, { color: colors.tint }]}>Gymsta</Text>
        </TouchableOpacity>
        <View style={styles.headerButtons}>
          {!isAuthenticated && (
            <TouchableOpacity 
              style={[styles.signInButton, { backgroundColor: colors.tint }]}
              onPress={() => router.push('/auth')}
              activeOpacity={0.8}>
              <LogIn size={20} color="#fff" />
              <Text style={styles.signInText}>Sign In</Text>
            </TouchableOpacity>
          )}
          {isAuthenticated && (
            <>
              <TouchableOpacity 
                style={styles.notificationButton}
                onPress={() => router.push('/notifications')}
                activeOpacity={0.7}>
                <Bell size={22} color={colors.tint} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.messageButton}
                onPress={() => router.push('/chat')}
                activeOpacity={0.7}>
                <MessageSquare size={22} color={colors.tint} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <TikTokStyleFeedSelector
        activeTab={activeTab}
        activeTabIndex={activeTabIndex}
        setActiveTab={setActiveTab}
        setActiveTabIndex={setActiveTabIndex}
        translateX={translateX}
        colors={colors}
        panRef={panRef}
      />

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onScrollBeginDrag={handleScroll}
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {activeTab === 'explore' ? (
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.tint} />
            </View>
          ) : (
            <FlashList
              data={filteredPosts}
              renderItem={renderPost}
              keyExtractor={(item) => item.id}
              estimatedItemSize={600}
              refreshing={refreshing}
              onRefresh={onRefresh}
              onScrollBeginDrag={handleScroll}
              contentContainerStyle={{ paddingBottom: 20 }}
              ListHeaderComponent={() => (
                <StoriesRail
                  following={following}
                  theme={theme}
                  loadStories={loadStories}
                  isAuthenticated={isAuthenticated}
                  showAuthModal={showAuthModal}
                />
              )}
            />
          )
        ) : activeTab === 'following' ? (
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.tint} />
            </View>
          ) : !isAuthenticated ? (
            <View style={styles.emptyGymContainer}>
              <Text style={[styles.emptyGymText, { color: colors.textSecondary }]}>
                Sign in to see posts from people you follow
              </Text>
            </View>
          ) : followingPosts.length > 0 || followingWorkouts.length > 0 ? (
            <View style={styles.gymWorkoutsContainer}>
              {followingPosts.map((post) => (
                <FeedPost
                  key={post.id}
                  post={post}
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
                />
              ))}
              
              {followingWorkouts.map((workout) => (
                <WorkoutCard
                  key={workout.id}
                  workout={workout}
                  theme={theme}
                  onPress={handleWorkoutPress}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyGymContainer}>
              <Text style={[styles.emptyGymText, { color: colors.textSecondary }]}>
                No posts from people you follow yet. Start following some users!
              </Text>
            </View>
          )
        ) : (
          <View style={styles.gymWorkoutsContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.tint} />
              </View>
            ) : currentUserGym ? (
              (() => {
                const gymContent = getGymContent();
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
                          videoRefs={videoRefs}
                        />
                      ) : (
                        <WorkoutCard
                          key={`workout-${item.id}`}
                          workout={item}
                          theme={theme}
                          onPress={handleWorkoutPress}
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
              })()
            ) : (
              <View style={styles.emptyGymContainer}>
                <Text style={[styles.emptyGymText, { color: colors.textSecondary }]}>
                  Set your gym in profile settings to see posts and workouts from your gym
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showingStories}
        animationType="fade"
        onRequestClose={() => setShowingStories(false)}>
        <StoryViewer
          stories={selectedStories}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
  logo: {
    ...Typography.h2,
    marginBottom: Spacing.xs,
  },
  headerButtons: {
    position: 'absolute',
    right: Spacing.lg,
    top: 50,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
    gap: Spacing.sm,
  },
  signInButton: {
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
  notificationButton: {
    padding: Spacing.sm,
  },
  messageButton: {
    padding: Spacing.sm,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyGymContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  emptyGymText: {
    textAlign: 'center',
    fontSize: 16,
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
  gymWorkoutsContainer: {
    padding: 15,
    gap: 15,
  },
  workoutCard: {
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  workoutAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  workoutUsername: {
    fontSize: 16,
    fontWeight: '600',
  },
  workoutImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  workoutInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workoutExercises: {
    fontSize: 14,
  },
  workoutTime: {
    fontSize: 14,
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