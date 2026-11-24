import { clampGoal, goalHoursText, goalLock, needsGoalPrompt, nextGoalDay } from './goal';

const today = new Date(2026, 10, 25).getTime();
const yesterday = new Date(2026, 10, 24).getTime();

test('asks once per day', () => {
  expect(needsGoalPrompt(null, today)).toBe(true);
  expect(needsGoalPrompt({ day: yesterday, minutes: 120, sets: 2 }, today)).toBe(true);
  expect(needsGoalPrompt({ day: today, minutes: 120, sets: 1 }, today)).toBe(false);
});

test('the daily question counts as the first of two sets', () => {
  const first = nextGoalDay({ day: yesterday, minutes: 120, sets: 2 }, today, 180);
  expect(first).toEqual({ day: today, minutes: 180, sets: 1 });
  expect(goalLock(first, today, 0)).toBeNull();
  const second = nextGoalDay(first, today, 240);
  expect(second.sets).toBe(2);
  expect(goalLock(second, today, 0)).toBe('limit');
});

test('locked once study time is logged today', () => {
  expect(goalLock({ day: today, minutes: 120, sets: 1 }, today, 1)).toBe('started');
  expect(goalLock(null, today, 0)).toBeNull();
});

test('1 to 7 hours in 30-minute steps', () => {
  expect(clampGoal(10)).toBe(60);
  expect(clampGoal(1000)).toBe(420);
  expect(clampGoal(100)).toBe(90);
  expect(goalHoursText(150)).toBe('2.5 hrs');
  expect(goalHoursText(60)).toBe('1 hr');
});
