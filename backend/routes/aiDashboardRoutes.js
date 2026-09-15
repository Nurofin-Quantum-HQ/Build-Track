const express = require("express");
const router = express.Router();
const Project = require("../models/Project");
const { protect, getAdminId, canAccessProjectFilter } = require("../middleware/auth");
const aiProvider = require("../services/ai/groqProvider.js");
const { GroqAuthError } = require("../services/ai/groqProvider.js");
const { generateMongoQuery } = require("../services/reports/mongoAiQueryGenerator");
const { executeAiQuery } = require("../services/reports/mongoAiExecutor");
router.use(protect);
async function buildBaseScope(req) {
  const isAdmin = req.user.role === "Admin";
  const adminId = await getAdminId(req.user);
  const projectFilter = isAdmin
    ? { createdBy: req.user._id }
    : canAccessProjectFilter(req);
  const projects = await Project.find(projectFilter)
    .select("_id projectName").lean();
  const projectScopeIds = projects.map(p => p._id);
  return { isAdmin, adminId, projectFilter, projectScopeIds, projects };
}
const COLUMN_TO_FIELD_MAP = {
  "Purchased Date": "date",
  "Project": "projectName",
  "Type": "category",
  "Description": "item",
  "Brand": "brand",
  "Floor": "phase",
  "Phase": "phase",
  "Activity": "activity",
  "Unit": "unit",
  "Qty": "quantity",
  "Status": "paymentStatus",
  "Amount (INR)": "amount",
  "Worker": "worker",
  "Supplier": "supplier",
  "Rate": "rate",
  "Payment Date": "date"
};
function formatDynamicRows(rows, requestedColumns, tableType) {
  return rows.map((r, idx) => {
    const mobileRow = { number: idx + 1 };
    for (const colName of requestedColumns) {
      if (colName === "Amount (INR)" && tableType === "inventory") {
        mobileRow[colName] = r.closingStock ?? 0;
      } else {
        const fieldKey = COLUMN_TO_FIELD_MAP[colName];
        if (fieldKey && r[fieldKey] !== undefined && r[fieldKey] !== null && r[fieldKey] !== "") {
          if (colName === "Qty" && r.unit && r.unit !== "-") {
             mobileRow[colName] = `${r.quantity} ${r.unit}`;
          } else {
             mobileRow[colName] = r[fieldKey];
          }
        } else {
          mobileRow[colName] = "-";
        }
      }
    }
    return mobileRow;
  });
}
router.post("/query", async (req, res) => {
  const reqId = Math.random().toString(16).slice(2, 7).toUpperCase();
  let timeoutTimer;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutTimer = setTimeout(() => {
      const err = new Error("AI taking too long");
      err.isTimeout = true;
      err.statusCode = 504;
      reject(err);
    }, 15000);
    if (timeoutTimer.unref) timeoutTimer.unref();
  });

  const queryLogic = async () => {
    const { query } = req.body;
    if (!query || !query.trim()) {
      const err = new Error("Please provide a search query.");
      err.statusCode = 400;
      throw err;
    }
    const baseScope = await buildBaseScope(req);
    const projectsList = baseScope.projects.map(p => ({
      id: p._id.toString(),
      name: p.projectName
    }));
    let queryPlan;
    try {
      queryPlan = await generateMongoQuery(
        query,
        baseScope.projectScopeIds,
        baseScope.adminId,
        projectsList
      );
    } catch (aiError) {
      if (aiError instanceof GroqAuthError || aiError.name === "GroqAuthError") {
        console.error(`[${reqId}] GroqAuthError: ${aiError.message}`);
        const err = new Error(aiError.message);
        err.statusCode = 500;
        err.authError = true;
        throw err;
      }
      console.error(`[${reqId}] AI Query Generation Error:`, aiError.message);
      const err = new Error(aiError.message || "The AI service returned an unexpected response. Please try again.");
      err.statusCode = 500;
      throw err;
    }
    const analyticsData = await executeAiQuery(
      queryPlan,
      baseScope.projectScopeIds
    );
    console.log(`[${reqId}] Query: "${query}" → ${analyticsData.rowCount} rows from ${queryPlan.collection}`);
    const mobileRows = formatDynamicRows(analyticsData.rows, queryPlan.requested_columns, analyticsData.tableType);
    const total = analyticsData.tableType === "inventory"
      ? (analyticsData.totalPurchased || 0)
      : (analyticsData.totalAmount || 0);
    let summary = `Found ${analyticsData.rowCount} records.`;
    try {
      summary = await aiProvider.generateSummary(analyticsData, query, reqId);
    } catch(e) {
      if (e instanceof GroqAuthError || e.name === "GroqAuthError") {
        console.error(`[${reqId}] Summary skipped (auth error): ${e.message}`);
        summary = `Found ${analyticsData.rowCount} records. (AI summary unavailable — API key issue)`;
      } else {
        console.error(`[${reqId}] Summary generation failed:`, e.message);
      }
    }
    let followUps = ["Export CSV", "Filter by project", "Show summary"];
    try {
      followUps = await aiProvider.generateFollowups({
        query,
        rowCount: analyticsData.rowCount,
        tableType: analyticsData.tableType,
        collection: queryPlan.collection
      }, reqId);
    } catch(e) {}
    let alerts = [];
    try {
      if (queryPlan.collection === "inventories") {
        alerts = analyticsData.rows
          .filter(r => r.severity === "critical")
          .map(r => ({
            type: "critical",
            message: `${r.item} is critically low: ${r.closingStock} ${r.unit} remaining (min: ${r.threshold})`
          }));
        const lowAlerts = analyticsData.rows
          .filter(r => r.severity === "low")
          .map(r => ({
            type: "warning",
            message: `${r.item} is running low: ${r.closingStock} ${r.unit} remaining`
          }));
        alerts = [...alerts, ...lowAlerts];
      }
    } catch(e) {}
    return {
      success: true,
      data: {
        summary,
        metrics: analyticsData.metrics,
        table: {
          type: analyticsData.tableType,
          columns: queryPlan.requested_columns,
          rows: mobileRows,
          total,
          totalAmount: analyticsData.totalAmount,
          totalPurchased: analyticsData.totalPurchased,
          rowCount: analyticsData.rowCount
        },
        charts: {
          projectBreakdown: analyticsData.projectBreakdown,
          comparisonData: analyticsData.comparisonData
        },
        alerts,
        actions: followUps
      }
    };
  };

  try {
    const payload = await Promise.race([queryLogic(), timeoutPromise]);
    clearTimeout(timeoutTimer);
    return res.json(payload);
  } catch (error) {
    clearTimeout(timeoutTimer);
    console.error(`[${reqId}] AI Dashboard Error:`, error.message);
    if (error.isTimeout || error.statusCode === 504 || error.message === "AI taking too long") {
      return res.status(504).json({
        success: false,
        error: "AI taking too long",
        message: "AI taking too long",
        statusCode: 504
      });
    }
    if (error.authError || error instanceof GroqAuthError || error.name === "GroqAuthError") {
      return res.status(500).json({
        success: false,
        error: "AI Service Authentication Failed",
        message: error.message,
        developer_details: `Caught ${error.statusCode || 401} from Groq`,
        statusCode: 500
      });
    }
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      error: error.message || "Internal Server Error",
      message: error.message || "An unexpected error occurred. Please try again.",
      developer_details: error.message,
      statusCode: status
    });
  }
});
module.exports = router;
