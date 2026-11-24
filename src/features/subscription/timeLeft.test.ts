import { timeLeftText } from './timeLeft';

const NOW = Date.parse('2026-11-24T10:00:00Z');
const min = 60_000;

describe('timeLeftText', () => {
  it('shows days, hours and minutes, skipping zero parts', () => {
    expect(timeLeftText(NOW + (2 * 1440 + 5 * 60 + 12) * min, NOW)).toBe('2 days 5 h 12 min left');
    expect(timeLeftText(NOW + 1440 * min, NOW)).toBe('1 day left');
    expect(timeLeftText(NOW + 90 * min, NOW)).toBe('1 h 30 min left');
    expect(timeLeftText(NOW + 7 * min, NOW)).toBe('7 min left');
  });

  it('handles the last minute and the end', () => {
    expect(timeLeftText(NOW + 30_000, NOW)).toBe('Less than a minute left');
    expect(timeLeftText(NOW, NOW)).toBe('Ended');
    expect(timeLeftText(NOW - min, NOW)).toBe('Ended');
  });
});
