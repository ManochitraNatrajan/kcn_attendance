const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  date: { type: String, required: true },
  checkInTime: { type: String, required: true },
  checkOutTime: { type: String },
  status: { type: String, required: true },
  workedHours: { type: Number, default: 0 },
  dailySalary: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
