import React, { useState, useEffect } from 'react';
import { LogOut, Plus, Trash2, Clock, CheckCircle, Calculator, X, Edit, ArrowLeft } from 'lucide-react';
import { api } from '../utils/api';

const AdminPanel = ({ user }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [employees, setEmployees] = useState([]);
  const currentMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [modalMonth, setModalMonth] = useState(currentMonthStr);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0 });
  const [todayRecord, setTodayRecord] = useState(null);
  
  const [showAdd, setShowAdd] = useState(false);
  const [newEmp, setNewEmp] = useState({ name: '', employeeId: '', email: '', password: '', role: 'employee', hourlyRate: 0 });
  const [editingEmp, setEditingEmp] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', employeeId: '', email: '', password: '', role: 'employee', hourlyRate: 0 });

  // Salary Modal State
  const [selectedEmp, setSelectedEmp] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const emps = await api.get('/employees');
      setEmployees(emps);
      
      const statsData = await api.get('/attendance/stats');
      setStats(statsData);

      const att = await api.get('/attendance');
      setHistory(att.sort((a,b) => new Date(b.checkInTime) - new Date(a.checkInTime)));

      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      const meToday = att.find(a => a.employeeId.toUpperCase() === user.employeeId.toUpperCase() && a.date === today);
      setTodayRecord(meToday || null);
    } catch(err) {
      console.error(err);
    }
  };

  const handleAdminCheck = async (type) => {
    try {
      await api.post('/attendance', {
        employeeId: user.employeeId,
        type,
        timestamp: new Date().toISOString()
      });
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    try {
      await api.post('/employees', newEmp);
      setNewEmp({ name: '', employeeId: '', email: '', password: '', role: 'employee' });
      setShowAdd(false);
      loadData();
      alert('Employee Added successfully!');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEditClick = (emp, e) => {
    e.stopPropagation();
    setEditingEmp(emp.id);
    setEditForm({ name: emp.name, employeeId: emp.employeeId, email: emp.email, password: emp.password, role: emp.role || 'employee', hourlyRate: emp.hourlyRate || 0 });
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/employees/${editingEmp}`, editForm);
      setEditingEmp(null);
      loadData();
      alert('Employee updated successfully!');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this employee?')) {
      await api.delete(`/employees/${id}`);
      loadData();
    }
  };

  const isPastSix = new Date().getHours() >= 18;
  const isCheckedIn = todayRecord && !todayRecord.checkOutTime;
  const isCheckedOut = todayRecord && todayRecord.checkOutTime;
  const isAbsent = !todayRecord && isPastSix;

  const calculateSalary = (emp, targetMonth) => {
    const empRecords = history.filter(h => h.employeeId === emp.employeeId && h.date.startsWith(targetMonth));
    let totalMinutes = 0;
    const rate = emp.hourlyRate || 41.5;
    
    empRecords.forEach(r => {
      if (r.checkInTime && r.checkOutTime) {
          const start = new Date(r.checkInTime);
          let end = new Date(r.checkOutTime);

          if (end < start) end = start;

          const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
          const ymd = formatter.format(start);
          const sixPM = new Date(`${ymd}T18:00:00+05:30`);
          if (end > sixPM) end = sixPM;
          
          const diffMs = end - start;
          if (diffMs > 0) {
              const actualMinutes = Math.floor(diffMs / (1000 * 60));
              totalMinutes += actualMinutes;
          }
      }
    });

    const finalBaseHours = Math.floor(totalMinutes / 60);
    const finalRemainder = totalMinutes % 60;
    const exactTotalHours = totalMinutes / 60;

    const totalSalary = Math.round(exactTotalHours * rate * 100) / 100;

    return { 
      records: empRecords, 
      totalSalary: totalSalary.toFixed(2), 
      formattedTotalTime: `${finalBaseHours} hours ${finalRemainder} minutes`,
      absoluteTotalHours: (Math.round(exactTotalHours * 100) / 100).toFixed(2) 
    };
  };

  const getStatusLabel = (rec) => {
    if (!rec.checkOutTime) return 'Active Shift';
    const hours = (new Date(rec.checkOutTime) - new Date(rec.checkInTime)) / 1000 / 60 / 60;
    const rounded = Math.round(hours);
    if (rounded >= 8) return 'Full Day Present';
    if (rounded === 4 || rounded === 5) return 'Half Day Present';
    return `${rounded} Hours Present`;
  };

  const getEmployeeName = (empId) => {
    const emp = employees.find(e => e.employeeId.toUpperCase() === empId.toUpperCase());
    return emp ? emp.name : 'Unknown';
  };

  let availableMonths = [...new Set(history.map(h => h.date.substring(0, 7)))];
  if (!availableMonths.includes(currentMonthStr)) availableMonths.push(currentMonthStr);
  availableMonths.sort().reverse();

  const formatMonth = (yyyyMm) => {
    const [year, month] = yyyyMm.split('-');
    const d = new Date(parseInt(year), parseInt(month) - 1, 1);
    return d.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const filteredHistory = history.filter(r => r.date.startsWith(selectedMonth));

  return (
    <div style={{ backgroundColor: 'var(--bg-color)', display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)' }}>
      <div className="mobile-tabs">
         <button onClick={() => setActiveTab('dashboard')} style={{ background: 'none', border: 'none', borderBottom: activeTab === 'dashboard' ? '4px solid var(--primary)' : '4px solid transparent', fontWeight: 'bold', color: activeTab === 'dashboard' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }}>Dashboard</button>
         <button onClick={() => setActiveTab('attendance')} style={{ background: 'none', border: 'none', borderBottom: activeTab === 'attendance' ? '4px solid var(--primary)' : '4px solid transparent', fontWeight: 'bold', color: activeTab === 'attendance' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }}>Attendance</button>
         <button onClick={() => setActiveTab('employees')} style={{ background: 'none', border: 'none', borderBottom: activeTab === 'employees' ? '4px solid var(--primary)' : '4px solid transparent', fontWeight: 'bold', color: activeTab === 'employees' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }}>Employees</button>
         <button onClick={() => setActiveTab('reports')} style={{ background: 'none', border: 'none', borderBottom: activeTab === 'reports' ? '4px solid var(--primary)' : '4px solid transparent', fontWeight: 'bold', color: activeTab === 'reports' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }}>Reports</button>
      </div>

      <div style={{ padding: '24px var(--mobile-padding)', maxWidth: '1200px', margin: '0 auto', width: '100%', position: 'relative', boxSizing: 'border-box' }}>
        {activeTab === 'dashboard' && (
          <div>
            <div className="grid-cols-3 mb-6">
              <div className="stat-box"><div className="stat-value">{stats.total}</div><div className="stat-label">Total Staff</div></div>
              <div className="stat-box" style={{ borderTopColor: 'var(--success)' }}><div className="stat-value" style={{ color: 'var(--success)' }}>{stats.present}</div><div className="stat-label">Present Today</div></div>
              <div className="stat-box" style={{ borderTopColor: 'var(--danger)' }}><div className="stat-value" style={{ color: 'var(--danger)' }}>{stats.absent}</div><div className="stat-label">Absent Today</div></div>
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
               <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Attendance Management</h2>
            </div>
            <div className="card mb-8 mobile-stack" style={{ padding: '24px', borderLeft: '6px solid var(--primary)', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>My Attendance</h3>
                <p className="text-muted" style={{ fontSize: '0.9rem' }}>Verify your presence for <strong>{new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</strong></p>
              </div>
              <div style={{ display: 'flex', gap: '12px', width: '100%', justifyContent: 'flex-start' }}>
                {!isCheckedIn && !isCheckedOut && !isPastSix && (
                  <button className="btn" style={{ backgroundColor: 'var(--success)', color: 'white', width: 'auto', padding: '16px 24px', fontSize: '1.1rem' }} onClick={() => handleAdminCheck('check-in')}>
                    <Clock size={20} style={{ marginRight: '8px' }}/> CHECK IN NOW
                  </button>
                )}
                {isAbsent && (
                  <div style={{ color: 'var(--danger)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                    Check-in closed. Marked Absent.
                  </div>
                )}
                {isCheckedIn && (
                  <button className="btn" style={{ backgroundColor: 'var(--success)', color: 'white', width: 'auto', padding: '16px 24px', fontSize: '1.1rem' }} onClick={() => handleAdminCheck('check-out')}>
                    <LogOut size={20} style={{ marginRight: '8px' }}/> CHECK OUT NOW
                  </button>
                )}
                {isCheckedOut && (
                  <div style={{ color: 'var(--success)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                    <CheckCircle size={24} /> Hours completed for today
                  </div>
                )}
              </div>
            </div>
            <div className="mobile-stack mb-4" style={{ justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Attendance History</h2>
              <select className="card" style={{ margin: 0, padding: '10px 16px', fontWeight: 'bold', fontSize: '0.9rem', border: '2px solid var(--primary)', outline: 'none', width: '100%', maxWidth: '240px' }} value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
                {availableMonths.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
              </select>
            </div>
            <div className="table-container">
               <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                 <thead style={{ background: '#F8FAFC' }}>
                   <tr style={{ borderBottom: '2px solid var(--border)' }}>
                     <th style={{ padding: '16px 20px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem' }}>Date</th>
                     <th style={{ padding: '16px 20px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem' }}>Name</th>
                     <th style={{ padding: '16px 20px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem' }}>Emp ID</th>
                     <th style={{ padding: '16px 20px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem' }}>Check In</th>
                     <th style={{ padding: '16px 20px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem' }}>Check Out</th>
                     <th style={{ padding: '16px 20px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem' }}>Worked Hours Today</th>
                     <th style={{ padding: '16px 20px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem' }}>Salary Today</th>
                     <th style={{ padding: '16px 20px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem' }}>Status</th>
                   </tr>
                 </thead>
                 <tbody>
                   {filteredHistory.map(rec => {
                     let actualTimeStr = "0h 0m";
                     let exactHrs = 0;
                     
                     if (rec.checkInTime && rec.checkOutTime) {
                         const start = new Date(rec.checkInTime);
                         let end = new Date(rec.checkOutTime);

                         if (end < start) end = start;

                         const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
                         const ymd = formatter.format(start);
                         const sixPM = new Date(`${ymd}T18:00:00+05:30`);
                         if (end > sixPM) end = sixPM;
                         
                         const diffMs = end - start;
                         if (diffMs > 0) {
                             const actualMinutes = Math.floor(diffMs / (1000 * 60));
                             const baseHours = Math.floor(actualMinutes / 60);
                             const remainder = actualMinutes % 60;
                             actualTimeStr = `${baseHours} hours ${remainder} minutes`;
                             exactHrs = actualMinutes / 60;
                         }
                     }

                      const emp = employees.find(e => e.employeeId === rec.employeeId);
                      const rate = emp ? (emp.hourlyRate || 41.5) : 41.5;
                      let sal = Math.round(exactHrs * rate * 100) / 100;

                     return (
                     <tr key={rec.id} style={{ borderBottom: '1px solid var(--border)' }}>
                       <td style={{ padding: '16px 20px', fontWeight: '500' }}>{new Date(rec.date).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' })}</td>
                       <td style={{ padding: '16px 20px', fontWeight: '700', color: 'var(--text-main)' }}>{getEmployeeName(rec.employeeId)}</td>
                       <td style={{ padding: '16px 20px', fontWeight: '700', color: 'var(--primary)' }}>{rec.employeeId}</td>
                       <td style={{ padding: '16px 20px', color: 'var(--success)' }}>{new Date(rec.checkInTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour:'2-digit', minute:'2-digit', hour12: true})}</td>
                       <td style={{ padding: '16px 20px', color: 'var(--secondary-dark)' }}>{rec.checkOutTime ? new Date(rec.checkOutTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour:'2-digit', minute:'2-digit', hour12: true}) : '--'}</td>
                       <td style={{ padding: '16px 20px', fontWeight: 'bold', color: 'var(--success)' }}>{actualTimeStr}</td>
                       <td style={{ padding: '16px 20px', fontWeight: 'bold', color: 'var(--success)' }}>Rs. {sal}</td>
                       <td style={{ padding: '16px 20px' }}>
                         <span style={{ background: '#ECFDF5', color: '#059669', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                           {getStatusLabel(rec)}
                         </span>
                       </td>
                     </tr>
                    );
                   })}
                   {filteredHistory.length === 0 && <tr><td colSpan="8" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No records logged for {formatMonth(selectedMonth)}.</td></tr>}
                 </tbody>
               </table>
            </div>
          </div>
        )}

        {activeTab === 'employees' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                 <button className="btn-secondary" style={{ width: '40px', height: '40px', padding: 0, borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'white', border: '1px solid var(--border)' }} onClick={() => setActiveTab('dashboard')}>
                    <ArrowLeft size={20} color="var(--text-main)" />
                 </button>
                 <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Employees List</h2>
              </div>
              <button className="btn btn-primary" style={{ width: 'auto', padding: '12px 20px' }} onClick={() => setShowAdd(!showAdd)}>
                <Plus size={20} style={{ marginRight: '6px' }} /> ADD NEW EMPLOYEE
              </button>
            </div>
            
            {showAdd && (
              <form className="card" onSubmit={handleAddEmployee} style={{ borderTop: '4px solid var(--secondary)', background: '#F8FAFC' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Create Employee Profile</h3>
                <div className="mobile-stack">
                  <div className="input-group">
                    <label>Full Name</label>
                    <input required value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value})} placeholder="John Doe" />
                  </div>
                  <div className="input-group">
                    <label>Employee ID</label>
                    <input required value={newEmp.employeeId} onChange={e => setNewEmp({...newEmp, employeeId: e.target.value})} placeholder="EMP-001" />
                  </div>
                  <div className="input-group">
                    <label>Account Role</label>
                    <select required value={newEmp.role} onChange={e => setNewEmp({...newEmp, role: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '1rem', background: 'white', color: 'var(--text-main)', boxSizing: 'border-box', fontFamily: 'inherit' }}>
                      <option value="employee">Staff</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Email Address</label>
                    <input required type="email" value={newEmp.email} onChange={e => setNewEmp({...newEmp, email: e.target.value})} placeholder="john@kcn.com" />
                  </div>
                  <div className="input-group">
                    <label>Hourly Rate (₹)</label>
                    <input required type="number" value={newEmp.hourlyRate} onChange={e => setNewEmp({...newEmp, hourlyRate: parseFloat(e.target.value) || 0})} placeholder="100" />
                  </div>
                  <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Initial Password</label>
                    <input required type="text" value={newEmp.password} onChange={e => setNewEmp({...newEmp, password: e.target.value})} placeholder="password123" />
                  </div>
                </div>
                <div className="mt-4 flex gap-4">
                  <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => setShowAdd(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>Save Employee</button>
                </div>
              </form>
            )}
               
            <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '12px', WebkitOverflowScrolling: 'touch' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', minWidth: 'min-content' }}>
              {employees.map(emp => {
                 if (editingEmp === emp.id) {
                   return (
                     <form className="card" key={emp.id} onSubmit={handleUpdateEmployee} style={{ borderTop: '4px solid var(--primary)', background: '#F8FAFC', margin: 0 }}>
                       <h3 className="mb-4">Edit Employee Profile</h3>
                       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                         <div className="input-group">
                           <label>Full Name</label>
                           <input required value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                         </div>
                         <div className="input-group">
                           <label>Employee ID</label>
                           <input required value={editForm.employeeId} onChange={e => setEditForm({...editForm, employeeId: e.target.value})} />
                         </div>
                         <div className="input-group">
                           <label>Account Role</label>
                           <select required value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '1rem', background: 'white', color: 'var(--text-main)', boxSizing: 'border-box', fontFamily: 'inherit' }}>
                             <option value="employee">Staff</option>
                             <option value="admin">Administrator</option>
                           </select>
                         </div>
                         <div className="input-group">
                           <label>Email Address</label>
                           <input required type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                         </div>
                         <div className="input-group">
                           <label>Hourly Rate (₹)</label>
                           <input required type="number" value={editForm.hourlyRate} onChange={e => setEditForm({...editForm, hourlyRate: parseFloat(e.target.value) || 0})} />
                         </div>
                         <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                           <label>Password</label>
                           <input required type="text" value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})} />
                         </div>
                       </div>
                       <div className="mt-4 flex gap-4">
                         <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => setEditingEmp(null)}>Cancel</button>
                         <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>Save Changes</button>
                       </div>
                     </form>
                   );
                 }
                 return (
                  <div className="card card-mobile-compact" key={emp.id} style={{ cursor: 'pointer', transition: 'all 0.2s', margin: 0, borderLeft: '4px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }} 
                       onClick={() => { setSelectedEmp(emp); setModalMonth(selectedMonth); }}>
                    <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{emp.name}</div>
                        {emp.role === 'admin' && <span style={{ background: 'var(--primary)', color: 'white', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', textTransform: 'uppercase', fontWeight: 'bold', flexShrink: 0 }}>Admin</span>}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--secondary-dark)', fontWeight: '600', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.email} <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>({emp.employeeId})</span></div>
                    </div>
                    <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                      <button style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', transition: 'background 0.2s' }} 
                              onClick={(e) => handleEditClick(emp, e)}
                              onMouseEnter={e => e.currentTarget.style.background = '#EFF6FF'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                              title="Edit Employee">
                         <Edit size={20} />
                      </button>
                      <button style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', transition: 'background 0.2s' }} 
                              onClick={(e) => handleDelete(emp.id, e)}
                              onMouseEnter={e => e.currentTarget.style.background = '#FEE2E2'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                              title="Delete Employee">
                         <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
              );})}
              {employees.length === 0 && <p className="text-muted text-center card" style={{ padding: '48px 0' }}>No employees added yet.</p>}
             </div>
           </div>
         </div>
        )}

        {activeTab === 'reports' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
               <button className="btn-secondary" style={{ width: '40px', height: '40px', padding: 0, borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'white', border: '1px solid var(--border)' }} onClick={() => setActiveTab('dashboard')}>
                  <ArrowLeft size={20} color="var(--text-main)" />
               </button>
               <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Salary Reports</h2>
            </div>
            <div className="mobile-stack mb-4" style={{ justifyContent: 'space-between' }}>
              <select className="card" style={{ margin: 0, padding: '10px 16px', fontWeight: 'bold', fontSize: '0.9rem', border: '2px solid var(--primary)', outline: 'none', width: '100%', maxWidth: '240px' }} value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
                {availableMonths.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
              </select>
            </div>
            
            <div className="table-container">
               <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                 <thead style={{ background: '#F8FAFC' }}>
                   <tr style={{ borderBottom: '2px solid var(--border)' }}>
                     <th style={{ padding: '16px 20px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem' }}>Staff Name</th>
                     <th style={{ padding: '16px 20px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem' }}>Month</th>
                     <th style={{ padding: '16px 20px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem' }}>Total Days Worked</th>
                     <th style={{ padding: '16px 20px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem' }}>Total Monthly Hours</th>
                     <th style={{ padding: '16px 20px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem' }}>Hourly Rate</th>
                     <th style={{ padding: '16px 20px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem' }}>Monthly Salary</th>
                   </tr>
                 </thead>
                 <tbody>
                   {employees.map(emp => {
                     const salInfo = calculateSalary(emp, selectedMonth);
                     if (salInfo.records.length === 0) return null;
                     return (
                       <tr key={emp.id} style={{ borderBottom: '1px solid var(--border)' }}>
                         <td style={{ padding: '16px 20px', fontWeight: '700', color: 'var(--text-main)' }}>{emp.name}</td>
                         <td style={{ padding: '16px 20px', fontWeight: '500' }}>{formatMonth(selectedMonth)}</td>
                         <td style={{ padding: '16px 20px', fontWeight: 'bold' }}>{salInfo.records.length}</td>
                         <td style={{ padding: '16px 20px', fontWeight: 'bold' }}>{salInfo.absoluteTotalHours} Hours</td>
                         <td style={{ padding: '16px 20px', color: 'var(--text-muted)' }}>Rs. {emp.hourlyRate || 41.5}</td>
                         <td style={{ padding: '16px 20px', fontWeight: '900', color: 'var(--success)', fontSize: '1.1rem' }}>Rs. {salInfo.totalSalary}</td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
            </div>
          </div>
        )}

        {/* Salary Calculation Modal */}
        {selectedEmp && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '10px' }}>
            <div className="card" style={{ width: '100%', maxWidth: '800px', maxHeight: '95vh', overflowY: 'auto', background: 'white', padding: '24px var(--mobile-padding)', position: 'relative', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '2px solid var(--border)', paddingBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--primary)', paddingRight: '40px' }}>Report: {selectedEmp.name}</h3>
                <button style={{ background: '#F1F5F9', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', position: 'absolute', right: '16px', top: '16px' }} onClick={() => setSelectedEmp(null)}>
                  <X size={20} color="var(--text-muted)" />
                </button>
              </div>

              <div className="mb-6">
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Select Month:</label>
                <select className="card" style={{ margin: 0, padding: '8px 12px', fontWeight: 'bold', width: '100%' }} value={modalMonth} onChange={e => setModalMonth(e.target.value)}>
                  {availableMonths.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
                </select>
              </div>

               {(() => {
                  const sal = calculateSalary(selectedEmp, modalMonth);
                  return (
                    <div>
                      <div className="mobile-stack mb-6">
                        <div style={{ flex: 1, background: 'var(--primary)', color: 'white', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>Total Time</div>
                          <div style={{ fontSize: '1.75rem', fontWeight: '900' }}>{sal.formattedTotalTime}</div>
                        </div>
                        <div style={{ flex: 1, background: 'var(--success)', color: 'white', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>Salary (₹)</div>
                          <div style={{ fontSize: '1.75rem', fontWeight: '900' }}>{sal.totalSalary}</div>
                        </div>
                      </div>

                      <div style={{ background: '#EFF6FF', padding: '16px', borderRadius: '12px', color: '#1E40AF', fontSize: '0.85rem', borderLeft: '4px solid #3B82F6', marginBottom: '24px' }}>
                        <strong>Policy:</strong> Calculated based on worked hours x hourly rate, capped at 6 PM.
                      </div>

                     <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Attendance Logs</h3>
                     <div className="table-container">
                       <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', background: 'white' }}>
                         <thead>
                           <tr style={{ background: '#F8FAFC', borderBottom: '2px solid var(--border)' }}>
                             <th style={{ padding: '12px' }}>Date</th>
                             <th style={{ padding: '12px' }}>In</th>
                             <th style={{ padding: '12px' }}>Out</th>
                             <th style={{ padding: '12px', color: 'var(--primary)' }}>Hrs</th>
                           </tr>
                         </thead>
                         <tbody>
                           {sal.records.map((rec, i) => {
                             let hrs = '--';
                             if (rec.checkInTime && rec.checkOutTime) {
                               const start = new Date(rec.checkInTime);
                               let end = new Date(rec.checkOutTime);
                               if (end < start) end = start;
                               const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
                               const ymd = formatter.format(start);
                               const sixPM = new Date(`${ymd}T18:00:00+05:30`);
                               if (end > sixPM) end = sixPM;
                               
                               const diffMs = end - start;
                               if (diffMs > 0) {
                                   const actualMinutes = Math.floor(diffMs / (1000 * 60));
                                   const baseHours = Math.floor(actualMinutes / 60);
                                   const remainder = actualMinutes % 60;
                                   hrs = `${baseHours} hours ${remainder} minutes`;
                               }
                             }
                             return (
                               <tr key={rec.id} style={{ borderBottom: i === sal.records.length - 1 ? 'none' : '1px solid var(--border)' }}>
                                 <td style={{ padding: '12px', fontSize: '0.85rem' }}>{new Date(rec.date).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', month:'short', day:'numeric'})}</td>
                                 <td style={{ padding: '12px', color: 'var(--success)', fontSize: '0.85rem' }}>{new Date(rec.checkInTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour:'2-digit', minute:'2-digit', hour12: true})}</td>
                                 <td style={{ padding: '12px', color: 'var(--secondary-dark)', fontSize: '0.85rem' }}>{rec.checkOutTime ? new Date(rec.checkOutTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour:'2-digit', minute:'2-digit', hour12: true}) : 'Active'}</td>
                                 <td style={{ padding: '12px', fontWeight: '800', fontSize: '0.85rem' }}>{hrs}</td>
                               </tr>
                             )
                           })}
                           {sal.records.length === 0 && <tr><td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No logs recorded.</td></tr>}
                         </tbody>
                       </table>
                     </div>
                    </div>
                  );
               })()}

            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
