import { tasksForDateQuery } from '@/db/queries/tasks';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

export function useTasksForDate(date: number) {
  const { data } = useLiveQuery(tasksForDateQuery(date), [date]);
  return {
    todo: data.filter((t) => !t.done),
    finished: data.filter((t) => t.done),
  };
}
