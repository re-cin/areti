import { taskChipsInRangeQuery, type TaskChip } from '@/db/queries/tasks';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

/** Tasks between `from` and `to` (inclusive), grouped by day (epoch ms of local midnight). */
export function useTasksByDay(from: number, to: number) {
  const { data } = useLiveQuery(taskChipsInRangeQuery(from, to), [from, to]);
  return useMemo(() => {
    const byDay = new Map<number, TaskChip[]>();
    for (const t of data) {
      const list = byDay.get(t.date);
      if (list) list.push(t);
      else byDay.set(t.date, [t]);
    }
    return byDay;
  }, [data]);
}
