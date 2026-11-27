import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CalendarPlus,
  Check,
  Copy,
  Crosshair,
  ExternalLink,
  Image as ImageIcon,
  Link2,
  Loader2,
  MapPin,
  Mic2,
  Plus,
  Receipt,
  Smartphone,
  Sparkles,
  Tag,
  Trash2,
  UploadCloud,
  UserPlus,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { EVENT_TYPES, formatKES } from '../data/sampleData';
import { AnimatePresence, motion } from 'motion/react';
import {
  EventType,
  ExpenseCategory,
  ExpenseItem,
  Guest,
  MainGuest,
  MonteEvent,
  MpesaType,
  SubEvent,
} from '../types';
import { uploadFileToStorage } from '../lib/monteService';
import { ThemeToggle } from './ThemeToggle';
import { EASE_SKIPER, SPRING_POP } from './MotionPrimitives';

interface CreateRoomPageProps {
  creatorName: string;
  creatorEmail?: string;
  creatorId?: string | null;
  isGuestMode?: boolean;
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

const ACTIVITY_SUGGESTIONS: Record<EventType, string[]> = {
  Roadtrip: ['Boat Ride', 'Campfire', 'Sunset Views', 'Nyama Choma', 'Cycling', 'Game Drive'],
  Birthday: ['Afrohouse DJ', 'Cake Cutting', 'Cocktails', 'Photo Booth', 'Midnight Toast', 'Dinner'],
  'Beach Trip': ['Dhow Cruise', 'Snorkeling', 'Beach Bonfire', 'Jet Ski', 'Pool Party', 'Seafood BBQ'],
  Hiking: ['Summit Trek', 'Sunrise Views', 'Picnic Lunch', 'Waterfall Dip', 'Group Photos', 'Stretch Session'],
  Wedding: ['Ceremony', 'Cocktail Hour', 'Reception Dinner', 'Live Band', 'First Dance', 'Afterparty'],
  Graduation: ['Photo Shoot', 'Luncheon', 'Speeches', 'Toast', 'Live DJ', 'Family Dinner'],
  'House Party': ['Game Night', 'Karaoke', 'Live DJ', 'BBQ Grill', 'Cocktails', 'Movie Screening'],
  Concert: ['Live Performance', 'VIP Lounge', 'DJ Sets', 'Food Trucks', 'Meet & Greet', 'Afterparty'],
  Custom: ['Networking', 'Keynote Talk', 'Live Music', 'Dinner', 'Awards', 'Afterparty'],
};

const GUEST_PRESETS = [10, 50, 100, 500, 1000, 10000];

export const CreateRoomPage: React.FC<CreateRoomPageProps> = ({
  creatorName,
  creatorEmail,
  creatorId,
  isGuestMode = false,
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

  // Step 2: Core Details + Pin Location + Cover + Activities + Main Guests + Multi-Events
  const [name, setName] = useState('');
  const [date, setDate] = useState('2026-12-28');
  const [location, setLocation] = useState('');
  const [locationPinUrl, setLocationPinUrl] = useState('');
  const [pinningGps, setPinningGps] = useState(false);
  const [description, setDescription] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [isDraggingCover, setIsDraggingCover] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Activities (up to 6 tags)
  const [activities, setActivities] = useState<string[]>([]);
  const [activityInput, setActivityInput] = useState('');

  // Main Guests / Headliners (Artists, Leaders, Speakers, VIPs)
  const [mainGuests, setMainGuests] = useState<MainGuest[]>([]);
  const [mainGuestName, setMainGuestName] = useState('');
  const [mainGuestRole, setMainGuestRole] = useState('Headliner Artist');

  // Additional Sub-Events in Same Room
  const [subEvents, setSubEvents] = useState<SubEvent[]>([]);
  const [subTitle, setSubTitle] = useState('');
  const [subDate, setSubDate] = useState('2026-12-29');
  const [subTime, setSubTime] = useState('');
  const [subLocation, setSubLocation] = useState('');

  // Step 3: Custom Budget, Custom Expenses, Unlimited Guests, Manual Guests, M-PESA
  const [totalBudgetStr, setTotalBudgetStr] = useState<string>('60000');
  const [maxGuestsStr, setMaxGuestsStr] = useState<string>('10');
  const totalBudget = Number(totalBudgetStr) || 0;
  const maxGuests = Math.max(1, Number(maxGuestsStr) || 1);
  const [customExpenses, setCustomExpenses] = useState<
    { id: string; title: string; category: ExpenseCategory; amount: number }[]
  >([]);
  const [expTitle, setExpTitle] = useState('');
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('Transport');
  const [expAmount, setExpAmount] = useState('');

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

  const customExpensesSum = useMemo(
    () => customExpenses.reduce((sum, item) => sum + item.amount, 0),
    [customExpenses]
  );

  const costPerPerson = useMemo(() => {
    if (!maxGuests || maxGuests < 1) return 0;
    return Math.round(totalBudget / maxGuests);
  }, [totalBudget, maxGuests]);

  const handleSelectCoverFile = (file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onShowToast('Please choose an image file (JPG, PNG, or WebP).');
      return;
    }
    if (coverPreviewUrl) {
      URL.revokeObjectURL(coverPreviewUrl);
    }
    setCoverFile(file);
    setCoverPreviewUrl(URL.createObjectURL(file));
  };

  const handleClearCover = () => {
    if (coverPreviewUrl) {
      URL.revokeObjectURL(coverPreviewUrl);
    }
    setCoverFile(null);
    setCoverPreviewUrl(null);
    if (coverInputRef.current) {
      coverInputRef.current.value = '';
    }
  };

  const handlePinCurrentGps = () => {
    if (!navigator.geolocation) {
      onShowToast('GPS is not supported on this browser — paste a Google Maps link instead.');
      return;
    }
    setPinningGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        setLocationPinUrl(url);
        if (!location.trim()) {
          setLocation(`${lat}, ${lng}`);
        }
        setPinningGps(false);
        onShowToast('GPS location pinned for guests!');
      },
      () => {
        setPinningGps(false);
        onShowToast('Could not read GPS — paste a Google Maps link or search location.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleAddActivity = (rawTag?: string) => {
    const tag = (rawTag ?? activityInput).trim();
    if (!tag) return;
    if (activities.length >= 6) {
      onShowToast('You can add up to 6 activities for the flyer.');
      return;
    }
    if (activities.some((a) => a.toLowerCase() === tag.toLowerCase())) {
      setActivityInput('');
      return;
    }
    setActivities((prev) => [...prev, tag]);
    if (rawTag === undefined) setActivityInput('');
  };

  const handleAddMainGuest = () => {
    if (!mainGuestName.trim()) return;
    setMainGuests((prev) => [
      ...prev,
      {
        id: `mguest-${Date.now()}`,
        name: mainGuestName.trim(),
        role: mainGuestRole.trim() || 'Featured Guest',
      },
    ]);
    setMainGuestName('');
  };

  const handleAddSubEvent = () => {
    if (!subTitle.trim()) return;
    setSubEvents((prev) => [
      ...prev,
      {
        id: `sub-${Date.now()}`,
        title: subTitle.trim(),
        date: subDate || date,
        time: subTime.trim() || undefined,
        location: subLocation.trim() || location.trim() || undefined,
      },
    ]);
    setSubTitle('');
    setSubTime('');
    setSubLocation('');
  };

  const handleAddCustomExpense = () => {
    const amt = Number(expAmount);
    if (!expTitle.trim() || !amt || amt <= 0) return;
    const nextList = [
      ...customExpenses,
      {
        id: `cexp-${Date.now()}`,
        title: expTitle.trim(),
        category: expCategory,
        amount: amt,
      },
    ];
    setCustomExpenses(nextList);
    const nextSum = nextList.reduce((s, x) => s + x.amount, 0);
    setTotalBudgetStr(String(nextSum));
    setExpTitle('');
    setExpAmount('');
  };

  const handleRemoveCustomExpense = (id: string) => {
    const nextList = customExpenses.filter((x) => x.id !== id);
    setCustomExpenses(nextList);
    if (nextList.length > 0) {
      setTotalBudgetStr(String(nextList.reduce((s, x) => s + x.amount, 0)));
    }
  };

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

  const resolvedMapPreviewUrl = useMemo(() => {
    if (locationPinUrl.trim()) return locationPinUrl.trim();
    if (location.trim()) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.trim())}`;
    }
    return '';
  }, [location, locationPinUrl]);

  const handleSubmit = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const finalName =
        name.trim() ||
        `${eventType === 'Custom' && customType.trim() ? customType.trim() : eventType} Getaway`;
      const finalLocation = location.trim() || 'Nairobi, KE';
      const preset = COVER_PRESETS[eventType];
      const eventId = `evt-${Date.now()}`;

      let resolvedCoverImage = preset.image;
      if (coverFile) {
        resolvedCoverImage = isGuestMode
          ? coverPreviewUrl || preset.image
          : await uploadFileToStorage(coverFile, 'covers');
      }

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

      const initialExpenses: ExpenseItem[] = customExpenses.map((ex, idx) => ({
        id: `exp-init-${Date.now()}-${idx}`,
        roomId: eventId,
        title: ex.title,
        category: ex.category,
        amount: ex.amount,
        paidBy: creatorName,
      }));

      // Build breakdown from user's own budget items (or 0s if they didn't split yet)
      const breakdown = {
        Transport: 0,
        Food: 0,
        Venue: 0,
        DJ: 0,
        Misc: 0,
      };
      for (const ex of customExpenses) {
        if (ex.category === 'Transport') breakdown.Transport += ex.amount;
        else if (ex.category === 'Food & Drinks') breakdown.Food += ex.amount;
        else if (ex.category === 'Accommodation' || ex.category === 'Decor') breakdown.Venue += ex.amount;
        else breakdown.Misc += ex.amount;
      }

      const newEvent: MonteEvent = {
        id: eventId,
        name: finalName,
        type: eventType,
        customType: eventType === 'Custom' ? customType.trim() || 'Custom Event' : undefined,
        date,
        location: finalLocation,
        locationPinUrl:
          locationPinUrl.trim() ||
          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(finalLocation)}`,
        description:
          description.trim() ||
          'Planned on Monte Events! Confirm your payment in the Guests tab and hop into the chat.',
        coverImage: resolvedCoverImage,
        coverGradient: preset.gradient,
        totalBudget,
        maxGuests: Math.max(1, maxGuests, guests.length),
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
        activities,
        mainGuests,
        subEvents,
        expenses: initialExpenses,
        budgetBreakdown: breakdown,
        guests,
      };

      onCreateEvent(newEvent);
    } finally {
      setIsCreating(false);
    }
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
                ? 'Details, Location Pin, Activities & Lineup'
                : 'Your Budget, Guest Capacity & Invites'}
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
          { num: 2 as const, label: 'Details & Lineup' },
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
                  Pick a vibe for your room — you can also bundle multiple events in one room in the next step.
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
                    placeholder="e.g. Tech Summit, Safari Camp, Festival, Crusade"
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

          {/* STEP 2: DETAILS, PIN LOCATION, ACTIVITIES, MAIN GUESTS, MULTI-EVENTS & COVER */}
          {step === 2 && (
            <motion.div
              key="step-2"
              custom={direction}
              initial={{ opacity: 0, x: direction * 36 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -36 }}
              transition={{ duration: 0.24, ease: EASE_SKIPER }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-lg font-extrabold text-[#0A1E5C] dark:text-white">
                  Event Details, Location Pin &amp; Flyer Highlights
                </h2>
                <p className="text-xs sm:text-sm text-[#0A1E5C]/65 dark:text-white/65 mt-0.5">
                  Everything you add here appears in your room and on your auto-generated PNG Event Flyer.
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
                    placeholder="e.g. Nanyuki Weekend Roadtrip / Nairobi Summer Fest"
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
                    Location Name
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1A6BFF] dark:text-[#2B7FFF]" />
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Uhuru Gardens / Lake Naivasha / Diani"
                      className="w-full rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] pl-10 pr-4 py-3 text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Pin Location for Guests (Directions) */}
                <div className="sm:col-span-2 rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] p-4 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#0A1E5C] dark:text-white">
                      <MapPin className="h-3.5 w-3.5 text-[#1A6BFF]" />
                      Pin Exact Location for Guest Directions
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handlePinCurrentGps}
                        disabled={pinningGps}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#1A6BFF] hover:bg-[#2B7FFF] px-3 py-1.5 text-[11px] font-extrabold text-white transition"
                      >
                        {pinningGps ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Crosshair className="h-3.5 w-3.5" />
                        )}
                        Pin My GPS
                      </button>
                      {resolvedMapPreviewUrl && (
                        <a
                          href={resolvedMapPreviewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/35 bg-white dark:bg-[#13224A] px-3 py-1.5 text-[11px] font-bold text-[#1A6BFF] dark:text-[#2B7FFF] hover:border-[#1A6BFF] transition"
                        >
                          Preview Map
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  <input
                    type="url"
                    value={locationPinUrl}
                    onChange={(e) => setLocationPinUrl(e.target.value)}
                    placeholder="Paste Google Maps link (optional — auto-generates directions from Location Name if blank)"
                    className="w-full rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] px-3.5 py-2.5 text-xs sm:text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#0A1E5C]/70 dark:text-white/70 mb-1.5">
                    Description &amp; Plan
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Share departure times, dress code, schedule, or what’s included..."
                    className="w-full rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] px-4 py-3 text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none resize-none"
                  />
                </div>

                {/* Activities Tag Input (Up to 6) */}
                <div className="sm:col-span-2 rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#0A1E5C] dark:text-white">
                      <Tag className="h-3.5 w-3.5 text-[#1A6BFF]" />
                      Activities (Up to 6 — Featured on Flyer)
                    </span>
                    <span className="text-[11px] font-bold text-[#1A6BFF] dark:text-[#2B7FFF]">
                      {activities.length}/6 selected
                    </span>
                  </div>

                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="text"
                      value={activityInput}
                      onChange={(e) => setActivityInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddActivity();
                        }
                      }}
                      placeholder="Add activity (e.g. Boat Ride)"
                      className="flex-1 min-w-0 w-full rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] px-3 py-2 text-xs sm:text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddActivity()}
                      className="shrink-0 whitespace-nowrap rounded-xl bg-[#1A6BFF] hover:bg-[#2B7FFF] px-3.5 py-2.5 text-xs font-extrabold text-white transition"
                    >
                      + Add
                    </button>
                  </div>

                  {/* Quick clickable suggestions */}
                  <div className="flex flex-wrap gap-1.5">
                    {ACTIVITY_SUGGESTIONS[eventType].map((sug) => {
                      const already = activities.some(
                        (a) => a.toLowerCase() === sug.toLowerCase()
                      );
                      return (
                        <button
                          key={sug}
                          type="button"
                          onClick={() =>
                            already
                              ? setActivities((prev) =>
                                  prev.filter((a) => a.toLowerCase() !== sug.toLowerCase())
                                )
                              : handleAddActivity(sug)
                          }
                          className={`rounded-full px-3 py-1 text-[11px] font-bold border transition ${
                            already
                              ? 'border-[#1A6BFF] bg-[#1A6BFF] text-white'
                              : 'border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] text-[#0A1E5C]/80 dark:text-white/80 hover:border-[#1A6BFF]'
                          }`}
                        >
                          {already ? '✓ ' : '+ '}
                          {sug}
                        </button>
                      );
                    })}
                  </div>

                  {activities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-[#D6E6FF]/70 dark:border-[#2B7FFF]/20">
                      {activities.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#1A6BFF]/12 dark:bg-[#1A6BFF]/25 border border-[#1A6BFF]/40 px-3 py-1 text-xs font-extrabold text-[#1A6BFF] dark:text-blue-200"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() =>
                              setActivities((prev) => prev.filter((a) => a !== tag))
                            }
                            aria-label={`Remove ${tag}`}
                            className="hover:text-red-500"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Main Guests / Headliners (Artists, Leaders, Speakers, VIPs) */}
                <div className="sm:col-span-2 rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#0A1E5C] dark:text-white">
                      <Mic2 className="h-3.5 w-3.5 text-[#1A6BFF]" />
                      Main Guests / Headliners (Artists, Leaders, Speakers — Optional)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={mainGuestName}
                      onChange={(e) => setMainGuestName(e.target.value)}
                      placeholder="Name (e.g. DJ Joe Mfalme / Dr. Wanjiru)"
                      className="rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] px-3 py-2 text-xs sm:text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
                    />
                    <input
                      type="text"
                      value={mainGuestRole}
                      onChange={(e) => setMainGuestRole(e.target.value)}
                      placeholder="Role (Artist, Leader, MC, Keynote)"
                      className="rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] px-3 py-2 text-xs sm:text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddMainGuest}
                      className="rounded-xl bg-[#1A6BFF] hover:bg-[#2B7FFF] px-4 py-2 text-xs font-extrabold text-white transition"
                    >
                      + Add Main Guest
                    </button>
                  </div>
                  {mainGuests.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {mainGuests.map((mg) => (
                        <span
                          key={mg.id}
                          className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-[#13224A] border border-[#D6E6FF] dark:border-[#2B7FFF]/35 px-3 py-1 text-xs font-bold text-[#0A1E5C] dark:text-white"
                        >
                          <span className="font-extrabold">{mg.name}</span>
                          <span className="text-[10px] font-extrabold uppercase text-[#1A6BFF] dark:text-[#2B7FFF]">
                            {mg.role}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setMainGuests((prev) => prev.filter((x) => x.id !== mg.id))
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

                {/* Multi-Events / Additional Sessions in the Same Room */}
                <div className="sm:col-span-2 rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] p-4 space-y-3">
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#0A1E5C] dark:text-white">
                      <CalendarPlus className="h-3.5 w-3.5 text-[#1A6BFF]" />
                      Running 2+ Events? Add Extra Events to This Same Room (Optional)
                    </span>
                    <p className="text-[11px] text-[#0A1E5C]/65 dark:text-white/65 mt-0.5">
                      Bundle multiple days, sessions, or connected events (e.g. Day 1 Conference + Day 2 Gala) in one room.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <input
                      type="text"
                      value={subTitle}
                      onChange={(e) => setSubTitle(e.target.value)}
                      placeholder="Event / Session Title"
                      className="sm:col-span-2 rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] px-3 py-2 text-xs sm:text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
                    />
                    <input
                      type="date"
                      value={subDate}
                      onChange={(e) => setSubDate(e.target.value)}
                      className="rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] px-3 py-2 text-xs sm:text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
                    />
                    <input
                      type="text"
                      value={subTime}
                      onChange={(e) => setSubTime(e.target.value)}
                      placeholder="Time (e.g. 6:00 PM)"
                      className="rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] px-3 py-2 text-xs sm:text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
                    />
                    <input
                      type="text"
                      value={subLocation}
                      onChange={(e) => setSubLocation(e.target.value)}
                      placeholder="Venue / Location (optional)"
                      className="sm:col-span-3 rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] px-3 py-2 text-xs sm:text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddSubEvent}
                      className="rounded-xl bg-[#1A6BFF] hover:bg-[#2B7FFF] px-4 py-2 text-xs font-extrabold text-white transition"
                    >
                      + Add Event
                    </button>
                  </div>
                  {subEvents.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {subEvents.map((se) => (
                        <div
                          key={se.id}
                          className="flex items-center justify-between gap-2 rounded-xl bg-white dark:bg-[#13224A] border border-[#D6E6FF] dark:border-[#2B7FFF]/30 px-3 py-2 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-extrabold text-[#0A1E5C] dark:text-white truncate">
                              {se.title}
                            </p>
                            <p className="text-[11px] text-[#0A1E5C]/65 dark:text-white/65 truncate">
                              {se.date}
                              {se.time ? ` • ${se.time}` : ''}
                              {se.location ? ` • ${se.location}` : ''}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setSubEvents((prev) => prev.filter((x) => x.id !== se.id))
                            }
                            className="text-red-500 hover:bg-red-500/10 rounded-lg p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Event Cover Image Upload */}
                <div className="sm:col-span-2 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#0A1E5C]/70 dark:text-white/70">
                      Event Cover &amp; Flyer Image (Optional)
                    </label>
                    {coverPreviewUrl && (
                      <button
                        type="button"
                        onClick={handleClearCover}
                        className="text-xs font-bold text-red-500 hover:text-red-600 transition"
                      >
                        Remove custom image
                      </button>
                    )}
                  </div>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleSelectCoverFile(e.target.files?.[0])}
                  />
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingCover(true);
                    }}
                    onDragLeave={() => setIsDraggingCover(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingCover(false);
                      handleSelectCoverFile(e.dataTransfer.files?.[0]);
                    }}
                    onClick={() => coverInputRef.current?.click()}
                    className={`group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition ${
                      isDraggingCover
                        ? 'border-[#1A6BFF] bg-[#1A6BFF]/10'
                        : 'border-[#D6E6FF] dark:border-[#2B7FFF]/35 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] hover:border-[#1A6BFF]'
                    }`}
                  >
                    <div className="relative h-44 sm:h-48 w-full">
                      <img
                        src={coverPreviewUrl || COVER_PRESETS[eventType].image}
                        alt="Event cover preview"
                        className="h-full w-full object-cover opacity-85 group-hover:opacity-75 transition"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0A1430]/85 via-[#0A1430]/35 to-transparent flex flex-col items-center justify-center p-4 text-center text-white">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1A6BFF]/90 shadow-lg mb-2 group-hover:scale-105 transition">
                          {coverPreviewUrl ? (
                            <ImageIcon className="h-5 w-5" />
                          ) : (
                            <UploadCloud className="h-5 w-5" />
                          )}
                        </span>
                        <p className="text-sm font-extrabold">
                          {coverPreviewUrl
                            ? 'Click or drop to change event photo'
                            : 'Upload Event Photo for Your Room & Flyer'}
                        </p>
                        <p className="text-[11px] text-white/80 mt-0.5">
                          {coverPreviewUrl && coverFile
                            ? `${coverFile.name} — ready for your event flyer`
                            : `PNG, JPG, or WebP • Using default ${eventType} cover if skipped`}
                        </p>
                      </div>
                    </div>
                  </div>
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

          {/* STEP 3: CUSTOM BUDGET, UNLIMITED GUESTS & INVITES */}
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
              {/* Budget & Unlimited Max Guests */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#0A1E5C]/70 dark:text-white/70 mb-1.5">
                      Total Budget (KES) — Edit Freely
                    </label>
                    <div className="relative">
                      <Wallet className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1A6BFF] dark:text-[#2B7FFF]" />
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={totalBudgetStr}
                        onChange={(e) =>
                          setTotalBudgetStr(e.target.value.replace(/[^0-9]/g, ''))
                        }
                        placeholder="e.g. 60000"
                        className="w-full rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] pl-10 pr-4 py-3 text-sm font-bold text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#0A1E5C]/70 dark:text-white/70">
                        Number of Guests (Any Capacity)
                      </label>
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-[#F0F6FF] dark:bg-[#0B1A3A] px-2.5 py-0.5 text-xs font-extrabold text-[#1A6BFF] dark:text-[#2B7FFF]">
                        <Users className="h-3.5 w-3.5" />
                        {maxGuests.toLocaleString()}
                      </span>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={maxGuestsStr}
                      onChange={(e) =>
                        setMaxGuestsStr(e.target.value.replace(/[^0-9]/g, ''))
                      }
                      placeholder="Enter any number (e.g. 20, 500, 1000000)"
                      className="w-full rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] px-4 py-3 text-sm font-bold text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {GUEST_PRESETS.map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setMaxGuestsStr(String(n))}
                          className={`rounded-full px-2.5 py-1 text-[11px] font-bold border transition ${
                            maxGuests === n
                              ? 'border-[#1A6BFF] bg-[#1A6BFF] text-white'
                              : 'border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#0B1A3A] text-[#0A1E5C]/75 dark:text-white/75 hover:border-[#1A6BFF]'
                          }`}
                        >
                          {n.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Auto-calculated Cost Per Person Card */}
                <div className="rounded-2xl bg-gradient-to-br from-[#0B2E8F] to-[#1A6BFF] p-5 text-white flex flex-col justify-center">
                  <span className="text-xs font-semibold text-white/80">
                    Cost / Person
                  </span>
                  <p className="mt-1.5 text-2xl sm:text-3xl font-extrabold tracking-tight">
                    {formatKES(costPerPerson)}
                  </p>
                  <span className="mt-2 text-[11px] text-white/80">
                    Split across {maxGuests.toLocaleString()} guest{maxGuests === 1 ? '' : 's'}
                  </span>
                </div>
              </div>

              {/* Build Your Own Budget / Add Expenses Yourself */}
              <div className="rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-[#0A1E5C] dark:text-white">
                    <Receipt className="h-4 w-4 text-[#1A6BFF] dark:text-[#2B7FFF]" />
                    Add Your Own Budget Expenses (Optional)
                  </div>
                  {customExpenses.length > 0 && (
                    <span className="text-xs font-extrabold text-[#1A6BFF] dark:text-[#2B7FFF]">
                      Items Total: {formatKES(customExpensesSum)}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#0A1E5C]/65 dark:text-white/65">
                  Instead of automatic percentages, list your own planned expenses (e.g. Sound System, Venue Hire, Buses) — your Total Budget updates automatically, and you can still edit it anytime.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    value={expTitle}
                    onChange={(e) => setExpTitle(e.target.value)}
                    placeholder="Expense item (e.g. Stage & Sound)"
                    className="rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] px-3 py-2 text-xs sm:text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
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
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={expAmount}
                    onChange={(e) =>
                      setExpAmount(e.target.value.replace(/[^0-9]/g, ''))
                    }
                    placeholder="Amount (KES)"
                    className="rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] px-3 py-2 text-xs sm:text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomExpense}
                    className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#1A6BFF] hover:bg-[#2B7FFF] px-4 py-2 text-xs sm:text-sm font-bold text-white transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Expense
                  </button>
                </div>

                {customExpenses.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {customExpenses.map((ex) => (
                      <div
                        key={ex.id}
                        className="flex items-center justify-between gap-2 rounded-xl bg-white dark:bg-[#13224A] border border-[#D6E6FF] dark:border-[#2B7FFF]/30 px-3 py-2 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-extrabold text-[#0A1E5C] dark:text-white truncate">
                            {ex.title}
                          </span>
                          <span className="rounded-full bg-[#F0F6FF] dark:bg-[#0B1A3A] px-2 py-0.5 text-[10px] font-bold text-[#1A6BFF] dark:text-[#2B7FFF]">
                            {ex.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-extrabold text-[#0A1E5C] dark:text-white">
                            {formatKES(ex.amount)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomExpense(ex.id)}
                            className="text-red-500 hover:bg-red-500/10 rounded-lg p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                  disabled={isCreating}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#1A6BFF] hover:bg-[#2B7FFF] disabled:opacity-60 px-7 py-3.5 text-sm font-extrabold text-white shadow-monte transition active:scale-95"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating Room &amp; Flyer…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Create Room &amp; Generate Flyer
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
