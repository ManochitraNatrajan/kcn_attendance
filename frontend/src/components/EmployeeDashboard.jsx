import React, { useState, useEffect } from 'react';
import { LogOut, Clock, CheckCircle, ArrowLeft } from 'lucide-react';
import { api } from '../utils/api';

const EmployeeDashboard = ({ user }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [todayRecord, setTodayRecord] = useState(null);
  const [isPast545PM, setIsPast545PM] = useState(false);
  const [isPost940AM, setIsPost940AM] = useState(false);
  const [currentDateStr, setCurrentDateStr] = useState(new Date().toLocaleDateString("en-US", {timeZone: "Asia/Kolkata"}));

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => {
        const istTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
        const mins = istTime.getHours() * 60 + istTime.getMinutes();
        setIsPost940AM(mins >= 580);
        setIsPast545PM(mins >= 1065);
        
        const newDateStr = istTime.toLocaleDateString("en-US", {timeZone: "Asia/Kolkata"});
        if (newDateStr !== currentDateStr) {
          setCurrentDateStr(newDateStr);
          fetchData();
        }
    }, 1000);
    return () => clearInterval(timer);
  }, [currentDateStr]);

  useEffect(() => {
    if (isPast545PM && todayRecord && !todayRecord.checkOutTime) {
      api.post('/attendance/auto-checkout', { employeeId: user.employeeId })
        .then(() => fetchData())
        .catch(console.error);
    }
  }, [isPast545PM, todayRecord, user.employeeId]);

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
  const isAbsent = !todayRecord && isPast545PM;

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
                {!isCheckedIn && !isCheckedOut && !isPast545PM && (
                  <button className="btn" style={{ backgroundColor: isPost940AM ? 'var(--success)' : '#9CA3AF', color: 'white', fontSize: '1.25rem', padding: '20px', opacity: isPost940AM ? 1 : 0.5 }} onClick={() => handleCheck('check-in')} disabled={submitting || !isPost940AM}>
                    <Clock size={24} style={{ marginRight: '10px' }}/> {isPost940AM ? 'CHECK IN NOW' : 'OPENS AT 9:40 AM'}
                  </button>
                )}

                {!isCheckedIn && !isCheckedOut && isPast545PM && (
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
                  isPast545PM ? (
                    <div style={{ background: '#ECFDF5', border: '2px solid #34D399', padding: '24px', borderRadius: '12px', color: '#065F46', fontWeight: '700', fontSize: '1.1rem', textAlign: 'left' }}>
                      <CheckCircle size={36} style={{ margin: '0 auto 12px', display: 'block', color: 'var(--success)' }} />
                      <div style={{ textAlign: 'center', marginBottom: '16px' }}>Completed Attendance for Today</div>
                      <div style={{ fontSize: '0.95rem', background: 'rgba(255,255,255,0.7)', padding: '12px', borderRadius: '8px' }}>
                        <p style={{ margin: '4px 0' }}><strong>Check-in:</strong> {new Date(todayRecord.checkInTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}</p>
                        <p style={{ margin: '4px 0' }}><strong>Check-out:</strong> Pending Auto-checkout...</p>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ background: '#F3F4F6', border: '1px solid #D1D5DB', padding: '16px', borderRadius: '12px', color: '#374151', fontSize: '1rem', textAlign: 'left' }}>
                        <p style={{ margin: '4px 0' }}><strong>Check-in Time:</strong> {new Date(todayRecord.checkInTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}</p>
                      </div>
                      <button className="btn" style={{ backgroundColor: '#EF4444', color: 'white', fontSize: '1.25rem', padding: '20px' }} onClick={() => handleCheck('check-out')} disabled={submitting}>
                        <LogOut size={24} style={{ marginRight: '10px' }}/> CHECK OUT NOW
                      </button>
                    </div>
                  )
                )}

                {isCheckedOut && (
                  <div style={{ background: '#ECFDF5', border: '2px solid #34D399', padding: '24px', borderRadius: '12px', color: '#065F46', fontWeight: '700', fontSize: '1.1rem', textAlign: 'left' }}>
                    <CheckCircle size={36} style={{ margin: '0 auto 12px', display: 'block', color: 'var(--success)' }} />
                    <div style={{ textAlign: 'center', marginBottom: '16px' }}>Completed Attendance for Today</div>
                    <div style={{ fontSize: '0.95rem', background: 'rgba(255,255,255,0.7)', padding: '12px', borderRadius: '8px' }}>
                      <p style={{ margin: '4px 0' }}><strong>Check-in:</strong> {new Date(todayRecord.checkInTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}</p>
                      <p style={{ margin: '4px 0' }}><strong>Check-out:</strong> {new Date(todayRecord.checkOutTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}</p>
                      <hr style={{ margin: '12px 0', borderColor: 'rgba(52, 211, 153, 0.3)' }} />
                      <p style={{ margin: '4px 0' }}><strong>Hours Worked:</strong> {todayRecord.workedHours} hr</p>
                      <p style={{ margin: '4px 0' }}><strong>Daily Salary:</strong> ₹{todayRecord.dailySalary != null ? parseFloat(todayRecord.dailySalary).toFixed(2) : '0.00'}</p>
                    </div>
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
