import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import {
  Calendar,
  CalendarPlus,
  Check,
  Copy,
  Download,
  FileImage,
  FileText,
  FileType,
  Loader2,
  MapPin,
  Mic2,
  Moon,
  Share2,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { MonteEvent } from '../types';
import { formatDateShort, formatKES } from '../data/sampleData';
import { EASE_SKIPER } from './MotionPrimitives';

interface EventFlyerModalProps {
  event: MonteEvent | null;
  onClose: () => void;
  onShowToast: (msg: string, type?: 'success' | 'info') => void;
}

type FlyerStyle = 'midnight' | 'light';

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[.,!?\s]+$/, '')}…`;
  }
  return lines;
}

function loadImageForCanvas(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function renderFlyerCanvas(
  event: MonteEvent,
  style: FlyerStyle,
  qrDataUrl: string
): Promise<HTMLCanvasElement | null> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const isDark = style === 'midnight';
  const bgColor = isDark ? '#081128' : '#F4F8FF';
  const primaryBlue = '#2563EB';
  const textMain = isDark ? '#FFFFFF' : '#081128';
  const textMuted = isDark ? '#93C5FD' : '#1E40AF';
  const cardBg = isDark ? 'rgba(15, 29, 64, 0.86)' : 'rgba(255, 255, 255, 0.96)';
  const cardBorder = isDark ? 'rgba(37, 99, 235, 0.42)' : 'rgba(37, 99, 235, 0.3)';

  // 1. Base Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, W, H);

  // 2. Top Half Cover Photo with gradient fade
  const heroH = 530;
  const heroGrad = ctx.createLinearGradient(0, 0, W, heroH);
  heroGrad.addColorStop(0, '#0B2E8F');
  heroGrad.addColorStop(1, '#2563EB');
  ctx.fillStyle = heroGrad;
  ctx.fillRect(0, 0, W, heroH);

  const coverImg = await loadImageForCanvas(event.coverImage);
  if (coverImg && coverImg.naturalWidth > 0 && coverImg.naturalHeight > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, heroH);
    ctx.clip();

    const imgRatio = coverImg.naturalWidth / coverImg.naturalHeight;
    const boxRatio = W / heroH;
    let drawW = W;
    let drawH = heroH;
    let offsetX = 0;
    let offsetY = 0;
    if (imgRatio > boxRatio) {
      drawH = heroH;
      drawW = heroH * imgRatio;
      offsetX = -(drawW - W) / 2;
    } else {
      drawW = W;
      drawH = W / imgRatio;
      offsetY = -(drawH - heroH) / 2;
    }
    ctx.drawImage(coverImg, offsetX, offsetY, drawW, drawH);
    ctx.restore();
  }

  const topFade = ctx.createLinearGradient(0, 0, 0, heroH);
  topFade.addColorStop(0, 'rgba(8, 17, 40, 0.62)');
  topFade.addColorStop(0.45, 'rgba(8, 17, 40, 0.18)');
  topFade.addColorStop(0.8, isDark ? 'rgba(8, 17, 40, 0.85)' : 'rgba(244, 248, 255, 0.82)');
  topFade.addColorStop(1, bgColor);
  ctx.fillStyle = topFade;
  ctx.fillRect(0, 0, W, heroH + 4);

  const glow = ctx.createRadialGradient(W * 0.85, 620, 20, W * 0.85, 620, 440);
  glow.addColorStop(0, isDark ? 'rgba(37, 99, 235, 0.25)' : 'rgba(37, 99, 235, 0.12)');
  glow.addColorStop(1, 'rgba(37, 99, 235, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const padX = 68;

  // 3. Top-Left Circular Orbital "M" + MONTE EVENTS Badge
  const cx = padX + 38;
  const cy = 96;
  ctx.save();
  ctx.strokeStyle = 'rgba(147, 197, 253, 0.65)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 46, 20, -0.45, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = primaryBlue;
  ctx.beginPath();
  ctx.arc(cx, cy, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 34px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('M', cx, cy + 2);

  ctx.textAlign = 'left';
  ctx.font = '900 26px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('MONTE EVENTS', cx + 52, cy - 10);
  ctx.font = '700 15px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillStyle = '#BFDBFE';
  ctx.fillText('OFFICIAL EVENT FLYER', cx + 52, cy + 16);

  // 4. Top-Right Electric-Blue Category Pill
  const catLabel = (event.customType || event.type).toUpperCase();
  ctx.font = '900 20px system-ui, -apple-system, Segoe UI, sans-serif';
  const catW = ctx.measureText(catLabel).width + 48;
  ctx.fillStyle = primaryBlue;
  drawRoundedRect(ctx, W - padX - catW, 70, catW, 50, 25);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.fillText(catLabel, W - padX - catW / 2, 96);

  // 5. Bold Uppercase Event Title + Hosted By
  ctx.textAlign = 'left';
  let y = 445;
  ctx.fillStyle = textMain;
  ctx.font = '900 58px system-ui, -apple-system, Segoe UI, sans-serif';
  const titleLines = wrapCanvasText(ctx, event.name.toUpperCase(), W - padX * 2, 2);
  for (const line of titleLines) {
    ctx.fillText(line, padX, y);
    y += 66;
  }

  ctx.fillStyle = textMuted;
  ctx.font = '700 22px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(`HOSTED BY ${event.createdBy.toUpperCase()}`, padX, y + 6);
  y += 44;

  // 6. 2x2 Glassmorphic Detail Grid (taller boxes so Location wraps neatly to 2 lines)
  const gap = 18;
  const boxW = (W - padX * 2 - gap) / 2;
  const boxH = 104;
  const spotsText = event.mpesaNumber
    ? `${event.maxGuests.toLocaleString()} Spots • M-PESA Ready`
    : `${event.maxGuests.toLocaleString()} Spots Available`;

  const gridItems = [
    { label: 'DATE', value: formatDateShort(event.date), maxLines: 1 },
    { label: 'LOCATION', value: event.location, maxLines: 2 },
    { label: 'KES / PERSON', value: formatKES(event.costPerPerson), maxLines: 1 },
    { label: 'SPOTS & PAY', value: spotsText, maxLines: 2 },
  ];

  gridItems.forEach((item, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const bx = padX + col * (boxW + gap);
    const by = y + row * (boxH + gap);

    ctx.fillStyle = cardBg;
    drawRoundedRect(ctx, bx, by, boxW, boxH, 22);
    ctx.fill();
    ctx.strokeStyle = cardBorder;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = primaryBlue;
    ctx.beginPath();
    ctx.arc(bx + 26, by + 26, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = textMuted;
    ctx.font = '800 15px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(item.label, bx + 42, by + 27);

    ctx.fillStyle = textMain;
    ctx.font = '800 22px system-ui, -apple-system, Segoe UI, sans-serif';
    const valLines = wrapCanvasText(ctx, item.value, boxW - 44, item.maxLines);
    valLines.forEach((vl, li) => {
      ctx.fillText(vl, bx + 22, by + 58 + li * 26);
    });
  });

  y += boxH * 2 + gap + 24;

  // 7. MAIN GUESTS / HEADLINERS
  const mainGuests = event.mainGuests || [];
  if (mainGuests.length > 0) {
    ctx.fillStyle = textMuted;
    ctx.font = '900 16px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText('FEATURING / MAIN GUESTS', padX, y);
    y += 16;

    let px = padX;
    for (const mg of mainGuests.slice(0, 4)) {
      const label = `${mg.name} (${mg.role})`;
      ctx.font = '800 18px system-ui, -apple-system, Segoe UI, sans-serif';
      const pillW = Math.min(ctx.measureText(label).width + 32, W - padX * 2);
      if (px + pillW > W - padX) {
        px = padX;
        y += 44;
      }
      ctx.fillStyle = isDark ? 'rgba(37, 99, 235, 0.25)' : 'rgba(37, 99, 235, 0.12)';
      drawRoundedRect(ctx, px, y, pillW, 36, 18);
      ctx.fill();
      ctx.strokeStyle = primaryBlue;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.fillStyle = textMain;
      ctx.fillText(label, px + 16, y + 19);
      px += pillW + 10;
    }
    y += 52;
  }

  // 8. ACTIVITIES
  const activities = event.activities || [];
  if (activities.length > 0) {
    ctx.fillStyle = textMuted;
    ctx.font = '900 16px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText('ACTIVITIES', padX, y);
    y += 16;

    let px = padX;
    for (const act of activities.slice(0, 6)) {
      ctx.font = '800 18px system-ui, -apple-system, Segoe UI, sans-serif';
      const pillW = ctx.measureText(act).width + 34;
      if (px + pillW > W - padX) {
        px = padX;
        y += 46;
      }
      ctx.fillStyle = isDark ? 'rgba(15, 29, 64, 0.9)' : '#FFFFFF';
      drawRoundedRect(ctx, px, y, pillW, 38, 19);
      ctx.fill();
      ctx.strokeStyle = primaryBlue;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = isDark ? '#DBEAFE' : '#1D4ED8';
      ctx.fillText(act, px + 17, y + 20);
      px += pillW + 10;
    }
    y += 52;
  }

  // 9. MULTI-EVENT SCHEDULE
  const subEvents = event.subEvents || [];
  if (subEvents.length > 0 && y < 1030) {
    ctx.fillStyle = textMuted;
    ctx.font = '900 16px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText('EVENT LINEUP IN THIS ROOM', padX, y);
    y += 22;
    for (const se of subEvents.slice(0, 2)) {
      const line = `• ${se.title} (${formatDateShort(se.date)}${se.time ? ` • ${se.time}` : ''})`;
      ctx.fillStyle = textMain;
      ctx.font = '700 18px system-ui, -apple-system, Segoe UI, sans-serif';
      const clipped = wrapCanvasText(ctx, line, W - padX * 2, 1)[0] || line;
      ctx.fillText(clipped, padX, y);
      y += 26;
    }
  }

  // 10. Bottom Dark-Blue QR Card
  const qrCardH = 205;
  const qrCardY = H - qrCardH - 44;
  ctx.fillStyle = isDark ? '#0D1C42' : '#081128';
  drawRoundedRect(ctx, padX, qrCardY, W - padX * 2, qrCardH, 28);
  ctx.fill();
  ctx.strokeStyle = 'rgba(37, 99, 235, 0.6)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  const qrBoxSize = 158;
  const qrX = padX + 24;
  const qrY = qrCardY + (qrCardH - qrBoxSize) / 2;
  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, qrX, qrY, qrBoxSize, qrBoxSize, 18);
  ctx.fill();

  const qrImg = await loadImageForCanvas(qrDataUrl);
  if (qrImg) {
    ctx.drawImage(qrImg, qrX + 8, qrY + 8, qrBoxSize - 16, qrBoxSize - 16);
  }

  const infoX = qrX + qrBoxSize + 32;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#93C5FD';
  ctx.font = '800 16px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText('SCAN TO JOIN & RSVP INSTANTLY', infoX, qrCardY + 44);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 31px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(`JOIN ROOM: ${event.inviteCode}`, infoX, qrCardY + 85);

  const rsvpText = 'RSVP & PAY VIA MONTE';
  ctx.font = '900 17px system-ui, -apple-system, Segoe UI, sans-serif';
  const rsvpW = ctx.measureText(rsvpText).width + 36;
  ctx.fillStyle = primaryBlue;
  drawRoundedRect(ctx, infoX, qrCardY + 109, rsvpW, 38, 19);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(rsvpText, infoX + 18, qrCardY + 129);

  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '600 17px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText('monte-gg.github.io/monte-events', infoX, qrCardY + 174);

  return canvas;
}

/**
 * Build a clean, standards-compliant single-page PDF embedding the 1080x1350 JPEG flyer.
 * Zero external libraries required — opens cleanly in Chrome, Safari, Adobe, iOS & Android.
 */
function buildSinglePageJpegPdf(jpegBytes: Uint8Array, imgW: number, imgH: number): Blob {
  // 4:5 page size in PDF points (576 x 720 pt = 8 x 10 in)
  const pageW = 576;
  const pageH = 720;
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let byteLength = 0;

  const pushStr = (s: string) => {
    const b = encoder.encode(s);
    chunks.push(b);
    byteLength += b.length;
  };
  const pushBytes = (b: Uint8Array) => {
    chunks.push(b);
    byteLength += b.length;
  };
  const startObj = (num: number) => {
    offsets[num] = byteLength;
    pushStr(`${num} 0 obj\n`);
  };

  pushStr('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

  // 1: Catalog
  startObj(1);
  pushStr('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // 2: Pages
  startObj(2);
  pushStr('<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  // 3: Page
  startObj(3);
  pushStr(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`
  );

  // 4: Image XObject (DCTDecode = JPEG)
  startObj(4);
  pushStr(
    `<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
  );
  pushBytes(jpegBytes);
  pushStr('\nendstream\nendobj\n');

  // 5: Page Content Stream
  const contentStream = `q\n${pageW} 0 0 ${pageH} 0 0 cm\n/Im0 Do\nQ\n`;
  startObj(5);
  pushStr(`<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`);

  // xref
  const xrefPos = byteLength;
  pushStr('xref\n0 6\n0000000000 65535 f \n');
  for (let i = 1; i <= 5; i++) {
    pushStr(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }
  pushStr(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`);

  const merged = new Uint8Array(byteLength);
  let pos = 0;
  for (const c of chunks) {
    merged.set(c, pos);
    pos += c.length;
  }
  return new Blob([merged], { type: 'application/pdf' });
}

function buildWordDocBlob(event: MonteEvent, flyerPngDataUrl: string, inviteUrl: string): Blob {
  const esc = (s: string) =>
    String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const activitiesHtml =
    event.activities && event.activities.length > 0
      ? `<p><strong>Activities:</strong> ${event.activities.map(esc).join(' • ')}</p>`
      : '';
  const mainGuestsHtml =
    event.mainGuests && event.mainGuests.length > 0
      ? `<p><strong>Featuring / Main Guests:</strong> ${event.mainGuests
          .map((mg) => `${esc(mg.name)} (${esc(mg.role)})`)
          .join(', ')}</p>`
      : '';
  const subEventsHtml =
    event.subEvents && event.subEvents.length > 0
      ? `<h3>Room Schedule</h3><ul>${event.subEvents
          .map(
            (se) =>
              `<li><strong>${esc(se.title)}</strong> — ${esc(formatDateShort(se.date))}${
                se.time ? ` at ${esc(se.time)}` : ''
              }${se.location ? ` (${esc(se.location)})` : ''}</li>`
          )
          .join('')}</ul>`
      : '';
  const mpesaHtml = event.mpesaNumber
    ? `<p><strong>M-PESA Payment:</strong> ${esc(event.mpesaNumber)}${
        event.mpesaAccount ? ` (Acc: ${esc(event.mpesaAccount)})` : ''
      }${event.mpesaName ? ` — ${esc(event.mpesaName)}` : ''}</p>`
    : '';

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>${esc(event.name)} — MONTE EVENTS Flyer</title>
<style>
  body { font-family: Arial, sans-serif; color: #081128; margin: 24px; }
  .poster { text-align: center; margin-bottom: 20px; }
  .poster img { width: 540px; max-width: 100%; border-radius: 12px; }
  h1 { color: #0B2E8F; margin-bottom: 6px; }
  .meta { background: #F0F6FF; border: 1px solid #D6E6FF; padding: 14px; border-radius: 10px; }
</style>
</head>
<body>
  <div class="poster">
    <img src="${flyerPngDataUrl}" alt="${esc(event.name)} Event Flyer" />
  </div>
  <h1>${esc(event.name)}</h1>
  <div class="meta">
    <p><strong>Category:</strong> ${esc(event.customType || event.type)}</p>
    <p><strong>Hosted By:</strong> ${esc(event.createdBy)}</p>
    <p><strong>Date:</strong> ${esc(formatDateShort(event.date))}</p>
    <p><strong>Location:</strong> ${esc(event.location)}</p>
    <p><strong>Cost / Person:</strong> ${esc(formatKES(event.costPerPerson))} (${event.maxGuests.toLocaleString()} Spots)</p>
    ${mpesaHtml}
    ${mainGuestsHtml}
    ${activitiesHtml}
    ${subEventsHtml}
    <p><strong>Join Room Code:</strong> ${esc(event.inviteCode)}</p>
    <p><strong>RSVP Link:</strong> <a href="${esc(inviteUrl)}">${esc(inviteUrl)}</a></p>
  </div>
</body>
</html>`;

  return new Blob(['\ufeff', html], { type: 'application/msword' });
}

export const EventFlyerModal: React.FC<EventFlyerModalProps> = ({
  event,
  onClose,
  onShowToast,
}) => {
  const [flyerStyle, setFlyerStyle] = useState<FlyerStyle>('midnight');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [downloadingFormat, setDownloadingFormat] = useState<
    null | 'png' | 'pdf' | 'doc'
  >(null);
  const [sharing, setSharing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const inviteUrl = useMemo(
    () =>
      event
        ? `https://monte-gg.github.io/monte-events/?join=${event.inviteCode}`
        : '',
    [event]
  );

  useEffect(() => {
    if (!inviteUrl) return;
    let active = true;
    QRCode.toDataURL(inviteUrl, {
      width: 320,
      margin: 1,
      color: { dark: '#081128', light: '#FFFFFF' },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [inviteUrl]);

  useEffect(() => {
    if (!event) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [event, onClose]);

  if (!event || typeof document === 'undefined') return null;

  const isDark = flyerStyle === 'midnight';
  const whatsappText = `🎉 You're invited to ${event.name}!\n📅 ${formatDateShort(event.date)}\n📍 ${event.location}\n💸 ${formatKES(event.costPerPerson)} / person\n👤 Hosted by ${event.createdBy}\n\nJoin Room (${event.inviteCode}) on MONTE EVENTS: ${inviteUrl}`;
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

  const getSlug = () =>
    event.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'monte-event';

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const handleCopyInvite = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteUrl).catch(() => {});
    }
    setCopiedLink(true);
    onShowToast('Invite link copied!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownload = async (format: 'png' | 'pdf' | 'doc') => {
    if (downloadingFormat) return;
    setDownloadingFormat(format);
    try {
      const canvas = await renderFlyerCanvas(event, flyerStyle, qrDataUrl);
      if (!canvas) {
        onShowToast('Could not generate flyer. Try again.', 'info');
        return;
      }

      if (format === 'png') {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((b) => resolve(b), 'image/png', 0.96)
        );
        if (!blob) throw new Error('PNG failed');
        triggerDownload(blob, `${getSlug()}-flyer.png`);
        onShowToast('1080×1350 PNG Event Flyer downloaded!');
      } else if (format === 'pdf') {
        const jpegBlob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.93)
        );
        if (!jpegBlob) throw new Error('PDF image failed');
        const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
        const pdfBlob = buildSinglePageJpegPdf(jpegBytes, canvas.width, canvas.height);
        triggerDownload(pdfBlob, `${getSlug()}-flyer.pdf`);
        onShowToast('PDF Event Flyer downloaded!');
      } else {
        const pngDataUrl = canvas.toDataURL('image/png', 0.92);
        const docBlob = buildWordDocBlob(event, pngDataUrl, inviteUrl);
        triggerDownload(docBlob, `${getSlug()}-flyer.doc`);
        onShowToast('Word (.doc) Event Flyer downloaded!');
      }
    } catch {
      onShowToast('Could not export flyer. Please try again.', 'info');
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleShareWhatsApp = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        const canvas = await renderFlyerCanvas(event, flyerStyle, qrDataUrl);
        const blob = canvas
          ? await new Promise<Blob | null>((resolve) =>
              canvas.toBlob((b) => resolve(b), 'image/png', 0.95)
            )
          : null;
        if (blob) {
          const file = new File([blob], `${getSlug()}-flyer.png`, { type: 'image/png' });
          const canShareFiles =
            typeof navigator.canShare === 'function' &&
            navigator.canShare({ files: [file] });
          if (canShareFiles) {
            await navigator.share({
              title: event.name,
              text: whatsappText,
              files: [file],
            });
            return;
          }
        }
      }
      window.open(whatsappShareUrl, '_blank', 'noopener,noreferrer');
    } catch {
      // User dismissed share sheet
    } finally {
      setSharing(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="event-flyer-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-[#081128]/85 backdrop-blur-md p-3 sm:p-5"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 18 }}
          transition={{ duration: 0.28, ease: EASE_SKIPER }}
          className="relative w-full max-w-4xl max-h-[92dvh] flex flex-col rounded-3xl border border-[#D6E6FF] dark:border-[#2563EB]/35 bg-white dark:bg-[#081128] shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="shrink-0 flex items-center justify-between gap-3 border-b border-[#D6E6FF] dark:border-[#2563EB]/25 px-4 sm:px-5 py-3.5 bg-[#F0F6FF]/85 dark:bg-[#0D1C42]">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#2563EB] text-white shadow-sm">
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-sm sm:text-base font-extrabold text-[#081128] dark:text-white">
                  Your Event Flyer is Ready!
                </h2>
                <p className="truncate text-[11px] text-[#081128]/65 dark:text-white/65">
                  Export as PNG Image, PDF, or Word (.doc) with scannable QR code
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#D6E6FF] dark:border-[#2563EB]/35 bg-white dark:bg-[#081128] text-[#081128] dark:text-white hover:border-[#2563EB] transition"
              aria-label="Close flyer modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable Body: Flyer Preview + Export Controls */}
          <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-5 p-4 sm:p-5 items-start md:items-center">
            {/* 4:5 Flyer Poster */}
            <div className="md:col-span-7 flex justify-center">
              <div
                className={`relative w-full max-w-[390px] aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border flex flex-col justify-between ${
                  isDark
                    ? 'bg-[#081128] text-white border-[#2563EB]/40'
                    : 'bg-[#F4F8FF] text-[#081128] border-[#2563EB]/30'
                }`}
              >
                {/* Top Half Cover Photo */}
                <div className="relative h-[38%] w-full overflow-hidden bg-gradient-to-br from-[#0B2E8F] to-[#2563EB]">
                  {event.coverImage && (
                    <img
                      src={event.coverImage}
                      alt={event.name}
                      crossOrigin="anonymous"
                      className="h-full w-full object-cover"
                    />
                  )}
                  <div
                    className={`absolute inset-0 bg-gradient-to-b ${
                      isDark
                        ? 'from-[#081128]/65 via-[#081128]/20 to-[#081128]'
                        : 'from-[#081128]/60 via-[#081128]/15 to-[#F4F8FF]'
                    }`}
                  />

                  <div className="absolute top-3 left-3.5 right-3.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[#2563EB] border border-white/80 text-white text-xs font-black shadow-lg">
                        <span className="pointer-events-none absolute -inset-1 rounded-full border border-blue-200/70 -rotate-12 scale-x-125 scale-y-75" />
                        M
                      </span>
                      <div className="leading-tight text-white drop-shadow">
                        <p className="text-[10px] font-black tracking-wider">MONTE EVENTS</p>
                        <p className="text-[8px] font-bold text-blue-200 tracking-widest">
                          OFFICIAL FLYER
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-[#2563EB] px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white shadow">
                      {event.customType || event.type}
                    </span>
                  </div>
                </div>

                {/* Middle & Bottom Content */}
                <div className="relative z-10 flex-1 flex flex-col justify-between px-4 pb-3.5 -mt-5 space-y-2">
                  <div>
                    <h3 className="text-base sm:text-xl font-black uppercase leading-tight tracking-tight line-clamp-2">
                      {event.name}
                    </h3>
                    <p
                      className={`mt-0.5 inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider ${
                        isDark ? 'text-blue-300' : 'text-[#2563EB]'
                      }`}
                    >
                      <ShieldCheck className="h-3 w-3" />
                      Hosted by {event.createdBy}
                    </p>
                  </div>

                  {/* 2x2 Glassmorphic Detail Grid — Location wraps neatly to 2 lines */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <div
                      className={`rounded-xl border p-2 ${
                        isDark
                          ? 'bg-[#0F1D40]/85 border-[#2563EB]/40'
                          : 'bg-white/95 border-[#2563EB]/25'
                      }`}
                    >
                      <p className="text-[8px] font-extrabold uppercase tracking-wider text-[#2563EB] dark:text-blue-300 flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5 text-[#2563EB]" />
                        Date
                      </p>
                      <p className="text-[11px] font-extrabold leading-tight mt-0.5">
                        {formatDateShort(event.date)}
                      </p>
                    </div>
                    <div
                      className={`rounded-xl border p-2 ${
                        isDark
                          ? 'bg-[#0F1D40]/85 border-[#2563EB]/40'
                          : 'bg-white/95 border-[#2563EB]/25'
                      }`}
                    >
                      <p className="text-[8px] font-extrabold uppercase tracking-wider text-[#2563EB] dark:text-blue-300 flex items-center gap-1">
                        <MapPin className="h-2.5 w-2.5 text-[#2563EB]" />
                        Location
                      </p>
                      <p className="text-[11px] font-extrabold leading-snug line-clamp-2 mt-0.5">
                        {event.location}
                      </p>
                    </div>
                    <div
                      className={`rounded-xl border p-2 ${
                        isDark
                          ? 'bg-[#0F1D40]/85 border-[#2563EB]/40'
                          : 'bg-white/95 border-[#2563EB]/25'
                      }`}
                    >
                      <p className="text-[8px] font-extrabold uppercase tracking-wider text-[#2563EB] dark:text-blue-300 flex items-center gap-1">
                        <Wallet className="h-2.5 w-2.5 text-[#2563EB]" />
                        KES / Person
                      </p>
                      <p className="text-[11px] font-extrabold leading-tight mt-0.5">
                        {formatKES(event.costPerPerson)}
                      </p>
                    </div>
                    <div
                      className={`rounded-xl border p-2 ${
                        isDark
                          ? 'bg-[#0F1D40]/85 border-[#2563EB]/40'
                          : 'bg-white/95 border-[#2563EB]/25'
                      }`}
                    >
                      <p className="text-[8px] font-extrabold uppercase tracking-wider text-[#2563EB] dark:text-blue-300 flex items-center gap-1">
                        <Users className="h-2.5 w-2.5 text-[#2563EB]" />
                        Spots &amp; Pay
                      </p>
                      <p className="text-[11px] font-extrabold leading-snug line-clamp-2 mt-0.5">
                        {event.maxGuests.toLocaleString()} Spots
                        {event.mpesaNumber ? ' • M-PESA Ready' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Main Guests */}
                  {event.mainGuests && event.mainGuests.length > 0 && (
                    <div className="space-y-1">
                      <p
                        className={`text-[8px] font-black uppercase tracking-widest flex items-center gap-1 ${
                          isDark ? 'text-blue-300' : 'text-[#2563EB]'
                        }`}
                      >
                        <Mic2 className="h-2.5 w-2.5" />
                        Featuring / Main Guests
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {event.mainGuests.slice(0, 4).map((mg) => (
                          <span
                            key={mg.id}
                            className={`rounded-full border border-[#2563EB] px-2 py-0.5 text-[9px] font-extrabold ${
                              isDark
                                ? 'bg-[#2563EB]/25 text-white'
                                : 'bg-[#2563EB]/10 text-[#081128]'
                            }`}
                          >
                            {mg.name} · {mg.role}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Activities */}
                  {event.activities && event.activities.length > 0 && (
                    <div className="space-y-1">
                      <p
                        className={`text-[8px] font-black uppercase tracking-widest ${
                          isDark ? 'text-blue-300' : 'text-[#2563EB]'
                        }`}
                      >
                        Activities
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {event.activities.slice(0, 6).map((act) => (
                          <span
                            key={act}
                            className={`rounded-full border border-[#2563EB] px-2 py-0.5 text-[9px] font-bold shadow-[0_0_8px_rgba(37,99,235,0.3)] ${
                              isDark
                                ? 'bg-[#0F1D40]/90 text-blue-100'
                                : 'bg-white text-[#1D4ED8]'
                            }`}
                          >
                            {act}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Multi-Event Schedule */}
                  {event.subEvents && event.subEvents.length > 0 && (
                    <div className="space-y-0.5">
                      <p
                        className={`text-[8px] font-black uppercase tracking-widest flex items-center gap-1 ${
                          isDark ? 'text-blue-300' : 'text-[#2563EB]'
                        }`}
                      >
                        <CalendarPlus className="h-2.5 w-2.5" />
                        Room Schedule
                      </p>
                      {event.subEvents.slice(0, 2).map((se) => (
                        <p key={se.id} className="text-[9px] font-bold truncate opacity-90">
                          • {se.title} ({formatDateShort(se.date)}
                          {se.time ? ` · ${se.time}` : ''})
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Bottom Dark-Blue QR Card */}
                  <div className="rounded-2xl bg-[#0D1C42] border border-[#2563EB]/60 p-2.5 flex items-center gap-3 text-white shadow-lg">
                    <div className="h-14 w-14 shrink-0 rounded-xl bg-white p-1 flex items-center justify-center overflow-hidden">
                      {qrDataUrl ? (
                        <img
                          src={qrDataUrl}
                          alt="Join Room QR Code"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-[9px] font-bold text-[#081128]">QR</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-[11px] font-black tracking-wide truncate">
                        JOIN ROOM: {event.inviteCode}
                      </p>
                      <span className="inline-block rounded-full bg-[#2563EB] px-2.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-white">
                        RSVP &amp; PAY VIA MONTE
                      </span>
                      <p className="text-[8px] font-semibold text-blue-200/80 truncate">
                        monte-gg.github.io/monte-events
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: High-Contrast Style Toggle + PNG / PDF / Word Downloads + Share */}
            <div className="md:col-span-5 space-y-4">
              {/* 2 High-Contrast Poster Style Toggles */}
              <div className="rounded-2xl border border-[#D6E6FF] dark:border-[#2563EB]/30 bg-[#F0F6FF]/80 dark:bg-[#0D1C42] p-4 space-y-2.5">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#2563EB] dark:text-blue-300">
                  Poster Theme
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFlyerStyle('midnight')}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-extrabold border transition ${
                      flyerStyle === 'midnight'
                        ? 'border-[#2563EB] bg-[#081128] text-white ring-2 ring-[#2563EB]/40 shadow-sm'
                        : 'border-[#D6E6FF] dark:border-[#2563EB]/30 bg-white dark:bg-[#081128]/60 text-[#081128] dark:text-white hover:border-[#2563EB]'
                    }`}
                  >
                    <Moon className="h-3.5 w-3.5 text-[#3B82F6]" />
                    Midnight Blue
                  </button>
                  <button
                    type="button"
                    onClick={() => setFlyerStyle('light')}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-extrabold border transition ${
                      flyerStyle === 'light'
                        ? 'border-[#2563EB] bg-white text-[#081128] ring-2 ring-[#2563EB]/40 shadow-sm'
                        : 'border-[#D6E6FF] dark:border-[#2563EB]/30 bg-white/70 dark:bg-[#081128]/60 text-[#081128] dark:text-white hover:border-[#2563EB]'
                    }`}
                  >
                    <Sun className="h-3.5 w-3.5 text-amber-500" />
                    Clean Light
                  </button>
                </div>
              </div>

              {/* Download Formats: PNG Image, PDF, Word (.doc) */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleDownload('png')}
                  disabled={downloadingFormat !== null}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 px-5 py-3.5 text-sm font-extrabold text-white shadow-monte transition active:scale-95"
                >
                  {downloadingFormat === 'png' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Exporting PNG Image…
                    </>
                  ) : (
                    <>
                      <FileImage className="h-4 w-4" />
                      Download Image (PNG)
                    </>
                  )}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownload('pdf')}
                    disabled={downloadingFormat !== null}
                    className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-[#2563EB]/40 bg-[#F0F6FF] dark:bg-[#0D1C42] hover:border-[#2563EB] disabled:opacity-60 px-3.5 py-2.5 text-xs font-extrabold text-[#081128] dark:text-white transition active:scale-95"
                  >
                    {downloadingFormat === 'pdf' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2563EB]" />
                    ) : (
                      <FileText className="h-3.5 w-3.5 text-red-500" />
                    )}
                    Download PDF
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownload('doc')}
                    disabled={downloadingFormat !== null}
                    className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-[#2563EB]/40 bg-[#F0F6FF] dark:bg-[#0D1C42] hover:border-[#2563EB] disabled:opacity-60 px-3.5 py-2.5 text-xs font-extrabold text-[#081128] dark:text-white transition active:scale-95"
                  >
                    {downloadingFormat === 'doc' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2563EB]" />
                    ) : (
                      <FileType className="h-3.5 w-3.5 text-[#2563EB]" />
                    )}
                    Download Word
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  disabled={sharing}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition active:scale-95"
                >
                  <Share2 className="h-4 w-4" />
                  {sharing ? 'Preparing Share…' : 'Share to WhatsApp'}
                </button>

                <button
                  type="button"
                  onClick={handleCopyInvite}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-[#D6E6FF] dark:border-[#2563EB]/35 bg-white dark:bg-[#0D1C42] hover:border-[#2563EB] px-5 py-2.5 text-xs sm:text-sm font-extrabold text-[#081128] dark:text-white transition"
                >
                  {copiedLink ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-500" />
                      Invite Link Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 text-[#2563EB]" />
                      Copy Invite Link
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-2xl bg-[#F0F6FF] dark:bg-[#13224A] hover:bg-[#D6E6FF]/70 dark:hover:bg-[#1A2D5E] px-5 py-2.5 text-xs font-extrabold text-[#081128] dark:text-white transition"
              >
                <Download className="h-3.5 w-3.5 opacity-0 hidden" />
                Continue to Event Room
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};
