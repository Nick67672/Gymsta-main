import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';

interface WorkoutDay {
  date: string;
  intensity: 'none' | 'low' | 'medium' | 'high' | 'extreme';
  volume?: number;
  duration?: number;
  exercises?: string[];
}

interface WorkoutHeatMapProps {
  workoutData: WorkoutDay[];
  onDayPress?: (day: WorkoutDay) => void;
  showLabels?: boolean;
}

export const WorkoutHeatMap: React.FC<WorkoutHeatMapProps> = ({
  workoutData,
  onDayPress,
  showLabels = true,
}) => {
  const { theme } = useTheme();
  const colors = Colors[theme];

  const getIntensityColor = (intensity: string, alpha = 1) => {
    const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
    switch (intensity) {
      case 'none': return colors.backgroundSecondary;
      case 'low': return colors.intensityLow + alphaHex;
      case 'medium': return colors.intensityMedium + alphaHex;
      case 'high': return colors.intensityHigh + alphaHex;
      case 'extreme': return colors.intensityExtreme + alphaHex;
      default: return colors.backgroundSecondary;
    }
  };

  // Generate calendar grid (52 weeks x 7 days)
  const calendarData = useMemo(() => {
    const today = new Date();
    const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    
    const weeks = [];
    const currentDate = new Date(oneYearAgo);
    
    // Start from the beginning of the week
    currentDate.setDate(currentDate.getDate() - currentDate.getDay());
    
    for (let week = 0; week < 53; week++) {
      const weekData = [];
      for (let day = 0; day < 7; day++) {
        const dateString = currentDate.toISOString().split('T')[0];
        const workoutDay = workoutData.find(w => w.date === dateString);
        
        weekData.push({
          date: dateString,
          intensity: workoutDay?.intensity || 'none',
          volume: workoutDay?.volume,
          duration: workoutDay?.duration,
          exercises: workoutDay?.exercises,
          isToday: dateString === today.toISOString().split('T')[0],
          isCurrentMonth: currentDate.getMonth() === today.getMonth(),
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeks.push(weekData);
    }
    
    return weeks;
  }, [workoutData]);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
      <View style={styles.heatMap}>
        {/* Month labels */}
        {showLabels && (
          <View style={styles.monthLabels}>
            {months.map((month, index) => (
              <Text
                key={month}
                style={[
                  styles.monthLabel,
                  { color: colors.textSecondary },
                  { left: index * (52 / 12) * 14 } // Approximate positioning
                ]}
              >
                {month}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.calendarContainer}>
          {/* Day labels */}
          {showLabels && (
            <View style={styles.dayLabels}>
              {days.map((day, index) => (
                <Text
                  key={day}
                  style={[
                    styles.dayLabel,
                    { color: colors.textSecondary },
                    index % 2 === 0 && styles.dayLabelVisible
                  ]}
                >
                  {index % 2 === 0 ? day : ''}
                </Text>
              ))}
            </View>
          )}

          {/* Calendar grid */}
          <View style={styles.calendar}>
            {calendarData.map((week, weekIndex) => (
              <View key={weekIndex} style={styles.week}>
                {week.map((day, dayIndex) => (
                  <TouchableOpacity
                    key={`${weekIndex}-${dayIndex}`}
                    style={[
                      styles.day,
                      {
                        backgroundColor: getIntensityColor(day.intensity),
                        borderColor: day.isToday ? colors.tint : 'transparent',
                        borderWidth: day.isToday ? 2 : 0,
                      },
                    ]}
                    onPress={() => onDayPress?.(day)}
                    activeOpacity={0.7}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>

        {/* Legend */}
        {showLabels && (
          <View style={styles.legend}>
            <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>Less</Text>
            <View style={styles.legendColors}>
              {['none', 'low', 'medium', 'high', 'extreme'].map((intensity) => (
                <View
                  key={intensity}
                  style={[
                    styles.legendColor,
                    { backgroundColor: getIntensityColor(intensity) }
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>More</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heatMap: {
    padding: 16,
  },
  monthLabels: {
    height: 20,
    marginBottom: 8,
    position: 'relative',
  },
  monthLabel: {
    position: 'absolute',
    fontSize: 12,
    fontWeight: '500',
  },
  calendarContainer: {
    flexDirection: 'row',
  },
  dayLabels: {
    width: 20,
    marginRight: 8,
  },
  dayLabel: {
    height: 12,
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 2,
  },
  dayLabelVisible: {
    // Only show every other day label to avoid crowding
  },
  calendar: {
    flexDirection: 'row',
  },
  week: {
    flexDirection: 'column',
    marginRight: 2,
  },
  day: {
    width: 12,
    height: 12,
    marginBottom: 2,
    borderRadius: 2,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  legendColors: {
    flexDirection: 'row',
    gap: 2,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
}); 