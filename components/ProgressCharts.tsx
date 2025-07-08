import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { ChevronDown, TrendingUp, Target, Dumbbell } from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');

interface ProgressData {
  weight: { date: string; value: number }[];
  volume: { date: string; value: number }[];
  streak: number;
  oneRM: { exercise: string; value: number }[];
}

type TimeScale = '7d' | '30d' | '3m' | '1y';

interface ProgressChartsProps {
  data: ProgressData;
  timeScale: TimeScale;
  onTimeScalePress: () => void;
}

export default function ProgressCharts({ data, timeScale, onTimeScalePress }: ProgressChartsProps) {
  const { theme } = useTheme();
  const colors = Colors[theme];

  const chartConfig = {
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    color: (opacity = 1) => {
      // Extract RGB from hex color
      const hex = colors.tint.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    },
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: colors.tint,
    },
    propsForBackgroundLines: {
      strokeDasharray: '', // solid lines
      stroke: colors.text + '20',
    },
  };

  const getTimeScaleLabel = () => {
    switch (timeScale) {
      case '7d': return '7 Days';
      case '30d': return '30 Days';
      case '3m': return '3 Months';
      case '1y': return '1 Year';
      default: return '30 Days';
    }
  };

  const formatChartData = (data: { date: string; value: number }[], maxPoints = 6) => {
    if (data.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{ data: [0] }]
      };
    }

    // Take the last N points for display
    const displayData = data.slice(-maxPoints);
    
    return {
      labels: displayData.map(d => {
        const date = new Date(d.date);
        return timeScale === '7d' || timeScale === '30d' 
          ? date.getDate().toString()
          : `${date.getMonth() + 1}/${date.getDate()}`;
      }),
      datasets: [{
        data: displayData.map(d => d.value),
        color: (opacity = 1) => chartConfig.color(opacity),
        strokeWidth: 2,
      }]
    };
  };

  const renderVolumeChart = () => {
    const chartData = formatChartData(data.volume);
    
    if (data.volume.length === 0) {
      return (
        <View style={styles.emptyChart}>
          <Text style={[styles.emptyText, { color: colors.text }]}>
            Complete some workouts to see your volume progress!
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.chartContainer}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>
          Total Volume (lbs)
        </Text>
        <LineChart
          data={chartData}
          width={screenWidth - 80}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withDots={true}
          withInnerLines={true}
          withOuterLines={true}
          withVerticalLines={true}
          withHorizontalLines={true}
        />
      </View>
    );
  };

  const renderWeightChart = () => {
    const chartData = formatChartData(data.weight);
    
    if (data.weight.length === 0) {
      return null;
    }

    return (
      <View style={styles.chartContainer}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>
          Max Weight (lbs)
        </Text>
        <LineChart
          data={chartData}
          width={screenWidth - 80}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withDots={true}
          withInnerLines={true}
          withOuterLines={true}
          withVerticalLines={true}
          withHorizontalLines={true}
        />
      </View>
    );
  };

  const renderOneRMChart = () => {
    if (data.oneRM.length === 0) {
      return null;
    }

    // Take top 5 exercises by 1RM for display
    const topExercises = data.oneRM
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const chartData = {
      labels: topExercises.map(ex => ex.exercise.substring(0, 8) + (ex.exercise.length > 8 ? '...' : '')),
      datasets: [{
        data: topExercises.map(ex => ex.value),
        color: (opacity = 1) => chartConfig.color(opacity),
        strokeWidth: 2,
      }]
    };

    return (
      <View style={styles.chartContainer}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>Estimated 1RM (lbs)</Text>
        <LineChart
          data={chartData}
          width={screenWidth - 80}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withDots={true}
          withInnerLines={true}
          withOuterLines={true}
          withVerticalLines={true}
          withHorizontalLines={true}
          yAxisSuffix="lb"
        />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Progress</Text>
        <TouchableOpacity
          style={styles.timeScaleButton}
          onPress={onTimeScalePress}
        >
          <Text style={[styles.timeScaleText, { color: colors.tint }]}>
            {getTimeScaleLabel()}
          </Text>
          <ChevronDown size={16} color={colors.tint} />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: colors.background }]}>
          <TrendingUp size={20} color={colors.tint} />
          <Text style={[styles.statNumber, { color: colors.text }]}>
            {data.streak}
          </Text>
          <Text style={[styles.statLabel, { color: colors.text }]}>
            Day Streak
          </Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: colors.background }]}>
          <Target size={20} color={colors.tint} />
          <Text style={[styles.statNumber, { color: colors.text }]}>
            {data.oneRM.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.text }]}>
            PRs Set
          </Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: colors.background }]}>
          <Dumbbell size={20} color={colors.tint} />
          <Text style={[styles.statNumber, { color: colors.text }]}>
            {data.volume.length > 0 ? data.volume[data.volume.length - 1].value.toFixed(0) : '0'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.text }]}>
            Last Volume
          </Text>
        </View>
      </View>

      {/* Charts */}
      {renderVolumeChart()}
      {renderWeightChart()}
      {renderOneRMChart()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  timeScaleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeScaleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  emptyChart: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
}); 