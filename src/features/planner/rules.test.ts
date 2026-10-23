import { maxBlocksPerRun, splitIntoRuns } from './rules';

describe('2 hour rule', () => {
  it('allows 4 blocks of 25 min in one run', () => {
    expect(maxBlocksPerRun(25)).toBe(4);
  });

  it('splits long days into runs', () => {
    expect(splitIntoRuns(9)).toEqual([4, 4, 1]);
    expect(splitIntoRuns(3)).toEqual([3]);
    expect(splitIntoRuns(0)).toEqual([]);
  });
});
