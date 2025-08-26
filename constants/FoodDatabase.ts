import { FoodDefinition } from '@/types/nutrition';

// Minimal starter set; can be expanded or sourced from USDA later
export const STARTER_FOODS: FoodDefinition[] = [
  {
    id: 'starter-chicken-breast-100g',
    name: 'Chicken Breast (cooked, skinless)',
    brand: null,
    calories: 165,
    protein_g: 31,
    carbs_g: 0,
    fat_g: 3.6,
    fiber_g: 0,
    sugar_g: 0,
    sodium_mg: 74,
    default_serving_grams: 100,
    common_servings: [
      { label: '100 g', grams: 100 },
      { label: '1 oz', grams: 28.35 },
      { label: '1 cup diced', grams: 140 }
    ],
    source: 'starter'
  },
  {
    id: 'starter-brown-rice-100g',
    name: 'Brown Rice (cooked)',
    brand: null,
    calories: 111,
    protein_g: 2.6,
    carbs_g: 23,
    fat_g: 0.9,
    fiber_g: 1.8,
    sugar_g: 0.4,
    sodium_mg: 5,
    default_serving_grams: 100,
    common_servings: [
      { label: '100 g', grams: 100 },
      { label: '1 cup', grams: 195 },
      { label: '1/2 cup', grams: 98 }
    ],
    source: 'starter'
  },
  {
    id: 'starter-banana-100g',
    name: 'Banana',
    brand: null,
    calories: 89,
    protein_g: 1.1,
    carbs_g: 22.8,
    fat_g: 0.3,
    fiber_g: 2.6,
    sugar_g: 12.2,
    sodium_mg: 1,
    default_serving_grams: 100,
    common_servings: [
      { label: '100 g', grams: 100 },
      { label: '1 medium (7" to 7-7/8")', grams: 118 },
      { label: '1 large', grams: 136 }
    ],
    source: 'starter'
  },
  {
    id: 'starter-olive-oil-100g',
    name: 'Olive Oil',
    brand: null,
    calories: 884,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 100,
    fiber_g: 0,
    sugar_g: 0,
    sodium_mg: 2,
    default_serving_grams: 100,
    common_servings: [
      { label: '100 g', grams: 100 },
      { label: '1 tbsp', grams: 13.5 },
      { label: '1 tsp', grams: 4.5 }
    ],
    source: 'starter'
  }
];


