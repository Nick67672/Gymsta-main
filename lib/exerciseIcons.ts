import { 
  Dumbbell, 
  Target, 
  Zap, 
  Activity, 
  TrendingUp,
  Heart,
  Timer,
  Flame
} from 'lucide-react-native';

export interface ExerciseIconData {
  icon: any;
  color: string;
  category: string;
}

/**
 * Get appropriate icon and color for an exercise based on its name
 */
export const getExerciseIcon = (exerciseName: string): ExerciseIconData => {
  const name = exerciseName.toLowerCase();
  
  // Chest exercises
  if (name.includes('bench') || name.includes('press') || name.includes('chest') || 
      name.includes('fly') || name.includes('dip')) {
    return {
      icon: Dumbbell,
      color: '#FF6B6B',
      category: 'Chest'
    };
  }
  
  // Back exercises
  if (name.includes('pull') || name.includes('row') || name.includes('lat') || 
      name.includes('back') || name.includes('deadlift')) {
    return {
      icon: TrendingUp,
      color: '#4ECDC4',
      category: 'Back'
    };
  }
  
  // Leg exercises
  if (name.includes('squat') || name.includes('leg') || name.includes('lunge') || 
      name.includes('calf') || name.includes('quad') || name.includes('hamstring')) {
    return {
      icon: Activity,
      color: '#45B7D1',
      category: 'Legs'
    };
  }
  
  // Shoulder exercises
  if (name.includes('shoulder') || name.includes('lateral') || name.includes('overhead') ||
      name.includes('military') || name.includes('shrug')) {
    return {
      icon: Target,
      color: '#96CEB4',
      category: 'Shoulders'
    };
  }
  
  // Arm exercises
  if (name.includes('curl') || name.includes('tricep') || name.includes('bicep') ||
      name.includes('arm') || name.includes('extension')) {
    return {
      icon: Zap,
      color: '#FFEAA7',
      category: 'Arms'
    };
  }
  
  // Cardio exercises
  if (name.includes('run') || name.includes('bike') || name.includes('cardio') ||
      name.includes('treadmill') || name.includes('elliptical')) {
    return {
      icon: Heart,
      color: '#FF7675',
      category: 'Cardio'
    };
  }
  
  // Core exercises
  if (name.includes('plank') || name.includes('crunch') || name.includes('abs') ||
      name.includes('core') || name.includes('sit')) {
    return {
      icon: Flame,
      color: '#FD79A8',
      category: 'Core'
    };
  }
  
  // Default for unknown exercises
  return {
    icon: Dumbbell,
    color: '#74B9FF',
    category: 'General'
  };
};

/**
 * Get exercise categories for filtering/grouping
 */
export const getExerciseCategories = () => [
  { name: 'Chest', color: '#FF6B6B', icon: Dumbbell },
  { name: 'Back', color: '#4ECDC4', icon: TrendingUp },
  { name: 'Legs', color: '#45B7D1', icon: Activity },
  { name: 'Shoulders', color: '#96CEB4', icon: Target },
  { name: 'Arms', color: '#FFEAA7', icon: Zap },
  { name: 'Cardio', color: '#FF7675', icon: Heart },
  { name: 'Core', color: '#FD79A8', icon: Flame },
  { name: 'General', color: '#74B9FF', icon: Dumbbell },
];