import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Avatar } from './Avatar';
import { Icon } from './Icon';

export function Layout() {
  const { state, signOut } = useAuth();
  const email = state.status === 'signedIn' ? state.email : '';
  const demo = state.status === 'signedIn' && state.demo;
  return (
    <div className="shell">
      <div className="side-col">
      <aside className="sidebar">
        <div className="brand">
          <img className="wordmark" src="/wordmark.svg" alt="areti" />
          <span className="tag">Admin</span>
        </div>
        <nav className="nav">
          <NavLink to="/dashboard">
            <Icon name="dashboard" /> Dashboard
          </NavLink>
          <NavLink to="/users">
            <Icon name="users" /> Users
          </NavLink>
          <NavLink to="/reti">
            <Icon name="ghost" /> Reti
          </NavLink>
          <NavLink to="/controls">
            <Icon name="sliders" /> Controls
          </NavLink>
        </nav>
        <div className="mascot">
          <div className="me">
            <Avatar name={null} email={email} size={32} />
            <div className="who">
              <div style={{ fontWeight: 600 }}>{demo ? 'Demo mode' : 'Signed in'}</div>
              <div className="muted">{email}</div>
            </div>
            {!demo && (
              <button className="icon-btn" onClick={signOut} title="Sign out" aria-label="Sign out">
                <Icon name="logout" size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>
      </div>
      <main className="main">
        {demo && (
          <div className="demo-banner">
            <Icon name="activity" size={18} />
            Demo mode: showing sample data. Add your Supabase URL and key to <code>admin/.env</code> to see real users.
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
