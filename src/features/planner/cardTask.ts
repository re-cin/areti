import type { Task as DbTask } from '@/db/queries/tasks';
import { formatDuration, formatTime } from '@/lib/format';

/** The shape TaskCard displays. Built from a database row plus its subject. */
export type CardTask = {
  id: string;
  time: string;
  duration: string;
  title: string;
  subject: string;
  color: string;
  done: boolean;
};

export function toCardTask(
  t: DbTask,
  subjectsById: Map<string, { name: string; color: string }>,
  use24h = false,
): CardTask {
  const s = subjectsById.get(t.subjectId);
  return {
    id: t.id,
    time: formatTime(t.startMinute, use24h),
    duration: formatDuration(t.endMinute - t.startMinute),
    title: t.title,
    subject: s?.name ?? 'No subject',
    color: s?.color ?? '#5B5650',
    done: t.done,
  };
}
