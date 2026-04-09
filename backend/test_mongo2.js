require('dotenv').config();
const mongoose = require('mongoose');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const docs = await db.collection('attendances').find({}).toArray();
  console.log(JSON.stringify(docs, null, 2));
  mongoose.disconnect();
}
test();
