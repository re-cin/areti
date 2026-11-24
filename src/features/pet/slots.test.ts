import { addedLinesFor, customLines, pickVariant, resolveExpression, SLOTS, type CustomExpression } from './index';

const joy = (id: string, unlockLevel = 1): CustomExpression => ({ id, label: id, slot: 'overjoyed', unlockLevel, url: `https://x/${id}.webp` });

describe('added expressions (slots)', () => {
  it('lists every built-in expression as a status or event slot', () => {
    expect(SLOTS).toHaveLength(12);
    expect(SLOTS.filter((s) => s.kind === 'event').map((s) => s.id)).toEqual(['memoryFlash', 'goalCelebration']);
  });

  it('picks at random among the built-in and the unlocked added ones', () => {
    const customs = [joy('a'), joy('b'), joy('late', 8)];
    const seen = new Set([0, 0.4, 0.7, 0.99].map((r) => pickVariant('overjoyed', 5, customs, true, () => r)?.id ?? 'built-in'));
    expect(seen).toEqual(new Set(['built-in', 'a', 'b']));
  });

  it('uses an added expression even when the built-in one is still locked', () => {
    expect(pickVariant('overjoyed', 2, [joy('early', 2)], false, () => 0)?.id).toBe('early');
    expect(pickVariant('overjoyed', 2, [], false)).toBeNull();
  });

  it('remembers the situation before a locked fallback', () => {
    const s = resolveExpression({ level: 2, momentum: 90, minutesToday: 100, goalMinutes: 100, session: 'idle', examInDays: null, isSleepPeriod: false, brief: null });
    expect(s).toMatchObject({ id: 'slightlyHappy', slot: 'overjoyed' }); // Overjoyed unlocks at 5
  });

  it('connects dialogue to expressions', () => {
    const lines = [{ expression: 'custom:a', text: 'Mine!' }, { expression: 'overjoyed', text: 'Extra line' }];
    expect(customLines(joy('a'), lines, ['slot line'])).toEqual(['Mine!']);
    expect(customLines(joy('b'), lines, ['slot line'])).toEqual(['slot line']);
    expect(addedLinesFor('overjoyed', lines)).toEqual(['Extra line']);
  });
});
