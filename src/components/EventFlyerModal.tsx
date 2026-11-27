import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Check,
  Copy,
  Download,
  Loader2,
  MapPin,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { MonteEvent } from '../types';
import { formatDateShort, formatKES } from '../data/sampleData';
import { ThemeToggle } from './ThemeToggle';
import { EASE_SKIPER } from './MotionPrimitives';

interface EventFlyerModalProps {
  event: MonteEvent | null;
  onClose: () => void;
  onShowToast: (msg: string, type?: 'success' | 'info') => void;
}

function getMpesaLabel(type?: MonteEvent['mpesaType']): string {
  switch (type) {
    case 'till':
      return 'M-PESA Buy Goods Till';
    case 'paybill':
      return 'M-PESA Paybill';
    case 'pochi':
      return 'Pochi la Biashara';
    default:
      return 'M-PESA Send Money';
  }
}

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

async function generateFlyerPng(event: MonteEvent): Promise<Blob | null> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Base midnight-navy & royal-blue gradient
  const baseGrad = ctx.createLinearGradient(0, 0, W, H);
  baseGrad.addColorStop(0, '#0B2E8F');
  baseGrad.addColorStop(0.5, '#1A6BFF');
  baseGrad.addColorStop(1, '#0A1430');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, W, H);

  // Draw cover photo (cover-fit) if CORS allows
  const img = await loadImageForCanvas(event.coverImage);
  if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = W / H;
    let drawW = W;
    let drawH = H;
    let offsetX = 0;
    let offsetY = 0;

    if (imgRatio > canvasRatio) {
      drawH = H;
      drawW = H * imgRatio;
      offsetX = -(drawW - W) / 2;
    } else {
      drawW = W;
      drawH = W / imgRatio;
      offsetY = -(drawH - H) / 2;
    }
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
  }

  // Dramatic royal-blue / midnight-navy gradient overlay for clean legibility
  const scrim = ctx.createLinearGradient(0, 0, 0, H);
  scrim.addColorStop(0, 'rgba(10, 20, 48, 0.72)');
  scrim.addColorStop(0.35, 'rgba(11, 46, 143, 0.32)');
  scrim.addColorStop(0.62, 'rgba(10, 20, 48, 0.84)');
  scrim.addColorStop(1, 'rgba(10, 20, 48, 0.97)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, W, H);

  // Subtle decorative royal-blue top glow
  const glow = ctx.createRadialGradient(W * 0.85, H * 0.12, 20, W * 0.85, H * 0.12, 420);
  glow.addColorStop(0, 'rgba(43, 127, 255, 0.42)');
  glow.addColorStop(1, 'rgba(43, 127, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Outer crisp frame border
  ctx.strokeStyle = 'rgba(214, 230, 255, 0.22)';
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, 36, 36, W - 72, H - 72, 40);
  ctx.stroke();

  // Top Header: MONTE EVENTS Emblem + Event Type Pill
  const padX = 80;
  // M Circle Emblem
  ctx.fillStyle = '#1A6BFF';
  ctx.beginPath();
  ctx.arc(padX + 34, 114, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 36px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('M', padX + 34, 116);

  ctx.textAlign = 'left';
  ctx.font = '900 28px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('MONTE EVENTS', padX + 86, 106);

  ctx.font = '600 17px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillStyle = '#D6E6FF';
  ctx.fillText('OFFICIAL EVENT FLYER', padX + 86, 134);

  // Event Type Pill on Top Right
  const typeLabel = (event.customType || event.type).toUpperCase();
  ctx.font = '800 20px system-ui, -apple-system, Segoe UI, sans-serif';
  const typeWidth = ctx.measureText(typeLabel).width + 48;
  ctx.fillStyle = '#1A6BFF';
  drawRoundedRect(ctx, W - padX - typeWidth, 88, typeWidth, 52, 26);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.fillText(typeLabel, W - padX - typeWidth / 2, 115);

  // Middle/Lower Main Typography
  ctx.textAlign = 'left';
  let cursorY = 580;

  // Eyebrow pill
  const eyebrow = "YOU'RE INVITED";
  ctx.font = '800 20px system-ui, -apple-system, Segoe UI, sans-serif';
  const eyebrowW = ctx.measureText(eyebrow).width + 40;
  ctx.fillStyle = 'rgba(26, 107, 255, 0.35)';
  drawRoundedRect(ctx, padX, cursorY, eyebrowW, 44, 22);
  ctx.fill();
  ctx.strokeStyle = 'rgba(214, 230, 255, 0.45)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#D6E6FF';
  ctx.fillText(eyebrow, padX + 20, cursorY + 23);

  cursorY += 72;

  // Event Name (up to 2 lines)
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 68px system-ui, -apple-system, Segoe UI, sans-serif';
  const titleLines = wrapCanvasText(ctx, event.name, W - padX * 2, 2);
  for (const line of titleLines) {
    ctx.fillText(line, padX, cursorY + 34);
    cursorY += 80;
  }

  // Hosted By
  cursorY += 10;
  ctx.fillStyle = '#93C5FD';
  ctx.font = '700 26px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(`Hosted by ${event.createdBy}`, padX, cursorY + 14);
  cursorY += 54;

  // Description (up to 2 lines)
  if (event.description) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
    ctx.font = '500 23px system-ui, -apple-system, Segoe UI, sans-serif';
    const descLines = wrapCanvasText(ctx, event.description, W - padX * 2, 2);
    for (const line of descLines) {
      ctx.fillText(line, padX, cursorY + 12);
      cursorY += 34;
    }
    cursorY += 18;
  }

  // 2x2 Detail Cards Grid
  const cardGap = 20;
  const cardW = (W - padX * 2 - cardGap) / 2;
  const cardH = 104;
  const details = [
    { label: 'DATE', value: formatDateShort(event.date) },
    { label: 'LOCATION', value: event.location },
    { label: 'CONTRIBUTION', value: `${formatKES(event.costPerPerson)} / person` },
    { label: 'CAPACITY', value: `${event.maxGuests} Guests Max` },
  ];

  details.forEach((item, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = padX + col * (cardW + cardGap);
    const y = cursorY + row * (cardH + cardGap);

    ctx.fillStyle = 'rgba(19, 34, 74, 0.85)';
    drawRoundedRect(ctx, x, y, cardW, cardH, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(43, 127, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#93C5FD';
    ctx.font = '800 17px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(item.label, x + 26, y + 34);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 26px system-ui, -apple-system, Segoe UI, sans-serif';
    const valLine = wrapCanvasText(ctx, item.value, cardW - 52, 1)[0] || item.value;
    ctx.fillText(valLine, x + 26, y + 72);
  });

  cursorY += cardH * 2 + cardGap + 24;

  // Optional M-PESA Strip
  if (event.mpesaNumber) {
    ctx.fillStyle = 'rgba(16, 185, 129, 0.16)';
    drawRoundedRect(ctx, padX, cursorY, W - padX * 2, 86, 22);
    ctx.fill();
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#6EE7B7';
    ctx.font = '800 17px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(getMpesaLabel(event.mpesaType).toUpperCase(), padX + 26, cursorY + 30);

    const mpesaDetails = [
      event.mpesaNumber,
      event.mpesaAccount ? `Acc: ${event.mpesaAccount}` : '',
      event.mpesaName ? `(${event.mpesaName})` : '',
    ]
      .filter(Boolean)
      .join('  •  ');

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 24px system-ui, -apple-system, Segoe UI, sans-serif';
    const mpesaLine =
      wrapCanvasText(ctx, mpesaDetails, W - padX * 2 - 52, 1)[0] || mpesaDetails;
    ctx.fillText(mpesaLine, padX + 26, cursorY + 62);
  }

  // Bottom Footer Bar
  const footerY = H - 118;
  ctx.strokeStyle = 'rgba(214, 230, 255, 0.2)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padX, footerY - 18);
  ctx.lineTo(W - padX, footerY - 18);
  ctx.stroke();

  ctx.fillStyle = '#D6E6FF';
  ctx.font = '700 20px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(`Join Code: ${event.inviteCode}`, padX, footerY + 14);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '600 18px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(
    `monte-gg.github.io/monte-events/?join=${event.inviteCode}`,
    padX,
    footerY + 46
  );

  ctx.textAlign = 'right';
  ctx.fillStyle = '#93C5FD';
  ctx.font = '800 20px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText('Plan it. Invite them. Monte it.', W - padX, footerY + 30);

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
  const [downloading, setDownloading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!event) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [event, onClose]);

  if (!event) return null;

  const inviteUrl = `https://monte-gg.github.io/monte-events/?join=${event.inviteCode}`;
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(
    `🎉 You're invited to ${event.name}!\n📅 ${formatDateShort(event.date)}\n📍 ${event.location}\n💸 ${formatKES(event.costPerPerson)} per person\n👤 Hosted by ${event.createdBy}\n\nJoin on MONTE EVENTS: ${inviteUrl}`
  )}`;

  const handleCopyInvite = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteUrl).catch(() => {});
    }
    setCopiedLink(true);
    onShowToast('Invite link copied!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadFlyer = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const blob = await generateFlyerPng(event);
      if (!blob) {
        onShowToast('Could not generate flyer image. Try again.', 'info');
        return;
      }
      const slug = event.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const filename = `${slug || 'monte-event'}-flyer.png`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      onShowToast('Event flyer downloaded as PNG!');
    } finally {
      setDownloading(false);
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
        className="fixed inset-0 z-[95] flex items-center justify-center bg-[#0A1430]/80 backdrop-blur-md p-3 sm:p-5 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 18 }}
          transition={{ duration: 0.28, ease: EASE_SKIPER }}
          className="relative w-full max-w-4xl rounded-3xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#0B1A3A] shadow-2xl overflow-hidden my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Top Header */}
          <div className="flex items-center justify-between gap-3 border-b border-[#D6E6FF] dark:border-[#2B7FFF]/20 px-5 py-3.5 bg-[#F0F6FF]/80 dark:bg-[#13224A]">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1A6BFF] text-white shadow-sm">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-[#0A1E5C] dark:text-white">
                  Your Event Flyer is Ready!
                </h2>
                <p className="text-[11px] text-[#0A1E5C]/65 dark:text-white/65">
                  Download as PNG or share directly with your squad on WhatsApp
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:block">
                <ThemeToggle />
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#0B1A3A] text-[#0A1E5C] dark:text-white hover:border-[#1A6BFF] transition"
                aria-label="Close flyer modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Body: Flyer Poster Preview + Action Controls */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 p-5 items-center max-h-[82vh] overflow-y-auto">
            {/* Branded Flyer Preview Card */}
            <div className="md:col-span-7 flex justify-center">
              <div
                className={`relative w-full max-w-[380px] aspect-[4/5] rounded-3xl overflow-hidden bg-gradient-to-br ${event.coverGradient} text-white shadow-2xl border border-white/20 flex flex-col justify-between p-5`}
              >
                {/* Cover Background Photo */}
                {event.coverImage && (
                  <img
                    src={event.coverImage}
                    alt={event.name}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
                {/* Scrim Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#0A1430]/70 via-[#0B2E8F]/35 to-[#0A1430]/95" />

                {/* Flyer Header */}
                <div className="relative z-10 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1A6BFF] border border-white/40 text-sm font-black shadow">
                      M
                    </span>
                    <div className="leading-tight">
                      <p className="text-[11px] font-black tracking-wider">MONTE EVENTS</p>
                      <p className="text-[9px] font-semibold text-[#D6E6FF] tracking-widest">
                        OFFICIAL FLYER
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#1A6BFF] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider shadow">
                    {event.customType || event.type}
                  </span>
                </div>

                {/* Flyer Lower Content */}
                <div className="relative z-10 space-y-3">
                  <div>
                    <span className="inline-block rounded-full bg-[#1A6BFF]/40 border border-white/25 px-2.5 py-0.5 text-[10px] font-extrabold tracking-widest uppercase text-[#D6E6FF]">
                      You&apos;re Invited
                    </span>
                    <h3 className="mt-1.5 text-2xl font-black leading-tight tracking-tight drop-shadow-sm line-clamp-2">
                      {event.name}
                    </h3>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-blue-200">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Hosted by {event.createdBy}
                    </p>
                  </div>

                  {/* Detail Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-[#13224A]/85 backdrop-blur-sm border border-[#2B7FFF]/35 p-2.5">
                      <p className="text-[9px] font-extrabold uppercase tracking-wider text-blue-200 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Date
                      </p>
                      <p className="mt-0.5 text-xs font-extrabold truncate">
                        {formatDateShort(event.date)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#13224A]/85 backdrop-blur-sm border border-[#2B7FFF]/35 p-2.5">
                      <p className="text-[9px] font-extrabold uppercase tracking-wider text-blue-200 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Location
                      </p>
                      <p className="mt-0.5 text-xs font-extrabold truncate">
                        {event.location}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#13224A]/85 backdrop-blur-sm border border-[#2B7FFF]/35 p-2.5">
                      <p className="text-[9px] font-extrabold uppercase tracking-wider text-blue-200 flex items-center gap-1">
                        <Wallet className="h-3 w-3" />
                        Contribution
                      </p>
                      <p className="mt-0.5 text-xs font-extrabold truncate">
                        {formatKES(event.costPerPerson)} / person
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#13224A]/85 backdrop-blur-sm border border-[#2B7FFF]/35 p-2.5">
                      <p className="text-[9px] font-extrabold uppercase tracking-wider text-blue-200 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Capacity
                      </p>
                      <p className="mt-0.5 text-xs font-extrabold truncate">
                        {event.maxGuests} Guests Max
                      </p>
                    </div>
                  </div>

                  {/* Optional M-PESA Strip */}
                  {event.mpesaNumber && (
                    <div className="rounded-xl bg-emerald-500/20 border border-emerald-400/45 px-3 py-2">
                      <p className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-300 flex items-center gap-1">
                        <Smartphone className="h-3 w-3" />
                        {getMpesaLabel(event.mpesaType)}
                      </p>
                      <p className="text-xs font-extrabold text-white truncate mt-0.5">
                        {event.mpesaNumber}
                        {event.mpesaAccount ? ` • Acc: ${event.mpesaAccount}` : ''}
                        {event.mpesaName ? ` (${event.mpesaName})` : ''}
                      </p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="pt-2 border-t border-white/20 flex items-center justify-between gap-2 text-[10px]">
                    <span className="font-mono font-bold text-[#D6E6FF] truncate">
                      Code: {event.inviteCode}
                    </span>
                    <span className="font-bold text-blue-200 shrink-0">
                      Plan it. Invite them. Monte it.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Actions & Share Details */}
            <div className="md:col-span-5 space-y-4">
              <div className="rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-[#F0F6FF]/70 dark:bg-[#13224A] p-4 space-y-2">
                <p className="text-xs font-extrabold uppercase tracking-wider text-[#1A6BFF] dark:text-[#2B7FFF]">
                  Ready to Share
                </p>
                <p className="text-sm font-bold text-[#0A1E5C] dark:text-white">
                  {event.name}
                </p>
                <p className="text-xs text-[#0A1E5C]/70 dark:text-white/70 leading-relaxed">
                  Save this high-res PNG flyer for WhatsApp Status, Instagram Stories, or group chats — and pair it with your instant join link.
                </p>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleDownloadFlyer}
                  disabled={downloading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1A6BFF] hover:bg-[#2B7FFF] disabled:opacity-60 px-5 py-3.5 text-sm font-extrabold text-white shadow-monte transition active:scale-95"
                >
                  {downloading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating PNG Flyer…
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Download Flyer (PNG)
                    </>
                  )}
                </button>

                <a
                  href={whatsappShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition active:scale-95"
                >
                  <Share2 className="h-4 w-4" />
                  Share Invite on WhatsApp
                </a>

                <button
                  type="button"
                  onClick={handleCopyInvite}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/35 bg-white dark:bg-[#13224A] hover:border-[#1A6BFF] px-5 py-3 text-sm font-extrabold text-[#0A1E5C] dark:text-white transition"
                >
                  {copiedLink ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-500" />
                      Invite Link Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 text-[#1A6BFF] dark:text-[#2B7FFF]" />
                      Copy Invite Link
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-2xl border border-transparent bg-[#F0F6FF] dark:bg-[#1A2D5E] hover:bg-[#D6E6FF]/70 dark:hover:bg-[#1A2D5E]/80 px-5 py-2.5 text-xs font-extrabold text-[#0A1E5C] dark:text-white transition"
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
