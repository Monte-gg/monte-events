import React, { useMemo, useState } from 'react';
import {
  Calendar,
  MapPin,
  RefreshCw,
  Search,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { EventType, MonteEvent, PlatformMember } from '../types';
import { ThemeToggle } from './ThemeToggle';
import { SPRING_SNAPPY } from './MotionPrimitives';

interface MembersPageProps {
  members: PlatformMember[];
  events: MonteEvent[];
  currentUserEmail?: string;
  loading?: boolean;
  onRefresh: () => void;
  onInviteMemberToRoom: (roomId: string, member: PlatformMember) => void;
  onCreateRoom: () => void;
}

const FILTER_VIBES: ('All' | EventType)[] = [
  'All',
  'Roadtrip',
  'Birthday',
  'Beach Trip',
  'Hiking',
  'Concert',
];

const AVATAR_COLORS = [
  '#1A6BFF',
  '#0B2E8F',
  '#2B7FFF',
  '#1554CC',
  '#1D4ED8',
  '#2563EB',
];

export const MembersPage: React.FC<MembersPageProps> = ({
  members,
  events,
  currentUserEmail,
  loading = false,
  onRefresh,
  onInviteMemberToRoom,
  onCreateRoom,
}) => {
  const [search, setSearch] = useState('');
  const [vibeFilter, setVibeFilter] = useState<'All' | EventType>('All');
  const [invitingMember, setInvitingMember] = useState<PlatformMember | null>(
    null
  );

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (vibeFilter !== 'All' && !m.preferredTypes.includes(vibeFilter)) {
        return false;
      }
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.username.toLowerCase().includes(q) ||
        m.location.toLowerCase().includes(q) ||
        m.bio.toLowerCase().includes(q)
      );
    });
  }, [members, search, vibeFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-extrabold text-[#0A1E5C] dark:text-white">
              Monte Members
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#D6E6FF] dark:bg-[#13224A] border border-[#1A6BFF]/25 px-3 py-0.5 text-xs font-extrabold text-[#1A6BFF] dark:text-[#2B7FFF]">
              <Users className="h-3.5 w-3.5" />
              {members.length} on platform
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#0A1E5C]/65 dark:text-white/65 mt-0.5">
            Discover people on MONTE EVENTS and invite them directly to your roadtrips &amp; event rooms.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] px-3.5 py-2 text-xs font-bold text-[#0A1E5C] dark:text-white hover:border-[#1A6BFF] transition disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-[#1A6BFF] ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Search & Vibe Filter Pills */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1A6BFF]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members by name, @username, or city..."
            className="w-full rounded-full border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] pl-10 pr-4 py-2 text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTER_VIBES.map((vibe) => {
            const active = vibeFilter === vibe;
            return (
              <button
                key={vibe}
                type="button"
                onClick={() => setVibeFilter(vibe)}
                className={`relative rounded-full px-3.5 py-1.5 text-xs font-extrabold transition-colors ${
                  active
                    ? 'text-white'
                    : 'bg-white dark:bg-[#13224A] border border-[#D6E6FF] dark:border-[#2B7FFF]/25 text-[#0A1E5C]/75 dark:text-white/75 hover:border-[#1A6BFF]'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="members-filter-pill"
                    transition={SPRING_SNAPPY}
                    className="absolute inset-0 rounded-full bg-[#1A6BFF] shadow-sm"
                  />
                )}
                <span className="relative z-10">{vibe}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Members Grid */}
      {loading && members.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-48 rounded-3xl border border-[#D6E6FF] dark:border-[#2B7FFF]/20 bg-white dark:bg-[#13224A] p-5 animate-pulse"
            />
          ))}
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] p-12 text-center space-y-2">
          <Users className="mx-auto h-9 w-9 text-[#1A6BFF]" />
          <p className="text-sm font-extrabold text-[#0A1E5C] dark:text-white">
            {members.length === 0
              ? 'No other members found yet'
              : 'No members match your search'}
          </p>
          <p className="text-xs text-[#0A1E5C]/65 dark:text-white/65 max-w-sm mx-auto">
            {members.length === 0
              ? 'As more people sign up on MONTE EVENTS, they will appear right here.'
              : 'Try clearing your search or switching to All.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member, idx) => {
            const isMe =
              Boolean(currentUserEmail) &&
              Boolean(member.email) &&
              member.email!.toLowerCase() === currentUserEmail!.toLowerCase();
            const bgColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];

            return (
              <motion.div
                key={member.id}
                whileHover={{ y: -3 }}
                transition={SPRING_SNAPPY}
                className="rounded-3xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-white dark:bg-[#13224A] p-5 shadow-sm hover:shadow-monte dark:hover:shadow-monte-dark transition-shadow flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  {/* Top row: Avatar + Name + Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="h-12 w-12 shrink-0 rounded-2xl overflow-hidden flex items-center justify-center text-white font-extrabold text-sm shadow-sm ring-2 ring-[#1A6BFF]/25"
                        style={{ backgroundColor: bgColor }}
                      >
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span>{member.initials}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="truncate text-sm sm:text-base font-extrabold text-[#0A1E5C] dark:text-white">
                            {member.name}
                          </h3>
                          {isMe && (
                            <span className="shrink-0 rounded-full bg-[#1A6BFF]/15 px-2 py-0.5 text-[10px] font-extrabold text-[#1A6BFF] dark:text-[#2B7FFF]">
                              You
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs font-semibold text-[#1A6BFF] dark:text-[#2B7FFF]">
                          @{member.username}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  <p className="text-xs text-[#0A1E5C]/75 dark:text-white/75 line-clamp-2 leading-relaxed">
                    {member.bio || 'Monte Events community member.'}
                  </p>

                  {/* Meta: Location & Member Since */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-[#0A1E5C]/60 dark:text-white/60">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-[#1A6BFF] dark:text-[#2B7FFF]" />
                      {member.location}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-[#1A6BFF] dark:text-[#2B7FFF]" />
                      Joined {member.memberSince}
                    </span>
                  </div>

                  {/* Preferred Event Vibes */}
                  <div className="flex flex-wrap gap-1.5">
                    {member.preferredTypes.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-[#F0F6FF] dark:bg-[#0B1A3A] border border-[#D6E6FF] dark:border-[#2B7FFF]/20 px-2.5 py-0.5 text-[10px] font-bold text-[#0B2E8F] dark:text-[#D6E6FF]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action button */}
                {!isMe && (
                  <button
                    type="button"
                    onClick={() => setInvitingMember(member)}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1A6BFF] hover:bg-[#2B7FFF] py-2.5 px-4 text-xs font-extrabold text-white shadow-sm transition active:scale-95"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Invite to Room
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Invite Member to Room Modal */}
      {invitingMember && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0A1430]/75 backdrop-blur-sm p-4"
          onClick={() => setInvitingMember(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={SPRING_SNAPPY}
            className="w-full max-w-md rounded-3xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#D6E6FF] dark:border-[#2B7FFF]/20">
              <div>
                <h2 className="text-base font-extrabold text-[#0A1E5C] dark:text-white">
                  Invite {invitingMember.name}
                </h2>
                <p className="text-xs text-[#0A1E5C]/60 dark:text-white/60">
                  Choose an event room to add @{invitingMember.username} to
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle compact />
                <button
                  type="button"
                  onClick={() => setInvitingMember(null)}
                  className="rounded-full p-1.5 text-[#0A1E5C]/60 dark:text-white/60 hover:bg-[#F0F6FF] dark:hover:bg-[#1A2D5E]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {events.length === 0 ? (
              <div className="py-5 text-center space-y-3">
                <p className="text-xs text-[#0A1E5C]/70 dark:text-white/70">
                  You don’t have any event rooms yet. Create one first!
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setInvitingMember(null);
                    onCreateRoom();
                  }}
                  className="rounded-xl bg-[#1A6BFF] hover:bg-[#2B7FFF] px-5 py-2.5 text-xs font-extrabold text-white"
                >
                  + Create New Room
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {events.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => {
                      onInviteMemberToRoom(ev.id, invitingMember);
                      setInvitingMember(null);
                    }}
                    className="w-full flex items-center justify-between gap-3 rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] hover:border-[#1A6BFF] p-3 text-left transition"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-[#0A1E5C] dark:text-white">
                        {ev.name}
                      </p>
                      <p className="truncate text-[11px] text-[#0A1E5C]/60 dark:text-white/60">
                        {ev.location} · {ev.guests.length} guests
                      </p>
                    </div>
                    <span className="shrink-0 rounded-xl bg-[#1A6BFF] px-3 py-1.5 text-xs font-extrabold text-white">
                      Invite
                    </span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};
