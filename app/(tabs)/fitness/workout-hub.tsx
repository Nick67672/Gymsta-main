import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Image, useWindowDimensions, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Calendar, 
  TrendingUp, 
  Target, 
  Dumbbell, 
  ChevronRight, 
  ChevronLeft,
  Play,
  BarChart3, 
  Clock,
  Award,
  Trophy,
  Users,
  Globe,
  MapPin,
  ChevronDown,
  Zap,
  Flame,
  Star,
  Heart,
  Activity,
  Target as TargetIcon,
  Medal,
  Crown,
  Sparkles,
  Plus,
  History,
  Settings
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/Spacing';
import { useWorkoutStats } from '@/hooks/useWorkoutStats';
import { useLeaderboard } from '@/hooks/useLeaderboard';

const { width: screenWidth } = Dimensions.get('window');

export default function WorkoutHubScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [scaleAnim] = useState(new Animated.Value(0.9));
  const [pulseAnim] = useState(new Animated.Value(1));
  
  // Add error handling for stats
  const { stats, loading: statsLoading, error: statsError } = useWorkoutStats();
  
  // Leaderboard state with error handling
  const [leaderboardScope, setLeaderboardScope] = useState<'global' | 'friends' | 'my-gym'>('global');
  const [leaderboardType, setLeaderboardType] = useState('Weekly Volume');
  const [showDropdown, setShowDropdown] = useState(false);
  
  const { data: leaderboardData, loading: leaderboardLoading, error: leaderboardError } = useLeaderboard(leaderboardScope, leaderboardType as any);

  const leaderboardTypes = [
    'Weekly Volume',
    'Bench Press',
    'Squat',
    'Deadlift',
    'Highest Streak'
  ];

  // Add error logging for debugging
  React.useEffect(() => {
    if (statsError) {
      console.warn('Workout stats error:', statsError);
    }
    if (leaderboardError) {
      console.warn('Leaderboard error:', leaderboardError);
    }
  }, [statsError, leaderboardError]);

  // Start animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Start pulse animation for main CTA
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();
  }, []);

  // Example usage: router.push(`/profile/${userId}`)
  const handleProfilePress = (userId: string) => {
    if (userId) {
      router.push(`/profile/${userId}`);
    }
  };

  const navigateToWorkoutTracker = () => {
    router.push('/fitness/workout-tracker');
  };

  // Responsive size helpers
  const dropdownModalWidth = Math.min(windowWidth * 0.9, 300);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.card }]}
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: colors.text }]}>Workout Hub</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Your fitness command center
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.levelBadge, { backgroundColor: colors.tint + '15' }]}>
            <Star size={16} color={colors.tint} />
            <Text style={[styles.levelText, { color: colors.tint }]}>Lv. 8</Text>
          </View>
        </View>
      </Animated.View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main CTA Card */}
        <Animated.View 
          style={[
            styles.mainCTAContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: pulseAnim }]
            }
          ]}
        >
          <TouchableOpacity
            style={styles.mainCTA}
            onPress={navigateToWorkoutTracker}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#667eea', '#764ba2', '#f093fb']}
              style={styles.mainCTAGradient}
            >
              <View style={styles.mainCTAContent}>
                <View style={styles.mainCTAHeader}>
                  <View style={styles.mainCTAIconContainer}>
                    <Zap size={32} color="#fff" />
                    <View style={styles.sparkleContainer}>
                      <Sparkles size={12} color="#FFD700" />
                    </View>
                  </View>
                </View>
                
                <Text style={styles.mainCTATitle}>Start Your Workout</Text>
                <Text style={styles.mainCTADescription}>
                  Ready to crush your fitness goals? Let's get moving!
                </Text>
                
                <View style={styles.mainCTAFeatures}>
                  <View style={styles.mainCTAFeatureItem}>
                    <TargetIcon size={14} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.mainCTAFeatureText}>Track Progress</Text>
                  </View>
                  <View style={styles.mainCTAFeatureItem}>
                    <TrendingUp size={14} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.mainCTAFeatureText}>Set Records</Text>
                  </View>
                  <View style={styles.mainCTAFeatureItem}>
                    <Flame size={14} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.mainCTAFeatureText}>Build Strength</Text>
                  </View>
                </View>

                <View style={styles.mainCTAButton}>
                  <Play size={20} color="#fff" />
                  <Text style={styles.mainCTAButtonText}>Start Now</Text>
                  <ChevronRight size={16} color="#fff" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Quick Stats Section */}
        <Animated.View 
          style={[
            styles.statsSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>This Week's Progress</Text>
          
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <LinearGradient
                colors={['rgba(16, 185, 129, 0.1)', 'rgba(5, 150, 105, 0.05)']}
                style={styles.statCardGradient}
              >
                <View style={[styles.statIconContainer, { backgroundColor: '#10B981' + '15' }]}>
                  <Play size={20} color="#10B981" />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>{statsLoading ? '...' : stats?.weeklyWorkouts ?? 0}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Workouts</Text>
                <View style={styles.statProgress}>
                  <View style={[styles.statProgressBar, { backgroundColor: colors.border }]}>
                    <View style={[styles.statProgressFill, { width: '75%', backgroundColor: '#10B981' }]} />
                  </View>
                  <Text style={[styles.statProgressText, { color: colors.textSecondary }]}>75%</Text>
                </View>
              </LinearGradient>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <LinearGradient
                colors={['rgba(59, 130, 246, 0.1)', 'rgba(37, 99, 235, 0.05)']}
                style={styles.statCardGradient}
              >
                <View style={[styles.statIconContainer, { backgroundColor: '#3B82F6' + '15' }]}>
                  <BarChart3 size={20} color="#3B82F6" />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>{statsLoading ? '...' : `${(stats?.weeklyVolume ?? 0).toFixed(0)}kg`}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Volume</Text>
                <View style={styles.statProgress}>
                  <View style={[styles.statProgressBar, { backgroundColor: colors.border }]}>
                    <View style={[styles.statProgressFill, { width: '60%', backgroundColor: '#3B82F6' }]} />
                  </View>
                  <Text style={[styles.statProgressText, { color: colors.textSecondary }]}>60%</Text>
                </View>
              </LinearGradient>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <LinearGradient
                colors={['rgba(245, 158, 11, 0.1)', 'rgba(217, 119, 6, 0.05)']}
                style={styles.statCardGradient}
              >
                <View style={[styles.statIconContainer, { backgroundColor: '#F59E0B' + '15' }]}>
                  <Clock size={20} color="#F59E0B" />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>{statsLoading ? '...' : `${stats?.weeklyAvgDuration ?? 0}min`}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg Time</Text>
                <View style={styles.statProgress}>
                  <View style={[styles.statProgressBar, { backgroundColor: colors.border }]}>
                    <View style={[styles.statProgressFill, { width: '85%', backgroundColor: '#F59E0B' }]} />
                  </View>
                  <Text style={[styles.statProgressText, { color: colors.textSecondary }]}>85%</Text>
                </View>
              </LinearGradient>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <LinearGradient
                colors={['rgba(168, 85, 247, 0.1)', 'rgba(147, 51, 234, 0.05)']}
                style={styles.statCardGradient}
              >
                <View style={[styles.statIconContainer, { backgroundColor: '#A855F7' + '15' }]}>
                  <Award size={20} color="#A855F7" />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>{statsLoading ? '...' : stats?.weeklyPersonalRecords ?? 0}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>PRs</Text>
                <View style={styles.statProgress}>
                  <View style={[styles.statProgressBar, { backgroundColor: colors.border }]}>
                    <View style={[styles.statProgressFill, { width: '40%', backgroundColor: '#A855F7' }]} />
                  </View>
                  <Text style={[styles.statProgressText, { color: colors.textSecondary }]}>40%</Text>
                </View>
              </LinearGradient>
            </View>
          </View>
        </Animated.View>

        {/* Action Cards */}
        <Animated.View 
          style={[
            styles.actionCardsSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Access</Text>
          
          <View style={styles.actionCardsGrid}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.card }]}
              onPress={() => router.push('/fitness/workout-history')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['rgba(16, 185, 129, 0.1)', 'rgba(5, 150, 105, 0.05)']}
                style={styles.actionCardGradient}
              >
                <View style={[styles.actionCardIcon, { backgroundColor: '#10B981' + '15' }]}>
                  <History size={24} color="#10B981" />
                </View>
                <Text style={[styles.actionCardTitle, { color: colors.text }]}>Workout History</Text>
                <Text style={[styles.actionCardSubtitle, { color: colors.textSecondary }]}>View past workouts</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.card }]}
              onPress={() => router.push('/fitness/workout-tracker')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['rgba(59, 130, 246, 0.1)', 'rgba(37, 99, 235, 0.05)']}
                style={styles.actionCardGradient}
              >
                <View style={[styles.actionCardIcon, { backgroundColor: '#3B82F6' + '15' }]}>
                  <Target size={24} color="#3B82F6" />
                </View>
                <Text style={[styles.actionCardTitle, { color: colors.text }]}>Set Goals</Text>
                <Text style={[styles.actionCardSubtitle, { color: colors.textSecondary }]}>Create workout plans</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Leaderboards Section */}
        <Animated.View 
          style={[
            styles.leaderboardSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.leaderboardHeader}>
            <View style={styles.leaderboardTitleContainer}>
              <Crown size={24} color={colors.tint} />
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Leaderboards</Text>
            </View>
            
            {/* Dropdown for leaderboard type */}
            <TouchableOpacity
              style={[styles.dropdownButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setShowDropdown(true)}
            >
              <Text style={[styles.dropdownText, { color: colors.text }]}>{leaderboardType}</Text>
              <ChevronDown size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Scope Toggle */}
          <View style={styles.scopeToggle}>
            <TouchableOpacity
              style={[
                styles.scopeButton,
                leaderboardScope === 'global' && styles.activeScopeButton,
                { backgroundColor: leaderboardScope === 'global' ? colors.tint : colors.card }
              ]}
              onPress={() => setLeaderboardScope('global')}
            >
              <Globe size={16} color={leaderboardScope === 'global' ? '#fff' : colors.textSecondary} />
              <Text style={[
                styles.scopeButtonText,
                { color: leaderboardScope === 'global' ? '#fff' : colors.textSecondary }
              ]}>Global</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.scopeButton,
                leaderboardScope === 'friends' && styles.activeScopeButton,
                { backgroundColor: leaderboardScope === 'friends' ? colors.tint : colors.card }
              ]}
              onPress={() => setLeaderboardScope('friends')}
            >
              <Users size={16} color={leaderboardScope === 'friends' ? '#fff' : colors.textSecondary} />
              <Text style={[
                styles.scopeButtonText,
                { color: leaderboardScope === 'friends' ? '#fff' : colors.textSecondary }
              ]}>Friends</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.scopeButton,
                leaderboardScope === 'my-gym' && styles.activeScopeButton,
                { backgroundColor: leaderboardScope === 'my-gym' ? colors.tint : colors.card }
              ]}
              onPress={() => setLeaderboardScope('my-gym')}
            >
              <MapPin size={16} color={leaderboardScope === 'my-gym' ? '#fff' : colors.textSecondary} />
              <Text style={[
                styles.scopeButtonText,
                { color: leaderboardScope === 'my-gym' ? '#fff' : colors.textSecondary }
              ]}>My Gym</Text>
            </TouchableOpacity>
          </View>

          {/* Leaderboard List */}
          <View style={styles.leaderboardList}>
            {leaderboardData.length === 0 ? (
              <View style={styles.leaderboardEmpty}>
                <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>No leaderboard data available.</Text>
              </View>
            ) : (
              leaderboardData.map((item, index) => {
                const isTop3 = item.rank <= 3;
                return (
                  <TouchableOpacity
                    key={item.userId || index}
                    style={[
                      styles.leaderboardItem,
                      { backgroundColor: isTop3 ? colors.tint + '10' : colors.card, borderWidth: isTop3 ? 2 : 1, borderColor: isTop3 ? colors.tint : colors.border },
                      item.rank === 1 && styles.leaderboardFirst,
                      item.rank === 2 && styles.leaderboardSecond,
                      item.rank === 3 && styles.leaderboardThird,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => handleProfilePress(item.userId)}
                  >
                    <View style={styles.leaderboardRank}>
                      {item.rank === 1 && <Crown size={16} color="#FFD700" />}
                      {item.rank === 2 && <Medal size={16} color="#C0C0C0" />}
                      {item.rank === 3 && <Medal size={16} color="#CD7F32" />}
                      {item.rank > 3 && (
                        <Text style={[
                          styles.rankNumber,
                          { color: isTop3 ? colors.tint : colors.textSecondary, fontSize: isTop3 ? 18 : 16 }
                        ]}>#{item.rank}</Text>
                      )}
                    </View>
                    <View style={styles.leaderboardAvatarWrap}>
                      {item.avatarUrl ? (
                        <View style={[styles.leaderboardAvatar, { borderColor: isTop3 ? colors.tint : colors.border }]}> 
                          <Image source={{ uri: item.avatarUrl }} style={styles.avatarImage} />
                        </View>
                      ) : (
                        <View style={[styles.leaderboardAvatar, { borderColor: isTop3 ? colors.tint : colors.border }]}> 
                          <Text style={styles.avatarInitials}>{item.name ? item.name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase() : '?'}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.leaderboardInfo}>
                      <Text style={[styles.leaderboardName, { color: isTop3 ? colors.tint : colors.text }]} numberOfLines={1}>{item.name}</Text>
                      <Text style={[styles.leaderboardValue, { color: isTop3 ? colors.tint : colors.textSecondary }]}>{item.value}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </Animated.View>

        {/* Dropdown Modal */}
        <Modal
          visible={showDropdown}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDropdown(false)}
        >
          <TouchableOpacity
            style={styles.dropdownOverlay}
            activeOpacity={1}
            onPress={() => setShowDropdown(false)}
          >
            <View style={[styles.dropdownModal, { backgroundColor: colors.card, borderColor: colors.border, width: dropdownModalWidth }]}
            >
              {leaderboardTypes.map((type, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dropdownOption,
                    index === leaderboardTypes.length - 1 && styles.lastDropdownOption,
                    { borderBottomColor: colors.border }
                  ]}
                  onPress={() => {
                    setLeaderboardType(type);
                    setShowDropdown(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownOptionText,
                    { color: leaderboardType === type ? colors.tint : colors.text }
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </ScrollView>
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
    paddingVertical: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  headerLeft: {
    width: 60,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    width: 60,
    alignItems: 'flex-end',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.light,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  mainCTAContainer: {
    marginBottom: Spacing.xl,
  },
  mainCTA: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.heavy,
  },
  mainCTAGradient: {
    padding: Spacing.xl,
    minHeight: 200,
  },
  mainCTAContent: {
    flex: 1,
  },
  mainCTAHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  mainCTAIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  sparkleContainer: {
    position: 'absolute',
    top: -5,
    right: -5,
  },
  mainCTAStats: {
    alignItems: 'center',
  },
  mainCTAStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  mainCTAStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  mainCTATitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: Spacing.sm,
  },
  mainCTADescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 24,
    marginBottom: Spacing.lg,
  },
  mainCTAFeatures: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  mainCTAFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  mainCTAFeatureText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
  },
  mainCTAButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  mainCTAButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  statsSection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: Spacing.lg,
    letterSpacing: -0.3,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.light,
  },
  statCardGradient: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: Spacing.sm,
  },
  statProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    width: '100%',
  },
  statProgressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  statProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  statProgressText: {
    fontSize: 10,
    fontWeight: '600',
    minWidth: 25,
  },
  actionCardsSection: {
    marginBottom: Spacing.xl,
  },
  actionCardsGrid: {
    gap: Spacing.md,
  },
  actionCard: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.light,
  },
  actionCardGradient: {
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  actionCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  actionCardSubtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  leaderboardSection: {
    marginBottom: Spacing.xl,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  leaderboardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
    minWidth: 140,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  scopeToggle: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    gap: 2,
  },
  scopeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  activeScopeButton: {
    // Additional styles for active state handled by backgroundColor
  },
  scopeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  leaderboardList: {
    gap: Spacing.sm,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    ...Shadows.light,
  },
  leaderboardRank: {
    width: 40,
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  leaderboardAvatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.md,
  },
  leaderboardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  avatarInitials: {
    fontSize: 20,
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  leaderboardValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  leaderboardEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leaderboardFirst: {
    borderTopWidth: 2,
  },
  leaderboardSecond: {
    borderTopWidth: 2,
    borderBottomWidth: 2,
  },
  leaderboardThird: {
    borderTopWidth: 2,
    borderBottomWidth: 2,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  dropdownModal: {
    borderRadius: BorderRadius.lg,
    ...Shadows.heavy,
  },
  dropdownOption: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
  },
  lastDropdownOption: {
    borderBottomWidth: 0,
  },
  dropdownOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
});