import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Bookmark, Grid3x3, List, User, Play, Heart, MessageCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { Spacing, BorderRadius, Shadows } from '@/constants/Spacing';
import { Post } from '@/types/social';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;
const isMediumScreen = screenWidth >= 375 && screenWidth < 414;
const ITEM_WIDTH = isSmallScreen 
  ? (screenWidth - Spacing.lg * 2.5) / 2.5 // 2.5 columns for small screens
  : isMediumScreen 
    ? (screenWidth - Spacing.lg * 3) / 3 // 3 columns for medium screens
    : (screenWidth - Spacing.lg * 3.5) / 3.5; // 3.5 columns for large screens

interface SavedPost {
  id: string;
  post_id: string;
  created_at: string;
  post_data: Post;
}

export default function SavedPostsScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSavedPosts();
  }, []);

  const loadSavedPosts = React.useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Enhanced query with more post details
      const { data: fbData, error: fbError } = await supabase
        .from('saved_posts')
        .select(
          `id, post_id, created_at,
           posts!inner(
             id, user_id, caption, image_url, media_type, created_at, product_id,
             profiles:profiles(id, username, avatar_url, is_verified, gym)
           )`
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fbError) {
        console.error('Error loading saved posts:', fbError);
        setError('Failed to load saved posts');
        return;
      }

      const mapped: SavedPost[] = (fbData || []).map((row: any) => ({
        id: row.id,
        post_id: row.post_id,
        created_at: row.created_at,
        post_data: {
          id: row.posts?.id,
          user_id: row.posts?.user_id,
          caption: row.posts?.caption,
          image_url: row.posts?.image_url,
          media_type: row.posts?.media_type,
          created_at: row.posts?.created_at,
          product_id: row.posts?.product_id,
          profiles: row.posts?.profiles || {},
          likes: [],
          comments_count: 0,
        } as unknown as Post,
      }));

      setSavedPosts(mapped);
    } catch (error) {
      console.error('Error loading saved posts:', error);
      setError('Failed to load saved posts');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Reload when screen gains focus (e.g., after saving/unsaving from other screens)
  useFocusEffect(
    React.useCallback(() => {
      loadSavedPosts();
    }, [loadSavedPosts])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSavedPosts();
    setRefreshing(false);
  }, []);

  const handleUnsavePost = async (postId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('saved_posts')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', postId);

      if (error) {
        console.error('Error unsaving post:', error);
        Alert.alert('Error', 'Failed to unsave post');
        return;
      }

      // Remove from local state
      setSavedPosts(prev => prev.filter(post => post.post_id !== postId));
    } catch (error) {
      console.error('Error unsaving post:', error);
      Alert.alert('Error', 'Failed to unsave post');
    }
  };

  const handlePostPress = (postId: string) => {
    router.push(`/post/${postId}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const renderGridItem = ({ item }: { item: SavedPost }) => (
    <View style={styles.gridItemContainer}>
      <TouchableOpacity
        style={styles.gridItem}
        onPress={() => handlePostPress(item.post_id)}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: item.post_data.image_url }}
          style={styles.gridImage}
          resizeMode="cover"
        />
        
        {/* Media Type Indicator */}
        {item.post_data.media_type === 'video' && (
          <View style={styles.mediaIndicator}>
            <Play size={12} color="#FFFFFF" fill="#FFFFFF" />
          </View>
        )}
        
        {/* Gradient Overlay for better text readability */}
        <View style={styles.gridOverlay}>
          <View style={styles.gridOverlayTop}>
            {/* Author Info */}
            <View style={styles.authorInfo}>
              <Image
                source={{ 
                  uri: item.post_data.profiles?.avatar_url || 
                  `https://ui-avatars.com/api/?name=${item.post_data.profiles?.username || 'User'}&background=random`
                }}
                style={styles.authorAvatar}
              />
              <Text style={styles.authorName} numberOfLines={1}>
                {item.post_data.profiles?.username || 'Unknown'}
              </Text>
            </View>
            
            {/* Unsave Button */}
            <TouchableOpacity
              style={styles.unsaveButtonGrid}
              onPress={() => handleUnsavePost(item.post_id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Bookmark size={16} color="#FFFFFF" fill="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          {/* Caption Preview */}
          {item.post_data.caption && (
            <Text style={styles.gridCaption} numberOfLines={2}>
              {item.post_data.caption}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderListItem = ({ item }: { item: SavedPost }) => (
    <TouchableOpacity
      style={[styles.listItem, { backgroundColor: colors.card }]}
      onPress={() => handlePostPress(item.post_id)}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: item.post_data.image_url }}
        style={styles.listImage}
        resizeMode="cover"
      />
      
      <View style={styles.listContent}>
        {/* Author Info */}
        <View style={styles.listAuthorInfo}>
          <Image
            source={{ 
              uri: item.post_data.profiles?.avatar_url || 
              `https://ui-avatars.com/api/?name=${item.post_data.profiles?.username || 'User'}&background=random`
            }}
            style={styles.listAuthorAvatar}
          />
          <View style={styles.listAuthorDetails}>
            <Text style={[styles.listAuthorName, { color: colors.text }]} numberOfLines={1}>
              {item.post_data.profiles?.username || 'Unknown'}
            </Text>
            <Text style={[styles.listDate, { color: colors.textSecondary }]}>
              {formatDate(item.created_at)}
            </Text>
          </View>
        </View>
        
        {/* Caption */}
        <Text style={[styles.listCaption, { color: colors.text }]} numberOfLines={2}>
          {item.post_data.caption || 'No caption'}
        </Text>
        
        {/* Media Type Indicator */}
        {item.post_data.media_type === 'video' && (
          <View style={styles.listMediaIndicator}>
            <Play size={12} color={colors.textSecondary} />
            <Text style={[styles.listMediaText, { color: colors.textSecondary }]}>
              Video
            </Text>
          </View>
        )}
      </View>
      
      {/* Unsave Button */}
      <TouchableOpacity
        style={styles.unsaveButton}
        onPress={() => handleUnsavePost(item.post_id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Bookmark size={20} color={colors.tint} fill={colors.tint} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconContainer, { backgroundColor: colors.card }]}>
        <Bookmark size={48} color={colors.textSecondary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        No Saved Posts
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Posts you save will appear here for easy access
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconContainer, { backgroundColor: colors.card }]}>
        <Text style={[styles.errorIcon, { color: colors.textSecondary }]}>⚠️</Text>
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        Something went wrong
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {error || 'Failed to load saved posts'}
      </Text>
      <TouchableOpacity
        style={[styles.retryButton, { backgroundColor: colors.tint }]}
        onPress={loadSavedPosts}
      >
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSkeletonItem = () => (
    <View style={[styles.skeletonItem, { backgroundColor: colors.card }]}>
      <View style={[styles.skeletonImage, { backgroundColor: colors.border }]} />
      <View style={styles.skeletonContent}>
        <View style={[styles.skeletonLine, { backgroundColor: colors.border }]} />
        <View style={[styles.skeletonLine, { backgroundColor: colors.border, width: '60%' }]} />
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Saved Posts</Text>
          <View style={styles.headerRight} />
        </View>
        <FlatList
          data={Array.from({ length: 6 })}
          renderItem={renderSkeletonItem}
          keyExtractor={(_, index) => index.toString()}
          numColumns={isSmallScreen ? 2 : 3}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Saved Posts</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.viewModeButton, { backgroundColor: colors.card }]}
            onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {viewMode === 'grid' ? (
              <List size={20} color={colors.text} />
            ) : (
              <Grid3x3 size={20} color={colors.text} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {error ? (
        renderErrorState()
      ) : savedPosts.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={savedPosts}
          renderItem={viewMode === 'grid' ? renderGridItem : renderListItem}
          keyExtractor={(item) => item.id}
          numColumns={viewMode === 'grid' ? (isSmallScreen ? 2 : 3) : 1}
          columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.tint}
            />
          }
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={[styles.listHeaderText, { color: colors.textSecondary }]}>
                {savedPosts.length} saved post{savedPosts.length !== 1 ? 's' : ''}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    ...Shadows.light,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewModeButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    ...Shadows.light,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.sm,
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  listContainer: {
    padding: Spacing.sm,
  },
  listHeader: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  listHeaderText: {
    fontSize: 14,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  gridItemContainer: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    ...Shadows.light,
  },
  gridItem: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  mediaIndicator: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: BorderRadius.xs,
    padding: Spacing.xs,
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    justifyContent: 'space-between',
  },
  gridOverlayTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatar: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.xs,
  },
  authorName: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  unsaveButtonGrid: {
    padding: Spacing.xs,
  },
  gridCaption: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    marginTop: Spacing.xs,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    ...Shadows.light,
  },
  listImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.md,
  },
  listContent: {
    flex: 1,
  },
  listAuthorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  listAuthorAvatar: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.xs,
  },
  listAuthorDetails: {
    flex: 1,
  },
  listAuthorName: {
    fontSize: 12,
    fontWeight: '600',
  },
  listDate: {
    fontSize: 10,
  },
  listCaption: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  listMediaIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  listMediaText: {
    fontSize: 10,
    marginLeft: Spacing.xs,
  },
  unsaveButton: {
    padding: Spacing.sm,
  },
  skeletonItem: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  skeletonImage: {
    width: '100%',
    height: '100%',
  },
  skeletonContent: {
    padding: Spacing.md,
  },
  skeletonLine: {
    height: 10,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  errorIcon: {
    fontSize: 48,
  },
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 