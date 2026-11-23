import { create } from 'zustand';
import { getSetting, SETTING_KEYS, setSetting } from '@/features/settings/settingsRepo';
import { cancelTimerNotifications, scheduleTimerNotifications } from './notifications';
import { loadPomodoroSettings, type PomodoroSettings } from './pomodoroSettings';
import { catchUp, phaseMs, projectTimeline, startRun, type Run, type TimerConfig } from './session';
import { endPlannedSession, recordFocus } from './timerRepo';

// The timer never counts down with setInterval. It stores `endsAt` and derives the
// remaining time from the clock (see timerMath.ts), so it survives the app being
// backgrounded or closed. The snapshot is saved in the settings table.

export type TimerStatus = 'idle' | 'running' | 'paused';

type Snapshot = {
  status: TimerStatus;
  run: Run | null;
  cfg: TimerConfig | null; // settings frozen when the run started
  sound: SoundConfig | null; // sound settings frozen when the run started
  endsAt: number | null; // while running
  remainingMs: number | null; // while paused
  subjectId: string | null;
  subjectName: string | null;
  subjectColor: string | null;
  plannedSessionId: string | null;
};

export type SoundConfig = Pick<PomodoroSettings, 'backgroundSound' | 'backgroundVolume' | 'notificationSound' | 'notificationVolume'>;

export type StartOptions = {
  /** Settings for this run (a scheduled session's own copy). Defaults to the saved Pomodoro settings. */
  settings?: PomodoroSettings;
  subjectId?: string;
  subjectName?: string;
  subjectColor?: string;
  plannedSessionId?: string;
  /** Focus blocks in this run. Defaults to the "Focus count" setting. */
  blocks?: number;
};

type TimerStore = Snapshot & {
  hydrated: boolean;
  now: number;
  /** When the latest phase ended (focus -> break, break -> focus, or run done). Drives the chime. */
  phaseEndedAt: number | null;
  hydrate: () => Promise<void>;
  start: (opts?: StartOptions) => Promise<void>;
  pause: () => void;
  resume: () => void;
  restartPhase: () => void;
  stop: () => Promise<void>;
  tick: () => Promise<void>;
  /** Forget the current run without saving anything (used after deleting all data). */
  reset: () => void;
  /** Continue the current run as an unplanned session after its study plan is deleted. */
  detachPlannedSession: (expectedId: string) => Promise<void>;
};

const IDLE: Snapshot = {
  status: 'idle',
  run: null,
  cfg: null,
  sound: null,
  endsAt: null,
  remainingMs: null,
  subjectId: null,
  subjectName: null,
  subjectColor: null,
  plannedSessionId: null,
};

function snapshotOf(s: TimerStore): Snapshot {
  const { status, run, cfg, sound, endsAt, remainingMs, subjectId, subjectName, subjectColor, plannedSessionId } = s;
  return { status, run, cfg, sound, endsAt, remainingMs, subjectId, subjectName, subjectColor, plannedSessionId };
}

let ticking = false;

export const useTimer = create<TimerStore>((set, get) => {
  const persist = () => {
    setSetting(SETTING_KEYS.timerState, snapshotOf(get())).catch((e) => console.warn('[timer] save', e));
  };

  const reschedule = () => {
    const { status, run, endsAt, cfg, sound } = get();
    if (status === 'running' && run && endsAt && cfg) {
      void scheduleTimerNotifications(projectTimeline(run, endsAt, cfg, true), sound?.notificationSound === 'Silent');
    } else {
      void cancelTimerNotifications();
    }
  };

  return {
    ...IDLE,
    hydrated: false,
    now: Date.now(),
    phaseEndedAt: null,

    hydrate: async () => {
      if (get().hydrated) return;
      const saved = await getSetting<Snapshot>(SETTING_KEYS.timerState, IDLE);
      set({ ...IDLE, ...saved, hydrated: true, now: Date.now() });
      await get().tick();
    },

    start: async (opts = {}) => {
      const settings = opts.settings ?? (await loadPomodoroSettings());
      const cfg: TimerConfig = {
        focusMin: settings.focusMin,
        breakMin: settings.breakMin,
        longBreakMin: settings.longBreakMin,
        focusCount: settings.focusCount,
      };
      const now = Date.now();
      const run = startRun(opts.blocks ?? settings.focusCount);
      set({
        status: 'running',
        run,
        cfg,
        sound: {
          backgroundSound: settings.backgroundSound,
          backgroundVolume: settings.backgroundVolume,
          notificationSound: settings.notificationSound,
          notificationVolume: settings.notificationVolume,
        },
        endsAt: now + phaseMs(run.phase, cfg),
        remainingMs: null,
        subjectId: opts.subjectId ?? null,
        subjectName: opts.subjectName ?? null,
        subjectColor: opts.subjectColor ?? null,
        plannedSessionId: opts.plannedSessionId ?? null,
        now,
      });
      persist();
      reschedule();
    },

    pause: () => {
      const { status, endsAt } = get();
      if (status !== 'running' || !endsAt) return;
      const now = Date.now();
      set({ status: 'paused', remainingMs: Math.max(0, endsAt - now), endsAt: null, now });
      persist();
      reschedule();
    },

    resume: () => {
      const { status, remainingMs } = get();
      if (status !== 'paused' || remainingMs == null) return;
      const now = Date.now();
      set({ status: 'running', endsAt: now + remainingMs, remainingMs: null, now });
      persist();
      reschedule();
    },

    restartPhase: () => {
      const { status, run, cfg } = get();
      if (!run || !cfg || status === 'idle') return;
      const full = phaseMs(run.phase, cfg);
      const now = Date.now();
      if (status === 'running') set({ endsAt: now + full, now });
      else set({ remainingMs: full, now });
      persist();
      reschedule();
    },

    stop: async () => {
      const s = get();
      if (s.status === 'idle') return;
      const now = Date.now();
      if (s.run?.phase === 'focus' && s.cfg) {
        const remaining = s.status === 'running' && s.endsAt ? Math.max(0, s.endsAt - now) : (s.remainingMs ?? 0);
        const elapsedMs = phaseMs('focus', s.cfg) - remaining;
        await recordFocus({
          subjectId: s.subjectId,
          plannedSessionId: s.plannedSessionId,
          startedAt: now - elapsedMs,
          durationSec: elapsedMs / 1000,
          completed: false,
        });
      }
      // Ending a scheduled session takes it out of Upcoming Sessions.
      if (s.plannedSessionId) await endPlannedSession(s.plannedSessionId);
      set({ ...IDLE, now });
      persist();
      reschedule();
    },

    tick: async () => {
      const now = Date.now();
      set({ now });
      const s = get();
      if (ticking || s.status !== 'running' || !s.run || !s.endsAt || !s.cfg || now < s.endsAt) return;
      ticking = true;
      try {
        // After a break the next focus block waits (paused, full length) until play is pressed.
        const res = catchUp(s.run, s.endsAt, s.cfg, now, true);
        const focusMs = phaseMs('focus', s.cfg);
        // Update state first so a second tick cannot record the same block twice.
        const phaseEndedAt = res.ended.length ? res.ended[res.ended.length - 1].endedAt : null;
        if (res.run && res.waiting)
          set({ run: res.run, status: 'paused', endsAt: null, remainingMs: phaseMs(res.run.phase, s.cfg), phaseEndedAt });
        else if (res.run) set({ run: res.run, endsAt: res.endsAt, phaseEndedAt });
        else set({ ...IDLE, phaseEndedAt });
        persist();
        if (res.waiting) reschedule();
        for (const end of res.ended) {
          if (end.ended.phase !== 'focus') continue;
          await recordFocus({
            subjectId: s.subjectId,
            plannedSessionId: s.plannedSessionId,
            startedAt: end.endedAt - focusMs,
            durationSec: focusMs / 1000,
            completed: true,
          });
        }
      } finally {
        ticking = false;
      }
    },

    detachPlannedSession: async (expectedId) => {
      if (get().plannedSessionId !== expectedId) return;
      set({ plannedSessionId: null });
      await setSetting(SETTING_KEYS.timerState, snapshotOf(get()));
    },

    reset: () => {
      set({ ...IDLE, now: Date.now() });
      persist();
      reschedule();
    },
  };
});

/** Milliseconds left in the current phase (0 when idle). */
export function selectRemainingMs(s: TimerStore): number {
  if (s.status === 'running' && s.endsAt) return Math.max(0, s.endsAt - s.now);
  if (s.status === 'paused' && s.remainingMs != null) return s.remainingMs;
  return 0;
}
