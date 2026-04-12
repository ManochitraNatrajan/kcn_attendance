import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Camera, X, CheckCircle2 } from 'lucide-react';
import { api } from '../utils/api';

const CheckInOut = ({ employees }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [location, setLocation] = useState(null);
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour12: true, hour: '2-digit', minute:'2-digit', second:'2-digit' }));
  const [isPastSix, setIsPastSix] = useState(false);
  
  const videoRef = useRef(null);
  const [showCamera, setShowCamera] = useState(false);
  const [photoData, setPhotoData] = useState(null);

  const employee = employees.find(e => e.employeeId === id) || { name: 'Unknown', employeeId: id };

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour12: true, hour: '2-digit', minute:'2-digit', second:'2-digit' }));
      
      const istTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
      setIsPastSix(istTime.getHours() >= 18);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        err => console.warn('GPS denied')
      );
    }
    
    const fetchData = async () => {
      try {
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
        // Fetch all attendance logs to parse history
        const allData = await api.get(`/attendance`);
        const userRecords = allData.filter(a => a.employeeId === id).sort((a,b) => new Date(b.date) - new Date(a.date));
        
        const todayRecord = userRecords.find(a => a.date === today);
        setRecord(todayRecord || null);
        setHistory(userRecords);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert("Camera access denied or not available. Running on localhost allows camera access without HTTPS, but check permissions.");
      setShowCamera(false);
    }
  };

  const takePhoto = () => {
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    setPhotoData(canvas.toDataURL('image/jpeg', 0.5));
    stopCamera();
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    }
    setShowCamera(false);
  };

  const handleAction = async (type) => {
    setSubmitting(true);
    try {
      await api.post('/attendance', {
        employeeId: id,
        type,
        timestamp: new Date().toISOString(),
        location,
        photo: photoData
      });
      navigate('/');
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="container flex items-center justify-center h-full"><p className="text-muted">Loading...</p></div>;

  const isCheckedIn = record && !record.checkOutTime;
  const isCheckedOut = record && record.checkOutTime;

  return (
    <div className="container">
      <div className="flex items-center mb-6 gap-4">
        <button className="btn-secondary" style={{ width: '48px', height: '48px', padding: 0, borderRadius: '24px' }} onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </button>
        <h2 style={{ margin: 0 }}>Attendance</h2>
      </div>

      <div className="card text-center" style={{ padding: '32px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ width: 90, height: 90, borderRadius: '45px', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 'bold', margin: '0 auto 16px' }}>
          {employee.name.charAt(0)}
        </div>
        <h3 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>{employee.name}</h3>
        <p className="text-muted mb-4" style={{ fontSize: '1.1rem' }}>{employee.employeeId}</p>

        <div style={{ background: '#F9FAFB', borderRadius: '16px', padding: '24px 16px', margin: '16px 0' }}>
          <div style={{ fontSize: '2.75rem', fontWeight: 'bold', fontFamily: 'monospace', color: 'var(--text-main)', letterSpacing: '-1px' }}>
            {time}
          </div>
          {location && (
            <div className="flex items-center justify-center gap-2 mt-4" style={{ color: 'var(--success)', fontWeight: '500' }}>
              <MapPin size={18} /> GPS Secured
            </div>
          )}
        </div>

        {showCamera ? (
          <div style={{ marginBottom: 24, position: 'relative' }}>
            <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: 16, background: '#000', maxHeight: '200px', objectFit: 'cover' }} />
            <button style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', borderRadius: '16px', padding: '4px' }} onClick={stopCamera}>
              <X size={20} />
            </button>
            <button className="btn btn-primary mt-2" onClick={takePhoto}>Capture Photo</button>
          </div>
        ) : photoData ? (
          <div style={{ marginBottom: 24 }}>
            <img src={photoData} alt="Selfie" style={{ width: 120, height: 120, borderRadius: 16, objectFit: 'cover', border: '3px solid var(--primary)' }} />
            <div className="mt-2">
              <button className="btn btn-secondary" style={{ width: 'auto', padding: '8px 16px', fontSize: '0.9rem' }} onClick={() => setPhotoData(null)}>Retake</button>
            </div>
          </div>
        ) : (
          <button className="btn btn-secondary mb-6 flex items-center justify-center gap-2" onClick={startCamera}>
            <Camera size={20} /> Add Selfie Identity (Optional)
          </button>
        )}

        <div className="flex-col gap-4">
          {!isCheckedIn && !isCheckedOut && (
            isPastSix ? (
              <div className="flex-col gap-2">
                <button className="btn btn-primary" style={{ fontSize: '1.2rem', padding: '20px', borderRadius: '16px', opacity: 0.5 }} disabled={true}>
                  CHECK IN CLOSED
                </button>
                <div style={{ background: '#FEF2F2', border: '1px solid #F87171', padding: '16px', borderRadius: '16px', color: '#991B1B', fontWeight: '600', fontSize: '1.1rem' }}>
                  Absent for today
                </div>
              </div>
            ) : (
              <button className="btn btn-primary" style={{ fontSize: '1.2rem', padding: '20px', borderRadius: '16px', textTransform: 'uppercase', letterSpacing: '1px' }} onClick={() => handleAction('check-in')} disabled={submitting}>
                {submitting ? 'Processing...' : 'CONFIRM CHECK IN'}
              </button>
            )
          )}

          {isCheckedIn && (
            isPastSix ? (
               <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '24px', borderRadius: '16px', color: '#065F46', fontWeight: '600', fontSize: '1.1rem' }}>
                 <CheckCircle2 size={32} style={{ margin: '0 auto 12px' }} />
                 Completed attendance for today
               </div>
            ) : (
              <button className="btn btn-danger" style={{ fontSize: '1.2rem', padding: '20px', borderRadius: '16px', textTransform: 'uppercase', letterSpacing: '1px' }} onClick={() => handleAction('check-out')} disabled={submitting}>
                {submitting ? 'Processing...' : 'CONFIRM CHECK OUT'}
              </button>
            )
          )}

          {isCheckedOut && (
            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '24px', borderRadius: '16px', color: 'var(--primary-dark)', fontWeight: '600', fontSize: '1.1rem' }}>
              <CheckCircle2 size={32} style={{ margin: '0 auto 12px' }} />
              Completed attendance for today
            </div>
          )}
        </div>

        {history.length > 0 && (
          <div className="mt-8" style={{ textAlign: 'left', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
            <h4 style={{ marginBottom: '16px', color: 'var(--text-main)', fontSize: '1.2rem' }}>Recent History</h4>
            <div className="flex-col gap-3">
              {history.slice(0, 5).map(rec => (
                 <div key={rec.id} style={{ background: 'var(--bg-color)', padding: '16px', borderRadius: '12px', fontSize: '0.95rem' }}>
                    <div className="flex justify-between items-center mb-2">
                      <span style={{ fontWeight: 600 }}>{new Date(rec.date).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      <span style={{ color: rec.status === 'Present' ? 'var(--success)' : 'var(--text-muted)' }}>{rec.status}</span>
                    </div>
                    <div className="flex justify-between text-muted" style={{ fontSize: '0.9rem' }}>
                      <span>In: {new Date(rec.checkInTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute:'2-digit', hour12: true})}</span>
                      <span>Out: {rec.checkOutTime ? new Date(rec.checkOutTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute:'2-digit', hour12: true}) : 'Pending'}</span>
                    </div>
                 </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckInOut;
