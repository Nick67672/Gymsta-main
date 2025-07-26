export interface Workout {
  id: string;
  user_id: string;
  date: string;
  is_completed: boolean;
  name?: string;
  notes?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  workout_exercises?: WorkoutExercise[];
  exercises: WorkoutExercise[];
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  volume: number;
  notes?: string;
  order_index: number;
  created_at: string;
}

export interface WorkoutTemplate {
  id: string;
  user_id: string;
  name: string;
  exercises: TemplateExercise[];
  tags?: string[];
  created_at: string;
}

export interface TemplateExercise {
  name: string;
  sets: number;
  reps: number;
  weight: number;
  notes?: string;
}

export interface ExerciseHistory {
  id: string;
  user_id: string;
  exercise_name: string;
  last_used: string;
  use_count: number;
}

export interface VolumeData {
  workout_date: string;
  exercise_name: string;
  total_volume: number;
  total_sets: number;
  total_reps: number;
  max_weight: number;
}

export interface WorkoutStats {
  totalWorkouts: number;
  totalVolume: number;
  averageDuration: number;
  personalRecords: number;
  weeklyWorkouts: number;
}

export interface CalendarDate {
  dateString: string;
  day: number;
  month: number;
  year: number;
  timestamp: number;
} 