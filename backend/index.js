const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json({ limit: '5mb' }));

async function readData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(data);
    if (!parsed.users) {
      parsed.users = [{ id: "1", role: "admin", name: "Harrish", email: "mano@gmail.com", password: "admin", employeeId: "kcn-slm" }];
      if (parsed.employees) {
        parsed.employees.forEach(e => parsed.users.push({ ...e, role: 'employee', password: e.employeeId.toLowerCase(), email: e.email || `${e.employeeId.toLowerCase()}@kcn.com` }));
        delete parsed.employees;
      }
      await writeData(parsed);
    }
    if (!parsed.attendance) parsed.attendance = [];
    return parsed;
  } catch (error) {
    if (error.code === 'ENOENT') {
      const defaultData = { 
        users: [
          { id: "1", role: "admin", name: "Harrish", email: "mano@gmail.com", password: "admin", employeeId: "kcn-slm" }
        ], 
        attendance: [] 
      };
      await writeData(defaultData);
      return defaultData;
    }
    throw error;
  }
}

async function writeData(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

readData().then(() => console.log('Data file loaded/created'));

app.post('/api/login', async (req, res) => {
  const { email, password, employeeId } = req.body;
  const data = await readData();
  const user = data.users.find(u => 
    u.email.toLowerCase() === email.toLowerCase() && 
    u.password === password && 
    u.employeeId.toUpperCase() === employeeId.toUpperCase()
  );
  
  if (user) {
    res.json({ success: true, user });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials. Check Email, Password, and ID.' });
  }
});

app.get('/api/employees', async (req, res) => {
  const data = await readData();
  res.json(data.users);
});

app.post('/api/employees', async (req, res) => {
  const newEmp = { id: Date.now().toString(), role: 'employee', ...req.body };
  const data = await readData();
  
  if (data.users.some(u => u.email === newEmp.email || u.employeeId === newEmp.employeeId)) {
    return res.status(400).json({ message: 'Employee with this Email or ID already exists.' });
  }

  data.users.push(newEmp);
  await writeData(data);
  res.status(201).json(newEmp);
});

app.put('/api/employees/:id', async (req, res) => {
  const { id } = req.params;
  const data = await readData();
  
  const index = data.users.findIndex(u => u.id === id);
  if (index === -1) return res.status(404).json({ message: 'User not found' });
  
  data.users[index] = { ...data.users[index], ...req.body };
  await writeData(data);
  res.json(data.users[index]);
});

app.delete('/api/employees/:id', async (req, res) => {
  const { id } = req.params;
  const data = await readData();
  
  const userToDelete = data.users.find(e => e.id === id);
  if (userToDelete) {
    data.attendance = data.attendance.filter(a => a.employeeId !== userToDelete.employeeId);
  }
  
  data.users = data.users.filter(e => e.id !== id);
  await writeData(data);
  res.json({ success: true });
});

app.get('/api/attendance', async (req, res) => {
  const data = await readData();
  res.json(data.attendance);
});

app.get('/api/attendance/stats', async (req, res) => {
  const data = await readData();
  const today = new Date().toISOString().split('T')[0];
  const emps = data.users; // Count everyone, including admin.
  const todayAttendance = data.attendance.filter(a => a.date === today);
  
  const present = todayAttendance.length;
  const absent = emps.length - present;
  
  res.json({
    total: emps.length,
    present,
    absent: absent < 0 ? 0 : absent
  });
});

app.post('/api/attendance', async (req, res) => {
  const { employeeId, type, timestamp } = req.body;
  const data = await readData();
  const date = new Date(timestamp).toISOString().split('T')[0];
  
  let record = data.attendance.find(a => a.employeeId === employeeId && a.date === date);

  if (type === 'check-in') {
    if (record) return res.status(400).json({ message: 'Already checked in today' });
    const newRecord = {
      id: Date.now().toString(),
      employeeId,
      date,
      checkInTime: timestamp,
      status: 'Present'
    };
    data.attendance.push(newRecord);
    await writeData(data);
    return res.status(201).json(newRecord);
  } else if (type === 'check-out') {
    if (!record) return res.status(400).json({ message: 'Must check in first' });
    if (record.checkOutTime) return res.status(400).json({ message: 'Already checked out today' });
    record.checkOutTime = timestamp;
    await writeData(data);
    return res.json(record);
  }
});

// Serve static files from the frontend/dist directory
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Wildcard route to serve index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
});

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
