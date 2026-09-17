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
  let extractionMethod = 'none';
  
  if (!reqBody) {
    throw new Error('Missing valid payload in callback body');
  }

  // Quick check: does the body have ANY recognisable Airpay field?
  const hasAnyField = reqBody.response || reqBody.ap_transactionid ||
                      reqBody.TRANSACTIONID || reqBody.orderid ||
                      reqBody.TRANSACTIONSTATUS || reqBody.transaction_status ||
                      reqBody.ap_SecureHash || reqBody.ap_securehash;
  if (!hasAnyField) {
    throw new Error('Missing valid payload in callback body');
  }

  const cfg = getConfig();

  // ── STEP 1: Always try to decrypt `response` first ──────────────────────
  // Airpay computes ap_securehash from the DECRYPTED data values.
  // The form POST also includes uppercase plain text fields (TRANSACTIONSTATUS,
  // AMOUNT, etc.) but these may have DIFFERENT formatting (e.g. "SUCCESS" vs
  // "200", "1" vs "1.00"), so the hash won't match if we use them.
  // The Airpay reference code ALWAYS decrypts `response` to verify the hash.

  if (reqBody.response) {
    console.log('[AirPay IPN] Encrypted response field present, attempting decrypt...');
    const encryptionKey = generateEncryptionKeyFromCreds(cfg.username, cfg.password);
    // Fix form URL encoding: '+' becomes space in application/x-www-form-urlencoded
    const cleanResponse = reqBody.response.replace(/ /g, '+');

    try {
      const decrypted = decryptCallbackResponse(cleanResponse, encryptionKey);
      console.log(`[AirPay IPN] Decryption succeeded — decrypted length: ${decrypted.length}`);

      // ── Robust JSON extraction ──────────────────────────────────────────
      // Airpay's IV derivation can cause the first AES block (16 bytes) to
      // decrypt as garbage.  The Airpay reference code itself works around
      // this by using a regex to extract the "data" object.
      // Strategy: locate the outermost { … } boundaries, then parse.

      const firstBrace = decrypted.indexOf('{');
      const lastBrace  = decrypted.lastIndexOf('}');

      if (firstBrace !== -1 && lastBrace > firstBrace) {
        const jsonCandidate = decrypted.substring(firstBrace, lastBrace + 1);
        try {
          rawResult = JSON.parse(jsonCandidate);
          extractionMethod = firstBrace === 0 ? 'direct' : 'brace-trim';
          console.log(`[AirPay IPN] JSON parsed OK (method: ${extractionMethod})`);
        } catch (trimErr) {
          // Brace-trim failed; try Airpay reference regex: /"data"\s*:\s*\{…\}/
          console.log('[AirPay IPN] Brace-trim parse failed, trying regex extraction...');
          const match = decrypted.match(/"data"\s*:\s*(\{[^}]*\})/);
          if (match) {
            rawResult = { data: JSON.parse(match[1]) };
            extractionMethod = 'regex';
            console.log('[AirPay IPN] Regex extraction succeeded');
          } else {
            throw new Error(
              `JSON extraction failed after decrypt: ${trimErr.message}. ` +
              `Prefix (30 chars): ${decrypted.substring(0, 30)}`
            );
          }
        }
      } else {
        throw new Error(
          `No JSON boundaries found in decrypted payload (len ${decrypted.length}). ` +
          `Prefix (30 chars): ${decrypted.substring(0, 30)}`
        );
      }
      dataObj = rawResult.data || rawResult;

    } catch (decryptErr) {
      // Decryption itself failed (wrong block length, padding error, etc.)
      // Fall through to plain text path below
      console.error(`[AirPay IPN] Decryption/extraction failed: ${decryptErr.message}`);
      console.log('[AirPay IPN] Falling back to plain text fields...');
    }
  }

  // ── STEP 2: Fail closed — NO unauthenticated fallback ───────────────────
  // [BT-SEC-02] Previously, if the encrypted `response` was absent or could not be
  // decrypted, the code trusted attacker-supplied plain-text fields and SKIPPED hash
  // verification — letting anyone forge a "payment success" and activate a plan.
  // A callback we cannot decrypt carries no proof it came from AirPay, so we reject
  // it. AirPay's reference integration always sends (and verifies) the encrypted
  // `response`; there is no legitimate plain-text-only callback to support.
  if (!dataObj) {
    throw new Error(
      '[BT-SEC-02] Callback rejected: missing or undecryptable `response`. ' +
      'Plain-text callbacks are not accepted.'
    );
  }

  // ── STEP 3: Verify AirPay secure hash (CRC32) — MANDATORY, NO SKIP ──────
  // Per AirPay v4 docs (getting-started-guide/checksum + payments/ipn-callback):
  //   hash = crc32(orderid : ap_transactionid : amount : transaction_status
  //                : message : merchant_id : username)   [ + : customervpa for UPI ]
  // The hash includes our secret USERNAME, which an attacker cannot know — so a
  // matching hash is the proof the callback is genuine. No hash, or a mismatch,
  // means we do not trust it and nothing is activated.
  const secureHash = dataObj.ap_securehash || dataObj.ap_SecureHash || dataObj.AP_SECUREHASH;
  if (!secureHash) {
    throw new Error('[BT-SEC-02] Callback rejected: ap_securehash missing from verified payload.');
  }

  const pick = (a, b) =>
    dataObj[a] !== undefined ? String(dataObj[a])
    : dataObj[b] !== undefined ? String(dataObj[b]) : '';
  const CHMOD = String(dataObj.chmod || dataObj.CHMOD || reqBody.CHMOD || reqBody.chmod || '').toLowerCase();

  const hashFields = [
    pick('orderid', 'TRANSACTIONID'),
    pick('ap_transactionid', 'APTRANSACTIONID'),
    pick('amount', 'AMOUNT'),
    pick('transaction_status', 'TRANSACTIONSTATUS'),
    pick('message', 'MESSAGE'),
    String(cfg.merchantId),
    String(cfg.username),
  ];
  if (CHMOD === 'upi') {
    const vpa = pick('customervpa', 'CUSTOMERVPA') || String(dataObj.customer_vpa || '');
    hashFields.push(vpa);
  }

  const computedHash = (CRC32.str(hashFields.join(':')) >>> 0).toString();
  if (computedHash !== String(secureHash)) {
    // Do not log the raw hash inputs (they include the secret username).
    throw new Error('[BT-SEC-02] Callback rejected: secure hash mismatch.');
  }
  console.log('[AirPay IPN] ✅ Secure hash verified');

  return { data: dataObj, rawResult };
}

module.exports = {
  getAccessToken,
  buildPaymentPayload,
  verifyAndDecryptCallbackData,
};
