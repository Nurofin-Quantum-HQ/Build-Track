const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Transaction = require("../models/Transaction");

async function migrateDates() {
  if (!process.env.MONGO_URI) {
    console.error("Missing MONGO_URI");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log("Connected to MongoDB. Migrating Transaction dates to YYYY-MM-DD string...");

  const transactions = await Transaction.find({});
  let migrated = 0;

  for (const tx of transactions) {
    let changed = false;

    // Convert date
    if (tx.date && typeof tx.date !== "string") {
      try {
        const d = new Date(tx.date);
        if (!isNaN(d.getTime())) {
          tx.date = d.toISOString().split("T")[0];
          changed = true;
        }
      } catch(e) {}
    } else if (tx.date && typeof tx.date === "string" && tx.date.includes("T")) {
      tx.date = tx.date.split("T")[0];
      changed = true;
    }

    // Convert paymentDate
    if (tx.paymentDate && typeof tx.paymentDate !== "string") {
      try {
        const d = new Date(tx.paymentDate);
        if (!isNaN(d.getTime())) {
          tx.paymentDate = d.toISOString().split("T")[0];
          changed = true;
        }
      } catch(e) {}
    } else if (tx.paymentDate && typeof tx.paymentDate === "string" && tx.paymentDate.includes("T")) {
      tx.paymentDate = tx.paymentDate.split("T")[0];
      changed = true;
    }

    if (changed) {
      await tx.save({ validateBeforeSave: false }); // Bypass full validation in case of old dirty data
      migrated++;
    }
  }

  console.log(\`Migration completed. Migrated \${migrated} transactions.\`);
  process.exit(0);
}

migrateDates().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
