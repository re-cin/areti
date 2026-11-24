import type { Task as DbTask } from '@/db/queries/tasks';
import { formatDuration, formatTime } from '@/lib/format';

/** The shape TaskCard displays. Built from a task row (or an exam) plus its subject. */
export type CardTask = {
  id: string;
  /** "task" = a row in the tasks table; "exam" = an exam on its exam day (orange card). */
  kind: 'task' | 'exam';
  time: string;
  duration: string;
  title: string;
  subject: string;
  color: string;
  done: boolean;
  /** Scheduled as a Pomodoro session: shows the clock and is not tickable. */
  hasPomodoro: boolean;
  /** Exams only: "Low" / "Medium" / "High". */
  difficulty?: string;
};

/** Low 1–2, Medium 3, High 4–5 (the same buckets as the study plan's difficulty switch). */
export function difficultyLabel(difficulty: number) {
  return difficulty <= 2 ? 'Low' : difficulty >= 4 ? 'High' : 'Medium';
}

export function toCardTask(
  t: DbTask,
  subjectsById: Map<string, { name: string; color: string }>,
  use24h = false,
): CardTask {
  const s = subjectsById.get(t.subjectId);
  return {
    id: t.id,
    kind: 'task',
    time: formatTime(t.startMinute, use24h),
    duration: formatDuration(t.endMinute - t.startMinute),
    title: t.title,
    subject: s?.name ?? 'No subject',
    color: s?.color ?? '#5B5650',
    done: t.done,
    hasPomodoro: Boolean(t.hasPomodoro),
  };
}

export function examCardTask(
  exam: { id: string; subjectId: string; difficulty: number },
  title: string,
  done: boolean,
  subjectsById: Map<string, { name: string; color: string }>,
): CardTask {
  const s = subjectsById.get(exam.subjectId);
  return {
    id: exam.id,
    kind: 'exam',
    time: 'EXAM',
    duration: 'All day',
    title,
    subject: s?.name ?? 'No subject',
    color: s?.color ?? '#5B5650',
    done,
    hasPomodoro: false,
    difficulty: difficultyLabel(exam.difficulty),
  };
}
