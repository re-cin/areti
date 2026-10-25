import { Stack } from 'expo-router';

export default function PlannerStack() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="add-task"
        options={{
          presentation: 'transparentModal',
          animation: 'slide_from_right', // how the screen enters
        }}
      />
    </Stack>
  );
}