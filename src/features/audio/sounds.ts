import type { AudioSource } from 'expo-audio';

// Sound files live in assets/sounds/. To use your own audio, replace a file with one of the
// SAME NAME (any length; .m4a or .mp3 work on both iOS and Android). If you change a file name
// or extension, change the require() below too. To add a new sound, add a line here; the
// settings dropdown picks it up automatically.
//
// The current files are simple placeholders generated for the beta.

/* eslint-disable @typescript-eslint/no-require-imports */
export const BACKGROUND_SOUND_FILES: Record<string, AudioSource | null> = {
  Off: null,
  'Rain & Cozy Cafe': require('../../../assets/sounds/background/rain-cozy-cafe.m4a'),
  'Forest Birds': require('../../../assets/sounds/background/forest-birds.m4a'),
  'Ocean Waves': require('../../../assets/sounds/background/ocean-waves.m4a'),
  'Lo-fi Beats': require('../../../assets/sounds/background/lofi-beats.m4a'),
  'White Noise': require('../../../assets/sounds/background/white-noise.m4a'),
};

export const NOTIFICATION_SOUND_FILES: Record<string, AudioSource> = {
  'Singing Tibetan Bowl': require('../../../assets/sounds/notification/tibetan-bowl.m4a'),
  'Soft Chime': require('../../../assets/sounds/notification/soft-chime.m4a'),
  'Desk Bell': require('../../../assets/sounds/notification/desk-bell.m4a'),
  'Digital Beep': require('../../../assets/sounds/notification/digital-beep.m4a'),
};
/* eslint-enable @typescript-eslint/no-require-imports */

export const BACKGROUND_SOUNDS = Object.keys(BACKGROUND_SOUND_FILES);
export const NOTIFICATION_SOUNDS = Object.keys(NOTIFICATION_SOUND_FILES);

export const backgroundSource = (name: string): AudioSource | null => BACKGROUND_SOUND_FILES[name] ?? null;
export const notificationSource = (name: string): AudioSource =>
  NOTIFICATION_SOUND_FILES[name] ?? NOTIFICATION_SOUND_FILES[NOTIFICATION_SOUNDS[0]];
