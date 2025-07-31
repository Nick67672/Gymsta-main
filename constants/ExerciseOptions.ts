// Comprehensive Exercise Database - Over 300+ Exercises
export const EXERCISE_OPTIONS: string[] = [
  // CHEST EXERCISES
  // Barbell Chest
  'Barbell Bench Press', 'Incline Barbell Press', 'Decline Barbell Press', 
  'Close-Grip Bench Press', 'Reverse Grip Bench Press', 'Floor Press',
  'Barbell Pullover', 'Guillotine Press', 'Larsen Press',
  
  // Dumbbell Chest
  'Dumbbell Bench Press', 'Incline Dumbbell Press', 'Decline Dumbbell Press',
  'Dumbbell Flyes', 'Incline Dumbbell Flyes', 'Decline Dumbbell Flyes',
  'Dumbbell Pullovers', 'Single-Arm Dumbbell Press', 'Dumbbell Floor Press',
  'Hex Press', 'Crush Press', 'Svend Press',
  
  // Cable & Machine Chest
  'Cable Crossovers', 'Cable Flyes', 'Pec Deck', 'Chest Press Machine',
  'Cable Chest Press', 'Incline Cable Flyes', 'Decline Cable Flyes',
  'Cable Pullovers', 'Smith Machine Bench Press', 'Hammer Strength Chest Press',
  
  // Bodyweight Chest
  'Push-Ups', 'Wide-Grip Push-Ups', 'Diamond Push-Ups', 'Incline Push-Ups',
  'Decline Push-Ups', 'Archer Push-Ups', 'Clap Push-Ups', 'Dips',
  'Ring Dips', 'Parallel Bar Dips', 'Hindu Push-Ups',

  // BACK EXERCISES
  // Pull-Ups & Chin-Ups
  'Pull-Ups', 'Chin-Ups', 'Wide-Grip Pull-Ups', 'Neutral Grip Pull-Ups',
  'Weighted Pull-Ups', 'Assisted Pull-Ups', 'Commando Pull-Ups',
  'L-Sit Pull-Ups', 'Archer Pull-Ups', 'Typewriter Pull-Ups',
  
  // Rows
  'Barbell Rows', 'T-Bar Rows', 'Dumbbell Rows', 'Cable Rows',
  'Seated Cable Rows', 'Chest-Supported Rows', 'Inverted Rows', 'Landmine Rows',
  'Pendlay Rows', 'Yates Rows', 'Helms Rows', 'Meadows Rows',
  'Single-Arm Dumbbell Rows', 'Kroc Rows', 'Seal Rows',
  
  // Pulldowns
  'Lat Pulldowns', 'Wide-Grip Pulldowns', 'Reverse Grip Pulldowns',
  'Cable Pulldowns', 'Single-Arm Pulldowns', 'V-Grip Pulldowns',
  'Behind-Neck Pulldowns', 'Straight-Arm Pulldowns',
  
  // Deadlifts
  'Conventional Deadlifts', 'Sumo Deadlifts', 'Romanian Deadlifts',
  'Stiff-Leg Deadlifts', 'Trap Bar Deadlifts', 'Single-Leg Deadlifts',
  'Deficit Deadlifts', 'Rack Pulls', 'Snatch Grip Deadlifts',

  // SHOULDER EXERCISES
  // Pressing
  'Overhead Press', 'Military Press', 'Dumbbell Shoulder Press', 'Arnold Press',
  'Pike Push-Ups', 'Handstand Push-Ups', 'Seated Shoulder Press', 'Push Press',
  'Bradford Press', 'Behind-Neck Press', 'Single-Arm Press', 'Z-Press',
  
  // Lateral Raises
  'Dumbbell Lateral Raises', 'Cable Lateral Raises', 'Machine Lateral Raises',
  'Leaning Lateral Raises', 'Partial Lateral Raises', 'Lu Raises',
  '6-Way Raises', 'Plate Lateral Raises',
  
  // Rear Delts
  'Rear Delt Flyes', 'Face Pulls', 'Reverse Pec Deck', 'Cable Rear Delt Flyes',
  'Bent-Over Lateral Raises', 'Prone Y-Raises', 'Band Pull-Aparts',
  'High Pulls', 'Reverse Cable Crossovers',
  
  // Front Delts
  'Front Raises', 'Cable Front Raises', 'Plate Raises', 'Barbell Front Raises',
  'Alternating Front Raises', 'Cross-Body Front Raises',

  // ARM EXERCISES
  // Biceps
  'Barbell Curls', 'Dumbbell Curls', 'Hammer Curls', 'Preacher Curls',
  'Cable Curls', 'Concentration Curls', 'Spider Curls', 'Incline Dumbbell Curls',
  '21s', 'Drag Curls', 'Zottman Curls', 'Cable Hammer Curls',
  'Machine Bicep Curls', 'Chin-Up Curls', 'Cross-Body Hammer Curls',
  'Wide-Grip Curls', 'Close-Grip Curls', 'Waiter Curls',
  
  // Triceps
  'Tricep Dips', 'Close-Grip Push-Ups', 'Tricep Pushdowns', 'Overhead Tricep Extension',
  'Skull Crushers', 'Tricep Kickbacks', 'French Press',
  'JM Press', 'Tate Press', 'California Press', 'Rolling Tricep Extensions',
  'Single-Arm Tricep Extensions', 'Rope Pushdowns', 'V-Bar Pushdowns',
  
  // Forearms
  'Wrist Curls', 'Reverse Wrist Curls', 'Farmers Walk', 'Plate Pinches',
  'Reverse Curls', 'Wrist Roller', 'Grip Crushers', 'Finger Extensions',
  'Dead Hangs', 'Towel Pull-Ups',

  // LEG EXERCISES
  // Quadriceps
  'Back Squats', 'Front Squats', 'Leg Press', 'Bulgarian Split Squats',
  'Lunges', 'Step-Ups', 'Leg Extensions', 'Goblet Squats', 'Hack Squats',
  'Wall Sits', 'Jump Squats', 'Pistol Squats', 'Overhead Squats',
  'Zercher Squats', 'Anderson Squats', 'Box Squats', 'Pause Squats',
  'Sissy Squats', 'Cossack Squats', 'Shrimp Squats',
  
  // Hamstrings
  'Romanian Deadlifts', 'Good Mornings', 'Leg Curls', 'Stiff-Leg Deadlifts',
  'Nordic Curls', 'Glute Ham Raises', 'Single-Leg RDLs', 'Seated Leg Curls',
  'Lying Leg Curls', 'Cable Pull-Throughs', 'Razor Curls',
  
  // Glutes
  'Hip Thrusts', 'Glute Bridges', 'Clamshells', 'Glute Kickbacks',
  'Lateral Walks', 'Monster Walks', 'Single-Leg Glute Bridges',
  'Curtsy Lunges', 'Sumo Squats', 'Fire Hydrants', 'Donkey Kicks',
  'Frog Pumps', 'B-Stance Hip Thrusts', 'Kas Glute Bridges',
  
  // Calves
  'Standing Calf Raises', 'Seated Calf Raises', 'Single-Leg Calf Raises',
  'Donkey Calf Raises', 'Jump Rope', 'Calf Press', 'Smith Machine Calf Raises',
  'Tibialis Raises', 'Farmer Walk on Toes',

  // CORE EXERCISES
  // Abs
  'Crunches', 'Bicycle Crunches', 'Russian Twists', 'Sit-Ups',
  'V-Ups', 'Leg Raises', 'Mountain Climbers', 'Dead Bugs',
  'Reverse Crunches', 'Toe Touches', 'Flutter Kicks', 'Scissor Kicks',
  'Hollow Body Holds', 'Jackknife Sit-Ups', 'Cable Crunches',
  'Decline Sit-Ups', 'Weighted Sit-Ups', 'Dragon Flags',
  
  // Planks
  'Plank', 'Side Planks', 'Plank Up-Downs', 'Plank Jacks',
  'Plank to Push-Up', 'Single-Arm Planks', 'Weighted Planks',
  'Plank Shoulder Taps', 'Plank Leg Lifts', 'Bear Crawls',
  'Commando Planks', 'Plank Rotations',
  
  // Obliques
  'Side Crunches', 'Woodchoppers', 'Side Bends', 'Oblique Crunches',
  'Russian Twists', 'Bicycle Crunches', 'Side Planks', 'Windshield Wipers',
  'Hanging Oblique Raises', 'Landmine Rotations',
  
  // Lower Back
  'Hyperextensions', 'Good Mornings', 'Superman', 'Bird Dogs',
  'Reverse Hyperextensions', 'Back Extensions', 'Reverse Flyes',
  'Prone T-Raises', 'Prone I-Raises',

  // CARDIO EXERCISES
  // HIIT
  'Burpees', 'Mountain Climbers', 'Jump Squats', 'High Knees',
  'Jumping Jacks', 'Box Jumps', 'Battle Ropes', 'Sprint Intervals',
  'Tabata Squats', 'Plyo Push-Ups', 'Jump Lunges', 'Star Jumps',
  'Tuck Jumps', 'Broad Jumps', 'Lateral Bounds',
  
  // Steady State
  'Treadmill Running', 'Cycling', 'Elliptical', 'Rowing Machine',
  'Stair Climber', 'Walking', 'Swimming', 'Jogging',
  'Stationary Bike', 'Recumbent Bike', 'Arc Trainer',
  
  // Sports
  'Basketball', 'Tennis', 'Soccer', 'Boxing', 'Kickboxing',
  'Dancing', 'Rock Climbing', 'Martial Arts', 'Volleyball',
  'Badminton', 'Squash', 'Table Tennis',

  // FUNCTIONAL EXERCISES
  // Olympic Lifts
  'Clean and Jerk', 'Snatch', 'Power Clean', 'Push Press',
  'Clean and Press', 'High Pull', 'Hang Clean', 'Hang Snatch',
  'Power Snatch', 'Split Jerk', 'Push Jerk', 'Clean Pull',
  
  // Strongman
  'Farmers Walk', 'Tire Flips', 'Sled Push', 'Sled Pull',
  'Atlas Stones', 'Yoke Walk', 'Log Press', 'Sandbag Carries',
  'Keg Tosses', 'Truck Pulls', 'Axle Deadlifts',
  
  // Kettlebell
  'Kettlebell Swings', 'Turkish Get-Ups', 'Kettlebell Snatches',
  'Kettlebell Cleans', 'Goblet Squats', 'Kettlebell Windmills',
  'Kettlebell Presses', 'Kettlebell Rows', 'Kettlebell Halos',
  'Bottoms-Up Press', 'Kettlebell Figure-8s',
  
  // Medicine Ball
  'Medicine Ball Slams', 'Wall Balls', 'Medicine Ball Throws',
  'Russian Twists with Ball', 'Medicine Ball Burpees',
  'Overhead Medicine Ball Throws', 'Medicine Ball Chest Pass',
  'Rotational Medicine Ball Throws',

  // SPECIALTY & EQUIPMENT-SPECIFIC
  // TRX/Suspension
  'TRX Rows', 'TRX Push-Ups', 'TRX Squats', 'TRX Mountain Climbers',
  'TRX Planks', 'TRX Y-Pulls', 'TRX Chest Fly',
  
  // Resistance Bands
  'Band Pull-Aparts', 'Band Rows', 'Band Squats', 'Band Presses',
  'Band Lateral Walks', 'Band Curls', 'Band Tricep Extensions',
  
  // Bodyweight Advanced
  'Muscle-Ups', 'Human Flags', 'Front Levers', 'Back Levers',
  'Planche Push-Ups', 'One-Arm Push-Ups', 'Handstand Walking',
  
  // Plyometric
  'Depth Jumps', 'Reactive Jumps', 'Lateral Bounds', 'Single-Leg Hops',
  'Medicine Ball Throws', 'Clap Push-Ups', 'Jump Training',
  
  // Mobility & Flexibility
  'Dynamic Stretching', 'Foam Rolling', 'Cat-Cow Stretches',
  'Hip Circles', 'Leg Swings', 'Arm Circles', 'Yoga Flow',
  'PNF Stretching', 'Active Stretching', 'Static Stretching'
]; 