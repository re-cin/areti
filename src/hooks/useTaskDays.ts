import { tasksInRangeQuery } from '@/db/queries/tasks';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

/** The set of days (epoch ms) that have at least one task between `from` and `to`. */
export function useTaskDays(from: number, to: number) {
  const { data } = useLiveQuery(tasksInRangeQuery(from, to), [from, to]);
  return useMemo(() => new Set(data.map((r) => r.date)), [data]);
}
