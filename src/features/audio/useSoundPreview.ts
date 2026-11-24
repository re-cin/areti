import { createAudioPlayer, type AudioPlayer, type AudioSource } from 'expo-audio';
import { useCallback, useEffect, useRef } from 'react';
import { applyVolume } from './applyVolume';

/**
 * Sound previews on the Pomodoro settings screen.
 *  - A background sound loops for as long as you stay on it (no time limit).
 *  - A notification sound plays once, in full.
 * The preview stops when another preview starts, when stop() is called (e.g. you change a timer
 * setting or save), or when the screen closes.
 */
export function useSoundPreview() {
  const player = useRef<AudioPlayer | null>(null);
  const playingBackground = useRef<string | null>(null); // name of the looping background preview

  useEffect(() => {
    player.current = createAudioPlayer(null);
    return () => {
      player.current?.remove();
      player.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    playingBackground.current = null;
    try {
      player.current?.pause();
      // Unload a looping preview so it cannot resume after the settings panel closes.
      player.current?.replace(null);
    } catch {}
  }, []);

  /** `background`: the background sound's name; it then loops until stopped. Omit for one-shot sounds. */
  const play = useCallback(
    (source: AudioSource | null, volume: number, opts: { background?: string } = {}) => {
      const p = player.current;
      if (!p) return;
      stop();
      if (!source) return;
      try {
        p.replace(source);
        p.loop = !!opts.background;
        p.play();
        applyVolume(p, volume);
        if (opts.background) playingBackground.current = opts.background;
        // A freshly loaded file can ignore the first play() on iOS (the "nothing happens" glitch);
        // nudge it once it has loaded, unless another preview took over or it was stopped.
        const name = opts.background ?? null;
        setTimeout(() => {
          try {
            if (player.current === p && playingBackground.current === name && !p.playing && name) p.play();
          } catch {}
        }, 400);
      } catch (e) {
        console.warn('[audio] preview', e);
      }
    },
    [stop],
  );

  /** Change the volume of whatever is previewing (used while dragging a slider). */
  const setVolume = useCallback((volume: number) => {
    const p = player.current;
    if (p) applyVolume(p, volume);
  }, []);

  /** True if that background sound is the one looping right now. */
  const isPlayingBackground = useCallback((name: string) => playingBackground.current === name, []);

  return { play, stop, setVolume, isPlayingBackground };
}
