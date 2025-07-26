import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Zap,
  Award,
  Activity,
  BarChart3,
} from 'lucide-react-native';

interface RestAnalyticsData {
  averageRestTime: number;
  optimalRestTime: number;
  restConsistency: number;
  performanceCorrelation: number;
  exerciseBreakdown: Array<{
    exerciseName: string;
    averageRest: number;
    optimalRest: number;
    performanceImprovement: number;
  }>;
  weeklyTrends: Array<{
    date: string;
    averageRest: number;
    performance: number;
  }>;
  skipRate: number;
  totalSessions: number;
}

interface RestAnalyticsProps {
  timeRange?: '7d' | '30d' | '90d' | 'all';
  exerciseFilter?: string;
  showDetailedView?: boolean;
}

export const RestAnalytics: React.FC<RestAnalyticsProps> = ({
  timeRange = '30d',
  exerciseFilter,
  showDetailedView = false,
}) => {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { user } = useAuth();
  const screenWidth = Dimensions.get('window').width;

  const [analytics, setAnalytics] = useState<RestAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<'rest' | 'performance' | 'consistency'>('rest');

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user, timeRange, exerciseFilter]);

  const loadAnalytics = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get date range
      let dateFilter = '';
      switch (timeRange) {
        case '7d':
          dateFilter = `AND created_at > NOW() - INTERVAL '7 days'`;
          break;
        case '30d':
          dateFilter = `AND created_at > NOW() - INTERVAL '30 days'`;
          break;
        case '90d':
          dateFilter = `AND created_at > NOW() - INTERVAL '90 days'`;
          break;
        default:
          dateFilter = '';
      }

      // Base query
      let query = supabase
        .from('rest_time_analytics')
        .select('*')
        .eq('user_id', user.id);

      if (exerciseFilter) {
        query = query.eq('exercise_name', exerciseFilter);
      }

      const { data: rawData, error } = await query;

      if (error) throw error;

      if (!rawData || rawData.length === 0) {
        setAnalytics({
          averageRestTime: 90,
          optimalRestTime: 90,
          restConsistency: 0,
          performanceCorrelation: 0,
          exerciseBreakdown: [],
          weeklyTrends: [],
          skipRate: 0,
          totalSessions: 0,
        });
        setLoading(false);
        return;
      }

      // Calculate analytics
      const totalSessions = rawData.length;
      const averageRestTime = rawData.reduce((sum, item) => sum + item.actual_rest_time, 0) / totalSessions;
      const skipRate = rawData.filter(item => item.was_skipped).length / totalSessions;

      // Calculate rest consistency (standard deviation)
      const restTimes = rawData.map(item => item.actual_rest_time);
      const variance = restTimes.reduce((sum, time) => sum + Math.pow(time - averageRestTime, 2), 0) / totalSessions;
      const restConsistency = 1 - (Math.sqrt(variance) / averageRestTime); // Normalized consistency score

      // Exercise breakdown
      const exerciseGroups = rawData.reduce((groups, item) => {
        if (!groups[item.exercise_name]) {
          groups[item.exercise_name] = [];
        }
        groups[item.exercise_name].push(item);
        return groups;
      }, {} as Record<string, typeof rawData>);

      const exerciseBreakdown = Object.entries(exerciseGroups).map(([exerciseName, exercises]) => {
        const avgRest = exercises.reduce((sum, e) => sum + e.actual_rest_time, 0) / exercises.length;
        const avgSuggested = exercises.reduce((sum, e) => sum + e.suggested_rest_time, 0) / exercises.length;
        const performanceData = exercises.filter(e => e.performance_after_rest);
        const avgPerformance = performanceData.length > 0 
          ? performanceData.reduce((sum, e) => sum + e.performance_after_rest, 0) / performanceData.length 
          : 0;
        
        return {
          exerciseName,
          averageRest: Math.round(avgRest),
          optimalRest: Math.round(avgSuggested),
          performanceImprovement: avgPerformance,
        };
      });

      // Weekly trends
      const weeklyData = rawData.reduce((weeks, item) => {
        const date = new Date(item.created_at).toISOString().split('T')[0];
        if (!weeks[date]) {
          weeks[date] = { restTimes: [], performances: [] };
        }
        weeks[date].restTimes.push(item.actual_rest_time);
        if (item.performance_after_rest) {
          weeks[date].performances.push(item.performance_after_rest);
        }
        return weeks;
      }, {} as Record<string, { restTimes: number[], performances: number[] }>);

      const weeklyTrends = Object.entries(weeklyData)
        .map(([date, data]) => ({
          date,
          averageRest: data.restTimes.reduce((sum, time) => sum + time, 0) / data.restTimes.length,
          performance: data.performances.length > 0 
            ? data.performances.reduce((sum, perf) => sum + perf, 0) / data.performances.length 
            : 0,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-14); // Last 14 days

      // Calculate performance correlation
      const validEntries = rawData.filter(item => item.performance_after_rest);
      let performanceCorrelation = 0;
      if (validEntries.length > 1) {
        // Simple correlation calculation between rest time and performance
        const restMean = validEntries.reduce((sum, item) => sum + item.actual_rest_time, 0) / validEntries.length;
        const perfMean = validEntries.reduce((sum, item) => sum + item.performance_after_rest, 0) / validEntries.length;
        
        const numerator = validEntries.reduce((sum, item) => 
          sum + (item.actual_rest_time - restMean) * (item.performance_after_rest - perfMean), 0);
        const denominator = Math.sqrt(
          validEntries.reduce((sum, item) => sum + Math.pow(item.actual_rest_time - restMean, 2), 0) *
          validEntries.reduce((sum, item) => sum + Math.pow(item.performance_after_rest - perfMean, 2), 0)
        );
        
        performanceCorrelation = denominator !== 0 ? numerator / denominator : 0;
      }

      setAnalytics({
        averageRestTime: Math.round(averageRestTime),
        optimalRestTime: Math.round(averageRestTime * 1.1), // Simplified optimal calculation
        restConsistency: Math.max(0, Math.min(1, restConsistency)),
        performanceCorrelation,
        exerciseBreakdown,
        weeklyTrends,
        skipRate,
        totalSessions,
      });
    } catch (error) {
      console.error('Error loading rest analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    if (secs === 0) return `${mins}m`;
    return `${mins}m ${secs}s`;
  };

  const getInsightColor = (value: number, type: 'performance' | 'consistency' | 'correlation') => {
    switch (type) {
      case 'performance':
        return value > 0.1 ? colors.success : value < -0.1 ? colors.error : colors.warning;
      case 'consistency':
        return value > 0.8 ? colors.success : value > 0.6 ? colors.warning : colors.error;
      case 'correlation':
        return Math.abs(value) > 0.3 ? colors.success : colors.warning;
      default:
        return colors.text;
    }
  };

  const getInsightIcon = (value: number, type: 'performance' | 'consistency' | 'correlation') => {
    switch (type) {
      case 'performance':
        return value > 0.1 ? <TrendingUp size={16} color={colors.success} /> : 
               value < -0.1 ? <TrendingDown size={16} color={colors.error} /> : 
               <Activity size={16} color={colors.warning} />;
      case 'consistency':
        return value > 0.8 ? <Target size={16} color={colors.success} /> : 
               <Activity size={16} color={colors.warning} />;
      case 'correlation':
        return Math.abs(value) > 0.3 ? <Award size={16} color={colors.success} /> : 
               <BarChart3 size={16} color={colors.warning} />;
      default:
        return <Clock size={16} color={colors.text} />;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading analytics...</Text>
      </View>
    );
  }

  if (!analytics) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
          No rest data available yet. Complete some workouts to see analytics!
        </Text>
      </View>
    );
  }

  const chartConfig = {
    backgroundColor: colors.card,
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `${colors.tint}${Math.round(opacity * 255).toString(16)}`,
    labelColor: (opacity = 1) => `${colors.text}${Math.round(opacity * 255).toString(16)}`,
    style: {
      borderRadius: 16,
    },
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Stats */}
      <View style={styles.headerStats}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <View style={styles.statHeader}>
            <Clock size={20} color={colors.tint} />
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg Rest</Text>
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {formatTime(analytics.averageRestTime)}
          </Text>
          <Text style={[styles.statSubtext, { color: colors.textSecondary }]}>
            {analytics.totalSessions} sessions
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <View style={styles.statHeader}>
            <Target size={20} color={colors.success} />
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Consistency</Text>
          </View>
          <Text style={[styles.statValue, { color: getInsightColor(analytics.restConsistency, 'consistency') }]}>
            {Math.round(analytics.restConsistency * 100)}%
          </Text>
          <Text style={[styles.statSubtext, { color: colors.textSecondary }]}>
            {analytics.skipRate > 0.1 ? `${Math.round(analytics.skipRate * 100)}% skipped` : 'Good adherence'}
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <View style={styles.statHeader}>
            {getInsightIcon(analytics.performanceCorrelation, 'correlation')}
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Impact</Text>
          </View>
          <Text style={[styles.statValue, { color: getInsightColor(analytics.performanceCorrelation, 'correlation') }]}>
            {analytics.performanceCorrelation > 0 ? '+' : ''}{Math.round(analytics.performanceCorrelation * 100)}%
          </Text>
          <Text style={[styles.statSubtext, { color: colors.textSecondary }]}>
            Rest vs Performance
          </Text>
        </View>
      </View>

      {/* Chart Section */}
      {analytics.weeklyTrends.length > 0 && (
        <View style={[styles.chartSection, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Rest Time Trends</Text>
          <LineChart
            data={{
              labels: analytics.weeklyTrends.slice(-7).map(trend => 
                new Date(trend.date).toLocaleDateString('en-US', { weekday: 'short' })
              ),
              datasets: [{
                data: analytics.weeklyTrends.slice(-7).map(trend => trend.averageRest),
                color: (opacity = 1) => `${colors.tint}${Math.round(opacity * 255).toString(16)}`,
                strokeWidth: 3,
              }],
            }}
            width={screenWidth - 48}
            height={200}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>
      )}

      {/* Exercise Breakdown */}
      {analytics.exerciseBreakdown.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Exercise Breakdown</Text>
          {analytics.exerciseBreakdown.slice(0, 5).map((exercise, index) => (
            <View key={index} style={styles.exerciseRow}>
              <View style={styles.exerciseInfo}>
                <Text style={[styles.exerciseName, { color: colors.text }]}>{exercise.exerciseName}</Text>
                <Text style={[styles.exerciseStats, { color: colors.textSecondary }]}>
                  Avg: {formatTime(exercise.averageRest)} • Optimal: {formatTime(exercise.optimalRest)}
                </Text>
              </View>
              <View style={styles.exerciseMetrics}>
                {exercise.performanceImprovement > 0 && (
                  <View style={styles.performanceIndicator}>
                    <TrendingUp size={14} color={colors.success} />
                    <Text style={[styles.performanceText, { color: colors.success }]}>
                      +{exercise.performanceImprovement.toFixed(1)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Insights */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Insights & Recommendations</Text>
        
        {analytics.restConsistency < 0.7 && (
          <View style={[styles.insight, { backgroundColor: colors.warning + '20', borderLeftColor: colors.warning }]}>
            <Activity size={16} color={colors.warning} />
            <View style={styles.insightText}>
              <Text style={[styles.insightTitle, { color: colors.text }]}>Inconsistent Rest Times</Text>
              <Text style={[styles.insightDescription, { color: colors.textSecondary }]}>
                Try to stick closer to your planned rest times for better training consistency.
              </Text>
            </View>
          </View>
        )}

        {analytics.skipRate > 0.2 && (
          <View style={[styles.insight, { backgroundColor: colors.error + '20', borderLeftColor: colors.error }]}>
            <Zap size={16} color={colors.error} />
            <View style={styles.insightText}>
              <Text style={[styles.insightTitle, { color: colors.text }]}>High Skip Rate</Text>
              <Text style={[styles.insightDescription, { color: colors.textSecondary }]}>
                You're skipping rest {Math.round(analytics.skipRate * 100)}% of the time. Consider shorter default times.
              </Text>
            </View>
          </View>
        )}

        {analytics.performanceCorrelation > 0.3 && (
          <View style={[styles.insight, { backgroundColor: colors.success + '20', borderLeftColor: colors.success }]}>
            <Award size={16} color={colors.success} />
            <View style={styles.insightText}>
              <Text style={[styles.insightTitle, { color: colors.text }]}>Rest Time Helps Performance</Text>
              <Text style={[styles.insightDescription, { color: colors.textSecondary }]}>
                Longer rest periods are positively correlated with your performance. Keep it up!
              </Text>
            </View>
          </View>
        )}

        {analytics.averageRestTime < 60 && (
          <View style={[styles.insight, { backgroundColor: colors.tint + '20', borderLeftColor: colors.tint }]}>
            <Clock size={16} color={colors.tint} />
            <View style={styles.insightText}>
              <Text style={[styles.insightTitle, { color: colors.text }]}>Short Rest Periods</Text>
              <Text style={[styles.insightDescription, { color: colors.textSecondary }]}>
                Your average rest is {formatTime(analytics.averageRestTime)}. Consider longer rest for strength exercises.
              </Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 32,
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 32,
    paddingHorizontal: 32,
  },
  
  // Header Stats
  headerStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statSubtext: {
    fontSize: 10,
    textAlign: 'center',
  },

  // Chart Section
  chartSection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  chart: {
    borderRadius: 8,
  },

  // Sections
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },

  // Exercise Breakdown
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  exerciseStats: {
    fontSize: 12,
  },
  exerciseMetrics: {
    alignItems: 'flex-end',
  },
  performanceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  performanceText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Insights
  insight: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    marginBottom: 8,
    gap: 12,
  },
  insightText: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  insightDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
}); 