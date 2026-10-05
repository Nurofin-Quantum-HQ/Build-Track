require('dotenv').config({ path: 'C:/Users/Muneesha/Desktop/build-track/Build-Track/backend/.env' });
const crypto = require('crypto');

const secret = "8ZI5O4wC1TxID7U3"; // API Key provided by Airpay
const client_secret = "9fd6b866f5708233bd412750bd37e7d1"; // Client Secret provided by Airpay
const username = "6961805";
const password = "9D142A67";

console.log("=== AIRPAY PRIVATE KEY DEBUG LOGS ===\n");

// 1. Using the "API Key" as the Secret
const concatString1 = `${secret}@${username}:|:${password}`;
const privateKey1 = crypto.createHash('sha256').update(concatString1).digest('hex');
console.log("TEST 1: Using 'API Key' as Secret");
console.log("Concatenated String:", concatString1);
console.log("Generated SHA256 Private Key:", privateKey1);
console.log("Result on Airpay Checkout: Merchant Key Authentication Failed\n");

// 2. Using the "Client Secret" as the Secret
const concatString2 = `${client_secret}@${username}:|:${password}`;
const privateKey2 = crypto.createHash('sha256').update(concatString2).digest('hex');
console.log("TEST 2: Using 'Client Secret' as Secret");
console.log("Concatenated String:", concatString2);
console.log("Generated SHA256 Private Key:", privateKey2);
console.log("Result on Airpay Checkout: Merchant Key Authentication Failed\n");

console.log("=====================================");
