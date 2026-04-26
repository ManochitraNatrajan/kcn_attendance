import React, { useState, useEffect } from 'react';
import { LogOut, Clock, CheckCircle } from 'lucide-react';
import { api } from '../utils/api';

const EmployeeDashboard = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [todayRecord, setTodayRecord] = useState(null);
  const [isPast600PM, setIsPast600PM] = useState(false);
  const [isPost930AM, setIsPost930AM] = useState(false);
  const [currentDateStr, setCurrentDateStr] = useState(new Date().toLocaleDateString("en-US", {timeZone: "Asia/Kolkata"}));

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => {
        const istTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
        const mins = istTime.getHours() * 60 + istTime.getMinutes();
        setIsPost930AM(mins >= 570);
        setIsPast600PM(mins >= 1080);
        
        const newDateStr = istTime.toLocaleDateString("en-US", {timeZone: "Asia/Kolkata"});
        if (newDateStr !== currentDateStr) {
          setCurrentDateStr(newDateStr);
          fetchData();
        }
    }, 1000);
    return () => clearInterval(timer);
  }, [currentDateStr]);

  useEffect(() => {
    if (isPast600PM && todayRecord && !todayRecord.checkOutTime) {
      api.post('/attendance/auto-checkout', { employeeId: user.employeeId })
        .then(() => fetchData())
        .catch(console.error);
    }
  }, [isPast600PM, todayRecord, user.employeeId]);

  const fetchData = async () => {
    try {
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

  if (loading) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--primary)' }}>Loading Dashboard...</div>;

  return (
    <div style={{ backgroundColor: 'var(--bg-color)', display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)' }}>
      <div style={{ padding: '0 var(--mobile-padding)', maxWidth: '600px', margin: '48px auto', width: '100%', boxSizing: 'border-box' }}>
        <div className="card text-center" style={{ padding: '48px 24px' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>Attendance</h2>
          <p className="text-muted mb-4" style={{ marginBottom: '32px' }}>{new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <div style={{ maxWidth: '400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {!isCheckedIn && !isCheckedOut && !isPast600PM && (
              <button className="btn" style={{ backgroundColor: isPost930AM ? 'var(--success)' : '#9CA3AF', color: 'white', fontSize: '1.25rem', padding: '20px', opacity: isPost930AM ? 1 : 0.5 }} onClick={() => handleCheck('check-in')} disabled={submitting || !isPost930AM}>
                <Clock size={24} style={{ marginRight: '10px' }}/> {isPost930AM ? 'CHECK IN' : 'OPENS AT 9:30 AM'}
              </button>
            )}

            {!isCheckedIn && !isCheckedOut && isPast600PM && (
              <button className="btn" style={{ backgroundColor: 'var(--success)', color: 'white', fontSize: '1.25rem', padding: '20px', opacity: 0.5 }} disabled={true}>
                CHECK IN CLOSED
              </button>
            )}

            {isCheckedIn && (
              isPast600PM ? (
                <button className="btn" style={{ backgroundColor: '#9CA3AF', color: 'white', fontSize: '1.25rem', padding: '20px', opacity: 0.5 }} disabled={true}>
                  AUTO-CHECKED OUT
                </button>
              ) : (
                <button className="btn" style={{ backgroundColor: '#EF4444', color: 'white', fontSize: '1.25rem', padding: '20px' }} onClick={() => handleCheck('check-out')} disabled={submitting}>
                  <LogOut size={24} style={{ marginRight: '10px' }}/> CHECK OUT
                </button>
              )
            )}

            {isCheckedOut && (
              <button className="btn" style={{ backgroundColor: 'var(--success)', color: 'white', fontSize: '1.25rem', padding: '20px', opacity: 0.8 }} disabled={true}>
                <CheckCircle size={24} style={{ marginRight: '10px' }}/> COMPLETED FOR TODAY
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
