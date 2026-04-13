import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import EmployeeDashboard from './components/EmployeeDashboard';
import AdminPanel from './components/AdminPanel';
import { api } from './utils/api';
import './index.css';

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('kcn_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('kcn_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('kcn_user');
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-color)' }}>
      <nav style={{ 
        background: 'linear-gradient(135deg, var(--primary), var(--secondary))', 
        borderBottom: 'none', 
        padding: '12px var(--mobile-padding)', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        boxShadow: 'none',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/logo.png" alt="KCN" style={{ height: '40px', objectFit: 'contain' }} onError={(e) => e.target.style.display = 'none'} />
          <h1 style={{ margin: 0, fontSize: '1.25rem', color: 'white', letterSpacing: '-0.5px' }}>KCN Attendance</h1>
        </div>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="hidden-mobile" style={{ fontWeight: '700', fontSize: '1rem', color: 'white' }}>Welcome, {user.name}!</div>
            <button onClick={handleLogout} className="btn" style={{ width: 'auto', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}>Log Out</button>
          </div>
        )}
      </nav>

      <div style={{ minHeight: '100%' }}>
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
