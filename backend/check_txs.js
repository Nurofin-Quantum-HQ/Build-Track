require('dotenv').config();
const mongoose = require('mongoose');
const Transaction = require('./models/Transaction');

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/billtrack')
  .then(async () => {
    const txs = await Transaction.find().sort({ createdAt: -1 }).limit(10);
    console.log("LATEST TRANSACTIONS:");
    txs.forEach(t => {
      console.log(`ID: ${t._id}, TX_ID: ${t.transactionId}, DATE: ${t.date}, AMT: ${t.amount}, TYPE: ${t.type}, CREATED: ${t.createdAt}`);
    });
    process.exit(0);
  });
