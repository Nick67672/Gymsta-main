export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MacroBreakdown {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
}

export interface FoodServingOption {
  label: string; // e.g., "1 cup", "1 slice"
  grams: number; // gram weight of this serving
}

export interface FoodDefinition extends MacroBreakdown {
  id: string;
  name: string;
  brand?: string | null;
  default_serving_grams: number; // typically 100
  common_servings: FoodServingOption[];
  source?: string | null;
}

export interface NutritionEntry extends MacroBreakdown {
  id: string;
  user_id: string;
  entry_date: string; // YYYY-MM-DD
  meal: MealType;
  food_id?: string | null;
  user_food_id?: string | null;
  serving_grams: number;
  servings: number;
  notes?: string | null;
}

export interface NutritionGoals {
  id: string;
  user_id: string;
  daily_calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  fiber_g?: number | null;
  sodium_mg?: number | null;
}


