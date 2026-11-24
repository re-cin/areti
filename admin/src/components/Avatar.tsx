import { useState } from 'react';
import { initials } from '../lib/format';

export function Avatar({ name, email, src, size = 38 }: { name: string | null; email: string; src?: string | null; size?: number }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.37 }}>
      {src && !broken ? <img src={src} alt="" onError={() => setBroken(true)} /> : initials(name, email)}
    </span>
  );
}
