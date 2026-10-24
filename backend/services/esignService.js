// One token system for cash-receipt e-signatures.
//
// Every signing link is /api/esign/sign/:token and is backed by an EsignRequest
// row. Entry saves and payments used to mint a token on the Transaction only,
// so the emailed link said "Invalid or expired token". Those requests now go
// through issueForTransaction(), and older Transaction-only tokens that are
// already in clients' inboxes are adopted on first use (findActiveByToken).
const crypto = require("crypto");
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const EsignRequest = require("../models/EsignRequest");
const Transaction = require("../models/Transaction");

const HOUR = 60 * 60 * 1000;
const ENTRY_LINK_TTL = 7 * 24 * HOUR;   // links raised from an entry / payment
const SIGNED_KEEP = 30 * 24 * HOUR;     // keep signed rows readable for status polling
const SHEET_MATCH_WINDOW = 2 * HOUR;    // payment-sheet request made just before the save

const activeFilter = (now = new Date()) => ({
  $or: [
    { expiresAt: { $gt: now } },
    // rows created before expiresAt existed: 1 hour from creation
    { expiresAt: { $exists: false }, createdAt: { $gt: new Date(now.getTime() - HOUR) } },
  ],
});

const signUrlFor = (baseUrl, token) => `${baseUrl}/api/esign/sign/${token}`;

const baseUrlFrom = (req) =>
  process.env.BACKEND_URL || `${req.protocol}://${req.get("host")}`;

const isoDay = (v) => {
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toISOString();
};

// Receipt rows shown on the signing page. Keys must exist in the page's i18n map.
function buildMeta(tx, { amount, method, note, date, projectName } = {}) {
  const meta = {
    projectName: projectName || (tx.project && tx.project.projectName) || undefined,
    itemName: tx.title || undefined,
    type: tx.category || tx.type || undefined,
    totalAmount: tx.amount,
    amount: amount !== undefined ? amount : tx.paidAmount || tx.amount,
    paymentMethod: method || tx.paymentMode || "Cash",
    notes: note || undefined,
    date: isoDay(date || tx.paymentDate || tx.date),
  };
  Object.keys(meta).forEach((k) => meta[k] === undefined && delete meta[k]);
  return meta;
}

async function sendSignEmail(to, signUrl, expiryText) {
  if (!(process.env.AWS_ACCESS_KEY_ID && process.env.SES_FROM_EMAIL)) {
    console.warn("[Esign] SES not configured — signing email not sent.");
    if (process.env.NODE_ENV !== "production") console.log(`[DEV] E-SIGN LINK: ${signUrl}`);
    return { sent: false, error: "Server email configuration is missing" };
  }
  try {
    const ses = new SESClient({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Signature Requested</h2>
        <p>You have been requested to sign a cash receipt for BuildTrack.</p>
        <p>Please click the button below to review and sign the receipt:</p>
        <a href="${signUrl}" style="display: inline-block; padding: 12px 24px; background-color: #173EEA; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Sign Receipt</a>
        <p style="margin-top: 24px; font-size: 12px; color: #666;">This link expires in ${expiryText}.</p>
      </div>`;
    await ses.send(new SendEmailCommand({
      Destination: { ToAddresses: [to] },
      Message: {
        Body: { Html: { Data: html, Charset: "UTF-8" } },
        Subject: { Data: "Signature Required: BuildTrack Cash Receipt", Charset: "UTF-8" },
      },
      Source: process.env.SES_FROM_EMAIL,
    }));
    return { sent: true };
  } catch (err) {
    console.error("[Esign] SES send failed:", err.message);
    return { sent: false, error: "Failed to send signature email" };
  }
}

// Copy a signed result onto the linked entry. updateOne on purpose: the
// Transaction pre-save hook recomputes amounts/payment status, which a
// signature must never change.
async function writeBackToTransaction(esignReq, receiptUrl) {
  if (!esignReq || !esignReq.transaction || esignReq.status !== "signed") return;
  await Transaction.updateOne(
    { _id: esignReq.transaction },
    {
      $set: {
        eSignStatus: "Signed",
        eSignature: receiptUrl || esignReq.signatureData,
        eSignDate: esignReq.signedAt || new Date(),
        eSignToken: null,
        eSignExpires: null,
      },
    }
  );
}

// Active EsignRequest for a token. Falls back to a Transaction that carries the
// token (links emailed before this fix) and adopts it into an EsignRequest.
async function findActiveByToken(token) {
  if (!token || typeof token !== "string") return null;
  const now = new Date();
  const existing = await EsignRequest.findOne({ token, ...activeFilter(now) });
  if (existing) return existing;
  if (await EsignRequest.exists({ token })) return null; // known but expired

  const tx = await Transaction.findOne({
    eSignToken: token,
    eSignStatus: { $ne: "Signed" },
    $or: [{ eSignExpires: { $gt: now } }, { eSignExpires: null }],
  }).populate("project", "projectName");
  if (!tx) return null;
  try {
    return await EsignRequest.create({
      createdBy: tx.createdBy,
      clientEmail: tx.clientEmail || "not-provided",
      token,
      status: "pending",
      transaction: tx._id,
      meta: buildMeta(tx),
      expiresAt: tx.eSignExpires || new Date(now.getTime() + ENTRY_LINK_TTL),
    });
  } catch (err) {
    if (err && err.code === 11000) return EsignRequest.findOne({ token });
    throw err;
  }
}

// Raise (or reuse) the signing request for an entry / payment and email it.
// Called after the transaction is saved; never throws for email problems.
//   tx       saved Transaction document
//   opts     { user, clientEmail, amount, method, note, date, baseUrl }
// Returns { status: 'Requested'|'Signed', emailSent, emailError, requestId }.
async function issueForTransaction(tx, opts) {
  const { user, clientEmail, amount, method, note, date, baseUrl } = opts;
  const email = String(clientEmail || "").trim();
  const now = new Date();
  const amt = Number(amount);

  // The payment sheet sends its own request (POST /api/esign/request) and polls
  // it before the entry is saved. Link that one instead of emailing the client
  // a second link.
  let esignReq = null;
  const candidates = await EsignRequest.find({
    createdBy: user._id,
    transaction: null,
    createdAt: { $gte: new Date(now.getTime() - SHEET_MATCH_WINDOW) },
  }).sort({ createdAt: -1 }).limit(20);
  esignReq = candidates.find((r) =>
    String(r.clientEmail || "").toLowerCase() === email.toLowerCase() &&
    (!isFinite(amt) || Math.abs(Number(r.meta && r.meta.amount) - amt) < 0.01)
  ) || null;

  let emailSent = false;
  let emailError = null;
  if (esignReq) {
    esignReq.transaction = tx._id;
    esignReq.expiresAt = new Date(now.getTime() + (esignReq.status === "signed" ? SIGNED_KEEP : ENTRY_LINK_TTL));
    await esignReq.save();
  } else {
    const populated = tx.project && !tx.project.projectName
      ? await Transaction.findById(tx._id).populate("project", "projectName").lean()
      : tx;
    esignReq = await EsignRequest.create({
      createdBy: user._id,
      clientEmail: email,
      token: crypto.randomBytes(32).toString("hex"),
      status: "pending",
      transaction: tx._id,
      meta: buildMeta(populated || tx, { amount: isFinite(amt) ? amt : undefined, method, note, date }),
      expiresAt: new Date(now.getTime() + ENTRY_LINK_TTL),
    });
    const r = await sendSignEmail(email, signUrlFor(baseUrl, esignReq.token), "7 days");
    emailSent = r.sent;
    emailError = r.error || null;
  }

  if (esignReq.status === "signed") {
    await writeBackToTransaction(esignReq, esignReq.signatureData);
    return { status: "Signed", emailSent, emailError, requestId: esignReq._id };
  }
  await Transaction.updateOne(
    { _id: tx._id },
    {
      $set: {
        clientEmail: email,
        eSignToken: esignReq.token,
        eSignStatus: "Requested",
        eSignExpires: esignReq.expiresAt,
      },
    }
  );
  return { status: "Requested", emailSent, emailError, requestId: esignReq._id };
}

module.exports = {
  HOUR,
  SIGNED_KEEP,
  activeFilter,
  baseUrlFrom,
  buildMeta,
  findActiveByToken,
  issueForTransaction,
  sendSignEmail,
  signUrlFor,
  writeBackToTransaction,
};
