// Export all revenue entries (Income & Money Out) for all projects together and separately
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const Transaction = require("../models/Transaction");
const User = require("../models/User");
const Project = require("../models/Project");

function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  let str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

function sanitizeFilename(name) {
  return (name || "Project").replace(/[/\\?%*:|"<>]/g, "_").trim();
}

function formatINR(amount) {
  return "₹" + Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function run() {
  const args = process.argv.slice(2);
  let userIdentifier = null;

  // Check if an argument was passed
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--user" && args[i + 1]) {
      userIdentifier = args[i + 1];
      i++;
    } else if (!args[i].startsWith("--") && !userIdentifier) {
      userIdentifier = args[i];
    }
  }

  console.log("===============================================================");
  console.log("             BUILDTRACK REVENUE EXPORT UTILITY                 ");
  console.log("===============================================================");

  if (!process.env.MONGO_URI) {
    console.error("ERROR: MONGO_URI is missing in .env file!");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected successfully.\n");

  // 1. Optional user filtering
  let user = null;
  if (userIdentifier && userIdentifier.toLowerCase() !== "all") {
    if (mongoose.Types.ObjectId.isValid(userIdentifier)) {
      user = await User.findById(userIdentifier);
    }
    if (!user) {
      user = await User.findOne({
        $or: [
          { email: new RegExp(userIdentifier.trim(), "i") },
          { name: new RegExp(userIdentifier.trim(), "i") },
        ],
      });
    }

    if (!user) {
      console.error(`ERROR: User "${userIdentifier}" not found in database!`);
      await mongoose.disconnect();
      return;
    }
    console.log(`Filtered for User: ${user.name} (${user.email} | ID: ${user._id})`);
  } else {
    console.log("Mode: Exporting ALL revenue records across ALL users & projects.");
  }

  // 2. Build the query to catch ALL revenue (Income, Money In, and Money Out)
  const query = {
    $or: [
      { type: "Income" },
      { category: { $regex: "^(revenue|income)$", $options: "i" } },
    ],
  };

  if (user) {
    // Find all projects belonging to this user or created by them
    const userProjects = await Project.find({
      $or: [{ createdBy: user._id }, { _id: { $in: user.projectIds || [] } }],
    }).select("_id projectName");

    const projectIds = userProjects.map((p) => p._id);

    query.$and = [
      {
        $or: [
          { createdBy: user._id },
          { project: { $in: projectIds } },
        ],
      },
    ];
  }

  // 3. Query all matching transactions with full details
  console.log("Fetching revenue transactions from database...");
  const transactions = await Transaction.find(query)
    .populate("project", "projectName projectCode")
    .populate("createdBy", "name email")
    .sort({ project: 1, date: -1, createdAt: -1 })
    .lean();

  console.log(`Found ${transactions.length} total revenue transaction(s).\n`);

  if (transactions.length === 0) {
    console.log("No revenue transactions found matching criteria.");
    await mongoose.disconnect();
    return;
  }

  // 4. Group transactions by Project Name
  const groupedByProject = {};
  let overallMoneyIn = 0;
  let overallMoneyOut = 0;

  transactions.forEach((t) => {
    const rawAmt = Number(t.amount) || 0;
    if (rawAmt >= 0) {
      overallMoneyIn += rawAmt;
    } else {
      overallMoneyOut += Math.abs(rawAmt);
    }

    let projectName = "General / Unassigned";
    let projectCode = "N/A";

    if (t.project) {
      projectName = t.project.projectName || "Unnamed Project";
      projectCode = t.project.projectCode || "";
    }

    if (!groupedByProject[projectName]) {
      groupedByProject[projectName] = {
        code: projectCode,
        transactions: [],
        moneyIn: 0,
        moneyOut: 0,
      };
    }

    if (rawAmt >= 0) {
      groupedByProject[projectName].moneyIn += rawAmt;
    } else {
      groupedByProject[projectName].moneyOut += Math.abs(rawAmt);
    }

    groupedByProject[projectName].transactions.push(t);
  });

  // 5. Setup output directories
  const exportDir = path.join(process.cwd(), "revenue_exports");
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  // CSV Headers
  const csvHeaders = [
    "Project Name",
    "Project Code",
    "Date",
    "Title",
    "Flow",
    "Amount (INR)",
    "Absolute Amount (INR)",
    "Type",
    "Payment Mode",
    "Payment Status",
    "Payment Date",
    "Category",
    "Created By User",
    "User Email",
    "Client Email",
    "Notes",
    "Remarks",
    "Transaction ID",
    "Created At",
  ];

  const formatRow = (t, pName, pCode) => {
    const rawAmt = Number(t.amount) || 0;
    const isMoneyIn = rawAmt >= 0;
    const flowText = isMoneyIn ? "Money In (Income)" : "Money Out (Refund / Outflow)";
    const absAmt = Math.abs(rawAmt);

    return [
      escapeCsv(pName),
      escapeCsv(pCode || ""),
      escapeCsv(t.date || ""),
      escapeCsv(t.title || ""),
      escapeCsv(flowText),
      escapeCsv(rawAmt),
      escapeCsv(absAmt),
      escapeCsv(t.type || "Income"),
      escapeCsv(t.paymentMode || ""),
      escapeCsv(t.paymentStatus || ""),
      escapeCsv(t.paymentDate || ""),
      escapeCsv(t.category || ""),
      escapeCsv(t.createdBy?.name || ""),
      escapeCsv(t.createdBy?.email || ""),
      escapeCsv(t.clientEmail || ""),
      escapeCsv(t.notes || ""),
      escapeCsv(t.remarks || ""),
      escapeCsv(t.transactionId || t._id),
      escapeCsv(t.createdAt ? new Date(t.createdAt).toISOString() : ""),
    ].join(",");
  };

  const masterRows = [];

  console.log("------------------------ PROJECT BREAKDOWN ------------------------");
  for (const [projName, data] of Object.entries(groupedByProject)) {
    const net = data.moneyIn - data.moneyOut;
    console.log(`📁 Project: "${projName}"`);
    console.log(`   - Records  : ${data.transactions.length}`);
    console.log(`   - Money In : ${formatINR(data.moneyIn)}`);
    console.log(`   - Money Out: ${formatINR(data.moneyOut)}`);
    console.log(`   - Net      : ${formatINR(net)}`);
    console.log("");

    // Generate individual CSV file for this project
    const projRows = data.transactions.map((t) => {
      const row = formatRow(t, projName, data.code);
      masterRows.push(row);
      return row;
    });

    const individualCsv = [csvHeaders.join(","), ...projRows].join("\n");
    const filename = `${sanitizeFilename(projName)}_revenue.csv`;
    fs.writeFileSync(path.join(exportDir, filename), individualCsv, "utf-8");
  }

  // Generate Master Combined CSV for all projects
  const masterCsv = [csvHeaders.join(","), ...masterRows].join("\n");
  const masterFilename = "ALL_PROJECTS_REVENUE_COMBINED.csv";
  const masterFilePath = path.join(exportDir, masterFilename);
  fs.writeFileSync(masterFilePath, masterCsv, "utf-8");

  const overallNet = overallMoneyIn - overallMoneyOut;

  console.log("========================= OVERALL TOTALS =========================");
  console.log(` Total Projects : ${Object.keys(groupedByProject).length}`);
  console.log(` Total Records  : ${transactions.length}`);
  console.log(` Total Money In : ${formatINR(overallMoneyIn)}`);
  console.log(` Total Money Out: ${formatINR(overallMoneyOut)}`);
  console.log(` Net Revenue    : ${formatINR(overallNet)}`);
  console.log("==================================================================");

  console.log(`\nSUCCESS! All CSV files have been created in:`);
  console.log(`📂 ${exportDir}\n`);
  console.log(`1. Master Combined Sheet (All Projects):`);
  console.log(`   - ${masterFilename}`);
  console.log(`2. Individual Project Sheets:`);
  Object.keys(groupedByProject).forEach((projName) => {
    console.log(`   - ${sanitizeFilename(projName)}_revenue.csv`);
  });
  console.log("\nYou can open any of these CSV files directly in Microsoft Excel.");

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Export script error:", err);
  process.exit(1);
});
