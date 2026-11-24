import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Dropdown } from '../components/Dropdown';
import { Icon } from '../components/Icon';
import { addTestFocus, fetchRetiDetail, fetchUsers, removeTestFocus } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatMinutes } from '../lib/format';
import { minutesToGoal, minutesToNextLevel, retiView, streakBlocks, testBlock, type RetiDetail, type TestBlock } from '../lib/reti';
import { useAsync } from '../lib/useAsync';

type Tool = { label: string; hint: string; blocks: (d: RetiDetail) => TestBlock[] | string };

// Each tool adds ordinary focus-log rows marked as test data, so the phone reacts as it would to real study.
const TOOLS: Tool[] = [
  { label: '+25 min', hint: 'A finished 25-minute block, just now.', blocks: () => [testBlock(25)] },
  { label: '+10 min ended early', hint: 'Gives XP, but the day does not count for the streak.', blocks: () => [testBlock(10, false)] },
  {
    label: 'Next level',
    hint: 'Just enough finished minutes today to level up.',
    blocks: (d) => {
      const m = minutesToNextLevel(d);
      return m === null ? 'Max level, or today already has the 10-hour cap. Try "7-day streak" first.' : [testBlock(m)];
    },
  },
  {
    label: 'Fill daily goal',
    hint: 'Tops today up to the goal; the celebration plays once a day.',
    blocks: (d) => {
      const m = minutesToGoal(d);
      return m > 0 ? [testBlock(m)] : 'The goal is already reached today.';
    },
  },
  {
    label: '7-day streak',
    hint: 'A finished 30-minute block on each of the last 7 days that has none.',
    blocks: (d) => {
      const b = streakBlocks(d, 7);
      return b.length ? b : 'The last 7 days already have a finished block each.';
    },
  },
];

export function Reti() {
  const { state } = useAuth();
  const myId = state.status === 'signedIn' ? state.userId : '';
  const users = useAsync(fetchUsers);
  const [userId, setUserId] = useState('');
  const selected = userId || myId;
  const detail = useAsync(() => (selected ? fetchRetiDetail(selected) : Promise.resolve(null)), [selected]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const view = useMemo(() => (detail.data ? retiView(detail.data) : null), [detail.data]);

  // Only admin accounts are listed: the test tools work on admin accounts only (the database refuses others too).
  const options = (users.data ?? []).filter((u) => u.is_admin || u.id === myId)
    .map((u) => ({ value: u.id, label: u.id === myId ? `${u.email} (you)` : u.email }));
  if (selected && !options.some((o) => o.value === selected)) options.unshift({ value: selected, label: 'You' });

  const run = async (label: string, make: () => Promise<string>) => {
    setBusy(true);
    setNote(null);
    try {
      setNote(await make());
      await detail.reload();
    } catch (e) {
      setNote(`${label} failed: ${e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e)}`);
    } finally {
      setBusy(false);
    }
  };
  const applyTool = (t: Tool) => run(t.label, async () => {
    if (!detail.data) return 'Nothing loaded yet.';
    const blocks = t.blocks(detail.data);
    if (typeof blocks === 'string') return blocks;
    await addTestFocus(selected, blocks);
    const minutes = Math.round(blocks.reduce((a, b) => a + b.duration_sec, 0) / 60);
    return `${t.label}: added ${minutes} min of test focus time.`;
  });
  const clearTests = () => run('Remove test data', async () => {
    const n = await removeTestFocus(selected);
    return n ? `Removed ${n} test ${n === 1 ? 'block' : 'blocks'}. Real study is untouched.` : 'There was no test data.';
  });

  return (
    <>
      <Link className="back-link" to="/pet"><Icon name="chevronLeft" size={16} /> Pet</Link>
      <div className="page-head">
        <div>
          <h1>Test pet</h1>
          <p>See and test an admin account’s study pet without waiting for real focus time.</p>
        </div>
        {options.length > 0 && <Dropdown label="Admin" value={selected} options={options} onChange={setUserId} />}
      </div>

      {detail.error && <div className="neo card error">Could not load the pet: {detail.error}. Run supabase/migrations/20261124120000_admin_reti_tools.sql in the Supabase SQL editor, then reload.</div>}
      {detail.loading && !view && <div className="center" style={{ minHeight: 300 }}><div className="spinner" /></div>}
      {!detail.loading && !detail.error && !view && <div className="neo card">This user no longer exists.</div>}

      {view && (
        <div className="grid-2">
          <div className="neo card">
            <div className="card-head">
              <div>
                <h2>{view.name}</h2>
                <div className="sub">Worked out from the focus log with the app’s own rules</div>
              </div>
              <button className="btn btn-sm btn-cream" onClick={() => void detail.reload()} disabled={detail.loading}>
                <Icon name="sync" size={14} /> Refresh
              </button>
            </div>
            <div className="pet">
              <img src="/areti-icon.png" alt="" width={56} height={56} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>Level {view.level}{view.maxLevel ? ' (max)' : ''}</div>
                <div className="xp"><div style={{ width: `${Math.round(view.progress * 100)}%` }} /></div>
                <div className="muted small">
                  {view.maxLevel ? `${view.totalExp} EXP in total` : `${view.xp} / ${view.xpToNext} EXP to level ${view.level + 1} · ${view.totalExp} EXP in total`}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div className="kv"><span>Today</span><b>{formatMinutes(view.minutesToday)} of {formatMinutes(view.goalMinutes)} goal · +{view.expToday} EXP</b></div>
              <div className="kv"><span>Streak</span><b>{view.streakDays} {view.streakDays === 1 ? 'day' : 'days'}{view.streakDays >= 7 ? ' (×1.2 EXP)' : view.streakDays >= 3 ? ' (×1.1 EXP)' : ''}</b></div>
              <div className="kv"><span>Momentum</span><b>{view.momentum} / 100</b></div>
              <div className="kv"><span>Expressions unlocked</span><b>{view.unlocked.length}</b></div>
              <div className="kv"><span>Next unlock</span><b>{view.nextUnlock ? `${view.nextUnlock.labels.join(', ') || 'Nothing new'} at level ${view.nextUnlock.level}` : 'All unlocked'}</b></div>
              <div className="kv"><span>Test blocks in the log</span><b>{view.testBlocks}</b></div>
            </div>
          </div>

          <div className="neo card">
            <div className="card-head">
              <div>
                <h2>Test tools</h2>
                <div className="sub">Adds focus time marked as test data.</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {TOOLS.map((t) => (
                <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button className="btn btn-sm btn-peach" style={{ minWidth: 150 }} disabled={busy || detail.loading} onClick={() => void applyTool(t)}>
                    <Icon name="plus" size={14} /> {t.label}
                  </button>
                  <span className="muted small">{t.hint}</span>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
                <button className="btn btn-sm btn-cream" style={{ minWidth: 150 }} disabled={busy || detail.loading || view.testBlocks === 0} onClick={() => void clearTests()}>
                  <Icon name="trash" size={14} /> Remove test data
                </button>
                <span className="muted small">Deletes only the test blocks. Real study stays.</span>
              </div>
            </div>
            {note && <div className="small" style={{ marginTop: 14, fontWeight: 600 }}>{note}</div>}
            <p className="muted small" style={{ marginTop: 14 }}>
              The phone picks changes up at its next sync: within a minute while the app is open, or right away when it is
              reopened. The phone must be signed in to this account.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
