import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, Platform, PanResponder, RefreshControl, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { CircleCheck as CheckCircle2, Heart, Settings, ArrowLeft, Plus, Grid3x3, Activity, Dumbbell, Bell, Folder } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import StoryViewer from '@/components/StoryViewer';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import { Typography } from '@/constants/Typography';
import WorkoutDetailModal from '@/components/WorkoutDetailModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Spacing } from '@/constants/Spacing';
import EnhancedWorkoutPost from '@/components/EnhancedWorkoutPost';
import FeedPost from '@/components/Post';

interface ProfileStory {
  id: string;
  media_url: string;
  user_id: string;
  created_at?: string;
  following: Following[];
  [x: string]: any;
}

interface Profile {
  id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  gym: string | null;
  is_early_adopter: boolean;
  is_verified: boolean;
  _count: {
    followers: number;
    following: number;
    products?: number;
  };
  has_story: boolean;
}

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  description: string | null;
}

interface Post {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  media_type: string;
  product_id: string | null;
  profiles: any;
  likes: {
    id: string;
    user_id: string;
  }[];
  comments_count?: number;
  type?: string; // Added to distinguish between posts and workouts
}

interface WorkoutSummary {
  id: string;
  progress_image_url?: string | null;
  created_at: string;
  exercises: {
    name: string;
  }[] | null;
}

interface WorkoutPost {
  id: string;
  user_id: string;
  exercises: any[];
  created_at: string;
  profiles: any;
  workout_sharing_information?: {
    title?: string | null;
    caption?: string | null;
    photo_url?: string | null;
    is_my_gym?: boolean;
  }[] | null;
  likes?: {
    id: string;
    user_id: string;
  }[];
  comments_count?: number;
  type: string;
}

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

const DRAFTS_KEY_PREFIX = 'post_drafts_';

export default function ProfileScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { isAuthenticated, showAuthModal } = useAuth();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [stories, setStories] = useState<ProfileStory[]>([]);
  const [posts, setPosts] = useState<(Post | WorkoutPost)[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [showProgressImage, setShowProgressImage] = useState(false);
  const [selectedProgressImageUrl, setSelectedProgressImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingStory, setUploadingStory] = useState(false);
  const [showingStories, setShowingStories] = useState(false);
  const [hasProducts, setHasProducts] = useState(false);
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'workouts' | 'lifts'>('posts');
  const [showProgressDetails, setShowProgressDetails] = useState(false);
  const [workoutDetails, setWorkoutDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [lifts, setLifts] = useState<any[]>([]);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [following, setFollowing] = useState<Following[]>([]);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [drafts, setDrafts] = useState<Post[]>([]);

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

  const handleDeletePost = async (postId: string) => {
    // Optimistically update the UI
    setPosts(prevPosts => prevPosts.filter(p => p.id !== postId));

    // Perform the deletion in the database
    const { error } = await supabase.from('posts').delete().eq('id', postId);

    if (error) {
      Alert.alert('Error', 'Failed to delete post. Please try again.');
      // If the deletion fails, we should probably reload the posts to be safe
      loadProfile(); 
    }
  };

  const loadProfile = async () => {
    // Check if user is authenticated first
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      // Get profile with follower counts and check for stories
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
          followers!followers_following_id_fkey(count),
          following:followers!followers_follower_id_fkey(count)
        `)
        .eq('id', user.id)
        .single();

      if (profileError || !profileData) {
        router.replace('/register');
        return;
      }

      // Load user's posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          id,
          user_id,
          image_url,
          caption,
          created_at,
          media_type,
          product_id,
          profiles (
            id,
            username,
            avatar_url,
            is_verified,
            gym
          ),
          likes(id, user_id)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Load user's workouts to include in posts feed
      const { data: workoutPostsData, error: workoutPostsError } = await supabase
        .from('workouts')
        .select(`
          id,
          user_id,
          created_at,
          exercises,
          name,
          likes(id, user_id),
          profiles (
            id,
            username,
            avatar_url,
            is_verified,
            gym
          ),
          workout_sharing_information (
            title, caption, photo_url, is_my_gym
          )
        `)
        .eq('user_id', user.id)
        .eq('is_completed', true)
        .order('created_at', { ascending: false });

      // Combine posts and workouts, then sort by creation date
      let combinedPosts: any[] = [];
      
      if (!postsError && postsData) {
        // Get comment counts for user's posts
        const postIds = postsData.map(post => post.id);
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

        const postsWithCommentCount = postsData.map(post => ({
          ...post,
          comments_count: commentCounts[post.id] || 0,
          type: 'post' // Add type identifier
        }));
        
        combinedPosts = [...combinedPosts, ...postsWithCommentCount];
      }

      if (!workoutPostsError && workoutPostsData) {
        // Get comment counts for workouts (they use post_id in comments table)
        const workoutIds = workoutPostsData.map(workout => workout.id);
        let workoutCommentCounts: { [workoutId: string]: number } = {};
        
        if (workoutIds.length > 0) {
          const { data: workoutCommentsData } = await supabase
            .from('comments')
            .select('post_id, id')
            .in('post_id', workoutIds);
          
          // Count comments per workout
          workoutCommentCounts = (workoutCommentsData || []).reduce((acc, comment) => {
            acc[comment.post_id] = (acc[comment.post_id] || 0) + 1;
            return acc;
          }, {} as { [workoutId: string]: number });
        }

        const workoutsWithCommentCount = workoutPostsData.map(workout => ({
          ...workout,
          comments_count: workoutCommentCounts[workout.id] || 0,
          type: 'workout', // Add type identifier
          // Transform workout to look like a post for display
          image_url: workout.workout_sharing_information?.[0]?.photo_url,
          caption: workout.workout_sharing_information?.[0]?.caption || `Completed ${workout.exercises?.length || 0} exercises`
        }));
        
        combinedPosts = [...combinedPosts, ...workoutsWithCommentCount];
      }

      // Sort combined posts by creation date (newest first)
      combinedPosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setPosts(combinedPosts);

      // Check if user has any products
      const { data: userProducts, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', user.id);

      if (!productsError) {
        setProducts(userProducts || []);
        setHasProducts((userProducts ?? []).length > 0);
      }

      // Load user's stories
      const { data: storiesData } = await supabase
        .from('stories')
        .select('id, media_url')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      setStories((storiesData as ProfileStory[]) || []);

      // Load user's workout progress
      const { data: workoutsData, error: workoutsError } = await supabase
        .from('workouts')
        .select('id, created_at, exercises')
        .eq('user_id', user.id)
        .eq('is_completed', true)
        .order('created_at', { ascending: false });

      if (workoutsError) {
        console.error('Error loading workouts for progress tab:', workoutsError);
      } else {
        // Transform to attach exercises array for legacy UI
        const transformed = (workoutsData || []).map((w: any) => ({
          ...w,
          exercises: w.exercises || [],
        }));

        console.log('Loaded workouts for progress tab:', transformed.length);
        setWorkouts(transformed);
      }

      // Transform the data to include counts and story status
      setProfile({
        ...profileData,
        _count: {
          followers: profileData.followers?.[0]?.count || 0,
          following: profileData.following?.[0]?.count || 0,
        },
        has_story: !!(storiesData && storiesData.length > 0)
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  // Separate loader for workouts to ensure we refresh when switching tabs
  const loadWorkouts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: workoutsData, error: workoutsError } = await supabase
        .from('workouts')
        .select('id, created_at, exercises')
        .eq('user_id', user.id)
        .eq('is_completed', true)
        .order('created_at', { ascending: false });

      if (workoutsError) {
        console.error('Error loading workouts for progress tab:', workoutsError);
        return;
      }

      // Transform to attach exercises array for legacy UI
      const transformed = (workoutsData || []).map((w: any) => ({
        ...w,
        exercises: w.exercises || [],
      }));

      console.log('Loaded workouts for progress tab:', transformed.length);
      setWorkouts(transformed);
    } catch (err) {
      console.error('Unexpected error loading workouts:', err);
    }
  };

  const handleAddStory = async () => {
    if (uploadingStory) return;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your media library to add stories.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
        aspect: [1, 1],
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingStory(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        try {
          // Get file extension and MIME type
          const uri = result.assets[0].uri;
          const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
          const mimeType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
          
          // Generate unique filename
          const fileName = `${user.id}/${Date.now()}.${fileExt}`;
          
          if (Platform.OS === 'web') {
            // Web upload
            const response = await fetch(uri);
            if (!response.ok) throw new Error('Failed to fetch image data');
            
            const blob = await response.blob();
            
            // Upload to Supabase Storage with correct content type
            const { error: uploadError } = await supabase.storage
              .from('stories')
              .upload(fileName, blob, {
                contentType: mimeType,
                cacheControl: '3600',
                upsert: false
              });

            if (uploadError) throw uploadError;
          } else {
            // Native upload
            const formData = new FormData();
            formData.append('file', {
              uri,
              name: fileName,
              type: mimeType,
            } as any);

            const { error: uploadError } = await supabase.storage
              .from('stories')
              .upload(fileName, formData, {
                contentType: 'multipart/form-data',
                cacheControl: '3600',
                upsert: false
              });

            if (uploadError) throw uploadError;
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('stories')
            .getPublicUrl(fileName);

          // Create story record
          const { error: storyError } = await supabase
            .from('stories')
            .insert({
              user_id: user.id,
              media_url: publicUrl,
              media_type: 'image'
            });

          if (storyError) throw storyError;

          // Reload profile to update story status
          await loadProfile();
          Alert.alert('Success', 'Your story has been uploaded!');
        } catch (err) {
          console.error('Story upload error:', err);
          throw new Error('Failed to upload story: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
      }
    } catch (err) {
      console.error('Story upload error:', err);
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to upload story. Please try again.');
    } finally {
      setUploadingStory(false);
    }
  };

  const handleViewStories = () => {
    if (stories.length > 0) {
      setShowingStories(true);
    } else {
      handleAddStory();
    }
  };

  const navigateToSettings = () => {
    router.push('/profile/settings');
  };

  // Load profile on initial mount
  useEffect(() => {
    loadProfile();
    loadWorkouts();
    loadLifts();
    loadDrafts();
  }, []);

  // Reload profile when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadProfile();
      loadDrafts();
    }, [])
  );

  // Reload workouts whenever the user switches to the Progress tab
  useEffect(() => {
    if (activeTab === 'workouts') {
      loadWorkouts();
    } else if (activeTab === 'lifts') {
      loadLifts();
    }
  }, [activeTab]);

  // Set up real-time subscription for follower changes
  useEffect(() => {
    if (!profile?.id) return;

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
        () => {
          // Reload profile data when followers change
          loadProfile();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [profile?.id]);

  // Load workout details when user swipes to details view
  useEffect(() => {
    const loadDetails = async () => {
      if (!showProgressImage || !selectedWorkoutId) return;
      if (workoutDetails && workoutDetails.id === selectedWorkoutId) return;

      try {
        setDetailsLoading(true);
        setDetailsError(null);
        const { data, error } = await supabase
          .from('workouts')
          .select(`
            id,
            date,
            exercises,
            caption,
            profiles (
              username,
              avatar_url
            )
          `)
          .eq('id', selectedWorkoutId)
          .single();

        if (error) throw error;
        setWorkoutDetails(data as any);
      } catch (err) {
        console.error('Error loading workout details:', err);
        setDetailsError('Failed to load workout');
      } finally {
        setDetailsLoading(false);
      }
    };

    loadDetails();
  }, [showProgressImage, selectedWorkoutId]);

  // PanResponder to detect horizontal swipe on progress photo viewer
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderRelease: (_, gestureState) => {
        // Swipe left to show details, swipe right back to image
        if (gestureState.dx < -50) {
          setShowProgressDetails(true);
        } else if (gestureState.dx > 50) {
          setShowProgressDetails(false);
        }
      },
    })
  ).current;

  // Add function to load lifts data
  const loadLifts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // This would load lift tracking data - for now using placeholder
      // You can modify this to load from your lifts table when implemented
      const { data: liftsData, error: liftsError } = await supabase
        .from('lift_records') // Assuming you have or will create this table
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!liftsError) {
        setLifts(liftsData || []);
      }
    } catch (err) {
      console.error('Error loading lifts:', err);
      setLifts([]); // Set empty array if table doesn't exist yet
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

  // Set up real-time subscription for likes changes
  useEffect(() => {
    const likesChannel = supabase.channel('profile-likes-channel-' + Date.now())
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes'
        },
        async (payload) => {
          console.log('🔥 Profile - Likes change detected:', payload);
          // When likes change, update the specific post in our posts array
          if (payload.eventType === 'INSERT') {
            const { post_id } = payload.new;
            console.log('➕ Profile - Adding like to post:', post_id);
            setPosts(currentPosts => 
              currentPosts.map(post => {
                if (post.id === post_id) {
                  console.log('✅ Profile - Updated post likes for:', post_id);
                  return {
                    ...post,
                    likes: [...(post.likes || []), { id: payload.new.id, user_id: payload.new.user_id }]
                  };
                }
                return post;
              })
            );
          } else if (payload.eventType === 'DELETE') {
            const { post_id } = payload.old;
            console.log('➖ Profile - Removing like from post:', post_id);
            setPosts(currentPosts => 
              currentPosts.map(post => {
                if (post.id === post_id) {
                  console.log('✅ Profile - Updated post likes for:', post_id);
                  return {
                    ...post,
                    likes: (post.likes || []).filter(like => like.id !== payload.old.id)
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
  }, []);

  // Real-time subscription for post and workout inserts and deletes so the UI stays up-to-date
  useEffect(() => {
    if (!profile?.id) return;

    const postsChannel = supabase.channel('profile-posts-channel-' + Date.now())
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setPosts(currentPosts => currentPosts.filter(p => p.id !== payload.old.id));
          } else if (payload.eventType === 'INSERT') {
            // Prepend the new post so it shows up first
            const newPost = { ...payload.new, type: 'post' };
            setPosts(currentPosts => [newPost as any, ...currentPosts]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workouts',
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setPosts(currentPosts => currentPosts.filter(p => p.id !== payload.old.id));
          } else if (payload.eventType === 'INSERT' && payload.new.is_completed) {
            // Only add completed workouts to the posts feed
            const newWorkout = {
              ...payload.new,
              type: 'workout',
              image_url: null, // Will be populated if sharing info exists
              caption: `Completed ${payload.new.exercises?.length || 0} exercises`
            };
            setPosts(currentPosts => [newWorkout as any, ...currentPosts]);
          }
        }
      )
      .subscribe();

    return () => {
      postsChannel.unsubscribe();
    };
  }, [profile?.id]);

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
      setPosts(arr => arr.map(post => post.id === postId && !(post.likes || []).some(l => l.user_id === user.id)
        ? { ...post, likes: [...(post.likes || []), tempLike] }
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
          ? { ...post, likes: (post.likes || []).filter(l => l.user_id !== user.id).concat(newLike) }
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
        ? { ...post, likes: (post.likes || []).filter(l => l.user_id !== user.id) }
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

  const loadDrafts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const DRAFTS_KEY = `${DRAFTS_KEY_PREFIX}${user.id}`;
    const draftsString = await AsyncStorage.getItem(DRAFTS_KEY);
    const drafts = draftsString ? JSON.parse(draftsString) : [];
    setDrafts(drafts);
  };

  const handleViewPost = (postId: string) => {
    router.push(`/post/${postId}`);
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  // Show sign-in interface for non-authenticated users
  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <TouchableOpacity onPress={() => router.push('/')}>
            <Text style={[styles.logo, { color: colors.tint }]}>Gymsta</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.signInContainer}>
                      <TouchableOpacity 
              style={styles.signInButton}
              onPress={() => router.push('/auth')}
            >
              <LinearGradient
                colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.signInGradient}
              >
                <Text style={styles.signInButtonText}>Sign In</Text>
              </LinearGradient>
            </TouchableOpacity>
        </View>
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
        <TouchableOpacity onPress={() => router.push('/')}>
          <Text style={[styles.logo, { color: colors.tint }]}>Gymsta</Text>
        </TouchableOpacity>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.settingsButton} 
            onPress={navigateToSettings}>
            <Settings size={24} color={colors.tint} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Profile Header - Fixed at top */}
        <View style={{ paddingHorizontal: Layout.horizontalPadding, paddingBottom: 10 }}>
          <TouchableOpacity 
            onPress={handleViewStories}
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
            
            <View style={[
              styles.buttonContainer,
              !hasProducts && styles.singleButtonContainer
            ]}>
              <TouchableOpacity 
                style={[styles.button, styles.editButtonContainer]}
                onPress={() => router.push('/profile/edit')}
                activeOpacity={0.8}>
                <LinearGradient
                  colors={['#00D4FF', '#A855F7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.editButton}>
                  <Text style={[styles.buttonText, styles.editButtonText]}>Edit Profile</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              {hasProducts && (
                <TouchableOpacity 
                  style={styles.button}
                  onPress={() => setShowProductsModal(true)}
                  activeOpacity={0.8}>
                  <View style={[styles.secondaryButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.tint }]}>
                    <Text style={[styles.buttonText, styles.secondaryButtonText, { color: colors.tint }]}>See Products</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
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
              <Text style={[styles.statNumber, { color: colors.tint }]}>{formatNumber(posts.length)}</Text>
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
              <Text style={[styles.statNumber, { color: colors.tint }]}>{formatNumber(profile._count.following)}</Text>
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
        </View>

        {/* Content based on active tab */}
        {activeTab === 'posts' && (
          <ScrollView 
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Drafts section */}
            {drafts.length > 0 && (
              <TouchableOpacity 
                style={[styles.draftsSection, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push('/(tabs)/profile/drafts')}
              >
                <View style={styles.draftsContent}>
                  <Folder size={24} color={colors.textSecondary} />
                  <Text style={[styles.draftsText, { color: colors.textSecondary }]}>
                    Drafts ({drafts.length})
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            
            {/* Posts and workouts in feed style */}
            {posts.length === 0 && drafts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No posts yet.</Text>
              </View>
            ) : (
              posts.map((item) => {
                if (item.type === 'workout') {
                  // Render workout in feed style using WorkoutPost component
                  const workoutItem = item as WorkoutPost;
                  return (
                    <EnhancedWorkoutPost
                      key={`workout-${workoutItem.id}`}
                      workout={workoutItem}
                      colors={colors}
                      currentUserId={profile?.id || null}
                      isAuthenticated={isAuthenticated}
                      showAuthModal={showAuthModal}
                      navigateToProfile={(userId, username) => {
                        if (userId === profile?.id) {
                          // Already on own profile, do nothing
                          return;
                        } else {
                          router.push(`/${username}`);
                        }
                      }}
                      handleLike={handleLike}
                      handleUnlike={handleUnlike}
                      handleDeletePost={handleDeletePost}
                      onCommentCountChange={(postId, count) => {
                        // Update the post's comment count in state
                        setPosts(prevPosts => 
                          prevPosts.map(p => 
                            p.id === postId ? { ...p, comments_count: count } : p
                          )
                        );
                      }}
                    />
                  );
                } else {
                  // Render regular post in feed style using FeedPost component
                  const postItem = item as Post;
                  return (
                    <FeedPost
                      key={`post-${postItem.id}`}
                      post={postItem}
                      colors={colors}
                      playingVideo={null}
                      currentUserId={profile?.id || null}
                      flaggedPosts={{}}
                      flagging={{}}
                      setFlagging={() => {}}
                      setFlaggedPosts={() => {}}
                      isAuthenticated={isAuthenticated}
                      showAuthModal={showAuthModal}
                      toggleVideoPlayback={() => {}}
                      navigateToProfile={(userId, username) => {
                        if (userId === profile?.id) {
                          // Already on own profile, do nothing
                          return;
                        } else {
                          router.push(`/${username}`);
                        }
                      }}
                      handleLike={handleLike}
                      handleUnlike={handleUnlike}
                      handleDeletePost={handleDeletePost}
                      videoRefs={{ current: {} }}
                      onCommentCountChange={(postId, count) => {
                        // Update the post's comment count in state
                        setPosts(prevPosts => 
                          prevPosts.map(p => 
                            p.id === postId ? { ...p, comments_count: count } : p
                          )
                        );
                      }}
                      isMyGymTab={false}
                    />
                  );
                }
              })
            )}
          </ScrollView>
        )}

        {activeTab === 'lifts' && (
          lifts.length === 0 ? (
            <View style={styles.progressContainer}>
              <Text style={[styles.progressText, { color: colors.textSecondary }]}>No lift records to show yet.</Text>
              <Text style={[styles.progressSubText, { color: colors.textSecondary }]}>Start tracking your lifts to see progress here.</Text>
            </View>
          ) : (
            <ScrollView style={{ paddingHorizontal: Layout.horizontalPadding }} contentContainerStyle={{ paddingBottom: 20 }}>
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
            </ScrollView>
          )
        )}

        {activeTab === 'workouts' && (
          workouts.length === 0 ? (
            <View style={styles.progressContainer}>
              <Text style={[styles.progressText, { color: colors.textSecondary }]}>No workouts to show yet.</Text>
            </View>
          ) : (
            <ScrollView style={{ paddingHorizontal: Layout.horizontalPadding }} contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={styles.postsGrid}>
                {workouts.map((workout) => (
                  <TouchableOpacity
                    key={workout.id}
                    style={styles.workoutCard}
                    onPress={() => {
                      setSelectedWorkoutId(workout.id);
                      if (workout.progress_image_url) {
                        setSelectedProgressImageUrl(workout.progress_image_url);
                        setShowProgressImage(true);
                        setWorkoutDetails(null);
                        setShowProgressDetails(false);
                      } else {
                        setShowWorkoutModal(true);
                      }
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
            </ScrollView>
          )
        )}
      </View>

      <Modal
        visible={showingStories}
        animationType="fade"
        onRequestClose={() => setShowingStories(false)}>
        <StoryViewer
          stories={stories}
          onComplete={() => setShowingStories(false)}
        />
      </Modal>

      <Modal
        visible={showProductsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProductsModal(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalBackground }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>My Products</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowProductsModal(false)}>
                <Text style={[styles.closeButtonText, { color: colors.text }]}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.productsGrid}>
              {products.map((product) => (
                <TouchableOpacity
                  key={product.id}
                  style={[styles.productCard, { 
                    backgroundColor: colors.card,
                    shadowColor: colors.shadow
                  }]}
                  onPress={() => {
                    setShowProductsModal(false);
                    router.push(`/marketplace/${product.id}`);
                  }}>
                  <Image source={{ uri: product.image_url }} style={styles.productImage} />
                  <View style={styles.productInfo}>
                    <Text style={[styles.productName, { color: colors.text }]}>{product.name}</Text>
                    <Text style={[styles.productPrice, { color: colors.tint }]}>${product.price}</Text>
                    {product.description && (
                      <Text style={[styles.productDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                        {product.description}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Workout detail modal */}
      <WorkoutDetailModal
        workoutId={selectedWorkoutId}
        visible={showWorkoutModal}
        onClose={() => setShowWorkoutModal(false)}
      />

      {/* Progress photo / details viewer modal */}
      <Modal
        visible={showProgressImage}
        animationType="fade"
        onRequestClose={() => {
          setShowProgressImage(false);
          setShowProgressDetails(false);
          setWorkoutDetails(null);
        }}>
        <View style={{ flex: 1, backgroundColor: 'black' }} {...panResponder.panHandlers}>
          {/* Back button for image view */}
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 50,
              left: 20,
              zIndex: 10,
              backgroundColor: 'rgba(0,0,0,0.5)',
              borderRadius: 20,
              padding: 10,
            }}
            onPress={() => {
              setShowProgressImage(false);
              setShowProgressDetails(false);
            }}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>

          {!showProgressDetails ? (
            selectedProgressImageUrl && (
              <Image
                source={{ uri: selectedProgressImageUrl }}
                style={{ flex: 1, resizeMode: 'contain' }}
              />
            )
          ) : (
            <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
              <View style={{ padding: 15 }}>
                {detailsLoading ? (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <ActivityIndicator size="large" color={colors.tint} />
                  </View>
                ) : detailsError ? (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <Text style={{ color: colors.error, textAlign: 'center', fontSize: 16 }}>{detailsError}</Text>
                  </View>
                ) : workoutDetails ? (
                  <>
                    {/* Date */}
                    <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 15, marginTop: 40 }}>
                      {new Date(workoutDetails.created_at || workoutDetails.date).toLocaleDateString()}
                    </Text>

                    {/* Caption */}
                    {workoutDetails.caption && (
                      <Text style={{ color: colors.text, fontSize: 16, marginBottom: 20, lineHeight: 24 }}>
                        {workoutDetails.caption}
                      </Text>
                    )}

                    {/* Exercises */}
                    <View style={{ gap: 15, marginBottom: 20 }}>
                      {(workoutDetails.exercises || []).map((exercise: any, index: number) => (
                        <View 
                          key={index} 
                          style={{ 
                            backgroundColor: colors.card, 
                            borderRadius: 12, 
                            padding: 15 
                          }}>
                          <View style={{ 
                            flexDirection: 'row', 
                            alignItems: 'center', 
                            justifyContent: 'space-between', 
                            marginBottom: 15 
                          }}>
                            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>
                              {exercise.name}
                            </Text>
                            {exercise.isPR && (
                              <View style={{ 
                                flexDirection: 'row', 
                                alignItems: 'center', 
                                paddingHorizontal: 8, 
                                paddingVertical: 4, 
                                borderRadius: 12, 
                                backgroundColor: colors.tint + '20',
                                gap: 4 
                              }}>
                                <CheckCircle2 size={16} color={colors.tint} fill={colors.tint} />
                                <Text style={{ color: colors.tint, fontSize: 14, fontWeight: '600' }}>PR</Text>
                              </View>
                            )}
                          </View>

                          <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                            <Text style={{ flex: 1, color: colors.textSecondary, fontSize: 14, fontWeight: '500' }}>Set</Text>
                            <Text style={{ flex: 1, color: colors.textSecondary, fontSize: 14, fontWeight: '500' }}>Reps</Text>
                            <Text style={{ flex: 1, color: colors.textSecondary, fontSize: 14, fontWeight: '500' }}>Weight</Text>
                          </View>

                          {(exercise.sets || []).map((set: any, setIndex: number) => (
                            <View key={setIndex} style={{ flexDirection: 'row', marginBottom: 8 }}>
                              <Text style={{ flex: 1, color: colors.text, fontSize: 16 }}>{setIndex + 1}</Text>
                              <Text style={{ flex: 1, color: colors.text, fontSize: 16 }}>{set.reps}</Text>
                              <Text style={{ flex: 1, color: colors.text, fontSize: 16 }}>{set.weight} kg</Text>
                            </View>
                          ))}
                        </View>
                      ))}
                    </View>
                  </>
                ) : null}
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Followers modal */}
      <Modal
        visible={showFollowersModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFollowersModal(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalBackground }]}>
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
                        uri: follower.profiles?.avatar_url || 'https://source.unsplash.com/random/200x200/?portrait'
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
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalBackground }]}>
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
                        uri: followingUser.profiles?.avatar_url || 'https://source.unsplash.com/random/200x200/?portrait'
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
    paddingTop: 50,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
  logo: {
    ...Typography.logo,
    marginBottom: 15,
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
  notificationButton: {
    padding: 8,
    marginRight: 10,
  },
  settingsButton: {
    padding: 8,
  },
  profileImageContainer: {
    alignSelf: 'center',
    marginVertical: 12,
    padding: 3,
    borderRadius: 45,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
    elevation: 5,
    position: 'relative',
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  profileInfo: {
    alignItems: 'center',
    paddingHorizontal: Layout.horizontalPadding,
    marginTop: 10,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  bio: {
    fontSize: 16,
    marginTop: 4,
    textAlign: 'center',
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
    gap: 12,
    alignItems: 'center',
  },
  singleButtonContainer: {
    justifyContent: 'center',
  },
  button: {
    flex: 1,
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  primaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 25,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  secondaryButtonText: {
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.horizontalPadding - 1,
    paddingVertical: 10,
    marginTop: 10,
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
    height: '100%',
    borderRadius: 2,
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
  productsGrid: {
    padding: 15,
  },
  productCard: {
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  productImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  productInfo: {
    padding: 15,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  productDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  signInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInButton: {
    borderRadius: 20,
  },
  signInGradient: {
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
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
  draftsFolder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  draftsText: {
    marginTop: 8,
    fontWeight: '600',
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
  // New styles for edit button (matching follow button)
  editButtonContainer: {
    borderRadius: 25,
    minWidth: 140,
    minHeight: 48,
    shadowColor: '#00D4FF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  editButton: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 25,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
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
  // New styles for workout placeholders in posts grid
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
  // New styles for drafts section in feed style
  draftsSection: {
    marginHorizontal: Layout.horizontalPadding,
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  draftsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
});