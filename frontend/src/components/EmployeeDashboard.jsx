import React, { useState, useEffect } from 'react';
import { LogOut, Clock, CheckCircle, ArrowLeft } from 'lucide-react';
import { api } from '../utils/api';

const EmployeeDashboard = ({ user }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [todayRecord, setTodayRecord] = useState(null);
  const [isPastSix, setIsPastSix] = useState(false);

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => {
        const istTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
        setIsPastSix(istTime.getHours() >= 18);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    try {
      const statsData = await api.get('/attendance/stats');
      setStats(statsData);

      const allAtt = await api.get('/attendance');
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      const meToday = allAtt.find(a => a.employeeId.toUpperCase() === user.employeeId.toUpperCase() && a.date === today);
      setTodayRecord(meToday || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = async (type) => {
    setSubmitting(true);
    try {
      await api.post('/attendance', {
        employeeId: user.employeeId,
        type,
        timestamp: new Date().toISOString()
      });
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isCheckedIn = todayRecord && !todayRecord.checkOutTime;
  const isCheckedOut = todayRecord && todayRecord.checkOutTime;
  const isAbsent = !todayRecord && isPastSix;

  if (loading) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--primary)' }}>Loading Dashboard...</div>;

  return (
    <div style={{ backgroundColor: 'var(--bg-color)', display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)' }}>
      <div className="mobile-tabs">
         <button onClick={() => setActiveTab('dashboard')} style={{ background: 'none', border: 'none', borderBottom: activeTab === 'dashboard' ? '4px solid var(--primary)' : '4px solid transparent', fontWeight: 'bold', color: activeTab === 'dashboard' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }}>Dashboard</button>
         <button onClick={() => setActiveTab('attendance')} style={{ background: 'none', border: 'none', borderBottom: activeTab === 'attendance' ? '4px solid var(--primary)' : '4px solid transparent', fontWeight: 'bold', color: activeTab === 'attendance' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }}>Attendance</button>
      </div>

      <div style={{ padding: '0 var(--mobile-padding)', maxWidth: '1000px', margin: '24px auto', width: '100%', boxSizing: 'border-box' }}>
        {activeTab === 'dashboard' && (
          <div>
            <h2 className="mb-4" style={{ fontSize: '1.5rem' }}>Today's Statistics</h2>
            <div className="grid-cols-3 mb-4">
              <div className="stat-box">
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">Total Members</div>
              </div>
              <div className="stat-box" style={{ borderTopColor: 'var(--success)' }}>
                <div className="stat-value" style={{ color: 'var(--success)' }}>{stats.present}</div>
                <div className="stat-label">Present</div>
              </div>
              <div className="stat-box" style={{ borderTopColor: 'var(--danger)' }}>
                <div className="stat-value" style={{ color: 'var(--danger)' }}>{stats.absent}</div>
                <div className="stat-label">Absent</div>
              </div>
            </div>

            <div style={{ marginTop: '48px', display: 'flex', justifyContent: 'center' }}>
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', maxWidth: '300px', padding: '18px 24px', fontSize: '1.25rem', borderRadius: '50px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} 
                onClick={() => setActiveTab('attendance')}>
                MARK ATTENDANCE
              </button>
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
               <button className="btn-secondary" style={{ width: '40px', height: '40px', padding: 0, borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'white', border: '1px solid var(--border)' }} onClick={() => setActiveTab('dashboard')}>
                  <ArrowLeft size={20} color="var(--text-main)" />
               </button>
               <h2 style={{ margin: 0, fontSize: '1.5rem' }}>My Attendance</h2>
            </div>
            <div className="card text-center" style={{ padding: '48px 24px', marginTop: '16px' }}>
              <h3 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>Attendance Interface</h3>
              <p className="text-muted mb-4" style={{ marginBottom: '32px' }}>Verify your presence for {new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' })}</p>

              <div style={{ maxWidth: '400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {!isCheckedIn && !isCheckedOut && !isPastSix && (
                  <button className="btn" style={{ backgroundColor: 'var(--success)', color: 'white', fontSize: '1.25rem', padding: '20px' }} onClick={() => handleCheck('check-in')} disabled={submitting}>
                    <Clock size={24} style={{ marginRight: '10px' }}/> CHECK IN NOW
                  </button>
                )}

                {!isCheckedIn && !isCheckedOut && isPastSix && (
                  <div className="flex-col gap-2">
                    <button className="btn" style={{ backgroundColor: 'var(--success)', color: 'white', fontSize: '1.25rem', padding: '20px', opacity: 0.5 }} disabled={true}>
                      CHECK IN CLOSED
                    </button>
                    <div style={{ background: '#FEF2F2', border: '1px solid #F87171', padding: '24px', borderRadius: '12px', color: '#991B1B', fontWeight: '700', fontSize: '1.2rem', marginTop: '16px' }}>
                      Absent for today
                    </div>
                  </div>
                )}

                {isCheckedIn && (
                  isPastSix ? (
                    <div style={{ background: '#ECFDF5', border: '2px solid #34D399', padding: '24px', borderRadius: '12px', color: '#065F46', fontWeight: '700', fontSize: '1.1rem' }}>
                      <CheckCircle size={36} style={{ margin: '0 auto 12px', display: 'block', color: 'var(--success)' }} />
                      Completed attendance for today
                    </div>
                  ) : (
                    <button className="btn" style={{ backgroundColor: '#EF4444', color: 'white', fontSize: '1.25rem', padding: '20px' }} onClick={() => handleCheck('check-out')} disabled={submitting}>
                      <LogOut size={24} style={{ marginRight: '10px' }}/> CHECK OUT NOW
                    </button>
                  )
                )}

                {isCheckedOut && (
                  <div style={{ background: '#ECFDF5', border: '2px solid #34D399', padding: '24px', borderRadius: '12px', color: '#065F46', fontWeight: '700', fontSize: '1.1rem' }}>
                    <CheckCircle size={36} style={{ margin: '0 auto 12px', display: 'block', color: 'var(--success)' }} />
                    Completed attendance for today
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDashboard;
