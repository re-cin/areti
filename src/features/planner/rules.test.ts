import { difficultyWeight, maxBlocksPerRun, splitIntoRuns } from './rules';

it('maps the stored difficulty scale to safe study weights', () => {
  expect([1, 3, 5].map(difficultyWeight)).toEqual([1, 2, 3]);
  expect(difficultyWeight(Number.NaN)).toBe(2);
  expect(difficultyWeight(0)).toBe(1);
  expect(difficultyWeight(99)).toBe(3);
});

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
