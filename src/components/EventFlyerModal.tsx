import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  Calendar,
  CalendarPlus,
  Check,
  Copy,
  Download,
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

async function generateFlyerPng(
  event: MonteEvent,
  style: FlyerStyle,
  qrDataUrl: string
): Promise<Blob | null> {
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
  const cardBg = isDark ? 'rgba(15, 29, 64, 0.86)' : 'rgba(255, 255, 255, 0.94)';
  const cardBorder = isDark ? 'rgba(37, 99, 235, 0.42)' : 'rgba(37, 99, 235, 0.28)';

  // 1. Base Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, W, H);

  // 2. Top Half Cover Photo (520px tall) with gradient fade into background
  const heroH = 540;
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

  // Smooth fade from cover photo into #081128 (or #F4F8FF)
  const topFade = ctx.createLinearGradient(0, 0, 0, heroH);
  topFade.addColorStop(0, 'rgba(8, 17, 40, 0.62)');
  topFade.addColorStop(0.45, 'rgba(8, 17, 40, 0.18)');
  topFade.addColorStop(0.8, isDark ? 'rgba(8, 17, 40, 0.85)' : 'rgba(244, 248, 255, 0.82)');
  topFade.addColorStop(1, bgColor);
  ctx.fillStyle = topFade;
  ctx.fillRect(0, 0, W, heroH + 4);

  // Subtle electric-blue radial ambient glow
  const glow = ctx.createRadialGradient(W * 0.85, 620, 20, W * 0.85, 620, 440);
  glow.addColorStop(0, isDark ? 'rgba(37, 99, 235, 0.25)' : 'rgba(37, 99, 235, 0.12)');
  glow.addColorStop(1, 'rgba(37, 99, 235, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const padX = 68;

  // 3. Top-Left Circular Orbital "M" + MONTE EVENTS Badge
  const cx = padX + 38;
  const cy = 96;
  // Orbital rings
  ctx.save();
  ctx.strokeStyle = 'rgba(147, 197, 253, 0.65)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 46, 20, -0.45, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Inner circle
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
  let y = 455;
  ctx.fillStyle = textMain;
  ctx.font = '900 60px system-ui, -apple-system, Segoe UI, sans-serif';
  const titleLines = wrapCanvasText(ctx, event.name.toUpperCase(), W - padX * 2, 2);
  for (const line of titleLines) {
    ctx.fillText(line, padX, y);
    y += 68;
  }

  ctx.fillStyle = textMuted;
  ctx.font = '700 23px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(`HOSTED BY ${event.createdBy.toUpperCase()}`, padX, y + 6);
  y += 46;

  // 6. 2x2 Glassmorphic Detail Grid
  const gap = 18;
  const boxW = (W - padX * 2 - gap) / 2;
  const boxH = 92;
  const spotsText = event.mpesaNumber
    ? `${event.maxGuests.toLocaleString()} Spots • M-PESA Ready`
    : `${event.maxGuests.toLocaleString()} Spots Available`;

  const gridItems = [
    { label: 'DATE', value: formatDateShort(event.date) },
    { label: 'LOCATION', value: event.location },
    { label: 'KES / PERSON', value: formatKES(event.costPerPerson) },
    { label: 'CAPACITY & PAY', value: spotsText },
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

    // Small blue dot/icon accent
    ctx.fillStyle = primaryBlue;
    ctx.beginPath();
    ctx.arc(bx + 26, by + 28, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = textMuted;
    ctx.font = '800 15px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(item.label, bx + 42, by + 29);

    ctx.fillStyle = textMain;
    ctx.font = '800 24px system-ui, -apple-system, Segoe UI, sans-serif';
    const val = wrapCanvasText(ctx, item.value, boxW - 44, 1)[0] || item.value;
    ctx.fillText(val, bx + 22, by + 65);
  });

  y += boxH * 2 + gap + 26;

  // 7. MAIN GUESTS / HEADLINERS (if any)
  const mainGuests = event.mainGuests || [];
  if (mainGuests.length > 0) {
    ctx.fillStyle = textMuted;
    ctx.font = '900 16px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText('FEATURING / MAIN GUESTS', padX, y);
    y += 18;

    let px = padX;
    for (const mg of mainGuests.slice(0, 4)) {
      const label = `${mg.name} (${mg.role})`;
      ctx.font = '800 19px system-ui, -apple-system, Segoe UI, sans-serif';
      const pillW = Math.min(ctx.measureText(label).width + 34, W - padX * 2);
      if (px + pillW > W - padX) {
        px = padX;
        y += 46;
      }
      ctx.fillStyle = isDark ? 'rgba(37, 99, 235, 0.25)' : 'rgba(37, 99, 235, 0.12)';
      drawRoundedRect(ctx, px, y, pillW, 38, 19);
      ctx.fill();
      ctx.strokeStyle = primaryBlue;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.fillStyle = textMain;
      ctx.fillText(label, px + 17, y + 20);
      px += pillW + 12;
    }
    y += 58;
  }

  // 8. ACTIVITIES (Glowing Blue-Bordered Glassmorphic Pills — hidden if empty)
  const activities = event.activities || [];
  if (activities.length > 0) {
    ctx.fillStyle = textMuted;
    ctx.font = '900 16px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText('ACTIVITIES', padX, y);
    y += 18;

    let px = padX;
    for (const act of activities.slice(0, 6)) {
      ctx.font = '800 19px system-ui, -apple-system, Segoe UI, sans-serif';
      const pillW = ctx.measureText(act).width + 36;
      if (px + pillW > W - padX) {
        px = padX;
        y += 48;
      }
      ctx.fillStyle = isDark ? 'rgba(15, 29, 64, 0.9)' : '#FFFFFF';
      drawRoundedRect(ctx, px, y, pillW, 40, 20);
      ctx.fill();
      ctx.strokeStyle = primaryBlue;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = isDark ? '#DBEAFE' : '#1D4ED8';
      ctx.fillText(act, px + 18, y + 21);
      px += pillW + 12;
    }
    y += 58;
  }

  // 9. MULTI-EVENT SCHEDULE (if 2+ events added to room)
  const subEvents = event.subEvents || [];
  if (subEvents.length > 0 && y < 1030) {
    ctx.fillStyle = textMuted;
    ctx.font = '900 16px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText('EVENT LINEUP IN THIS ROOM', padX, y);
    y += 24;
    for (const se of subEvents.slice(0, 2)) {
      const line = `• ${se.title} (${formatDateShort(se.date)}${se.time ? ` • ${se.time}` : ''})`;
      ctx.fillStyle = textMain;
      ctx.font = '700 19px system-ui, -apple-system, Segoe UI, sans-serif';
      const clipped = wrapCanvasText(ctx, line, W - padX * 2, 1)[0] || line;
      ctx.fillText(clipped, padX, y);
      y += 28;
    }
  }

  // 10. Bottom Dark-Blue QR Card (fixed cleanly at bottom)
  const qrCardH = 210;
  const qrCardY = H - qrCardH - 48;
  ctx.fillStyle = isDark ? '#0D1C42' : '#081128';
  drawRoundedRect(ctx, padX, qrCardY, W - padX * 2, qrCardH, 28);
  ctx.fill();
  ctx.strokeStyle = 'rgba(37, 99, 235, 0.6)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // QR Code Image on Left
  const qrBoxSize = 162;
  const qrX = padX + 24;
  const qrY = qrCardY + (qrCardH - qrBoxSize) / 2;
  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, qrX, qrY, qrBoxSize, qrBoxSize, 18);
  ctx.fill();

  const qrImg = await loadImageForCanvas(qrDataUrl);
  if (qrImg) {
    ctx.drawImage(qrImg, qrX + 8, qrY + 8, qrBoxSize - 16, qrBoxSize - 16);
  }

  // Right side of QR card
  const infoX = qrX + qrBoxSize + 34;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#93C5FD';
  ctx.font = '800 17px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText('SCAN TO JOIN & RSVP INSTANTLY', infoX, qrCardY + 46);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 32px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(`JOIN ROOM: ${event.inviteCode}`, infoX, qrCardY + 88);

  // Electric-blue RSVP & PAY VIA MONTE pill
  const rsvpText = 'RSVP & PAY VIA MONTE';
  ctx.font = '900 18px system-ui, -apple-system, Segoe UI, sans-serif';
  const rsvpW = ctx.measureText(rsvpText).width + 38;
  ctx.fillStyle = primaryBlue;
  drawRoundedRect(ctx, infoX, qrCardY + 112, rsvpW, 40, 20);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(rsvpText, infoX + 19, qrCardY + 133);

  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '600 18px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText('monte-gg.github.io/monte-events', infoX, qrCardY + 178);

  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), 'image/png', 0.96);
    } catch {
      resolve(null);
    }
  });
}

export const EventFlyerModal: React.FC<EventFlyerModalProps> = ({
  event,
  onClose,
  onShowToast,
}) => {
  const [flyerStyle, setFlyerStyle] = useState<FlyerStyle>('midnight');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const inviteUrl = useMemo(
    () =>
      event
        ? `https://monte-gg.github.io/monte-events/?join=${event.inviteCode}`
        : '',
    [event]
  );

  // Generate real scannable QR code whenever event changes
  useEffect(() => {
    if (!inviteUrl) return;
    let active = true;
    QRCode.toDataURL(inviteUrl, {
      width: 320,
      margin: 1,
      color: {
        dark: '#081128',
        light: '#FFFFFF',
      },
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

  if (!event) return null;

  const isDark = flyerStyle === 'midnight';
  const whatsappText = `🎉 You're invited to ${event.name}!\n📅 ${formatDateShort(event.date)}\n📍 ${event.location}\n💸 ${formatKES(event.costPerPerson)} / person\n👤 Hosted by ${event.createdBy}\n\nJoin Room (${event.inviteCode}) on MONTE EVENTS: ${inviteUrl}`;
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

  const handleCopyInvite = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteUrl).catch(() => {});
    }
    setCopiedLink(true);
    onShowToast('Invite link copied!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const getFilename = () => {
    const slug = event.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    return `${slug || 'monte-event'}-flyer.png`;
  };

  const handleDownloadFlyer = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const blob = await generateFlyerPng(event, flyerStyle, qrDataUrl);
      if (!blob) {
        onShowToast('Could not generate flyer image. Try again.', 'info');
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = getFilename();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      onShowToast('1080×1350 PNG Event Flyer downloaded!');
    } finally {
      setDownloading(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      // Try native Web Share API with PNG file on mobile devices first
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        const blob = await generateFlyerPng(event, flyerStyle, qrDataUrl);
        if (blob) {
          const file = new File([blob], getFilename(), { type: 'image/png' });
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
      // Desktop / unsupported browser fallback: open WhatsApp with text + join link
      window.open(whatsappShareUrl, '_blank', 'noopener,noreferrer');
    } catch {
      // User cancelled native share or fallback needed
    } finally {
      setSharing(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="event-flyer-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[95] flex items-center justify-center bg-[#081128]/85 backdrop-blur-md p-3 sm:p-5 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 18 }}
          transition={{ duration: 0.28, ease: EASE_SKIPER }}
          className="relative w-full max-w-4xl rounded-3xl border border-[#D6E6FF] dark:border-[#2563EB]/35 bg-white dark:bg-[#081128] shadow-2xl overflow-hidden my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between gap-3 border-b border-[#D6E6FF] dark:border-[#2563EB]/25 px-5 py-3.5 bg-[#F0F6FF]/80 dark:bg-[#0D1C42]">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#2563EB] text-white shadow-sm">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-[#081128] dark:text-white">
                  Your Event Flyer is Ready!
                </h2>
                <p className="text-[11px] text-[#081128]/65 dark:text-white/65">
                  1080×1350 (4:5) PNG Poster with scannable QR invite code
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D6E6FF] dark:border-[#2563EB]/35 bg-white dark:bg-[#081128] text-[#081128] dark:text-white hover:border-[#2563EB] transition"
              aria-label="Close flyer modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body: Live 4:5 Flyer Poster Preview + Controls */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 p-5 items-center max-h-[82vh] overflow-y-auto">
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
                <div className="relative h-[40%] w-full overflow-hidden bg-gradient-to-br from-[#0B2E8F] to-[#2563EB]">
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

                  {/* Top-left Orbital M Badge + Top-right Category Pill */}
                  <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2">
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
                <div className="relative z-10 flex-1 flex flex-col justify-between px-4 pb-3.5 -mt-6 space-y-2">
                  {/* Uppercase Title + Host */}
                  <div>
                    <h3 className="text-lg sm:text-xl font-black uppercase leading-tight tracking-tight line-clamp-2">
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

                  {/* 2x2 Glassmorphic Detail Grid */}
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
                      <p className="text-[11px] font-extrabold truncate mt-0.5">
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
                      <p className="text-[11px] font-extrabold truncate mt-0.5">
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
                      <p className="text-[11px] font-extrabold truncate mt-0.5">
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
                      <p className="text-[11px] font-extrabold truncate mt-0.5">
                        {event.maxGuests.toLocaleString()} Spots
                        {event.mpesaNumber ? ' • M-PESA Ready' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Main Guests / Headliners (if any) */}
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

                  {/* Activities (Glowing Blue-Bordered Glassmorphic Pills — hidden if empty) */}
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

                  {/* Multi-Event Schedule (if added) */}
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

            {/* Right Column: Style Toggles + Download & Share Controls */}
            <div className="md:col-span-5 space-y-4">
              {/* 2 Quick Style Toggles */}
              <div className="rounded-2xl border border-[#D6E6FF] dark:border-[#2563EB]/30 bg-[#F0F6FF]/70 dark:bg-[#0D1C42] p-4 space-y-2.5">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#2563EB] dark:text-blue-300">
                  Poster Theme
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFlyerStyle('midnight')}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-extrabold border transition ${
                      flyerStyle === 'midnight'
                        ? 'border-[#2563EB] bg-[#081128] text-white shadow-sm'
                        : 'border-[#D6E6FF] dark:border-[#2563EB]/30 bg-white dark:bg-[#081128]/50 text-[#081128] dark:text-white'
                    }`}
                  >
                    <Moon className="h-3.5 w-3.5 text-[#2563EB]" />
                    Midnight Blue
                  </button>
                  <button
                    type="button"
                    onClick={() => setFlyerStyle('light')}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-extrabold border transition ${
                      flyerStyle === 'light'
                        ? 'border-[#2563EB] bg-[#2563EB] text-white shadow-sm'
                        : 'border-[#D6E6FF] dark:border-[#2563EB]/30 bg-white dark:bg-[#081128]/50 text-[#081128] dark:text-white'
                    }`}
                  >
                    <Sun className="h-3.5 w-3.5" />
                    Clean Light
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleDownloadFlyer}
                  disabled={downloading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 px-5 py-3.5 text-sm font-extrabold text-white shadow-monte transition active:scale-95"
                >
                  {downloading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating 1080×1350 PNG…
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Download Flyer (PNG)
                    </>
                  )}
                </button>

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
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-[#D6E6FF] dark:border-[#2563EB]/35 bg-white dark:bg-[#0D1C42] hover:border-[#2563EB] px-5 py-3 text-sm font-extrabold text-[#081128] dark:text-white transition"
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
                className="w-full rounded-2xl bg-[#F0F6FF] dark:bg-[#13224A] hover:bg-[#D6E6FF]/70 dark:hover:bg-[#1A2D5E] px-5 py-2.5 text-xs font-extrabold text-[#081128] dark:text-white transition"
              >
                Continue to Event Room
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
