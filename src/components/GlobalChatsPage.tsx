import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  MapPin,
  MessageCircle,
  Search,
  Send,
  Smile,
  UserPlus,
  Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  ChatMessage,
  DirectMessage,
  Guest,
  MediaItem,
  MonteEvent,
  PlatformMember,
  UserProfile,
} from '../types';
import { EventChatRoom } from './EventChatRoom';
import { ThemeToggle } from './ThemeToggle';
import { SPRING_SNAPPY } from './MotionPrimitives';

const QUICK_EMOJIS = ['🔥', '🎉', '🚗', '🏖️', '🎶', '🙌', '😂', '❤️', '👍', '📸'];

interface GlobalChatsPageProps {
  events: MonteEvent[];
  messagesByEvent: Record<string, ChatMessage[]>;
  media: MediaItem[];
  user: UserProfile;
  activeChatEventId: string | null;
  typingByEvent: Record<string, string | null>;
  friends: PlatformMember[];
  directMessagesByFriend: Record<string, DirectMessage[]>;
  activeChatSection: 'events' | 'friends';
  activeFriendId: string | null;
  onChangeChatSection: (section: 'events' | 'friends') => void;
  onSelectChatEvent: (eventId: string) => void;
  onSelectFriend: (friendId: string) => void;
  onSendMessage: (
    eventId: string,
    text: string,
    options?: {
      replyTo?: { id: string; senderName: string; text: string };
      media?: { type: 'photo' | 'video'; url: string; title?: string };
    }
  ) => void;
  onSendDirectMessage: (friendId: string, text: string) => void;
  onToggleReaction: (eventId: string, messageId: string, emoji: string) => void;
  onTogglePin: (eventId: string, messageId: string) => void;
  onAddGuestToEvent: (eventId: string, guest: Guest) => void;
  onSelectMedia: (item: MediaItem) => void;
  onViewMemberProfile: (member: PlatformMember) => void;
  onGoToMembers: () => void;
  onShowToast: (msg: string) => void;
}

export const GlobalChatsPage: React.FC<GlobalChatsPageProps> = ({
  events,
  messagesByEvent,
  media,
  user,
  activeChatEventId,
  typingByEvent,
  friends,
  directMessagesByFriend,
  activeChatSection,
  activeFriendId,
  onChangeChatSection,
  onSelectChatEvent,
  onSelectFriend,
  onSendMessage,
  onSendDirectMessage,
  onToggleReaction,
  onTogglePin,
  onAddGuestToEvent,
  onSelectMedia,
  onViewMemberProfile,
  onGoToMembers,
  onShowToast,
}) => {
  const [search, setSearch] = useState('');
  const [mobileShowChat, setMobileShowChat] = useState(
    Boolean(
      activeChatSection === 'friends' ? activeFriendId : activeChatEventId
    )
  );
  const [dmText, setDmText] = useState('');
  const [showDmEmoji, setShowDmEmoji] = useState(false);
  const dmBottomRef = useRef<HTMLDivElement>(null);

  const selectedEventId = activeChatEventId || events[0]?.id || null;
  const selectedEvent = events.find((e) => e.id === selectedEventId) || null;

  const selectedFriendId = activeFriendId || friends[0]?.id || null;
  const selectedFriend = friends.find((f) => f.id === selectedFriendId) || null;
  const activeDms = selectedFriend
    ? directMessagesByFriend[selectedFriend.id] || []
    : [];

  useEffect(() => {
    dmBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeDms.length, selectedFriendId]);

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return events;
    return events.filter((e) => e.name.toLowerCase().includes(q));
  }, [events, search]);

  const filteredFriends = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.username.toLowerCase().includes(q)
    );
  }, [friends, search]);

  const handleOpenEventChat = (eventId: string) => {
    onSelectChatEvent(eventId);
    setMobileShowChat(true);
  };

  const handleOpenFriendChat = (friendId: string) => {
    onSelectFriend(friendId);
    setMobileShowChat(true);
  };

  const handleSendDm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFriend) return;
    const isGuest = user.memberSince === 'Preview Mode';
    if (isGuest) {
      onSendDirectMessage(selectedFriend.id, dmText.trim());
      return;
    }
    if (!dmText.trim()) return;
    onSendDirectMessage(selectedFriend.id, dmText.trim());
    setDmText('');
    setShowDmEmoji(false);
  };

  return (
    <div className="w-full h-full flex-1 min-h-0 flex flex-col p-2 sm:p-3 lg:p-4 overflow-hidden animate-slide-up">
      {/* Full-height spacious split chat centre */}
      <div className="flex-1 min-h-0 flex gap-3 overflow-hidden">
        {/* Left: Events & Friends Chat List Sidebar */}
        <div
          className={`w-full lg:w-72 xl:w-80 shrink-0 h-full min-h-0 flex flex-col rounded-3xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-white dark:bg-[#13224A] overflow-hidden shadow-sm ${
            mobileShowChat ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="shrink-0 p-3.5 border-b border-[#D6E6FF] dark:border-[#2B7FFF]/20 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-lg font-extrabold text-[#0A1E5C] dark:text-white">
                Chats
              </h1>
              <div className="hidden sm:block">
                <ThemeToggle compact />
              </div>
            </div>

            {/* Gliding Events | Friends Switcher */}
            <div className="grid grid-cols-2 rounded-2xl bg-[#F0F6FF] dark:bg-[#0A1430] p-1">
              {(
                [
                  { id: 'events', label: `Events (${events.length})` },
                  { id: 'friends', label: `Friends (${friends.length})` },
                ] as const
              ).map((tab) => {
                const active = activeChatSection === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      onChangeChatSection(tab.id);
                      setMobileShowChat(false);
                    }}
                    className={`relative rounded-xl py-1.5 text-xs font-extrabold transition-colors ${
                      active
                        ? 'text-white'
                        : 'text-[#0A1E5C]/70 dark:text-white/70 hover:text-[#1A6BFF]'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="chat-section-pill"
                        transition={SPRING_SNAPPY}
                        className="absolute inset-0 rounded-xl bg-[#1A6BFF] shadow-xs"
                      />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1A6BFF]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  activeChatSection === 'friends'
                    ? 'Search friends...'
                    : 'Search event chats...'
                }
                className="w-full rounded-full border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/70 dark:bg-[#0B1A3A] pl-10 pr-4 py-2 text-xs sm:text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
              />
            </div>
          </div>

          {/* List Body */}
          {activeChatSection === 'events' ? (
            <div className="flex-1 min-h-0 divide-y divide-[#D6E6FF]/60 dark:divide-[#2B7FFF]/15 overflow-y-auto">
              {filteredEvents.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#0A1E5C]/65 dark:text-white/65">
                  No event chats yet. Create a room to start chatting with your squad.
                </div>
              ) : (
                filteredEvents.map((ev) => {
                  const msgs = messagesByEvent[ev.id] || [];
                  const lastMsg = msgs[msgs.length - 1];
                  const isSelected = ev.id === selectedEventId;
                  const onlineCount =
                    ev.guests.filter((g) => g.online).length + 1;

                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => handleOpenEventChat(ev.id)}
                      className={`w-full flex items-start gap-3 p-3.5 text-left transition ${
                        isSelected
                          ? 'bg-[#F0F6FF] dark:bg-[#1A2D5E]'
                          : 'hover:bg-[#F0F6FF]/60 dark:hover:bg-[#0B1A3A]'
                      }`}
                    >
                      <div
                        className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${ev.coverGradient} text-white font-extrabold text-sm shadow-sm`}
                      >
                        {ev.name.slice(0, 2).toUpperCase()}
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-[#13224A]" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-extrabold text-[#0A1E5C] dark:text-white">
                            {ev.name}
                          </p>
                          <span className="shrink-0 text-[11px] font-semibold text-[#0A1E5C]/50 dark:text-white/50">
                            {lastMsg?.timestamp || 'New'}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-[#0A1E5C]/70 dark:text-white/70">
                          {lastMsg
                            ? `${lastMsg.isMe ? 'You' : lastMsg.senderName.split(' ')[0]}: ${lastMsg.text}`
                            : 'No messages yet — say hi!'}
                        </p>
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <Users className="h-3 w-3" />
                            {onlineCount} online
                          </span>
                          {ev.unreadCount > 0 && (
                            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#1A6BFF] dark:bg-[#2B7FFF] px-1.5 text-[10px] font-extrabold text-white">
                              {ev.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="flex-1 min-h-0 divide-y divide-[#D6E6FF]/60 dark:divide-[#2B7FFF]/15 overflow-y-auto">
                {filteredFriends.length === 0 ? (
                  <div className="p-6 text-center space-y-3">
                    <p className="text-xs font-bold text-[#0A1E5C] dark:text-white">
                      {friends.length === 0
                        ? 'No friends added yet'
                        : 'No friends match your search'}
                    </p>
                    <p className="text-[11px] text-[#0A1E5C]/65 dark:text-white/65">
                      Add people from the Members area to start direct chats!
                    </p>
                    <button
                      type="button"
                      onClick={onGoToMembers}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#1A6BFF] hover:bg-[#2B7FFF] px-4 py-2 text-xs font-extrabold text-white transition"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Find Members
                    </button>
                  </div>
                ) : (
                  filteredFriends.map((friend) => {
                    const dms = directMessagesByFriend[friend.id] || [];
                    const lastDm = dms[dms.length - 1];
                    const isSelected = friend.id === selectedFriendId;

                    return (
                      <button
                        key={friend.id}
                        type="button"
                        onClick={() => handleOpenFriendChat(friend.id)}
                        className={`w-full flex items-start gap-3 p-3.5 text-left transition ${
                          isSelected
                            ? 'bg-[#F0F6FF] dark:bg-[#1A2D5E]'
                            : 'hover:bg-[#F0F6FF]/60 dark:hover:bg-[#0B1A3A]'
                        }`}
                      >
                        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl overflow-hidden bg-[#1A6BFF] text-white font-extrabold text-sm shadow-sm">
                          {friend.avatarUrl ? (
                            <img
                              src={friend.avatarUrl}
                              alt={friend.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span>{friend.initials}</span>
                          )}
                          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-[#13224A]" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-extrabold text-[#0A1E5C] dark:text-white">
                              {friend.name}
                            </p>
                            <span className="shrink-0 text-[11px] font-semibold text-[#0A1E5C]/50 dark:text-white/50">
                              {lastDm?.timestamp || 'Friend'}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-[#0A1E5C]/70 dark:text-white/70">
                            {lastDm
                              ? `${lastDm.isMe ? 'You' : friend.name.split(' ')[0]}: ${lastDm.text}`
                              : `@${friend.username} · Say hi!`}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="shrink-0 p-3 border-t border-[#D6E6FF] dark:border-[#2B7FFF]/20">
                <button
                  type="button"
                  onClick={onGoToMembers}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/35 bg-[#F0F6FF] dark:bg-[#0B1A3A] hover:border-[#1A6BFF] py-2 text-xs font-extrabold text-[#1A6BFF] dark:text-[#2B7FFF] transition"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Add More Friends
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Active Event Chat Room OR Direct Friend Chat */}
        <div
          className={`flex-1 min-w-0 h-full min-h-0 ${
            mobileShowChat ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'
          }`}
        >
          {activeChatSection === 'events' ? (
            selectedEvent ? (
              <EventChatRoom
                event={selectedEvent}
                messages={messagesByEvent[selectedEvent.id] || []}
                media={media.filter((m) => m.eventId === selectedEvent.id)}
                user={user}
                typingUser={typingByEvent[selectedEvent.id] || null}
                onSendMessage={onSendMessage}
                onToggleReaction={onToggleReaction}
                onTogglePin={onTogglePin}
                onAddGuestToEvent={onAddGuestToEvent}
                onSelectMedia={onSelectMedia}
                onBack={() => setMobileShowChat(false)}
                onShowToast={onShowToast}
                className="h-full flex-1"
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center rounded-3xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-white dark:bg-[#13224A] p-12 text-center">
                <MessageCircle className="mx-auto h-10 w-10 text-[#1A6BFF]" />
                <p className="mt-3 text-sm font-bold text-[#0A1E5C] dark:text-white">
                  Select an event chat to start messaging
                </p>
              </div>
            )
          ) : selectedFriend ? (
            /* 1-on-1 Friend Direct Message Thread */
            <div className="flex flex-col h-full flex-1 min-h-0 rounded-3xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-white dark:bg-[#13224A] overflow-hidden shadow-sm">
              {/* Friend Header */}
              <div className="shrink-0 flex items-center justify-between gap-2 border-b border-[#D6E6FF] dark:border-[#2B7FFF]/20 bg-white dark:bg-[#0B1A3A] px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setMobileShowChat(false)}
                    className="lg:hidden rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 px-2.5 py-1.5 text-xs font-bold text-[#0A1E5C] dark:text-white"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => onViewMemberProfile(selectedFriend)}
                    className="flex items-center gap-3 min-w-0 text-left group"
                  >
                    <div className="relative h-10 w-10 shrink-0 rounded-2xl overflow-hidden bg-[#1A6BFF] flex items-center justify-center text-white font-extrabold text-sm ring-2 ring-transparent group-hover:ring-[#1A6BFF] transition">
                      {selectedFriend.avatarUrl ? (
                        <img
                          src={selectedFriend.avatarUrl}
                          alt={selectedFriend.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>{selectedFriend.initials}</span>
                      )}
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-[#0B1A3A]" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm sm:text-base font-extrabold text-[#0A1E5C] dark:text-white group-hover:text-[#1A6BFF] dark:group-hover:text-[#2B7FFF] transition-colors">
                        {selectedFriend.name}
                      </h3>
                      <p className="truncate text-[11px] font-semibold text-[#0A1E5C]/65 dark:text-white/65 inline-flex items-center gap-1.5">
                        <span>@{selectedFriend.username}</span>
                        <span>•</span>
                        <MapPin className="h-3 w-3 text-[#1A6BFF]" />
                        <span>{selectedFriend.location}</span>
                      </p>
                    </div>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => onViewMemberProfile(selectedFriend)}
                  className="shrink-0 rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF] dark:bg-[#13224A] hover:border-[#1A6BFF] px-3 py-1.5 text-xs font-extrabold text-[#1A6BFF] dark:text-[#2B7FFF] transition"
                >
                  View Profile
                </button>
              </div>

              {/* DM Messages */}
              <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 space-y-3.5 bg-[#F0F6FF]/50 dark:bg-[#0A1430]/50">
                {activeDms.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-2">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1A6BFF]/15 text-[#1A6BFF] dark:text-[#2B7FFF] font-extrabold text-lg">
                      {selectedFriend.initials}
                    </div>
                    <p className="text-sm font-extrabold text-[#0A1E5C] dark:text-white">
                      Start a conversation with {selectedFriend.name}
                    </p>
                    <p className="text-xs text-[#0A1E5C]/65 dark:text-white/65 max-w-xs">
                      Plan roadtrips, coordinate rides, or invite them to your next MONTE EVENTS room.
                    </p>
                  </div>
                ) : (
                  activeDms.map((dm) => (
                    <div
                      key={dm.id}
                      className={`flex items-end gap-2.5 ${
                        dm.isMe ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {!dm.isMe && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1A6BFF] text-[11px] font-extrabold text-white">
                          {dm.senderInitials}
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] sm:max-w-[70%] flex flex-col ${
                          dm.isMe ? 'items-end' : 'items-start'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1 px-1">
                          <span className="text-[11px] font-bold text-[#0A1E5C]/70 dark:text-white/70">
                            {dm.isMe ? 'You' : dm.senderName}
                          </span>
                          <span className="text-[10px] text-[#0A1E5C]/45 dark:text-white/45">
                            {dm.timestamp}
                          </span>
                        </div>
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                            dm.isMe
                              ? 'bg-[#1A6BFF] text-white rounded-br-md'
                              : 'bg-white dark:bg-[#13224A] text-[#0A1E5C] dark:text-white border border-[#D6E6FF] dark:border-[#2B7FFF]/25 rounded-bl-md'
                          }`}
                        >
                          <p className="leading-relaxed whitespace-pre-wrap break-words">
                            {dm.text}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={dmBottomRef} />
              </div>

              {/* Emoji Bar */}
              {showDmEmoji && (
                <div className="shrink-0 border-t border-[#D6E6FF] dark:border-[#2B7FFF]/20 bg-white dark:bg-[#0B1A3A] px-4 py-2 flex flex-wrap gap-2">
                  {QUICK_EMOJIS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setDmText((prev) => prev + em)}
                      className="text-lg hover:scale-125 transition"
                    >
                      {em}
                    </button>
                  ))}
                </div>
              )}

              {/* DM Input */}
              <form
                onSubmit={handleSendDm}
                className="shrink-0 flex items-center gap-2 border-t border-[#D6E6FF] dark:border-[#2B7FFF]/20 bg-white dark:bg-[#0B1A3A] px-3 sm:px-4 py-3"
              >
                <button
                  type="button"
                  onClick={() => setShowDmEmoji((s) => !s)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#0A1E5C]/65 dark:text-white/65 hover:bg-[#F0F6FF] dark:hover:bg-[#13224A] hover:text-[#1A6BFF] transition"
                  title="Emoji"
                >
                  <Smile className="h-5 w-5" />
                </button>
                <input
                  type="text"
                  value={dmText}
                  onChange={(e) => setDmText(e.target.value)}
                  placeholder={`Message ${selectedFriend.name.split(' ')[0]}...`}
                  className="flex-1 rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/70 dark:bg-[#13224A] px-4 py-2.5 text-sm text-[#0A1E5C] dark:text-white placeholder:text-[#0A1E5C]/45 dark:placeholder:text-white/45 focus:border-[#1A6BFF] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!dmText.trim() && user.memberSince !== 'Preview Mode'}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1A6BFF] hover:bg-[#2B7FFF] disabled:opacity-45 text-white shadow-sm transition active:scale-95"
                  aria-label="Send direct message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center rounded-3xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-white dark:bg-[#13224A] p-12 text-center space-y-3">
              <Users className="mx-auto h-10 w-10 text-[#1A6BFF]" />
              <p className="text-sm font-extrabold text-[#0A1E5C] dark:text-white">
                Add friends from Monte Members to chat 1-on-1
              </p>
              <button
                type="button"
                onClick={onGoToMembers}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1A6BFF] hover:bg-[#2B7FFF] px-5 py-2.5 text-xs font-extrabold text-white shadow-monte transition"
              >
                <UserPlus className="h-4 w-4" />
                Browse Members
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
