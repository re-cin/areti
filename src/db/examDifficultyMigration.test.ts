const { DatabaseSync } = jest.requireActual('node:sqlite');
const { readFileSync } = jest.requireActual('node:fs');
const { join } = jest.requireActual('node:path');

it('moves legacy subject difficulty to every exam without losing plans or study history', () => {
  const sqlite = new DatabaseSync(':memory:');
  try {
    const migration = (name: string) => readFileSync(join(process.cwd(), 'drizzle', name), 'utf8');
    for (const name of ['0000_safe_hitman.sql', '0001_icy_diamondback.sql', '0002_accounts.sql', '0003_drop_local_accounts.sql']) sqlite.exec(migration(name));
    sqlite.exec(`
      INSERT INTO subjects (id, name, color, difficulty, updated_at) VALUES ('math', 'Math', '#ffffff', 5, 100);
      INSERT INTO study_plans (id, subject_id, exam_date, updated_at) VALUES ('quiz', 'math', 200, 100), ('final', 'math', 300, 100), ('orphan', 'missing', 300, 100);
      INSERT INTO planned_sessions (id, plan_id, subject_id, date, blocks, completed_blocks, updated_at) VALUES ('session', 'quiz', 'math', 100, 4, 2, 100);
    `);
    sqlite.exec(migration('0004_exam_difficulty.sql'));
    expect(sqlite.prepare('SELECT id, difficulty FROM study_plans ORDER BY id').all()).toEqual([
      { id: 'final', difficulty: 5 }, { id: 'orphan', difficulty: 3 }, { id: 'quiz', difficulty: 5 },
    ]);
    expect(sqlite.prepare('PRAGMA table_info(subjects)').all().some((column: { name: string }) => column.name === 'difficulty')).toBe(false);
    expect(sqlite.prepare('SELECT blocks, completed_blocks FROM planned_sessions').get()).toEqual({ blocks: 4, completed_blocks: 2 });
    expect(sqlite.prepare('SELECT MIN(updated_at) AS stamp FROM study_plans').get().stamp).toBeGreaterThan(100);
    sqlite.exec("UPDATE study_plans SET difficulty = 1 WHERE id = 'quiz'");
    expect(sqlite.prepare("SELECT difficulty FROM study_plans WHERE id = 'final'").get().difficulty).toBe(5);
  } finally { sqlite.close(); }
});
