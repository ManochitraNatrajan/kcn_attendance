const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const fs = require('fs');
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
const get600PM_IST_ISO = (dateRef = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
  const ymd = formatter.format(dateRef); // Returns YYYY-MM-DD in IST
  return new Date(`${ymd}T18:00:00+05:30`).toISOString();
};

const calculateWorkedHoursAndSalary = (checkIn, checkOut, hourlyRate = 0) => {
  let start = new Date(checkIn);
  let end = new Date(checkOut);
  
  if (end < start) {
    end = start;
  }

  // Reference times
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
  const ymd = formatter.format(start);

  // Cap checkIn at 9:00 AM
  const nineAM = new Date(`${ymd}T09:00:00+05:30`);
  if (start < nineAM) start = nineAM;

  const diffMs = end - start;
  let totalMinutes = 0;
  if (diffMs > 0) {
     totalMinutes = Math.floor(diffMs / (1000 * 60));
  }
  
  let salary = totalMinutes * (hourlyRate / 60);
  
  const finalHours = totalMinutes / 60;
  
  return { 
    hours: finalHours, 
    salary
  };
};

// Cron Job: Auto-checkout at 6:00 PM daily IST
// Cron Job: Auto-mark absent at 6:00 PM daily IST
cron.schedule('0 18 * * *', async () => {
  try {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

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
    console.error('[Cron] Error in auto-absent job:', error);
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
    
    // Validate salary if present
    if (req.body.salary !== undefined) {
      const parsedSalary = parseFloat(req.body.salary);
      if (isNaN(parsedSalary) || parsedSalary < 0) {
        return res.status(400).json({ message: 'Salary must be a positive numeric value.' });
      }
      req.body.salary = parsedSalary;
    }

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
      const istTimeStr = new Date(timestamp).toLocaleString("en-US", {timeZone: "Asia/Kolkata"});
      const istDateObj = new Date(istTimeStr);
      const currentMins = istDateObj.getHours() * 60 + istDateObj.getMinutes();
      
      if (currentMins >= 1080) {
         return res.status(400).json({ message: 'Check-in is closed after 6:00 PM. You are marked as absent.' });
      }
      if (currentMins < 535) {
         return res.status(400).json({ message: 'Check-in is only available from 8:55 AM onwards.' });
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


      const user = await User.findOne({ employeeId: record.employeeId });
      const { hours, salary } = calculateWorkedHoursAndSalary(record.checkInTime, finalCheckOut.toISOString(), user?.salary || 0);

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



// Serve static files from the local dist directory
const distPath = path.join(__dirname, 'dist');
const indexPath = path.join(distPath, 'index.html');

if (!fs.existsSync(distPath)) {
  console.error(`[Static File Warning] Dist directory NOT found at: ${distPath}`);
} else if (!fs.existsSync(indexPath)) {
  console.error(`[Static File Warning] index.html NOT found at: ${indexPath}`);
} else {
  console.log(`[Static File Info] Serving static files from: ${distPath}`);
}

app.use(express.static(distPath));

// Wildcard route to serve index.html for client-side routing
app.get(/.*/, (req, res) => {
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send(`Error: frontend/dist/index.html not found. Path: ${indexPath}`);
  }
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
