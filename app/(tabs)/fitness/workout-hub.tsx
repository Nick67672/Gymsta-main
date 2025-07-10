import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Image } from 'react-native';
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
  ChevronDown
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/Spacing';
import { useWorkoutStats } from '@/hooks/useWorkoutStats';
import { useLeaderboard } from '@/hooks/useLeaderboard';

export default function WorkoutHubScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { stats, loading: statsLoading } = useWorkoutStats();
  
  // Leaderboard state
  const [leaderboardScope, setLeaderboardScope] = useState<'global' | 'friends' | 'my-gym'>('global');
  const [leaderboardType, setLeaderboardType] = useState('Weekly Volume');
  const [showDropdown, setShowDropdown] = useState(false);
  
  const { data: leaderboardData, loading: leaderboardLoading } = useLeaderboard(leaderboardScope, leaderboardType as any);

  const leaderboardTypes = [
    'Weekly Volume',
    'Bench Press',
    'Squat',
    'Deadlift',
    'Highest Streak'
  ];

  // Example usage: router.push(`/profile/${userId}`)
  const handleProfilePress = (userId: string) => {
    if (userId) {
      router.push(`/profile/${userId}`);
    }
  };

  const navigateToWorkoutTracker = () => {
    router.push('/fitness/workout-tracker');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
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
            Track your fitness journey
          </Text>
        </View>
        <View style={styles.headerRight}>
          {/* Empty space for balance */}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main Feature - Workout Tracker */}
        <View style={styles.mainSection}>
          <TouchableOpacity
            style={[styles.mainCard, { backgroundColor: colors.tint }]}
            onPress={navigateToWorkoutTracker}
            activeOpacity={0.9}
          >
            <View style={styles.mainCardContent}>
              <View style={styles.mainCardHeader}>
                <View style={styles.mainIconContainer}>
                  <Dumbbell size={32} color="#fff" />
                </View>
                <ChevronRight size={24} color="#fff" style={styles.mainNavArrow} />
              </View>
              
              <Text style={styles.mainCardTitle}>Workout Tracker</Text>
              <Text style={styles.mainCardDescription}>
                Plan, track, and analyze your workouts with our comprehensive fitness tracker
              </Text>
            
              <View style={styles.mainFeatures}>
                <View style={styles.mainFeatureItem}>
                  <Calendar size={16} color="#fff" />
                  <Text style={styles.mainFeatureText}>Calendar Planning</Text>
                </View>
                <View style={styles.mainFeatureItem}>
                  <TrendingUp size={16} color="#fff" />
                  <Text style={styles.mainFeatureText}>Progress Analytics</Text>
                </View>
                <View style={styles.mainFeatureItem}>
                  <Target size={16} color="#fff" />
                  <Text style={styles.mainFeatureText}>Volume Tracking</Text>
                </View>
              </View>
            </View>
            </TouchableOpacity>
        </View>

        {/* Quick Stats Section */}
        <View style={styles.statsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Stats</Text>
          
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <View style={[styles.statIconContainer, { backgroundColor: colors.tint + '15' }]}>
                <Play size={20} color={colors.tint} />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{statsLoading ? '...' : stats?.weeklyWorkouts ?? 0}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Workouts This Week</Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <View style={[styles.statIconContainer, { backgroundColor: '#4CAF50' + '15' }]}>
                <BarChart3 size={20} color="#4CAF50" />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{statsLoading ? '...' : `${(stats?.totalVolume ?? 0).toFixed(0)}kg`}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Volume</Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <View style={[styles.statIconContainer, { backgroundColor: '#FF9800' + '15' }]}>
                <Clock size={20} color="#FF9800" />
          </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{statsLoading ? '...' : `${stats?.averageDuration ?? 0}min`}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg Duration</Text>
        </View>

            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <View style={[styles.statIconContainer, { backgroundColor: '#9C27B0' + '15' }]}>
                <Award size={20} color="#9C27B0" />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{statsLoading ? '...' : stats?.personalRecords ?? 0}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Personal Records</Text>
            </View>
          </View>
        </View>

        {/* Leaderboards Section */}
        <View style={styles.leaderboardSection}>
          <View style={styles.leaderboardHeader}>
            <View style={styles.leaderboardTitleContainer}>
              <Trophy size={24} color={colors.tint} />
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
              <View style={styles.leaderboardEmpty}><Text style={{ color: colors.textSecondary, textAlign: 'center' }}>No leaderboard data available.</Text></View>
            ) : (
              leaderboardData.map((item, index) => {
                const isTop3 = item.rank <= 3;
                return (
                  <TouchableOpacity
                    key={item.userId || index}
                    style={[
                      styles.leaderboardItem,
                      { backgroundColor: isTop3 ? colors.tint + '10' : colors.card, borderWidth: isTop3 ? 2 : 1, borderColor: isTop3 ? colors.tint : colors.border, shadowColor: isTop3 ? colors.tint : colors.shadow },
                      item.rank === 1 && styles.leaderboardFirst,
                      item.rank === 2 && styles.leaderboardSecond,
                      item.rank === 3 && styles.leaderboardThird,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => handleProfilePress(item.userId)}
                  >
                    <View style={styles.leaderboardRank}>
                      <Text style={[
                        styles.rankNumber,
                        { color: isTop3 ? colors.tint : colors.textSecondary, fontSize: isTop3 ? 22 : 16 }
                      ]}>#{item.rank}</Text>
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
        </View>

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
            <View style={[styles.dropdownModal, { backgroundColor: colors.card }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  mainSection: {
    marginBottom: Spacing.xl,
  },
  mainCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    ...Shadows.heavy,
    minHeight: 200,
  },
  mainCardContent: {
    flex: 1,
  },
  mainCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  mainIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainNavArrow: {
    opacity: 0.8,
  },
  mainCardTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: Spacing.sm,
  },
  mainCardDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 24,
    marginBottom: Spacing.lg,
  },
  mainFeatures: {
    gap: Spacing.md,
  },
  mainFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  mainFeatureText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
  },
  statsSection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: Spacing.lg,
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
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadows.light,
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
  },
  // Leaderboard styles
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
  // Dropdown modal styles
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
    minWidth: 200,
    maxWidth: 300,
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