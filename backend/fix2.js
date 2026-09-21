const fs = require('fs');
let code = fs.readFileSync('routes/transactionRoutes.js', 'utf8');
code = code.replace(/return res\.status\(403\)\.json\(\{ message: 'Access denied to this transaction' \}\); \}/g, eturn res.status(403).json({ message: 'Access denied to this transaction' }););
fs.writeFileSync('routes/transactionRoutes.js', code);
