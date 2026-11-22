import { formatDuration, formatTime } from './format';

describe('format', () => {
  it('formats 12h and 24h times', () => {
    expect(formatTime(600)).toBe('10 am');
    expect(formatTime(14 * 60)).toBe('2 pm');
    expect(formatTime(13 * 60 + 30)).toBe('1:30 pm');
    expect(formatTime(0)).toBe('12 am');
    expect(formatTime(22 * 60, true)).toBe('22:00');
  });
  it('formats durations', () => {
    expect(formatDuration(45)).toBe('45 mins');
    expect(formatDuration(60)).toBe('1 hr');
    expect(formatDuration(90)).toBe('1.5 hrs');
    expect(formatDuration(75)).toBe('1 hr 15 mins');
  });
});
