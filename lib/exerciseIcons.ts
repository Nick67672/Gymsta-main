// Exercise icon mapping for the improved exercise picker
export const getExerciseIcon = (exerciseName: string): string => {
  const name = exerciseName.toLowerCase();
  
  // Chest exercises
  if (name.includes('bench press') || name.includes('chest press')) return '💪';
  if (name.includes('push-up') || name.includes('pushup')) return '🏋️';
  if (name.includes('dumbbell') && name.includes('chest')) return '🏋️';
  if (name.includes('incline') || name.includes('decline')) return '📈';
  if (name.includes('fly') || name.includes('flye')) return '🦋';
  
  // Back exercises
  if (name.includes('pull-up') || name.includes('pullup')) return '🏋️';
  if (name.includes('chin-up') || name.includes('chinup')) return '🏋️';
  if (name.includes('row')) return '🚣';
  if (name.includes('lat pulldown') || name.includes('lat pull-down')) return '🏋️';
  if (name.includes('deadlift')) return '🏋️';
  if (name.includes('shrug')) return '🤷';
  
  // Shoulder exercises
  if (name.includes('shoulder press') || name.includes('military press')) return '🏋️';
  if (name.includes('lateral raise') || name.includes('side raise')) return '🦅';
  if (name.includes('front raise')) return '🦅';
  if (name.includes('rear delt') || name.includes('rear deltoid')) return '🦅';
  if (name.includes('arnold press')) return '🏋️';
  
  // Arm exercises
  if (name.includes('bicep') || name.includes('curl')) return '💪';
  if (name.includes('tricep') || name.includes('extension')) return '💪';
  if (name.includes('hammer curl')) return '🔨';
  if (name.includes('preacher curl')) return '💪';
  if (name.includes('dip')) return '🏋️';
  
  // Leg exercises
  if (name.includes('squat')) return '🦵';
  if (name.includes('deadlift')) return '🏋️';
  if (name.includes('lunge')) return '🦵';
  if (name.includes('leg press')) return '🏋️';
  if (name.includes('calf') || name.includes('calves')) return '🦵';
  if (name.includes('leg extension')) return '🦵';
  if (name.includes('leg curl')) return '🦵';
  if (name.includes('hip thrust')) return '🦵';
  
  // Core exercises
  if (name.includes('crunch') || name.includes('sit-up')) return '🔥';
  if (name.includes('plank')) return '🔥';
  if (name.includes('ab') || name.includes('abs')) return '🔥';
  if (name.includes('core')) return '🔥';
  if (name.includes('russian twist')) return '🔥';
  if (name.includes('mountain climber')) return '🏔️';
  
  // Cardio exercises
  if (name.includes('run') || name.includes('jog')) return '🏃';
  if (name.includes('walk')) return '🚶';
  if (name.includes('bike') || name.includes('cycling')) return '🚴';
  if (name.includes('swim')) return '🏊';
  if (name.includes('row') && name.includes('machine')) return '🚣';
  if (name.includes('elliptical')) return '🏃';
  if (name.includes('jump rope') || name.includes('skipping')) return '⏰';
  
  // Functional exercises
  if (name.includes('burpee')) return '⚡';
  if (name.includes('mountain climber')) return '🏔️';
  if (name.includes('jumping jack')) return '⚡';
  if (name.includes('high knee')) return '⚡';
  if (name.includes('bear crawl')) return '🐻';
  if (name.includes('wall ball')) return '⚽';
  
  // Specialty exercises
  if (name.includes('clean') || name.includes('snatch')) return '🏋️';
  if (name.includes('jerk')) return '🏋️';
  if (name.includes('thruster')) return '🏋️';
  if (name.includes('kettlebell')) return '🏋️';
  if (name.includes('medicine ball')) return '⚽';
  if (name.includes('resistance band')) return '🎯';
  if (name.includes('cable')) return '🏋️';
  if (name.includes('machine')) return '🏋️';
  
  // Default icons based on exercise type
  if (name.includes('press')) return '🏋️';
  if (name.includes('pull')) return '🏋️';
  if (name.includes('push')) return '🏋️';
  if (name.includes('raise')) return '🦅';
  if (name.includes('curl')) return '💪';
  if (name.includes('extension')) return '💪';
  if (name.includes('squat')) return '🦵';
  if (name.includes('lunge')) return '🦵';
  if (name.includes('crunch')) return '🔥';
  if (name.includes('plank')) return '🔥';
  
  // Default fallback
  return '🏋️';
};