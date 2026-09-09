/**
 * fix_test_subscription.js
 *
 * Identifies and revokes subscriptions that were incorrectly activated
 * despite a failed/unverified Airpay callback.
 *
 * SAFE TARGETING: Only revokes records that match ALL of:
 *   - plan: 'starter'
 *   - status: 'active'
 *   - amount: ₹1 (the test amount — clearly not a real ₹498+ purchase)
 *   - created on or after 2026-09-01 (recent test period only)
 *   - no callbackProcessed: true flag
 *
 * This protects the ₹498 historical subscriptions from being touched.
 *
 * Usage:
 *   node scripts/fix_test_subscription.js          — dry-run (print only)
 *   node scripts/fix_test_subscription.js --apply  — apply fixes
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose     = require('mongoose');
const Subscription = require('../models/Subscription');

const DRY_RUN = !process.argv.includes('--apply');

async function main() {
  console.log('='.repeat(60));
  console.log('Airpay Test Subscription Fix Script');
  console.log(DRY_RUN ? '  MODE: DRY RUN (pass --apply to make changes)' : '  MODE: APPLYING CHANGES');
  console.log('='.repeat(60));

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
  });
  console.log('✅ Connected to MongoDB\n');

  // Target ONLY clearly bad test records:
  //   - ₹1 amount (test price)
  //   - created from Sept 1 2026 (recent tests)
  //   - not properly callback-verified (no callbackProcessed flag)
  const cutoffDate = new Date('2026-09-01T00:00:00.000Z');
  const badSubs = await Subscription.find({
    plan:   'starter',
    status: 'active',
    amount: 1,                              // ₹1 test amount only
    createdAt: { $gte: cutoffDate },        // only recent test period
    $or: [
      { callbackProcessed: { $ne: true } },
      { callbackProcessed: { $exists: false } },
    ],
  }).lean();

  if (badSubs.length === 0) {
    console.log('✅ No incorrectly activated test subscriptions found matching the criteria.');
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${badSubs.length} suspect test subscription(s):\n`);
  for (const sub of badSubs) {
    console.log(`  ID:        ${sub._id}`);
    console.log(`  User:      ${sub.userId}`);
    console.log(`  Plan:      ${sub.plan}`);
    console.log(`  Amount:    ₹${sub.amount}`);
    console.log(`  OrderId:   ${sub.airpayOrderId || '(none)'}`);
    console.log(`  TxnId:     ${sub.airpayTxnId || sub.transactionId || '(none)'}`);
    console.log(`  Created:   ${sub.createdAt}`);
    console.log(`  StartDate: ${sub.startDate || '(none)'}`);
    console.log(`  EndDate:   ${sub.endDate || '(none)'}`);
    console.log('');
  }

  if (DRY_RUN) {
    console.log('DRY RUN: No changes made. Re-run with --apply to revoke these subscriptions.');
  } else {
    const ids = badSubs.map(s => s._id);
    const result = await Subscription.updateMany(
      { _id: { $in: ids } },
      {
        $set: {
          status:             'failed',
          callbackStatus:     'REVOKED_BAD_ACTIVATION',
          callbackProcessed:  true,
          callbackReceivedAt: new Date(),
          endDate:            null,
          startDate:          null,
        },
      }
    );
    console.log(`✅ Revoked ${result.modifiedCount} test subscription(s).`);
    console.log('   These are now status=failed and will not grant premium access.');
    console.log('   The ₹498 historical subscriptions were NOT touched (protected by amount filter).');
  }

  await mongoose.disconnect();
  console.log('\n✅ Done.');
}

main().catch(err => {
  console.error('❌ Script error:', err.message);
  process.exit(1);
});
