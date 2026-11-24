import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

type Option<T extends string> = { value: T; label: string; count?: number };

/** A dropdown in the app's style (outlined, hard shadow), used instead of the browser's own select. */
export function Dropdown<T extends string>({ value, options, onChange, label }: {
  value: T; options: Option<T>[]; onChange: (v: T) => void; label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  return (
    <div className="dropdown" ref={ref}>
      <button className="dropdown-btn" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}>
        {label && <span className="label">{label}</span>}
        <span className="dropdown-value">{current.label}</span>
        {current.count !== undefined && <span className="dropdown-count">{current.count}</span>}
        <Icon name={open ? 'chevronUp' : 'chevronDown'} size={16} strokeWidth={2.5} />
      </button>
      {open && (
        <div className="dropdown-menu neo" role="listbox">
          {options.map((o) => (
            <button key={o.value} role="option" aria-selected={o.value === value} className={o.value === value ? 'sel' : ''}
              onClick={() => { setOpen(false); onChange(o.value); }}>
              <span>{o.label}</span>
              {o.count !== undefined && <span className="dropdown-count">{o.count}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
