import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Film,
  Image as ImageIcon,
  MapPin,
  MessageCircle,
  Play,
  Plus,
  Search,
  Share2,
  UploadCloud,
  Users,
  Wallet,
} from 'lucide-react';
import {
  ChatMessage,
  EventRoomTab,
  Guest,
  MediaItem,
  MonteEvent,
  UserProfile,
} from '../types';
import { formatDateShort, formatKES } from '../data/sampleData';
import { uploadFileToStorage } from '../lib/monteService';
import { ThemeToggle } from './ThemeToggle';
import { EventChatRoom } from './EventChatRoom';

interface EventRoomPageProps {
  event: MonteEvent;
  activeTab: EventRoomTab;
  onTabChange: (tab: EventRoomTab) => void;
  messages: ChatMessage[];
  media: MediaItem[];
  user: UserProfile;
  typingUser?: string | null;
  onBack: () => void;
  onToggleGuestPaid: (eventId: string, guestId: string) => void;
  onAddGuestToEvent: (eventId: string, guest: Guest) => void;
  onUploadMedia: (eventId: string, items: MediaItem[]) => void;
  onSendMessage: (
    eventId: string,
    text: string,
    options?: {
      replyTo?: { id: string; senderName: string; text: string };
      media?: { type: 'photo' | 'video'; url: string; title?: string };
    }
  ) => void;
  onToggleReaction: (eventId: string, messageId: string, emoji: string) => void;
  onTogglePin: (eventId: string, messageId: string) => void;
  onSelectMedia: (item: MediaItem) => void;
  onShowToast: (msg: string) => void;
}

export const EventRoomPage: React.FC<EventRoomPageProps> = ({
  event,
  activeTab,
  onTabChange,
  messages,
  media,
  user,
  typingUser,
  onBack,
  onToggleGuestPaid,
  onAddGuestToEvent,
  onUploadMedia,
  onSendMessage,
  onToggleReaction,
  onTogglePin,
  onSelectMedia,
  onShowToast,
}) => {
  const [guestSearch, setGuestSearch] = useState('');
  const [guestFilter, setGuestFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [newGuestName, setNewGuestName] = useState('');
  const [newGuestPhone, setNewGuestPhone] = useState('');
  const [showAddGuestRow, setShowAddGuestRow] = useState(false);

  const mediaInputRef = useRef<HTMLInputElement>(null);

  const paidGuests = useMemo(
    () => event.guests.filter((g) => g.paid),
    [event.guests]
  );
  const paidPct = useMemo(
    () =>
      event.guests.length > 0
        ? Math.round((paidGuests.length / event.guests.length) * 100)
        : 0,
    [paidGuests.length, event.guests.length]
  );

  const collectedAmount = useMemo(
    () => paidGuests.reduce((sum, g) => sum + g.amount, 0),
    [paidGuests]
  );
  const remainingAmount = Math.max(0, event.totalBudget - collectedAmount);

  const filteredGuests = useMemo(() => {
    const q = guestSearch.trim().toLowerCase();
    return event.guests.filter((g) => {
      if (guestFilter === 'paid' && !g.paid) return false;
      if (guestFilter === 'pending' && g.paid) return false;
      if (!q) return true;
      return (
        g.name.toLowerCase().includes(q) || g.phone.toLowerCase().includes(q)
      );
    });
  }, [event.guests, guestFilter, guestSearch]);

  const handleCopyLink = () => {
    const url = `https://monteevents.app/join/${event.inviteCode}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    setCopiedInvite(true);
    onShowToast('Invite link copied!');
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const handleQuickAddGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuestName.trim()) return;
    const parts = newGuestName.trim().split(' ');
    const initials = (
      (parts[0]?.[0] || 'G') + (parts[1]?.[0] || parts[0]?.[1] || '')
    ).toUpperCase();
    onAddGuestToEvent(event.id, {
      id: `g-new-${Date.now()}`,
      name: newGuestName.trim(),
      phone: newGuestPhone.trim() || '+254 700 123 456',
      initials,
      avatarColor: '#1A6BFF',
      amount: event.costPerPerson,
      paid: false,
      online: false,
    });
    setNewGuestName('');
    setNewGuestPhone('');
    setShowAddGuestRow(false);
    onShowToast('Guest added to the room!');
  };

  const handleMediaFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    const newItems: MediaItem[] = await Promise.all(
      fileArray.map(async (file, idx) => {
        const isVideo = file.type.startsWith('video/');
        const publicUrl = await uploadFileToStorage(file, `events/${event.id}`);
        return {
          id: `up-${Date.now()}-${idx}`,
          eventId: event.id,
          eventName: event.name,
          type: isVideo ? 'video' : 'photo',
          url: publicUrl,
          thumbnail: isVideo
            ? 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80'
            : publicUrl,
          title: file.name.replace(/\.[^/.]+$/, ''),
          uploadedBy: user.name,
          uploadedAt: 'Just now',
          duration: isVideo ? '0:24' : undefined,
        };
      })
    );
    onUploadMedia(event.id, newItems);
    onShowToast(
      `Uploaded ${newItems.length} file${newItems.length > 1 ? 's' : ''} to Supabase Media Vault!`
    );
  };

  const handleAddSampleMedia = (type: 'photo' | 'video') => {
    const sampleUrl =
      type === 'video'
        ? 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=80'
        : 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=900&q=80';
    onUploadMedia(event.id, [
      {
        id: `sample-${Date.now()}`,
        eventId: event.id,
        eventName: event.name,
        type,
        url: sampleUrl,
        thumbnail: sampleUrl,
        title:
          type === 'video'
            ? `${event.name} Highlight Clip`
            : `${event.name} Squad Moment`,
        uploadedBy: user.name,
        uploadedAt: 'Just now',
        duration: type === 'video' ? '0:35' : undefined,
      },
    ]);
    onShowToast(`Added sample ${type} to ${event.name}!`);
  };

  const budgetEntries = Object.entries(event.budgetBreakdown) as [
    keyof MonteEvent['budgetBreakdown'],
    number,
  ][];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-6 animate-slide-up">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-full border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] px-4 py-2 text-xs sm:text-sm font-bold text-[#0A1E5C] dark:text-white hover:border-[#1A6BFF] transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Rooms
        </button>
        <div className="hidden sm:block">
          <ThemeToggle />
        </div>
      </div>

      {/* Event Cover Header */}
      <div
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${event.coverGradient} text-white shadow-monte`}
      >
        {event.coverImage && (
          <img
            src={event.coverImage}
            alt={event.name}
            className="absolute inset-0 h-full w-full object-cover opacity-50"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A1430]/90 via-[#0A1430]/45 to-[#0B2E8F]/30" />

        <div className="relative z-10 p-6 sm:p-8 flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div className="space-y-2.5 max-w-2xl">
            <span className="inline-flex items-center rounded-full bg-[#1A6BFF] px-3 py-1 text-xs font-extrabold">
              {event.customType || event.type}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {event.name}
            </h1>
            <p className="text-xs sm:text-sm text-white/85 leading-relaxed">
              {event.description}
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs sm:text-sm font-semibold text-white/95">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-[#D6E6FF]" />
                {formatDateShort(event.date)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-[#D6E6FF]" />
                {event.location}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4 text-[#D6E6FF]" />
                {paidGuests.length}/{event.guests.length} Paid
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyLink}
            className="shrink-0 inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-[#0B2E8F] hover:bg-[#F0F6FF] px-5 py-3 text-xs sm:text-sm font-extrabold shadow-lg transition active:scale-95"
          >
            {copiedInvite ? (
              <>
                <Check className="h-4 w-4 text-emerald-600" />
                Copied!
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4 text-[#1A6BFF]" />
                Share Invite Link
                <Copy className="h-3.5 w-3.5 opacity-70" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Room Tabs: Guests | Budget | Media | Chat */}
      <div className="grid grid-cols-4 gap-2 rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-white dark:bg-[#13224A] p-1.5">
        {(
          [
            { id: 'guests', label: 'Guests', icon: Users, count: event.guests.length },
            { id: 'budget', label: 'Budget', icon: Wallet },
            { id: 'media', label: 'Media', icon: ImageIcon, count: media.length },
            {
              id: 'chat',
              label: 'Chat',
              icon: MessageCircle,
              badge: event.unreadCount,
            },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onTabChange(t.id)}
              className={`relative flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl py-2.5 px-2 text-xs sm:text-sm font-extrabold transition ${
                active
                  ? 'bg-[#1A6BFF] text-white shadow-sm'
                  : 'text-[#0A1E5C]/70 dark:text-white/70 hover:bg-[#F0F6FF] dark:hover:bg-[#1A2D5E]'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{t.label}</span>
              {'badge' in t && t.badge && t.badge > 0 ? (
                <span
                  className={`flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-extrabold ${
                    active ? 'bg-white text-[#1A6BFF]' : 'bg-[#1A6BFF] text-white'
                  }`}
                >
                  {t.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* TAB 1: GUESTS */}
      {activeTab === 'guests' && (
        <div className="space-y-4">
          {/* Progress Bar Card */}
          <div className="rounded-3xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-white dark:bg-[#13224A] p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-extrabold text-[#0A1E5C] dark:text-white">
                  Guest Payment Confirmation
                </h2>
                <p className="text-xs text-[#0A1E5C]/65 dark:text-white/65">
                  Tick &ldquo;Confirm Payment&rdquo; as friends send M-Pesa — they move straight to Paid &amp; &ldquo;In the Event&rdquo;.
                </p>
              </div>
              <span className="rounded-full bg-[#F0F6FF] dark:bg-[#0B1A3A] px-3.5 py-1.5 text-xs font-extrabold text-[#1A6BFF] dark:text-[#2B7FFF]">
                {paidGuests.length} of {event.guests.length} Paid ({paidPct}%)
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-[#D6E6FF] dark:bg-[#0A1430] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#1A6BFF] to-[#2B7FFF] transition-all duration-500"
                style={{ width: `${paidPct}%` }}
              />
            </div>
          </div>

          {/* Search + Filter + Add Guest */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1A6BFF]" />
              <input
                type="text"
                value={guestSearch}
                onChange={(e) => setGuestSearch(e.target.value)}
                placeholder="Search guest by name or phone..."
                className="w-full rounded-full border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] pl-10 pr-4 py-2 text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {(['all', 'paid', 'pending'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setGuestFilter(f)}
                  className={`rounded-full px-4 py-1.5 text-xs font-extrabold capitalize transition ${
                    guestFilter === f
                      ? 'bg-[#1A6BFF] text-white shadow-sm'
                      : 'bg-white dark:bg-[#13224A] border border-[#D6E6FF] dark:border-[#2B7FFF]/30 text-[#0A1E5C]/75 dark:text-white/75 hover:border-[#1A6BFF]'
                  }`}
                >
                  {f}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowAddGuestRow((s) => !s)}
                className="inline-flex items-center gap-1 rounded-full bg-[#0B2E8F] hover:bg-[#1A6BFF] px-4 py-1.5 text-xs font-extrabold text-white transition"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Guest
              </button>
            </div>
          </div>

          {showAddGuestRow && (
            <form
              onSubmit={handleQuickAddGuest}
              className="rounded-2xl border border-[#1A6BFF]/40 bg-white dark:bg-[#13224A] p-4 flex flex-col sm:flex-row gap-2.5 animate-slide-up"
            >
              <input
                type="text"
                value={newGuestName}
                onChange={(e) => setNewGuestName(e.target.value)}
                placeholder="Guest Full Name"
                required
                className="flex-1 rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] px-3.5 py-2 text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
              />
              <input
                type="tel"
                value={newGuestPhone}
                onChange={(e) => setNewGuestPhone(e.target.value)}
                placeholder="Phone (+254 7XX...)"
                className="flex-1 rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] px-3.5 py-2 text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-xl bg-[#1A6BFF] hover:bg-[#2B7FFF] px-5 py-2 text-xs sm:text-sm font-extrabold text-white"
              >
                Save Guest
              </button>
            </form>
          )}

          {/* Guest List */}
          <div className="space-y-2.5">
            {filteredGuests.map((guest) => (
              <div
                key={guest.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-4 transition ${
                  guest.paid
                    ? 'border-emerald-500/35 bg-white dark:bg-[#13224A]'
                    : 'border-[#D6E6FF] dark:border-[#2B7FFF]/20 bg-white dark:bg-[#13224A]'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white shadow-sm"
                    style={{ backgroundColor: guest.avatarColor }}
                  >
                    {guest.initials}
                    {guest.online && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-[#13224A]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-extrabold text-sm text-[#0A1E5C] dark:text-white truncate">
                        {guest.name}
                      </p>
                      {guest.paid ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          In the Event
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#F0F6FF] dark:bg-[#0B1A3A] px-2.5 py-0.5 text-[11px] font-bold text-[#0B2E8F] dark:text-[#D6E6FF]">
                          <Clock className="h-3 w-3" />
                          Pending
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#0A1E5C]/60 dark:text-white/60 mt-0.5">
                      {guest.phone} • <span className="font-bold text-[#1A6BFF] dark:text-[#2B7FFF]">{formatKES(guest.amount)}</span>
                    </p>
                  </div>
                </div>

                {/* Confirm Payment Checkbox / Tick Button */}
                <label className="inline-flex items-center gap-2.5 cursor-pointer select-none rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/70 dark:bg-[#0B1A3A] px-3.5 py-2 hover:border-[#1A6BFF] transition self-start sm:self-center">
                  <input
                    type="checkbox"
                    checked={guest.paid}
                    onChange={() => onToggleGuestPaid(event.id, guest.id)}
                    className="h-4 w-4 rounded accent-emerald-600 cursor-pointer"
                  />
                  <span className="text-xs font-extrabold text-[#0A1E5C] dark:text-white">
                    {guest.paid ? 'Payment Confirmed' : 'Confirm Payment'}
                  </span>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: BUDGET */}
      {activeTab === 'budget' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {[
              { label: 'Total Budget', value: formatKES(event.totalBudget), accent: false },
              { label: 'Collected', value: formatKES(collectedAmount), accent: true },
              { label: 'Remaining', value: formatKES(remainingAmount), accent: false },
              { label: 'Per-Person Cost', value: formatKES(event.costPerPerson), accent: false },
            ].map((card) => (
              <div
                key={card.label}
                className={`rounded-2xl border p-4 sm:p-5 ${
                  card.accent
                    ? 'border-[#1A6BFF] bg-gradient-to-br from-[#0B2E8F] to-[#1A6BFF] text-white shadow-monte'
                    : 'border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-white dark:bg-[#13224A]'
                }`}
              >
                <p
                  className={`text-xs font-bold ${
                    card.accent ? 'text-white/80' : 'text-[#0A1E5C]/60 dark:text-white/60'
                  }`}
                >
                  {card.label}
                </p>
                <p className="mt-2 text-lg sm:text-2xl font-extrabold tracking-tight">
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-white dark:bg-[#13224A] p-5 sm:p-6 space-y-5">
            <div>
              <h3 className="text-base font-extrabold text-[#0A1E5C] dark:text-white">
                Budget Breakdown
              </h3>
              <p className="text-xs text-[#0A1E5C]/60 dark:text-white/60">
                Planned allocation across Transport, Food, Venue, DJ, and Misc.
              </p>
            </div>

            <div className="space-y-4">
              {budgetEntries.map(([category, amount]) => {
                const pct =
                  event.totalBudget > 0
                    ? Math.round((amount / event.totalBudget) * 100)
                    : 0;
                return (
                  <div key={category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
                      <span className="text-[#0A1E5C] dark:text-white">{category}</span>
                      <span className="text-[#1A6BFF] dark:text-[#2B7FFF]">
                        {formatKES(amount)}{' '}
                        <span className="text-[#0A1E5C]/50 dark:text-white/50 font-semibold">
                          ({pct}%)
                        </span>
                      </span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-[#F0F6FF] dark:bg-[#0A1430] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#0B2E8F] via-[#1A6BFF] to-[#2B7FFF] transition-all duration-500"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MEDIA */}
      {activeTab === 'media' && (
        <div className="space-y-5">
          {/* Upload Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleMediaFiles(e.dataTransfer.files);
            }}
            className="rounded-3xl border-2 border-dashed border-[#1A6BFF]/45 dark:border-[#2B7FFF]/45 bg-white dark:bg-[#13224A] p-7 text-center space-y-3"
          >
            <input
              ref={mediaInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={(e) => handleMediaFiles(e.target.files)}
              className="hidden"
            />
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F0F6FF] dark:bg-[#0B1A3A] text-[#1A6BFF] dark:text-[#2B7FFF]">
              <UploadCloud className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#0A1E5C] dark:text-white">
                Drop photos &amp; videos from this event here
              </h3>
              <p className="text-xs text-[#0A1E5C]/65 dark:text-white/65 mt-1">
                All event photos &amp; videos are saved directly to this room and your Monte Media Vault.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => mediaInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1A6BFF] hover:bg-[#2B7FFF] px-5 py-2.5 text-xs sm:text-sm font-extrabold text-white shadow-sm transition"
              >
                <UploadCloud className="h-4 w-4" />
                Choose Files
              </button>
              <button
                type="button"
                onClick={() => handleAddSampleMedia('photo')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/35 bg-[#F0F6FF] dark:bg-[#0B1A3A] px-4 py-2.5 text-xs font-bold text-[#0A1E5C] dark:text-white hover:border-[#1A6BFF]"
              >
                <ImageIcon className="h-3.5 w-3.5 text-[#1A6BFF]" />
                + Sample Photo
              </button>
              <button
                type="button"
                onClick={() => handleAddSampleMedia('video')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/35 bg-[#F0F6FF] dark:bg-[#0B1A3A] px-4 py-2.5 text-xs font-bold text-[#0A1E5C] dark:text-white hover:border-[#1A6BFF]"
              >
                <Film className="h-3.5 w-3.5 text-[#1A6BFF]" />
                + Sample Video
              </button>
            </div>
          </div>

          {/* Media Grid */}
          {media.length === 0 ? (
            <div className="rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/20 bg-white dark:bg-[#13224A] p-8 text-center text-sm text-[#0A1E5C]/60 dark:text-white/60">
              No media uploaded to this room yet. Drop your first photo or video above!
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {media.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectMedia(item)}
                  className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-[#0B2E8F] text-left shadow-sm"
                >
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A1430]/85 via-transparent to-transparent" />
                  {item.type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1A6BFF]/90 text-white shadow-lg ring-4 ring-white/30">
                        <Play className="h-5 w-5 fill-white ml-0.5" />
                      </span>
                    </div>
                  )}
                  <div className="absolute bottom-2.5 left-3 right-3">
                    <p className="truncate text-xs font-bold text-white">{item.title}</p>
                    <p className="truncate text-[10px] text-white/75">
                      {item.uploadedBy} • {item.uploadedAt}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CHAT */}
      {activeTab === 'chat' && (
        <EventChatRoom
          event={event}
          messages={messages}
          media={media}
          user={user}
          typingUser={typingUser}
          onSendMessage={onSendMessage}
          onToggleReaction={onToggleReaction}
          onTogglePin={onTogglePin}
          onAddGuestToEvent={onAddGuestToEvent}
          onSelectMedia={onSelectMedia}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
