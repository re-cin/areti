import { useRef, useState } from 'react';
import { ConfirmModal } from '../components/ConfirmModal';
import { Dropdown } from '../components/Dropdown';
import { Icon } from '../components/Icon';
import { PlayButton } from '../components/PlayButton';
import { BUILT_IN_SOUNDS } from '../lib/builtInSounds';
import { formatDate } from '../lib/format';
import { addMusic, deleteMusic, listMusic, setMusicEnabled } from '../lib/music';
import type { Music, MusicKind } from '../lib/types';
import { useAsync } from '../lib/useAsync';

export function Controls() {
  const { data, error, loading, reload } = useAsync(listMusic);
  const [kind, setKind] = useState<MusicKind>('background');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Music | null>(null);
  // Which list is shown on the right.
  const [view, setView] = useState<MusicKind>('background');
  const fileRef = useRef<HTMLInputElement>(null);

  const pickFile = (f: File | null) => {
    setFile(f);
    // Suggest a title from the file name ("lofi-night.mp3" -> "Lofi night").
    if (f && !title.trim()) {
      const base = f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
      setTitle(base.charAt(0).toUpperCase() + base.slice(1));
    }
  };

  const upload = async () => {
    if (!file || !title.trim()) return;
    if (file.size > 20 * 1024 * 1024) { setFormError('That file is bigger than 20 MB.'); return; }
    setBusy(true);
    setFormError(null);
    try {
      await addMusic(file, title.trim(), kind);
      setTitle('');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      await reload();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (m: Music) => {
    await setMusicEnabled(m.id, !m.enabled);
    void reload();
  };

  const uploaded = data ?? [];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Controls</h1>
          <p>Content and settings for the areti app.</p>
        </div>
      </div>

      <div className="section-title"><Icon name="music" size={20} /> Music</div>

      <div className="controls-grid">
        <div className="neo card">
          <div className="card-head">
            <div>
              <h2>Add music</h2>
              <div className="sub">MP3, M4A, WAV or OGG, up to 20 MB</div>
            </div>
          </div>

          <label
            className={`drop-zone${file ? ' has-file' : ''}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f && f.type.startsWith('audio/')) pickFile(f);
              else if (f) setFormError('That isn’t an audio file.');
            }}>
            <input ref={fileRef} type="file" accept="audio/*" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
            <Icon name={file ? 'music' : 'upload'} size={26} />
            <b>{file ? file.name : 'Choose an audio file'}</b>
            <span className="muted small">{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB · click to change` : 'or drag it here'}</span>
          </label>

          <label className="field">
            <span className="label">Title</span>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Midnight Lo-fi" />
          </label>
          <div className="field">
            <span className="label">Type</span>
            <Dropdown<MusicKind>
              value={kind}
              onChange={setKind}
              options={[
                { value: 'background', label: 'Background music' },
                { value: 'notification', label: 'Notification sound' },
              ]}
            />
          </div>

          {formError && <div className="error">{formError}</div>}
          <button className="btn" style={{ width: '100%', marginTop: 20 }} onClick={upload} disabled={busy || !file || !title.trim()}>
            <Icon name="plus" size={16} strokeWidth={2.5} /> {busy ? 'Uploading…' : 'Add music'}
          </button>
        </div>

        {[view].map((k) => {
            const mine = uploaded.filter((m) => m.kind === k);
            return (
              <div className="neo card" key={k}>
                <div className="card-head">
                  <div>
                    <h2>Sounds</h2>
                    <div className="sub">{k === 'background' ? 'Plays while students focus' : 'Plays when a session ends'}</div>
                  </div>
                  <Dropdown<MusicKind>
                    value={view}
                    onChange={(v) => { setView(v); setKind(v); }}
                    options={[
                      { value: 'background', label: 'Background music' },
                      { value: 'notification', label: 'Notification sounds' },
                    ]}
                  />
                </div>
                {error && <div className="error">Could not load music: {error}</div>}
                {loading && !data && <div className="center" style={{ padding: 20 }}><div className="spinner" /></div>}

                {mine.map((m) => (
                  <div className={`music-row${m.enabled ? '' : ' off'}`} key={m.id}>
                    <PlayButton url={m.url} label={m.title} />
                    <div className="grow">
                      <div className="t">{m.title}</div>
                      <div className="s">Added {formatDate(m.created_at)}{m.enabled ? '' : ' · hidden from the app'}</div>
                    </div>
                    <button className={`switch${m.enabled ? ' on' : ''}`} onClick={() => toggle(m)} aria-pressed={m.enabled}
                      title={m.enabled ? 'Shown in the app' : 'Hidden from the app'}>
                      <span />
                    </button>
                    <button className="icon-btn danger" onClick={() => setRemoving(m)} aria-label={`Delete ${m.title}`}>
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                ))}

                <div className="label" style={{ margin: mine.length ? '18px 0 2px' : '4px 0 2px' }}>Built into the app</div>
                {BUILT_IN_SOUNDS[k].map((s) => (
                  <div className="music-row" key={s.title}>
                    <PlayButton url={s.url} label={s.title} />
                    <div className="grow"><div className="t">{s.title}</div></div>
                    <span className="badge badge-user">Built-in</span>
                  </div>
                ))}
              </div>
            );
        })}
      </div>

      {removing && (
        <ConfirmModal
          title="Delete this music?"
          message={<><b style={{ color: 'var(--ink)' }}>{removing.title}</b> will be removed from the app for everyone.</>}
          confirmLabel="Delete"
          danger
          onConfirm={async () => { await deleteMusic(removing); setRemoving(null); void reload(); }}
          onClose={() => setRemoving(null)}
        />
      )}
    </>
  );
}
