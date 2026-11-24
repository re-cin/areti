import { create } from 'zustand';
import type { BriefEvent, ExpressionId, SessionState } from '@/features/pet';

/** Max length of the ghost's name (spec 9: free text with a length limit). */
export const PET_NAME_MAX = 16;

/**
 * Live, in-memory ghost state that isn't in the database.
 * Everything else (EXP, level, momentum, goal, exams, name) is read from SQLite in usePetView.
 */
type PetLiveState = {
  /** What the Pomodoro timer is doing. The timer should call setSession when it changes. */
  session: SessionState;
  /** A brief expression playing right now (memory flash, goal celebration). */
  brief: BriefEvent | null;
  /** Tap counter used to rotate dialogue lines. */
  talkIndex: number;
  /** DEV ONLY: expression forced from the Expressions grid to check its art. */
  preview: ExpressionId | null;
  setSession: (session: SessionState) => void;
  playBrief: (brief: BriefEvent) => void;
  endBrief: () => void;
  talk: () => void;
  /** Tap a tile to preview it; tap it again to go back to the real mood. */
  togglePreview: (id: ExpressionId) => void;
};

export const usePetStore = create<PetLiveState>((set) => ({
  session: 'idle',
  brief: null,
  talkIndex: 0,
  preview: null,
  setSession: (session) => set({ session }),
  playBrief: (brief) => set({ brief }),
  endBrief: () => set({ brief: null }),
  talk: () => set((s) => ({ talkIndex: s.talkIndex + 1 })),
  togglePreview: (id) => set((s) => ({ preview: s.preview === id ? null : id, talkIndex: 0 })),
}));

/**
 * Was: the Expressions grid could be tapped to preview any expression. Off now: expressions are
 * tried out on the admin site (Pet › Test Reti) instead, so the app always shows the real mood.
 */
export const EXPRESSION_PREVIEW = false;
