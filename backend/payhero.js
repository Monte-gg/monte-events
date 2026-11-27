const PAYHERO_PAYMENTS_URL = 'https://backend.payhero.co.ke/api/v2/payments';
const PAYHERO_CALLBACK_URL = 'https://monte-events.onrender.com/api/webhooks/payhero';

function getPayheroAuthHeader() {
  const raw = (process.env.PAYHERO_AUTH_TOKEN || '').trim();
  if (!raw) return '';
  return raw.startsWith('Basic ') ? raw : `Basic ${raw}`;
}

function getPayheroChannelId() {
  const parsed = Number.parseInt(String(process.env.PAYHERO_CHANNEL_ID || '').trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function isPayheroConfigured() {
  return Boolean(getPayheroAuthHeader() && getPayheroChannelId());
}

/**
 * Normalize Kenyan M-PESA phone numbers (+2547..., 2547..., 07..., 01..., 7..., 1...)
 * to 2547XXXXXXXX / 2541XXXXXXXX format accepted by PayHero Kenya API v2.
 */
export function normalizeKenyanPhone(rawPhone = '') {
  const cleaned = String(rawPhone).replace(/[\s\-()]/g, '');
  if (/^\+254(7|1)\d{8}$/.test(cleaned)) return cleaned.slice(1);
  if (/^254(7|1)\d{8}$/.test(cleaned)) return cleaned;
  if (/^0(7|1)\d{8}$/.test(cleaned)) return `254${cleaned.slice(1)}`;
  if (/^(7|1)\d{8}$/.test(cleaned)) return `254${cleaned}`;
  return null;
}

/**
 * Trigger PayHero Kenya API v2 M-PESA STK Push
 */
export async function initiatePayheroStkPush({
  amount,
  phone,
  reference,
  customerName,
}) {
  const authHeader = getPayheroAuthHeader();
  const channelId = getPayheroChannelId();
  if (!authHeader || !channelId) {
    throw new Error(
      'PayHero is not configured on the server (missing PAYHERO_AUTH_TOKEN or PAYHERO_CHANNEL_ID).'
    );
  }

  const normalizedPhone = normalizeKenyanPhone(phone);
  if (!normalizedPhone) {
    throw new Error(
      'Enter a valid Kenyan M-PESA number (e.g. 0712 345 678 or 0112 345 678).'
    );
  }

  const roundedAmount = Math.round(Number(amount));
  if (!roundedAmount || roundedAmount < 1) {
    throw new Error('Payment amount must be at least KES 1.');
  }

  const res = await fetch(PAYHERO_PAYMENTS_URL, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: roundedAmount,
      phone_number: normalizedPhone,
      channel_id: channelId,
      provider: 'm-pesa',
      external_reference: reference,
      customer_name: String(customerName || 'Monte Guest').trim(),
      callback_url: PAYHERO_CALLBACK_URL,
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false || json.status === 'FAILED') {
    const errMsg =
      json.error_message ||
      json.message ||
      json.error ||
      json.detail ||
      `PayHero API error (${res.status})`;
    const err = new Error(String(errMsg));
    err.statusCode = res.status >= 400 ? res.status : 502;
    throw err;
  }

  return {
    phone: normalizedPhone,
    amount: roundedAmount,
    raw: json,
  };
}
