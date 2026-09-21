const fs = require('fs');
let code = fs.readFileSync('routes/transactionRoutes.js', 'utf8');
const startIndex = code.indexOf('router.get("/:id"');
if (startIndex !== -1) {
    const blockEnd = code.indexOf('router.post("/"', startIndex);
    let block = code.substring(startIndex, blockEnd);
    block = block.replace(/{ await session\.abortTransaction\(\); return res\.status\(403\)/g, 'return res.status(403)');
    block = block.replace(/} \}/g, '}'); // wait, the original was: { await ...; return ... }
    
    // Actually just replace exactly:
    block = block.split("{ await session.abortTransaction(); return res.status(403).json({ message: 'Access denied to this transaction' }); }").join("return res.status(403).json({ message: 'Access denied to this transaction' });");

    code = code.substring(0, startIndex) + block + code.substring(blockEnd);
    fs.writeFileSync('routes/transactionRoutes.js', code);
}
