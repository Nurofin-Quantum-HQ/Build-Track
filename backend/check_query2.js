require("dotenv").config();
const mongoose = require("mongoose");
const Transaction = require("./models/Transaction");
mongoose.connect(process.env.MONGO_URI).then(async () => { 
  const txs = await Transaction.find({ $or: [{ brand: /sandy/i }, { category: /sandy/i }, { materialType: /sandy/i }] }); 
  console.log(txs.length); 
  if(txs.length) console.log(txs[0]); 
  
  const dtx = await Transaction.find({ date: '2026-01-01' });
  console.log('2026-01-01 count:', dtx.length);
  process.exit(0); 
});
