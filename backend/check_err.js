require("dotenv").config();
const mongoose = require("mongoose");
const Transaction = require("./models/Transaction");
mongoose.connect(process.env.MONGO_URI).then(async () => { 
  const t = {
    title: 'sandy',
    type: 'Materials',
    project: '66fa7a3a...', // something fake
    date: '2026-01-01',
    category: 'sandy',
    brand: 'sandy',
    unit: 'unit',
    quantity: 1,
    rate: 1,
    amount: 1000,
    paymentStatus: 'Partial',
    paymentMode: 'UPI',
    transactionId: '6aac3359c123456789012345'
  };
  
  try {
    const res = await Transaction.bulkWrite([{
      updateOne: {
        filter: { transactionId: t.transactionId },
        update: { $set: t },
        upsert: true
      }
    }]);
    console.log(res);
  } catch(e) {
    console.error("BulkWrite error:", e.message);
  }
  process.exit(0); 
});
