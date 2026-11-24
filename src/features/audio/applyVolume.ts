import type { AudioPlayer } from 'expo-audio';

/**
 * Sets a player's volume (0-100 -> 0.0-1.0). After `replace()` iOS can reset the volume
 * while the new file loads, so it is applied again shortly after.
 */
export function applyVolume(player: AudioPlayer, volume0to100: number) {
  const v = Math.min(1, Math.max(0, volume0to100 / 100));
  const set = () => {
    try {
      player.volume = v;
    } catch {}
  };
  set();
  setTimeout(set, 120);
  setTimeout(set, 400);
}
