/**
 * airpayCrypto.js
 * Core cryptographic helpers for Airpay v4 integration.
 *
 * Encryption key:  MD5(username + "~:~" + password)
 * Outgoing IV:     8 random bytes → 16-char hex string prepended to ciphertext
 * Incoming IV:     SHA-256(full_response_string).slice(0, 16) — Airpay's own derivation
 */
const crypto = require('crypto');

/** SHA-256 checksum helper used for the privatekey / secure-hash fields */
function encryptChecksum(data, salt) {
  return crypto.createHash('sha256').update(`${salt}@${data}`).digest('hex');
}

/** Derives the merchant private key from secret + username + password */
function generatePrivateKey(secret, username, password) {
  const udata = `${username}:|:${password}`;
  return encryptChecksum(udata, secret);
}

/** Sorts postData keys, concatenates values + today's date, returns SHA-256 hex */
function checksumcal(postData) {
  const sortedKeys = Object.keys(postData).sort();
  let data = '';
  for (const k of sortedKeys) {
    data += postData[k];
  }
  const dateStr = new Date().toISOString().split('T')[0];
  const fullString = data + dateStr;
  return {
    checksum: crypto.createHash('sha256').update(fullString).digest('hex'),
    debugString: fullString,
  };
}

function generateChecksum(postData) {
  return checksumcal(postData).checksum;
}

/**
 * Derives the AES-256-CBC encryption key from Airpay credentials.
 * key = MD5(username + "~:~" + password)  → 32 hex chars = 16 bytes... wait,
 * MD5 hex = 32 chars = 32 bytes as UTF-8, which is exactly what AES-256 needs.
 */
function generateEncryptionKeyFromCreds(username, password) {
  return crypto.createHash('md5').update(`${username}~:~${password}`).digest('hex');
}

/**
 * Encrypts plainText with AES-256-CBC.
 * IV = 8 random bytes → 16-char hex string.
 * Output = ivHex + base64(ciphertext)
 * Used for OUTGOING requests (OAuth token, payment payload).
 */
function encrypt(plainText, secretKey) {
  const ivHex = crypto.randomBytes(8).toString('hex');
  const ivBuffer = Buffer.from(ivHex); // 16 ASCII bytes
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secretKey, 'utf-8'), ivBuffer);
  const raw = Buffer.concat([cipher.update(plainText, 'utf-8'), cipher.final()]);
  return ivHex + raw.toString('base64');
}

/**
 * Decrypts responses to OUR outgoing requests (e.g. OAuth token response).
 * We encrypted those using `encrypt()` so the IV is the first 16 ASCII chars.
 */
function decrypt(responsedata, secretKey) {
  const ivBuffer = Buffer.from(responsedata.substring(0, 16)); // 16 ASCII bytes
  const encryptedData = Buffer.from(responsedata.slice(16), 'base64');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secretKey, 'utf-8'), ivBuffer);
  let decrypted = decipher.update(encryptedData, 'binary', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Decrypts Airpay's INCOMING callback response.
 *
 * Airpay derives the IV as:
 *   SHA-256(full_response_string).slice(0, 16)  → 16 raw bytes
 * The ciphertext is everything after the first 16 chars, base64-decoded.
 *
 * Reference: airpay_nodejs_v4/routes/index.js decrypt() function.
 */
function decryptCallbackResponse(responsedata, secretKey) {
  // IV = first 16 bytes of the SHA-256 hash of the FULL response string
  const hash = crypto.createHash('sha256').update(responsedata).digest();
  const iv = hash.slice(0, 16);

  // Ciphertext = everything after the first 16 chars of the response, base64-decoded
  const encryptedData = Buffer.from(responsedata.slice(16), 'base64');

  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secretKey, 'utf-8'), iv);
  let decrypted = decipher.update(encryptedData, 'binary', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = {
  encryptChecksum,
  generatePrivateKey,
  checksumcal,
  generateChecksum,
  generateEncryptionKeyFromCreds,
  encrypt,
  decrypt,
  decryptCallbackResponse,
};
