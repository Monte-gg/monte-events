import crypto from 'crypto';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

function getSecretKey() {
  return (process.env.PAYSTACK_SECRET_KEY || '').trim();
}

export function isPaystackConfigured() {
  return Boolean(getSecretKey());
}

/**
 * Normalize Kenyan phone numbers to +2547XXXXXXXX or +2541XXXXXXXX
 */
export function normalizeKenyanPhonePlus254(rawPhone = '') {
  const cleaned = String(rawPhone).replace(/[\s\-()]/g, '');
  if (/^\+254(7|1)\d{8}$/.test(cleaned)) return cleaned;
  if (/^254(7|1)\d{8}$/.test(cleaned)) return `+${cleaned}`;
  if (/^0(7|1)\d{8}$/.test(cleaned)) return `+254${cleaned.slice(1)}`;
  if (/^(7|1)\d{8}$/.test(cleaned)) return `+254${cleaned}`;
  return null;
}

/**
 * Normalize Kenyan phone numbers to local 10-digit 07XXXXXXXX / 01XXXXXXXX format
 */
export function normalizeKenyanPhoneLocal07(rawPhone = '') {
  const plus = normalizeKenyanPhonePlus254(rawPhone);
  if (!plus) return String(rawPhone || '').replace(/[\s\-()]/g, '');
  return `0${plus.slice(4)}`;
}

/**
 * Verify Paystack webhook HMAC SHA-512 signature using raw request body buffer
 */
export function verifyPaystackSignature(rawBody, signatureHeader) {
  const secret = getSecretKey();
  if (!secret || !rawBody || !signatureHeader) return false;
  const expected = crypto
    .createHmac('sha512', secret)
    .update(rawBody)
    .digest('hex');
  const sigBuf = Buffer.from(String(signatureHeader).trim(), 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

async function paystackRequest(path, options = {}) {
  const secret = getSecretKey();
  if (!secret) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured on the server.');
  }
  const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.status === false) {
    const errMsg =
      json?.data?.message ||
      json?.message ||
      `Paystack API error (${res.status})`;
    const err = new Error(errMsg);
    err.statusCode = res.status;
    err.payload = json;
    throw err;
  }
  return json;
}

/**
 * Trigger Paystack Kenya M-PESA STK Push via /charge
 */
export async function initiateMpesaCharge({
  email,
  amountKes,
  reference,
  phone,
  metadata = {},
}) {
  const normalizedPhone = normalizeKenyanPhonePlus254(phone);
  if (!normalizedPhone) {
    throw new Error(
      'Enter a valid Kenyan M-PESA number (e.g. 0712 345 678 or 0112 345 678).'
    );
  }
  const amountSubunit = Math.round(Number(amountKes) * 100);
  if (!amountSubunit || amountSubunit < 100) {
    throw new Error('Payment amount must be at least KES 1.');
  }

  return paystackRequest('/charge', {
    method: 'POST',
    body: JSON.stringify({
      email,
      amount: amountSubunit,
      currency: 'KES',
      reference,
      mobile_money: {
        phone: normalizedPhone,
        provider: 'mpesa',
      },
      metadata,
    }),
  });
}

/**
 * Verify a Paystack transaction by reference
 */
export async function verifyPaystackTransaction(reference) {
  return paystackRequest(
    `/transaction/verify/${encodeURIComponent(reference)}`,
    { method: 'GET' }
  );
}

/**
 * Create a Paystack Transfer Recipient for a room host's M-PESA details
 */
export async function createHostTransferRecipient({
  mpesaType = 'phone',
  mpesaNumber,
  mpesaName = 'Monte Event Host',
}) {
  const cleanName = String(mpesaName || 'Monte Event Host').trim();
  const cleanNumber = String(mpesaNumber || '').trim();
  if (!cleanNumber) {
    throw new Error('Host M-PESA number is missing.');
  }

  let body;
  if (mpesaType === 'till') {
    body = {
      type: 'mobile_money_business',
      name: cleanName,
      account_number: cleanNumber,
      bank_code: 'MPTILL',
      currency: 'KES',
    };
  } else if (mpesaType === 'paybill') {
    body = {
      type: 'mobile_money_business',
      name: cleanName,
      account_number: cleanNumber,
      bank_code: 'MPPAYBILL',
      currency: 'KES',
    };
  } else {
    // 'phone' or 'pochi'
    body = {
      type: 'mobile_money',
      name: cleanName,
      account_number: normalizeKenyanPhoneLocal07(cleanNumber),
      bank_code: 'MPESA',
      currency: 'KES',
    };
  }

  return paystackRequest('/transferrecipient', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Deduct Paystack's 1.5% collection fee + M-PESA transfer fee so payout doesn't fail on insufficient balance
 */
export function calculateNetPayoutKes(grossAmountKes) {
  const gross = Number(grossAmountKes) || 0;
  const collectionFee = Math.ceil(gross * 0.015);
  const transferFee = gross <= 1500 ? 20 : gross <= 20000 ? 40 : 60;
  return Math.max(0, Math.floor(gross - collectionFee - transferFee));
}

/**
 * Initiate Paystack Transfer to host M-PESA recipient
 */
export async function initiateHostTransfer({
  amountKes,
  recipientCode,
  reason,
  reference,
}) {
  const amountSubunit = Math.round(Number(amountKes) * 100);
  if (amountSubunit < 100) {
    throw new Error('Net payout amount is too low to transfer.');
  }
  return paystackRequest('/transfer', {
    method: 'POST',
    body: JSON.stringify({
      source: 'balance',
      amount: amountSubunit,
      recipient: recipientCode,
      reason,
      reference,
      currency: 'KES',
    }),
  });
}
