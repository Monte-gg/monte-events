import 'dotenv/config';

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderMonteEmail({
  subject,
  heading,
  bodyHtml,
  ctaLabel,
  ctaUrl,
  footerNote = 'Plan it. Invite them. Monte it.',
}) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f0f6ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f0f6ff;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #d6e6ff;box-shadow:0 12px 30px rgba(15,23,42,0.08);">
            <tr>
              <td align="center" style="background-color:#0f172a;padding:28px 24px;">
                <div style="display:inline-block;width:48px;height:48px;line-height:48px;border-radius:50%;background-color:#2563eb;border:3px solid #ffffff;color:#ffffff;font-size:24px;font-weight:900;text-align:center;margin-bottom:10px;">
                  M
                </div>
                <div style="color:#ffffff;font-size:20px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;">
                  MONTE EVENTS
                </div>
                <div style="color:#93c5fd;font-size:12px;font-weight:600;margin-top:4px;">
                  Plan it. Invite them. Monte it.
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px;">
                <h1 style="margin:0 0 14px 0;font-size:22px;line-height:1.3;font-weight:800;color:#0f172a;">
                  ${escapeHtml(heading)}
                </h1>
                <div style="font-size:15px;line-height:1.65;color:#334155;">
                  ${bodyHtml}
                </div>
                ${
                  ctaLabel && ctaUrl
                    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:26px 0 8px 0;">
                        <tr>
                          <td align="center" style="border-radius:12px;background-color:#2563eb;">
                            <a href="${escapeHtml(ctaUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:800;color:#ffffff;text-decoration:none;border-radius:12px;">
                              ${escapeHtml(ctaLabel)}
                            </a>
                          </td>
                        </tr>
                      </table>`
                    : ''
                }
              </td>
            </tr>
            <tr>
              <td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 28px;text-align:center;font-size:12px;color:#64748b;">
                ${escapeHtml(footerNote)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendEmail({ to, toName, subject, html }) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.EMAIL_FROM || 'samuelnzunga405@gmail.com';

  if (!apiKey) {
    console.warn('[monte-mailer] BREVO_API_KEY is not set; skipping email send.');
    return { sent: false, error: 'BREVO_API_KEY not configured' };
  }

  if (!to) {
    return { sent: false, error: 'Recipient email is required' };
  }

  try {
    const res = await fetch(BREVO_ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Monte Events', email: senderEmail },
        to: [{ email: to, name: toName || to }],
        subject,
        htmlContent: html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[monte-mailer] Brevo API returned ${res.status}: ${errText}`);
      return { sent: false, error: `Brevo ${res.status}` };
    }

    const data = await res.json().catch(() => ({}));
    return { sent: true, messageId: data.messageId || null };
  } catch (err) {
    console.error('[monte-mailer] Failed to send email via Brevo:', err);
    return { sent: false, error: err?.message || 'Network error' };
  }
}

export async function sendWelcomeEmail({ email, name, frontendUrl }) {
  const safeName = name ? escapeHtml(name.split(' ')[0]) : 'there';
  const subject = 'Welcome to Monte Events!';
  const html = renderMonteEmail({
    subject,
    heading: `Welcome to Monte Events, ${safeName}!`,
    bodyHtml: `
      <p style="margin:0 0 12px 0;">
        Your account is ready. Create event rooms for roadtrips, birthdays, and getaways, track M-PESA payments, manage transparent budgets, and share photos &amp; videos with your squad.
      </p>
    `,
    ctaLabel: 'Open Monte Events',
    ctaUrl: frontendUrl,
  });
  return sendEmail({ to: email, toName: name || email, subject, html });
}

export async function sendPasswordResetEmail({ email, name, resetLink }) {
  const subject = 'Reset Your Password — Monte Events';
  const html = renderMonteEmail({
    subject,
    heading: 'Reset your Monte Events password',
    bodyHtml: `
      <p style="margin:0 0 12px 0;">
        We received a request to reset the password for <strong>${escapeHtml(email)}</strong>. Click below to choose a new password.
      </p>
    `,
    ctaLabel: 'Set New Password',
    ctaUrl: resetLink,
    footerNote: 'If you did not request this, you can safely ignore this email.',
  });
  return sendEmail({ to: email, toName: name || email, subject, html });
}

export async function sendAccountDeletedEmail({ email, name, frontendUrl }) {
  const safeName = name ? escapeHtml(name.split(' ')[0]) : 'there';
  const subject = 'Account Deleted — Monte Events';
  const html = renderMonteEmail({
    subject,
    heading: 'Your Monte Events account has been deleted',
    bodyHtml: `
      <p style="margin:0 0 12px 0;">
        Hi ${safeName}, this confirms that your Monte Events account (<strong>${escapeHtml(email)}</strong>) has been permanently removed.
      </p>
    `,
    ctaLabel: 'Visit Monte Events',
    ctaUrl: frontendUrl,
  });
  return sendEmail({ to: email, toName: name || email, subject, html });
}

export async function sendRoomJoinedEmail({ email, name, room, frontendUrl }) {
  const roomName = room?.name || 'Monte Event';
  const roomDate = room?.date || 'TBA';
  const roomLocation = room?.location || 'TBA';
  const cost = Number(room?.cost_per_person || 0).toLocaleString('en-KE');
  const roomUrl = `${frontendUrl}/?room=${encodeURIComponent(room.id)}`;
  const subject = `You're in! ${roomName} — Monte Events`;

  const html = renderMonteEmail({
    subject,
    heading: `You’re in for ${roomName}!`,
    bodyHtml: `
      <p style="margin:0 0 14px 0;">
        Awesome — you’ve joined <strong>${escapeHtml(roomName)}</strong> on Monte Events:
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f0f6ff;border-radius:12px;border:1px solid #d6e6ff;padding:14px 16px;margin-bottom:14px;">
        <tr><td style="padding:4px 0;font-size:13px;color:#475569;"><strong>Date:</strong> ${escapeHtml(roomDate)}</td></tr>
        <tr><td style="padding:4px 0;font-size:13px;color:#475569;"><strong>Location:</strong> ${escapeHtml(roomLocation)}</td></tr>
        <tr><td style="padding:4px 0;font-size:13px;color:#1d4ed8;"><strong>Budget per person:</strong> KES ${escapeHtml(cost)}</td></tr>
      </table>
    `,
    ctaLabel: 'Open Room',
    ctaUrl: roomUrl,
  });
  return sendEmail({ to: email, toName: name || email, subject, html });
}

export async function sendPaymentSubmittedToHostEmail({
  hostEmail,
  hostName,
  guestName,
  mpesaCode,
  amount,
  room,
  frontendUrl,
}) {
  if (!hostEmail) return { sent: false, error: 'Missing hostEmail' };
  const roomName = room?.name || 'Monte Event';
  const formattedAmt = Number(amount || room?.cost_per_person || 0).toLocaleString('en-KE');
  const roomUrl = `${frontendUrl}/?room=${encodeURIComponent(room.id)}`;
  const subject = `Verify M-PESA Payment (${mpesaCode}) — ${roomName}`;

  const html = renderMonteEmail({
    subject,
    heading: `${guestName} submitted an M-PESA code`,
    bodyHtml: `
      <p style="margin:0 0 14px 0;">
        Hi ${escapeHtml(hostName || 'Host')}, <strong>${escapeHtml(guestName)}</strong> submitted their M-PESA confirmation code for <strong>${escapeHtml(roomName)}</strong>.
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f0f6ff;border-radius:12px;border:1px solid #d6e6ff;padding:14px 16px;margin-bottom:14px;">
        <tr><td style="padding:4px 0;font-size:13px;color:#475569;"><strong>M-PESA Code:</strong> <span style="font-family:monospace;font-size:15px;color:#0f172a;">${escapeHtml(mpesaCode)}</span></td></tr>
        <tr><td style="padding:4px 0;font-size:13px;color:#1d4ed8;"><strong>Amount:</strong> KES ${escapeHtml(formattedAmt)}</td></tr>
      </table>
      <p style="margin:0;">Open the room and click <strong>Approve Payment</strong> once verified.</p>
    `,
    ctaLabel: 'Review & Approve Payment',
    ctaUrl: roomUrl,
  });
  return sendEmail({ to: hostEmail, toName: hostName || hostEmail, subject, html });
}

export async function sendPaymentConfirmedToGuestEmail({
  email,
  name,
  amount,
  mpesaCode,
  room,
  frontendUrl,
}) {
  if (!email) return { sent: false, error: 'Missing guest email' };
  const roomName = room?.name || 'Monte Event';
  const formattedAmt = Number(amount || room?.cost_per_person || 0).toLocaleString('en-KE');
  const roomUrl = `${frontendUrl}/?room=${encodeURIComponent(room.id)}`;
  const subject = `Payment Confirmed — You're in! (${roomName})`;

  const html = renderMonteEmail({
    subject,
    heading: 'Payment Confirmed — You’re in!',
    bodyHtml: `
      <p style="margin:0 0 14px 0;">
        Hi ${escapeHtml(name || 'there')}, the host verified your M-PESA payment for <strong>${escapeHtml(roomName)}</strong>!
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#ecfdf5;border-radius:12px;border:1px solid #a7f3d0;padding:14px 16px;margin-bottom:14px;">
        <tr><td style="padding:4px 0;font-size:13px;color:#065f46;"><strong>Status:</strong> In the Event ✓</td></tr>
        <tr><td style="padding:4px 0;font-size:13px;color:#065f46;"><strong>Amount:</strong> KES ${escapeHtml(formattedAmt)}</td></tr>
        ${mpesaCode ? `<tr><td style="padding:4px 0;font-size:13px;color:#065f46;"><strong>M-PESA Code:</strong> ${escapeHtml(mpesaCode)}</td></tr>` : ''}
      </table>
    `,
    ctaLabel: 'Open Event Room',
    ctaUrl: roomUrl,
  });
  return sendEmail({ to: email, toName: name || email, subject, html });
}
