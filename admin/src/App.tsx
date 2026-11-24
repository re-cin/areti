import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useAuth } from './lib/auth';
import { Controls } from './pages/Controls';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Pet } from './pages/Pet';
import { Reti } from './pages/Reti';
import { UserDetail } from './pages/UserDetail';
import { Users } from './pages/Users';

export function App() {
  const { state } = useAuth();
  if (state.status === 'loading') {
    return <div className="center"><div className="spinner" /></div>;
  }
  if (state.status === 'signedOut') return <Login notice={state.notice} />;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/users" element={<Users />} />
        <Route path="/users/:id" element={<UserDetail />} />
        <Route path="/pet" element={<Pet />} />
        <Route path="/pet/test" element={<Reti />} />
        <Route path="/reti" element={<Navigate to="/pet" replace />} />
        <Route path="/controls" element={<Controls />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
