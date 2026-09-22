require("dotenv").config();
const mongoose = require("mongoose");
const Transaction = require("./models/Transaction");

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/buildtrack");
  console.log("Connected to MongoDB");

  const transactions = await Transaction.collection.find({}).toArray();
  let updated = 0;

  for (const t of transactions) {
    let needsUpdate = false;
    const updateDoc = {};

    if (t.date && typeof t.date === "object" && t.date instanceof Date) {
      updateDoc.date = t.date.toISOString().split("T")[0];
      needsUpdate = true;
    }

    if (t.paymentDate && typeof t.paymentDate === "object" && t.paymentDate instanceof Date) {
      updateDoc.paymentDate = t.paymentDate.toISOString().split("T")[0];
      needsUpdate = true;
    }

    if (t.paymentHistory && Array.isArray(t.paymentHistory)) {
      let historyChanged = false;
      const newHistory = t.paymentHistory.map(ph => {
        if (ph.date && typeof ph.date === "object" && ph.date instanceof Date) {
          historyChanged = true;
          return { ...ph, date: ph.date.toISOString().split("T")[0] };
        }
        return ph;
      });
      
      if (historyChanged) {
        updateDoc.paymentHistory = newHistory;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      await Transaction.collection.updateOne({ _id: t._id }, { $set: updateDoc });
      updated++;
    }
  }

  console.log(`Migration complete. Updated ${updated} transactions.`);
  process.exit(0);
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
