import { create } from 'zustand';

/**
 * Bumped after every database write so screens using useDbQuery re-read.
 * (Cheaper and simpler than live queries for a local-only beta.)
 */
type DataVersion = { version: number; bump: () => void };

export const useDataVersion = create<DataVersion>((set) => ({
  version: 0,
  bump: () => set((s) => ({ version: s.version + 1 })),
}));

export const bumpData = () => useDataVersion.getState().bump();
