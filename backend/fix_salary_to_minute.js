const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/finance-attendance';

const run = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const users = await User.find();
    let updatedCount = 0;

    for (let user of users) {
      if (user.salary && user.salary > 0) {
        // I previously set them to ~37.98. Let's divide by 60 to get back to the per-minute rate they probably entered.
        user.salary = parseFloat((user.salary / 60).toFixed(4));
        await user.save();
        console.log(`Updated ${user.name} (${user.employeeId}) salary to ${user.salary} per min`);
        updatedCount++;
      }
    }

    console.log(`Successfully updated ${updatedCount} users to per minute rate.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
