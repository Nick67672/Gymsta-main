import { Stack } from 'expo-router';

export default function FitnessLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="workout-hub" />
      <Stack.Screen name="nutrition-hub" />
      <Stack.Screen name="nutrition-search" />
      <Stack.Screen name="workout-tracker" />
      <Stack.Screen name="workout-summary" />
      <Stack.Screen name="workout-session" />
      <Stack.Screen name="workout-plans" />
      <Stack.Screen name="workout-history" />
      <Stack.Screen name="workout-preferences" />
      <Stack.Screen name="workout-plan/[id]" />
      <Stack.Screen name="workout-insights/[id]" />
    </Stack>
  );
} 