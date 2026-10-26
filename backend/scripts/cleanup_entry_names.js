// Clean up entry names for ONE account so Insights groups them properly.
//
//   node scripts/cleanup_entry_names.js --email owner@example.com                 # dry run: prints every planned rename
//   node scripts/cleanup_entry_names.js --email owner@example.com --apply         # writes (backs up old names first)
//   node scripts/cleanup_entry_names.js --email owner@example.com --restore <backupCollection>
//
// Extra renames (by type), repeatable:  --labour "Ravi Kumar=Mason"  --material "Sand bags=Sand"  --equipment "JCB hire=JCB"
//
// What it does (dry run shows all of it):
//  - Spacing: trims and collapses spaces ("M  sand " → "M sand").
//  - Same name, different spelling ("M sand", "M-Sand", "Msand"): all entries get the most common spelling.
//  - Materials: well-known simple items get one name (M-Sand, P-Sand, River Sand, Cement, Steel, Bricks, …) —
//    same rules as the app's Insights grouping (keep the two in sync). Kinds whose items differ (Doors &
//    Windows, Wood, Flooring, Paint, Electrical, Plumbing, Hardware, Chemicals, Shuttering) keep each item's
//    own name — only the spelling is unified. Items that match no rule keep their own name too; the app shows
//    them under "Miscellaneous" (renaming them to "Miscellaneous" would lose what they were).
//  - Explicit renames (--labour "Ravi Kumar=Mason") apply to the labour type (title) AND the contractor/team
//    field (category) — whichever holds that name.
//  - Inventory rows (stock is kept per name) are renamed the same way; rows that end up with the same name in
//    the same project are merged (purchased / used / closing stock added up). Skip with --skip-inventory.
//  - The original name is kept on each changed entry as `originalTitle`, and every old value (entries and whole
//    inventory rows) goes to a backup collection so --restore can undo the run.
// Never touches: income / money-in-out records, amounts, payments, dates, projects.
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

const args = process.argv.slice(2);
const arg = (name) => { const i = args.indexOf(name); return i === -1 ? null : args[i + 1]; };
const multi = (name) => args.flatMap((a, i) => (a === name ? [args[i + 1]] : [])).filter(Boolean);
const EMAIL = arg("--email");
const APPLY = args.includes("--apply");
const RESTORE = arg("--restore");
const SKIP_INV = args.includes("--skip-inventory");

const key = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const tidy = (s) => String(s || "").replace(/\s+/g, " ").trim();

// Keep in sync with lib/common/utils/entry_names.dart in the app (NAME-RULES).
// [parent, child, words]: child = the fixed simple name every match gets, or null = keep each item's own
// name (only its spelling is unified) — for kinds whose items differ meaningfully (UPVC door vs Teak door).
// Order matters (first match wins): Shuttering's own words before Doors & Windows ("shuttering" contains
// "shutter"); Doors & Windows before Steel/Aggregate/Electrical/Plumbing/Wood; Electrical before Plumbing.
const MATERIAL_RULES = [
  ["Sand", "M-Sand", ["msand", "manufacturedsand", "robosand"]],
  ["Sand", "P-Sand", ["psand", "plastersand", "plasteringsand"]],
  ["Sand", "River Sand", ["riversand"]],
  ["Sand", "Sand", ["sand"]],
  ["Cement", "Cement", ["cement", "opc", "ppc"]],
  ["Shuttering", null, ["shuttering", "centering", "centring"]],
  ["Doors & Windows", null, ["door", "window", "shutter", "grill", "grille"]],
  ["Steel", "Binding Wire", ["bindingwire"]],
  ["Steel", "Steel", ["tmt", "steel", "rebar", "rod"]],
  ["Aggregate", "Aggregate", ["jelly", "jalli", "jally", "aggregate", "bluemetal", "gravel", "stonechip", "metal"]],
  ["Bricks & Blocks", "Bricks", ["brick"]],
  ["Bricks & Blocks", "Blocks", ["block", "aac", "flyash"]],
  ["Concrete", "Ready-Mix Concrete", ["rmc", "readymix", "concrete"]],
  ["Electrical", null, ["wire", "cable", "conduit", "switch", "mcb", "electrical", "socket", "light", "fan"]],
  ["Plumbing", null, ["plumbing", "cpvc", "upvc", "pvc", "pipe", "tap", "valve", "fitting", "sanitary"]],
  ["Flooring", null, ["tile", "granite", "marble"]],
  ["Paint", null, ["putty", "paint", "primer", "emulsion", "enamel", "distemper"]],
  ["Wood", null, ["wood", "timber", "plywood", "ply", "teak", "frame"]],
  ["Chemicals", null, ["waterproof", "admixture", "chemical", "sealant"]],
  ["Shuttering", null, ["plate"]],
  ["Water", "Water", ["water", "tanker"]],
  ["Hardware", null, ["nail", "screw", "bolt", "hardware", "hinge"]],
];
const materialRule = (name) => {
  const k = key(name);
  if (!k) return { parent: "Miscellaneous", child: null };
  // Long needles anywhere ("msand" in "M-Sand"); short ones (< 5) must start a word ("rod" ≠ "product").
  const tokens = String(name || "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  // ≤ 3 letters must be the whole word or its plural ("fan"/"fans", not "fancy").
  const hit = (w) => (w.length >= 5 ? k.includes(w)
    : w.length <= 3 ? tokens.some((t) => t === w || t === `${w}s`)
    : tokens.some((t) => t.startsWith(w)));
  for (const [parent, child, words] of MATERIAL_RULES) if (words.some(hit)) return { parent, child };
  return { parent: "Miscellaneous", child: null };
};

const kindOf = (tx) => {
  const t = String(tx.type || "").toLowerCase();
  if (t === "income" || t === "revenue") return null;
  if (t === "expense" && tx.category === "Money Out") return null; // Home money-out record
  if (t === "wages" || t === "labour") return "labour";
  if (t === "expense" || t === "equipment") return "equipment";
  return "material";
};
const parseRenames = (list) =>
  Object.fromEntries(list.map((s) => s.split("=")).filter((p) => p.length === 2).map(([a, b]) => [key(a), tidy(b)]));
const EXPLICIT = {
  labour: parseRenames(multi("--labour")),
  material: parseRenames(multi("--material")),
  equipment: parseRenames(multi("--equipment")),
};

(async () => {
  if (!process.env.MONGO_URI) { console.error("❌ MONGO_URI is not set (.env or environment)."); process.exit(1); }
  if (!EMAIL && !RESTORE) { console.error("Usage: --email <account owner email> [--apply] | --restore <backupCollection>"); process.exit(1); }
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  console.log(`Connected to ${mongoose.connection.host}/${mongoose.connection.name}`);
  const txCol = db.collection("transactions");

  if (RESTORE) {
    const rows = await db.collection(RESTORE).find({}).toArray();
    if (!APPLY) { console.log(`Dry run: would restore ${rows.length} entries from ${RESTORE}. Add --apply to restore.`); process.exit(0); }
    const txRows = rows.filter((r) => r.kind !== "inventory");
    const ops = txRows.map((r) => ({ updateOne: { filter: { _id: r._id }, update: r.hadOriginalTitle
      ? { $set: { title: r.title, materialName: r.materialName, category: r.category } }
      : { $set: { title: r.title, materialName: r.materialName, category: r.category }, $unset: { originalTitle: "" } } } }));
    if (ops.length) await txCol.bulkWrite(ops);
    const invRows = rows.filter((r) => r.kind === "inventory").map((r) => r.doc);
    if (invRows.length) {
      const inv = db.collection("inventories");
      await inv.deleteMany({ _id: { $in: invRows.map((d) => d._id) } });
      await inv.insertMany(invRows);
    }
    console.log(`✅ Restored ${ops.length} entries and ${invRows.length} inventory rows from ${RESTORE}.`);
    return mongoose.disconnect();
  }

  const owner = await db.collection("users").findOne({ email: EMAIL.toLowerCase().trim() });
  if (!owner) { console.error(`❌ No user with email ${EMAIL}`); process.exit(1); }
  const team = await db.collection("users").find({ createdBy: owner._id }, { projection: { _id: 1 } }).toArray();
  const projects = await db.collection("projects").find({ createdBy: owner._id }, { projection: { _id: 1, projectName: 1 } }).toArray();
  const txs = await txCol.find({ $or: [
    { createdBy: { $in: [owner._id, ...team.map((u) => u._id)] } },
    { project: { $in: projects.map((p) => p._id) } },
  ] }).project({ title: 1, materialName: 1, type: 1, category: 1, amount: 1, originalTitle: 1 }).toArray();
  console.log(`Account: ${owner.name} <${owner.email}> · ${projects.length} projects · ${team.length} team members · ${txs.length} entries\n`);

  // Most common tidy spelling per (kind, key).
  const spellings = new Map();
  for (const tx of txs) {
    const kind = kindOf(tx); if (!kind) continue;
    const name = tidy(tx.title || tx.materialName); if (!name) continue;
    const mk = `${kind}|${key(name)}`;
    const m = spellings.get(mk) || new Map();
    m.set(name, (m.get(name) || 0) + 1);
    spellings.set(mk, m);
  }
  const commonSpelling = (kind, name) => {
    const m = spellings.get(`${kind}|${key(name)}`);
    return m ? [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0] : name;
  };

  const plan = new Map(); // "kind|from→to" → {kind, from, to, n, amount, ids}
  const misc = new Map();
  for (const tx of txs) {
    const kind = kindOf(tx); if (!kind) continue;
    const current = String(tx.title || tx.materialName || "");
    const name = tidy(current); if (!name) continue;
    let to = EXPLICIT[kind][key(name)] || null;
    if (!to && kind === "material") {
      const r = materialRule(name);
      // Fixed child (M-Sand, Cement, …) → that name; keep-own-name kinds (Doors & Windows, Wood, …) and
      // Miscellaneous fall through to spelling unification only.
      if (r.child) to = r.child;
      else if (r.parent === "Miscellaneous") misc.set(commonSpelling(kind, name), (misc.get(commonSpelling(kind, name)) || 0) + 1);
    }
    if (!to) to = commonSpelling(kind, name);
    if (to === current) continue;
    const pk = `${kind}|${current}→${to}`;
    const p = plan.get(pk) || { kind, from: current, to, n: 0, amount: 0, ids: [] };
    p.n++; p.amount += Number(tx.amount) || 0; p.ids.push(tx);
    plan.set(pk, p);
  }

  // Explicit renames also apply to the contractor / team field (category).
  const catPlan = [];
  for (const tx of txs) {
    const kind = kindOf(tx); if (!kind || !tx.category) continue;
    const to = EXPLICIT[kind][key(tx.category)];
    if (to && to !== tx.category) catPlan.push({ tx, to });
  }
  const rows = [...plan.values()].sort((a, b) => a.kind.localeCompare(b.kind) || a.to.localeCompare(b.to) || a.from.localeCompare(b.from));
  if (!rows.length) console.log("Nothing to change — names are already clean.");
  let lastKind = "";
  for (const r of rows) {
    if (r.kind !== lastKind) { console.log(`\n== ${r.kind.toUpperCase()} ==`); lastKind = r.kind; }
    console.log(`  "${r.from}"  →  "${r.to}"   (${r.n} entr${r.n === 1 ? "y" : "ies"}, ₹${Math.round(r.amount).toLocaleString("en-IN")})`);
  }
  if (misc.size) {
    console.log(`\n== MATERIALS SHOWN UNDER "Miscellaneous" (names kept; add --material "Name=Simple name" to group them) ==`);
    for (const [n, c] of [...misc.entries()].sort()) console.log(`  ${n}  (${c})`);
  }
  if (catPlan.length) {
    console.log(`\n== CONTRACTOR / TEAM FIELD ==`);
    const g = new Map();
    for (const { tx, to } of catPlan) { const k = `${tx.category}→${to}`; g.set(k, (g.get(k) || 0) + 1); }
    for (const [k, n] of g) console.log(`  "${k.split("→")[0]}"  →  "${k.split("→")[1]}"   (${n})`);
  }
  const total = rows.reduce((s, r) => s + r.n, 0) + catPlan.length;
  console.log(`\n${total} entry name changes would be made.`);

  // Inventory: same renaming, then merge rows that land on the same (project, name).
  const invCol = db.collection("inventories");
  const invRows = SKIP_INV ? [] : await invCol.find({ createdBy: owner._id }).toArray();
  const invKind = (c) => (c === "labour" ? "labour" : c === "equipment" ? "equipment" : "material");
  const invTarget = (row) => {
    const kind = invKind(row.category);
    const name = tidy(row.materialName); if (!name) return row.materialName;
    let to = EXPLICIT[kind][key(name)];
    if (!to && kind === "material") to = materialRule(name).child;
    return to || commonSpelling(kind, name);
  };
  const invGroups = new Map();
  for (const row of invRows) {
    const to = invTarget(row);
    const gk = `${row.project}|${row.category}|${to}`;
    (invGroups.get(gk) || invGroups.set(gk, { to, rows: [] }).get(gk)).rows.push(row);
  }
  const invChanges = [...invGroups.values()].filter((g) => g.rows.length > 1 || g.rows[0].materialName !== g.to);
  if (invChanges.length) {
    console.log(`\n== INVENTORY (stock per name) ==`);
    for (const g of invChanges) console.log(`  ${g.rows.map((r) => `"${r.materialName}"`).join(" + ")}  →  "${g.to}"${g.rows.length > 1 ? "  (merged)" : ""}`);
  }

  if (!APPLY) { console.log("Dry run — nothing written. Add --apply to rename."); return mongoose.disconnect(); }
  if (!total && !invChanges.length) return mongoose.disconnect();
  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);
  const backupName = `cleanup_names_backup_${stamp}`;
  const changed = rows.flatMap((r) => r.ids.map((tx) => ({ tx, to: r.to })));
  const touched = new Map();
  for (const { tx } of changed) touched.set(String(tx._id), tx);
  for (const { tx } of catPlan) touched.set(String(tx._id), tx);
  const backupDocs = [...touched.values()].map((tx) => ({
    _id: tx._id, kind: "transaction", title: tx.title ?? null, materialName: tx.materialName ?? null,
    category: tx.category ?? null, hadOriginalTitle: tx.originalTitle != null,
  }));
  for (const g of invChanges) for (const row of g.rows) backupDocs.push({ _id: row._id, kind: "inventory", doc: row });
  if (backupDocs.length) await db.collection(backupName).insertMany(backupDocs);
  await txCol.bulkWrite(changed.map(({ tx, to }) => ({ updateOne: {
    filter: { _id: tx._id },
    update: { $set: {
      title: to,
      ...(tx.materialName != null ? { materialName: to } : {}),
      ...(tx.originalTitle == null ? { originalTitle: tx.title ?? tx.materialName ?? "" } : {}),
    } },
  } })));
  if (catPlan.length) {
    await txCol.bulkWrite(catPlan.map(({ tx, to }) => ({ updateOne: { filter: { _id: tx._id }, update: { $set: { category: to } } } })));
  }
  for (const g of invChanges) {
    const [keep, ...rest] = g.rows;
    const sum = (f) => g.rows.reduce((s, r) => s + (Number(r[f]) || 0), 0);
    try {
      await invCol.updateOne({ _id: keep._id }, { $set: {
        materialName: g.to, purchased: sum("purchased"), used: sum("used"), closingStock: sum("closingStock"),
      } });
      await invCol.deleteMany({ _id: { $in: rest.map((r) => r._id) } });
    } catch (e) {
      // Same name already used by another stock row in this project (unique index): leave these rows as they are.
      console.warn(`  ⚠️ Inventory "${g.to}" not merged (${e.code === 11000 ? "name already in use" : e.message}) — left unchanged.`);
    }
  }
  console.log(`✅ Renamed ${changed.length} entries, ${catPlan.length} contractor names, ${invChanges.length} inventory rows. Backup: ${backupName}`);
  console.log(`   Undo: node scripts/cleanup_entry_names.js --restore ${backupName} --apply`);
  await mongoose.disconnect();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
