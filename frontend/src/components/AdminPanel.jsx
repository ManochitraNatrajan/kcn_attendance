import React, { useState, useEffect } from 'react';
import { LogOut, Plus, Trash2, Clock, CheckCircle, Calculator, X, Edit } from 'lucide-react';
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
  const [newEmp, setNewEmp] = useState({ name: '', employeeId: '', email: '', password: '', role: 'employee' });
  const [editingEmp, setEditingEmp] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', employeeId: '', email: '', password: '', role: 'employee' });

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

      const today = new Date().toISOString().split('T')[0];
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
    setEditForm({ name: emp.name, employeeId: emp.employeeId, email: emp.email, password: emp.password, role: emp.role || 'employee' });
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

  const isCheckedIn = todayRecord && !todayRecord.checkOutTime;
  const isCheckedOut = todayRecord && todayRecord.checkOutTime;

  // Salary Calculator Logic
  const calculateSalary = (empId, targetMonth) => {
    const empRecords = history.filter(h => h.employeeId === empId && h.date.startsWith(targetMonth));
    let fullDays = 5; // Base 5 Sundays inherently counted as full present days
    let halfDays = 0;
    let totalHourly = 0;
    let absoluteTotalHours = 0;
    
    empRecords.forEach(r => {
      if (r.checkInTime && r.checkOutTime) {
        const diff = (new Date(r.checkOutTime) - new Date(r.checkInTime)) / (1000 * 60 * 60);
        absoluteTotalHours += diff;
        const rounded = Math.round(diff);
        if (rounded >= 8) fullDays++;
        else if (rounded === 4 || rounded === 5) halfDays++;
        else if (rounded > 0) totalHourly += rounded;
      }
    });

    return { records: empRecords, fullDays, halfDays, totalHourly: totalHourly.toFixed(1), absoluteTotalHours: absoluteTotalHours.toFixed(1) };
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
    <div style={{ flex: 1, backgroundColor: 'var(--bg-color)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'white', padding: '0 32px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
         <button onClick={() => setActiveTab('dashboard')} style={{ padding: '20px 0', background: 'none', border: 'none', borderBottom: activeTab === 'dashboard' ? '4px solid var(--primary)' : '4px solid transparent', fontWeight: 'bold', fontSize: '1rem', color: activeTab === 'dashboard' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }}>Dashboard</button>
         <button onClick={() => setActiveTab('attendance')} style={{ padding: '20px 0', background: 'none', border: 'none', borderBottom: activeTab === 'attendance' ? '4px solid var(--primary)' : '4px solid transparent', fontWeight: 'bold', fontSize: '1rem', color: activeTab === 'attendance' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }}>Attendance</button>
         <button onClick={() => setActiveTab('employees')} style={{ padding: '20px 0', background: 'none', border: 'none', borderBottom: activeTab === 'employees' ? '4px solid var(--primary)' : '4px solid transparent', fontWeight: 'bold', fontSize: '1rem', color: activeTab === 'employees' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }}>Employee Directory</button>
      </div>

      <div style={{ padding: '32px 20px', maxWidth: '1200px', margin: '0 auto', width: '100%', position: 'relative' }}>
        {activeTab === 'dashboard' && (
          <div>
            <div className="grid-cols-3 mb-6">
              <div className="stat-box"><div className="stat-value">{stats.total}</div><div className="stat-label">Total Staff</div></div>
              <div className="stat-box" style={{ borderTopColor: 'var(--success)' }}><div className="stat-value" style={{ color: 'var(--success)' }}>{stats.present}</div><div className="stat-label">Present Today</div></div>
              <div className="stat-box" style={{ borderTopColor: 'var(--danger)' }}><div className="stat-value" style={{ color: 'var(--danger)' }}>{stats.absent}</div><div className="stat-label">Absent Today</div></div>
            </div>

            <div style={{ marginTop: '96px', display: 'flex', justifyContent: 'center' }}>
              <button 
                className="btn btn-primary" 
                style={{ width: 'auto', padding: '24px 64px', fontSize: '1.5rem', borderRadius: '50px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} 
                onClick={() => setActiveTab('attendance')}>
                MARK ATTENDANCE
              </button>
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div>
            <div className="card mb-8 flex justify-between items-center" style={{ padding: '32px 40px', borderLeft: '6px solid var(--primary)' }}>
              <div>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>My Attendance</h3>
                <p className="text-muted">Verify your presence for <strong>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong></p>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                {!isCheckedIn && !isCheckedOut && (
                  <button className="btn" style={{ backgroundColor: 'var(--success)', color: 'white', width: 'auto', padding: '16px 24px', fontSize: '1.1rem' }} onClick={() => handleAdminCheck('check-in')}>
                    <Clock size={20} style={{ marginRight: '8px' }}/> CHECK IN NOW
                  </button>
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
            <div className="flex justify-between items-center mb-4">
              <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Global Attendance History</h2>
              <select className="card" style={{ margin: 0, padding: '10px 16px', fontWeight: 'bold', fontSize: '1rem', border: '2px solid var(--primary)', outline: 'none' }} value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
                {availableMonths.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
              </select>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
               <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                 <thead style={{ background: '#F8FAFC' }}>
                   <tr style={{ borderBottom: '2px solid var(--border)' }}>
                     <th style={{ padding: '16px 20px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem' }}>Date</th>
                     <th style={{ padding: '16px 20px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem' }}>Name</th>
                     <th style={{ padding: '16px 20px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem' }}>Emp ID</th>
                     <th style={{ padding: '16px 20px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem' }}>Check In</th>
                     <th style={{ padding: '16px 20px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem' }}>Check Out</th>
                     <th style={{ padding: '16px 20px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem' }}>Status</th>
                   </tr>
                 </thead>
                 <tbody>
                   {filteredHistory.map(rec => (
                     <tr key={rec.id} style={{ borderBottom: '1px solid var(--border)' }}>
                       <td style={{ padding: '16px 20px', fontWeight: '500' }}>{new Date(rec.date).toLocaleDateString()}</td>
                       <td style={{ padding: '16px 20px', fontWeight: '700', color: 'var(--text-main)' }}>{getEmployeeName(rec.employeeId)}</td>
                       <td style={{ padding: '16px 20px', fontWeight: '700', color: 'var(--primary)' }}>{rec.employeeId}</td>
                       <td style={{ padding: '16px 20px', color: 'var(--success)' }}>{new Date(rec.checkInTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                       <td style={{ padding: '16px 20px', color: 'var(--secondary-dark)' }}>{rec.checkOutTime ? new Date(rec.checkOutTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--'}</td>
                       <td style={{ padding: '16px 20px' }}>
                         <span style={{ background: '#ECFDF5', color: '#059669', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                           {getStatusLabel(rec)}
                         </span>
                       </td>
                     </tr>
                   ))}
                   {filteredHistory.length === 0 && <tr><td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No records logged for {formatMonth(selectedMonth)}.</td></tr>}
                 </tbody>
               </table>
            </div>
          </div>
        )}

        {activeTab === 'employees' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Employees List</h2>
              <button className="btn btn-primary" style={{ width: 'auto', padding: '12px 20px' }} onClick={() => setShowAdd(!showAdd)}>
                <Plus size={20} style={{ marginRight: '6px' }} /> ADD NEW EMPLOYEE
              </button>
            </div>
            
            {showAdd && (
              <form className="card" onSubmit={handleAddEmployee} style={{ borderTop: '4px solid var(--secondary)', background: '#F8FAFC' }}>
                <h3 className="mb-4">Create Employee Profile</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
               
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
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
                 <div className="card flex items-center justify-between" key={emp.id} style={{ padding: '24px 32px', cursor: 'pointer', transition: 'all 0.2s', margin: 0, borderLeft: '4px solid transparent' }} 
                      onClick={() => { setSelectedEmp(emp); setModalMonth(selectedMonth); }}
                      onMouseEnter={(e) => e.currentTarget.style.borderLeftColor = 'var(--primary)'}
                      onMouseLeave={(e) => e.currentTarget.style.borderLeftColor = 'transparent'}>
                   <div className="flex items-center">
                     <div>
                       <div style={{ fontWeight: 'bold', fontSize: '1.25rem', color: 'var(--text-main)' }}>
                         {emp.name} 
                         <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: '500', marginLeft: '8px' }}>({emp.employeeId})</span>
                         {emp.role === 'admin' && <span style={{ background: 'var(--primary)', color: 'white', fontSize: '0.75rem', padding: '4px 8px', borderRadius: '12px', marginLeft: '12px', verticalAlign: 'middle', textTransform: 'uppercase', fontWeight: 'bold' }}>Admin</span>}
                       </div>
                       <div style={{ fontSize: '0.95rem', color: 'var(--secondary-dark)', fontWeight: '600', marginTop: '4px' }}>{emp.email} <span style={{ color: 'var(--text-muted)', paddingLeft: '8px' }}>— Click to view Salary & Hours Breakdown</span></div>
                     </div>
                   </div>
                   <div style={{ display: 'flex', gap: '8px' }}>
                     <button style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', transition: 'background 0.2s' }} 
                             onClick={(e) => handleEditClick(emp, e)}
                             onMouseEnter={e => e.currentTarget.style.background = '#EFF6FF'}
                             onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                             title="Edit Employee">
                        <Edit size={24} />
                     </button>
                     <button style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', transition: 'background 0.2s' }} 
                             onClick={(e) => handleDelete(emp.id, e)}
                             onMouseEnter={e => e.currentTarget.style.background = '#FEE2E2'}
                             onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                             title="Delete Employee">
                        <Trash2 size={24} />
                     </button>
                   </div>
                 </div>
              );})}
              {employees.length === 0 && <p className="text-muted text-center card" style={{ padding: '48px 0' }}>No employees added yet.</p>}
            </div>
          </div>
        )}

        {/* Salary Calculation Modal */}
        {selectedEmp && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
            <div className="card" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', background: 'white', padding: '40px', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '2px solid var(--border)', paddingBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--primary)' }}>Salary & Hours Report for {selectedEmp.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <select className="card" style={{ margin: 0, padding: '8px 16px', fontWeight: 'bold' }} value={modalMonth} onChange={e => setModalMonth(e.target.value)}>
                    {availableMonths.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
                  </select>
                  <button style={{ background: '#F1F5F9', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex' }} onClick={() => setSelectedEmp(null)}>
                    <X size={24} color="var(--text-muted)" />
                  </button>
                </div>
              </div>

              {(() => {
                 const sal = calculateSalary(selectedEmp.employeeId, modalMonth);
                 return (
                   <div>
                     <h3 className="mb-4" style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '2px solid var(--border)', paddingBottom: '12px' }}><Calculator size={22} color="var(--primary)"/> Hours & Salary Breakdown</h3>
                     
                     <div className="grid-cols-3 mb-6" style={{ gap: '20px' }}>
                       <div style={{ background: '#F8FAFC', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
                         <div style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--success)' }}>{sal.fullDays}</div>
                         <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold', marginBottom: '4px' }}>FULL DAYS ➔ 8h Salary</div>
                         <div style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>(Includes +5 Sundays)</div>
                       </div>
                       <div style={{ background: '#F8FAFC', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
                         <div style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--secondary-dark)' }}>{sal.halfDays}</div>
                         <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>HALF DAYS ➔ 4h Salary</div>
                       </div>
                       <div style={{ background: '#F8FAFC', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
                         <div style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--primary)' }}>{sal.totalHourly}</div>
                         <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>PARTIAL HOURS ➔ Hourly Salary</div>
                       </div>
                     </div>
                     
                     <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--primary)', color: 'white', padding: '20px 32px', borderRadius: '12px', marginTop: '32px', marginBottom: '32px', alignItems: 'center', boxShadow: '0 4px 12px rgba(248, 113, 113, 0.2)' }}>
                       <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Total Cumulative Hours Logged This Month</div>
                       <div style={{ fontSize: '2.5rem', fontWeight: '900' }}>{sal.absoluteTotalHours} <span style={{ fontSize: '1.2rem', fontWeight: '600', opacity: 0.8 }}>hrs</span></div>
                     </div>

                     <div style={{ background: '#FEF2F2', padding: '20px', borderRadius: '12px', color: '#991B1B', fontWeight: '500', fontSize: '1rem', borderLeft: '4px solid var(--danger)', marginBottom: '32px' }}>
                       <strong>Salary Calculation Engine:</strong> 8+ hours = Full Day Wage. 4-5 hours = Half Day Wage. Other variations = Calculated directly as precise Hourly wages (e.g. 3 hours present, 6 hours present).
                     </div>

                     <h3 className="mb-4">Individual Attendance Logs</h3>
                     <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', background: 'white', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                       <thead>
                         <tr style={{ background: '#F8FAFC', borderBottom: '2px solid var(--border)' }}>
                           <th style={{ padding: '12px 16px' }}>Date</th>
                           <th style={{ padding: '12px 16px' }}>Check In</th>
                           <th style={{ padding: '12px 16px' }}>Check Out</th>
                           <th style={{ padding: '12px 16px', color: 'var(--primary)' }}>Total Logged</th>
                         </tr>
                       </thead>
                       <tbody>
                         {sal.records.map((rec, i) => {
                           let hrs = '--';
                           if (rec.checkInTime && rec.checkOutTime) {
                             hrs = ((new Date(rec.checkOutTime) - new Date(rec.checkInTime)) / (1000 * 60 * 60)).toFixed(1) + 'h';
                           }
                           return (
                             <tr key={rec.id} style={{ borderBottom: i === sal.records.length - 1 ? 'none' : '1px solid var(--border)' }}>
                               <td style={{ padding: '16px' }}>{new Date(rec.date).toLocaleDateString()}</td>
                               <td style={{ padding: '16px', color: 'var(--success)', fontWeight:'500' }}>{new Date(rec.checkInTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                               <td style={{ padding: '16px', color: 'var(--secondary-dark)', fontWeight:'500' }}>{rec.checkOutTime ? new Date(rec.checkOutTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'Currently Active'}</td>
                               <td style={{ padding: '16px', fontWeight: '800' }}>{hrs}</td>
                             </tr>
                           )
                         })}
                         {sal.records.length === 0 && <tr><td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No logs recorded.</td></tr>}
                       </tbody>
                     </table>
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
