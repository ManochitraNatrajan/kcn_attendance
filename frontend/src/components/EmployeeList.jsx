import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Settings, Clock, CheckCircle2 } from 'lucide-react';
import { api } from '../utils/api';

const EmployeeList = ({ employees, onRefresh }) => {
  const navigate = useNavigate();
  const [attendance, setAttendance] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    onRefresh();
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    api.get(`/attendance?date=${today}`).then(setAttendance).catch(() => {});
  }, []);

  const getStatus = (empId) => {
    const record = attendance.find(a => a.employeeId === empId);
    if (!record) return { label: 'Not Checked In', color: 'var(--text-muted)' };
    if (!record.checkOutTime) return { label: 'Working', color: 'var(--success)' };
    return { label: 'Checked Out', color: 'var(--secondary)' };
  };

  const presentCount = attendance.filter(a => !a.checkOutTime).length;
  
  const filtered = employees.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="container" style={{ padding: 0 }}>
      <div className="header">
        <h1>KCN Insurance</h1>
        <p>{new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long', month: 'short', day: 'numeric' })}</p>
        
        <div className="flex gap-4 w-full mt-4" style={{ background: 'rgba(255,255,255,0.1)', padding: '16px', borderRadius: '16px' }}>
          <div className="text-center" style={{ flex: 1 }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{employees.length}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>Total</div>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.2)' }}></div>
          <div className="text-center" style={{ flex: 1 }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{presentCount}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>Present Today</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 20px' }}>
        <div className="flex justify-between items-center mb-4">
          <h2 style={{ fontSize: '1.25rem' }}>Select Profile</h2>
          <button onClick={() => navigate('/admin')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <Settings size={28} />
          </button>
        </div>
        
        <div className="input-group mb-4">
          <input 
            type="text" 
            placeholder="Search employee by name..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-col gap-3">
          {filtered.map(emp => {
            const status = getStatus(emp.employeeId);
            return (
              <Link to={`/check/${emp.employeeId}`} key={emp.id} style={{ textDecoration: 'none' }}>
                <div className="card flex items-center justify-between" style={{ margin: 0, padding: '20px 16px', transition: 'transform 0.1s' }}>
                  <div className="flex items-center gap-4">
                    <div style={{ width: 56, height: 56, borderRadius: '28px', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '1.1rem', color: 'var(--text-main)' }}>{emp.name}</div>
                      <div style={{ fontSize: '0.875rem', color: status.color, display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontWeight: '500' }}>
                        {status.label === 'Working' ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                        {status.label}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center mt-4 p-4" style={{ background: 'var(--card-bg)', borderRadius: '12px' }}>
              <p className="text-muted">No employees found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeList;
