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
  Receipt,
  Search,
  Share2,
  ShieldCheck,
  Smartphone,
  Trash2,
  UploadCloud,
  UserMinus,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  ChatMessage,
  EventRoomTab,
  ExpenseCategory,
  Guest,
  MediaItem,
  MonteEvent,
  UserProfile,
} from '../types';
import { formatDateShort, formatKES } from '../data/sampleData';
import { motion } from 'motion/react';
import { uploadFileToStorage } from '../lib/monteService';
import { ThemeToggle } from './ThemeToggle';
import { EventChatRoom } from './EventChatRoom';
import {
  SPRING_POP,
  SPRING_SNAPPY,
  ScrollProgressBar,
} from './MotionPrimitives';

interface EventRoomPageProps {
  event: MonteEvent;
  activeTab: EventRoomTab;
  onTabChange: (tab: EventRoomTab) => void;
  messages: ChatMessage[];
  media: MediaItem[];
  user: UserProfile;
  isHost: boolean;
  typingUser?: string | null;
  onBack: () => void;
  onDeleteEvent: (eventId: string) => void;
  onJoinRoom?: (eventId: string) => void;
  onToggleGuestPaid: (eventId: string, guestId: string) => void;
  onSubmitGuestMpesaCode: (
    eventId: string,
    guestId: string,
    mpesaCode: string
  ) => void;
  onAddGuestToEvent: (eventId: string, guest: Guest) => void;
  onRemoveGuestFromEvent: (eventId: string, guestId: string) => void;
  onAddExpense: (
    eventId: string,
    payload: {
      title: string;
      category: ExpenseCategory;
      amount: number;
      paidBy: string;
    }
  ) => void;
  onDeleteExpense: (eventId: string, expenseId: string) => void;
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
  isHost,
  typingUser,
  onBack,
  onDeleteEvent,
  onJoinRoom,
  onToggleGuestPaid,
  onSubmitGuestMpesaCode,
  onAddGuestToEvent,
  onRemoveGuestFromEvent,
  onAddExpense,
  onDeleteExpense,
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
  const [copiedMpesa, setCopiedMpesa] = useState(false);
  const [newGuestName, setNewGuestName] = useState('');
  const [newGuestPhone, setNewGuestPhone] = useState('');
  const [showAddGuestRow, setShowAddGuestRow] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [justConfirmedId, setJustConfirmedId] = useState<string | null>(null);
  const [mpesaModalGuest, setMpesaModalGuest] = useState<Guest | null>(null);
  const [mpesaCodeInput, setMpesaCodeInput] = useState('');

  // Expense form state
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expTitle, setExpTitle] = useState('');
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('Transport');
  const [expAmount, setExpAmount] = useState('');
  const [expPaidBy, setExpPaidBy] = useState(user.name);

  const handleTogglePaidWithFlash = (guest: Guest) => {
    if (!guest.paid) {
      setJustConfirmedId(guest.id);
      setTimeout(() => {
        setJustConfirmedId((curr) => (curr === guest.id ? null : curr));
      }, 650);
    }
    onToggleGuestPaid(event.id, guest.id);
  };

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
  const expenses = event.expenses || [];
  const totalSpent = useMemo(
    () => expenses.reduce((sum, ex) => sum + ex.amount, 0),
    [expenses]
  );
  const remainingBalance = collectedAmount - totalSpent;
  const spentPct =
    collectedAmount > 0
      ? Math.min(100, Math.round((totalSpent / collectedAmount) * 100))
      : totalSpent > 0
      ? 100
      : 0;

  const inviteUrl = `https://monte-gg.github.io/monte-events/?join=${event.inviteCode}`;
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(
    `You're invited to ${event.name}!\n📅 ${formatDateShort(event.date)}\n📍 ${event.location}\n💸 ${formatKES(event.costPerPerson)} per person\n\nJoin on MONTE EVENTS: ${inviteUrl}`
  )}`;

  const handleCopyMpesa = () => {
    if (!event.mpesaNumber) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(event.mpesaNumber).catch(() => {});
    }
    setCopiedMpesa(true);
    onShowToast('M-PESA number copied!');
    setTimeout(() => setCopiedMpesa(false), 2000);
  };

  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(expAmount);
    if (!expTitle.trim() || !amt || amt <= 0) return;
    onAddExpense(event.id, {
      title: expTitle.trim(),
      category: expCategory,
      amount: amt,
      paidBy: expPaidBy.trim() || user.name,
    });
    setExpTitle('');
    setExpAmount('');
    setShowExpenseForm(false);
  };

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
    const url = `https://monte-gg.github.io/monte-events/?join=${event.inviteCode}`;
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
    if (user.memberSince === 'Preview Mode') {
      onUploadMedia(event.id, []);
      return;
    }
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
        <div className="flex items-center gap-2">
          {isHost && (
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-red-400/40 bg-red-500/10 hover:bg-red-500/20 px-3.5 py-2 text-xs font-extrabold text-red-600 dark:text-red-400 transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Room
            </button>
          )}
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Delete Room Confirmation Modal */}
      {deleteConfirmOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0A1430]/75 backdrop-blur-sm p-4"
          onClick={() => setDeleteConfirmOpen(false)}
        >
          <div
            className="animate-slide-up w-full max-w-md rounded-3xl border border-red-400/40 bg-white dark:bg-[#13224A] p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/15 text-red-600 dark:text-red-400">
                  <Trash2 className="h-5 w-5" />
                </span>
                <h2 className="text-base font-extrabold text-[#0A1E5C] dark:text-white">
                  Delete Room?
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="rounded-full p-1.5 text-[#0A1E5C]/60 dark:text-white/60 hover:bg-[#F0F6FF] dark:hover:bg-[#1A2D5E]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs sm:text-sm text-[#0A1E5C]/75 dark:text-white/75 leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <span className="font-extrabold text-[#0A1E5C] dark:text-white">
                {event.name}
              </span>
              ? All guests, payment records, and chat messages in this room will be removed.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 px-4 py-2.5 text-xs sm:text-sm font-bold text-[#0A1E5C] dark:text-white hover:bg-[#F0F6FF] dark:hover:bg-[#1A2D5E]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  onDeleteEvent(event.id);
                }}
                className="rounded-xl bg-red-600 hover:bg-red-700 px-5 py-2.5 text-xs sm:text-sm font-extrabold text-white shadow-sm transition"
              >
                Delete Room
              </button>
            </div>
          </div>
        </div>
      )}

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
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-[#1A6BFF] px-3 py-1 text-xs font-extrabold">
                {event.customType || event.type}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 backdrop-blur-sm px-3 py-1 text-xs font-bold text-white">
                <ShieldCheck className="h-3.5 w-3.5 text-[#D6E6FF]" />
                {isHost ? 'You are the Host' : `Host: ${event.createdBy}`}
              </span>
            </div>
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

          <div className="shrink-0 flex flex-wrap items-center gap-2">
            {onJoinRoom &&
              !event.guests.some(
                (g) =>
                  (user.email && g.email === user.email) ||
                  g.name.toLowerCase() === user.name.toLowerCase()
              ) && (
                <button
                  type="button"
                  onClick={() => onJoinRoom(event.id)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1A6BFF] hover:bg-[#2B7FFF] border border-white/25 px-5 py-3 text-xs sm:text-sm font-extrabold text-white shadow-lg transition active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                  Join Room
                </button>
              )}
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-[#0B2E8F] hover:bg-[#F0F6FF] px-4 py-2.5 text-xs sm:text-sm font-extrabold shadow-lg transition active:scale-95"
            >
              {copiedInvite ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-[#1A6BFF]" />
                  Copy Link
                </>
              )}
            </button>
            <a
              href={whatsappShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 px-4 py-2.5 text-xs sm:text-sm font-extrabold text-white shadow-lg transition active:scale-95"
            >
              <Share2 className="h-4 w-4" />
              Share on WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* Room Tabs: Guests | Budget | Media | Chat with gliding active pill */}
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
              className={`relative flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl py-2.5 px-2 text-xs sm:text-sm font-extrabold transition-colors ${
                active
                  ? 'text-white'
                  : 'text-[#0A1E5C]/70 dark:text-white/70 hover:bg-[#F0F6FF] dark:hover:bg-[#1A2D5E]'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="event-room-tab-pill"
                  transition={SPRING_SNAPPY}
                  className="absolute inset-0 rounded-xl bg-[#1A6BFF] shadow-sm"
                />
              )}
              <span className="relative z-10 inline-flex items-center gap-1.5 sm:gap-2">
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
              </span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: GUESTS */}
      {activeTab === 'guests' && (
        <div className="space-y-4">
          {/* Pay via M-PESA Card */}
          {event.mpesaNumber && (
            <div className="rounded-3xl border border-emerald-500/35 bg-gradient-to-r from-emerald-500/10 via-white to-[#F0F6FF] dark:from-emerald-500/15 dark:via-[#13224A] dark:to-[#0B1A3A] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-sm">
                  <Smartphone className="h-5 w-5" />
                </span>
                <div>
                  <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    Pay via M-PESA ·{' '}
                    {event.mpesaType === 'till'
                      ? 'Buy Goods Till'
                      : event.mpesaType === 'paybill'
                      ? 'Paybill'
                      : event.mpesaType === 'pochi'
                      ? 'Pochi la Biashara'
                      : 'Send Money'}
                  </span>
                  <p className="mt-1 text-lg sm:text-xl font-extrabold font-mono text-[#0A1E5C] dark:text-white tracking-wide">
                    {event.mpesaNumber}
                  </p>
                  <p className="text-xs text-[#0A1E5C]/70 dark:text-white/70">
                    {event.mpesaAccount ? `Account: ${event.mpesaAccount} • ` : ''}
                    {event.mpesaName ? `Name: ${event.mpesaName} • ` : ''}
                    Amount: <span className="font-extrabold text-[#1A6BFF] dark:text-[#2B7FFF]">{formatKES(event.costPerPerson)}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyMpesa}
                className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition active:scale-95"
              >
                {copiedMpesa ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy Number
                  </>
                )}
              </button>
            </div>
          )}

          {/* Progress Bar Card */}
          <div className="rounded-3xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-white dark:bg-[#13224A] p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-extrabold text-[#0A1E5C] dark:text-white">
                  Guest Payment Confirmation
                </h2>
                <p className="text-xs text-[#0A1E5C]/65 dark:text-white/65">
                  {isHost
                    ? 'As room host, tick “Confirm Payment” as friends send M-Pesa — they move straight to Paid & “In the Event”.'
                    : `Only the room host (${event.createdBy}) can confirm payments or manage the guest list.`}
                </p>
              </div>
              <span className="rounded-full bg-[#F0F6FF] dark:bg-[#0B1A3A] px-3.5 py-1.5 text-xs font-extrabold text-[#1A6BFF] dark:text-[#2B7FFF]">
                {paidGuests.length} of {event.guests.length} Paid ({paidPct}%)
              </span>
            </div>
            <ScrollProgressBar percent={paidPct} heightClass="h-3" />
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
              {isHost && (
                <button
                  type="button"
                  onClick={() => setShowAddGuestRow((s) => !s)}
                  className="inline-flex items-center gap-1 rounded-full bg-[#0B2E8F] hover:bg-[#1A6BFF] px-4 py-1.5 text-xs font-extrabold text-white transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Guest
                </button>
              )}
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

          {/* Guest List with Animated Checkmark Draw-In & Green Row Flash */}
          <div className="space-y-2.5">
            {filteredGuests.map((guest) => {
              const isFlashing = justConfirmedId === guest.id;
              return (
                <motion.div
                  key={guest.id}
                  layout
                  animate={
                    isFlashing
                      ? {
                          backgroundColor: [
                            'rgba(16, 185, 129, 0.22)',
                            'rgba(16, 185, 129, 0.0)',
                          ],
                        }
                      : undefined
                  }
                  transition={{ duration: 0.6 }}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-4 transition-colors ${
                    guest.paid
                      ? 'border-emerald-500/40 bg-white dark:bg-[#13224A]'
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
                          <motion.span
                            initial={{ scale: 0.85, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={SPRING_POP}
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            In the Event
                          </motion.span>
                        ) : guest.paymentStatus === 'submitted' && guest.mpesaCode ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/35 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-700 dark:text-amber-300">
                            <Clock className="h-3 w-3" />
                            Verifying ({guest.mpesaCode})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#F0F6FF] dark:bg-[#0B1A3A] px-2.5 py-0.5 text-[11px] font-bold text-[#0B2E8F] dark:text-[#D6E6FF]">
                            <Clock className="h-3 w-3" />
                            Pending
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#0A1E5C]/60 dark:text-white/60 mt-0.5">
                        {guest.phone} •{' '}
                        <span className="font-bold text-[#1A6BFF] dark:text-[#2B7FFF]">
                          {formatKES(guest.amount)}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Host-only Confirm Payment Toggle & Remove Guest */}
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    {isHost ? (
                      <>
                        <motion.button
                          type="button"
                          role="checkbox"
                          aria-checked={guest.paid}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => handleTogglePaidWithFlash(guest)}
                          className={`inline-flex items-center gap-2.5 cursor-pointer select-none rounded-xl border px-3.5 py-2 transition-colors ${
                            guest.paid
                              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                              : 'border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/70 dark:bg-[#0B1A3A] text-[#0A1E5C] dark:text-white hover:border-[#1A6BFF]'
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                              guest.paid
                                ? 'border-emerald-500 bg-emerald-500 text-white'
                                : 'border-[#1A6BFF]/40 bg-white dark:bg-[#13224A]'
                            }`}
                          >
                            <svg
                              viewBox="0 0 16 16"
                              fill="none"
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            >
                              <motion.path
                                d="M3.2 8.4 L6.6 11.6 L12.8 4.6"
                                stroke="currentColor"
                                strokeWidth="2.4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                initial={false}
                                animate={{
                                  pathLength: guest.paid ? 1 : 0,
                                  opacity: guest.paid ? 1 : 0,
                                }}
                                transition={{ duration: 0.25, ease: 'easeOut' }}
                              />
                            </svg>
                          </span>
                          <span className="text-xs font-extrabold">
                            {guest.paid
                              ? 'Payment Confirmed'
                              : guest.paymentStatus === 'submitted'
                              ? 'Approve Payment'
                              : 'Confirm Payment'}
                          </span>
                        </motion.button>
                        <button
                          type="button"
                          onClick={() => onRemoveGuestFromEvent(event.id, guest.id)}
                          title={`Remove ${guest.name} from room`}
                          aria-label={`Remove ${guest.name}`}
                          className="rounded-xl border border-red-400/35 bg-red-500/10 hover:bg-red-500/20 p-2 text-red-600 dark:text-red-400 transition"
                        >
                          <UserMinus className="h-4 w-4" />
                        </button>
                      </>
                    ) : !guest.paid ? (
                      <button
                        type="button"
                        onClick={() => {
                          setMpesaCodeInput(guest.mpesaCode || '');
                          setMpesaModalGuest(guest);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#1A6BFF] hover:bg-[#2B7FFF] px-3.5 py-2 text-xs font-extrabold text-white shadow-sm transition active:scale-95"
                      >
                        <Smartphone className="h-3.5 w-3.5" />
                        {guest.paymentStatus === 'submitted'
                          ? 'Update M-PESA Code'
                          : "I've Paid"}
                      </button>
                    ) : (
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 px-2">
                        Confirmed by Host
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: BUDGET & TRANSPARENT EXPENSE LOG */}
      {activeTab === 'budget' && (
        <div className="space-y-5">
          {/* 3 Summary KPI Cards: Total Collected, Total Spent, Remaining Balance */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="rounded-2xl border border-[#1A6BFF] bg-gradient-to-br from-[#0B2E8F] to-[#1A6BFF] p-5 text-white shadow-monte">
              <p className="text-xs font-bold text-white/80">Total Collected</p>
              <p className="mt-2 text-2xl font-extrabold tracking-tight">
                {formatKES(collectedAmount)}
              </p>
              <p className="mt-1 text-[11px] text-white/80">
                From {paidGuests.length} confirmed guest{paidGuests.length === 1 ? '' : 's'} · {formatKES(event.costPerPerson)}/person
              </p>
            </div>

            <div className="rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-white dark:bg-[#13224A] p-5">
              <p className="text-xs font-bold text-[#0A1E5C]/60 dark:text-white/60">
                Total Spent
              </p>
              <p className="mt-2 text-2xl font-extrabold tracking-tight text-[#0A1E5C] dark:text-white">
                {formatKES(totalSpent)}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-[#1A6BFF] dark:text-[#2B7FFF]">
                Across {expenses.length} logged expense{expenses.length === 1 ? '' : 's'}
              </p>
            </div>

            <div className="rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-white dark:bg-[#13224A] p-5">
              <p className="text-xs font-bold text-[#0A1E5C]/60 dark:text-white/60">
                Remaining Balance
              </p>
              <p
                className={`mt-2 text-2xl font-extrabold tracking-tight ${
                  remainingBalance >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {formatKES(remainingBalance)}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-[#0A1E5C]/60 dark:text-white/60">
                Collected minus Spent
              </p>
            </div>
          </div>

          {/* Visual Spent vs Collected Progress Bar */}
          <div className="rounded-3xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-white dark:bg-[#13224A] p-5 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-[#0A1E5C] dark:text-white">
                Funds Utilized ({spentPct}% of collected)
              </span>
              <span className="text-[#1A6BFF] dark:text-[#2B7FFF]">
                {formatKES(totalSpent)} / {formatKES(collectedAmount)}
              </span>
            </div>
            <ScrollProgressBar percent={spentPct} heightClass="h-3" />
          </div>

          {/* Transparent Expense Log */}
          <div className="rounded-3xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-white dark:bg-[#13224A] p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-[#0A1E5C] dark:text-white inline-flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-[#1A6BFF]" />
                  Itemized Expense Log
                </h3>
                <p className="text-xs text-[#0A1E5C]/60 dark:text-white/60">
                  Every shilling spent is visible to the squad for full transparency.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowExpenseForm((s) => !s)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1A6BFF] hover:bg-[#2B7FFF] px-4 py-2 text-xs font-extrabold text-white shadow-sm transition active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Expense
              </button>
            </div>

            {showExpenseForm && (
              <form
                onSubmit={handleAddExpenseSubmit}
                className="rounded-2xl border border-[#1A6BFF]/35 bg-[#F0F6FF]/70 dark:bg-[#0B1A3A] p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 animate-slide-up"
              >
                <input
                  type="text"
                  required
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  placeholder="Expense title (e.g. Van fuel)"
                  className="lg:col-span-2 rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] px-3 py-2 text-xs sm:text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
                />
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value as ExpenseCategory)}
                  className="rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] px-3 py-2 text-xs sm:text-sm font-bold text-[#0A1E5C] dark:text-white focus:outline-none"
                >
                  <option value="Transport">Transport</option>
                  <option value="Accommodation">Accommodation</option>
                  <option value="Food & Drinks">Food &amp; Drinks</option>
                  <option value="Decor">Decor</option>
                  <option value="Other">Other</option>
                </select>
                <input
                  type="number"
                  required
                  min={1}
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  placeholder="Amount (KES)"
                  className="rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] px-3 py-2 text-xs sm:text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={expPaidBy}
                    onChange={(e) => setExpPaidBy(e.target.value)}
                    placeholder="Paid by"
                    className="min-w-0 flex-1 rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] px-3 py-2 text-xs sm:text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="shrink-0 rounded-xl bg-[#1A6BFF] hover:bg-[#2B7FFF] px-4 py-2 text-xs font-extrabold text-white"
                  >
                    Save
                  </button>
                </div>
              </form>
            )}

            {expenses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#D6E6FF] dark:border-[#2B7FFF]/25 p-6 text-center text-xs text-[#0A1E5C]/60 dark:text-white/60">
                No expenses logged yet. Click <strong>+ Add Expense</strong> to track transport, accommodation, food, and decor spend.
              </div>
            ) : (
              <div className="divide-y divide-[#D6E6FF]/70 dark:divide-[#2B7FFF]/15">
                {expenses.map((ex) => (
                  <div
                    key={ex.id}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-extrabold text-[#0A1E5C] dark:text-white truncate">
                          {ex.title}
                        </p>
                        <span className="rounded-full bg-[#F0F6FF] dark:bg-[#0B1A3A] border border-[#D6E6FF] dark:border-[#2B7FFF]/25 px-2.5 py-0.5 text-[10px] font-bold text-[#1A6BFF] dark:text-[#2B7FFF]">
                          {ex.category}
                        </span>
                      </div>
                      <p className="text-xs text-[#0A1E5C]/60 dark:text-white/60 mt-0.5">
                        Paid by {ex.paidBy}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-sm font-extrabold text-[#0A1E5C] dark:text-white">
                        {formatKES(ex.amount)}
                      </span>
                      {isHost && (
                        <button
                          type="button"
                          onClick={() => onDeleteExpense(event.id, ex.id)}
                          aria-label={`Delete ${ex.title}`}
                          className="rounded-lg p-1.5 text-red-500 hover:bg-red-500/10 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-white dark:bg-[#13224A] p-5 sm:p-6 space-y-5">
            <div>
              <h3 className="text-base font-extrabold text-[#0A1E5C] dark:text-white">
                Planned Budget Allocation ({formatKES(event.totalBudget)})
              </h3>
              <p className="text-xs text-[#0A1E5C]/60 dark:text-white/60">
                Target split across Transport, Food, Venue, DJ, and Misc.
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
                Choose Photos or Videos
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
          isHost={isHost}
          typingUser={typingUser}
          onSendMessage={onSendMessage}
          onToggleReaction={onToggleReaction}
          onTogglePin={onTogglePin}
          onAddGuestToEvent={onAddGuestToEvent}
          onSelectMedia={onSelectMedia}
          onShowToast={onShowToast}
        />
      )}

      {/* Guest "I've Paid" M-PESA Code Modal */}
      {mpesaModalGuest && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0A1430]/75 backdrop-blur-sm p-4"
          onClick={() => setMpesaModalGuest(null)}
        >
          <div
            className="animate-slide-up w-full max-w-md rounded-3xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <Smartphone className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-[#0A1E5C] dark:text-white">
                    Submit M-PESA Code
                  </h3>
                  <p className="text-xs text-[#0A1E5C]/60 dark:text-white/60">
                    For {mpesaModalGuest.name} · {formatKES(mpesaModalGuest.amount)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMpesaModalGuest(null)}
                className="rounded-full p-1.5 text-[#0A1E5C]/60 dark:text-white/60 hover:bg-[#F0F6FF] dark:hover:bg-[#1A2D5E]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-[#0A1E5C]/75 dark:text-white/75 leading-relaxed">
              Paste the M-PESA confirmation code from your SMS (e.g.{' '}
              <span className="font-mono font-bold">SLK84X92M1</span>). The room host will be notified to approve your payment.
            </p>

            <input
              type="text"
              value={mpesaCodeInput}
              onChange={(e) => setMpesaCodeInput(e.target.value.toUpperCase())}
              placeholder="e.g. SLK84X92M1"
              className="w-full rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] px-4 py-3 text-sm font-mono font-extrabold tracking-wider text-[#0A1E5C] dark:text-white uppercase focus:border-[#1A6BFF] focus:outline-none"
            />

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setMpesaModalGuest(null)}
                className="rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 px-4 py-2 text-xs font-bold text-[#0A1E5C] dark:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={mpesaCodeInput.trim().length < 4}
                onClick={() => {
                  onSubmitGuestMpesaCode(
                    event.id,
                    mpesaModalGuest.id,
                    mpesaCodeInput.trim().toUpperCase()
                  );
                  setMpesaModalGuest(null);
                  setMpesaCodeInput('');
                }}
                className="rounded-xl bg-[#1A6BFF] hover:bg-[#2B7FFF] disabled:opacity-45 px-5 py-2 text-xs font-extrabold text-white shadow-sm transition"
              >
                Submit for Verification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
