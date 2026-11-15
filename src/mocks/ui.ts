// Placeholder data so the screens render while the real logic is built.
// Delete this file once every screen reads from the stores / database.
import { colors } from '@/theme';

export type SubjectKey = keyof typeof colors.pill;

export const mockUser = {
  name: 'Ryan Butalid',
  email: 'ryan.butalid@gmail.com',
  joined: 'Joined September 2023',
  isPro: true,
  appVersion: 'areti v 0.30.10',
};

export const mockLevel = { level: 4, xp: 320, xpGoal: 500 };

export const mockUpcomingSessions: {
  id: string;
  subject: string;
  subjectKey: SubjectKey;
  time: string;
  blocks: number;
  minutes: number;
}[] = [
  { id: '1', subject: 'Physics', subjectKey: 'physics', time: '9:00 AM', blocks: 2, minutes: 45 },
  { id: '2', subject: 'Calculus', subjectKey: 'calculus', time: '1:00 PM', blocks: 2, minutes: 30 },
];

export const mockToday = { studied: '2 hrs 30 mins', sessions: 3, xpGained: 40 };

/** September 2026 heatmap: day of month -> intensity 0..4. */
export const mockHeatmap: Record<number, number> = {
  1: 0, 2: 0, 3: 2, 4: 4, 5: 0, 6: 2, 7: 2, 8: 2, 9: 4, 10: 0, 11: 4, 12: 3, 13: 1,
};

export const mockCalendar = { year: 2026, month: 8 /* 0-based: September */, today: 14 };

export const mockStreak = { current: 12, peak: 30 };

export const mockPeriodStats = { focusTime: '23h 30m', sessions: 56, dailyAvg: '47m' };

export const mockAvgPerDay = [
  { day: 'M', hours: 3.2 },
  { day: 'T', hours: 4.5 },
  { day: 'W', hours: 2.8 },
  { day: 'T', hours: 4.8 },
  { day: 'F', hours: 4.0 },
  { day: 'S', hours: 1.8 },
  { day: 'S', hours: 5.5 },
];

export const mockSubjectTime: { subject: string; subjectKey: SubjectKey; label: string; progress: number }[] = [
  { subject: 'Physics', subjectKey: 'physics', label: '9h 40m', progress: 1 },
  { subject: 'Calculus', subjectKey: 'calculus', label: '6h 50m', progress: 0.71 },
  { subject: 'Biology', subjectKey: 'biology', label: '4h 20m', progress: 0.45 },
];

export const mockPomodoroSettings = {
  focusCount: 2,
  focusMinutes: 60,
  breakMinutes: 15,
  longBreakMinutes: 25,
  backgroundSound: 'Rain & Cozy Cafe',
  backgroundVolume: 0.45,
  notificationSound: 'Singing Tibetan Bowl',
  notificationVolume: 0.8,
};
