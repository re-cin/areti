import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { applyVolume } from './applyVolume';
import { notificationSource } from './sounds';

let player: AudioPlayer | null = null;

/** Plays a notification sound once (e.g. a session reminder while the app is open). Silent plays nothing. */
export function playChime(soundName: string, volume = 80) {
  const source = notificationSource(soundName);
  if (!source) return;
  try {
    void setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(() => {});
    if (!player) player = createAudioPlayer(null);
    player.replace(source);
    player.play();
    applyVolume(player, volume);
  } catch (e) {
    console.warn('[audio] reminder chime', e);
  }
}
