// One-off backfill for the Reports ledger.
//
// Loans were never tracked: people typed "loan repayment" etc. into money-out
// titles/notes. This applies the same text rules the ledger report uses
// (services/ledger.js) and stores the result in Transaction.ledgerCategory.
// It writes ONLY ledgerCategory, and only on entries that have none yet.
// Amounts, dates, payments and everything else are never touched.
//
// By default only the entries that need the text rules are tagged
// (loan_received / loan_repayment). Everything else is derived from type
// on the fly, so tagging it would only freeze a guess. Use --all to tag every
// untagged entry anyway.
//
//   node scripts/tag_ledger_categories.js                # dry run: lists what would be tagged
//   node scripts/tag_ledger_categories.js --apply        # writes
//   node scripts/tag_ledger_categories.js --all [--apply]
require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const { ledgerCategoryByRules } = require("../services/ledger");

async function run() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set in .env — aborting to avoid connecting to the wrong database.");
    process.exit(1);
  }
  const apply = process.argv.includes("--apply");
  const all = process.argv.includes("--all");
  await mongoose.connect(process.env.MONGO_URI);
  const txs = mongoose.connection.collection("transactions");
  const untagged = { $or: [{ ledgerCategory: { $exists: false } }, { ledgerCategory: null }, { ledgerCategory: "" }] };
  const projection = { title: 1, originalTitle: 1, notes: 1, remarks: 1, type: 1, category: 1, amount: 1, date: 1 };

  const counts = {};
  let ops = [];
  let tagged = 0;
  let scanned = 0;
  const flush = async () => {
    if (!ops.length) return;
    const res = await txs.bulkWrite(ops, { ordered: false });
    tagged += res.modifiedCount;
    ops = [];
  };

  for await (const t of txs.find(untagged, { projection })) {
    scanned++;
    const cat = ledgerCategoryByRules(t);
    if (!all && cat !== "loan_received" && cat !== "loan_repayment") continue;
    counts[cat] = (counts[cat] || 0) + 1;
    console.log(`${apply ? "tag" : "->"} ${cat.padEnd(15)} ${String(t.date || "").slice(0, 10)}  ${t.type}  ${t.amount}  "${t.title}"`);
    if (apply) {
      // Re-check "still untagged" in the filter so a concurrent edit is never overwritten.
      ops.push({ updateOne: { filter: { _id: t._id, ...untagged }, update: { $set: { ledgerCategory: cat } } } });
      if (ops.length >= 500) await flush();
    }
  }
  await flush();

  console.log(`\nScanned ${scanned} untagged entr${scanned === 1 ? "y" : "ies"}.`);
  Object.entries(counts).forEach(([c, n]) => console.log(`  ${c}: ${n}`));
  if (apply) console.log(`Tagged ${tagged} entr${tagged === 1 ? "y" : "ies"}.`);
  else console.log("Dry run — nothing written. Re-run with --apply to write.");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
