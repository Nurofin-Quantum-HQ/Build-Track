require("dotenv").config();
const mongoose = require("mongoose");
const Transaction = require("./models/Transaction");
mongoose.connect(process.env.MONGO_URI).then(async () => { 
  const txs = await Transaction.find();
  const matched = txs.filter(t => t._id.toString().startsWith('6aac3359c'));
  console.log(matched.map(t => t._id));
  process.exit(0); 
});
