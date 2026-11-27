import React, { useRef, useState } from 'react';
import {
  Bell,
  Cake,
  Calendar,
  Camera,
  CreditCard,
  Edit3,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Play,
  Shield,
  Smartphone,
  Trash2,
  User,
  X,
} from 'lucide-react';
import {
  EventRoomTab,
  EventType,
  MediaItem,
  MonteEvent,
  UserProfile,
} from '../types';
import { EVENT_TYPES, formatDateShort, formatKES } from '../data/sampleData';
import { uploadFileToStorage } from '../lib/monteService';
import { motion } from 'motion/react';
import { MonteLogo } from './MonteLogo';
import { ThemeToggle } from './ThemeToggle';
import { SPRING_SNAPPY } from './MotionPrimitives';

interface ProfilePageProps {
  user: UserProfile;
  events: MonteEvent[];
  media: MediaItem[];
  supabaseStatus: { connected: boolean; schemaReady: boolean };
  isGuestMode?: boolean;
  onPromptAuth?: (message?: string, mode?: 'login' | 'signup') => void;
  onUpdateProfile: (updated: UserProfile) => void;
  onOpenEvent: (eventId: string, tab?: EventRoomTab) => void;
  onSelectMedia: (item: MediaItem) => void;
  onLogout: () => void;
  onDeleteAccount: () => Promise<{ ok: boolean; error?: string }>;
  onShowToast: (msg: string) => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=240&q=80',
  'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=240&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=240&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80',
];

export const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  events,
  media,
  supabaseStatus,
  isGuestMode = false,
  onPromptAuth,
  onUpdateProfile,
  onOpenEvent,
  onSelectMedia,
  onLogout,
  onDeleteAccount,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'about' | 'events' | 'media' | 'settings'>('about');
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Settings local toggles
  const [notifPush, setNotifPush] = useState(true);
  const [notifPayments, setNotifPayments] = useState(true);
  const [notifChats, setNotifChats] = useState(true);
  const [privacyPublic, setPrivacyPublic] = useState(true);
  const [privacyShowPhone, setPrivacyShowPhone] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'card'>('mpesa');

  // Edit modal draft state
  const [draft, setDraft] = useState<UserProfile>(user);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const openEditModal = () => {
    if (isGuestMode) {
      onPromptAuth?.(
        'Create a free account to customize your Monte Events profile.',
        'signup'
      );
      return;
    }
    setDraft(user);
    setEditOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const parts = draft.name.trim().split(' ');
    const initials = (
      (parts[0]?.[0] || 'M') + (parts[1]?.[0] || parts[0]?.[1] || 'E')
    ).toUpperCase();
    onUpdateProfile({
      ...draft,
      name: draft.name.trim() || user.name,
      username: draft.username.replace(/^@/, '').trim() || user.username,
      initials,
    });
    setEditOpen(false);
    onShowToast('Profile Updated');
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFileToStorage(file, 'avatars');
    setDraft((prev) => ({ ...prev, avatarUrl: url }));
  };

  const togglePreferredType = (type: EventType) => {
    const exists = user.preferredTypes.includes(type);
    const updated = exists
      ? user.preferredTypes.filter((t) => t !== type)
      : [...user.preferredTypes, type];
    onUpdateProfile({ ...user, preferredTypes: updated });
  };

  const totalGuestsInvited = events.reduce((acc, e) => acc + e.guests.length, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-6 animate-slide-up">
      {/* Profile Header Card */}
      <div className="overflow-hidden rounded-3xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-white dark:bg-[#13224A] shadow-sm">
        {/* Cover Banner with MONTE EVENTS Logo & ThemeToggle */}
        <div className="relative h-40 sm:h-48 bg-gradient-to-r from-[#0B2E8F] via-[#1A6BFF] to-[#2B7FFF] px-5 py-4 flex items-start justify-between">
          <div className="pointer-events-none absolute -right-12 -bottom-12 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
          <div className="relative z-10">
            <MonteLogo size="xs" layout="horizontal" />
          </div>
          <div className="relative z-10">
            <ThemeToggle compact />
          </div>
        </div>

        {/* Avatar & Info */}
        <div className="px-5 sm:px-7 pb-6">
          <div className="relative -mt-14 sm:-mt-16 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <div className="relative">
                <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-3xl overflow-hidden border-4 border-white dark:border-[#13224A] bg-[#1A6BFF] text-white flex items-center justify-center text-2xl font-extrabold shadow-lg">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{user.initials}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={openEditModal}
                  className="absolute -bottom-1.5 -right-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#1A6BFF] hover:bg-[#2B7FFF] text-white shadow-md ring-2 ring-white dark:ring-[#13224A] transition"
                  title="Change profile photo"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>

              <div className="pb-1">
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#0A1E5C] dark:text-white">
                  {user.name}
                </h1>
                <p className="text-xs sm:text-sm font-bold text-[#1A6BFF] dark:text-[#2B7FFF]">
                  @{user.username}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={openEditModal}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1A6BFF] hover:bg-[#2B7FFF] px-5 py-2.5 text-xs sm:text-sm font-extrabold text-white shadow-monte transition active:scale-95 self-start sm:self-end"
            >
              <Edit3 className="h-4 w-4" />
              Edit Profile
            </button>
          </div>

          <p className="mt-4 text-sm text-[#0A1E5C]/80 dark:text-white/80 max-w-2xl leading-relaxed">
            {user.bio}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-semibold text-[#0A1E5C]/65 dark:text-white/65">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[#1A6BFF] dark:text-[#2B7FFF]" />
              {user.location}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[#1A6BFF] dark:text-[#2B7FFF]" />
              Member since {user.memberSince}
            </span>
          </div>

          {/* Stats Row */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Events Created', value: events.length },
              { label: 'Events Attended', value: events.length },
              { label: 'Guests Invited', value: totalGuestsInvited },
              { label: 'Total Media', value: media.length },
            ].map((st) => (
              <div
                key={st.label}
                className="rounded-2xl bg-[#F0F6FF] dark:bg-[#0B1A3A] border border-[#D6E6FF] dark:border-[#2B7FFF]/20 p-3.5 text-center"
              >
                <p className="text-xl sm:text-2xl font-extrabold text-[#1A6BFF] dark:text-[#2B7FFF]">
                  {st.value}
                </p>
                <p className="text-[11px] font-bold text-[#0A1E5C]/70 dark:text-white/70 mt-0.5">
                  {st.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs: About | My Events | Media | Settings with gliding active pill */}
      <div className="grid grid-cols-4 gap-2 rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-white dark:bg-[#13224A] p-1.5">
        {(
          [
            { id: 'about', label: 'About' },
            { id: 'events', label: 'My Events' },
            { id: 'media', label: 'Media' },
            { id: 'settings', label: 'Settings' },
          ] as const
        ).map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`relative rounded-xl py-2.5 text-xs sm:text-sm font-extrabold transition-colors ${
                active
                  ? 'text-white'
                  : 'text-[#0A1E5C]/70 dark:text-white/70 hover:bg-[#F0F6FF] dark:hover:bg-[#1A2D5E]'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="profile-tab-pill"
                  transition={SPRING_SNAPPY}
                  className="absolute inset-0 rounded-xl bg-[#1A6BFF] shadow-sm"
                />
              )}
              <span className="relative z-10">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB: ABOUT */}
      {activeTab === 'about' && (
        <div className="rounded-3xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-white dark:bg-[#13224A] p-5 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Full Name', value: user.name, icon: User },
              { label: 'Username', value: `@${user.username}`, icon: User },
              { label: 'Email', value: user.email, icon: Mail },
              { label: 'Phone', value: user.phone, icon: Phone },
              { label: 'Location', value: user.location, icon: MapPin },
              { label: 'Birthday', value: formatDateShort(user.birthday), icon: Cake },
              { label: 'M-Pesa Number', value: user.mpesaNumber, icon: Smartphone },
            ].map((row) => {
              const Icon = row.icon;
              return (
                <div
                  key={row.label}
                  className="flex items-center gap-3.5 rounded-2xl bg-[#F0F6FF]/80 dark:bg-[#0B1A3A] border border-[#D6E6FF] dark:border-[#2B7FFF]/20 p-3.5"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-[#13224A] text-[#1A6BFF] dark:text-[#2B7FFF] shadow-xs">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#0A1E5C]/55 dark:text-white/55">
                      {row.label}
                    </p>
                    <p className="truncate text-sm font-bold text-[#0A1E5C] dark:text-white">
                      {row.value}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#0A1E5C]/60 dark:text-white/60 mb-2.5">
              Preferred Event Types (Tap to toggle)
            </p>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.filter((t) => t !== 'Custom').map((type) => {
                const active = user.preferredTypes.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => togglePreferredType(type)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold border transition ${
                      active
                        ? 'border-[#1A6BFF] bg-[#1A6BFF] text-white'
                        : 'border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF] dark:bg-[#0B1A3A] text-[#0A1E5C]/75 dark:text-white/75'
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB: MY EVENTS */}
      {activeTab === 'events' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-white dark:bg-[#13224A] p-4"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`h-14 w-14 shrink-0 rounded-2xl bg-gradient-to-br ${ev.coverGradient} overflow-hidden`}
                >
                  <img
                    src={ev.coverImage}
                    alt={ev.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-extrabold text-[#0A1E5C] dark:text-white">
                    {ev.name}
                  </h3>
                  <p className="text-xs text-[#0A1E5C]/65 dark:text-white/65">
                    {formatDateShort(ev.date)} • {formatKES(ev.costPerPerson)}/person
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenEvent(ev.id, 'guests')}
                className="shrink-0 rounded-xl bg-[#1A6BFF] hover:bg-[#2B7FFF] px-4 py-2 text-xs font-extrabold text-white"
              >
                Open Room
              </button>
            </div>
          ))}
        </div>
      )}

      {/* TAB: MEDIA */}
      {activeTab === 'media' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {media.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectMedia(item)}
              className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-[#0B2E8F] text-left"
            >
              <img
                src={item.thumbnail}
                alt={item.title}
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A1430]/80 via-transparent to-transparent" />
              {item.type === 'video' && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1A6BFF] text-white shadow-lg">
                    <Play className="h-4 w-4 fill-white ml-0.5" />
                  </span>
                </span>
              )}
              <div className="absolute bottom-2.5 left-3 right-3">
                <p className="truncate text-xs font-bold text-white">{item.title}</p>
                <p className="truncate text-[10px] text-white/75">{item.eventName}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* TAB: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          {/* Appearance */}
          <div className="rounded-3xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-white dark:bg-[#13224A] p-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-extrabold text-[#0A1E5C] dark:text-white">
                Appearance / Theme
              </h3>
              <p className="text-xs text-[#0A1E5C]/65 dark:text-white/65">
                Switch between Monte Royal Light and Deep Navy Dark mode across all pages.
              </p>
            </div>
            <ThemeToggle />
          </div>

          {/* Supabase Backend Connection Status */}
          <div className="rounded-3xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-white dark:bg-[#13224A] p-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-extrabold text-[#0A1E5C] dark:text-white">
                Supabase Cloud Sync
              </h3>
              <p className="text-xs text-[#0A1E5C]/65 dark:text-white/65 mt-0.5">
                {supabaseStatus.connected
                  ? supabaseStatus.schemaReady
                    ? 'Connected to ibktiagimozgdixoepoq.supabase.co — live database & realtime active.'
                    : 'Connected to ibktiagimozgdixoepoq.supabase.co — run supabase/schema.sql to enable persistent tables.'
                  : 'Running in local preview mode.'}
              </p>
            </div>
            <span
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold ${
                supabaseStatus.connected
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-[#D6E6FF] dark:bg-[#0B1A3A] text-[#0B2E8F] dark:text-[#D6E6FF]'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  supabaseStatus.connected ? 'bg-emerald-500' : 'bg-[#1A6BFF]'
                }`}
              />
              {supabaseStatus.connected ? 'Connected' : 'Local'}
            </span>
          </div>

          {/* Notifications */}
          <div className="rounded-3xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-white dark:bg-[#13224A] p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-extrabold text-[#0A1E5C] dark:text-white">
              <Bell className="h-4 w-4 text-[#1A6BFF]" />
              Notifications
            </div>
            {[
              { label: 'Event Reminders & Countdown Alerts', val: notifPush, set: setNotifPush },
              { label: 'M-Pesa Payment Confirmations', val: notifPayments, set: setNotifPayments },
              { label: 'Event Chat Messages & Mentions', val: notifChats, set: setNotifChats },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3">
                <span className="text-xs sm:text-sm font-semibold text-[#0A1E5C]/85 dark:text-white/85">
                  {item.label}
                </span>
                <button
                  type="button"
                  onClick={() => item.set(!item.val)}
                  className={`relative h-6 w-11 rounded-full transition ${
                    item.val ? 'bg-[#1A6BFF]' : 'bg-[#D6E6FF] dark:bg-[#0B1A3A]'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      item.val ? 'translate-x-5' : ''
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>

          {/* Privacy */}
          <div className="rounded-3xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-white dark:bg-[#13224A] p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-extrabold text-[#0A1E5C] dark:text-white">
              <Shield className="h-4 w-4 text-[#1A6BFF]" />
              Privacy
            </div>
            {[
              { label: 'Allow friends to find me by @username', val: privacyPublic, set: setPrivacyPublic },
              { label: 'Show phone number to all room guests', val: privacyShowPhone, set: setPrivacyShowPhone },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3">
                <span className="text-xs sm:text-sm font-semibold text-[#0A1E5C]/85 dark:text-white/85">
                  {item.label}
                </span>
                <button
                  type="button"
                  onClick={() => item.set(!item.val)}
                  className={`relative h-6 w-11 rounded-full transition ${
                    item.val ? 'bg-[#1A6BFF]' : 'bg-[#D6E6FF] dark:bg-[#0B1A3A]'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      item.val ? 'translate-x-5' : ''
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>

          {/* Payment Method */}
          <div className="rounded-3xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-white dark:bg-[#13224A] p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-extrabold text-[#0A1E5C] dark:text-white">
              <CreditCard className="h-4 w-4 text-[#1A6BFF]" />
              Default Payment Method
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('mpesa')}
                className={`rounded-2xl border p-3.5 text-left transition ${
                  paymentMethod === 'mpesa'
                    ? 'border-[#1A6BFF] bg-[#F0F6FF] dark:bg-[#1A2D5E]'
                    : 'border-[#D6E6FF] dark:border-[#2B7FFF]/20'
                }`}
              >
                <p className="text-sm font-extrabold text-[#0A1E5C] dark:text-white">
                  M-Pesa Express
                </p>
                <p className="text-xs text-[#0A1E5C]/65 dark:text-white/65 mt-0.5">
                  {user.mpesaNumber}
                </p>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`rounded-2xl border p-3.5 text-left transition ${
                  paymentMethod === 'card'
                    ? 'border-[#1A6BFF] bg-[#F0F6FF] dark:bg-[#1A2D5E]'
                    : 'border-[#D6E6FF] dark:border-[#2B7FFF]/20'
                }`}
              >
                <p className="text-sm font-extrabold text-[#0A1E5C] dark:text-white">
                  Visa / Mastercard
                </p>
                <p className="text-xs text-[#0A1E5C]/65 dark:text-white/65 mt-0.5">
                  Ending in •••• 4829
                </p>
              </button>
            </div>
          </div>

          {/* Sign Out */}
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/35 bg-white dark:bg-[#13224A] hover:bg-[#F0F6FF] dark:hover:bg-[#1A2D5E] py-3.5 text-sm font-extrabold text-[#0A1E5C] dark:text-white transition"
          >
            <LogOut className="h-4 w-4 text-[#1A6BFF] dark:text-[#2B7FFF]" />
            Sign Out
          </button>

          {/* Danger Zone: Delete Account */}
          <div className="rounded-3xl border border-red-400/35 bg-red-500/5 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-extrabold text-red-600 dark:text-red-400">
                Danger Zone
              </h3>
              <p className="text-xs text-[#0A1E5C]/70 dark:text-white/70 mt-0.5">
                Permanently delete your MONTE EVENTS account and profile data. This cannot be undone.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDeleteConfirmText('');
                setDeleteError(null);
                setDeleteOpen(true);
              }}
              className="shrink-0 inline-flex items-center justify-center gap-2 rounded-2xl border border-red-500/40 bg-red-600 hover:bg-red-700 px-5 py-2.5 text-xs sm:text-sm font-extrabold text-white shadow-sm transition active:scale-95"
            >
              <Trash2 className="h-4 w-4" />
              Delete Account
            </button>
          </div>
        </div>
      )}

      {/* DELETE ACCOUNT CONFIRMATION MODAL */}
      {deleteOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0A1430]/75 backdrop-blur-sm p-4"
          onClick={() => !deleting && setDeleteOpen(false)}
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
                  Delete Account
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle compact />
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setDeleteOpen(false)}
                  className="rounded-full p-1.5 text-[#0A1E5C]/60 dark:text-white/60 hover:bg-[#F0F6FF] dark:hover:bg-[#1A2D5E]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#0A1E5C]/75 dark:text-white/75 leading-relaxed">
              This will permanently remove your account (<span className="font-bold">{user.email}</span>) from MONTE EVENTS. Type <span className="font-extrabold text-red-600 dark:text-red-400">DELETE</span> below to confirm.
            </p>

            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder='Type "DELETE" to confirm'
              disabled={deleting}
              className="w-full rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] px-3.5 py-2.5 text-sm font-bold text-[#0A1E5C] dark:text-white focus:border-red-500 focus:outline-none"
            />

            {deleteError && (
              <p className="rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400">
                {deleteError}
              </p>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteOpen(false)}
                className="rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 px-4 py-2.5 text-xs sm:text-sm font-bold text-[#0A1E5C] dark:text-white hover:bg-[#F0F6FF] dark:hover:bg-[#1A2D5E]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting || deleteConfirmText.trim() !== 'DELETE'}
                onClick={async () => {
                  setDeleting(true);
                  setDeleteError(null);
                  const result = await onDeleteAccount();
                  if (!result.ok) {
                    setDeleteError(result.error || 'Could not delete account.');
                    setDeleting(false);
                  } else {
                    setDeleteOpen(false);
                    setDeleting(false);
                  }
                }}
                className="rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-45 px-5 py-2.5 text-xs sm:text-sm font-extrabold text-white shadow-sm transition"
              >
                {deleting ? 'Deleting…' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {editOpen && (
        <div
          className="fixed inset-0 z-[85] flex items-center justify-center bg-[#0A1430]/75 backdrop-blur-sm p-4"
          onClick={() => setEditOpen(false)}
        >
          <div
            className="animate-slide-up w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header with ThemeToggle */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#D6E6FF] dark:border-[#2B7FFF]/20 bg-white dark:bg-[#13224A] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <img src="./favicon.svg" alt="Monte" className="h-7 w-7" />
                <h2 className="text-base sm:text-lg font-extrabold text-[#0A1E5C] dark:text-white">
                  Edit Profile
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle compact />
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="rounded-full p-1.5 text-[#0A1E5C]/60 dark:text-white/60 hover:bg-[#F0F6FF] dark:hover:bg-[#1A2D5E]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              {/* Photo Picker */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <img
                  src={draft.avatarUrl}
                  alt={draft.name}
                  className="h-20 w-20 rounded-2xl object-cover ring-2 ring-[#1A6BFF]"
                />
                <div className="space-y-2 flex-1">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFile}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="rounded-xl bg-[#1A6BFF] hover:bg-[#2B7FFF] px-3.5 py-1.5 text-xs font-bold text-white"
                    >
                      Upload Photo
                    </button>
                    <span className="text-[11px] font-semibold text-[#0A1E5C]/60 dark:text-white/60">
                      or pick preset:
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {AVATAR_PRESETS.map((url) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => setDraft((p) => ({ ...p, avatarUrl: url }))}
                        className={`h-9 w-9 rounded-full overflow-hidden ring-2 transition ${
                          draft.avatarUrl === url
                            ? 'ring-[#1A6BFF] scale-110'
                            : 'ring-transparent opacity-75 hover:opacity-100'
                        }`}
                      >
                        <img src={url} alt="Preset" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#0A1E5C]/70 dark:text-white/70 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    required
                    className="w-full rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] px-3.5 py-2.5 text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0A1E5C]/70 dark:text-white/70 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={draft.username}
                    onChange={(e) => setDraft({ ...draft, username: e.target.value })}
                    required
                    className="w-full rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] px-3.5 py-2.5 text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#0A1E5C]/70 dark:text-white/70 mb-1">
                    Bio
                  </label>
                  <textarea
                    rows={2}
                    value={draft.bio}
                    onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                    className="w-full rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] px-3.5 py-2.5 text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0A1E5C]/70 dark:text-white/70 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={draft.email}
                    onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                    className="w-full rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] px-3.5 py-2.5 text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0A1E5C]/70 dark:text-white/70 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={draft.phone}
                    onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                    className="w-full rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] px-3.5 py-2.5 text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0A1E5C]/70 dark:text-white/70 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={draft.location}
                    onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                    className="w-full rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] px-3.5 py-2.5 text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0A1E5C]/70 dark:text-white/70 mb-1">
                    Birthday
                  </label>
                  <input
                    type="date"
                    value={draft.birthday}
                    onChange={(e) => setDraft({ ...draft, birthday: e.target.value })}
                    className="w-full rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] px-3.5 py-2.5 text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#0A1E5C]/70 dark:text-white/70 mb-1">
                    M-Pesa Number
                  </label>
                  <input
                    type="text"
                    value={draft.mpesaNumber}
                    onChange={(e) => setDraft({ ...draft, mpesaNumber: e.target.value })}
                    className="w-full rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] px-3.5 py-2.5 text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#D6E6FF] dark:border-[#2B7FFF]/20">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 px-5 py-2.5 text-xs sm:text-sm font-bold text-[#0A1E5C] dark:text-white hover:bg-[#F0F6FF] dark:hover:bg-[#1A2D5E]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#1A6BFF] hover:bg-[#2B7FFF] px-6 py-2.5 text-xs sm:text-sm font-extrabold text-white shadow-monte"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
