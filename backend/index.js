require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const cron = require('node-cron');

const User = require('./models/User');
const Attendance = require('./models/Attendance');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/finance-attendance';

app.use(cors());
app.use(express.json({ limit: '5mb' }));

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
  })
  .catch(err => console.error('MongoDB connection error:', err));

const calculateWorkedHoursAndSalary = (checkIn, checkOut, hourlyRate) => {
  const start = new Date(checkIn);
  let end = new Date(checkOut);
  
  // Cap at 6:00 PM (18:00) for salary calculation
  const sixPM = new Date(end);
  sixPM.setHours(18, 0, 0, 0);
  if (end > sixPM) end = sixPM;

  const diffMs = end - start;
  const hours = Math.max(0, diffMs / (1000 * 60 * 60)); // Handle cases where checkout < checkin (though shouldn't happen)
  const roundedHours = Math.round(hours * 100) / 100; // 2 decimal places
  const salary = Math.round(roundedHours * (hourlyRate || 0) * 100) / 100;
  
  return { hours: roundedHours, salary };
};

// Cron Job: Auto-checkout at 6:00 PM daily
cron.schedule('0 18 * * *', async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const timestamp = new Date();
    timestamp.setHours(18, 0, 0, 0); // Exactly 6 PM
    const isoTimestamp = timestamp.toISOString();

    const activeRecords = await Attendance.find({ 
      date: today, 
      checkOutTime: { $exists: false },
      status: 'Present'
    });

    console.log(`[Cron] Running auto-checkout for ${activeRecords.length} employees at 6:00 PM`);

    for (const record of activeRecords) {
      const user = await User.findOne({ employeeId: record.employeeId });
      const { hours, salary } = calculateWorkedHoursAndSalary(record.checkInTime, isoTimestamp, user?.hourlyRate);
      
      record.checkOutTime = isoTimestamp;
      record.workedHours = hours;
      record.dailySalary = salary;
      await record.save();
    }
  } catch (error) {
    console.error('[Cron] Error in auto-checkout:', error);
  }
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
      
      const user = await User.findOne({ employeeId });
      const { hours, salary } = calculateWorkedHoursAndSalary(record.checkInTime, timestamp, user?.hourlyRate);

      record.checkOutTime = timestamp;
      record.workedHours = hours;
      record.dailySalary = salary;
      await record.save();
      return res.json(record);
    }
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

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
