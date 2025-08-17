import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Flash, Zap, TrendingUp, Star } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Post } from '../types/social';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import GymstaFeed from './GymstaFeed';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface GymstaFeedDemoProps {
  posts: Post[];
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onLoadMore?: () => void;
}

const GymstaFeedDemo: React.FC<GymstaFeedDemoProps> = ({
  posts,
  loading = false,
  refreshing = false,
  onRefresh,
  onLoadMore,
}) => {
  const { colors } = useTheme();
  const { user, isAuthenticated, showAuthModal } = useAuth();
  
  // State management
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [flaggedPosts, setFlaggedPosts] = useState<{ [postId: string]: boolean }>({});
  const [flagging, setFlagging] = useState<{ [postId: string]: boolean }>({});
  const [showFeatureHighlight, setShowFeatureHighlight] = useState(true);
  const [highlightAnimation] = useState(new Animated.Value(0));
  
  // Refs
  const videoRefs = useRef<{ [key: string]: any }>({});

  // Animate feature highlight on mount
  useEffect(() => {
    if (showFeatureHighlight) {
      Animated.sequence([
        Animated.timing(highlightAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(highlightAnimation, {
          toValue: 0,
          duration: 1000,
          delay: 2000,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowFeatureHighlight(false);
      });
    }
  }, [showFeatureHighlight]);

  // Handlers
  const toggleVideoPlayback = (postId: string) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setPlayingVideo(playingVideo === postId ? null : postId);
  };

  const navigateToProfile = (userId: string, username: string) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // Navigate to profile - implement your navigation logic here
    console.log('Navigate to profile:', username);
  };

  const handleLike = async (postId: string) => {
    if (!isAuthenticated) {
      showAuthModal();
      return;
    }
    
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    // Implement your like logic here
    console.log('Like post:', postId);
  };

  const handleUnlike = async (postId: string) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Implement your unlike logic here
    console.log('Unlike post:', postId);
  };

  const handleDeletePost = async (postId: string) => {
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    // Implement your delete logic here
    console.log('Delete post:', postId);
    Alert.alert('Success', 'Post deleted successfully!');
  };

  const handleCommentCountChange = (postId: string, count: number) => {
    // Handle comment count updates
    console.log('Comment count changed for post:', postId, 'New count:', count);
  };

  // Feature highlight component
  const FeatureHighlight = () => (
    <Animated.View
      style={[
        styles.featureHighlight,
        {
          opacity: highlightAnimation,
          transform: [
            {
              translateY: highlightAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={['rgba(99, 102, 241, 0.9)', 'rgba(168, 85, 247, 0.9)']}
        style={styles.highlightGradient}
      >
        <View style={styles.highlightContent}>
          <Flash size={24} color="#fff" />
          <Text style={styles.highlightText}>
            ✨ New Gymsta Flow Design! ✨
          </Text>
          <Text style={styles.highlightSubtext}>
            Swipe, tap, and explore the future of fitness social media
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  // Stats header component
  const StatsHeader = () => (
    <View style={[styles.statsHeader, { backgroundColor: colors.card }]}>
      <LinearGradient
        colors={['rgba(59, 130, 246, 0.1)', 'rgba(16, 185, 129, 0.1)']}
        style={styles.statsGradient}
      >
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Zap size={20} color={colors.tint} />
            <Text style={[styles.statValue, { color: colors.text }]}>2.4k</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Posts Today</Text>
          </View>
          <View style={styles.statItem}>
            <TrendingUp size={20} color={colors.tint} />
            <Text style={[styles.statValue, { color: colors.text }]}>156k</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active Users</Text>
          </View>
          <View style={styles.statItem}>
            <Star size={20} color={colors.tint} />
            <Text style={[styles.statValue, { color: colors.text }]}>89%</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Engagement</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Feature Highlight */}
      {showFeatureHighlight && <FeatureHighlight />}

      {/* Stats Header */}
      <StatsHeader />

      {/* Main Feed */}
      <GymstaFeed
        posts={posts}
        colors={colors}
        playingVideo={playingVideo}
        currentUserId={user?.id || null}
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
        loading={loading}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  featureHighlight: {
    position: 'absolute',
    top: 60,
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 1000,
  },
  highlightGradient: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  highlightContent: {
    alignItems: 'center',
  },
  highlightText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  highlightSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '500',
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  statsHeader: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsGradient: {
    padding: Spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: Spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },
});

export default GymstaFeedDemo; 