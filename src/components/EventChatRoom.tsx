import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Film,
  Image as ImageIcon,
  Paperclip,
  Pin,
  Play,
  Reply,
  Search,
  Send,
  Smile,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { ChatMessage, Guest, MediaItem, MonteEvent, UserProfile } from '../types';
import { SAMPLE_FRIENDS } from '../data/sampleData';
import { ThemeToggle } from './ThemeToggle';

const REACTION_EMOJIS = ['❤️', '😂', '🔥', '👍'];
const QUICK_EMOJIS = ['🔥', '🎉', '🚗', '🏖️', '🎶', '💸', '🙌', '😂', '❤️', '👍', '📸', '⛺'];

interface EventChatRoomProps {
  event: MonteEvent;
  messages: ChatMessage[];
  media: MediaItem[];
  user: UserProfile;
  typingUser?: string | null;
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
  onAddGuestToEvent: (eventId: string, guest: Guest) => void;
  onSelectMedia: (item: MediaItem) => void;
  onBack?: () => void;
  onShowToast: (msg: string) => void;
  className?: string;
}

export const EventChatRoom: React.FC<EventChatRoomProps> = ({
  event,
  messages,
  media,
  user,
  typingUser,
  onSendMessage,
  onToggleReaction,
  onTogglePin,
  onAddGuestToEvent,
  onSelectMedia,
  onBack,
  onShowToast,
  className = 'h-[72vh] min-h-[540px]',
}) => {
  const [text, setText] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPinned, setShowPinned] = useState(false);
  const [showSharedMedia, setShowSharedMedia] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [replyTo, setReplyTo] = useState<{
    id: string;
    senderName: string;
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, typingUser]);

  const onlineGuests = useMemo(
    () => event.guests.filter((g) => g.online),
    [event.guests]
  );

  const pinnedMessages = useMemo(
    () => messages.filter((m) => m.pinned),
    [messages]
  );

  const filteredMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter(
      (m) =>
        m.text.toLowerCase().includes(q) ||
        m.senderName.toLowerCase().includes(q)
    );
  }, [messages, searchQuery]);

  const availableFriendsToAdd = useMemo(() => {
    const existingNames = new Set(event.guests.map((g) => g.name.toLowerCase()));
    return SAMPLE_FRIENDS.filter((f) => !existingNames.has(f.name.toLowerCase()));
  }, [event.guests]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(event.id, text.trim(), {
      replyTo: replyTo || undefined,
    });
    setText('');
    setReplyTo(null);
    setShowEmojiPicker(false);
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    const url = URL.createObjectURL(file);
    onSendMessage(
      event.id,
      text.trim() || (isVideo ? `Shared a video: ${file.name}` : `Shared a photo: ${file.name}`),
      {
        replyTo: replyTo || undefined,
        media: {
          type: isVideo ? 'video' : 'photo',
          url,
          title: file.name,
        },
      }
    );
    setText('');
    setReplyTo(null);
    e.target.value = '';
  };

  const handleQuickInviteFriend = (friend: (typeof SAMPLE_FRIENDS)[number]) => {
    const newGuest: Guest = {
      id: `g-add-${Date.now()}-${friend.id}`,
      friendId: friend.id,
      name: friend.name,
      phone: friend.phone,
      email: friend.email,
      initials: friend.initials,
      avatarColor: friend.avatarColor,
      amount: event.costPerPerson,
      paid: false,
      online: friend.online,
    };
    onAddGuestToEvent(event.id, newGuest);
    onShowToast(`${friend.name} added to ${event.name}!`);
  };

  return (
    <div
      className={`relative flex flex-col min-h-0 rounded-3xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-white dark:bg-[#13224A] overflow-hidden shadow-sm ${className}`}
    >
      {/* Chat Header */}
      <div className="flex items-center justify-between gap-2 border-b border-[#D6E6FF] dark:border-[#2B7FFF]/20 bg-white dark:bg-[#0B1A3A] px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="lg:hidden rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 px-2.5 py-1.5 text-xs font-bold text-[#0A1E5C] dark:text-white"
            >
              Back
            </button>
          )}
          <div className="relative h-10 w-10 shrink-0 rounded-2xl bg-gradient-to-br from-[#0B2E8F] to-[#2B7FFF] flex items-center justify-center text-white font-extrabold text-sm shadow">
            {event.name.slice(0, 2).toUpperCase()}
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-[#0B1A3A]" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm sm:text-base font-extrabold text-[#0A1E5C] dark:text-white">
              {event.name}
            </h3>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-[#0A1E5C]/65 dark:text-white/65">
              <span>{event.guests.length + 1} members</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {onlineGuests.length + 1} online
              </span>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setSearchOpen((s) => !s)}
            className={`rounded-xl p-2 transition ${
              searchOpen
                ? 'bg-[#1A6BFF] text-white'
                : 'text-[#0A1E5C]/70 dark:text-white/70 hover:bg-[#F0F6FF] dark:hover:bg-[#13224A]'
            }`}
            title="Search messages"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowPinned((p) => !p)}
            className={`relative rounded-xl p-2 transition ${
              showPinned
                ? 'bg-[#1A6BFF] text-white'
                : 'text-[#0A1E5C]/70 dark:text-white/70 hover:bg-[#F0F6FF] dark:hover:bg-[#13224A]'
            }`}
            title={`Pinned messages (${pinnedMessages.length})`}
          >
            <Pin className="h-4 w-4" />
            {pinnedMessages.length > 0 && !showPinned && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#1A6BFF] px-1 text-[9px] font-extrabold text-white">
                {pinnedMessages.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowSharedMedia((m) => !m)}
            className={`relative rounded-xl p-2 transition ${
              showSharedMedia
                ? 'bg-[#1A6BFF] text-white'
                : 'text-[#0A1E5C]/70 dark:text-white/70 hover:bg-[#F0F6FF] dark:hover:bg-[#13224A]'
            }`}
            title={`Shared Media (${media.length})`}
          >
            <ImageIcon className="h-4 w-4" />
            {media.length > 0 && !showSharedMedia && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#2B7FFF] px-1 text-[9px] font-extrabold text-white">
                {media.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowAddFriend(true)}
            className="inline-flex items-center gap-1 rounded-xl bg-[#F0F6FF] dark:bg-[#13224A] border border-[#D6E6FF] dark:border-[#2B7FFF]/30 px-2.5 py-1.5 text-xs font-bold text-[#1A6BFF] dark:text-[#2B7FFF] hover:bg-[#D6E6FF]/60 transition"
            title="Add friend to event"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add</span>
          </button>
          <button
            type="button"
            onClick={() => setShowMembers(true)}
            className="rounded-xl p-2 text-[#0A1E5C]/70 dark:text-white/70 hover:bg-[#F0F6FF] dark:hover:bg-[#13224A] transition"
            title="View members & payment status"
          >
            <Users className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Compact single-line pinned banner when collapsed */}
      {!showPinned && pinnedMessages.length > 0 && (
        <button
          type="button"
          onClick={() => setShowPinned(true)}
          className="shrink-0 flex items-center justify-between gap-2 border-b border-[#D6E6FF] dark:border-[#2B7FFF]/20 bg-[#F0F6FF]/85 dark:bg-[#0A1430]/75 px-4 py-1.5 text-left hover:bg-[#D6E6FF]/50 dark:hover:bg-[#13224A] transition"
        >
          <span className="flex items-center gap-2 min-w-0 text-xs text-[#0A1E5C] dark:text-white">
            <Pin className="h-3.5 w-3.5 shrink-0 text-[#1A6BFF] dark:text-[#2B7FFF]" />
            <span className="truncate font-semibold">{pinnedMessages[0].text}</span>
          </span>
          <span className="shrink-0 text-[11px] font-bold text-[#1A6BFF] dark:text-[#2B7FFF]">
            {pinnedMessages.length > 1 ? `+${pinnedMessages.length - 1} pinned` : 'Pinned'}
          </span>
        </button>
      )}

      {/* Search Messages Bar */}
      {searchOpen && (
        <div className="flex items-center gap-2 border-b border-[#D6E6FF] dark:border-[#2B7FFF]/20 bg-[#F0F6FF]/80 dark:bg-[#0A1430] px-4 py-2">
          <Search className="h-4 w-4 text-[#1A6BFF]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages in this room..."
            autoFocus
            className="flex-1 bg-transparent text-xs sm:text-sm text-[#0A1E5C] dark:text-white placeholder:text-[#0A1E5C]/45 dark:placeholder:text-white/45 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs font-bold text-[#1A6BFF]"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Pinned Messages Strip */}
      {showPinned && pinnedMessages.length > 0 && (
        <div className="border-b border-[#D6E6FF] dark:border-[#2B7FFF]/20 bg-[#F0F6FF] dark:bg-[#0A1430]/80 px-4 py-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#1A6BFF] dark:text-[#2B7FFF]">
              <Pin className="h-3 w-3" />
              Pinned ({pinnedMessages.length})
            </span>
            <button
              type="button"
              onClick={() => setShowPinned(false)}
              className="text-[11px] font-semibold text-[#0A1E5C]/50 dark:text-white/50 hover:text-[#1A6BFF]"
            >
              Hide
            </button>
          </div>
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-1.5">
            {pinnedMessages.map((pm) => (
              <div
                key={pm.id}
                className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-[#13224A] border border-[#D6E6FF] dark:border-[#2B7FFF]/25 px-3 py-1 text-xs text-[#0A1E5C] dark:text-white max-w-full"
              >
                <span className="truncate font-semibold">{pm.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shared Media Strip (expandable from header button so chat stays spacious) */}
      {showSharedMedia && media.length > 0 && (
        <div className="shrink-0 flex items-center gap-2 border-b border-[#D6E6FF] dark:border-[#2B7FFF]/20 bg-white/70 dark:bg-[#0B1A3A]/60 px-4 py-2 overflow-x-auto">
          <span className="shrink-0 text-[11px] font-bold text-[#0A1E5C]/60 dark:text-white/60 flex items-center gap-1">
            <ImageIcon className="h-3.5 w-3.5 text-[#1A6BFF]" />
            Shared Media:
          </span>
          {media.slice(0, 8).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectMedia(item)}
              className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#0B2E8F] group"
              title={item.title}
            >
              <img
                src={item.thumbnail}
                alt={item.title}
                className="h-full w-full object-cover group-hover:scale-110 transition"
              />
              {item.type === 'video' && (
                <span className="absolute inset-0 flex items-center justify-center bg-[#0A1430]/35">
                  <Play className="h-3.5 w-3.5 fill-white text-white" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Messages List */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 space-y-4 bg-[#F0F6FF]/50 dark:bg-[#0A1430]/50">
        {filteredMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-xs text-[#0A1E5C]/60 dark:text-white/60">
            <p className="font-bold text-sm text-[#0A1E5C] dark:text-white">
              No messages found
            </p>
            <p className="mt-1">Start the conversation about transport, budget, or meeting points!</p>
          </div>
        ) : (
          filteredMessages.map((msg) => (
            <div
              key={msg.id}
              className={`group flex items-end gap-2.5 ${
                msg.isMe ? 'justify-end' : 'justify-start'
              }`}
            >
              {!msg.isMe && (
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold text-white shadow-sm"
                  style={{ backgroundColor: msg.senderColor }}
                >
                  {msg.senderInitials}
                </div>
              )}

              <div
                className={`max-w-[80%] sm:max-w-[70%] flex flex-col ${
                  msg.isMe ? 'items-end' : 'items-start'
                }`}
              >
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className="text-[11px] font-bold text-[#0A1E5C]/70 dark:text-white/70">
                    {msg.isMe ? 'You' : msg.senderName}
                  </span>
                  <span className="text-[10px] text-[#0A1E5C]/45 dark:text-white/45">
                    {msg.timestamp}
                  </span>
                  {msg.pinned && (
                    <Pin className="h-3 w-3 text-[#1A6BFF] dark:text-[#2B7FFF]" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={`relative rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                    msg.isMe
                      ? 'bg-[#1A6BFF] text-white rounded-br-md'
                      : 'bg-white dark:bg-[#13224A] text-[#0A1E5C] dark:text-white border border-[#D6E6FF] dark:border-[#2B7FFF]/25 rounded-bl-md'
                  }`}
                >
                  {/* Quoted Reply */}
                  {msg.replyTo && (
                    <div
                      className={`mb-2 rounded-xl px-2.5 py-1.5 text-xs border-l-2 ${
                        msg.isMe
                          ? 'bg-white/15 border-white/70 text-white/90'
                          : 'bg-[#F0F6FF] dark:bg-[#0B1A3A] border-[#1A6BFF] text-[#0A1E5C]/80 dark:text-white/80'
                      }`}
                    >
                      <p className="font-bold text-[11px]">{msg.replyTo.senderName}</p>
                      <p className="truncate">{msg.replyTo.text}</p>
                    </div>
                  )}

                  {/* Media inside message */}
                  {msg.media && (
                    <button
                      type="button"
                      onClick={() =>
                        onSelectMedia({
                          id: `chat-m-${msg.id}`,
                          eventId: event.id,
                          eventName: event.name,
                          type: msg.media!.type,
                          url: msg.media!.url,
                          thumbnail: msg.media!.url,
                          title: msg.media!.title || 'Chat Media',
                          uploadedBy: msg.senderName,
                          uploadedAt: msg.timestamp,
                        })
                      }
                      className="relative mb-2 block w-full max-w-[240px] overflow-hidden rounded-xl bg-[#0B2E8F]"
                    >
                      <img
                        src={msg.media.url}
                        alt={msg.media.title || 'Shared media'}
                        className="h-36 w-full object-cover hover:scale-105 transition"
                      />
                      {msg.media.type === 'video' && (
                        <span className="absolute inset-0 flex items-center justify-center bg-[#0A1430]/35">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1A6BFF] text-white shadow">
                            <Play className="h-4 w-4 fill-white ml-0.5" />
                          </span>
                        </span>
                      )}
                    </button>
                  )}

                  <p className="leading-relaxed whitespace-pre-wrap break-words">
                    {msg.text}
                  </p>
                </div>

                {/* Hover / Quick Action Bar: Reactions + Reply + Pin */}
                <div className="mt-1 flex items-center gap-1 opacity-85 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <div className="inline-flex items-center rounded-full border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-white dark:bg-[#13224A] px-1.5 py-0.5 shadow-sm">
                    {REACTION_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => onToggleReaction(event.id, msg.id, emoji)}
                        className="px-1 text-xs hover:scale-125 transition"
                        title={`React with ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setReplyTo({
                        id: msg.id,
                        senderName: msg.isMe ? 'You' : msg.senderName,
                        text: msg.text,
                      })
                    }
                    className="rounded-full border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-white dark:bg-[#13224A] p-1 text-[#0A1E5C]/70 dark:text-white/70 hover:text-[#1A6BFF]"
                    title="Reply"
                  >
                    <Reply className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onTogglePin(event.id, msg.id)}
                    className={`rounded-full border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-white dark:bg-[#13224A] p-1 ${
                      msg.pinned
                        ? 'text-[#1A6BFF] dark:text-[#2B7FFF]'
                        : 'text-[#0A1E5C]/70 dark:text-white/70 hover:text-[#1A6BFF]'
                    }`}
                    title={msg.pinned ? 'Unpin' : 'Pin message'}
                  >
                    <Pin className="h-3 w-3" />
                  </button>
                </div>

                {/* Existing Reactions */}
                {msg.reactions.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {msg.reactions.map((r) => {
                      const reacted = r.users.includes(user.name);
                      return (
                        <button
                          key={r.emoji}
                          type="button"
                          onClick={() => onToggleReaction(event.id, msg.id, r.emoji)}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold border transition ${
                            reacted
                              ? 'border-[#1A6BFF] bg-[#D6E6FF] dark:bg-[#1A6BFF]/30 text-[#0A1E5C] dark:text-white'
                              : 'border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-white dark:bg-[#13224A] text-[#0A1E5C]/75 dark:text-white/75'
                          }`}
                        >
                          <span>{r.emoji}</span>
                          <span>{r.users.length}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Typing indicator */}
        {typingUser && (
          <div className="flex items-center gap-2 text-xs font-semibold text-[#1A6BFF] dark:text-[#2B7FFF] animate-pulse">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#D6E6FF] dark:bg-[#1A2D5E] text-[10px] font-extrabold">
              ...
            </span>
            <span>{typingUser} is typing…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply Preview Banner */}
      {replyTo && (
        <div className="flex items-center justify-between gap-2 border-t border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-[#F0F6FF] dark:bg-[#0B1A3A] px-4 py-2 text-xs">
          <div className="border-l-2 border-[#1A6BFF] pl-2.5 min-w-0">
            <p className="font-bold text-[#1A6BFF] dark:text-[#2B7FFF]">
              Replying to {replyTo.senderName}
            </p>
            <p className="truncate text-[#0A1E5C]/75 dark:text-white/75">
              {replyTo.text}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setReplyTo(null)}
            className="rounded-lg p-1 text-[#0A1E5C]/60 dark:text-white/60 hover:bg-white dark:hover:bg-[#13224A]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Emoji Popover */}
      {showEmojiPicker && (
        <div className="border-t border-[#D6E6FF] dark:border-[#2B7FFF]/20 bg-white dark:bg-[#0B1A3A] px-4 py-2.5 flex flex-wrap items-center gap-2">
          {QUICK_EMOJIS.map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => setText((prev) => prev + em)}
              className="text-lg hover:scale-125 transition"
            >
              {em}
            </button>
          ))}
        </div>
      )}

      {/* Input Bar */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t border-[#D6E6FF] dark:border-[#2B7FFF]/20 bg-white dark:bg-[#0B1A3A] px-3 sm:px-4 py-3"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileAttach}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => setShowEmojiPicker((s) => !s)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#0A1E5C]/65 dark:text-white/65 hover:bg-[#F0F6FF] dark:hover:bg-[#13224A] hover:text-[#1A6BFF] transition"
          title="Emoji"
        >
          <Smile className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#0A1E5C]/65 dark:text-white/65 hover:bg-[#F0F6FF] dark:hover:bg-[#13224A] hover:text-[#1A6BFF] transition"
          title="Attach photo or video"
        >
          <Paperclip className="h-5 w-5" />
        </button>

        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message the squad about transport, budget, meeting point..."
          className="flex-1 rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/70 dark:bg-[#13224A] px-4 py-2.5 text-sm text-[#0A1E5C] dark:text-white placeholder:text-[#0A1E5C]/45 dark:placeholder:text-white/45 focus:border-[#1A6BFF] focus:outline-none"
        />

        <button
          type="submit"
          disabled={!text.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1A6BFF] hover:bg-[#2B7FFF] disabled:opacity-45 text-white shadow-sm transition active:scale-95"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>

      {/* Member Drawer */}
      {showMembers && (
        <div
          className="absolute inset-0 z-30 flex justify-end bg-[#0A1430]/50 backdrop-blur-xs"
          onClick={() => setShowMembers(false)}
        >
          <div
            className="w-80 max-w-[90%] h-full bg-white dark:bg-[#13224A] border-l border-[#D6E6FF] dark:border-[#2B7FFF]/30 flex flex-col shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#D6E6FF] dark:border-[#2B7FFF]/20 px-4 py-3.5">
              <div>
                <h4 className="text-sm font-extrabold text-[#0A1E5C] dark:text-white">
                  Room Members ({event.guests.length + 1})
                </h4>
                <p className="text-[11px] text-[#0A1E5C]/60 dark:text-white/60">
                  Online &amp; payment status
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <ThemeToggle compact />
                <button
                  type="button"
                  onClick={() => setShowMembers(false)}
                  className="rounded-lg p-1.5 text-[#0A1E5C]/60 dark:text-white/60 hover:bg-[#F0F6FF] dark:hover:bg-[#1A2D5E]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {/* Current User */}
              <div className="flex items-center justify-between rounded-2xl bg-[#F0F6FF] dark:bg-[#0B1A3A] p-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative h-9 w-9 rounded-full bg-[#1A6BFF] text-white flex items-center justify-center text-xs font-extrabold">
                    {user.initials}
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-[#0B1A3A]" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-[#0A1E5C] dark:text-white">
                      {user.name} (Host)
                    </p>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      Online
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Paid
                </span>
              </div>

              {event.guests.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between rounded-2xl border border-[#D6E6FF]/80 dark:border-[#2B7FFF]/20 p-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="relative h-9 w-9 shrink-0 rounded-full text-white flex items-center justify-center text-xs font-extrabold"
                      style={{ backgroundColor: g.avatarColor }}
                    >
                      {g.initials}
                      <span
                        className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-[#13224A] ${
                          g.online ? 'bg-emerald-400' : 'bg-slate-400'
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-[#0A1E5C] dark:text-white">
                        {g.name}
                      </p>
                      <p className="text-[11px] text-[#0A1E5C]/55 dark:text-white/55">
                        {g.online ? 'Online' : 'Offline'}
                      </p>
                    </div>
                  </div>
                  {g.paid ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      Paid
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#D6E6FF] dark:bg-[#0B1A3A] px-2.5 py-0.5 text-[10px] font-bold text-[#0B2E8F] dark:text-[#D6E6FF]">
                      <Clock className="h-3 w-3" />
                      Pending
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Friend Modal */}
      {showAddFriend && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0A1430]/70 backdrop-blur-sm p-4"
          onClick={() => setShowAddFriend(false)}
        >
          <div
            className="animate-slide-up w-full max-w-md rounded-3xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-base font-extrabold text-[#0A1E5C] dark:text-white">
                Add Friends to {event.name}
              </h4>
              <div className="flex items-center gap-2">
                <ThemeToggle compact />
                <button
                  type="button"
                  onClick={() => setShowAddFriend(false)}
                  className="rounded-lg p-1 text-[#0A1E5C]/60 dark:text-white/60 hover:bg-[#F0F6FF] dark:hover:bg-[#1A2D5E]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {availableFriendsToAdd.length === 0 ? (
              <p className="text-xs text-[#0A1E5C]/70 dark:text-white/70 py-4 text-center">
                All your Monte friends are already in this event room!
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableFriendsToAdd.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] p-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-extrabold text-white"
                        style={{ backgroundColor: f.avatarColor }}
                      >
                        {f.initials}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#0A1E5C] dark:text-white">
                          {f.name}
                        </p>
                        <p className="text-[11px] text-[#0A1E5C]/60 dark:text-white/60">
                          {f.phone}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleQuickInviteFriend(f)}
                      className="rounded-xl bg-[#1A6BFF] hover:bg-[#2B7FFF] px-3 py-1.5 text-xs font-bold text-white"
                    >
                      + Invite
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
