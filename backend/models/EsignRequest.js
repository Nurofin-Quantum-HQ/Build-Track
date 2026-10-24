const mongoose = require('mongoose');
const esignRequestSchema = new mongoose.Schema({
  // [BT-SEC-03] Owner of the request (the logged-in user who created it), so that
  // status lookups can be scoped to the tenant instead of read by any id.
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  clientEmail: {
    type: String,
    required: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ['pending', 'signed'],
    default: 'pending',
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  signatureData: {
    type: String,
    default: null,
  },
  signedAt: {
    type: Date,
    default: null,
  },
  // Entry this receipt belongs to (set when the request is raised from a
  // transaction save / payment). On signing, the result is written back to it.
  transaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    default: null,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // Link validity. Requests from the payment sheet live 1 hour; requests tied
  // to an entry live 7 days. Mongo removes the row once this passes.
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 60 * 60 * 1000),
  },
});
esignRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const EsignRequest = mongoose.model('EsignRequest', esignRequestSchema);

// Older deployments created a TTL index on createdAt (1 hour), which would
// delete 7-day links and signed rows after an hour. Drop it once per process.
let legacyIndexChecked = false;
EsignRequest.dropLegacyTtlIndex = async function dropLegacyTtlIndex() {
  if (legacyIndexChecked) return;
  legacyIndexChecked = true;
  try {
    const indexes = await EsignRequest.collection.indexes();
    const legacy = indexes.find(
      (ix) => ix.key && ix.key.createdAt === 1 && Object.keys(ix.key).length === 1 && ix.expireAfterSeconds !== undefined
    );
    if (legacy) {
      await EsignRequest.collection.dropIndex(legacy.name);
      console.log(`[Esign] Dropped legacy TTL index ${legacy.name}`);
    }
  } catch (err) {
    // Collection may not exist yet (code 26) — nothing to drop.
    if (err && err.code !== 26) console.error('[Esign] Legacy TTL index check failed:', err.message);
  }
};

module.exports = EsignRequest;
