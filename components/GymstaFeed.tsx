import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
// @ts-ignore
FlashList.defaultProps = { ...(FlashList.defaultProps || {}), disableAutoLayout: true };
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Post } from '../types/social';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import GymstaPost from './GymstaPost';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface GymstaFeedProps {
  posts: Post[];
  colors: any;
  playingVideo: string | null;
  currentUserId: string | null;
  flaggedPosts: { [postId: string]: boolean };
  flagging: { [postId: string]: boolean };
  setFlagging: React.Dispatch<React.SetStateAction<{ [postId: string]: boolean }>>;
  setFlaggedPosts: React.Dispatch<React.SetStateAction<{ [postId: string]: boolean }>>;
  isAuthenticated: boolean;
  showAuthModal: () => void;
  toggleVideoPlayback: (postId: string) => void;
  navigateToProfile: (userId: string, username: string) => void;
  handleLike: (postId: string) => void;
  handleUnlike: (postId: string) => void;
  videoRefs: React.MutableRefObject<{ [key: string]: any }>;
  handleDeletePost: (postId: string) => void;
  onCommentCountChange?: (postId: string, count: number) => void;
  isMyGymTab?: boolean;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  ListEmptyComponent?: React.ComponentType<any> | React.ReactElement;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement;
  ListFooterComponent?: React.ComponentType<any> | React.ReactElement;
}

const GymstaFeed: React.FC<GymstaFeedProps> = ({
  posts,
  colors,
  playingVideo,
  currentUserId,
  flaggedPosts,
  flagging,
  setFlagging,
  setFlaggedPosts,
  isAuthenticated,
  showAuthModal,
  toggleVideoPlayback,
  navigateToProfile,
  handleLike,
  handleUnlike,
  videoRefs,
  handleDeletePost,
  onCommentCountChange,
  isMyGymTab = false,
  loading = false,
  refreshing = false,
  onRefresh,
  onEndReached,
  onEndReachedThreshold = 0.5,
  ListEmptyComponent,
  ListHeaderComponent,
  ListFooterComponent,
}) => {
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set());
  const [staggeredAnimations] = useState<{ [key: string]: Animated.Value }>({});
  const listRef = useRef<FlashList<Post>>(null);

  // Initialize staggered animations for posts
  useEffect(() => {
    posts.forEach((post, index) => {
      if (!staggeredAnimations[post.id]) {
        staggeredAnimations[post.id] = new Animated.Value(0);
      }
    });
  }, [posts]);

  // Animate posts when they become visible
  const animatePost = useCallback((postId: string, delay: number = 0) => {
    if (staggeredAnimations[postId]) {
      Animated.timing(staggeredAnimations[postId], {
        toValue: 1,
        duration: 600,
        delay,
        useNativeDriver: true,
      }).start();
    }
  }, [staggeredAnimations]);

  // Handle viewability changes
  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    const newVisibleItems = new Set(viewableItems.map((item: any) => item.key));
    setVisibleItems(newVisibleItems);

    // Animate newly visible items with staggered delay
    viewableItems.forEach((item: any, index: number) => {
      if (!visibleItems.has(item.key)) {
        animatePost(item.key, index * 100);
      }
    });
  }, [visibleItems, animatePost]);

  // Render individual post with staggered animation
  const renderPost = useCallback(({ item, index }: { item: Post; index: number }) => {
    const animation = staggeredAnimations[item.id] || new Animated.Value(0);
    
    return (
      <Animated.View
        style={{
          opacity: animation,
          transform: [
            {
              translateY: animation.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            },
            {
              scale: animation.interpolate({
                inputRange: [0, 1],
                outputRange: [0.95, 1],
              }),
            },
          ],
        }}
      >
        <GymstaPost
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
          onCommentCountChange={onCommentCountChange}
          isMyGymTab={isMyGymTab}
        />
      </Animated.View>
    );
  }, [
    staggeredAnimations,
    colors,
    playingVideo,
    currentUserId,
    flaggedPosts,
    flagging,
    setFlagging,
    setFlaggedPosts,
    isAuthenticated,
    showAuthModal,
    toggleVideoPlayback,
    navigateToProfile,
    handleLike,
    handleUnlike,
    videoRefs,
    handleDeletePost,
    onCommentCountChange,
    isMyGymTab,
  ]);

  // Custom refresh control with gradient
  const CustomRefreshControl = useCallback(() => (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.tint}
      colors={[colors.tint]}
      progressBackgroundColor={colors.background}
      progressViewOffset={20}
    />
  ), [refreshing, onRefresh, colors]);

  // Loading component with gradient
  const LoadingComponent = useCallback(() => (
    <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.tint, colors.tint + '80']}
        style={styles.loadingGradient}
      >
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Loading amazing content...</Text>
      </LinearGradient>
    </View>
  ), [colors]);

  // Empty state component
  const EmptyComponent = useCallback(() => (
    <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={['rgba(99, 102, 241, 0.1)', 'rgba(168, 85, 247, 0.1)']}
        style={styles.emptyGradient}
      >
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          No posts yet
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Be the first to share your fitness journey!
        </Text>
      </LinearGradient>
    </View>
  ), [colors]);

  // Footer component with gradient
  const FooterComponent = useCallback(() => (
    <View style={styles.footerContainer}>
      <LinearGradient
        colors={['transparent', colors.background]}
        style={styles.footerGradient}
      />
    </View>
  ), [colors]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Background gradient */}
      <LinearGradient
        colors={[
          colors.background,
          colors.background + 'F0',
          colors.background + 'E0',
        ]}
        style={styles.backgroundGradient}
      />

      <FlashList
        ref={listRef}
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        key={`feed-${posts.length}-${posts.map(p => p.id).join(',').slice(0, 20)}`}
        estimatedItemSize={500}
        showsVerticalScrollIndicator={false}
        refreshControl={CustomRefreshControl()}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 50,
          minimumViewTime: 100,
        }}
        onEndReached={onEndReached}
        onEndReachedThreshold={onEndReachedThreshold}
        ListEmptyComponent={ListEmptyComponent || EmptyComponent}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent || FooterComponent}
        contentContainerStyle={styles.contentContainer}
        // Enhanced scroll performance
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={10}
        initialNumToRender={3}
        // Custom scroll behavior
        scrollEventThrottle={16}
        onScroll={(event) => {
          // Add haptic feedback on scroll
          if (Platform.OS === 'ios' && event.nativeEvent.contentOffset.y > 0) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }}
      />

      {/* Loading overlay */}
      {loading && <LoadingComponent />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  contentContainer: {
    paddingBottom: Spacing.xl * 2,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingGradient: {
    padding: Spacing.xl * 2,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: Spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    minHeight: screenHeight * 0.6,
  },
  emptyGradient: {
    padding: Spacing.xl * 2,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 250,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
  footerContainer: {
    height: Spacing.xl * 2,
    position: 'relative',
  },
  footerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

export default GymstaFeed; 