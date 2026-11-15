// Design tokens. Values come from the Figma file. Light mode only for now;
// keep colors here (never hard-code hex values in screens) so dark mode can be added later.
export const colors = {
  page: '#EFE7DC', // warm cream page background
  surface: '#FBF7F0', // card / sheet background
  white: '#FFFFFF',
  ink: '#111111', // outlines, hard shadows, primary text
  muted: '#5B5650', // secondary text
  mutedSoft: '#B3ABA0', // locked / disabled
  divider: '#D8D0C5', // hairlines between list rows
  avatar: '#E2D9CD', // empty profile picture
  teal: '#7FC4C0', // main accent
  tealSoft: '#C9E8E5',
  tealDark: '#3E8F8A', // teal text on light backgrounds (XP)
  terracotta: '#D9A27E', // secondary accent
  terracottaSoft: '#EBC3A5',
  terracottaDark: '#C9733F', // terracotta text on light backgrounds
  premium: '#D99A78', // "Upgrade to Premium" banner
  premiumText: '#5A2E14',
  gold: '#E8B931', // crown icon
  danger: '#E9837C',
  dangerSoft: '#F6AAA6', // sign-out icon button
  dangerButton: '#D97B74', // "Delete everything"
  dangerDark: '#B3261E',
  exam: '#9B5CF6',
  // Study heatmap, from "less" to "more" (index 0 = no study).
  heat: ['#FBF7F0', '#F6E1D1', '#EDC3A6', '#E2A27E', '#D4805A'],
  pill: {
    physics: '#7B4FD6',
    calculus: '#C9534C',
    biology: '#2E7D4F',
    chemistry: '#1F6F6A',
    other: '#5B5650',
  },
} as const;
