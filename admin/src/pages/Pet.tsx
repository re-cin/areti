import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmModal } from '../components/ConfirmModal';
import { Dropdown } from '../components/Dropdown';
import { Icon } from '../components/Icon';
import { StillImage } from '../components/StillImage';
import {
  addPetDialogue, addPetExpression, deletePetDialogue, deletePetExpression, listPetDialogues, listPetExpressions,
  setPetDialogueEnabled, updatePetExpression, type PetExpressionRow,
} from '../lib/petContent';
import { useAsync } from '../lib/useAsync';
import { DIALOGUE } from '../../../src/features/pet/dialogue';
import { EXPRESSIONS } from '../../../src/features/pet/expressions';
import { SLOTS, type SlotKind } from '../../../src/features/pet/slots';
import type { ExpressionId } from '../../../src/features/pet/types';

/** Unlock levels are whole numbers from 1 up (no fixed top level). */
const MAX_UNLOCK_LEVEL = 999;
const validLevel = (v: string) => /^\d+$/.test(v.trim()) && Number(v) >= 1 && Number(v) <= MAX_UNLOCK_LEVEL;

/** Typable level box with up/down arrows. Saves on Enter or when it loses focus (list rows). */
function LevelInput({ value, onChange, onCommit, small }: { value: string; onChange: (v: string) => void; onCommit?: () => void; small?: boolean }) {
  return (
    <input className={`input level-input${small ? ' sm' : ''}${validLevel(value) ? '' : ' invalid'}`} type="number" inputMode="numeric"
      min={1} max={MAX_UNLOCK_LEVEL} step={1} value={value} aria-label="Unlock level"
      onChange={(e) => onChange(e.target.value)} onBlur={onCommit}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
  );
}

/** A list row's level: edit freely, saved when it is a valid level and different. */
function RowLevel({ row, onSave }: { row: PetExpressionRow; onSave: (level: number) => Promise<void> }) {
  const [v, setV] = useState(String(row.unlock_level));
  const commit = () => {
    if (validLevel(v) && Number(v) !== row.unlock_level) void onSave(Number(v));
    else if (!validLevel(v)) setV(String(row.unlock_level));
  };
  return <span className="row-level">Lv <LevelInput small value={v} onChange={setV} onCommit={commit} /></span>;
}
const slotOptions = (kind: SlotKind) => SLOTS.filter((s) => s.kind === kind).map((s) => ({ value: s.id, label: s.label }));
const errorText = (e: unknown) => (e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e));

/** Pet tab: the expressions and dialogue the app has, and the ones admins add. "Test pet" opens the test tools. */
export function Pet() {
  const expressions = useAsync(listPetExpressions);
  const dialogues = useAsync(listPetDialogues);
  const added = expressions.data ?? [];
  const lines = dialogues.data ?? [];

  // ---- Add an expression ----
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState('');
  const [kind, setKind] = useState<SlotKind>('status');
  const [slot, setSlot] = useState<ExpressionId>('overjoyed');
  const [level, setLevel] = useState('1');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const [removing, setRemoving] = useState<PetExpressionRow | null>(null);

  const pickFile = (f: File | null) => {
    setFormError(null);
    if (f && f.type !== 'image/webp' && !f.name.toLowerCase().endsWith('.webp')) { setFormError('Choose a looping .webp file.'); return; }
    setFile(f);
    if (f && !label.trim()) {
      const base = f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
      setLabel((base.charAt(0).toUpperCase() + base.slice(1)).slice(0, 40));
    }
  };
  const chooseKind = (k: SlotKind) => { setKind(k); setSlot(slotOptions(k)[0].value); };
  const upload = async () => {
    if (!file || !label.trim()) return;
    setBusy(true);
    setFormError(null);
    try {
      if (!validLevel(level)) throw new Error('Unlock level must be a whole number of 1 or more.');
      await addPetExpression(file, label.trim(), slot, Number(level));
      setFile(null);
      setLabel('');
      if (fileRef.current) fileRef.current.value = '';
      await expressions.reload();
    } catch (e) {
      setFormError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  // ---- Dialogue ----
  const expressionOptions = useMemo(() => [
    ...EXPRESSIONS.map((e) => ({ value: e.id as string, label: `${e.label} (built-in)` })),
    ...added.map((r) => ({ value: `custom:${r.id}`, label: `${r.label} (added, ${SLOTS.find((s) => s.id === r.slot)?.label})` })),
  ], [added]);
  const [lineFor, setLineFor] = useState('neutral');
  const [newLine, setNewLine] = useState('');
  const [lineError, setLineError] = useState<string | null>(null);
  const builtInLines = (DIALOGUE as Record<string, readonly string[]>)[lineFor] ?? [];
  const addedLines = lines.filter((l) => l.expression_key === lineFor);
  const linesCount = (key: string) => lines.filter((l) => l.expression_key === key).length + ((DIALOGUE as Record<string, readonly string[]>)[key]?.length ?? 0);
  const addLine = async () => {
    setLineError(null);
    try {
      await addPetDialogue(lineFor, newLine);
      setNewLine('');
      await dialogues.reload();
    } catch (e) {
      setLineError(errorText(e));
    }
  };
  const showLines = (key: string) => {
    setLineFor(key);
    document.getElementById('dialogue')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Pet</h1>
          <p>Expressions and dialogue for the study pet. Added ones reach the app the next time it is opened.</p>
        </div>
        <Link className="btn btn-peach" to="/pet/test"><Icon name="activity" size={16} /> Test pet</Link>
      </div>

      <div className="section-title"><Icon name="ghost" size={20} /> Expressions</div>
      <div className="controls-grid">
        <div className="neo card">
          <div className="card-head">
            <div>
              <h2>Add an expression</h2>
              <div className="sub">A looping animated WebP of the whole pet, up to 5 MB</div>
            </div>
          </div>
          <label className={`drop-zone${file ? ' has-file' : ''}`} onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0] ?? null); }}>
            <input ref={fileRef} type="file" accept="image/webp,.webp" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
            {previewUrl ? <img className="pet-thumb lg" src={previewUrl} alt="" /> : <Icon name="upload" size={26} />}
            <b>{file ? file.name : 'Choose a .webp animation'}</b>
            <span className="muted small">{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB · click to change` : 'or drag it here'}</span>
          </label>
          <label className="field">
            <span className="label">Name</span>
            <input className="input" value={label} maxLength={40} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Happy dance" />
          </label>
          <div className="field">
            <span className="label">Shows on</span>
            <div className="seg" role="tablist">
              <button className={kind === 'status' ? 'on' : ''} onClick={() => chooseKind('status')}>Status</button>
              <button className={kind === 'event' ? 'on' : ''} onClick={() => chooseKind('event')}>Event</button>
              <button disabled title="Coming later" className="locked"><Icon name="lock" size={12} /> Custom conditions</button>
            </div>
          </div>
          <div className="field">
            <span className="label">{kind === 'status' ? 'Status' : 'Event'}</span>
            <Dropdown<string> value={slot} onChange={(v) => setSlot(v as ExpressionId)} options={slotOptions(kind)} />
            <span className="muted small">{SLOTS.find((s) => s.id === slot)?.when}</span>
          </div>
          <div className="field">
            <span className="label">Unlocks at</span>
            <LevelInput value={level} onChange={setLevel} />
            <span className="muted small">Any level from 1 up. Type it or use the arrows.</span>
          </div>
          {formError && <div className="error">{formError}</div>}
          <button className="btn" style={{ width: '100%', marginTop: 20 }} onClick={() => void upload()} disabled={busy || !file || !label.trim() || !validLevel(level)}>
            <Icon name="plus" size={16} strokeWidth={2.5} /> {busy ? 'Uploading…' : 'Add expression'}
          </button>
          <p className="muted small" style={{ marginTop: 12 }}>
            When that status or event comes up, the app picks at random between the built-in expression and every added one
            that is unlocked.
          </p>
        </div>

        <div className="neo card">
          <div className="card-head">
            <div>
              <h2>All expressions</h2>
              <div className="sub">Grouped by when they show</div>
            </div>
          </div>
          {expressions.error && <div className="error">Could not load expressions: {expressions.error}. Run supabase/migrations/20261124130000_pet_content.sql in the Supabase SQL editor.</div>}
          {(['status', 'event'] as SlotKind[]).map((k) => (
            <div key={k}>
              <div className="label" style={{ margin: '6px 0 4px' }}>{k === 'status' ? 'Statuses' : 'Events'}</div>
              {SLOTS.filter((s) => s.kind === k).map((s) => {
                const builtIn = EXPRESSIONS.find((e) => e.id === s.id)!;
                const mine = added.filter((r) => r.slot === s.id);
                return (
                  <div className="slot-group" key={s.id}>
                    <div className="music-row">
                      {/* The app's own still thumbnail: first frame of the calm body with this face. */}
                      <img className="pet-thumb" src={`/pet/thumbs/${s.id}.svg`} alt="" />
                      <div className="grow">
                        <div className="t">{s.label}</div>
                        <div className="s">{s.when} · Level {builtIn.unlockLevel}</div>
                      </div>
                      <button className="btn btn-sm btn-cream" onClick={() => showLines(s.id)}>{linesCount(s.id)} lines</button>
                      <span className="badge badge-user">Built-in</span>
                    </div>
                    {mine.map((r) => (
                      <div className={`music-row added${r.enabled ? '' : ' off'}`} key={r.id}>
                        <StillImage className="pet-thumb" src={r.url} />
                        <div className="grow">
                          <div className="t">{r.label}</div>
                          <div className="s">Unlocks at level {r.unlock_level}{r.enabled ? '' : ' · hidden from the app'}</div>
                        </div>
                        <RowLevel key={`${r.id}:${r.unlock_level}`} row={r} onSave={(lv) => updatePetExpression(r.id, { unlock_level: lv }).then(expressions.reload)} />
                        <button className="btn btn-sm btn-cream" onClick={() => showLines(`custom:${r.id}`)}>{linesCount(`custom:${r.id}`)} lines</button>
                        <button className={`switch${r.enabled ? ' on' : ''}`} aria-pressed={r.enabled} title={r.enabled ? 'Shown in the app' : 'Hidden from the app'}
                          onClick={() => void updatePetExpression(r.id, { enabled: !r.enabled }).then(expressions.reload)}><span /></button>
                        <button className="icon-btn danger" onClick={() => setRemoving(r)} aria-label={`Delete ${r.label}`}><Icon name="trash" size={15} /></button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <hr className="pet-divider" />
      <div className="section-title" id="dialogue"><Icon name="list" size={20} /> Dialogue</div>
      <div className="controls-grid">
        <div className="neo card">
          <div className="card-head">
            <div>
              <h2>Add a line</h2>
              <div className="sub">The pet says it while showing this expression</div>
            </div>
          </div>
          <div className="field">
            <span className="label">Expression</span>
            <Dropdown<string> value={lineFor} onChange={setLineFor} options={expressionOptions} />
          </div>
          <label className="field">
            <span className="label">Line</span>
            <textarea className="input pet-line-input" rows={3} value={newLine} maxLength={120} onChange={(e) => setNewLine(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void addLine(); } }}
              placeholder="e.g. One more block, then a snack!" />
            <span className="muted small">{newLine.length} / 120 · Enter adds the line</span>
          </label>
          {lineError && <div className="error">{lineError}</div>}
          <button className="btn" style={{ width: '100%', marginTop: 20 }} onClick={() => void addLine()} disabled={!newLine.trim()}>
            <Icon name="plus" size={16} strokeWidth={2.5} /> Add line
          </button>
          <p className="muted small" style={{ marginTop: 12 }}>
            An added expression with no lines of its own uses the lines of its status or event.
          </p>
        </div>

        <div className="neo card">
          <div className="card-head">
            <div>
              <h2>Lines</h2>
              <div className="sub">{expressionOptions.find((o) => o.value === lineFor)?.label}</div>
            </div>
          </div>
          {dialogues.error && <div className="error">Could not load dialogue: {dialogues.error}</div>}
          {addedLines.map((l) => (
            <div className={`music-row${l.enabled ? '' : ' off'}`} key={l.id}>
              <div className="grow"><div className="t" style={{ whiteSpace: 'normal' }}>“{l.line}”</div></div>
              <button className={`switch${l.enabled ? ' on' : ''}`} aria-pressed={l.enabled} title={l.enabled ? 'Used in the app' : 'Hidden from the app'}
                onClick={() => void setPetDialogueEnabled(l.id, !l.enabled).then(dialogues.reload)}><span /></button>
              <button className="icon-btn danger" aria-label="Delete line" onClick={() => void deletePetDialogue(l.id).then(dialogues.reload)}><Icon name="trash" size={15} /></button>
            </div>
          ))}
          {builtInLines.length > 0 && <div className="label" style={{ margin: addedLines.length ? '18px 0 2px' : '4px 0 2px' }}>Built into the app</div>}
          {builtInLines.map((l) => (
            <div className="music-row" key={l}>
              <div className="grow"><div className="t" style={{ whiteSpace: 'normal' }}>“{l}”</div></div>
              <span className="badge badge-user">Built-in</span>
            </div>
          ))}
          {builtInLines.length === 0 && addedLines.length === 0 && <div className="muted small">No lines yet: it uses the lines of its status or event.</div>}
        </div>
      </div>

      {removing && (
        <ConfirmModal
          title="Delete this expression?"
          message={<><b style={{ color: 'var(--ink)' }}>{removing.label}</b> and its lines will be removed from the app for everyone.</>}
          confirmLabel="Delete"
          danger
          onConfirm={async () => { await deletePetExpression(removing); setRemoving(null); await Promise.all([expressions.reload(), dialogues.reload()]); }}
          onClose={() => setRemoving(null)}
        />
      )}
    </>
  );
}
