import React, { useState } from 'react';
import Login from './components/Login';
import EmployeeDashboard from './components/EmployeeDashboard';
import AdminPanel from './components/AdminPanel';
import './index.css';

function App() {
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem('kcn_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (userData) => {
    setUser(userData);
    sessionStorage.setItem('kcn_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem('kcn_user');
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-color)' }}>
      <nav style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))', borderBottom: 'none', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img src="/logo.png" alt="KCN" style={{ height: '54px', objectFit: 'contain' }} onError={(e) => e.target.style.display = 'none'} />
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'white', letterSpacing: '-0.5px' }}>KCN Insurance</h1>
        </div>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ fontWeight: '700', fontSize: '1.1rem', color: 'white' }}>Welcome, {user.name}!</div>
            <button onClick={handleLogout} className="btn" style={{ width: 'auto', padding: '8px 16px', borderRadius: '8px', fontSize: '0.9rem', backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}>Log Out</button>
          </div>
        )}
      </nav>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {!user ? (
          <Login onLogin={handleLogin} />
        ) : user.role === 'admin' ? (
          <AdminPanel user={user} />
        ) : (
          <EmployeeDashboard user={user} />
        )}
      </div>
    </div>
  );
}

export default App;
