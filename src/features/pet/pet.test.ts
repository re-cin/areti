import {
  applyDailyCeiling,
  creditedMinutes,
  decayMomentum,
  expForMinutes,
  formatShortDuration,
  gainMomentum,
  goalBand,
  levelForExp,
  levelProgress,
  linesFor,
  matrixMood,
  momentumBand,
  nextUnlock,
  pickLine,
  resolveExpression,
  withFallback,
  type PetSituation,
} from './index';

const base: PetSituation = {
  level: 8,
  momentum: 50,
  minutesToday: 0,
  goalMinutes: 120,
  session: 'idle',
  examInDays: null,
  isSleepPeriod: false,
  brief: null,
};

describe('credited minutes (spec 1)', () => {
  it('credits every whole minute studied (team rule: no 15-minute minimum)', () => {
    expect(creditedMinutes(25)).toBe(25);
    expect(creditedMinutes(40)).toBe(40);
    expect(creditedMinutes(14)).toBe(14);
    expect(creditedMinutes(22.9)).toBe(22);
    expect(creditedMinutes(0.5)).toBe(0);
  });
  it('caps at the daily ceiling', () => {
    expect(applyDailyCeiling(580, 50)).toBe(20);
    expect(applyDailyCeiling(600, 30)).toBe(0);
  });
});

describe('momentum (spec 3.1)', () => {
  it('gains 20 for a 50-minute block and clamps', () => {
    expect(gainMomentum(50, 50)).toBe(70);
    expect(gainMomentum(95, 50)).toBe(100);
  });
  it('decays about 12 per idle hour', () => {
    expect(decayMomentum(50, 60)).toBeCloseTo(38);
    expect(decayMomentum(5, 60)).toBe(0);
  });
  it('bands', () => {
    expect(momentumBand(33)).toBe('low');
    expect(momentumBand(34)).toBe('decent');
    expect(momentumBand(66)).toBe('decent');
    expect(momentumBand(67)).toBe('high');
  });
});

describe('daily goal + matrix (spec 3.2, 3.3)', () => {
  it('goal bands', () => {
    expect(goalBand(0.39)).toBe('low');
    expect(goalBand(0.4)).toBe('middle');
    expect(goalBand(0.9)).toBe('high');
    expect(goalBand(1.24)).toBe('high');
    expect(goalBand(1.25)).toBe('over');
  });
  it('matrix corners', () => {
    expect(matrixMood(10, 0)).toBe('sad');
    expect(matrixMood(50, 0.5)).toBe('slightlyHappy');
    expect(matrixMood(80, 1)).toBe('overjoyed');
    expect(matrixMood(80, 1.3)).toBe('tired');
  });
});

describe('levels (spec 7)', () => {
  it('levels from EXP', () => {
    expect(levelForExp(0)).toBe(1);
    expect(levelForExp(59)).toBe(1);
    expect(levelForExp(60)).toBe(2);
    expect(levelForExp(520)).toBe(4);
    expect(levelForExp(5000)).toBe(8);
  });
  it('progress through a level', () => {
    const p = levelProgress(480); // Lv4: 360 -> 600
    expect(p.level).toBe(4);
    expect(p.nextLevelExp).toBe(600);
    expect(p.progress).toBeCloseTo(0.5);
    expect(levelProgress(1700).nextLevelExp).toBeNull();
  });
  it('next unlock', () => {
    expect(nextUnlock(4)?.expressions.map((e) => e.id)).toEqual(['overjoyed']);
    expect(nextUnlock(8)).toBeNull();
  });
  it('streak bonus', () => {
    expect(expForMinutes(50)).toBe(50);
    expect(expForMinutes(50, 3)).toBe(55);
    expect(expForMinutes(50, 7)).toBe(60);
  });
});

describe('display priority (spec 4, 5, 6)', () => {
  it('shows the matrix mood by default', () => {
    expect(resolveExpression({ ...base, minutesToday: 30, goalMinutes: 180 }).id).toBe('neutral');
  });
  it('focus overrides the base mood, break returns to it', () => {
    const s = { ...base, momentum: 80, minutesToday: 120 };
    expect(resolveExpression({ ...s, session: 'focus' }).id).toBe('focused');
    expect(resolveExpression({ ...s, session: 'break' }).id).toBe('overjoyed');
  });
  it('brief beats everything', () => {
    expect(resolveExpression({ ...base, brief: 'goalCelebration', session: 'focus' }).id).toBe('goalCelebration');
  });
  it('locked celebration falls back to neutral + confetti', () => {
    const r = resolveExpression({ ...base, level: 3, brief: 'goalCelebration' });
    expect(r).toMatchObject({ id: 'neutral', overlay: 'confetti' });
  });
  it('sleeping only without a session', () => {
    expect(resolveExpression({ ...base, isSleepPeriod: true }).id).toBe('sleeping');
    expect(resolveExpression({ ...base, isSleepPeriod: true, session: 'focus' }).id).toBe('focused');
  });
  it('tired resolution table', () => {
    const t = { ...base, minutesToday: 150 }; // 125%
    expect(resolveExpression({ ...t, session: 'focus' }).id).toBe('tiredFocus');
    expect(resolveExpression({ ...t, examInDays: 2 }).id).toBe('tiredNervous');
    expect(resolveExpression({ ...t, session: 'focus', examInDays: 2 }).id).toBe('tiredFocus');
    expect(resolveExpression({ ...t, session: 'break' }).id).toBe('tired');
    expect(resolveExpression({ ...t, level: 1, session: 'focus' }).id).toBe('tired');
  });
  it('nervous when an exam is within 3 days', () => {
    expect(resolveExpression({ ...base, examInDays: 3 }).id).toBe('nervous');
    expect(resolveExpression({ ...base, examInDays: 4 }).id).not.toBe('nervous');
    // Locked Nervous shows the base mood instead.
    expect(resolveExpression({ ...base, level: 5, examInDays: 1 }).id).toBe('neutral');
    expect(resolveExpression({ ...base, level: 5, momentum: 10, examInDays: 1 }).id).toBe('sad');
  });
  it('fallback chain', () => {
    expect(withFallback('overjoyed', 1)).toBe('neutral');
    expect(withFallback('overjoyed', 2)).toBe('slightlyHappy');
    expect(withFallback('overjoyed', 5)).toBe('overjoyed');
  });
});

describe('dialogue + format', () => {
  it('uses unlocked pools only', () => {
    expect(linesFor('sad', 1)).toEqual(linesFor('neutral', 1));
    expect(pickLine(['a', 'b'], 3)).toBe('b');
  });
  it('formats goal minutes', () => {
    expect(formatShortDuration(30)).toBe('30m');
    expect(formatShortDuration(180)).toBe('3h');
    expect(formatShortDuration(90)).toBe('1h 30m');
  });
});
