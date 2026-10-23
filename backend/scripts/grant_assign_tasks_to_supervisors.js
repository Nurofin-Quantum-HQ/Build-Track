// One-off, run once after deploying fix/role-permission-checks.
//
// Assigning tasks used to be allowed for every Supervisor by role. It now needs
// the `assign_tasks` permission (Assign Role › "Assign Tasks"). This adds that
// permission to existing Supervisors so they keep what they could do before.
// Admins can switch it off per person afterwards.
//
//   node scripts/grant_assign_tasks_to_supervisors.js          # dry run: lists who would change
//   node scripts/grant_assign_tasks_to_supervisors.js --apply  # writes
require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");

async function run() {
  if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI is not set in .env — aborting to avoid connecting to the wrong database.");
    process.exit(1);
  }
  const apply = process.argv.includes("--apply");
  await mongoose.connect(process.env.MONGO_URI);
  const users = mongoose.connection.collection("users");
  const filter = { role: "Supervisor", permissions: { $ne: "assign_tasks" } };
  const targets = await users.find(filter, { projection: { email: 1, name: 1 } }).toArray();
  targets.forEach((u) => console.log(`${apply ? "✅" : "→"} ${u.email} (${u.name || ""})`));
  if (apply) {
    const res = await users.updateMany(filter, { $addToSet: { permissions: "assign_tasks" } });
    console.log(`Granted assign_tasks to ${res.modifiedCount} supervisor(s).`);
  } else {
    console.log(`${targets.length} supervisor(s) would get assign_tasks. Re-run with --apply to write.`);
  }
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
