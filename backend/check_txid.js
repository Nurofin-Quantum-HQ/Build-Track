require("dotenv").config();
const mongoose = require("mongoose");
const Transaction = require("./models/Transaction");
mongoose.connect(process.env.MONGO_URI).then(async () => { 
  const txs = await Transaction.find({ transactionId: { $exists: true, $ne: '' } }); 
  console.log(txs.map(t => t.transactionId).length, "documents with transactionId found");
  if (txs.length) console.log(txs[txs.length - 1].transactionId);
  process.exit(0); 
});
