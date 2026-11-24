import { create } from 'zustand';
import type { IconName } from '@/components/ui/Icon';

/**
 * App-styled one-button notice (white card, "Okay"), shown above every screen by <NoticeDialog />
 * in the root layout. Use instead of Alert.alert for simple messages, e.g. after navigating away.
 */
/** A button in a stacked choice popup (e.g. the profile picture menu). */
export type NoticeAction = { label: string; onPress?: () => void; color?: string };

type Notice = { title: string; message?: string; icon?: IconName; buttonLabel?: string; /** Runs when the button is pressed. */ onPress?: () => void; /** Adds a second (white) button that just closes, e.g. "Cancel". */ cancelLabel?: string; /** Several choices, stacked (replaces the one button). */ actions?: NoticeAction[] };
type NoticeStore = { notice: Notice | null; show: (n: Notice) => void; hide: () => void };

export const useNotice = create<NoticeStore>((set) => ({
  notice: null,
  show: (notice) => set({ notice }),
  hide: () => set({ notice: null }),
}));

export const showNotice = (n: Notice) => useNotice.getState().show(n);

/** True while the Pomodoro page is the screen you're looking at (set by that screen on focus/blur). */
let pomodoroVisible = false;
export const setPomodoroVisible = (v: boolean) => {
  pomodoroVisible = v;
};
export const isPomodoroVisible = () => pomodoroVisible;
