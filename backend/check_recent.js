require("dotenv").config();
const mongoose = require("mongoose");
const Transaction = require("./models/Transaction");
mongoose.connect(process.env.MONGO_URI).then(async () => { 
  const tId = '6aac3359c';
  // Let's just grab the last 20 transactions and see what they are.
  const txs = await Transaction.find().sort({ _id: -1 }).limit(20);
  console.log(txs.map(t => ({ id: t._id, date: t.date, brand: t.brand })));
  process.exit(0); 
});
