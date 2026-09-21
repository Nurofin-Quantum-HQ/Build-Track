const fs = require('fs');
let code = fs.readFileSync('routes/transactionRoutes.js', 'utf8');

// Fix 1: GET /:id route
const getIndex = code.indexOf('router.get("/:id"');
const postIndex = code.indexOf('router.post("/"', getIndex);
let getBlock = code.substring(getIndex, postIndex);
getBlock = getBlock.split('{ await session.abortTransaction(); return res.status(404)').join('return res.status(404)');
getBlock = getBlock.split('{ await session.abortTransaction(); return res.status(403)').join('return res.status(403)');
getBlock = getBlock.replace(/return res.status\(404\)\.json\(\{ message: 'Transaction not found' \}\); \}/g, eturn res.status(404).json({ message: 'Transaction not found' }););
getBlock = getBlock.replace(/return res.status\(403\)\.json\(\{ message: 'Access denied to this transaction' \}\); \}/g, eturn res.status(403).json({ message: 'Access denied to this transaction' }););
code = code.substring(0, getIndex) + getBlock + code.substring(postIndex);

// Fix 2: POST / route (move startSession up)
code = code.replace(
  if ((paymentStatus === "Paid" || Number(paidAmount) > 0) && !canMarkPaid) {
    { await session.abortTransaction(); return res.status(403).json({ message: 'Insufficient permissions to record payments or mark as Paid' }); }
  }
  const session = await mongoose.startSession();
  session.startTransaction();,
  const session = await mongoose.startSession();
  session.startTransaction();
  if ((paymentStatus === "Paid" || Number(paidAmount) > 0) && !canMarkPaid) {
    await session.abortTransaction();
    session.endSession();
    return res.status(403).json({ message: 'Insufficient permissions to record payments or mark as Paid' });
  }
);

fs.writeFileSync('routes/transactionRoutes.js', code);
