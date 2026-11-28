const PAYHERO_PAYMENTS_URL = 'https://backend.payhero.co.ke/api/v2/payments';
const PAYHERO_BANK_PAYBILLS_URL = 'https://backend.payhero.co.ke/api/v2/bank_paybills';
const PAYHERO_CHANNELS_URL = 'https://backend.payhero.co.ke/api/v2/payment_channels';
const PAYHERO_CALLBACK_URL = 'https://monte-events.onrender.com/api/webhooks/payhero';

export const FALLBACK_KENYAN_BANKS = [
  { name: 'KCB Bank', paybill: '522522' },
  { name: 'Equity Bank', paybill: '247247' },
  { name: 'Co-operative Bank', paybill: '400200' },
  { name: 'NCBA Bank', paybill: '880100' },
  { name: 'ABSA Bank Kenya', paybill: '303030' },
  { name: 'I&M Bank', paybill: '542542' },
  { name: 'Standard Chartered', paybill: '329329' },
  { name: 'Stanbic Bank', paybill: '600100' },
  { name: 'Family Bank', paybill: '222111' },
  { name: 'Diamond Trust Bank (DTB)', paybill: '516600' },
];

export function getPayheroAuthHeader() {
  const raw = (process.env.PAYHERO_AUTH_TOKEN || '').trim();
  if (!raw) return '';
  return raw.startsWith('Basic ') ? raw : `Basic ${raw}`;
}

export function getPayheroAccountId() {
  const parsed = Number.parseInt(String(process.env.PAYHERO_ACCOUNT_ID || '').trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function isPayheroConfigured() {
  return Boolean(getPayheroAuthHeader());
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
 * Fetch Kenyan bank paybills from PayHero v2 (with standard fallback list if unreachable)
 */
export async function fetchPayheroBankPaybills() {
  const authHeader = getPayheroAuthHeader();
  if (!authHeader) return FALLBACK_KENYAN_BANKS;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(PAYHERO_BANK_PAYBILLS_URL, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    });
    clearTimeout(timer);
    if (!res.ok) return FALLBACK_KENYAN_BANKS;

    const json = await res.json().catch(() => null);
    const rawList = Array.isArray(json)
      ? json
      : Array.isArray(json?.bank_paybills)
      ? json.bank_paybills
      : Array.isArray(json?.data)
      ? json.data
      : [];

    const mapped = rawList
      .map((item) => ({
        name: String(item.bank_name || item.name || item.title || '').trim(),
        paybill: String(item.paybill || item.short_code || item.paybill_number || '').trim(),
      }))
      .filter((b) => b.name && b.paybill);

    return mapped.length > 0 ? mapped : FALLBACK_KENYAN_BANKS;
  } catch {
    return FALLBACK_KENYAN_BANKS;
  }
}

/**
 * Dynamically register a host's Bank, M-PESA Till, or M-PESA Paybill channel on PayHero v2
 */
export async function registerPayheroHostChannel({
  channelType,
  shortCode,
  accountNumber = '',
  description = 'Monte Events Host Channel',
}) {
  const authHeader = getPayheroAuthHeader();
  const accountId = getPayheroAccountId();

  if (!authHeader) {
    const err = new Error('PayHero is not configured on the server (missing PAYHERO_AUTH_TOKEN).');
    err.statusCode = 503;
    throw err;
  }
  if (!accountId) {
    const err = new Error(
      'PayHero account ID is not configured on the server (missing PAYHERO_ACCOUNT_ID).'
    );
    err.statusCode = 503;
    throw err;
  }

  const validTypes = new Set(['bank', 'till', 'paybill']);
  if (!validTypes.has(channelType)) {
    const err = new Error('channel_type must be "bank", "till", or "paybill".');
    err.statusCode = 400;
    throw err;
  }

  const numericShortCode = Number.parseInt(String(shortCode || '').replace(/\D/g, ''), 10);
  if (!Number.isFinite(numericShortCode) || numericShortCode <= 0) {
    const err = new Error('A valid numeric short code (Bank Paybill, Till, or Paybill number) is required.');
    err.statusCode = 400;
    throw err;
  }

  const res = await fetch(PAYHERO_CHANNELS_URL, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel_type: channelType,
      account_id: accountId,
      short_code: numericShortCode,
      account_number: String(accountNumber || '').trim(),
      description: String(description || 'Monte Events Host Channel').trim().slice(0, 120),
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    const errMsg =
      json.error_message ||
      json.message ||
      json.error ||
      json.detail ||
      `PayHero channel registration failed (${res.status})`;
    const err = new Error(String(errMsg));
    err.statusCode = res.status >= 400 ? res.status : 502;
    throw err;
  }

  const rawId =
    json.channel_id ??
    json.id ??
    json.data?.channel_id ??
    json.data?.id ??
    json.payment_channel?.id;
  const channelId = Number.parseInt(String(rawId ?? ''), 10);
  if (!Number.isFinite(channelId) || channelId <= 0) {
    const err = new Error('PayHero did not return a valid channel_id for this payout channel.');
    err.statusCode = 502;
    throw err;
  }

  return {
    channelId,
    shortCode: String(numericShortCode),
    accountNumber: String(accountNumber || '').trim(),
    raw: json,
  };
}

/**
 * Trigger PayHero Kenya API v2 M-PESA STK Push routed directly to the event host's channel_id
 */
export async function initiatePayheroStkPush({
  amount,
  phone,
  reference,
  customerName,
  channelId,
}) {
  const authHeader = getPayheroAuthHeader();
  if (!authHeader) {
    const err = new Error(
      'PayHero is not configured on the server (missing PAYHERO_AUTH_TOKEN).'
    );
    err.statusCode = 503;
    throw err;
  }

  const resolvedChannelId = Number.parseInt(String(channelId ?? ''), 10);
  if (!Number.isFinite(resolvedChannelId) || resolvedChannelId <= 0) {
    const err = new Error(
      'This event does not have an instant STK Push payout channel configured. Please pay the host directly via M-PESA and submit your confirmation code.'
    );
    err.statusCode = 400;
    throw err;
  }

  const normalizedPhone = normalizeKenyanPhone(phone);
  if (!normalizedPhone) {
    const err = new Error(
      'Enter a valid Kenyan M-PESA number (e.g. 0712 345 678 or 0112 345 678).'
    );
    err.statusCode = 400;
    throw err;
  }

  const roundedAmount = Math.round(Number(amount));
  if (!roundedAmount || roundedAmount < 1) {
    const err = new Error('Payment amount must be at least KES 1.');
    err.statusCode = 400;
    throw err;
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
      channel_id: resolvedChannelId,
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
    channelId: resolvedChannelId,
    raw: json,
  };
}
