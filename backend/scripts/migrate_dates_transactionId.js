// One-off: normalise Transaction dates to the stored format YYYY-MM-DD.
//
// Fields: date, paymentDate, paymentHistory[].date. Old rows hold BSON Dates,
// ISO strings with a time ("2026-10-22T18:30:00.000Z") or DD/MM/YYYY strings,
// which the app cannot parse (it then shows today's date).
// A timestamp with a zone is converted to the India calendar day (the app sends
// local midnight as UTC, so cutting the ISO string at "T" gave the day before).
// A timestamp without a zone keeps its written date.
//
//   node scripts/migrate_dates_transactionId.js          # dry run: lists what would change
//   node scripts/migrate_dates_transactionId.js --apply  # writes
//
// Uses the raw collection: through the Mongoose model a BSON Date is cast to a
// long "Thu Oct 23 2026 ..." string and would never be detected.
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const istDay = (d) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

// Returns the YYYY-MM-DD form, the same value if already fine, or null if unparseable.
function normalise(value) {
  if (value === null || value === undefined || value === "") return value;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : istDay(value);
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (YMD.test(v)) return v;
  let m = v.match(/^(\d{4}-\d{2}-\d{2})T[\d:.]+$/); // no zone → keep the written day
  if (m) return m[1];
  if (/^\d{4}-\d{2}-\d{2}T.+(Z|[+-]\d{2}:?\d{2})$/.test(v)) {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : istDay(d);
  }
  m = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/); // DD/MM/YYYY
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const d = new Date(v); // e.g. "Thu Oct 23 2026 00:00:00 GMT+0530"
  return isNaN(d.getTime()) ? null : istDay(d);
}

async function run() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set — aborting to avoid connecting to the wrong database.");
    process.exit(1);
  }
  const apply = process.argv.includes("--apply");
  await mongoose.connect(process.env.MONGO_URI);
  const { host, name } = mongoose.connection;
  console.log(`${apply ? "APPLY" : "DRY RUN"} on ${host}/${name}`);
  const col = mongoose.connection.collection("transactions");
  const cursor = col.find({}, { projection: { date: 1, paymentDate: 1, paymentHistory: 1 } });

  let changedDocs = 0;
  let unparseable = 0;
  const ops = [];
  for await (const tx of cursor) {
    const set = {};
    for (const field of ["date", "paymentDate"]) {
      const next = normalise(tx[field]);
      if (next === null) { unparseable++; console.warn(`  ? ${tx._id} ${field}=${JSON.stringify(tx[field])} left as is`); continue; }
      if (next !== tx[field]) set[field] = next;
    }
    if (Array.isArray(tx.paymentHistory)) {
      let histChanged = false;
      const hist = tx.paymentHistory.map((p) => {
        if (!p) return p;
        const next = normalise(p.date);
        if (next === null) { unparseable++; return p; }
        if (next !== p.date) { histChanged = true; return { ...p, date: next }; }
        return p;
      });
      if (histChanged) set.paymentHistory = hist;
    }
    if (Object.keys(set).length) {
      changedDocs++;
      const show = { ...set };
      if (show.paymentHistory) show.paymentHistory = `${show.paymentHistory.length} payment date(s)`;
      console.log(`${apply ? "✅" : "→"} ${tx._id} ${JSON.stringify(show)}`);
      if (apply) ops.push({ updateOne: { filter: { _id: tx._id }, update: { $set: set } } });
      if (ops.length >= 500) { await col.bulkWrite(ops); ops.length = 0; }
    }
  }
  if (apply && ops.length) await col.bulkWrite(ops);
  console.log(
    apply
      ? `Updated ${changedDocs} transaction(s). ${unparseable} value(s) could not be parsed and were left as is.`
      : `${changedDocs} transaction(s) would change; ${unparseable} unparseable value(s). Re-run with --apply to write.`
  );
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
