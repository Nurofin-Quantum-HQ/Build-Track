require("dotenv").config();
console.log('AirPay Merchant ID loaded:', !!process.env.AIRPAY_MERCHANT_ID);
console.log('🔍 Startup check — FRONTEND_URL:', process.env.FRONTEND_URL || '(not set)');
console.log('🔍 Startup check — NODE_ENV:', process.env.NODE_ENV || '(not set)');
console.log('🔍 Startup check — PORT:', process.env.PORT || '5001 (default)');
const REQUIRED_ENV = ["MONGO_URI", "JWT_SECRET", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`❌ FATAL: Missing required environment variables: ${missing.join(", ")}`);
  console.error("   Add them to your .env file and restart the server.");
  console.error("   Present env vars at startup:", Object.keys(process.env).filter(k => !k.includes('SECRET') && !k.includes('KEY') && !k.includes('PASS')).join(", "));
  process.exit(1);
}
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const passport = require("./config/passport");
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const app = express();
const PORT = Number(process.env.PORT) || 5001;
const NODE_ENV = process.env.NODE_ENV || "development";
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5173";
const isProd = NODE_ENV === "production";
app.set("trust proxy", 1);
app.use(helmet({
  crossOriginResourcePolicy: false,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));
app.use((req, res, next) => {
  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    const contentType = req.headers["content-type"] || "";
    const isJson = contentType.includes("application/json");
    const isMultipart = contentType.includes("multipart/form-data");
    const isForm = contentType.includes("application/x-www-form-urlencoded");
    const hasNoBody = !req.headers["content-length"] || req.headers["content-length"] === "0";
    if (!isJson && !isMultipart && !isForm && !hasNoBody) {
      return res.status(415).json({
        success: false,
        message: "Unsupported Media Type — Content-Type must be application/json, multipart/form-data, or application/x-www-form-urlencoded",
      });
    }
  }
  next();
});
app.use((_req, res, next) => {
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=(), payment=()");
  next();
});
app.disable("x-powered-by");
app.use(compression());
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:5174",
  "https://buildtrack-api.nurofin.com",
  "https://build-track.onrender.com",
  "https://build-track-web.onrender.com",
  "https://secure.airpay.co.in",
  ...(process.env.NGROK_URL ? [process.env.NGROK_URL] : []),
]
  .filter(Boolean)
  .map((o) => o.replace(/\/$/, ""));
app.use(
  cors({
    origin: (incomingOrigin, callback) => {
      if (!incomingOrigin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(incomingOrigin) || incomingOrigin.startsWith("http://localhost:")) {
        return callback(null, true);
      }
      console.warn(`[CORS] Rejected request from unlisted origin: ${incomingOrigin}`);
      return callback(new Error(`CORS: Origin '${incomingOrigin}' is not allowed`), false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: isProd
      ? ["Content-Type", "Authorization"]
      : ["Content-Type", "Authorization", "ngrok-skip-browser-warning"],
    credentials: false,
  })
);
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 300 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: "Too many login attempts. Please try again after 15 minutes." },
});
app.use("/api/auth/login", loginLimiter);

const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isProd ? 30 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again later." },
});
app.use("/api/auth/register", sensitiveLimiter);
app.use("/api/auth/forgot-password", sensitiveLimiter);
app.use("/api/auth/reset-password", sensitiveLimiter);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 3000 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests — please try again later." },
  skip: (req) => {
    return (
      req.originalUrl.includes('/api/auth/login') ||
      req.originalUrl.includes('/api/esign/sign') ||
      req.originalUrl.includes('/api/esign/submit')
    );
  }
});
app.use("/api/", limiter);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(morgan(isProd ? "combined" : "dev"));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use(passport.initialize());
app.get("/", (_req, res) =>
  res.json({ status: "ok", app: "BuildTrack API" })
);
app.get("/healthz", (_req, res) =>
  res.status(200).json({ status: "ok", uptime: process.uptime() })
);
app.get("/api/test", (_req, res) => res.json({ ok: true }));
async function connectWithRetry(uri, retries = 5, delay = 8000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[MongoDB] Attempt ${attempt}/${retries}...`);
      console.log(`[MongoDB] URI prefix: ${uri ? uri.substring(0, 30) + '...' : 'UNDEFINED'}`);
      mongoose.set('bufferCommands', true);
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 45000,
        connectTimeoutMS: 45000,
        maxPoolSize: 10,
        socketTimeoutMS: 60000,
        heartbeatFrequencyMS: 15000,
      });
      console.log("✅ MongoDB connected");
      mongoose.connection.on('error', (err) => console.error('[MongoDB] Runtime connection error:', err.message));
      mongoose.connection.on('disconnected', () => console.warn('[MongoDB] Disconnected from MongoDB'));
      return;
    } catch (err) {
      console.error(`[MongoDB] Attempt ${attempt} failed: ${err.message}`);
      if (attempt < retries) {
        console.log(`[MongoDB] Retrying in ${delay / 1000}s...`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        console.error('[MongoDB] All connection attempts exhausted. Starting server without DB — health checks will report 503.');
        throw err;
      }
    }
  }
}
const dbCheck = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    console.error(`[DBCheck] Blocked request to ${req.originalUrl}: Database not connected (readyState: ${mongoose.connection.readyState})`);
    return res.status(503).json({
      success: false,
      message: "Database is temporarily unavailable. Please try again later.",
    });
  }
  next();
};
app.use("/api", dbCheck);
app.use("/api/auth",              require("./routes/authRoutes"));
app.use("/api/users",             require("./routes/userRoutes"));
console.log("✅ users routes mounted");
app.use("/api/workers",           require("./routes/workerRoutes"));
app.use("/api/projects",          require("./routes/projectRoutes"));
app.use("/api/transactions",      require("./routes/transactionRoutes"));
app.use("/api/esign",             require("./routes/esignRoutes"));
app.use("/api/inventory",         require("./routes/inventoryRoutes"));
app.use("/api/dashboard",         require("./routes/dashboardRoutes"));
app.use("/api/reports",           require("./routes/reportRoutes"));
app.use("/api/reports",           require("./routes/aiReportRoutes"));
app.use("/api/reports/dashboard", require("./routes/aiDashboardRoutes"));
app.use("/api/voice",             require("./routes/voiceRoutes"));
app.use("/api/project-updates",   require("./routes/projectUpdateRoutes"));
app.use("/api/tasks",             require("./routes/taskRoutes"));
app.use("/api/approvals",         require("./routes/approvalsRoutes"));
app.use("/api/notifications",     require("./routes/notificationRoutes"));
app.use("/api/subscriptions",     subscriptionRoutes);
app.use((_req, res) => res.status(404).json({ success: false, message: "Route not found" }));
app.use((err, _req, res, _next) => {
  if (!isProd) console.error(err.stack);
  else console.error(`[ERROR] ${err.message}`);
  if (err.type === "entity.too.large" || err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ success: false, message: "File too large. Maximum size is 2 MB." });
  }
  const status = err.status || 500;
  const message = err.message || "Internal server error";
  res.status(status).json({ success: false, message, stack: !isProd ? err.stack : undefined });
});
let server;
const shutdown = (signal) => {
  console.log(`\n⏳ ${signal} received — shutting down gracefully…`);
  if (server) {
    server.close(() => {
      if (mongoose.connection.readyState !== 0) {
        mongoose.connection.close(false)
          .then(() => { console.log("🛑 MongoDB connection closed. Bye!"); process.exit(0); })
          .catch(() => process.exit(0));
      } else {
        process.exit(0);
      }
    });
  } else {
    process.exit(0);
  }
};
process.on("SIGINT",  () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (reason, promise) => {
  console.error("⚠️  Unhandled Promise Rejection");
  console.error("   Promise:", promise);
  console.error("   Reason:",  reason);
});
process.on("uncaughtException", (err) => {
  console.error("🔥 Uncaught Exception — process will exit:");
  console.error(err);
  setTimeout(() => process.exit(1), 1000);
});
(async () => {
  try {
    // Try to initialize firebase-admin if FIREBASE_SERVICE_ACCOUNT is available
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const admin = require("firebase-admin");
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        console.log("✅ Firebase Admin initialized successfully.");
      } catch (fcmErr) {
        console.error("❌ Failed to initialize Firebase Admin:", fcmErr.message);
      }
    } else {
      console.log("⚠️ FIREBASE_SERVICE_ACCOUNT not set. Push notifications will not be sent.");
    }

    await connectWithRetry(process.env.MONGO_URI);
  } catch (err) {
    console.error('[Startup] MongoDB connection failed after all retries.');
    console.error('[Startup] The server will still start but /healthz will report DB down.');
    console.error('[Startup] Make sure MONGO_URI is set correctly in Render env vars.');
  }
  try {
    server = app.listen(PORT, () =>
      console.log(`🚀 Server running on port ${PORT} [${NODE_ENV}]`)
    );
    setImmediate(async () => {
      try {
        if (process.env.SKIP_STARTUP_CLEANUP === "true") {
          console.log("[Cleanup] Skipping startup cleanup (SKIP_STARTUP_CLEANUP=true)");
          return;
        }
        console.log("[Cleanup] Starting background database cleanups...");
        const Project     = require("./models/Project");
        const Transaction = require("./models/Transaction");
        const allProjects = await Project.find({}).sort({ createdAt: -1 }).limit(500);
        const groups = {};
        allProjects.forEach((p) => {
          if (!p.projectName || !p.createdBy) return;
          const key = `${p.createdBy.toString()}||${p.projectName.trim().toLowerCase()}`;
          if (!groups[key]) groups[key] = [];
          groups[key].push(p);
        });
        let duplicateCount = 0;
        for (const key of Object.keys(groups)) {
          const projects = groups[key];
          if (projects.length > 1) {
            duplicateCount++;
            const keptProject      = projects[0];
            const duplicatesToDelete = projects.slice(1);
            console.log(`[Cleanup] Found duplicate projects for name "${keptProject.projectName}". Keeping ${keptProject._id}`);
            for (const dup of duplicatesToDelete) {
              const updateRes = await Transaction.updateMany(
                { project: dup._id },
                { $set: { project: keptProject._id } }
              );
              if (updateRes.modifiedCount > 0)
                console.log(`[Cleanup] Reassigned ${updateRes.modifiedCount} transactions from ${dup._id} to ${keptProject._id}`);
              await Project.deleteOne({ _id: dup._id });
              console.log(`[Cleanup] Deleted duplicate project document: ${dup._id}`);
            }
          }
        }
        console.log(
          duplicateCount > 0
            ? `[Cleanup] Successfully merged ${duplicateCount} duplicate project groups.`
            : "[Cleanup] Database is clean. No duplicate projects found."
        );
        try {
          const supervisorUpdateRes = await require("./models/User").updateMany(
            {
              role: "Supervisor",
              $or: [
                { overseesRoles: { $exists: false } },
                { overseesRoles: { $size: 0 } },
              ],
            },
            { $set: { overseesRoles: ["Mason", "Contractor", "Labourer"] } }
          );
          if (supervisorUpdateRes.modifiedCount > 0)
            console.log(`[Cleanup] Set default overseesRoles for ${supervisorUpdateRes.modifiedCount} supervisors`);
        } catch (cleanupErr) {
          console.error("[Cleanup] overseesRoles patch error:", cleanupErr);
        }
        const invalidUnits = [
          "kg", "Kg", "KG",
          "bag", "Bag", "BAG",
          "ton", "Ton", "TON", "tons", "Tons", "TONS",
          "mt",  "Mt",  "MT",
          "truck", "Truck", "TRUCK",
        ];
        const labourUpdateRes = await Transaction.updateMany(
          { type: "Wages",   unit: { $in: invalidUnits } },
          { $set: { unit: "day" } }
        );
        if (labourUpdateRes.modifiedCount > 0)
          console.log(`[Cleanup] Migrated ${labourUpdateRes.modifiedCount} Labour entries with invalid units to 'day'`);
        const equipUpdateRes = await Transaction.updateMany(
          { type: "Expense", unit: { $in: invalidUnits } },
          { $set: { unit: "day" } }
        );
        if (equipUpdateRes.modifiedCount > 0)
          console.log(`[Cleanup] Migrated ${equipUpdateRes.modifiedCount} Equipment entries with invalid units to 'day'`);
      } catch (cleanupErr) {
        console.error("[Cleanup] Error running database cleanup:", cleanupErr);
      }
    });
  } catch (err) {
    console.error("❌ Startup failed:", err);
    process.exit(1);
  }
})();
