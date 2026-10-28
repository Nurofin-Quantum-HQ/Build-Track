/**
 * airpayAutopay.test.js
 *
 * Checks the AirPay request against docs.airpay.co.in/v4 (Simple Transaction,
 * Checksum, Manage Subscription, Subscription Status Check) and the AutoPay
 * renewal bookkeeping. No network: axios and the Mongoose models are mocked.
 */
'use strict';

const crypto = require('crypto');

jest.mock('axios');
jest.mock('../models/Payment');
jest.mock('../models/Subscription');

const axios        = require('axios');
const Payment      = require('../models/Payment');
const Subscription = require('../models/Subscription');
const {
  encrypt, decrypt, generateChecksum, generateEncryptionKeyFromCreds, generatePrivateKey, istDateYMD, checksumcal,
} = require('../utils/airpayCrypto');
const airpay = require('../utils/airpayservice');
const { applyRenewal, RENEWAL_DAYS } = require('../services/subscriptionRenewal');

const ENV = {
  AIRPAY_MERCHANT_ID: '12345',
  AIRPAY_CLIENT_ID:   'client',
  AIRPAY_SECRET_KEY:  'secretkey',
  AIRPAY_USERNAME:    'user',
  AIRPAY_PASSWORD:    'pass',
  AIRPAY_ENV:         'sandbox',
};
const KEY = generateEncryptionKeyFromCreds(ENV.AIRPAY_USERNAME, ENV.AIRPAY_PASSWORD);

beforeEach(() => {
  jest.resetAllMocks();
  Object.assign(process.env, ENV);
  delete process.env.AIRPAY_API_KEY;
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

/** OAuth reply as AirPay sends it: encrypted with the same md5 key */
function mockOAuth() {
  axios.post.mockResolvedValueOnce({
    data: { response: encrypt(JSON.stringify({ status: 'success', data: { access_token: 'tok123' } }), KEY) },
  });
}

const BUYER = {
  orderId: 'BT1234567890', amount: 999,
  buyerEmail: 'a@b.com', buyerPhone: '9876543210', buyerFirstName: 'Asha', buyerLastName: 'Rao',
};

async function build(extra) {
  mockOAuth();
  const out = await airpay.buildPaymentPayload({ ...BUYER, ...extra });
  const sent = JSON.parse(decrypt(out.formFields.encdata, KEY));
  return { out, sent };
}

// ── Simple Transaction request shape ──────────────────────────────────────────

describe('buildPaymentPayload — Simple Transaction doc compliance', () => {
  it('posts exactly the four form fields from the doc PHP sample', async () => {
    const { out } = await build({});
    expect(Object.keys(out.formFields).sort()).toEqual(['checksum', 'encdata', 'merchant_id', 'privatekey']);
    expect(out.postUrl).toContain('?token=tok123');
  });

  it('privatekey = sha256(secret@username:|:password)', async () => {
    const { out } = await build({});
    const expected = crypto.createHash('sha256').update('secretkey@user:|:pass').digest('hex');
    expect(out.formFields.privatekey).toBe(expected);
    expect(generatePrivateKey('secretkey', 'user', 'pass')).toBe(expected);
  });

  it('one-time payment: only documented params, no subscription fields, no merchant_id', async () => {
    const { sent } = await build({ isRecurring: false });
    expect(sent).toEqual({
      orderid: 'BT1234567890', amount: '999.00', currency_code: '356', iso_currency: 'INR',
      buyer_email: 'a@b.com', buyer_phone: '9876543210', buyer_firstname: 'Asha', buyer_lastname: 'Rao',
      buyer_country: 'India',
    });
  });

  it('checksum is computed over exactly what is inside encdata', async () => {
    const { out, sent } = await build({ isRecurring: true, chmod: 'upi' });
    expect(out.formFields.checksum).toBe(generateChecksum(sent));
  });

  it('AutoPay: txnsubtype 12 (numeric "INR Subscription") and the sb_* fields', async () => {
    const { sent } = await build({ isRecurring: true });
    expect(sent.txnsubtype).toBe('12');
    expect(sent).toMatchObject({
      sb_isrecurring: '1', sb_period: 'M', sb_frequency: '1',
      sb_amount: '999.00', sb_maxamount: '999.00', sb_recurringcount: '12',
      // AirPay UAT: "Invalid Retry attempt, should be 0, 1" when this is missing
      sb_retryattempts: '1',
    });
    // none of the Create-Mandate-API fields that were wrongly sent at 3728ef9
    for (const k of ['channel', 'start_date', 'end_date', 'period', 'merchant_id']) {
      expect(sent).not.toHaveProperty(k);
    }
  });

  it('AutoPay: sb_nextrundate is DD/MM/YYYY and at least T+1', async () => {
    const { sent } = await build({ isRecurring: true });
    expect(sent.sb_nextrundate).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    const [d, m, y] = sent.sb_nextrundate.split('/').map(Number);
    const next = Date.UTC(y, m - 1, d);
    const [ty, tm, td] = istDateYMD().split('-').map(Number);
    expect(next).toBeGreaterThan(Date.UTC(ty, tm - 1, td));
  });

  it('chmod goes INSIDE encdata (not as a loose form field)', async () => {
    const { out, sent } = await build({ isRecurring: true, chmod: 'UPI' });
    expect(sent.chmod).toBe('upi');
    expect(out.formFields).not.toHaveProperty('chmod');
  });

  it('AutoPay defaults to UPI (chmod "upi" inside encdata)', async () => {
    const { sent } = await build({ isRecurring: true });
    expect(sent.chmod).toBe('upi');
  });

  it('one-time payment leaves chmod blank ("leave blank to show all enabled modes")', async () => {
    const { sent } = await build({ isRecurring: false });
    expect(sent).not.toHaveProperty('chmod');
  });

  it('unknown chmod values from the client are dropped', async () => {
    const { sent } = await build({ chmod: 'upi"><script>' });
    expect(sent).not.toHaveProperty('chmod');
  });

  it('eNACH AutoPay may be never-ending (999); UPI/blank may not', async () => {
    const { sent } = await build({ isRecurring: true, chmod: 'enach' });
    expect(sent.sb_recurringcount).toBe('999');
  });
});

// ── Dates ─────────────────────────────────────────────────────────────────────

describe('IST dates', () => {
  it('checksum date is the IST date, not UTC (01:30 IST on 28 Oct is still 27 Oct in UTC)', () => {
    const at = new Date('2026-10-27T20:00:00Z'); // 28 Oct 01:30 IST
    expect(istDateYMD(at)).toBe('2026-10-28');
    expect(checksumcal({ a: 'x' }, at).debugString).toBe('x2026-10-28');
  });

  it('addMonthsIST clamps to the end of shorter months', () => {
    expect(airpay.formatDDMMYYYY(airpay.addMonthsIST(new Date('2027-01-31T06:00:00Z'), 1))).toBe('28/02/2027');
    expect(airpay.formatDDMMYYYY(airpay.addMonthsIST(new Date('2026-10-28T06:00:00Z'), 1))).toBe('28/11/2026');
    expect(airpay.formatDDMMYYYY(airpay.addMonthsIST(new Date('2026-12-15T06:00:00Z'), 1))).toBe('15/01/2027');
  });
});

// ── Manage Subscription (cancel) ──────────────────────────────────────────────

describe('manageSubscription (Unsubscribe)', () => {
  it('sends the documented JSON body with an HMAC checksum', async () => {
    axios.post.mockResolvedValueOnce({ data: { status: '200', message: 'Subscription updated successfully.' } });
    const r = await airpay.manageSubscription('1000001', 'U');
    expect(r.ok).toBe(true);

    const [url, body, opts] = axios.post.mock.calls[0];
    expect(url).toBe('https://kraken.airpay.co.in/airpay/api/updatesubscription.php');
    expect(opts.headers['Content-Type']).toBe('application/json');
    expect(body).toMatchObject({ merchant_id: '12345', subscription_id: '1000001', action: 'U' });
    expect(body.sb_date).toMatch(/^\d{2}-\d{2}-\d{4}$/);

    const pk = generatePrivateKey('secretkey', 'user', 'pass');
    const expected = crypto.createHmac('sha256', 'secretkey')
      .update(`1000001${pk}12345U${body.sb_date}`).digest('hex');
    expect(body.checksum).toBe(expected);
  });

  it('603 "already unsubscribed" counts as stopped; other codes do not', async () => {
    axios.post.mockResolvedValueOnce({ data: { status: '603', message: 'Subscription is in Unsubscribed state' } });
    expect((await airpay.manageSubscription('1', 'U')).ok).toBe(true);
    axios.post.mockResolvedValueOnce({ data: { status: '533', message: 'Error in unsubscription' } });
    expect((await airpay.manageSubscription('1', 'U')).ok).toBe(false);
  });
});

// ── Subscription Status Check ─────────────────────────────────────────────────

describe('successfulDebits (status-check response)', () => {
  it('extracts successful debits from TRANSACTION_HISTORY + down-payment', () => {
    const data = {
      DOWNPAYMENNT_HISTORY: { AIRPAY_ID: '1', TRANSACTION_STATUS: 'SUCCESS', TRANSACTION_AMOUNT: '999.00' },
      TRANSACTION_HISTORY: [
        { AIRPAY_ID: '2', TRANSACTION_STATUS: 'SUCCESS', TRANSACTION_AMOUNT: '999.00' },
        { AIRPAY_ID: '3', TRANSACTION_STATUS: 'FAILED',  TRANSACTION_AMOUNT: '999.00' },
      ],
    };
    expect(airpay.successfulDebits(data)).toEqual([
      { airpayTxnId: '2', amount: 999 }, { airpayTxnId: '1', amount: 999 },
    ]);
  });
});

// ── Renewal bookkeeping ───────────────────────────────────────────────────────

describe('applyRenewal', () => {
  const baseSub = () => ({
    _id: 'sub1', userId: 'u1', plan: 'growth', amount: 999, currency: 'INR',
    status: 'active', airpayTxnId: 'first', endDate: new Date(Date.now() + 2 * 864e5),
  });

  it('a new successful debit records a PAID renewal and extends from the current end date', async () => {
    Payment.findOne.mockResolvedValue(null);
    Payment.create.mockResolvedValue({});
    Subscription.findByIdAndUpdate.mockResolvedValue({});
    const sub = baseSub();
    const oldEnd = sub.endDate.getTime();

    expect(await applyRenewal(sub, { airpayTxnId: 'txn2', amount: 999 })).toBe(true);
    expect(Payment.create).toHaveBeenCalledWith(expect.objectContaining({
      orderId: 'RNtxn2', airpayTxnId: 'txn2', status: 'PAID', isRenewal: true,
    }));
    const update = Subscription.findByIdAndUpdate.mock.calls[0][1];
    expect(update.status).toBe('active');
    expect(update.endDate.getTime() - oldEnd).toBe(RENEWAL_DAYS * 864e5);
  });

  it('is idempotent: a debit already recorded is ignored', async () => {
    Payment.findOne.mockResolvedValue({ _id: 'p' });
    expect(await applyRenewal(baseSub(), { airpayTxnId: 'txn2', amount: 999 })).toBe(false);
    expect(Payment.create).not.toHaveBeenCalled();
  });

  it('the original payment is not counted as a renewal', async () => {
    expect(await applyRenewal(baseSub(), { airpayTxnId: 'first', amount: 999 })).toBe(false);
  });

  it('rejects a debit whose amount does not match the plan', async () => {
    Payment.findOne.mockResolvedValue(null);
    expect(await applyRenewal(baseSub(), { airpayTxnId: 'txn2', amount: 5000 })).toBe(false);
    expect(Payment.create).not.toHaveBeenCalled();
  });

  it('a debit on a cancelled subscription extends access but stays cancelled', async () => {
    Payment.findOne.mockResolvedValue(null);
    Payment.create.mockResolvedValue({});
    Subscription.findByIdAndUpdate.mockResolvedValue({});
    await applyRenewal({ ...baseSub(), status: 'cancelled' }, { airpayTxnId: 'txn9', amount: 999 });
    expect(Subscription.findByIdAndUpdate.mock.calls[0][1]).not.toHaveProperty('status');
  });
});
