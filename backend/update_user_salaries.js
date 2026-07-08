const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');

const User = require('./models/User');
const Attendance = require('./models/Attendance');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/finance-attendance';

const run = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const users = await User.find();
    let updatedCount = 0;

    for (let user of users) {
      if (!user.salary || user.salary === 0) {
        // Find latest attendance for this user
        const records = await Attendance.find({ employeeId: user.employeeId }).sort({ createdAt: -1 });
        
        let calculatedRate = 0;
        for (let rec of records) {
          if (rec.workedHours && rec.workedHours > 0 && rec.dailySalary && rec.dailySalary > 0) {
            calculatedRate = rec.dailySalary / rec.workedHours;
            break;
          }
        }

        if (calculatedRate > 0) {
          user.salary = parseFloat(calculatedRate.toFixed(2));
          await user.save();
          console.log(`Updated ${user.name} (${user.employeeId}) salary to ${user.salary}`);
          updatedCount++;
        }
      }
    }

    console.log(`Successfully updated ${updatedCount} users.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
