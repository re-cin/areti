import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { DEFAULT_POMODORO, loadPomodoroSettings, type PomodoroSettings } from '@/features/timer/pomodoroSettings';
import { useTimer } from '@/features/timer/timerStore';
import { useAudioFocus } from '@/stores/audioFocus';
import { useDataVersion } from '@/stores/dataVersion';
import { applyVolume } from './applyVolume';
import { backgroundSource, notificationSource } from './sounds';

/** Phase ends older than this (e.g. caught up after the app was closed) do not chime. */
const CHIME_WINDOW_MS = 5000;

/**
 * Mount once at the root (renders nothing).
 *  - Background sound loops while a FOCUS block is running, and stops on pause, breaks and stop.
 *  - It also pauses while the Pomodoro settings screen is open (so it never overlaps the previews).
 *  - The notification sound plays in the app whenever a phase ends.
 *  - Sound settings are taken when a session starts: changes saved mid-session apply to the NEXT session,
 *    the same as the timer lengths.
 * When the app is closed, the scheduled system notification plays the phone's default sound instead.
 */
export function AudioController({ enabled }: { enabled: boolean }) {
  const version = useDataVersion((s) => s.version);
  const [saved, setSaved] = useState<PomodoroSettings | null>(null);
  const status = useTimer((s) => s.status);
  const phase = useTimer((s) => s.run?.phase ?? null);
  const phaseEndedAt = useTimer((s) => s.phaseEndedAt);
  const settingsOpen = useAudioFocus((s) => s.settingsOpen);

  const bg = useRef<AudioPlayer | null>(null);
  const bgName = useRef<string | null>(null);
  const chime = useRef<AudioPlayer | null>(null);

  // Players live for the whole app session.
  useEffect(() => {
    if (!enabled) return;
    void setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(() => {});
    bg.current = createAudioPlayer(null);
    chime.current = createAudioPlayer(null);
    return () => {
      bg.current?.remove();
      chime.current?.remove();
      bg.current = null;
      chime.current = null;
      bgName.current = null;
    };
  }, [enabled]);

  // Re-read the saved sound settings whenever they are saved.
  useEffect(() => {
    if (!enabled) return;
    loadPomodoroSettings().then(setSaved).catch(() => {});
  }, [enabled, version]);

  // A running session uses the sounds it started with (frozen in the timer); otherwise the saved settings.
  const runSound = useTimer((st) => st.sound);
  const s = runSound ?? saved ?? DEFAULT_POMODORO;

  // Background sound: on during running focus blocks only, and not while the settings screen is open.
  const shouldPlayRef = useRef(false);
  useEffect(() => {
    if (!enabled) return;
    if (!bg.current) bg.current = createAudioPlayer(null);
    const player = bg.current;
    const source = backgroundSource(s.backgroundSound);
    const shouldPlay = status === 'running' && phase === 'focus' && source != null && !settingsOpen;
    shouldPlayRef.current = shouldPlay;
    try {
      if (!shouldPlay) {
        if (player.playing) player.pause();
        return;
      }
      if (bgName.current !== s.backgroundSound) {
        player.replace(source);
        bgName.current = s.backgroundSound;
      }
      player.loop = true;
      player.play();
      applyVolume(player, s.backgroundVolume);
      // A freshly loaded file can ignore the first play() on iOS; nudge it once it has loaded.
      setTimeout(() => {
        try {
          if (shouldPlayRef.current && !player.playing) player.play();
        } catch {}
      }, 500);
    } catch (e) {
      console.warn('[audio] background', e);
    }
  }, [status, phase, s.backgroundSound, s.backgroundVolume, settingsOpen, enabled]);

  // Notification sound when a phase ends while the app is open.
  const lastChimed = useRef<number | null>(null);
  useEffect(() => {
    const player = chime.current;
    if (!player || phaseEndedAt == null || phaseEndedAt === lastChimed.current) return;
    lastChimed.current = phaseEndedAt;
    if (Date.now() - phaseEndedAt > CHIME_WINDOW_MS) return;
    const source = notificationSource(s.notificationSound);
    if (!source) return; // Silent
    try {
      player.replace(source);
      player.play();
      applyVolume(player, s.notificationVolume);
    } catch (e) {
      console.warn('[audio] chime', e);
    }
  }, [phaseEndedAt, s.notificationSound, s.notificationVolume]);

  return null;
}
