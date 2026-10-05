require('dotenv').config({ path: 'C:/Users/Muneesha/Desktop/build-track/Build-Track/backend/.env' });
const { buildPaymentPayload, getAccessToken } = require('C:/Users/Muneesha/Desktop/build-track/Build-Track/backend/utils/airpayservice.js');
const axios = require('axios');

(async () => {
  console.log("=================== REQUEST / RESPONSE LOGS ===================\n");

  try {
    console.log("--- 1. OAUTH TOKEN REQUEST ---");
    // To show the exact URL and body used for OAuth, we'll manually fetch it here for the log
    const { generateEncryptionKeyFromCreds, encrypt, generateChecksum } = require('C:/Users/Muneesha/Desktop/build-track/Build-Track/backend/utils/airpayCrypto.js');
    const clientId = process.env.AIRPAY_CLIENT_ID;
    const clientSecret = process.env.AIRPAY_SECRET_KEY;
    const merchantId = process.env.AIRPAY_MERCHANT_ID;
    const username = process.env.AIRPAY_USERNAME;
    const password = process.env.AIRPAY_PASSWORD;

    const payload = {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
      merchant_id: merchantId,
    };
    
    const encryptionKey = generateEncryptionKeyFromCreds(username, password);
    const encdata = encrypt(JSON.stringify(payload), encryptionKey);
    const checksum = generateChecksum(payload);

    const formBody = new URLSearchParams();
    formBody.append('merchant_id', merchantId);
    formBody.append('encdata', encdata);
    formBody.append('checksum', checksum);

    const tokenUrl = 'https://kraken.airpay.co.in/airpay/pay/v4/api/oauth2/token.php';
    console.log(`POST URL: ${tokenUrl}`);
    console.log("Headers: { 'Content-Type': 'application/x-www-form-urlencoded' }");
    console.log(`Request Body:\nmerchant_id=${merchantId}\nencdata=${encdata}\nchecksum=${checksum}`);
    
    const tokenRes = await axios.post(tokenUrl, formBody, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    console.log(`\nResponse HTTP Status: ${tokenRes.status}`);
    console.log(`Response Body (Raw): ${tokenRes.data.response}`);
    
    const token = await getAccessToken(); // gets the decrypted token string
    console.log(`Decrypted Token Result: ${token}\n`);
    
    
    console.log("--- 2. PAYMENT PAGE FORM REQUEST ---");
    const paymentPayload = await buildPaymentPayload({
      orderId: 'TEST_' + Date.now(),
      amount: 1,
      buyerEmail: 'test@example.com',
      buyerPhone: '9999999999',
      buyerFirstName: 'Test',
      buyerLastName: 'User',
      returnUrl: 'http://localhost/return',
      isRecurring: false // testing standard first
    });

    console.log(`POST URL: ${paymentPayload.postUrl}`);
    console.log("Headers: { 'Content-Type': 'application/x-www-form-urlencoded' }");
    console.log("Form Fields:");
    const paymentForm = new URLSearchParams();
    for (const [key, value] of Object.entries(paymentPayload.formFields)) {
      console.log(`  ${key}: ${value}`);
      paymentForm.append(key, value);
    }

    const payRes = await axios.post(paymentPayload.postUrl, paymentForm, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    console.log(`\nResponse HTTP Status: ${payRes.status}`);
    const errorMatch = payRes.data.match(/Payment Error.*?<br>([^<]+)/s);
    if (errorMatch) {
      console.log(`Response UI Error: ${errorMatch[1].trim().replace(/\n/g, ' ')}`);
    } else {
      console.log(`Response Body Contains 'Merchant Key Authentication Failed': ${payRes.data.includes("Merchant Key Authentication Failed")}`);
    }
    
  } catch (err) {
    console.error("ERROR generating logs:", err.message);
  }
  console.log("\n===============================================================");
})();
