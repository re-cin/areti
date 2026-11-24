import { useState } from 'react';
import { Icon } from './Icon';

type Props = {
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  danger?: boolean;
  /** When set, the confirm button stays disabled until this exact text is typed. */
  typeToConfirm?: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
};

/** Small "are you sure?" dialog in the app's style. Shows the error if the action fails. */
export function ConfirmModal({ title, message, confirmLabel, danger, typeToConfirm, onConfirm, onClose }: Props) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = !typeToConfirm || typed.trim().toLowerCase() === typeToConfirm.toLowerCase();

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (e) {
      setError(e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e));
      setBusy(false);
    }
  };

  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="neo neo-lg modal confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <h3 id="confirm-title" style={{ flex: 1 }}>{title}</h3>
          <button className="icon-btn" style={{ background: 'var(--surface)' }} onClick={onClose} disabled={busy} aria-label="Close">
            <Icon name="close" size={16} strokeWidth={2.5} />
          </button>
        </div>
        <div className="muted" style={{ fontWeight: 500, marginTop: 8, lineHeight: 1.45 }}>{message}</div>
        {typeToConfirm && (
          <label className="field">
            <span className="label">Type <span style={{ color: 'var(--ink)', textTransform: 'none' }}>{typeToConfirm}</span> to confirm</span>
            <input className="input" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
          </label>
        )}
        {error && <div className="error">{error}</div>}
        <div className="modal-actions">
          <button className="btn btn-cream" onClick={onClose} disabled={busy}>Cancel</button>
          <button className={`btn ${danger ? 'btn-danger' : ''}`} onClick={confirm} disabled={busy || !ready}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
