import { create } from 'zustand';

/**
 * True while the Pomodoro settings screen is open. The session's background sound pauses
 * meanwhile, so it does not overlap with the sound previews there.
 */
export const useAudioFocus = create<{ settingsOpen: boolean; setSettingsOpen: (open: boolean) => void }>((set) => ({
  settingsOpen: false,
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
}));
