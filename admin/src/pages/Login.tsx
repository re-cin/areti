import { useState } from 'react';
import { useAuth } from '../lib/auth';

export function Login({ notice }: { notice?: string }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <div className="login-art">
        <img className="m" src="/mascot.png" alt="" />
        <h2>areti admin</h2>
        <p>Keep an eye on how students are studying and manage their subscriptions.</p>
      </div>
      <div className="login-form">
        <form className="neo neo-lg login-card" onSubmit={submit}>
          <img src="/wordmark.svg" alt="areti" style={{ height: 36, marginBottom: 18 }} />
          <h1>Sign in</h1>
          <p className="muted" style={{ marginTop: 6, fontWeight: 500 }}>Admins only. Use your areti account.</p>
          <label className="field">
            <span className="label">Email</span>
            <input className="input" type="email" autoComplete="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>
          <label className="field">
            <span className="label">Password</span>
            <input className="input" type="password" autoComplete="current-password" required value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </label>
          {(error || notice) && <div className="error">{error ?? notice}</div>}
          <button className="btn" type="submit" disabled={busy} style={{ width: '100%', marginTop: 24 }}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
