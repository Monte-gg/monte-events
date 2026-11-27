import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  Copy,
  Link2,
  MapPin,
  Search,
  Smartphone,
  Sparkles,
  UserPlus,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { EVENT_TYPES, formatKES } from '../data/sampleData';
import { AnimatePresence, motion } from 'motion/react';
import { EventType, Guest, MonteEvent, MpesaType } from '../types';
import { ThemeToggle } from './ThemeToggle';
import { EASE_SKIPER, SPRING_POP } from './MotionPrimitives';

interface CreateRoomPageProps {
  creatorName: string;
  creatorEmail?: string;
  creatorId?: string | null;
  onCreateEvent: (newEvent: MonteEvent) => void;
  onCancel: () => void;
  onShowToast: (msg: string) => void;
}

const COVER_PRESETS: Record<EventType, { image: string; gradient: string }> = {
  Roadtrip: {
    image:
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=900&q=80',
    gradient: 'from-[#0B2E8F] via-[#1A6BFF] to-[#2B7FFF]',
  },
  Birthday: {
    image:
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=80',
    gradient: 'from-[#1A6BFF] via-[#0B2E8F] to-[#0A1E5C]',
  },
  'Beach Trip': {
    image:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80',
    gradient: 'from-[#2B7FFF] via-[#1A6BFF] to-[#0B2E8F]',
  },
  Hiking: {
    image:
      'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=900&q=80',
    gradient: 'from-[#0B2E8F] via-[#1A6BFF] to-[#13224A]',
  },
  Wedding: {
    image:
      'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80',
    gradient: 'from-[#1A6BFF] via-[#2B7FFF] to-[#0B2E8F]',
  },
  Graduation: {
    image:
      'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=900&q=80',
    gradient: 'from-[#0B2E8F] via-[#1A6BFF] to-[#2B7FFF]',
  },
  'House Party': {
    image:
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80',
    gradient: 'from-[#0A1E5C] via-[#1A6BFF] to-[#2B7FFF]',
  },
  Concert: {
    image:
      'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=900&q=80',
    gradient: 'from-[#0B2E8F] via-[#2B7FFF] to-[#0A1E5C]',
  },
  Custom: {
    image:
      'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=900&q=80',
    gradient: 'from-[#1A6BFF] via-[#0B2E8F] to-[#2B7FFF]',
  },
};

export const CreateRoomPage: React.FC<CreateRoomPageProps> = ({
  creatorName,
  creatorEmail,
  creatorId,
  onCreateEvent,
  onCancel,
  onShowToast,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [direction, setDirection] = useState<1 | -1>(1);

  const goToStep = (next: 1 | 2 | 3) => {
    setDirection(next >= step ? 1 : -1);
    setStep(next);
  };

  // Step 1
  const [eventType, setEventType] = useState<EventType>('Roadtrip');
  const [customType, setCustomType] = useState('');

  // Step 2
  const [name, setName] = useState('');
  const [date, setDate] = useState('2026-12-28');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  // Step 3
  const [totalBudget, setTotalBudget] = useState<number>(60000);
  const [maxGuests, setMaxGuests] = useState<number>(10);
  const [manualGuests, setManualGuests] = useState<
    { id: string; name: string; phone: string; email: string }[]
  >([]);
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [mpesaType, setMpesaType] = useState<MpesaType>('phone');
  const [mpesaNumber, setMpesaNumber] = useState('');
  const [mpesaAccount, setMpesaAccount] = useState('');
  const [mpesaName, setMpesaName] = useState(creatorName);
  const [copiedLink, setCopiedLink] = useState(false);

  const inviteCode = useMemo(
    () => `MONTE-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
    []
  );
  const inviteUrl = `https://monte-gg.github.io/monte-events/?join=${inviteCode}`;

  const costPerPerson = useMemo(() => {
    if (!maxGuests || maxGuests < 1) return 0;
    return Math.round(totalBudget / maxGuests);
  }, [totalBudget, maxGuests]);

  const handleAddManualGuest = () => {
    if (!manualName.trim()) return;
    setManualGuests((prev) => [
      ...prev,
      {
        id: `mg-${Date.now()}`,
        name: manualName.trim(),
        phone: manualPhone.trim() || '+254 700 000 000',
        email: manualEmail.trim(),
      },
    ]);
    setManualName('');
    setManualPhone('');
    setManualEmail('');
  };

  const handleCopyInvite = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteUrl).catch(() => {});
    }
    setCopiedLink(true);
    onShowToast('Invite link copied!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSubmit = () => {
    const finalName =
      name.trim() || `${eventType === 'Custom' && customType.trim() ? customType.trim() : eventType} Getaway`;
    const finalLocation = location.trim() || 'Nairobi, KE';
    const preset = COVER_PRESETS[eventType];

    const guests: Guest[] = manualGuests.map((m, idx) => {
      const parts = m.name.split(' ');
      const initials = (
        (parts[0]?.[0] || 'G') + (parts[1]?.[0] || parts[0]?.[1] || '')
      ).toUpperCase();
      return {
        id: `g-m-${Date.now()}-${idx}`,
        name: m.name,
        phone: m.phone,
        email: m.email,
        initials,
        avatarColor: '#1A6BFF',
        amount: costPerPerson,
        paid: false,
        online: false,
      };
    });

    const newEvent: MonteEvent = {
      id: `evt-${Date.now()}`,
      name: finalName,
      type: eventType,
      customType: eventType === 'Custom' ? customType.trim() || 'Custom Event' : undefined,
      date,
      location: finalLocation,
      description:
        description.trim() ||
        'Planned on Monte Events! Confirm your payment in the Guests tab and hop into the chat.',
      coverImage: preset.image,
      coverGradient: preset.gradient,
      totalBudget,
      maxGuests: Math.max(maxGuests, guests.length),
      costPerPerson,
      inviteCode,
      unreadCount: 0,
      createdBy: creatorName,
      hostId: creatorId || undefined,
      hostEmail: creatorEmail || undefined,
      mpesaType: mpesaNumber.trim() ? mpesaType : undefined,
      mpesaNumber: mpesaNumber.trim() || undefined,
      mpesaAccount:
        mpesaType === 'paybill' && mpesaAccount.trim()
          ? mpesaAccount.trim()
          : undefined,
      mpesaName: mpesaName.trim() || undefined,
      expenses: [],
      budgetBreakdown: {
        Transport: Math.round(totalBudget * 0.3),
        Food: Math.round(totalBudget * 0.25),
        Venue: Math.round(totalBudget * 0.25),
        DJ: Math.round(totalBudget * 0.12),
        Misc: Math.round(totalBudget * 0.08),
      },
      guests,
    };

    onCreateEvent(newEvent);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] text-[#0A1E5C] dark:text-white hover:border-[#1A6BFF] transition"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#0A1E5C] dark:text-white">
              Create New Event Room
            </h1>
            <p className="text-xs sm:text-sm text-[#0A1E5C]/65 dark:text-white/65">
              Step {step} of 3 —{' '}
              {step === 1
                ? 'Choose Event Type'
                : step === 2
                ? 'Event Details'
                : 'Budget, Guests & Invites'}
            </p>
          </div>
        </div>
        <div className="hidden sm:block">
          <ThemeToggle />
        </div>
      </div>

      {/* Stepper Indicator */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { num: 1 as const, label: 'Event Type' },
          { num: 2 as const, label: 'Details' },
          { num: 3 as const, label: 'Budget & Guests' },
        ].map((s) => {
          const active = step === s.num;
          const completed = step > s.num;
          return (
            <button
              key={s.num}
              type="button"
              onClick={() => goToStep(s.num)}
              className={`flex items-center gap-2.5 rounded-2xl border p-3 text-left transition ${
                active
                  ? 'border-[#1A6BFF] bg-[#1A6BFF] text-white shadow-monte'
                  : completed
                  ? 'border-[#1A6BFF]/40 bg-white dark:bg-[#13224A] text-[#0A1E5C] dark:text-white'
                  : 'border-[#D6E6FF] dark:border-[#2B7FFF]/20 bg-white/70 dark:bg-[#13224A]/60 text-[#0A1E5C]/60 dark:text-white/60'
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                  active
                    ? 'bg-white text-[#1A6BFF]'
                    : completed
                    ? 'bg-[#1A6BFF] text-white'
                    : 'bg-[#F0F6FF] dark:bg-[#0B1A3A] text-[#0A1E5C]/60 dark:text-white/60'
                }`}
              >
                {completed ? <Check className="h-4 w-4" /> : s.num}
              </span>
              <span className="text-xs sm:text-sm font-bold truncate">{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Card with directional horizontal slide transitions */}
      <div className="rounded-3xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-white dark:bg-[#13224A] p-5 sm:p-7 shadow-sm overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          {/* STEP 1: EVENT TYPE */}
          {step === 1 && (
            <motion.div
              key="step-1"
              custom={direction}
              initial={{ opacity: 0, x: direction * 36 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -36 }}
              transition={{ duration: 0.24, ease: EASE_SKIPER }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-lg font-extrabold text-[#0A1E5C] dark:text-white">
                  What are we planning?
                </h2>
                <p className="text-xs sm:text-sm text-[#0A1E5C]/65 dark:text-white/65 mt-0.5">
                  Pick a vibe for your room — we’ll tailor the cover and budget template.
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {EVENT_TYPES.map((t) => {
                  const selected = eventType === t;
                  return (
                    <motion.button
                      key={t}
                      type="button"
                      onClick={() => setEventType(t)}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.93 }}
                      animate={{ scale: selected ? [1, 1.06, 1] : 1 }}
                      transition={SPRING_POP}
                      className={`rounded-2xl px-4 py-3 text-sm font-bold border transition-colors ${
                        selected
                          ? 'border-[#1A6BFF] bg-[#1A6BFF] text-white shadow-monte'
                          : 'border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/70 dark:bg-[#0B1A3A] text-[#0A1E5C] dark:text-white hover:border-[#1A6BFF]'
                      }`}
                    >
                      {t}
                    </motion.button>
                  );
                })}
              </div>

              {eventType === 'Custom' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#0A1E5C]/70 dark:text-white/70 mb-1.5">
                    Custom Event Type
                  </label>
                  <input
                    type="text"
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    placeholder="e.g. Game Night, Safari Camp, Yacht Party"
                    className="w-full rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] px-4 py-2.5 text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
                  />
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => goToStep(2)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#1A6BFF] hover:bg-[#2B7FFF] px-6 py-3 text-sm font-extrabold text-white shadow-monte transition active:scale-95"
                >
                  Next: Event Details
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: DETAILS */}
          {step === 2 && (
            <motion.div
              key="step-2"
              custom={direction}
              initial={{ opacity: 0, x: direction * 36 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -36 }}
              transition={{ duration: 0.24, ease: EASE_SKIPER }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-lg font-extrabold text-[#0A1E5C] dark:text-white">
                  Tell the squad about it
                </h2>
                <p className="text-xs sm:text-sm text-[#0A1E5C]/65 dark:text-white/65 mt-0.5">
                  Give your room a catchy name, date, meeting point, and quick itinerary.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#0A1E5C]/70 dark:text-white/70 mb-1.5">
                    Event Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Nanyuki Weekend Roadtrip"
                    className="w-full rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] px-4 py-3 text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#0A1E5C]/70 dark:text-white/70 mb-1.5">
                    Event Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1A6BFF] dark:text-[#2B7FFF]" />
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] pl-10 pr-4 py-3 text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#0A1E5C]/70 dark:text-white/70 mb-1.5">
                    Location
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1A6BFF] dark:text-[#2B7FFF]" />
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Westlands / Nanyuki / Diani"
                      className="w-full rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] pl-10 pr-4 py-3 text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#0A1E5C]/70 dark:text-white/70 mb-1.5">
                    Description &amp; Plan
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Share departure times, dress code, activities, or what’s included..."
                    className="w-full rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] px-4 py-3 text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => goToStep(1)}
                  className="inline-flex items-center gap-1.5 rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 px-5 py-3 text-sm font-bold text-[#0A1E5C] dark:text-white hover:bg-[#F0F6FF] dark:hover:bg-[#1A2D5E]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => goToStep(3)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#1A6BFF] hover:bg-[#2B7FFF] px-6 py-3 text-sm font-extrabold text-white shadow-monte transition active:scale-95"
                >
                  Next: Budget &amp; Guests
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: BUDGET & GUESTS + INVITE FRIENDS */}
          {step === 3 && (
            <motion.div
              key="step-3"
              custom={direction}
              initial={{ opacity: 0, x: direction * 36 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -36 }}
              transition={{ duration: 0.24, ease: EASE_SKIPER }}
              className="space-y-6"
            >
            {/* Budget & Max Guests */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#0A1E5C]/70 dark:text-white/70 mb-1.5">
                    Total Budget (KES)
                  </label>
                  <div className="relative">
                    <Wallet className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1A6BFF] dark:text-[#2B7FFF]" />
                    <input
                      type="number"
                      min={1000}
                      step={1000}
                      value={totalBudget}
                      onChange={(e) => setTotalBudget(Math.max(0, Number(e.target.value)))}
                      className="w-full rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] pl-10 pr-4 py-3 text-sm font-bold text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#0A1E5C]/70 dark:text-white/70">
                      Max Guests
                    </label>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#F0F6FF] dark:bg-[#0B1A3A] px-3 py-0.5 text-xs font-extrabold text-[#1A6BFF] dark:text-[#2B7FFF]">
                      <Users className="h-3.5 w-3.5" />
                      {maxGuests} guests
                    </span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={50}
                    value={maxGuests}
                    onChange={(e) => setMaxGuests(Number(e.target.value))}
                    className="w-full accent-[#1A6BFF] cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-[#0A1E5C]/50 dark:text-white/50">
                    <span>2</span>
                    <span>25</span>
                    <span>50</span>
                  </div>
                </div>
              </div>

              {/* Auto-calculated Cost Per Person Card */}
              <div className="rounded-2xl bg-gradient-to-br from-[#0B2E8F] to-[#1A6BFF] p-5 text-white flex flex-col justify-center">
                <span className="text-xs font-semibold text-white/80">
                  Auto-Calculated Cost / Person
                </span>
                <p className="mt-1.5 text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {formatKES(costPerPerson)}
                </p>
                <span className="mt-2 text-[11px] text-white/80">
                  Split across {maxGuests} guests
                </span>
              </div>
            </div>

            {/* Add Guest Manually */}
            <div className="rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-extrabold text-[#0A1E5C] dark:text-white">
                <UserPlus className="h-4 w-4 text-[#1A6BFF] dark:text-[#2B7FFF]" />
                Add Guests by Name, Phone, or Email
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Guest Name"
                  className="rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] px-3 py-2 text-xs sm:text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
                />
                <input
                  type="tel"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  placeholder="Phone (+254...)"
                  className="rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] px-3 py-2 text-xs sm:text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
                />
                <input
                  type="email"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  placeholder="Email (optional)"
                  className="rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] px-3 py-2 text-xs sm:text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddManualGuest}
                  className="rounded-xl bg-[#1A6BFF] hover:bg-[#2B7FFF] px-4 py-2 text-xs sm:text-sm font-bold text-white transition"
                >
                  + Add Guest
                </button>
              </div>

              {manualGuests.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {manualGuests.map((mg) => (
                    <span
                      key={mg.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-[#13224A] border border-[#D6E6FF] dark:border-[#2B7FFF]/30 px-3 py-1 text-xs font-bold text-[#0A1E5C] dark:text-white"
                    >
                      {mg.name}
                      <button
                        type="button"
                        onClick={() =>
                          setManualGuests((prev) => prev.filter((x) => x.id !== mg.id))
                        }
                        className="text-[#0A1E5C]/50 hover:text-red-500 dark:text-white/50"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Optional Host M-PESA Payment Details */}
            <div className="rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-sm font-extrabold text-[#0A1E5C] dark:text-white">
                  <Smartphone className="h-4 w-4 text-emerald-500" />
                  Host M-PESA Details (Optional)
                </div>
                <span className="text-[11px] font-semibold text-[#0A1E5C]/60 dark:text-white/60">
                  Guests can copy &amp; submit confirmation codes
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { id: 'phone', label: 'Send Money' },
                    { id: 'till', label: 'Till Number' },
                    { id: 'paybill', label: 'Paybill' },
                    { id: 'pochi', label: 'Pochi la Biashara' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setMpesaType(opt.id)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-extrabold border transition ${
                      mpesaType === opt.id
                        ? 'border-[#1A6BFF] bg-[#1A6BFF] text-white'
                        : 'border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] text-[#0A1E5C] dark:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  value={mpesaNumber}
                  onChange={(e) => setMpesaNumber(e.target.value)}
                  placeholder={
                    mpesaType === 'paybill'
                      ? 'Paybill Business No.'
                      : mpesaType === 'till'
                      ? 'Buy Goods Till No.'
                      : 'Phone (07XX XXX XXX)'
                  }
                  className="rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] px-3 py-2 text-xs sm:text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
                />
                {mpesaType === 'paybill' && (
                  <input
                    type="text"
                    value={mpesaAccount}
                    onChange={(e) => setMpesaAccount(e.target.value)}
                    placeholder="Account Name / Number"
                    className="rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] px-3 py-2 text-xs sm:text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
                  />
                )}
                <input
                  type="text"
                  value={mpesaName}
                  onChange={(e) => setMpesaName(e.target.value)}
                  placeholder="Recipient / Account Name"
                  className="rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] px-3 py-2 text-xs sm:text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
                />
              </div>
            </div>

            {/* Invite Link Box */}
            <div className="rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/80 dark:bg-[#0B1A3A] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1A6BFF] text-white">
                  <Link2 className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#0A1E5C] dark:text-white">
                    Shareable Room Invite Link
                  </p>
                  <p className="truncate text-xs text-[#1A6BFF] dark:text-[#2B7FFF] font-mono">
                    {inviteUrl}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyInvite}
                className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl bg-white dark:bg-[#13224A] border border-[#D6E6FF] dark:border-[#2B7FFF]/40 px-4 py-2 text-xs font-extrabold text-[#0A1E5C] dark:text-white hover:border-[#1A6BFF] transition"
              >
                {copiedLink ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-[#1A6BFF] dark:text-[#2B7FFF]" />
                    Copy Link
                  </>
                )}
              </button>
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => goToStep(2)}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 px-5 py-3 text-sm font-bold text-[#0A1E5C] dark:text-white hover:bg-[#F0F6FF] dark:hover:bg-[#1A2D5E]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#1A6BFF] hover:bg-[#2B7FFF] px-7 py-3.5 text-sm font-extrabold text-white shadow-monte transition active:scale-95"
              >
                <Sparkles className="h-4 w-4" />
                Create Room
              </button>
            </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
