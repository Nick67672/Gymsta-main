import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  Platform,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedInput } from '@/components/ThemedInput';
import WorkoutCalendar from '@/components/WorkoutCalendar';
import WorkoutSession from '@/components/WorkoutSession';
import ProgressCharts from '@/components/ProgressCharts';
import { SwipeableExerciseCard } from '@/components/SwipeableExerciseCard';
import { EnhancedWorkoutCard } from '@/components/EnhancedWorkoutCard';

import { LiveWorkoutTimer } from '@/components/LiveWorkoutTimer';


import { 
  Plus, 
  Play, 
  Calendar,
  TrendingUp,
  Dumbbell,
  Target,
  Clock,
  ChevronDown,
  ChevronLeft,
  Edit3,
  Trash2,
  CheckCircle,
  X,
  Minus,
  Search,
  // Exercise category icons
  Zap,        // Core
  Heart,      // Cardio  
  Activity,   // Back
  Flame,      // Shoulders
  Crosshair,  // Arms
  Mountain,   // Legs
  Settings,   // Functional
} from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';
import { EXERCISE_OPTIONS } from '@/constants/ExerciseOptions';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width: screenWidth } = Dimensions.get('window');

// Types
interface WorkoutSet {
  id: string;
  reps: number;
  weight: number;
  completed: boolean;
}

interface Exercise {
  id: string;
  name: string;
  sets: WorkoutSet[];
  targetSets: number;
  targetReps: number;
  targetWeight: number;
  notes?: string;
}

interface Workout {
  id: string;
  name: string;
  date: string;
  exercises: Exercise[];
  status: 'planned' | 'in_progress' | 'completed';
  startTime?: Date;
  endTime?: Date;
  notes?: string;
}

interface ProgressData {
  volume: { date: string; value: number }[];
  weight: { date: string; exercise: string; value: number }[];
  streak: number;
  oneRM: { exercise: string; value: number }[];
}

type TimeScale = '7d' | '30d' | '3m' | '1y';

// Workout Templates
const WORKOUT_TEMPLATES = [
  {
    id: 'push',
    name: '💪 Push Day',
    description: 'Chest, Shoulders, Triceps',
    estimatedTime: '45-60 min',
    exercises: [
      { name: 'Bench Press', sets: 4, reps: '8-10', weight: 0 },
      { name: 'Overhead Press', sets: 3, reps: '10-12', weight: 0 },
      { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', weight: 0 },
      { name: 'Lateral Raises', sets: 3, reps: '12-15', weight: 0 },
      { name: 'Tricep Dips', sets: 3, reps: '12-15', weight: 0 },
      { name: 'Overhead Tricep Extension', sets: 3, reps: '12-15', weight: 0 }
    ]
  },
  {
    id: 'pull',
    name: '🏃 Pull Day', 
    description: 'Back, Biceps, Rear Delts',
    estimatedTime: '45-60 min',
    exercises: [
      { name: 'Pull-ups', sets: 4, reps: '6-10', weight: 0 },
      { name: 'Barbell Rows', sets: 4, reps: '8-10', weight: 0 },
      { name: 'Lat Pulldowns', sets: 3, reps: '10-12', weight: 0 },
      { name: 'Cable Rows', sets: 3, reps: '10-12', weight: 0 },
      { name: 'Bicep Curls', sets: 3, reps: '12-15', weight: 0 },
      { name: 'Hammer Curls', sets: 3, reps: '12-15', weight: 0 }
    ]
  },
  {
    id: 'legs',
    name: '🦵 Leg Day',
    description: 'Quads, Hamstrings, Glutes, Calves',
    estimatedTime: '50-70 min',
    exercises: [
      { name: 'Squats', sets: 4, reps: '8-10', weight: 0 },
      { name: 'Romanian Deadlifts', sets: 4, reps: '8-10', weight: 0 },
      { name: 'Bulgarian Split Squats', sets: 3, reps: '10-12', weight: 0 },
      { name: 'Leg Press', sets: 3, reps: '12-15', weight: 0 },
      { name: 'Leg Curls', sets: 3, reps: '12-15', weight: 0 },
      { name: 'Calf Raises', sets: 4, reps: '15-20', weight: 0 }
    ]
  },
  {
    id: 'fullbody',
    name: '🔥 Full Body',
    description: 'Complete workout for all muscles',
    estimatedTime: '60-75 min',
    exercises: [
      { name: 'Squats', sets: 3, reps: '10-12', weight: 0 },
      { name: 'Bench Press', sets: 3, reps: '10-12', weight: 0 },
      { name: 'Barbell Rows', sets: 3, reps: '10-12', weight: 0 },
      { name: 'Overhead Press', sets: 3, reps: '10-12', weight: 0 },
      { name: 'Deadlifts', sets: 3, reps: '8-10', weight: 0 },
      { name: 'Plank', sets: 3, reps: '30-60s', weight: 0 }
    ]
  },
  {
    id: 'upper',
    name: '💯 Upper Body',
    description: 'Chest, Back, Shoulders, Arms',
    estimatedTime: '45-60 min',
    exercises: [
      { name: 'Bench Press', sets: 4, reps: '8-10', weight: 0 },
      { name: 'Pull-ups', sets: 3, reps: '6-10', weight: 0 },
      { name: 'Overhead Press', sets: 3, reps: '10-12', weight: 0 },
      { name: 'Barbell Rows', sets: 3, reps: '10-12', weight: 0 },
      { name: 'Dips', sets: 3, reps: '10-15', weight: 0 },
      { name: 'Bicep Curls', sets: 3, reps: '12-15', weight: 0 }
    ]
  },
  {
    id: 'hiit',
    name: '⚡ HIIT Circuit',
    description: 'High-intensity interval training',
    estimatedTime: '20-30 min',
    exercises: [
      { name: 'Burpees', sets: 4, reps: '0:30', weight: 0 },
      { name: 'Mountain Climbers', sets: 4, reps: '0:30', weight: 0 },
      { name: 'Jump Squats', sets: 4, reps: '0:30', weight: 0 },
      { name: 'Push-ups', sets: 3, reps: '15', weight: 0 },
      { name: 'High Knees', sets: 4, reps: '0:30', weight: 0 },
      { name: 'Plank', sets: 3, reps: '1:00', weight: 0 }
    ]
  }
];

// Icon mapping for exercise categories
const getCategoryIcon = (category: string, size: number = 22, color: string = '#fff') => {
  switch (category) {
    case 'Chest':
      return <Dumbbell size={size} color={color} />;
    case 'Back':
      return <Activity size={size} color={color} />;
    case 'Shoulders':
      return <Flame size={size} color={color} />;
    case 'Arms':
      return <Target size={size} color={color} />;
    case 'Legs':
      return <Mountain size={size} color={color} />;
    case 'Core':
      return <Zap size={size} color={color} />;
    case 'Cardio':
      return <Heart size={size} color={color} />;
    case 'Functional':
      return <Settings size={size} color={color} />;
    default:
      return <Dumbbell size={size} color={color} />;
  }
};

// Categorized Exercise Options - Comprehensive and Enhanced
const EXERCISE_CATEGORIES = {
  'Chest': {
    color: '#FF6B6B',
    subcategories: {
      'Barbell': [
        'Barbell Bench Press', 'Incline Barbell Press', 'Decline Barbell Press', 
        'Close-Grip Bench Press', 'Reverse Grip Bench Press', 'Floor Press'
      ],
      'Dumbbell': [
        'Dumbbell Bench Press', 'Incline Dumbbell Press', 'Decline Dumbbell Press',
        'Dumbbell Flyes', 'Incline Dumbbell Flyes', 'Dumbbell Pullovers', 'Single-Arm Dumbbell Press'
      ],
      'Cable & Machine': [
        'Cable Crossovers', 'Cable Flyes', 'Pec Deck', 'Chest Press Machine',
        'Cable Chest Press', 'Incline Cable Flyes', 'Decline Cable Flyes'
      ],
      'Bodyweight': [
        'Push-Ups', 'Wide-Grip Push-Ups', 'Diamond Push-Ups', 'Incline Push-Ups',
        'Decline Push-Ups', 'Archer Push-Ups', 'Clap Push-Ups', 'Dips'
      ]
    }
  },
  'Back': {
    color: '#4ECDC4',
    subcategories: {
      'Pull-Ups & Chin-Ups': [
        'Pull-Ups', 'Chin-Ups', 'Wide-Grip Pull-Ups', 'Neutral Grip Pull-Ups',
        'Weighted Pull-Ups', 'Assisted Pull-Ups', 'Commando Pull-Ups'
      ],
      'Rows': [
        'Barbell Rows', 'T-Bar Rows', 'Dumbbell Rows', 'Cable Rows',
        'Seated Cable Rows', 'Chest-Supported Rows', 'Inverted Rows', 'Landmine Rows'
      ],
      'Pulldowns': [
        'Lat Pulldowns', 'Wide-Grip Pulldowns', 'Reverse Grip Pulldowns',
        'Cable Pulldowns', 'Single-Arm Pulldowns'
      ],
      'Deadlifts': [
        'Conventional Deadlifts', 'Sumo Deadlifts', 'Romanian Deadlifts',
        'Stiff-Leg Deadlifts', 'Trap Bar Deadlifts', 'Single-Leg Deadlifts'
      ]
    }
  },
  'Shoulders': {
    color: '#FFE66D',
    subcategories: {
      'Pressing': [
        'Overhead Press', 'Military Press', 'Dumbbell Shoulder Press', 'Arnold Press',
        'Pike Push-Ups', 'Handstand Push-Ups', 'Seated Shoulder Press', 'Push Press'
      ],
      'Lateral Raises': [
        'Dumbbell Lateral Raises', 'Cable Lateral Raises', 'Machine Lateral Raises',
        'Leaning Lateral Raises', 'Partial Lateral Raises'
      ],
      'Rear Delts': [
        'Rear Delt Flyes', 'Face Pulls', 'Reverse Pec Deck', 'Cable Rear Delt Flyes',
        'Bent-Over Lateral Raises', 'Prone Y-Raises'
      ],
      'Front Delts': [
        'Front Raises', 'Cable Front Raises', 'Plate Raises', 'Barbell Front Raises'
      ]
    }
  },
  'Arms': {
    color: '#A8E6CF',
    subcategories: {
      'Biceps': [
        'Barbell Curls', 'Dumbbell Curls', 'Hammer Curls', 'Preacher Curls',
        'Cable Curls', 'Concentration Curls', 'Spider Curls', 'Incline Dumbbell Curls',
        '21s', 'Drag Curls', 'Reverse Curls'
      ],
      'Triceps': [
        'Tricep Dips', 'Close-Grip Push-Ups', 'Tricep Pushdowns', 'Overhead Tricep Extension',
        'Skull Crushers', 'Diamond Push-Ups', 'Tricep Kickbacks', 'French Press',
        'JM Press', 'Tate Press'
      ],
      'Forearms': [
        'Wrist Curls', 'Reverse Wrist Curls', 'Farmers Walk', 'Plate Pinches',
        'Hammer Curls', 'Reverse Curls', 'Wrist Roller'
      ]
    }
  },
  'Legs': {
    color: '#FF8B94',
    subcategories: {
      'Quadriceps': [
        'Back Squats', 'Front Squats', 'Leg Press', 'Bulgarian Split Squats',
        'Lunges', 'Step-Ups', 'Leg Extensions', 'Goblet Squats', 'Hack Squats',
        'Wall Sits', 'Jump Squats', 'Pistol Squats'
      ],
      'Hamstrings': [
        'Romanian Deadlifts', 'Good Mornings', 'Leg Curls', 'Stiff-Leg Deadlifts',
        'Nordic Curls', 'Glute Ham Raises', 'Single-Leg RDLs'
      ],
      'Glutes': [
        'Hip Thrusts', 'Glute Bridges', 'Clamshells', 'Glute Kickbacks',
        'Lateral Walks', 'Monster Walks', 'Single-Leg Glute Bridges',
        'Curtsy Lunges', 'Sumo Squats'
      ],
      'Calves': [
        'Standing Calf Raises', 'Seated Calf Raises', 'Single-Leg Calf Raises',
        'Donkey Calf Raises', 'Jump Rope', 'Calf Press'
      ]
    }
  },
  'Core': {
    color: '#DDA0DD',
    subcategories: {
      'Abs': [
        'Crunches', 'Bicycle Crunches', 'Russian Twists', 'Sit-Ups',
        'V-Ups', 'Leg Raises', 'Mountain Climbers', 'Dead Bugs',
        'Reverse Crunches', 'Toe Touches', 'Flutter Kicks'
      ],
      'Planks': [
        'Plank', 'Side Planks', 'Plank Up-Downs', 'Plank Jacks',
        'Plank to Push-Up', 'Single-Arm Planks', 'Weighted Planks'
      ],
      'Obliques': [
        'Side Crunches', 'Woodchoppers', 'Side Bends', 'Oblique Crunches',
        'Russian Twists', 'Bicycle Crunches', 'Side Planks'
      ],
      'Lower Back': [
        'Hyperextensions', 'Good Mornings', 'Superman', 'Bird Dogs',
        'Reverse Hyperextensions', 'Back Extensions'
      ]
    }
  },
  'Cardio': {
    color: '#FF6B9D',
    subcategories: {
      'HIIT': [
        'Burpees', 'Mountain Climbers', 'Jump Squats', 'High Knees',
        'Jumping Jacks', 'Box Jumps', 'Battle Ropes', 'Sprint Intervals'
      ],
      'Steady State': [
        'Treadmill Running', 'Cycling', 'Elliptical', 'Rowing Machine',
        'Stair Climber', 'Walking', 'Swimming', 'Jogging'
      ],
      'Sports': [
        'Basketball', 'Tennis', 'Soccer', 'Boxing', 'Kickboxing',
        'Dancing', 'Rock Climbing', 'Martial Arts'
      ]
    }
  },
  'Functional': {
    color: '#87CEEB',
    subcategories: {
      'Olympic Lifts': [
        'Clean and Jerk', 'Snatch', 'Power Clean', 'Push Press',
        'Clean and Press', 'High Pull', 'Hang Clean'
      ],
      'Strongman': [
        'Farmers Walk', 'Tire Flips', 'Sled Push', 'Sled Pull',
        'Atlas Stones', 'Yoke Walk', 'Log Press'
      ],
      'Kettlebell': [
        'Kettlebell Swings', 'Turkish Get-Ups', 'Kettlebell Snatches',
        'Kettlebell Cleans', 'Goblet Squats', 'Kettlebell Windmills'
      ],
      'Medicine Ball': [
        'Medicine Ball Slams', 'Wall Balls', 'Medicine Ball Throws',
        'Russian Twists with Ball', 'Medicine Ball Burpees'
      ]
    }
  }
};





// Exercise Type Definitions
enum ExerciseType {
  STRENGTH = 'strength',        // Reps + Weight (e.g., Bench Press, Squats)
  CARDIO_TIME = 'cardio_time',  // Time + Distance (e.g., Running, Cycling)
  CARDIO_REPS = 'cardio_reps',  // Reps only (e.g., Burpees, Jump Squats)
  BODYWEIGHT = 'bodyweight',    // Reps only, no weight (e.g., Push-ups, Pull-ups)
  TIME_BASED = 'time_based',    // Time only (e.g., Plank, Wall Sit)
  DISTANCE = 'distance',        // Distance only (e.g., Farmers Walk)
}

// Comprehensive Exercise Classification
const EXERCISE_TYPES: { [key: string]: ExerciseType } = {
  // CARDIO - TIME BASED (Time + Distance)
  'Treadmill Running': ExerciseType.CARDIO_TIME,
  'Running': ExerciseType.CARDIO_TIME,
  'Jogging': ExerciseType.CARDIO_TIME,
  'Walking': ExerciseType.CARDIO_TIME,
  'Cycling': ExerciseType.CARDIO_TIME,
  'Stationary Bike': ExerciseType.CARDIO_TIME,
  'Recumbent Bike': ExerciseType.CARDIO_TIME,
  'Elliptical': ExerciseType.CARDIO_TIME,
  'Rowing Machine': ExerciseType.CARDIO_TIME,
  'Stair Climber': ExerciseType.CARDIO_TIME,
  'Swimming': ExerciseType.CARDIO_TIME,
  'Arc Trainer': ExerciseType.CARDIO_TIME,

  // CARDIO - REPS BASED (High intensity exercises with rep counts)
  'Burpees': ExerciseType.CARDIO_REPS,
  'Mountain Climbers': ExerciseType.CARDIO_REPS,
  'Jumping Jacks': ExerciseType.CARDIO_REPS,
  'High Knees': ExerciseType.CARDIO_REPS,
  'Jump Squats': ExerciseType.CARDIO_REPS,
  'Box Jumps': ExerciseType.CARDIO_REPS,
  'Jump Lunges': ExerciseType.CARDIO_REPS,
  'Star Jumps': ExerciseType.CARDIO_REPS,
  'Tuck Jumps': ExerciseType.CARDIO_REPS,
  'Broad Jumps': ExerciseType.CARDIO_REPS,
  'Lateral Bounds': ExerciseType.CARDIO_REPS,

  // BODYWEIGHT EXERCISES (Reps only, no added weight)
  'Push-Ups': ExerciseType.BODYWEIGHT,
  'Wide-Grip Push-Ups': ExerciseType.BODYWEIGHT,
  'Diamond Push-Ups': ExerciseType.BODYWEIGHT,
  'Incline Push-Ups': ExerciseType.BODYWEIGHT,
  'Decline Push-Ups': ExerciseType.BODYWEIGHT,
  'Archer Push-Ups': ExerciseType.BODYWEIGHT,
  'Clap Push-Ups': ExerciseType.BODYWEIGHT,
  'Pull-Ups': ExerciseType.BODYWEIGHT,
  'Chin-Ups': ExerciseType.BODYWEIGHT,
  'Wide-Grip Pull-Ups': ExerciseType.BODYWEIGHT,
  'Neutral Grip Pull-Ups': ExerciseType.BODYWEIGHT,
  'Assisted Pull-Ups': ExerciseType.BODYWEIGHT,
  'Commando Pull-Ups': ExerciseType.BODYWEIGHT,
  'Dips': ExerciseType.BODYWEIGHT,
  'Tricep Dips': ExerciseType.BODYWEIGHT,
  'Pike Push-Ups': ExerciseType.BODYWEIGHT,
  'Handstand Push-Ups': ExerciseType.BODYWEIGHT,
  'Air Squats': ExerciseType.BODYWEIGHT,
  'Pistol Squats': ExerciseType.BODYWEIGHT,
  'Cossack Squats': ExerciseType.BODYWEIGHT,
  'Shrimp Squats': ExerciseType.BODYWEIGHT,
  'Lunges': ExerciseType.BODYWEIGHT,
  'Inverted Rows': ExerciseType.BODYWEIGHT,

  // TIME-BASED EXERCISES (Time duration only)
  'Plank': ExerciseType.TIME_BASED,
  'Side Planks': ExerciseType.TIME_BASED,
  'Single-Arm Planks': ExerciseType.TIME_BASED,
  'Weighted Planks': ExerciseType.TIME_BASED,
  'Wall Sits': ExerciseType.TIME_BASED,
  'Dead Hangs': ExerciseType.TIME_BASED,
  'Hollow Body Holds': ExerciseType.TIME_BASED,
  'Superman': ExerciseType.TIME_BASED,
  'Bird Dogs': ExerciseType.TIME_BASED,

  // DISTANCE-BASED EXERCISES
  'Farmers Walk': ExerciseType.DISTANCE,
  'Sled Push': ExerciseType.DISTANCE,
  'Sled Pull': ExerciseType.DISTANCE,
  'Yoke Walk': ExerciseType.DISTANCE,
  'Sandbag Carries': ExerciseType.DISTANCE,
  'Weighted Carry': ExerciseType.DISTANCE,

  // STRENGTH EXERCISES (All others default to reps + weight)
  // This includes all barbell, dumbbell, machine exercises
};

// Get exercise type with intelligent fallback
const getExerciseType = (exerciseName: string): ExerciseType => {
  // Direct match
  if (EXERCISE_TYPES[exerciseName]) {
    return EXERCISE_TYPES[exerciseName];
  }

  const name = exerciseName.toLowerCase();

  // Pattern matching for exercise types
  if (name.includes('plank') || name.includes('hold')) {
    return ExerciseType.TIME_BASED;
  }
  
  if (name.includes('walk') || name.includes('carry') || name.includes('sled')) {
    return ExerciseType.DISTANCE;
  }
  
  if (name.includes('running') || name.includes('cycling') || name.includes('rowing') || 
      name.includes('treadmill') || name.includes('elliptical') || name.includes('bike') ||
      name.includes('swimming') || name.includes('stair')) {
    return ExerciseType.CARDIO_TIME;
  }
  
  if (name.includes('burpee') || name.includes('jumping') || name.includes('jump') || 
      name.includes('mountain climber') || name.includes('high knee')) {
    return ExerciseType.CARDIO_REPS;
  }
  
  if (name.includes('push-up') || name.includes('pushup') || name.includes('pull-up') || 
      name.includes('pullup') || name.includes('chin-up') || name.includes('dip') ||
      (name.includes('squat') && !name.includes('barbell') && !name.includes('dumbbell') && !name.includes('goblet'))) {
    return ExerciseType.BODYWEIGHT;
  }

  // Default to strength training (reps + weight)
  return ExerciseType.STRENGTH;
};

// Get appropriate labels and placeholders for exercise type
const getExerciseMetrics = (exerciseType: ExerciseType) => {
  switch (exerciseType) {
    case ExerciseType.STRENGTH:
      return {
        label1: 'Reps',
        label2: 'Weight (kg)',
        placeholder1: '10',
        placeholder2: '50',
        keyboardType1: 'numeric' as const,
        keyboardType2: 'numeric' as const,
      };
    case ExerciseType.CARDIO_TIME:
      return {
        label1: 'Duration',
        label2: 'Distance',
        placeholder1: '30:00',
        placeholder2: '5.0 km',
        keyboardType1: 'default' as const,
        keyboardType2: 'default' as const,
      };
    case ExerciseType.CARDIO_REPS:
      return {
        label1: 'Reps',
        label2: 'Rest (sec)',
        placeholder1: '20',
        placeholder2: '60',
        keyboardType1: 'numeric' as const,
        keyboardType2: 'numeric' as const,
      };
    case ExerciseType.BODYWEIGHT:
      return {
        label1: 'Reps',
        label2: 'Rest (sec)',
        placeholder1: '15',
        placeholder2: '90',
        keyboardType1: 'numeric' as const,
        keyboardType2: 'numeric' as const,
      };
    case ExerciseType.TIME_BASED:
      return {
        label1: 'Duration',
        label2: 'Rest (sec)',
        placeholder1: '1:00',
        placeholder2: '60',
        keyboardType1: 'default' as const,
        keyboardType2: 'numeric' as const,
      };
    case ExerciseType.DISTANCE:
      return {
        label1: 'Distance',
        label2: 'Weight (kg)',
        placeholder1: '50m',
        placeholder2: '40',
        keyboardType1: 'default' as const,
        keyboardType2: 'numeric' as const,
      };
    default:
      return {
        label1: 'Reps',
        label2: 'Weight (kg)',
        placeholder1: '10',
        placeholder2: '50',
        keyboardType1: 'numeric' as const,
        keyboardType2: 'numeric' as const,
      };
  }
};

export default function WorkoutTrackerScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { user } = useAuth();

  // Main state
  const [currentView, setCurrentView] = useState<'main' | 'create' | 'calendar' | 'session'>('main');
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [currentWorkout, setCurrentWorkout] = useState<Workout | null>(null);
  const [progressData, setProgressData] = useState<ProgressData>({
    volume: [],
    weight: [],
    streak: 0,
    oneRM: []
  });
  const [timeScale, setTimeScale] = useState<TimeScale>('30d');
  const [loading, setLoading] = useState(false);
  const [selectedWorkoutFilter, setSelectedWorkoutFilter] = useState<string | null>(null);

  // Modals
  const [showTimeScaleModal, setShowTimeScaleModal] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [showExercisePickerModal, setShowExercisePickerModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEditWorkoutModal, setShowEditWorkoutModal] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [showInlineExerciseForm, setShowInlineExerciseForm] = useState(false);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState('');
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Form states
  const [workoutName, setWorkoutName] = useState('');
  const [workoutDate, setWorkoutDate] = useState(new Date().toISOString().split('T')[0]);
  const [exerciseName, setExerciseName] = useState('');
  const [setsList, setSetsList] = useState<{ reps: string; weight: string }[]>([{ reps: '0', weight: '0' }]);

  // Load data on mount
  useEffect(() => {
    if (user) {
      loadWorkouts();
      loadProgressData();
    }
  }, [user, timeScale, selectedWorkoutFilter]);

  // Load workouts
  const loadWorkouts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Load planned workouts for main screen display
      const { data: plannedData, error: plannedError } = await supabase
        .from('planned_workouts')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true });
      
      if (plannedError) throw plannedError;
      
      const transformedPlannedWorkouts = plannedData?.map(w => {
        return {
          id: w.id,
          name: w.name || 'Planned Workout',
          date: w.date,
          exercises: (w.exercises || []).map((e: any) => ({
            id: e.id || Date.now().toString(),
            name: e.name,
            sets: (e.sets || []).map((s: any) => ({
              id: s.id || Date.now().toString(),
              reps: s.reps || 0,
              weight: s.weight || 0,
              completed: s.completed || false
            })),
            targetSets: e.targetSets || e.sets?.length || 3,
            targetReps: e.targetReps || 10,
            targetWeight: e.targetWeight || 0,
            notes: e.notes
          })),
          status: 'planned' as 'planned' | 'in_progress' | 'completed',
          notes: w.notes
        };
      }) || [];
      
      setWorkouts(transformedPlannedWorkouts);
      
      console.log('Loaded planned workouts:', transformedPlannedWorkouts.length);
      
    } catch (error) {
      console.error('Error loading planned workouts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load progress data
  const loadProgressData = async () => {
    if (!user) return;
    
    try {
      const days = timeScale === '7d' ? 7 : timeScale === '30d' ? 30 : timeScale === '3m' ? 90 : 365;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // Load COMPLETED workout data for progress using the workouts table
      const { data, error } = await supabase
        .from('workouts')
        .select('date, exercises, total_volume, duration_minutes, name')
        .eq('user_id', user.id)
        .eq('is_completed', true)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });
      
      if (error) throw error;
      
      // Filter by selected workout if a filter is applied
      let filteredData = data || [];
      if (selectedWorkoutFilter) {
        const selectedWorkout = workouts.find(w => w.id === selectedWorkoutFilter);
        if (selectedWorkout) {
          filteredData = filteredData.filter(workout => 
            workout.name === selectedWorkout.name
          );
        }
      }
      
      console.log('Loaded completed workouts for progress:', filteredData.length);
      
      // Process data for charts
      const volumeData: { date: string; value: number }[] = [];
      const weightData: { date: string; exercise: string; value: number }[] = [];
      const oneRMData: { exercise: string; value: number }[] = [];
      
      filteredData.forEach(workout => {
        // Calculate total volume from exercises JSONB
        let totalVolume = 0;
        
        if (workout.exercises && Array.isArray(workout.exercises)) {
          workout.exercises.forEach((exercise: any) => {
            if (exercise.sets && Array.isArray(exercise.sets)) {
              exercise.sets.forEach((set: any) => {
                if (set.completed) { // Only count completed sets
                  const volume = (set.reps || 0) * (set.weight || 0);
                  totalVolume += volume;
                }
              });
            }
          });
        }
        
        // Use calculated volume or stored total_volume
        const volume = workout.total_volume || totalVolume;
        
        volumeData.push({
          date: workout.date,
          value: volume
        });
      });
      
      // Calculate workout streak
      const streak = calculateWorkoutStreak(filteredData || []);
      
      setProgressData({
        volume: volumeData,
        weight: weightData,
        streak,
        oneRM: oneRMData
      });
      
    } catch (error) {
      console.error('Error loading progress data:', error);
    }
  };

  // Calculate 1RM using Epley formula
  const calculateOneRM = (weight: number, reps: number): number => {
    if (reps === 1) return weight;
    return weight * (1 + reps / 30);
  };

  // Calculate workout streak
  const calculateWorkoutStreak = (workouts: any[]): number => {
    if (!workouts.length) return 0;
    
    let streak = 0;
    const today = new Date();
    let currentDate = new Date(today);
    
    for (let i = 0; i < 365; i++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const hasWorkout = workouts.some(w => w.date === dateStr);
      
      if (hasWorkout) {
        streak++;
      } else if (streak > 0) {
        break;
      }
      
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    return streak;
  };

  // Create new workout
  const createNewWorkout = () => {
    const newWorkout: Workout = {
      id: Date.now().toString(),
      name: workoutName || `Workout ${new Date(workoutDate).toLocaleDateString()}`,
      date: workoutDate,
      exercises: [],
      status: 'planned'
    };
    
    setCurrentWorkout(newWorkout);
    setWorkoutName('');
    setCurrentView('create');
    setShowDatePicker(false);
  };

  // Add exercise to current workout
  const addExerciseToWorkout = () => {
    console.log('addExerciseToWorkout called');
    console.log('currentWorkout:', currentWorkout);
    console.log('exerciseName:', exerciseName);
    console.log('setsList:', setsList);
    
    if (!currentWorkout) {
      console.log('currentWorkout is null, cannot add exercise');
      Alert.alert('Error', 'No workout selected. Please create a workout first.');
      return;
    }
    
    if (!exerciseName.trim()) {
      console.log('exerciseName is empty, cannot add exercise');
      Alert.alert('Error', 'Please enter an exercise name.');
      return;
    }
    
    const setsArr = setsList.map((s, idx) => ({
      id: `${Date.now()}-${idx}`,
      reps: parseInt(s.reps) || 0,
      weight: parseFloat(s.weight) || 0,
      completed: false,
    }));

    const newExercise: Exercise = {
      id: Date.now().toString(),
      name: exerciseName.trim(),
      sets: setsArr,
      targetSets: setsArr.length,
      targetReps: setsArr[0]?.reps || 0,
      targetWeight: setsArr[0]?.weight || 0,
    };
    
    console.log('Adding new exercise:', newExercise);
    
    setCurrentWorkout(prev => prev ? {
      ...prev,
      exercises: [...prev.exercises, newExercise]
    } : null);
    
    // Reset form
    setExerciseName('');
    setSetsList([{ reps: '0', weight: '0' }]);
    setShowExerciseModal(false);
  };

  // Add another identical set to a planned exercise (clone last set)
  const addSetToExercise = (exerciseId: string) => {
    setCurrentWorkout(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map(ex => {
          if (ex.id !== exerciseId) return ex;
          const last = ex.sets[ex.sets.length - 1];
          const newSet = {
            id: `${Date.now()}`,
            reps: last?.reps || 0,
            weight: last?.weight || 0,
            completed: false,
          };
          return { ...ex, sets: [...ex.sets, newSet], targetSets: ex.sets.length + 1 };
        })
      };
    });
  };

  // Save workout to database
  const saveWorkout = async () => {
    console.log('💾 saveWorkout called');
    console.log('currentWorkout:', currentWorkout);
    console.log('user:', user);
    
    if (!currentWorkout || !user) {
      console.log('❌ Missing currentWorkout or user');
      Alert.alert('Error', 'Missing workout or user data. Please try again.');
      return;
    }
    
    console.log('✅ Starting save process...');
    setLoading(true);
    
    try {
      // Format exercises for JSONB storage
      const formattedExercises = currentWorkout.exercises.map(exercise => ({
        id: exercise.id,
        name: exercise.name,
        sets: exercise.sets.map(set => ({
          id: set.id,
          reps: set.reps,
          weight: set.weight,
          completed: set.completed
        })),
        targetSets: exercise.targetSets,
        targetReps: exercise.targetReps,
        targetWeight: exercise.targetWeight,
        notes: exercise.notes || null
      }));

      console.log('📝 Saving planned workout with data:', {
        user_id: user.id,
        name: currentWorkout.name || 'Planned Workout',
        date: currentWorkout.date,
        exerciseCount: formattedExercises.length,
        exercises: formattedExercises
      });

      // Check if workout has no exercises - don't save empty workouts
      if (formattedExercises.length === 0) {
        console.log('⚠️ Workout has no exercises, not saving');
        setCurrentWorkout(null);
        setCurrentView('main');
        Alert.alert('Workout Not Saved', 'Empty workouts are not saved. Add some exercises to save your workout.');
        return;
      }

      // Validate that exercises have proper data
      const invalidExercises = formattedExercises.filter(ex => !ex.name || ex.sets.length === 0);
      if (invalidExercises.length > 0) {
        console.log('⚠️ Found invalid exercises:', invalidExercises);
        Alert.alert('Invalid Data', 'Some exercises are missing names or sets. Please check your workout data.');
        return;
      }

      console.log('🚀 Attempting to save to database...');
      
      // Save workout to the planned_workouts table
      const { data: workoutData, error: workoutError } = await supabase
        .from('planned_workouts')
        .insert({
          user_id: user.id,
          name: currentWorkout.name || 'Planned Workout',
          date: currentWorkout.date,
          exercises: formattedExercises,
          notes: currentWorkout.notes || null
        })
        .select()
        .single();
      
      console.log('📊 Planned workout save result:', { workoutData, workoutError });
      
      if (workoutError) {
        console.error('❌ Database error:', workoutError);
        throw workoutError;
      }
      
      console.log('✅ Workout saved successfully!');
      setCurrentWorkout(null);
      setCurrentView('main');
      loadWorkouts();
      Alert.alert('Success', 'Planned workout saved successfully!');
      
    } catch (error) {
      console.error('❌ Error saving planned workout:', error);
      Alert.alert('Error', `Failed to save planned workout: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      console.log('🏁 Save process completed');
    }
  };

  // Start workout session
  const startWorkoutSession = async (workout: Workout) => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to start a workout.');
      return;
    }

    console.log('Starting workout session for workout:', workout.id);
    console.log('User ID:', user.id);

    try {
      setLoading(true);
      
      // Don't save to database yet - just start the session
      // The workout will be saved when they press "Finish"
      console.log('Starting workout session locally (not saving to DB yet)...');
      
      // Generate a new unique ID for this workout session
      const sessionId = `workout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Start the workout session with a new ID
      setCurrentWorkout({
        ...workout,
        id: sessionId, // Use new unique ID for this session
        status: 'in_progress',
        startTime: new Date()
      });
      setCurrentView('session');
      
    } catch (error) {
      console.error('Error starting workout session:', error);
      Alert.alert('Error', `Failed to start workout: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // update a planned set value
  const updatePlannedSet = (
    exerciseId: string,
    setIndex: number,
    field: 'reps' | 'weight',
    value: number
  ) => {
    setCurrentWorkout(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map(ex => {
          if (ex.id !== exerciseId) return ex;
          return {
            ...ex,
            sets: ex.sets.map((s, idx) => idx === setIndex ? { ...s, [field]: value } : s)
          };
        })
      };
    });
  };

  const removePlannedSet = (exerciseId: string, setIndex: number) => {
    setCurrentWorkout(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map(ex => {
          if (ex.id !== exerciseId) return ex;
          const newSets = ex.sets.filter((_, idx) => idx !== setIndex);
          return { ...ex, sets: newSets, targetSets: newSets.length };
        })
      };
    });
  };

  // plus: define startNewWorkoutCreation before renderMainScreen
  const startNewWorkoutCreation = () => {
    console.log('startNewWorkoutCreation called');
    const todayIso = new Date().toISOString().split('T')[0];
    setWorkoutName('');
    setWorkoutDate(todayIso);
    const newWorkout: Workout = {
      id: Date.now().toString(),
      name: '',
      date: todayIso,
      exercises: [],
      status: 'planned'
    };
    console.log('Creating new workout:', newWorkout);
    setCurrentWorkout(newWorkout);
    setCurrentView('create');
  };

  const applyWorkoutTemplate = (template: typeof WORKOUT_TEMPLATES[0]) => {
    const templateExercises = template.exercises.map((ex, index) => ({
      id: `${Date.now()}-${index}`,
      name: ex.name,
      sets: Array.from({ length: ex.sets }, (_, i) => ({
        id: `${Date.now()}-${index}-${i}`,
        reps: parseInt(ex.reps.split('-')[0]) || 10,
        weight: ex.weight,
        completed: false
      })),
      targetSets: ex.sets,
      targetReps: parseInt(ex.reps.split('-')[0]) || 10,
      targetWeight: ex.weight,
      notes: `Target: ${ex.reps} reps`
    }));

    setCurrentWorkout({
      id: `workout-${Date.now()}`,
      name: template.name.replace(/[^\w\s]/gi, '').trim(), // Remove emojis for workout name
      date: new Date().toISOString().split('T')[0],
      exercises: templateExercises,
      status: 'planned',
      notes: `${template.description} • Est. ${template.estimatedTime}`
    });
    setShowTemplateModal(false);
    setCurrentView('create');
  };

  // Edit workout functions
  const addExerciseToEditingWorkout = () => {
    console.log('addExerciseToEditingWorkout called');
    
    if (!editingWorkout) {
      Alert.alert('Error', 'No workout selected for editing.');
      return;
    }
    
    if (!exerciseName.trim()) {
      Alert.alert('Error', 'Please enter an exercise name.');
      return;
    }
    
    const setsArr = setsList.map((s, idx) => ({
      id: `${Date.now()}-${idx}`,
      reps: parseInt(s.reps) || 0,
      weight: parseFloat(s.weight) || 0,
      completed: false,
    }));

    const newExercise: Exercise = {
      id: Date.now().toString(),
      name: exerciseName.trim(),
      sets: setsArr,
      targetSets: setsArr.length,
      targetReps: setsArr[0]?.reps || 0,
      targetWeight: setsArr[0]?.weight || 0,
    };
    
    console.log('Adding exercise to editingWorkout:', newExercise.name);
    
    setEditingWorkout(prev => prev ? {
      ...prev,
      exercises: [...prev.exercises, newExercise]
    } : null);
    
    // Reset form and hide inline form
    setExerciseName('');
    setSetsList([{ reps: '0', weight: '0' }]);
    setShowInlineExerciseForm(false);
  };

  const removeExerciseFromEditingWorkout = (exerciseId: string) => {
    setEditingWorkout(prev => prev ? {
      ...prev,
      exercises: prev.exercises.filter(e => e.id !== exerciseId)
    } : null);
  };

  // Delete planned workout
  const deletePlannedWorkout = async (workoutId: string, workoutName: string) => {
    // Use confirm for web platform, Alert for native
    const confirmDelete = () => {
      if (Platform.OS === 'web') {
        return window.confirm(`Are you sure you want to delete "${workoutName}"? This action cannot be undone.`);
      } else {
        return new Promise<boolean>((resolve) => {
          Alert.alert(
            'Delete Workout',
            `Are you sure you want to delete "${workoutName}"? This action cannot be undone.`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete', style: 'destructive', onPress: () => resolve(true) }
            ]
          );
        });
      }
    };

    try {
      const shouldDelete = await confirmDelete();
      
      if (!shouldDelete) {
        return;
      }

      if (!user) {
        Alert.alert('Error', 'Please sign in to delete workouts.');
        return;
      }
      
      setLoading(true);
      try {
        // Delete from database
        const { data, error } = await supabase
          .from('planned_workouts')
          .delete()
          .eq('id', workoutId)
          .eq('user_id', user.id) // Extra security check
          .select();
        
        if (error) {
          throw error;
        }
        
        if (data && data.length === 0) {
          Alert.alert('Warning', 'Workout not found or already deleted.');
          return;
        }
        
        // Update local state
        setWorkouts(prev => prev.filter(w => w.id !== workoutId));
        
        Alert.alert('Success', 'Workout deleted successfully!');
        
      } catch (error) {
        console.error('Error deleting planned workout:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        Alert.alert('Error', `Failed to delete workout: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
      
    } catch (error) {
      console.error('Error in delete confirmation:', error);
    }
  };

  const saveEditedWorkout = async () => {
    if (!editingWorkout || !user) return;
    
    setLoading(true);
    try {
      // Format exercises for JSONB storage
      const formattedExercises = editingWorkout.exercises.map(exercise => ({
        id: exercise.id,
        name: exercise.name,
        sets: exercise.sets.map(set => ({
          id: set.id,
          reps: set.reps,
          weight: set.weight,
          completed: set.completed
        })),
        targetSets: exercise.targetSets,
        targetReps: exercise.targetReps,
        targetWeight: exercise.targetWeight,
        notes: exercise.notes || null
      }));

      console.log('Updating planned workout with data:', {
        id: editingWorkout.id,
        name: editingWorkout.name,
        exerciseCount: formattedExercises.length
      });

      // Check if workout has no exercises - delete it from saved workouts
      if (formattedExercises.length === 0) {
        console.log('Workout has no exercises, deleting from database');
        
        // Delete the workout from the database
        const { error: deleteError } = await supabase
          .from('planned_workouts')
          .delete()
          .eq('id', editingWorkout.id);
        
        if (deleteError) throw deleteError;
        
        setEditingWorkout(null);
        setShowEditWorkoutModal(false);
        setShowInlineExerciseForm(false);
        loadWorkouts();
        Alert.alert('Workout Deleted', 'The workout was automatically deleted because it has no exercises.');
        return;
      }

      // Update workout in the planned_workouts table
      const { error: workoutError } = await supabase
        .from('planned_workouts')
        .update({
          name: editingWorkout.name,
          exercises: formattedExercises,
          notes: editingWorkout.notes || null
        })
        .eq('id', editingWorkout.id);
      
      if (workoutError) throw workoutError;
      
      setEditingWorkout(null);
      setShowEditWorkoutModal(false);
      setShowInlineExerciseForm(false);
      loadWorkouts();
      Alert.alert('Success', 'Workout updated successfully!');
      
    } catch (error) {
      console.error('Error updating planned workout:', error);
      Alert.alert('Error', 'Failed to update workout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Render main tracker screen
  const renderMainScreen = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push('/fitness')}
          >
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: colors.text }]}>Workout Tracker</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.card }]}
            onPress={() => setShowCalendar(true)}
          >
            <Calendar size={24} color={colors.tint} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.planWorkoutButton, { backgroundColor: colors.tint }]}
            onPress={() => setShowTemplateModal(true)}
          >
            <Text style={styles.planWorkoutButtonText}>Plan workout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Planned Workouts Cards */}
        {workouts.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Planned Workouts
            </Text>
            <View style={styles.workoutGrid}>
              {workouts.map((workout) => (
                <View key={workout.id} style={[styles.workoutGridCard, { backgroundColor: colors.card }]}>
                  <View style={styles.workoutCardHeader}>
                    <TouchableOpacity
                      style={styles.editIconButton}
                      onPress={() => {
                        setEditingWorkout(workout);
                        setShowEditWorkoutModal(true);
                      }}
                    >
                      <Edit3 size={16} color={colors.text + '60'} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteIconButton}
                      onPress={() => deletePlannedWorkout(workout.id, workout.name)}
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.workoutGridTitle, { color: colors.text }]}>
                    {workout.name}
                  </Text>
                  <TouchableOpacity
                    style={[styles.beginWorkoutButton, { backgroundColor: colors.tint }]}
                    onPress={() => startWorkoutSession(workout)}
                  >
                    <Play size={16} color="white" />
                    <Text style={styles.beginWorkoutButtonText}>Begin Workout</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={[styles.emptyStateCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              No workouts planned
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.text }]}>
              Ready to get started?
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.tint }]}
              onPress={startNewWorkoutCreation}
            >
              <Plus size={20} color="white" />
              <Text style={styles.primaryButtonText}>Plan Your First Workout</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Progress Section */}
        <ProgressCharts
          data={progressData}
          timeScale={timeScale}
          onTimeScalePress={() => setShowTimeScaleModal(true)}
          plannedWorkouts={workouts.map(w => ({ id: w.id, name: w.name }))}
          selectedWorkoutFilter={selectedWorkoutFilter}
          onWorkoutFilterChange={setSelectedWorkoutFilter}
        />
      </ScrollView>
    </View>
  );

  // Render workout creation screen
  const renderCreateScreen = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setCurrentView('main')}>
          <X size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Create Workout</Text>
        <View style={{width:24}} />
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text, marginBottom:8 }]}>Workout Details</Text>
          <ThemedInput
            placeholder="Workout name"
            value={workoutName}
            onChangeText={(text)=>{
              setWorkoutName(text);
              setCurrentWorkout(prev=> prev?{...prev, name:text}:prev);
            }}
            style={styles.modalInput}
          />

          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.tint, marginTop:16 }]}
            onPress={() => {
              if (!currentWorkout) {
                Alert.alert('No workout in progress', 'Please start a new workout before adding exercises.');
                return;
              }
              setExerciseName('');
              setSetsList([{ reps: '0', weight: '0' }]);
              setShowExerciseModal(true);
            }}
          >
            <Plus size={20} color="white" />
            <Text style={styles.addButtonText}>Add Exercise</Text>
          </TouchableOpacity>
        </View>

        {/* Exercises List */}
        {currentWorkout?.exercises.map((exercise) => (
          <View key={exercise.id} style={[styles.exerciseCard, { backgroundColor: colors.card }]}>
            {/* Header with delete */}
            <View style={styles.exerciseHeader}>
              <Text style={[styles.exerciseName, { color: colors.text }]}>{exercise.name}</Text>
              <TouchableOpacity onPress={() => {
                setCurrentWorkout(prev => prev ? { ...prev, exercises: prev.exercises.filter(e => e.id !== exercise.id) } : null);
              }}>
                <Trash2 size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Sets table */}
            <View style={[styles.modalLabelRow, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.modalLabel, styles.modalLabelSet, { color: colors.textSecondary }]}>Set</Text>
              <View style={styles.inputGroup}>
                {(() => {
                  const exerciseType = getExerciseType(exercise.name);
                  const metrics = getExerciseMetrics(exerciseType);
                  return (
                    <>
                      <Text style={[styles.modalLabel, styles.modalLabelInput, { color: colors.textSecondary }]}>
                        {metrics.label1}
                      </Text>
                      <Text style={[styles.modalLabel, styles.modalLabelInput, { color: colors.textSecondary }]}>
                        {metrics.label2}
                      </Text>
                    </>
                  );
                })()}
              </View>
              <View style={styles.deleteButtonContainer} />
            </View>
            {exercise.sets.map((s, idx) => (
                            <View key={s.id} style={[styles.setRowPlan, { backgroundColor: colors.card }]}>
                <View style={[styles.setNumberContainer, { backgroundColor: colors.tint + '15' }]}>
                  <Text style={[styles.setCellIndex, { color: colors.tint }]}>{idx + 1}</Text>
                </View>
                <View style={styles.inputGroup}>
                  {(() => {
                    const exerciseType = getExerciseType(exercise.name);
                    const metrics = getExerciseMetrics(exerciseType);
                    return (
                      <>
                        <TextInput
                          keyboardType={metrics.keyboardType1}
                          placeholder={metrics.placeholder1}
                          placeholderTextColor={colors.textSecondary}
                          value={String(s.reps)}
                          onChangeText={v => updatePlannedSet(exercise.id, idx, 'reps', isNaN(Number(v)) ? 0 : Number(v))}
                          style={[styles.setInputBox, { 
                            backgroundColor: colors.inputBackground, 
                            color: colors.text,
                            borderColor: colors.border
                          }]}
                        />
                        <TextInput
                          keyboardType={metrics.keyboardType2}
                          placeholder={metrics.placeholder2}
                          placeholderTextColor={colors.textSecondary}
                          value={String(s.weight)}
                          onChangeText={v => updatePlannedSet(exercise.id, idx, 'weight', Number(v))}
                          style={[styles.setInputBox, { 
                            backgroundColor: colors.inputBackground, 
                            color: colors.text,
                            borderColor: colors.border
                          }]}
                        />
                      </>
                    );
                  })()}
                </View>
                <View style={styles.deleteButtonContainer}>
                  <TouchableOpacity 
                    style={[styles.deleteButton, { 
                      backgroundColor: colors.error + '15',
                      borderColor: colors.error + '25',
                      opacity: exercise.sets.length > 1 ? 1 : 0.5
                    }]}
                    onPress={() => {
                      if (exercise.sets.length > 1) {
                        removePlannedSet(exercise.id, idx);
                      }
                    }}
                    disabled={exercise.sets.length <= 1}
                  >
                    <Minus size={16} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* Add set link */}
            <TouchableOpacity style={styles.addSetInline} onPress={() => addSetToExercise(exercise.id)}>
              <Plus size={16} color={colors.tint} />
              <Text style={styles.addSetInlineText}>Add Set</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          style={[
            styles.primaryButton, 
            { 
              backgroundColor: !currentWorkout?.exercises.length ? colors.textSecondary : colors.tint, 
              marginVertical: 24, 
              alignSelf: 'center', 
              width: '90%',
              opacity: !currentWorkout?.exercises.length ? 0.5 : 1
            }
          ]}
          onPress={() => {
            console.log('🔘 Save Workout button pressed');
            console.log('Button enabled:', !!currentWorkout?.exercises.length);
            console.log('Current workout exercises:', currentWorkout?.exercises);
            saveWorkout();
          }}
          disabled={!currentWorkout?.exercises.length}
        >
          <CheckCircle size={20} color="white" />
          <Text style={styles.primaryButtonText}>
            Save Workout {currentWorkout?.exercises.length ? `(${currentWorkout.exercises.length} exercises)` : '(No exercises)'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  // Render modals
  const renderModals = () => (
    <>
      {/* Time Scale Modal */}
      <Modal visible={showTimeScaleModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Time Range</Text>
            
            {(['7d', '30d', '3m', '1y'] as TimeScale[]).map(scale => (
              <TouchableOpacity
                key={scale}
                style={[styles.timeScaleOption, timeScale === scale && { backgroundColor: colors.tint }]}
                onPress={() => {
                  setTimeScale(scale);
                  setShowTimeScaleModal(false);
                }}
              >
                <Text style={[styles.timeScaleOptionText, { 
                  color: timeScale === scale ? 'white' : colors.text 
                }]}>
                  {scale === '7d' ? '7 Days' : scale === '30d' ? '30 Days' : scale === '3m' ? '3 Months' : '1 Year'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Edit Workout Modal */}
      <Modal 
        visible={showEditWorkoutModal} 
        animationType="slide" 
        transparent
        key={`edit-${editingWorkout?.id || 'none'}`}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => {
                setShowEditWorkoutModal(false);
                setShowInlineExerciseForm(false);
              }}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Edit: {editingWorkout?.name}
              </Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalScrollContent}>
              {!showInlineExerciseForm ? (
                // Exercise List View
                <>
                  {/* Exercises List */}
                  {editingWorkout?.exercises.map((exercise) => (
                    <View key={exercise.id} style={[styles.editExerciseCard, { backgroundColor: colors.background }]}>
                      <View style={styles.exerciseHeader}>
                        <Text style={[styles.exerciseName, { color: colors.text }]}>
                          {exercise.name}
                        </Text>
                        <TouchableOpacity onPress={() => removeExerciseFromEditingWorkout(exercise.id)}>
                          <Trash2 size={18} color={colors.text} />
                        </TouchableOpacity>
                      </View>
                      <Text style={[styles.exerciseDetails, { color: colors.text }]}>
                        {exercise.sets.length} sets • {exercise.targetReps} reps • {exercise.targetWeight}kg
                      </Text>
                    </View>
                  ))}

                  {/* Add Exercise Button */}
                  <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: colors.tint, marginTop: 16 }]}
                    onPress={() => {
                      // Reset exercise form and show inline form
                      setExerciseName('');
                      setSetsList([{ reps: '0', weight: '0' }]);
                      setShowInlineExerciseForm(true);
                    }}
                  >
                    <Plus size={20} color="white" />
                    <Text style={styles.addButtonText}>Add Exercise</Text>
                  </TouchableOpacity>

                  {/* Modal Actions for Exercise List View */}
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalButton, { backgroundColor: colors.background }]}
                      onPress={() => {
                        setShowEditWorkoutModal(false);
                        setShowInlineExerciseForm(false);
                      }}
                    >
                      <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalButton, { backgroundColor: colors.tint }]}
                      onPress={() => {
                        saveEditedWorkout();
                      }}
                    >
                      <Text style={[styles.modalButtonText, { color: 'white' }]}>Save Changes</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                // Inline Exercise Form View
                <>
                  <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={() => setShowInlineExerciseForm(false)}>
                      <X size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>Add Exercise</Text>
                    <View style={{ width: 24 }} />
                  </View>

                  {/* Exercise Name Input */}
                  <TouchableOpacity
                    style={[styles.exerciseInput, { backgroundColor: colors.background }]}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    onPress={() => {
                      console.log('Inline exercise input pressed!'); // Debug log
                      setExerciseSearchQuery('');
                      setShowExercisePickerModal(true);
                    }}
                  >
                    <Text style={[styles.exerciseInputText, { color: exerciseName ? colors.text : colors.text + '80' }]}>
                      {exerciseName || 'Select exercise...'}
                    </Text>
                    <ChevronDown size={20} color={colors.text + '80'} />
                  </TouchableOpacity>

                  {/* Table Header */}
                  <View style={styles.modalLabelRow}>
                    <Text style={[styles.modalLabel, styles.modalLabelSet, { color: colors.text }]}>Set</Text>
                    <View style={styles.inputGroup}>
                      {(() => {
                        const exerciseType = getExerciseType(exerciseName);
                        const metrics = getExerciseMetrics(exerciseType);
                        return (
                          <>
                            <Text style={[styles.modalLabel, styles.modalLabelInput, { color: colors.text }]}>
                              {metrics.label1}
                            </Text>
                            <Text style={[styles.modalLabel, styles.modalLabelInput, { color: colors.text }]}>
                              {metrics.label2}
                            </Text>
                          </>
                        );
                      })()}
                    </View>
                    <View style={styles.deleteButtonContainer} />
                  </View>

                  {setsList.map((s, idx) => (
                    <View key={idx.toString()} style={styles.modalSetRow}>
                       <View style={styles.setNumberContainer}>
                        <Text style={[styles.setCellIndex, { color: colors.text }]}>{idx + 1}</Text>
                       </View>
                       <View style={styles.inputGroup}>
                        {(() => {
                          const exerciseType = getExerciseType(exerciseName);
                          const metrics = getExerciseMetrics(exerciseType);
                          return (
                            <>
                              <TextInput
                                style={[styles.setInputBox, { backgroundColor: colors.background, color: colors.text }]}
                                keyboardType={metrics.keyboardType1}
                                placeholder={metrics.placeholder1}
                                placeholderTextColor={colors.textSecondary}
                                value={s.reps}
                                onChangeText={v => setSetsList(prev => prev.map((row,i)=> i===idx?{...row,reps:v}:row))}
                              />
                              <TextInput
                                style={[styles.setInputBox, { backgroundColor: colors.background, color: colors.text }]}
                                keyboardType={metrics.keyboardType2}
                                placeholder={metrics.placeholder2}
                                placeholderTextColor={colors.textSecondary}
                                value={s.weight}
                                onChangeText={v => setSetsList(prev => prev.map((row,i)=> i===idx?{...row,weight:v}:row))}
                              />
                            </>
                          );
                        })()}
                      </View>
                      <View style={styles.deleteButtonContainer}>
                        <TouchableOpacity 
                          style={[styles.deleteButton, { 
                            backgroundColor: colors.error + '15',
                            borderColor: colors.error + '25',
                            opacity: setsList.length > 1 ? 1 : 0.5
                          }]} 
                          onPress={() => {
                            if (setsList.length > 1) {
                              setSetsList(prev => prev.filter((_, i) => i !== idx));
                            }
                          }}
                          disabled={setsList.length <= 1}
                        >
                          <Minus size={16} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}

                  <TouchableOpacity style={styles.addSetInline} onPress={()=> {
                    const last=setsList[setsList.length-1];
                    setSetsList(prev=>[...prev,{ reps:last.reps, weight:last.weight }]);
                  }}>
                    <Plus size={16} color={colors.tint}/>
                    <Text style={[styles.addSetInlineText,{color:colors.tint}]}> Add Set</Text>
                  </TouchableOpacity>

                  {/* Action buttons */}
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalButton, { backgroundColor: colors.background }]}
                      onPress={() => {
                        setShowInlineExerciseForm(false);
                      }}
                    >
                      <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalButton, { backgroundColor: colors.tint }]}
                      onPress={() => {
                        addExerciseToEditingWorkout();
                        setShowInlineExerciseForm(false);
                      }}
                    >
                      <Text style={[styles.modalButtonText, { color: 'white' }]}>Add Exercise</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>

          </View>
        </View>
      </Modal>
      
            {/* Exercise Creation Modal - For creating new workouts */}
      <Modal 
        visible={showExerciseModal}
        animationType="slide" 
        transparent
        onRequestClose={() => setShowExerciseModal(false)}
        supportedOrientations={['portrait']}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setShowExerciseModal(false)}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={(e) => e.stopPropagation()}
            style={[styles.modalContent, { backgroundColor: colors.card }]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Exercise</Text>
            
            {/* Exercise Name Input */}
            <TouchableOpacity
              style={[styles.exerciseInput, { backgroundColor: colors.background }]}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={() => {
                console.log('Exercise input pressed!'); // Debug log
                setExerciseSearchQuery('');
                setShowExercisePickerModal(true);
              }}
            >
              <Text style={[styles.exerciseInputText, { color: exerciseName ? colors.text : colors.text + '80' }]}>
                {exerciseName || 'Select exercise...'}
              </Text>
              <ChevronDown size={20} color={colors.text + '80'} />
            </TouchableOpacity>

            {/* Quick Presets */}
            <View style={styles.quickPresets}>
              <Text style={[styles.presetsLabel, { color: colors.text }]}>Quick Setup:</Text>
              <View style={styles.presetButtons}>
                {(() => {
                  const exerciseType = getExerciseType(exerciseName);
                  if (exerciseType === ExerciseType.CARDIO_TIME || exerciseType === ExerciseType.TIME_BASED) {
                    return (
                      // Time-based presets
                  <>
                    <TouchableOpacity
                      style={[styles.presetButton, { backgroundColor: colors.tint + '20' }]}
                      onPress={() => setSetsList([
                        { reps: '10:00', weight: '5' },
                        { reps: '10:00', weight: '5' },
                        { reps: '10:00', weight: '5' }
                      ])}
                    >
                      <Text style={[styles.presetButtonText, { color: colors.tint }]}>3×10min</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.presetButton, { backgroundColor: colors.tint + '20' }]}
                      onPress={() => setSetsList([
                        { reps: '15:00', weight: '7' },
                        { reps: '15:00', weight: '7' },
                        { reps: '15:00', weight: '7' }
                      ])}
                    >
                      <Text style={[styles.presetButtonText, { color: colors.tint }]}>3×15min</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.presetButton, { backgroundColor: colors.tint + '20' }]}
                      onPress={() => setSetsList([
                        { reps: '20:00', weight: '10' }
                      ])}
                    >
                      <Text style={[styles.presetButtonText, { color: colors.tint }]}>20min</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.presetButton, { backgroundColor: colors.tint + '20' }]}
                      onPress={() => setSetsList([
                        { reps: '30:00', weight: '15' }
                      ])}
                    >
                      <Text style={[styles.presetButtonText, { color: colors.tint }]}>30min</Text>
                    </TouchableOpacity>
                    </>
                  );
                } else {
                  return (
                    // Strength training presets
                    <>
                      <TouchableOpacity
                        style={[styles.presetButton, { backgroundColor: colors.tint + '20' }]}
                        onPress={() => setSetsList([
                          { reps: '8', weight: '0' },
                          { reps: '8', weight: '0' },
                          { reps: '8', weight: '0' },
                          { reps: '8', weight: '0' }
                        ])}
                      >
                        <Text style={[styles.presetButtonText, { color: colors.tint }]}>4×8</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.presetButton, { backgroundColor: colors.tint + '20' }]}
                        onPress={() => setSetsList([
                          { reps: '10', weight: '0' },
                          { reps: '10', weight: '0' },
                          { reps: '10', weight: '0' }
                        ])}
                      >
                        <Text style={[styles.presetButtonText, { color: colors.tint }]}>3×10</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.presetButton, { backgroundColor: colors.tint + '20' }]}
                        onPress={() => setSetsList([
                          { reps: '12', weight: '0' },
                          { reps: '12', weight: '0' },
                          { reps: '12', weight: '0' }
                        ])}
                      >
                        <Text style={[styles.presetButtonText, { color: colors.tint }]}>3×12</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.presetButton, { backgroundColor: colors.tint + '20' }]}
                        onPress={() => setSetsList([
                          { reps: '15', weight: '0' },
                          { reps: '15', weight: '0' },
                          { reps: '15', weight: '0' }
                        ])}
                      >
                        <Text style={[styles.presetButtonText, { color: colors.tint }]}>3×15</Text>
                      </TouchableOpacity>
                    </>
                  );
                }
              })()}
              </View>
            </View>

                          {/* Table Header */}
              <View style={[styles.modalLabelRow, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.modalLabel, styles.modalLabelSet, { color: colors.textSecondary }]}>Set</Text>
                <View style={styles.inputGroup}>
                  {(() => {
                    const exerciseType = getExerciseType(exerciseName);
                    const metrics = getExerciseMetrics(exerciseType);
                    return (
                      <>
                        <Text style={[styles.modalLabel, styles.modalLabelInput, { color: colors.textSecondary }]}>
                          {metrics.label1}
                        </Text>
                        <Text style={[styles.modalLabel, styles.modalLabelInput, { color: colors.textSecondary }]}>
                          {metrics.label2}
                        </Text>
                      </>
                    );
                  })()}
                </View>
                <View style={styles.deleteButtonContainer} />
              </View>

            {setsList.map((s, idx) => (
                            <View key={idx.toString()} style={[styles.modalSetRow, { backgroundColor: colors.card }]}>
                <View style={[styles.setNumberContainer, { backgroundColor: colors.tint + '15' }]}>
                  <Text style={[styles.setCellIndex, { color: colors.tint }]}>{idx + 1}</Text>
                </View>
                <View style={styles.inputGroup}>
                  {(() => {
                    const exerciseType = getExerciseType(exerciseName);
                    const metrics = getExerciseMetrics(exerciseType);
                    return (
                      <>
                        <TextInput
                          style={[styles.setInputBox, { 
                            backgroundColor: colors.inputBackground, 
                            color: colors.text,
                            borderColor: colors.border
                          }]}
                          placeholder={metrics.placeholder1}
                          placeholderTextColor={colors.textSecondary}
                          keyboardType={metrics.keyboardType1}
                          value={s.reps}
                          onChangeText={v => setSetsList(prev => prev.map((row,i)=> i===idx?{...row,reps:v}:row))}
                        />
                        <TextInput
                          style={[styles.setInputBox, { 
                            backgroundColor: colors.inputBackground, 
                            color: colors.text,
                            borderColor: colors.border
                          }]}
                          placeholder={metrics.placeholder2}
                          placeholderTextColor={colors.textSecondary}
                          keyboardType={metrics.keyboardType2}
                          value={s.weight}
                          onChangeText={v => setSetsList(prev => prev.map((row,i)=> i===idx?{...row,weight:v}:row))}
                        />
                      </>
                    );
                  })()}
                </View>
                <View style={styles.deleteButtonContainer}>
                  <TouchableOpacity 
                    style={[styles.deleteButton, { 
                      backgroundColor: colors.error + '15',
                      borderColor: colors.error + '25',
                      opacity: setsList.length > 1 ? 1 : 0.5
                    }]}
                    onPress={() => {
                      if (setsList.length > 1) {
                        setSetsList(prev => prev.filter((_, i) => i !== idx));
                      }
                    }}
                    disabled={setsList.length <= 1}
                  >
                    <Minus size={16} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.addSetInline} onPress={()=> {
              const last=setsList[setsList.length-1];
              setSetsList(prev=>[...prev,{ reps:last.reps, weight:last.weight }]);
            }}>
              <Plus size={16} color={colors.tint}/>
              <Text style={[styles.addSetInlineText,{color:colors.tint}]}> Add Set</Text>
            </TouchableOpacity>

            {/* Action buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.background }]}
                onPress={() => {
                  setShowExerciseModal(false);
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.tint }]}
                onPress={() => {
                  addExerciseToWorkout();
                }}
              >
                <Text style={[styles.modalButtonText, { color: 'white' }]}>Add Exercise</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Exercise Picker Modal - Cross-Platform Compatible */}
      <Modal
        visible={showExercisePickerModal}
        animationType="slide"
        transparent={false}
        presentationStyle="formSheet"
        onRequestClose={() => setShowExercisePickerModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={[{ flex: 1, backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                onPress={() => setShowExercisePickerModal(false)}
                activeOpacity={0.7}
                style={{ padding: 8 }}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Exercise</Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={[styles.exercisePickerHeader, { backgroundColor: colors.card, marginHorizontal: 16, marginBottom: 8 }]}>
              <Search size={20} color={colors.text + '80'} />
              <TextInput
                placeholder="Search exercises..."
                placeholderTextColor={colors.text + '80'}
                style={[styles.exercisePickerSearchInput, { color: colors.text }]}
                value={exerciseSearchQuery}
                onChangeText={setExerciseSearchQuery}
                autoFocus={false}
              />
            </View>

            {exerciseSearchQuery.length > 0 ? (
              // Show search results with enhanced design
              <FlatList
                data={EXERCISE_OPTIONS.filter(exercise => 
                  exercise.toLowerCase().includes(exerciseSearchQuery.toLowerCase())
                )}
                renderItem={({ item }) => {
                  const exerciseType = getExerciseType(item);
                  const categoryInfo = Object.entries(EXERCISE_CATEGORIES).find(([_, { subcategories }]) =>
                    Object.values(subcategories).some(exercises => exercises.includes(item))
                  );
                  const categoryColor = categoryInfo ? categoryInfo[1].color : colors.tint;
                  
                  return (
                    <TouchableOpacity
                      style={[styles.modernExerciseItem, { 
                        backgroundColor: colors.card,
                        borderLeftColor: categoryColor,
                        marginHorizontal: 16, 
                        marginBottom: 8,
                      }]}
                      activeOpacity={0.7}
                      onPress={() => {
                        setExerciseName(item);
                        setShowExercisePickerModal(false);
                      }}
                    >
                      <View style={[styles.exerciseIconContainer, { backgroundColor: categoryColor + '20' }]}>
                        <Dumbbell size={20} color={categoryColor} />
                      </View>
                      <View style={styles.exerciseInfo}>
                        <Text style={[styles.modernExerciseName, { color: colors.text }]}>{item}</Text>
                        <Text style={[styles.exerciseTypeLabel, { color: colors.textSecondary }]}>
                          {exerciseType.replace('_', ' ').toLowerCase()}
                        </Text>
                      </View>
                      <View style={[styles.exerciseArrow, { backgroundColor: categoryColor + '15' }]}>
                        <ChevronDown size={16} color={categoryColor} style={{ transform: [{ rotate: '-90deg' }] }} />
                      </View>
                    </TouchableOpacity>
                  );
                }}
                keyExtractor={(item) => item}
                ListEmptyComponent={() => (
                  <View style={[styles.modernExerciseEmpty, { backgroundColor: colors.card, marginHorizontal: 16 }]}>
                    <Search size={32} color={colors.textSecondary + '40'} />
                    <Text style={[styles.modernEmptyTitle, { color: colors.text }]}>
                      No exercises found
                    </Text>
                    <Text style={[styles.modernEmptySubtitle, { color: colors.textSecondary }]}>
                      Try searching for "{exerciseSearchQuery.split(' ')[0]}" or browse categories below
                    </Text>
                  </View>
                )}
                showsVerticalScrollIndicator={false}
                bounces={true}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            ) : (
              // Show categories
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {Object.entries(EXERCISE_CATEGORIES).map(([category, { color, subcategories }]) => (
                  <View key={category} style={[styles.categorySection, { 
                    backgroundColor: color + '20', 
                    borderLeftColor: color,
                    borderLeftWidth: 4,
                    marginHorizontal: 16, 
                    marginBottom: 16,
                    borderRadius: 12,
                    padding: 16,
                  }]}>
                    <View style={styles.categoryHeader}>
                      <View style={[styles.categoryIcon, { backgroundColor: color + '30' }]}>
                        {getCategoryIcon(category, 20, color)}
                      </View>
                      <Text style={[styles.categoryTitle, { color: colors.text }]}>{category}</Text>
                    </View>
                    
                    {Object.entries(subcategories).map(([subcategory, exercises]) => (
                      <View key={subcategory} style={styles.subcategoryContainer}>
                        <Text style={[styles.subcategoryTitle, { color: colors.textSecondary }]}>
                          {subcategory}
                        </Text>
                        
                        <View style={styles.subcategoryExercises}>
                          {exercises.map((exercise) => (
                            <TouchableOpacity
                              key={exercise}
                              style={[styles.modernCategoryExerciseItem, { 
                                backgroundColor: colors.card,
                                borderColor: color + '30',
                                shadowColor: color,
                              }]}
                              activeOpacity={0.7}
                              onPress={() => {
                                setExerciseName(exercise);
                                setShowExercisePickerModal(false);
                              }}
                            >
                              <View style={[styles.miniExerciseIcon, { backgroundColor: color + '20' }]}>
                                <Dumbbell size={12} color={color} />
                              </View>
                              <Text style={[styles.modernCategoryExerciseText, { color: colors.text }]}>
                                {exercise}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );

  // Main render
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {currentView === 'main' && renderMainScreen()}
      {currentView === 'create' && renderCreateScreen()}
      {currentView === 'session' && currentWorkout && (
        <WorkoutSession
          workout={currentWorkout}
          onWorkoutComplete={(completedWorkout) => {
            setWorkouts(prev => prev.map(w => w.id === completedWorkout.id ? completedWorkout : w));
            setCurrentWorkout(null);
            setCurrentView('main');
            loadWorkouts();
          }}
          onClose={() => {
            setCurrentWorkout(null);
            setCurrentView('main');
          }}
        />
      )}
      
      <WorkoutCalendar
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        onWorkoutSelect={(workout) => {
          const transformedWorkout: Workout = {
            id: workout.id,
            name: workout.name,
            date: workout.date,
            exercises: workout.exercises.map(e => ({
              id: e.id,
              name: e.name,
              sets: [],
              targetSets: e.sets || 3,
              targetReps: e.reps || 10,
              targetWeight: e.weight || 0,
              notes: e.notes
            })),
            status: workout.is_completed ? 'completed' : 'planned',
            notes: workout.notes
          };
          setCurrentWorkout(transformedWorkout);
          setCurrentView('create');
          setShowCalendar(false);
        }}
      />
      
      {renderModals()}
      
      {/* Workout Template Selection Modal */}
      <Modal
        visible={showTemplateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTemplateModal(false)}
      >
        <View style={[styles.modalOverlay, { zIndex: 9999 }]}>
          <View style={[styles.templateModalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                onPress={() => setShowTemplateModal(false)}
                activeOpacity={0.7}
                style={{ padding: 8 }}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Choose Workout Template</Text>
              <TouchableOpacity 
                onPress={startNewWorkoutCreation}
                activeOpacity={0.7}
                style={{ padding: 8 }}
              >
                <Text style={[styles.customWorkoutText, { color: colors.tint }]}>Custom</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.templateScrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.templateGrid}>
                {WORKOUT_TEMPLATES.map((template) => (
                  <TouchableOpacity
                    key={template.id}
                    style={[styles.templateCard, { backgroundColor: colors.card }]}
                    activeOpacity={0.8}
                    onPress={() => applyWorkoutTemplate(template)}
                  >
                    <Text style={[styles.templateTitle, { color: colors.text }]}>
                      {template.name}
                    </Text>
                    <Text style={[styles.templateDescription, { color: colors.text + '80' }]}>
                      {template.description}
                    </Text>
                    <View style={styles.templateStats}>
                      <Text style={[styles.templateTime, { color: colors.tint }]}>
                        ⏱️ {template.estimatedTime}
                      </Text>
                      <Text style={[styles.templateExercises, { color: colors.text + '60' }]}>
                        {template.exercises.length} exercises
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerLeft: {
    width: 44, // Fixed width for back button
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1, // Center the title
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  mainCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 20,
    textAlign: 'center',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  chartsContainer: {
    alignItems: 'center',
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  exerciseCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  enhancedExerciseCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setsProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  setsLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginRight: 8,
  },
  setsIndicator: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  setDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  setsCount: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 8,
  },
  quickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quickActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  notesIndicator: {
    flex: 1,
  },
  notesText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
  },
  exerciseDetails: {
    fontSize: 14,
    opacity: 0.7,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999999,
    elevation: 999999,
  },
  modalContent: {
    width: screenWidth * 0.9,
    borderRadius: 16,
    padding: 24,
    maxHeight: '80%',
  },
  exercisePickerModalContent: {
    width: screenWidth * 0.95,
    height: '85%',
    borderRadius: 20,
    paddingTop: 10,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  templateModalContent: {
    width: screenWidth * 0.95,
    height: '85%',
    borderRadius: 20,
    paddingTop: 10,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  templateScrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  templateGrid: {
    paddingBottom: 20,
  },
  templateCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  templateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  templateDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  templateStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  templateTime: {
    fontSize: 14,
    fontWeight: '600',
  },
  templateExercises: {
    fontSize: 12,
    fontWeight: '500',
  },
  customWorkoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  quickPresets: {
    marginBottom: 16,
  },
  presetsLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  presetButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  presetButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  presetButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categorySection: {
    borderRadius: 12,
    padding: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryEmojiContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },

  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  categoryStats: {
    alignItems: 'flex-end',
  },
  categoryCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  categoryExercises: {
    gap: 12,
  },
  subcategorySection: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  subcategoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subcategoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.9,
  },
  subcategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  subcategoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  subcategoryExercises: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryExerciseItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryExerciseText: {
    fontSize: 13,
    fontWeight: '500',
  },
  modernCategoryExerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  miniExerciseIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  modernCategoryExerciseText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  setNumberContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  deleteButtonContainer: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(211, 47, 47, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(211, 47, 47, 0.25)',
    shadowColor: '#d32f2f',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  timeScaleOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 8,
  },
  timeScaleOptionText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  modalInputSmall: {
    flexGrow: 1,
    minWidth: '30%',
  },
  addSetInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    alignSelf: 'stretch',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
  },
  addSetInlineText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  modalLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  modalLabelSet: {
    width: 44,
    textAlign: 'center',
    marginHorizontal: 4,
  },
  modalLabelInput: {
    flex: 1,
    marginHorizontal: 4,
    textAlign: 'center',
  },
  /* --- Plan view table styles --- */
  setTableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  setColHeader: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  setRowPlan: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  setCellIndex: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  setInputBox: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    textAlign: 'center',
    marginHorizontal: 6,
    fontSize: 16,
    fontWeight: '600',
    borderWidth: 1.5,
    height: 48,
    minWidth: 80,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  modalSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  datePickerField: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  planWorkoutButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planWorkoutButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  workoutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  workoutGridCard: {
    width: '48%',
    // removed fixed minWidth to improve responsiveness across screen sizes
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    alignItems: 'center',
  },
  workoutGridTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  beginWorkoutButton: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  beginWorkoutButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyStateCard: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
  },
  workoutCardHeader: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editIconButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  deleteIconButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  modalScrollContent: {
    flex: 1,
  },
  editExerciseCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exercisePickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  exercisePickerItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modernExerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exerciseIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modernExerciseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  exerciseTypeLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  exerciseArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernExerciseEmpty: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderRadius: 16,
    marginTop: 20,
  },
  modernEmptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  modernEmptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  exercisePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exercisePickerSearchInput: {
    flex: 1,
    paddingVertical: 0,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  exercisePickerEmpty: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  exercisePickerEmptyText: {
    fontSize: 14,
    opacity: 0.7,
  },
  exerciseInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 16,
    minHeight: 50,
  },
  exerciseInputText: {
    fontSize: 16,
    flex: 1,
  },
  inputGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  
  // 🎨 NEW: Enhanced UI Styles
  workoutFeed: {
    flex: 1,
  },
  
  sessionContainer: {
    flex: 1,
    padding: 16,
  },
  
  exerciseList: {
    flex: 1,
    marginTop: 16,
  },
  
  // Enhanced button styles with glassmorphism
  enhancedButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  
  // Glassmorphism card styles
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  
  // Neon accent styles
  neonBorder: {
    borderWidth: 1,
    shadowRadius: 10,
    shadowOpacity: 0.5,
  },
  
  // Category and subcategory styles
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  subcategoryContainer: {
    marginTop: 12,
  },

});