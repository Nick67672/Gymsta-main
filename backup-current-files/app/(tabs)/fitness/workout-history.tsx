import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { 
  ChevronLeft, 
  Calendar, 
  Dumbbell, 
  TrendingUp, 
  Clock,
  Target,
  Award,
  BarChart3,
  Filter,
  ChevronDown
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/Spacing';

interface WorkoutData {
  id: string;
  date: string;
  name: string | null;
  exercises: any[];
  total_volume: number | null;
  duration_minutes: number | null;
  is_completed: boolean;
  notes: string | null;
  created_at: string;
}

interface ExerciseData {
  name: string;
  sets: Array<{
    reps: number;
    weight: number;
    completed?: boolean;
  }>;
}

export default function WorkoutHistoryScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const colors = Colors[theme];

  const [workouts, setWorkouts] = useState<WorkoutData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'planned'>('all');
  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | '3months' | 'year' | 'all'>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  useEffect(() => {
    if (user) {
      loadWorkouts();
    }
  }, [user, filter, timeFilter]);

  const loadWorkouts = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      // Apply completion filter
      if (filter === 'completed') {
        query = query.eq('is_completed', true);
      } else if (filter === 'planned') {
        query = query.eq('is_completed', false);
      }

      // Apply time filter
      if (timeFilter !== 'all') {
        const now = new Date();
        let startDate = new Date();
        
        switch (timeFilter) {
          case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
          case '3months':
            startDate.setMonth(now.getMonth() - 3);
            break;
          case 'year':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        }
        
        query = query.gte('date', startDate.toISOString().split('T')[0]);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setWorkouts(data || []);
    } catch (error) {
      console.error('Error loading workouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateWorkoutStats = (exercises: ExerciseData[]) => {
    let totalSets = 0;
    let totalReps = 0;
    let totalVolume = 0;
    let exerciseCount = 0;

    if (exercises && Array.isArray(exercises)) {
      exerciseCount = exercises.length;
      exercises.forEach((exercise) => {
        if (exercise && exercise.sets && Array.isArray(exercise.sets)) {
          exercise.sets.forEach((set) => {
            if (set) {
              totalSets++;
              totalReps += Number(set.reps) || 0;
              totalVolume += (Number(set.reps) || 0) * (Number(set.weight) || 0);
            }
          });
        }
      });
    }

    return { totalSets, totalReps, totalVolume, exerciseCount };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const renderWorkoutCard = (workout: WorkoutData, index: number) => {
    const stats = calculateWorkoutStats(workout.exercises || []);
    const isCompleted = workout.is_completed;
    
    return (
      <View key={workout.id} style={styles.timelineItem}>
        {/* Timeline connector */}
        <View style={styles.timelineConnector}>
          <View style={[
            styles.timelineDot, 
            { 
              backgroundColor: isCompleted ? colors.tint : colors.border,
              borderColor: isCompleted ? colors.tint : colors.textSecondary 
            }
          ]}>
            {isCompleted ? (
              <Award size={12} color="#fff" />
            ) : (
              <Clock size={12} color={colors.textSecondary} />
            )}
          </View>
          {index < workouts.length - 1 && (
            <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
          )}
        </View>

        {/* Workout Card */}
        <TouchableOpacity 
          style={[
            styles.workoutCard, 
            { 
              backgroundColor: colors.card,
              borderColor: isCompleted ? colors.tint + '20' : colors.border,
              borderWidth: isCompleted ? 2 : 1
            }
          ]}
          activeOpacity={0.8}
        >
          <View style={styles.workoutHeader}>
            <View style={styles.workoutTitleSection}>
              <Text style={[styles.workoutName, { color: colors.text }]}>
                {workout.name && typeof workout.name === 'string' ? workout.name : 'Untitled Workout'}
              </Text>
              <Text style={[styles.workoutDate, { color: colors.textSecondary }]}>
                {formatDate(workout.date)}
              </Text>
            </View>
            <View style={[
              styles.statusBadge, 
              { backgroundColor: isCompleted ? colors.tint + '15' : colors.border + '50' }
            ]}>
              <Text style={[
                styles.statusText, 
                { color: isCompleted ? colors.tint : colors.textSecondary }
              ]}>
                {isCompleted ? 'Completed' : 'Planned'}
              </Text>
            </View>
          </View>

          {/* Exercise List Preview */}
          {workout.exercises && Array.isArray(workout.exercises) && workout.exercises.length > 0 && (
            <View style={styles.exercisePreview}>
              <Text style={[styles.exercisePreviewTitle, { color: colors.text }]}>
                Exercises ({stats.exerciseCount})
              </Text>
              <View style={styles.exerciseList}>
                {workout.exercises.slice(0, 3).map((exercise: ExerciseData, idx: number) => (
                  <View key={idx} style={styles.exerciseItem}>
                    <View style={[styles.exerciseDot, { backgroundColor: colors.tint }]} />
                    <Text style={[styles.exerciseName, { color: colors.textSecondary }]} numberOfLines={1}>
                      {exercise?.name || 'Unknown Exercise'} ({exercise?.sets?.length || 0} sets)
                    </Text>
                  </View>
                ))}
                {workout.exercises.length > 3 && (
                  <Text style={[styles.moreExercises, { color: colors.textSecondary }]}>
                    +{workout.exercises.length - 3} more
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Workout Stats */}
          <View style={styles.workoutStats}>
            <View style={styles.statItem}>
              <BarChart3 size={16} color={colors.tint} />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {stats.totalVolume.toFixed(0)}kg
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Volume</Text>
            </View>
            
            <View style={styles.statItem}>
              <Target size={16} color="#4CAF50" />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {stats.totalSets}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sets</Text>
            </View>
            
            {workout.duration_minutes && (
              <View style={styles.statItem}>
                <Clock size={16} color="#FF9800" />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {workout.duration_minutes}m
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Duration</Text>
              </View>
            )}
          </View>

          {workout.notes && typeof workout.notes === 'string' && (
            <View style={styles.notesSection}>
              <Text style={[styles.notesText, { color: colors.textSecondary }]} numberOfLines={2}>
                "{workout.notes}"
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading your workout history...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.card }]}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: colors.text }]}>Workout History</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {Array.isArray(workouts) ? workouts.length : 0} workout{(Array.isArray(workouts) ? workouts.length : 0) !== 1 ? 's' : ''} found
          </Text>
        </View>
        
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: colors.card }]}
          onPress={() => setShowFilterDropdown(!showFilterDropdown)}
        >
          <Filter size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Filter Dropdown */}
      {showFilterDropdown && (
        <View style={[styles.filterDropdown, { backgroundColor: colors.card }]}>
          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: colors.text }]}>Status:</Text>
            <View style={styles.filterOptions}>
              {['all', 'completed', 'planned'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.filterOption,
                    filter === option && { backgroundColor: colors.tint }
                  ]}
                  onPress={() => setFilter(option as any)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    { color: filter === option ? '#fff' : colors.textSecondary }
                  ]}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: colors.text }]}>Time:</Text>
            <View style={styles.filterOptions}>
              {[
                { key: 'week', label: '1W' },
                { key: 'month', label: '1M' },
                { key: '3months', label: '3M' },
                { key: 'year', label: '1Y' },
                { key: 'all', label: 'All' }
              ].map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.filterOption,
                    timeFilter === option.key && { backgroundColor: colors.tint }
                  ]}
                  onPress={() => setTimeFilter(option.key as any)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    { color: timeFilter === option.key ? '#fff' : colors.textSecondary }
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Workout Timeline */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!Array.isArray(workouts) || workouts.length === 0 ? (
          <View style={styles.emptyState}>
            <Dumbbell size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No workouts found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Start tracking your workouts to see them here
            </Text>
          </View>
        ) : (
          <View style={styles.timeline}>
            {workouts.map((workout, index) => renderWorkoutCard(workout, index))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.light,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: Spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.light,
  },
  filterDropdown: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.light,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    width: 60,
  },
  filterOptions: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  filterOption: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'transparent',
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  timeline: {
    paddingBottom: Spacing.xl,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  timelineConnector: {
    alignItems: 'center',
    marginRight: Spacing.lg,
    width: 24,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: Spacing.sm,
  },
  workoutCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.light,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  workoutTitleSection: {
    flex: 1,
  },
  workoutName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  workoutDate: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  exercisePreview: {
    marginBottom: Spacing.md,
  },
  exercisePreviewTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  exerciseList: {
    gap: Spacing.xs,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  exerciseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  exerciseName: {
    fontSize: 14,
    flex: 1,
  },
  moreExercises: {
    fontSize: 12,
    fontStyle: 'italic',
    marginLeft: 18,
  },
  workoutStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  statItem: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  notesSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  notesText: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 3,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingText: {
    fontSize: 16,
    marginTop: Spacing.md,
  },
}); 