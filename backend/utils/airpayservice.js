/**
 * airpayservice.js
 * High-level Airpay v4 service: OAuth2 token fetch, payment payload builder,
 * and callback decryption/verification.
 */
const axios = require('axios');
const CRC32 = require('crc-32');
const {
  encrypt,
  decrypt,
  decryptCallbackResponse,
  generateChecksum,
  generatePrivateKey,
  generateEncryptionKeyFromCreds,
} = require('./airpayCrypto');

const AIRPAY_OAUTH_URL        = 'https://kraken.airpay.co.in/airpay/pay/v4/api/oauth2/token.php';
const AIRPAY_PAYMENT_BASE_URL = 'https://payments.airpay.co.in/pay/v4/index.php';

/** Returns and validates all required Airpay config from environment */
function getConfig() {
  const cfg = {
    merchantId: (process.env.AIRPAY_MERCHANT_ID || '').trim(),
    clientId:   (process.env.AIRPAY_CLIENT_ID   || '').trim(),
    secret:     (process.env.AIRPAY_SECRET_KEY   || '').trim(),
    username:   (process.env.AIRPAY_USERNAME     || '').trim(),
    password:   (process.env.AIRPAY_PASSWORD     || '').trim(),
  };
  const missing = Object.entries(cfg).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    throw new Error(
      `AirPay config missing: ${missing.join(', ')} — ` +
      `check AIRPAY_MERCHANT_ID, AIRPAY_CLIENT_ID, AIRPAY_SECRET_KEY, ` +
      `AIRPAY_USERNAME, AIRPAY_PASSWORD in your .env`
    );
  }
  return cfg;
}

/** Fetches a fresh OAuth2 access token from Airpay */
async function getAccessToken() {
  const cfg           = getConfig();
  const encryptionKey = generateEncryptionKeyFromCreds(cfg.username, cfg.password);
  const payload = {
    client_id:     cfg.clientId,
    client_secret: cfg.secret,
    grant_type:    'client_credentials',
    merchant_id:   cfg.merchantId,
  };
  const encdata  = encrypt(JSON.stringify(payload), encryptionKey);
  const checksum = generateChecksum(payload);

  const formBody = new URLSearchParams();
  formBody.append('merchant_id', cfg.merchantId);
  formBody.append('encdata',     encdata);
  formBody.append('checksum',    checksum);

  const response = await axios.post(AIRPAY_OAUTH_URL, formBody, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  if (!response.data.response) {
    throw new Error('AirPay OAuth2: no "response" field in reply');
  }
  // OAuth response was encrypted by US so use plain decrypt()
  const decrypted = decrypt(response.data.response, encryptionKey);
  const result    = JSON.parse(decrypted);
  if (result.status !== 'success' || !result.data?.access_token) {
    throw new Error(
      `AirPay OAuth2 failed: ${result.message || 'unknown'} ` +
      `(code: ${result.response_code || result.error_code})`
    );
  }
  return result.data.access_token;
}

/**
 * Validates and builds the Airpay payment form payload.
 *
 * In production (AIRPAY_ENV !== 'sandbox'):
 *   - Real buyerEmail, buyerPhone, buyerFirstName, buyerLastName are required.
 *   - Optional address fields (buyerAddress, buyerCity, buyerState, buyerPinCode)
 *     are omitted when not provided — never filled with fake placeholders.
 *
 * @param {object} opts
 * @param {string} opts.orderId
 * @param {number} opts.amount
 * @param {string} opts.buyerEmail       - required in production
 * @param {string} opts.buyerPhone       - required in production (8-15 digits)
 * @param {string} opts.buyerFirstName   - required in production
 * @param {string} opts.buyerLastName    - required in production
 * @param {string} [opts.buyerAddress]   - optional
 * @param {string} [opts.buyerCity]      - optional
 * @param {string} [opts.buyerState]     - optional
 * @param {string} [opts.buyerCountry]   - defaults to 'India'
 * @param {string} [opts.buyerPinCode]   - optional
 * @param {string} opts.returnUrl        - browser callback URL
 */
async function buildPaymentPayload({
  orderId,
  amount,
  buyerEmail,
  buyerPhone,
  buyerFirstName,
  buyerLastName,
  buyerAddress,
  buyerCity,
  buyerState,
  buyerCountry,
  buyerPinCode,
  returnUrl,
}) {
  const cfg           = getConfig();
  const isSandbox     = (process.env.AIRPAY_ENV || '').toLowerCase() === 'sandbox';
  const encryptionKey = generateEncryptionKeyFromCreds(cfg.username, cfg.password);
  const accessToken   = await getAccessToken();
  const amountFormatted = Number(amount).toFixed(2);

  // Validate required fields in production
  if (!isSandbox) {
    const errs = [];
    if (!buyerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail))
      errs.push('valid buyerEmail');
    if (!buyerPhone || !/^\d{8,15}$/.test(buyerPhone))
      errs.push('valid buyerPhone (8-15 digits)');
    if (!buyerFirstName || !/^[A-Za-z]{1,50}$/.test(buyerFirstName))
      errs.push('valid buyerFirstName (letters only)');
    if (!buyerLastName || !/^[A-Za-z]{1,50}$/.test(buyerLastName))
      errs.push('valid buyerLastName (letters only)');
    if (errs.length) {
      throw new Error(`AirPay payload validation failed: missing ${errs.join(', ')}`);
    }
  }

  const privatekey = generatePrivateKey(
    process.env.AIRPAY_API_KEY || cfg.secret,
    cfg.username,
    cfg.password
  );

  // Build transaction data — only include optional fields when real values exist
  const transactionData = {
    orderid:         orderId,
    amount:          amountFormatted,
    currency_code:   '356',
    iso_currency:    'INR',
    buyer_email:     buyerEmail,
    buyer_phone:     buyerPhone,
    buyer_firstname: buyerFirstName,
    buyer_lastname:  buyerLastName,
    buyer_country:   buyerCountry || 'India',
    merchant_id:     cfg.merchantId,
  };

  // Optional address fields — only include when real data is available
  if (buyerAddress && buyerAddress.trim()) transactionData.buyer_address = buyerAddress.trim();
  if (buyerCity    && buyerCity.trim())    transactionData.buyer_city    = buyerCity.trim();
  if (buyerState   && buyerState.trim())   transactionData.buyer_state   = buyerState.trim();
  if (buyerPinCode && /^[1-9][0-9]{2}\s?[0-9]{3}$/.test(buyerPinCode.trim()))
    transactionData.buyer_pincode = buyerPinCode.trim();

  const encdata  = encrypt(JSON.stringify(transactionData), encryptionKey);
  const checksum = generateChecksum(transactionData);

  console.log(`[AirPay] Payment payload built for order ${orderId} (sandbox=${isSandbox})`);

  return {
    postUrl: `${AIRPAY_PAYMENT_BASE_URL}?token=${accessToken}`,
    formFields: {
      privatekey,
      merchant_id: cfg.merchantId,
      encdata,
      checksum,
      chmod: '',
    },
  };
}

/**
 * Decrypts and verifies an Airpay IPN callback body.
 *
 * @param {object} reqBody - parsed form POST body from Airpay
 * @returns {{ data: object, rawResult: object }}
 * @throws if response is missing, decryption fails, or checksum is invalid
 */
function verifyAndDecryptCallbackData(reqBody) {
  let dataObj = null;
  let rawResult = null;
  
  if (!reqBody || !(reqBody.response || reqBody.ap_transactionid || reqBody.TRANSACTIONID || reqBody.orderid)) {
    throw new Error('Missing valid payload in callback body');
  }

  const cfg = getConfig();

  if (reqBody.response) {
    // Encrypted payload mode
    const encryptionKey = generateEncryptionKeyFromCreds(cfg.username, cfg.password);
    const cleanResponse = reqBody.response.replace(/ /g, '+');
    const decrypted = decryptCallbackResponse(cleanResponse, encryptionKey);
    rawResult = JSON.parse(decrypted);
    dataObj = rawResult.data || rawResult;
  } else {
    // Unencrypted JSON/Form data mode
    dataObj = reqBody;
    rawResult = reqBody;
  }

  // Verify Airpay secure hash (CRC32)
  if (dataObj.ap_securehash) {
    const CHMOD = (reqBody.CHMOD || '').toLowerCase();
    let hashInput;

    if (CHMOD === 'upi') {
      // UPI mode includes CUSTOMERVPA
      const customerVpa = reqBody.CUSTOMERVPA || dataObj.custom_var || '';
      hashInput = [
        dataObj.orderid || dataObj.TRANSACTIONID,
        dataObj.ap_transactionid || dataObj.APTRANSACTIONID,
        dataObj.amount || dataObj.AMOUNT,
        dataObj.transaction_status || dataObj.TRANSACTIONSTATUS,
        dataObj.message || dataObj.MESSAGE,
        cfg.merchantId,
        cfg.username,
        customerVpa,
      ].join(':');
    } else {
      hashInput = [
        dataObj.orderid || dataObj.TRANSACTIONID,
        dataObj.ap_transactionid || dataObj.APTRANSACTIONID,
        dataObj.amount || dataObj.AMOUNT,
        dataObj.transaction_status || dataObj.TRANSACTIONSTATUS,
        dataObj.message || dataObj.MESSAGE,
        cfg.merchantId,
        cfg.username,
      ].join(':');
    }

    const computedHash = (CRC32.str(hashInput) >>> 0).toString();
    const receivedHash = String(dataObj.ap_securehash || dataObj.ap_SecureHash || dataObj.AP_SECUREHASH || '');

    if (computedHash !== receivedHash) {
      throw new Error(
        `Airpay secure hash mismatch — computed: ${computedHash}, received: ${receivedHash}`
      );
    }
  }

  return { data: dataObj, rawResult };
}

module.exports = {
  getAccessToken,
  buildPaymentPayload,
  verifyAndDecryptCallbackData,
};
