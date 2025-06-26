import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal } from 'react-native';
import { 
  ArrowLeft, 
  User, 
  Plus, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  BarChart3, 
  Copy,
  Zap,
  Target,
  Clock,
  Flame,
  Edit3
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/Spacing';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedButton } from '../../../components/ThemedButton';

interface WorkoutDay {
  date: number;
  hasWorkout: boolean;
  isPlanned: boolean;
  workoutType?: string;
  duration?: string;
  calories?: number;
}

interface WorkoutHistoryItem {
  date: string;
  workoutType: string;
  exercises: string[];
  duration: string;
  notes?: string;
}

export default function WorkoutHubScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [plannedWorkouts, setPlannedWorkouts] = useState<{[key: number]: string}>({});
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Get today's date
  const today = new Date().getDate();
  const todayWorkout = plannedWorkouts[today] ? {
    date: 'Today',
    workoutType: plannedWorkouts[today],
    isPlanned: true
  } : null;

  // Real workout history would come from your database - starting empty
  const workoutHistory: WorkoutHistoryItem[] = [];

  const stats = {
    totalWorkouts: 0,
    hoursSpent: 0
  };

  const getCurrentMonth = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[new Date().getMonth()];
  };

  const getDaysInMonth = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const handleDatePress = (date: number) => {
    const existingWorkout = plannedWorkouts[date];
    const today = new Date().getDate();
    
    if (existingWorkout) {
      if (date === today) {
        // If it's today's workout, start it immediately
        handleStartWorkout();
      } else if (date < today) {
        // Past workout - show options to view or remove
        Alert.alert(
          'Past Workout',
          `${existingWorkout} was planned for this day`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', onPress: () => removeWorkout(date), style: 'destructive' }
          ]
        );
      } else {
        // Future workout - show options to start early, edit, or remove
        Alert.alert(
          'Planned Workout',
          `${existingWorkout} is planned for this day`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Start Early', onPress: () => startWorkoutForDate(date) },
            { text: 'Remove', onPress: () => removeWorkout(date), style: 'destructive' }
          ]
        );
      }
    } else {
      // No workout planned - allow planning
      Alert.prompt(
        'Plan Workout',
        'What type of workout would you like to plan?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Plan', onPress: (workoutType) => planWorkout(date, workoutType || 'Workout') }
        ],
        'plain-text',
        '',
        'default'
      );
    }
  };

  const startWorkoutForDate = (date: number) => {
    const workoutType = plannedWorkouts[date];
    Alert.alert('Start Workout', `Starting ${workoutType}!`);
    // Here you would navigate to the actual workout tracker
    // router.push('/fitness/workout-tracker');
  };

  const planWorkout = (date: number, workoutType: string) => {
    setPlannedWorkouts(prev => ({ ...prev, [date]: workoutType }));
  };

  const removeWorkout = (date: number) => {
    setPlannedWorkouts(prev => {
      const updated = { ...prev };
      delete updated[date];
      return updated;
    });
  };

  const handleStartWorkout = () => {
    if (todayWorkout) {
      Alert.alert(
        'Start Workout',
        `Ready to start ${todayWorkout.workoutType}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Start', 
            onPress: () => {
              // Navigate to workout tracker
              // router.push('/fitness/workout-tracker');
              Alert.alert('Workout Started', `${todayWorkout.workoutType} workout has begun!`);
            }
          }
        ]
      );
    }
  };

  const handleQuickAddWorkout = () => {
    Alert.alert('Quick Add Workout', 'Feature coming soon!');
  };

  const handleAddWorkout = () => {
    Alert.alert('Add Workout', 'Workout builder coming soon!');
  };

  const handleCreateWorkout = () => {
    router.push('/fitness/workout-tracker');
  };

  const handleCopyWorkout = (workout: WorkoutHistoryItem) => {
    Alert.alert('Copy Workout', `"${workout.workoutType}" copied to today!`);
  };

  const renderCalendar = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = getDaysInMonth();
    const weeks = [];
    
    // Add day labels
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Create weeks array
    let currentWeek = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      currentWeek.push(null);
    }
    
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push(i);
    }
    
    // Add remaining empty cells for the last week
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);

    return (
      <View style={styles.calendar}>
        <View style={styles.calendarHeader}>
          <Text style={[styles.calendarMonth, { color: colors.text }]}>{getCurrentMonth()} {year}</Text>
        </View>
        
        {/* Day Labels */}
        <View style={styles.dayLabelsRow}>
          {dayLabels.map((label, index) => (
            <View key={index} style={styles.dayLabelContainer}>
              <Text style={[styles.dayLabel, { color: colors.textSecondary }]}>{label}</Text>
            </View>
          ))}
        </View>
        
        {/* Calendar Weeks */}
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.calendarWeek}>
            {week.map((day, dayIndex) => {
              if (day === null) {
                return <View key={dayIndex} style={styles.calendarDay} />;
              }
              
              const hasPlannedWorkout = plannedWorkouts[day];
              const isToday = day === new Date().getDate() && 
                             month === new Date().getMonth() && 
                             year === new Date().getFullYear();
              
              return (
                <TouchableOpacity
                  key={dayIndex}
                  style={[
                    styles.calendarDay,
                    isToday && { backgroundColor: colors.tint + '20' },
                    !isToday && { backgroundColor: colors.backgroundSecondary }
                  ]}
                  onPress={() => handleDatePress(day)}
                >
                  <Text style={[
                    styles.calendarDayText, 
                    { color: isToday ? colors.tint : colors.text }
                  ]}>{day}</Text>
                  {hasPlannedWorkout && (
                    <View style={[
                      styles.workoutDot,
                      { backgroundColor: colors.tint }
                    ]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Workout Hub</Text>
        <TouchableOpacity
          style={[styles.createWorkoutButton, { backgroundColor: colors.tint }]}
          onPress={handleCreateWorkout}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        {/* Today's Workout Card */}
        {todayWorkout ? (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Today's Workout</Text>
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>{todayWorkout.date}</Text>
            
            <View style={[styles.workoutTypeTag, { backgroundColor: colors.tint + '20' }]}>
              <Zap size={16} color={colors.tint} />
              <Text style={[styles.workoutTypeText, { color: colors.tint }]}>{todayWorkout.workoutType}</Text>
            </View>

            <TouchableOpacity
              style={[styles.startWorkoutButton, { backgroundColor: colors.tint }]}
              onPress={handleStartWorkout}
            >
              <Zap size={20} color="#fff" />
              <Text style={styles.startWorkoutButtonText}>Start Workout</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Today's Workout</Text>
            <Text style={[styles.noWorkoutText, { color: colors.textSecondary }]}>
              No workout planned for today. Tap on the calendar to plan one!
            </Text>
          </View>
        )}

        {/* Calendar Card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <CalendarIcon size={20} color={colors.text} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Calendar</Text>
          </View>
          {renderCalendar()}
        </View>

        {/* Stats Card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <BarChart3 size={20} color={colors.text} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Workout Summary</Text>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Target size={24} color={colors.tint} />
              <Text style={[styles.statNumber, { color: colors.text }]}>{stats.totalWorkouts}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Workouts</Text>
            </View>
            <View style={styles.statItem}>
              <Clock size={24} color={colors.tint} />
              <Text style={[styles.statNumber, { color: colors.text }]}>{stats.hoursSpent}h</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Hours Spent</Text>
            </View>
          </View>
        </View>

        {/* Add Workout Section */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Add Workout</Text>
          <View style={styles.addWorkoutSection}>
            <ThemedButton
              title="Create New Workout"
              onPress={() => router.push('/fitness/workout-tracker')}
              variant="primary"
              style={styles.createWorkoutButton}
            />
            <TouchableOpacity
              style={[styles.quickLogButton, { backgroundColor: colors.backgroundSecondary }]}
              onPress={handleQuickAddWorkout}
            >
              <Zap size={20} color={colors.tint} />
              <Text style={[styles.quickLogText, { color: colors.text }]}>Quick Log</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Workout History Card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Workout History</Text>
          
          {workoutHistory.length === 0 ? (
            <Text style={[styles.noWorkoutText, { color: colors.textSecondary }]}>
              No workouts completed yet. Start your first workout!
            </Text>
          ) : (
            workoutHistory.map((workout, index) => (
              <View key={index} style={[styles.historyItem, { borderBottomColor: colors.border }]}>
                <View style={styles.historyHeader}>
                  <Text style={[styles.historyDate, { color: colors.textSecondary }]}>{workout.date}</Text>
                  <Text style={[styles.historyType, { color: colors.text }]}>{workout.workoutType}</Text>
                  <TouchableOpacity
                    style={[styles.copyButton, { backgroundColor: colors.backgroundSecondary }]}
                    onPress={() => handleCopyWorkout(workout)}
                  >
                    <Copy size={16} color={colors.tint} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.historyExercises, { color: colors.textSecondary }]}>
                  {workout.exercises.join(' • ')}
                </Text>
                <Text style={[styles.historyDuration, { color: colors.textSecondary }]}>
                  Duration: {workout.duration}
                </Text>
                {workout.notes && (
                  <Text style={[styles.historyNotes, { color: colors.textSecondary }]}>
                    "{workout.notes}"
                  </Text>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
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
    paddingTop: 60,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  createWorkoutButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  quickAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  quickAddText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.medium,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 16,
    marginBottom: Spacing.sm,
  },
  workoutTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  workoutTypeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  exerciseButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  exerciseButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  exerciseButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  addWorkoutSection: {
    gap: Spacing.sm,
  },
  addWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  addWorkoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  quickLogButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  quickLogText: {
    fontSize: 16,
    fontWeight: '600',
  },
  addWorkoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  startWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  startWorkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noWorkoutText: {
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: Spacing.lg,
  },
  calendar: {
    marginTop: Spacing.sm,
  },
  calendarHeader: {
    marginBottom: Spacing.md,
  },
  calendarMonth: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
  },
  dayLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.sm,
  },
  dayLabelsRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  dayLabelContainer: {
    flex: 1,
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  calendarWeek: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  calendarDay: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginHorizontal: 2,
  },
  calendarDayWithWorkout: {
    // Additional styling for days with workouts
  },
  calendarDayToday: {
    borderWidth: 2,
    borderColor: 'transparent',
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  workoutDot: {
    position: 'absolute',
    bottom: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.lg,
  },
  statItem: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  chartToggle: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  historyItem: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '500',
  },
  historyType: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  copyButton: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  historyExercises: {
    fontSize: 14,
    marginBottom: Spacing.xs,
  },
  historyDuration: {
    fontSize: 12,
    marginBottom: Spacing.xs,
  },
  historyNotes: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  recommendation: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  recommendationText: {
    fontSize: 14,
    fontWeight: '500',
  },
});