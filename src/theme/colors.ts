// Design tokens. Values come from the Figma file. Light mode only for now;
// keep colors here (never hard-code hex values in screens) so dark mode can be added later.
export const colors = {
  page: '#EFE7DC', // warm cream page background
  surface: '#FBF7F0', // card / sheet background
  white: '#FFFFFF',
  splash: '#E8E2DA', // splash screen background (from the splash design)
  wordmark: '#111417', // "areti" wordmark
  welcomeTeal: '#8EC7C5', // welcome screen header
  peach: '#D99063', // welcome "Get Started" button, ghost circle
  buttonTeal: '#79B7B2', // onboarding "Next" / "Allow Permission"
  buttonPeach: '#D69C79', // onboarding "Back"
  ink: '#111111', // outlines, hard shadows, primary text
  muted: '#5B5650', // secondary text
  mutedSoft: '#B3ABA0', // locked / disabled, drag handles
  avatar: '#E2D9CD', // empty profile picture
  line: '#DDD5CA', // thin dividers inside cards (Pomodoro, Statistics, Settings)
  chartBg: '#E6DED3', // bar chart well (Statistics)
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
  studyPlan: {
    surface: '#F7F2EB',
    border: '#3B3430',
    text: '#0A0A09',
    muted: '#534640',
    quiet: '#73706B',
    divider: '#DDD7CC',
    calendar: '#8B5CF6',
    toggle: '#F5EFE2',
    button: '#312924',
  },
  // Study heatmap, from "less" to "more" (index 0 = no study).
  heat: ['#FBF7F0', '#F6E1D1', '#EDC3A6', '#E2A27E', '#D4805A'],
  pill: {
    physics: '#7B4FD6',
    calculus: '#C9534C',
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

  // Reti (pet) tab, from the Figma "Pet" frames
  pet: {
    page: '#E8E2DA', // screen background under the grid
    gridLine: '#D8CFCB', // grid backdrop lines
    sheet: '#F7F2EB', // mood sheet, speech bubble, unlocked tiles
    card: '#FAF7F2', // expressions card
    outline: '#3B3430', // bubble, tiles, inputs, outline buttons
    momentum: '#6FC2B6',
    goal: '#D79C79',
    xpToday: '#237B75',
    current: '#BAE6E0', // tile of the expression shown right now
    lockedBg: '#E8E2DA',
    lockedBorder: '#73706B',
    lockedGhost: '#C9BEB0',
    lockedText: 'rgba(22,22,22,0.61)',
    lockedLevel: 'rgba(120,113,108,0.54)',
    caption: 'rgba(22,22,22,0.72)',
    // Mood badge per expression. Only Neutral is in Figma; the rest are placeholders.
    badge: {
      neutral: '#5D5D5D',
      slightlyHappy: '#3E8F8A',
      overjoyed: '#C9733F',
      sad: '#5B6F8F',
      tired: '#8A847D',
      focused: '#1F6F6A',
      sleeping: '#4A4560',
      nervous: '#7B4FD6',
      tiredFocus: '#6B6560',
      tiredNervous: '#6B5A86',
      memoryFlash: '#B0812F',
      goalCelebration: '#C9733F',
    },
  },

  // Subject colors: the only colors a subject can have (no custom picker). 40 presets in muted tones that sit
  // on the cream page next to teal and terracotta. The first eight are the original swatches.
  subjectPalette: [
    // Original eight (existing subjects keep these)
    '#7B4FD6', '#B3261E', '#2E7D4F', '#1F6F6A', '#E0A33A', '#4C8BD9', '#D96FA8', '#8A6D4B',
    // Teals & greens
    '#3E8F8A', '#7FC4C0', '#5FA8A0', '#2F6E5E', '#6E9E5A', '#9BB86A', '#4E7D3A', '#A9C99B',
    // Blues & purples
    '#2F5D8A', '#5B8DB8', '#8FB3D9', '#3B4F7A', '#5E4A8C', '#9C7FD1', '#B79AD9', '#7A4E7E',
    // Reds, pinks & oranges
    '#C9534C', '#E9837C', '#B85C7A', '#E3A1B5', '#C9733F', '#D9A27E', '#E08A4F', '#C2570C',
    // Yellows & earth tones
    '#E8B931', '#D9C26A', '#C9A24A', '#EBC3A5', '#6B4F3A', '#A0826D', '#5B5650', '#8A847D',
  ],
} as const;
