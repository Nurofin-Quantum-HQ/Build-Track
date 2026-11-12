const mongoose = require("mongoose");

// Generic atomic counters (one document per named sequence).
// nextSeq() ends in a single findOneAndUpdate($inc), so concurrent callers never get the same number.
const counterSchema = new mongoose.Schema({
  _id: { type: String },
  seq: { type: Number, default: 0 },
});

const ignoreDuplicate = (err) => {
  // Two first-ever callers can both try to upsert; the loser gets E11000, which is harmless.
  if (!err || err.code !== 11000) throw err;
};

/**
 * Next number of the named sequence. `start` is the value the sequence is seeded with on first use
 * (so the first number handed out is start + 1).
 */
counterSchema.statics.nextSeq = async function nextSeq(name, start = 0) {
  if (start > 0) {
    await this.updateOne({ _id: name }, { $setOnInsert: { seq: start } }, { upsert: true }).catch(ignoreDuplicate);
  }
  const inc = () => this.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" });
  let doc;
  try {
    doc = await inc();
  } catch (err) {
    ignoreDuplicate(err);
    doc = await inc();
  }
  return doc.seq;
};

module.exports = mongoose.models.Counter || mongoose.model("Counter", counterSchema);
