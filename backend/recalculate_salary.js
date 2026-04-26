const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const fs = require('fs');

const Attendance = require('./models/Attendance');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/finance-attendance';

const get600PM_IST_ISO = (dateRef = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
  const ymd = formatter.format(dateRef);
  return new Date(`${ymd}T18:00:00+05:30`).toISOString();
};

const calculateWorkedHoursAndSalary = (checkIn, checkOut) => {
  let start = new Date(checkIn);
  let end = new Date(checkOut);
  
  if (end < start) {
    end = start;
  }

  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
  const ymd = formatter.format(start);
  const nineThirtyAM = new Date(`${ymd}T09:30:00+05:30`);
  const sixPM = new Date(`${ymd}T18:00:00+05:30`);

  if (end > sixPM) end = sixPM;
  if (start < nineThirtyAM) start = nineThirtyAM;

  const diffMs = end - start;
  let totalMinutes = 0;
  if (diffMs > 0) {
     totalMinutes = Math.floor(diffMs / (1000 * 60));
  }
  
  let salary = totalMinutes * (37.9753 / 60);
  const finalHours = totalMinutes / 60;
  
  return { 
    hours: finalHours, 
    salary
  };
};

const run = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const allRecords = await Attendance.find();
    console.log(`Found ${allRecords.length} attendance records.`);

    // Backup
    const backupPath = path.join(__dirname, `attendance_backup_${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(allRecords, null, 2));
    console.log(`Backup created at ${backupPath}`);

    let updatedCount = 0;

    for (let record of allRecords) {
      if (record.checkInTime && record.checkOutTime) {
        const { hours, salary } = calculateWorkedHoursAndSalary(record.checkInTime, record.checkOutTime);
        
        record.workedHours = hours;
        record.dailySalary = salary;
        record.status = hours >= 8 ? 'Full Day' : 'Present';
        await record.save();
        updatedCount++;
      } else if (record.checkInTime && !record.checkOutTime) {
        // If there's no checkout time but the date is past, should we auto-checkout?
        // Let's just calculate if it's past 6 PM IST
        const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
        const nowIST = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
        const todayStr = formatter.format(nowIST);

        let shouldCheckout = false;
        if (record.date < todayStr) {
            shouldCheckout = true;
        } else if (record.date === todayStr && (nowIST.getHours() * 60 + nowIST.getMinutes()) >= 1080) {
            shouldCheckout = true;
        }

        if (shouldCheckout) {
            const checkInTimeDate = new Date(record.checkInTime);
            const isoTimestamp = get600PM_IST_ISO(checkInTimeDate);
            const { hours, salary } = calculateWorkedHoursAndSalary(record.checkInTime, isoTimestamp);
            
            record.checkOutTime = isoTimestamp;
            record.workedHours = hours;
            record.dailySalary = salary;
            record.status = hours >= 8 ? 'Full Day' : 'Present';
            await record.save();
            updatedCount++;
        }
      }
    }

    console.log(`Successfully recalculated and updated ${updatedCount} records.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
