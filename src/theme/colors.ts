// Design tokens. Values come from the Figma file. Light mode only for now;
// keep colors here (never hard-code hex values in screens) so dark mode can be added later.
export const colors = {
  page: '#EFE7DC', // warm cream page background
  surface: '#FBF7F0', // card / sheet background
  white: '#FFFFFF',
  ink: '#111111', // outlines, hard shadows, primary text
  muted: '#5B5650', // secondary text
  mutedSoft: '#B3ABA0', // locked / disabled
  teal: '#7FC4C0', // main accent
  tealSoft: '#C9E8E5',
  terracotta: '#D9A27E', // secondary accent
  terracottaSoft: '#EBC3A5',
  danger: '#E9837C',
  dangerDark: '#B3261E',
  exam: '#9B5CF6',
  pill: {
    physics: '#7B4FD6',
    calculus: '#B3261E',
    biology: '#2E7D4F',
    chemistry: '#1F6F6A',
    other: '#5B5650',
  },
} as const;
