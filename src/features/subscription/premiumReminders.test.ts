import { dueReminder, msUntilNextCheck, type PremiumReminder } from './premiumReminders';

const H = 60 * 60 * 1000;
const END = Date.parse('2026-12-01T10:40:00Z');
const none = new Set<PremiumReminder>();

describe('dueReminder', () => {
  it('stays quiet while more than 24 hours are left', () => {
    expect(dueReminder(END, END - 30 * H, none)).toBeNull();
  });

  it('reminds at 24 hours left, once', () => {
    expect(dueReminder(END, END - 24 * H, none)).toBe('24h');
    expect(dueReminder(END, END - 10 * H, none)).toBe('24h');
    expect(dueReminder(END, END - 10 * H, new Set<PremiumReminder>(['24h']))).toBeNull();
  });

  it('reminds at 1 hour left, once, even if the 24-hour one was missed', () => {
    expect(dueReminder(END, END - H, new Set<PremiumReminder>(['24h']))).toBe('1h');
    expect(dueReminder(END, END - 0.5 * H, none)).toBe('1h');
    expect(dueReminder(END, END - 0.5 * H, new Set<PremiumReminder>(['1h']))).toBeNull();
  });

  it('says nothing after Premium has ended', () => {
    expect(dueReminder(END, END + 1, none)).toBeNull();
  });
});

describe('msUntilNextCheck', () => {
  it('wakes at 24 h left, then 1 h left, then the end', () => {
    expect(msUntilNextCheck(END, END - 30 * H)).toBe(6 * H);
    expect(msUntilNextCheck(END, END - 10 * H)).toBe(9 * H);
    expect(msUntilNextCheck(END, END - 0.5 * H)).toBe(0.5 * H);
    expect(msUntilNextCheck(END, END + 1)).toBeNull();
  });
});
