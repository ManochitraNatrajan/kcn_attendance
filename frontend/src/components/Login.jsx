import React, { useState } from 'react';
import { api } from '../utils/api';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/login', { email, password, employeeId });
      if (res.success) {
        onLogin(res.user);
      }
    } catch (err) {
      setError(err.message || 'Invalid credentials. Check Email, Password, and ID.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', padding: '20px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '48px 32px', background: 'white', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
        <div style={{ textAlign: 'center', margin: '0 0 32px 0' }}>
          <img src="/logo.png" alt="KCN Logo" style={{ height: '120px', marginBottom: '16px', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
          <h2 style={{ fontSize: '2rem', color: 'var(--text-main)', marginBottom: '8px', letterSpacing: '-0.5px' }}>Member Portal</h2>
          <p className="text-muted" style={{ fontWeight: '500' }}>Sign in to securely log your attendance</p>
        </div>
        
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>Employee ID</label>
            <input required value={employeeId} onChange={e => setEmployeeId(e.target.value)} placeholder="e.g. EMP-001" />
          </div>
          <div className="input-group">
            <label>Email Address</label>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          
          {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: 'var(--danger)', padding: '12px', borderRadius: '8px', textAlign: 'center', margin: '16px 0', fontSize: '0.9rem', fontWeight: 'bold' }}>{error}</div>}
          
          <button type="submit" className="btn btn-primary" style={{ marginTop: '24px', fontSize: '1.1rem', padding: '18px' }} disabled={loading}>
            {loading ? 'AUTHENTICATING...' : 'SECURE SIGN IN'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
