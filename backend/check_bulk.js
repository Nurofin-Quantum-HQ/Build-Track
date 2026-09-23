require("dotenv").config();
const mongoose = require("mongoose");
const Transaction = require("./models/Transaction");
mongoose.connect(process.env.MONGO_URI).then(async () => { 
  const tx = await Transaction.findOne(); 
  console.log('Found:', tx._id); 
  const res = await Transaction.bulkWrite([{ updateOne: { filter: { _id: tx._id.toString() }, update: { $set: { notes: 'test update' } } } }]); 
  console.log('BulkWrite string _id result:', res.modifiedCount, res.matchedCount); 
  process.exit(0); 
});
