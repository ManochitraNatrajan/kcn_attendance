const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');

const User = require('./models/User');
const Attendance = require('./models/Attendance');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/finance-attendance';

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Helper to get exactly 6:00 PM IST (Asia/Kolkata) for a given date reference
const getSixPM_IST_ISO = (dateRef = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
  const ymd = formatter.format(dateRef); // Returns YYYY-MM-DD in IST
  return new Date(`${ymd}T18:00:00+05:30`).toISOString();
};
const calculateWorkedHoursAndSalary = (checkIn, checkOut, hourlyRate = 41.5) => {
  const start = new Date(checkIn);
  let end = new Date(checkOut);
  
  if (end < start) {
    end = start;
  }

  // Cap at 6:00 PM (18:00) IST for salary calculation
  const sixPM = new Date(getSixPM_IST_ISO(start));
  if (end > sixPM) end = sixPM;

  const diffMs = end - start;
  let totalMinutes = 0;
  if (diffMs > 0) {
     totalMinutes = Math.floor(diffMs / (1000 * 60));
  }
  
  const baseHours = Math.floor(totalMinutes / 60);
  const remainderMinutes = totalMinutes % 60;
  
  let fractionalHour = 0;
  if (remainderMinutes >= 0 && remainderMinutes <= 10) fractionalHour = 0;
  else if (remainderMinutes >= 11 && remainderMinutes <= 20) fractionalHour = 0.25;
  else if (remainderMinutes >= 21 && remainderMinutes <= 40) fractionalHour = 0.5;
  else if (remainderMinutes >= 41 && remainderMinutes <= 50) fractionalHour = 0.75;
  else if (remainderMinutes >= 51 && remainderMinutes <= 59) fractionalHour = 1.0;
  
  const finalHours = baseHours + fractionalHour;
  const salary = Math.round(finalHours * hourlyRate * 100) / 100;
  
  const actualTime = `${baseHours} hours ${remainderMinutes} minutes`;
  
  return { 
    hours: finalHours, 
    salary, 
    actualTime, 
    baseHours, 
    remainderMinutes 
  };
};

// Cron Job: Auto-checkout at 6:00 PM daily IST
cron.schedule('0 18 * * *', async () => {
  try {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const isoTimestamp = getSixPM_IST_ISO();

    const activeRecords = await Attendance.find({ 
      date: today, 
      checkOutTime: { $exists: false },
      status: 'Present'
    });

    console.log(`[Cron] Running auto-checkout for ${activeRecords.length} employees at 6:00 PM`);

    for (const record of activeRecords) {
      const user = await User.findOne({ employeeId: record.employeeId });
      const rate = user ? (user.hourlyRate || 41.5) : 41.5;
      const { hours, salary } = calculateWorkedHoursAndSalary(record.checkInTime, isoTimestamp, rate);
      
      record.checkOutTime = isoTimestamp;
      record.workedHours = hours;
      record.dailySalary = salary;
      record.status = hours >= 8 ? 'Full Day' : 'Present';
      await record.save();
    }

    // Auto-mark Absent for ALL users without check-ins today
    const allUsers = await User.find({ role: 'employee' });
    for (const user of allUsers) {
      const existing = await Attendance.findOne({ employeeId: user.employeeId, date: today });
      if (!existing) {
        await Attendance.create({
          employeeId: user.employeeId,
          date: today,
          status: 'Absent'
        });
      }
    }
  } catch (error) {
    console.error('[Cron] Error in auto-checkout:', error);
  }
}, {
  timezone: "Asia/Kolkata"
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password, employeeId } = req.body;
    // Database matching mimicking previous case logic
    const user = await User.findOne({
      email: new RegExp(`^${email}$`, 'i'),
      password: password,
      employeeId: new RegExp(`^${employeeId}$`, 'i')
    });
    
    if (user) {
      res.json({ success: true, user: { ...user.toObject(), id: user._id.toString() } });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials. Check Email, Password, and ID.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/employees', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users.map(u => ({ ...u.toObject(), id: u._id.toString() })));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/employees', async (req, res) => {
  try {
    const newEmp = req.body;
    const exists = await User.findOne({
      $or: [
        { email: newEmp.email },
        { employeeId: newEmp.employeeId }
      ]
    });
    
    if (exists) {
      return res.status(400).json({ message: 'Employee with this Email or ID already exists.' });
    }

    const user = await User.create({ role: 'employee', ...newEmp });
    res.status(201).json({ ...user.toObject(), id: user._id.toString() });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.put('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(id, req.body, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ ...user.toObject(), id: user._id.toString() });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (user) {
      await Attendance.deleteMany({ employeeId: user.employeeId });
      await User.findByIdAndDelete(id);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/attendance', async (req, res) => {
  try {
    const attendance = await Attendance.find();
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/attendance/stats', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const empsCount = await User.countDocuments();
    const presentCount = await Attendance.countDocuments({ date: today });
    
    const absent = empsCount - presentCount;
    res.json({
      total: empsCount,
      present: presentCount,
      absent: absent < 0 ? 0 : absent
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/attendance', async (req, res) => {
  try {
    const { employeeId, type, timestamp } = req.body;
    const date = new Date(timestamp).toISOString().split('T')[0];
    
    let record = await Attendance.findOne({ employeeId, date });

    if (type === 'check-in') {
      const nowHoursStr = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }).format(new Date(timestamp));
      const nowHours = parseInt(nowHoursStr, 10);
      if (nowHours >= 18 && nowHours !== 24) { // Note: 24 might format depending on locale, safer check to just cap over 18.
        return res.status(400).json({ message: 'Check-in is closed after 6:00 PM. You are marked as absent.' });
      }

      if (record) return res.status(400).json({ message: 'Already checked in today' });
      const newRecord = await Attendance.create({
        employeeId,
        date,
        checkInTime: timestamp,
        status: 'Present'
      });
      return res.status(201).json(newRecord);
    } else if (type === 'check-out') {
      if (!record) return res.status(400).json({ message: 'Must check in first' });
      if (record.checkOutTime) return res.status(400).json({ message: 'Already checked out today' });
      
      const checkInTimeDate = new Date(record.checkInTime);
      const requestTimeDate = new Date(timestamp);
      
      if (requestTimeDate < checkInTimeDate) {
         return res.status(400).json({ message: 'Checkout time cannot be earlier than checkin time. If this is a next day shift, please contact admin.' });
      }

      let finalCheckOut = new Date(timestamp);
      const sixPM = new Date(getSixPM_IST_ISO(checkInTimeDate));
      if (finalCheckOut > sixPM) finalCheckOut = sixPM;

      const user = await User.findOne({ employeeId: record.employeeId });
      const rate = user ? (user.hourlyRate || 41.5) : 41.5;
      const { hours, salary } = calculateWorkedHoursAndSalary(record.checkInTime, finalCheckOut.toISOString(), rate);

      record.checkOutTime = finalCheckOut.toISOString();
      record.workedHours = hours;
      record.dailySalary = salary;
      record.status = hours >= 8 ? 'Full Day' : 'Present';
      await record.save();
      return res.json(record);
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/attendance/auto-checkout', async (req, res) => {
  try {
    const { employeeId } = req.body;
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const isoTimestamp = getSixPM_IST_ISO();

    let record = await Attendance.findOne({ employeeId, date: today });
    if (record && !record.checkOutTime && record.status === 'Present') {
      const user = await User.findOne({ employeeId: record.employeeId });
      const rate = user ? (user.hourlyRate || 41.5) : 41.5;
      const { hours, salary } = calculateWorkedHoursAndSalary(record.checkInTime, isoTimestamp, rate);
      
      record.checkOutTime = isoTimestamp;
      record.workedHours = hours;
      record.dailySalary = salary;
      record.status = hours >= 8 ? 'Full Day' : 'Present';
      await record.save();
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Serve static files from the frontend/dist directory
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Wildcard route to serve index.html for client-side routing
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
});

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    // Ensure default admin exists based on earlier data structure
    const adminExists = await User.findOne({ email: 'harrishn052@gmail.com' });
    if (!adminExists) {
      await User.create({
        role: 'admin',
        name: 'Harrish',
        email: 'harrishn052@gmail.com',
        password: 'Harrish123',
        employeeId: 'KCN_SLM'
      });
      console.log('Default admin created in DB');
    }
    
    app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
  })
  .catch(err => console.error('MongoDB connection error:', err));
