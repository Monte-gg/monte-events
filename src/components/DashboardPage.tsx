import React, { useMemo, useState } from 'react';
import {
  BadgeCheck,
  Bell,
  Calendar,
  CheckCircle2,
  MapPin,
  MessageCircle,
  Play,
  Plus,
  RefreshCw,
  Search,
  Users,
  Wallet,
  ArrowUpRight,
  Check,
  Film,
} from 'lucide-react';
import {
  AppPage,
  EventRoomTab,
  MediaItem,
  MonteEvent,
  NotificationItem,
  UserProfile,
} from '../types';
import { formatDateShort, formatKES } from '../data/sampleData';
import { ApiStatus } from '../lib/api';
import { motion } from 'motion/react';
import { ThemeToggle } from './ThemeToggle';
import { DownloadAppCard } from './DownloadAppCard';
import { AppUpdateCard } from './AppUpdateCard';
import { AppUpdateInfo } from '../lib/appVersion';
import { NotificationPermissionState } from '../lib/notifications';
import {
  CountUpNumber,
  SPRING_POP,
  SPRING_SNAPPY,
  ScrollProgressBar,
  SpotlightCard,
} from './MotionPrimitives';

interface DashboardPageProps {
  user: UserProfile;
  events: MonteEvent[];
  media: MediaItem[];
  notifications: NotificationItem[];
  apiStatus?: ApiStatus;
  onToggleOnlineMode?: () => void;
  isRefreshing?: boolean;
  onRefresh?: () => void | Promise<void>;
  isGuestMode?: boolean;
  onOpenCompleteProfile?: () => void;
  updateInfo?: AppUpdateInfo | null;
  notifPermission?: NotificationPermissionState;
  onCheckUpdate?: () => Promise<void>;
  onEnableNotifications?: () => Promise<void>;
  onMarkNotificationsRead: () => void;
  onOpenEvent: (eventId: string, tab?: EventRoomTab) => void;
  onNavigate: (page: AppPage) => void;
  onSelectMedia: (item: MediaItem) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  user,
  events,
  media,
  notifications,
  apiStatus = 'demo',
  onToggleOnlineMode,
  isRefreshing = false,
  onRefresh,
  isGuestMode = false,
  onOpenCompleteProfile,
  updateInfo = null,
  notifPermission = 'prompt',
  onCheckUpdate,
  onEnableNotifications,
  onMarkNotificationsRead,
  onOpenEvent,
  onNavigate,
  onSelectMedia,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifs, setShowNotifs] = useState(false);

  const unreadNotifs = notifications.filter((n) => !n.read).length;

  const stats = useMemo(() => {
    const upcomingEvents = events.length;
    const totalGuests = events.reduce((acc, e) => acc + e.guests.length, 0);
    const paidGuests = events.reduce(
      (acc, e) => acc + e.guests.filter((g) => g.paid).length,
      0
    );
    const totalBudgetCollected = events.reduce(
      (acc, e) =>
        acc + e.guests.filter((g) => g.paid).reduce((s, g) => s + g.amount, 0),
      0
    );
    return {
      upcomingEvents,
      totalGuests,
      paidGuests,
      totalBudgetCollected,
    };
  }, [events]);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return events;
    return events.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q)
    );
  }, [events, searchQuery]);

  const firstName = user.name.split(' ')[0] || 'Friend';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-7 animate-slide-up">
      {/* Top Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-bold uppercase tracking-wider text-[#1A6BFF] dark:text-[#2B7FFF]">
              Welcome back to Monte Events
            </p>
            <button
              type="button"
              onClick={() => onToggleOnlineMode?.()}
              disabled={apiStatus === 'waking'}
              title={
                apiStatus === 'online'
                  ? 'Tap to switch to Offline mode'
                  : 'Tap to connect Online and sync live data'
              }
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-extrabold transition active:scale-95 ${
                apiStatus === 'online'
                  ? 'border-emerald-500/35 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25'
                  : apiStatus === 'waking'
                  ? 'border-[#1A6BFF]/30 bg-[#D6E6FF] dark:bg-[#13224A] text-[#0B2E8F] dark:text-[#D6E6FF] cursor-wait'
                  : 'border-[#1A6BFF]/40 bg-[#D6E6FF]/90 dark:bg-[#13224A] text-[#0A1E5C] dark:text-white hover:border-[#1A6BFF]'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  apiStatus === 'online'
                    ? 'bg-emerald-500'
                    : apiStatus === 'waking'
                    ? 'bg-[#1A6BFF] animate-pulse'
                    : 'bg-amber-400'
                }`}
              />
              <span>
                {apiStatus === 'online'
                  ? 'Online • Switch Offline'
                  : apiStatus === 'waking'
                  ? 'Connecting Online…'
                  : 'Offline • Tap to Go Online'}
              </span>
            </button>
            {onRefresh && (
              <button
                type="button"
                onClick={() => void onRefresh()}
                disabled={isRefreshing}
                title="Refresh rooms, chats, members & check for app updates"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#D6E6FF] dark:border-[#2B7FFF]/35 bg-white dark:bg-[#13224A] hover:border-[#1A6BFF] px-2.5 py-1 text-[11px] font-extrabold text-[#1A6BFF] dark:text-[#2B7FFF] transition active:scale-95 disabled:opacity-70"
              >
                <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Refreshing…' : 'Refresh'}</span>
              </button>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0A1E5C] dark:text-white mt-0.5">
            Hey, {firstName}! Ready to plan?
          </h1>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Search */}
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1A6BFF] dark:text-[#2B7FFF]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events, trips..."
              className="w-full rounded-full border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] pl-10 pr-4 py-2 text-sm text-[#0A1E5C] dark:text-white placeholder:text-[#0A1E5C]/45 dark:placeholder:text-white/45 focus:border-[#1A6BFF] focus:outline-none focus:ring-2 focus:ring-[#1A6BFF]/20"
            />
          </div>

          {/* Notification Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifs((s) => !s)}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] text-[#0A1E5C] dark:text-white hover:border-[#1A6BFF] transition"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadNotifs > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#1A6BFF] text-[10px] font-extrabold text-white ring-2 ring-white dark:ring-[#0A1430]">
                  {unreadNotifs}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] shadow-2xl z-50 overflow-hidden animate-slide-up">
                <div className="flex items-center justify-between border-b border-[#D6E6FF] dark:border-[#2B7FFF]/20 px-4 py-3">
                  <span className="text-sm font-bold text-[#0A1E5C] dark:text-white">
                    Notifications
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onMarkNotificationsRead();
                      setShowNotifs(false);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#1A6BFF] dark:text-[#2B7FFF] hover:underline"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Mark all read
                  </button>
                </div>
                {notifPermission !== 'granted' && notifPermission !== 'unsupported' && onEnableNotifications && (
                  <div className="px-4 py-2.5 bg-[#F0F6FF] dark:bg-[#0B1A3A] border-b border-[#D6E6FF] dark:border-[#2B7FFF]/20 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-[#0A1E5C] dark:text-white">
                      Get phone &amp; browser alerts
                    </span>
                    <button
                      type="button"
                      onClick={() => void onEnableNotifications()}
                      className="rounded-lg bg-[#1A6BFF] hover:bg-[#2B7FFF] px-2.5 py-1 text-[10px] font-extrabold text-white transition"
                    >
                      Enable
                    </button>
                  </div>
                )}
                <div className="max-h-72 overflow-y-auto divide-y divide-[#D6E6FF]/60 dark:divide-[#2B7FFF]/15">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-xs text-[#0A1E5C]/60 dark:text-white/60">
                      You’re all caught up — no notifications yet.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => {
                          setShowNotifs(false);
                          if (n.eventId) onOpenEvent(n.eventId);
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-[#F0F6FF] dark:hover:bg-[#1A2D5E] transition ${
                          !n.read ? 'bg-[#F0F6FF]/70 dark:bg-[#1A2D5E]/50' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#0A1E5C] dark:text-white">
                            {n.title}
                          </span>
                          <span className="text-[11px] text-[#0A1E5C]/50 dark:text-white/50">
                            {n.time}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-[#0A1E5C]/70 dark:text-white/70 line-clamp-2">
                          {n.body}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Desktop Theme Toggle */}
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>

          {/* Avatar -> Profile */}
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full overflow-hidden ring-2 ring-[#1A6BFF] bg-[#1A6BFF] text-white font-bold text-xs hover:scale-105 transition"
            title="View Profile"
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{user.initials}</span>
            )}
          </button>
        </div>
      </div>

      {/* App Update Card (appears automatically on Web & Android when a newer version is live) */}
      {onCheckUpdate && (
        <AppUpdateCard updateInfo={updateInfo} onCheckUpdate={onCheckUpdate} />
      )}

      {/* Complete Profile Banner for existing users who have not verified their profile yet */}
      {!isGuestMode && !user.verified && onOpenCompleteProfile && (
        <div className="rounded-3xl border border-[#1A6BFF]/35 bg-gradient-to-r from-[#0B2E8F] via-[#1A6BFF] to-[#2B7FFF] p-4 sm:p-5 text-white shadow-monte flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
              <BadgeCheck className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-extrabold leading-tight">
                Complete your profile to get Verified
              </p>
              <p className="text-xs text-white/85 mt-0.5">
                Add your photo, phone & bio so friends can find you and unlock your Verified Account badge.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenCompleteProfile}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-2xl bg-white hover:bg-[#F0F6FF] text-[#0B2E8F] px-4 py-2.5 text-xs sm:text-sm font-extrabold shadow-sm transition active:scale-95"
          >
            <BadgeCheck className="h-4 w-4 text-[#1A6BFF]" />
            Complete Profile
          </button>
        </div>
      )}

      {/* Stats Row with Exact Math + Cursor Spotlight */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <SpotlightCard>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#0A1E5C]/65 dark:text-white/65">
              Upcoming Events
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F0F6FF] dark:bg-[#1A2D5E] text-[#1A6BFF] dark:text-[#2B7FFF]">
              <Calendar className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2.5 text-xl sm:text-2xl font-extrabold text-[#0A1E5C] dark:text-white tracking-tight">
            {stats.upcomingEvents}
          </p>
          <p className="mt-1 text-xs font-medium text-[#1A6BFF] dark:text-[#2B7FFF]">
            Active event rooms
          </p>
        </SpotlightCard>

        <SpotlightCard>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#0A1E5C]/65 dark:text-white/65">
              Total Guests
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F0F6FF] dark:bg-[#1A2D5E] text-[#1A6BFF] dark:text-[#2B7FFF]">
              <Users className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2.5 text-xl sm:text-2xl font-extrabold text-[#0A1E5C] dark:text-white tracking-tight">
            {stats.totalGuests}
          </p>
          <p className="mt-1 text-xs font-medium text-[#1A6BFF] dark:text-[#2B7FFF]">
            Invited across rooms
          </p>
        </SpotlightCard>

        <SpotlightCard>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#0A1E5C]/65 dark:text-white/65">
              Budget Used
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F0F6FF] dark:bg-[#1A2D5E] text-[#1A6BFF] dark:text-[#2B7FFF]">
              <Wallet className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2.5 text-xl sm:text-2xl font-extrabold text-[#0A1E5C] dark:text-white tracking-tight">
            <CountUpNumber
              value={stats.totalBudgetCollected}
              durationMs={400}
              formatter={(v) => formatKES(v)}
            />
          </p>
          <p className="mt-1 text-xs font-medium text-[#1A6BFF] dark:text-[#2B7FFF]">
            Collected via M-Pesa
          </p>
        </SpotlightCard>

        <SpotlightCard>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#0A1E5C]/65 dark:text-white/65">
              Paid Guests
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F0F6FF] dark:bg-[#1A2D5E] text-[#1A6BFF] dark:text-[#2B7FFF]">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2.5 text-xl sm:text-2xl font-extrabold text-[#0A1E5C] dark:text-white tracking-tight">
            {stats.paidGuests} / {stats.totalGuests}
          </p>
          <p className="mt-1 text-xs font-medium text-[#1A6BFF] dark:text-[#2B7FFF]">
            {stats.totalGuests > 0
              ? Math.round((stats.paidGuests / stats.totalGuests) * 100)
              : 0}
            % confirmed
          </p>
        </SpotlightCard>
      </div>

      {/* Big CTA Banner: + Create New Room */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0B2E8F] via-[#1A6BFF] to-[#2B7FFF] p-6 sm:p-7 text-white shadow-monte">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur-sm">
              Plan it. Invite them. Monte it.
            </span>
            <h2 className="mt-2.5 text-xl sm:text-2xl font-extrabold">
              Got a roadtrip, birthday, or beach getaway in mind?
            </h2>
            <p className="mt-1 text-sm text-white/85 max-w-xl">
              Spin up a Monte Room in 3 quick steps — split costs per person, track M-Pesa confirmations, chat with the squad, and collect all event photos &amp; videos.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('create')}
            className="shrink-0 inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-[#0B2E8F] hover:bg-[#F0F6FF] px-6 py-3.5 text-sm font-extrabold shadow-lg transition active:scale-95"
          >
            <Plus className="h-5 w-5 stroke-[2.8]" />
            Create New Room
          </button>
        </div>
      </div>

      {/* Get the Monte Events Native Android App Card (hidden inside native app) */}
      <DownloadAppCard />

      {/* Section: Available Events Planned */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#0A1E5C] dark:text-white">
              Available Events Planned
            </h2>
            <p className="text-xs sm:text-sm text-[#0A1E5C]/65 dark:text-white/65">
              Jump into a room to confirm payments, check budgets, or chat with friends.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('rooms')}
            className="text-xs sm:text-sm font-bold text-[#1A6BFF] dark:text-[#2B7FFF] hover:underline inline-flex items-center gap-1"
          >
            View all
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] p-10 text-center space-y-3">
            <p className="text-sm font-bold text-[#0A1E5C] dark:text-white">
              {events.length === 0
                ? 'No event rooms created yet'
                : `No events match “${searchQuery}”`}
            </p>
            <p className="text-xs text-[#0A1E5C]/65 dark:text-white/65 max-w-sm mx-auto">
              {events.length === 0
                ? 'Start fresh by creating your first event room — invite friends, split costs, and chat in one place.'
                : 'Try a different keyword or clear the search filter.'}
            </p>
            {events.length === 0 ? (
              <button
                type="button"
                onClick={() => onNavigate('create')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1A6BFF] hover:bg-[#2B7FFF] px-5 py-2.5 text-xs font-extrabold text-white shadow-monte transition"
              >
                <Plus className="h-4 w-4" />
                Create New Room
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="rounded-xl bg-[#1A6BFF] px-4 py-2 text-xs font-bold text-white"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {filteredEvents.map((event) => {
              const paidCount = event.guests.filter((g) => g.paid).length;
              const totalCount = event.guests.length;
              const paidPct =
                totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;

              return (
                <motion.div
                  key={event.id}
                  whileHover={{ y: -3 }}
                  transition={SPRING_SNAPPY}
                  className="group overflow-hidden rounded-3xl border border-[#D6E6FF] dark:border-[#2B7FFF]/20 bg-white dark:bg-[#13224A] shadow-sm hover:shadow-monte dark:hover:shadow-monte-dark transition-shadow flex flex-col"
                >
                  {/* Cover image / gradient */}
                  <div
                    className={`relative h-44 bg-gradient-to-br ${event.coverGradient} overflow-hidden`}
                  >
                    {event.coverImage && (
                      <img
                        src={event.coverImage}
                        alt={event.name}
                        className="h-full w-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A1430]/85 via-[#0A1430]/20 to-transparent" />

                    {/* Top badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                      <span className="rounded-full bg-[#1A6BFF]/90 backdrop-blur-sm px-3 py-1 text-[11px] font-extrabold text-white">
                        {event.customType || event.type}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/95 dark:bg-[#0A1430]/90 px-3 py-1 text-[11px] font-bold text-[#0A1E5C] dark:text-white shadow">
                        <Calendar className="h-3 w-3 text-[#1A6BFF] dark:text-[#2B7FFF]" />
                        {formatDateShort(event.date)}
                      </span>
                    </div>

                    {/* Title overlay */}
                    <div className="absolute bottom-3 left-3.5 right-3.5">
                      <h3 className="text-lg font-extrabold text-white leading-snug line-clamp-1">
                        {event.name}
                      </h3>
                      <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-white/85">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </p>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="rounded-xl bg-[#F0F6FF] dark:bg-[#0B1A3A] p-2.5">
                        <span className="text-[#0A1E5C]/60 dark:text-white/60 font-semibold block">
                          Spots Confirmed
                        </span>
                        <span className="mt-0.5 font-extrabold text-sm text-[#0A1E5C] dark:text-white inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-[#1A6BFF] dark:text-[#2B7FFF]" />
                          {paidCount} / {event.maxGuests.toLocaleString()}
                        </span>
                      </div>
                      <div className="rounded-xl bg-[#F0F6FF] dark:bg-[#0B1A3A] p-2.5">
                        <span className="text-[#0A1E5C]/60 dark:text-white/60 font-semibold block">
                          Cost / Person
                        </span>
                        <span className="mt-0.5 font-extrabold text-sm text-[#1A6BFF] dark:text-[#2B7FFF] block">
                          {formatKES(event.costPerPerson)}
                        </span>
                      </div>
                    </div>

                    {/* Paid Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                        <span className="text-[#0A1E5C]/75 dark:text-white/75">
                          Paid Progress
                        </span>
                        <span className="text-[#1A6BFF] dark:text-[#2B7FFF]">
                          {paidCount}/{totalCount} Paid ({paidPct}%)
                        </span>
                      </div>
                      <ScrollProgressBar percent={paidPct} />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onOpenEvent(event.id, 'guests')}
                        className="flex-1 rounded-xl bg-[#1A6BFF] hover:bg-[#2B7FFF] py-2.5 px-4 text-xs sm:text-sm font-extrabold text-white shadow-sm transition active:scale-95"
                      >
                        Open Room
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenEvent(event.id, 'chat')}
                        className="relative inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/35 bg-[#F0F6FF] dark:bg-[#0B1A3A] px-3.5 py-2.5 text-xs font-bold text-[#0A1E5C] dark:text-white hover:border-[#1A6BFF] transition"
                        title="Open Event Chat"
                      >
                        <MessageCircle className="h-4 w-4 text-[#1A6BFF] dark:text-[#2B7FFF]" />
                        <span>Chat</span>
                        {event.unreadCount > 0 && (
                          <span className="absolute -top-2 -right-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#1A6BFF] dark:bg-[#2B7FFF] px-1.5 text-[10px] font-extrabold text-white ring-2 ring-white dark:ring-[#13224A]">
                            {event.unreadCount}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* Section: Your Media Vault */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#0A1E5C] dark:text-white">
              Your Media Vault
            </h2>
            <p className="text-xs sm:text-sm text-[#0A1E5C]/65 dark:text-white/65">
              Photos &amp; videos captured across your Monte Events rooms.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('media')}
            className="text-xs sm:text-sm font-bold text-[#1A6BFF] dark:text-[#2B7FFF] hover:underline inline-flex items-center gap-1"
          >
            Open Vault
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>

        {media.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] p-8 text-center">
            <p className="text-sm font-bold text-[#0A1E5C] dark:text-white">
              Your Media Vault is empty
            </p>
            <p className="mt-1 text-xs text-[#0A1E5C]/65 dark:text-white/65">
              Photos and videos uploaded in your event rooms will appear here.
            </p>
          </div>
        ) : (
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0 sm:grid sm:grid-cols-3 lg:grid-cols-6 sm:overflow-visible">
          {media.slice(0, 6).map((item) => (
            <motion.button
              key={item.id}
              type="button"
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.97 }}
              transition={SPRING_SNAPPY}
              onClick={() => onSelectMedia(item)}
              className="group relative shrink-0 w-36 sm:w-auto snap-start aspect-[4/5] overflow-hidden rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-gradient-to-br from-[#0B2E8F] to-[#1A6BFF] text-left shadow-sm"
            >
              <img
                src={item.thumbnail}
                alt={item.title}
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A1430]/85 via-transparent to-transparent" />
              {item.type === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.span
                    whileHover={{ scale: 1.18 }}
                    transition={SPRING_POP}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1A6BFF]/90 text-white shadow-lg ring-4 ring-white/30 group-hover:scale-110 transition-transform"
                  >
                    <Play className="h-5 w-5 fill-white ml-0.5" />
                  </motion.span>
                </div>
              )}
              {item.type === 'video' && item.duration && (
                <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-[#0A1430]/75 px-2 py-0.5 text-[10px] font-bold text-white">
                  <Film className="h-2.5 w-2.5" />
                  {item.duration}
                </span>
              )}
              <div className="absolute bottom-2.5 left-2.5 right-2.5">
                <p className="truncate text-xs font-bold text-white">{item.title}</p>
                <p className="truncate text-[10px] text-white/75">{item.eventName}</p>
              </div>
            </motion.button>
          ))}
        </div>
        )}
      </section>
    </div>
  );
};
