// Design tokens. Values come from the Figma file. Light mode only for now;
// keep colors here (never hard-code hex values in screens) so dark mode can be added later.
export const colors = {
  page: '#EFE7DC', // warm cream page background
  surface: '#FBF7F0', // card / sheet background
  white: '#FFFFFF',
  ink: '#111111', // outlines, hard shadows, primary text
  muted: '#5B5650', // secondary text
  mutedSoft: '#B3ABA0', // locked / disabled, drag handles
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

  // Planner + Add Task
  sheet: '#E9E3DC', // cream panel under the day strip, form screens
  sheetRaised: '#F1EAE1', // bottom sheets drawn above the panel (New Subject)
  dayStrip: '#F2EDE4', // inner track of the day strip
  finishedBg: '#EFE9E1', // finished task card background
  finishedShadow: '#6B6560', // gray hard shadow (finished cards, dark buttons)
  orange: '#C2570C', // "9 days" highlight
  tealText: '#1E8A8A', // teal text on cream ("3 tasks remaining")
  inkSoft: '#2D2D2D', // slightly softer than ink, for secondary labels
  placeholder: '#8A847D', // input placeholders and quiet captions
  divider: '#D8D1C8', // thin separators inside lists

  // Swatches offered when creating a subject (first four match the pill colors)
  subjectPalette: [
    '#7B4FD6',
    '#B3261E',
    '#2E7D4F',
    '#1F6F6A',
    '#E0A33A',
    '#4C8BD9',
    '#D96FA8',
    '#8A6D4B',
  ],
} as const;