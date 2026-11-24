import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

type Props = { disabled: boolean; onChange: (disabled: boolean) => void; readOnly?: boolean };

/** Active / Disabled pill that opens a small menu, in the app's style (not the browser's own dropdown). */
export function StatusSelect({ disabled, onChange, readOnly }: Props) {
  const [open, setOpen] = useState(false);
  // Fixed position from the button, so the table's scroll box can't cut the menu off.
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    window.addEventListener('scroll', () => setOpen(false), { once: true, capture: true });
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  const label = disabled ? 'Disabled' : 'Active';
  if (readOnly) return <span className={`status-pill ${disabled ? 'off' : 'on'} readonly`} title="You can’t change your own account">{label}</span>;

  const pick = (next: boolean) => {
    setOpen(false);
    if (next !== disabled) onChange(next);
  };

  return (
    <div className="status-select" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button className={`status-pill ${disabled ? 'off' : 'on'}`} onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const below = window.innerHeight - r.bottom > 110;
          setPos({ top: below ? r.bottom + 6 : r.top - 6 - 96, left: r.left });
          setOpen((o) => !o);
        }} aria-haspopup="listbox" aria-expanded={open}>
        {label}
        <Icon name="chevronDown" size={13} strokeWidth={2.5} />
      </button>
      {open && (
        <div className="status-menu neo" role="listbox" style={pos ?? undefined}>
          <button role="option" aria-selected={!disabled} className={!disabled ? 'sel' : ''} onClick={() => pick(false)}>
            <span className="dot" style={{ background: 'var(--teal)' }} /> Active
          </button>
          <button role="option" aria-selected={disabled} className={disabled ? 'sel' : ''} onClick={() => pick(true)}>
            <span className="dot" style={{ background: 'var(--dangerSoft)' }} /> Disabled
          </button>
        </div>
      )}
    </div>
  );
}
