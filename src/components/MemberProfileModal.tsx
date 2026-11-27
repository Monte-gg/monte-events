import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Check,
  MapPin,
  MessageCircle,
  Sparkles,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { MonteEvent, PlatformMember } from '../types';
import { ThemeToggle } from './ThemeToggle';
import { SPRING_SNAPPY } from './MotionPrimitives';

interface MemberProfileModalProps {
  member: PlatformMember | null;
  isFriend: boolean;
  isMe: boolean;
  events: MonteEvent[];
  onClose: () => void;
  onAddFriend: (member: PlatformMember) => void;
  onStartChat: (member: PlatformMember) => void;
  onInviteToRoom: (roomId: string, member: PlatformMember) => void;
  onOpenEvent: (eventId: string) => void;
}

export const MemberProfileModal: React.FC<MemberProfileModalProps> = ({
  member,
  isFriend,
  isMe,
  events,
  onClose,
  onAddFriend,
  onStartChat,
  onInviteToRoom,
  onOpenEvent,
}) => {
  const [showRoomPicker, setShowRoomPicker] = useState(false);

  useEffect(() => {
    setShowRoomPicker(false);
  }, [member?.id]);

  useEffect(() => {
    if (!member) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [member, onClose]);

  const sharedEvents = member
    ? events.filter((ev) =>
        ev.guests.some(
          (g) =>
            (member.email &&
              g.email &&
              g.email.toLowerCase() === member.email.toLowerCase()) ||
            g.name.toLowerCase() === member.name.toLowerCase()
        )
      )
    : [];

  return (
    <AnimatePresence>
      {member && (
        <motion.div
          key="member-profile-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[92] flex items-center justify-center bg-[#0A1430]/75 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            key="member-profile-card"
            initial={{ opacity: 0, scale: 0.93, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={SPRING_SNAPPY}
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cover Banner */}
            <div className="relative h-32 bg-gradient-to-r from-[#0B2E8F] via-[#1A6BFF] to-[#2B7FFF] px-4 py-3 flex items-start justify-between">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm px-3 py-1 text-[11px] font-extrabold text-white">
                <img src="./favicon.svg" alt="" className="h-4 w-4" />
                MONTE MEMBER
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle compact />
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close profile"
                  className="rounded-full bg-white/15 hover:bg-white/25 p-1.5 text-white transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 pb-6">
              {/* Avatar & Name */}
              <div className="relative -mt-12 flex items-end justify-between gap-3">
                <div className="h-24 w-24 rounded-3xl overflow-hidden border-4 border-white dark:border-[#13224A] bg-[#1A6BFF] text-white flex items-center justify-center text-2xl font-extrabold shadow-lg">
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
                {isFriend && !isMe && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3.5 w-3.5" />
                    Friends
                  </span>
                )}
              </div>

              <div className="mt-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-extrabold text-[#0A1E5C] dark:text-white">
                    {member.name}
                  </h2>
                  {isMe && (
                    <span className="rounded-full bg-[#1A6BFF]/15 px-2.5 py-0.5 text-[11px] font-extrabold text-[#1A6BFF] dark:text-[#2B7FFF]">
                      You
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm font-bold text-[#1A6BFF] dark:text-[#2B7FFF]">
                  @{member.username}
                </p>
              </div>

              <p className="mt-3 text-sm text-[#0A1E5C]/80 dark:text-white/80 leading-relaxed">
                {member.bio || 'Monte Events community member.'}
              </p>

              {/* Location & Member Since */}
              <div className="mt-3.5 flex flex-wrap items-center gap-4 text-xs font-semibold text-[#0A1E5C]/65 dark:text-white/65">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-[#1A6BFF] dark:text-[#2B7FFF]" />
                  {member.location}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[#1A6BFF] dark:text-[#2B7FFF]" />
                  Joined {member.memberSince}
                </span>
              </div>

              {/* Preferred Event Vibes */}
              <div className="mt-5 space-y-2">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#0A1E5C]/55 dark:text-white/55 inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-[#1A6BFF]" />
                  Event Vibes
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {member.preferredTypes.map((type) => (
                    <span
                      key={type}
                      className="rounded-full bg-[#F0F6FF] dark:bg-[#0B1A3A] border border-[#D6E6FF] dark:border-[#2B7FFF]/25 px-3 py-1 text-xs font-bold text-[#0B2E8F] dark:text-[#D6E6FF]"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>

              {/* Shared Rooms */}
              {sharedEvents.length > 0 && (
                <div className="mt-5 space-y-2">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#0A1E5C]/55 dark:text-white/55">
                    Rooms Together ({sharedEvents.length})
                  </p>
                  <div className="space-y-1.5">
                    {sharedEvents.map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenEvent(ev.id);
                        }}
                        className="w-full flex items-center justify-between rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-[#F0F6FF]/70 dark:bg-[#0B1A3A] hover:border-[#1A6BFF] px-3.5 py-2 text-left transition"
                      >
                        <span className="truncate text-xs font-extrabold text-[#0A1E5C] dark:text-white">
                          {ev.name}
                        </span>
                        <span className="shrink-0 text-[11px] font-bold text-[#1A6BFF] dark:text-[#2B7FFF]">
                          Open →
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Inline Room Invite Picker */}
              {showRoomPicker && (
                <div className="mt-5 rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-[#F0F6FF]/70 dark:bg-[#0B1A3A] p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#0A1E5C] dark:text-white">
                      Select a room to invite {member.name.split(' ')[0]}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowRoomPicker(false)}
                      className="text-[11px] font-bold text-[#1A6BFF]"
                    >
                      Cancel
                    </button>
                  </div>
                  {events.length === 0 ? (
                    <p className="text-xs text-[#0A1E5C]/65 dark:text-white/65">
                      No rooms created yet. Create a room first!
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {events.map((ev) => (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => {
                            onInviteToRoom(ev.id, member);
                            setShowRoomPicker(false);
                          }}
                          className="w-full flex items-center justify-between rounded-xl bg-white dark:bg-[#13224A] border border-[#D6E6FF] dark:border-[#2B7FFF]/25 hover:border-[#1A6BFF] px-3 py-2 text-left text-xs font-bold text-[#0A1E5C] dark:text-white transition"
                        >
                          <span className="truncate">{ev.name}</span>
                          <span className="shrink-0 text-[#1A6BFF] dark:text-[#2B7FFF]">
                            + Invite
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Action Buttons */}
              {!isMe && (
                <div className="mt-6 grid grid-cols-2 gap-2.5 pt-4 border-t border-[#D6E6FF] dark:border-[#2B7FFF]/20">
                  {isFriend ? (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onStartChat(member);
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 py-3 text-xs sm:text-sm font-extrabold text-emerald-700 dark:text-emerald-300 transition active:scale-95"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Message Friend
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onAddFriend(member)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/35 bg-[#F0F6FF] dark:bg-[#0B1A3A] hover:border-[#1A6BFF] py-3 text-xs sm:text-sm font-extrabold text-[#0A1E5C] dark:text-white transition active:scale-95"
                    >
                      <UserCheck className="h-4 w-4 text-[#1A6BFF] dark:text-[#2B7FFF]" />
                      Add Friend
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowRoomPicker((s) => !s)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1A6BFF] hover:bg-[#2B7FFF] py-3 text-xs sm:text-sm font-extrabold text-white shadow-monte transition active:scale-95"
                  >
                    <UserPlus className="h-4 w-4" />
                    Invite to Room
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
