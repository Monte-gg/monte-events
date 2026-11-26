import React, { useMemo, useState } from 'react';
import { MessageCircle, Search, Users } from 'lucide-react';
import { ChatMessage, Guest, MediaItem, MonteEvent, UserProfile } from '../types';
import { EventChatRoom } from './EventChatRoom';
import { ThemeToggle } from './ThemeToggle';

interface GlobalChatsPageProps {
  events: MonteEvent[];
  messagesByEvent: Record<string, ChatMessage[]>;
  media: MediaItem[];
  user: UserProfile;
  activeChatEventId: string | null;
  typingByEvent: Record<string, string | null>;
  onSelectChatEvent: (eventId: string) => void;
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
  onShowToast: (msg: string) => void;
}

export const GlobalChatsPage: React.FC<GlobalChatsPageProps> = ({
  events,
  messagesByEvent,
  media,
  user,
  activeChatEventId,
  typingByEvent,
  onSelectChatEvent,
  onSendMessage,
  onToggleReaction,
  onTogglePin,
  onAddGuestToEvent,
  onSelectMedia,
  onShowToast,
}) => {
  const [search, setSearch] = useState('');
  const [mobileShowChat, setMobileShowChat] = useState(Boolean(activeChatEventId));

  const selectedEventId = activeChatEventId || events[0]?.id || null;
  const selectedEvent = events.find((e) => e.id === selectedEventId) || null;

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return events;
    return events.filter((e) => e.name.toLowerCase().includes(q));
  }, [events, search]);

  const handleOpenChat = (eventId: string) => {
    onSelectChatEvent(eventId);
    setMobileShowChat(true);
  };

  return (
    <div className="w-full h-full flex-1 min-h-0 flex flex-col p-2 sm:p-3 lg:p-4 overflow-hidden animate-slide-up">
      {/* Full-height spacious WhatsApp/Slack-style split chat centre */}
      <div className="flex-1 min-h-0 flex gap-3 overflow-hidden">
        {/* Left: Slimmer Event Chats Sidebar */}
        <div
          className={`w-full lg:w-72 xl:w-80 shrink-0 h-full min-h-0 flex flex-col rounded-3xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-white dark:bg-[#13224A] overflow-hidden shadow-sm ${
            mobileShowChat ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="shrink-0 p-3.5 border-b border-[#D6E6FF] dark:border-[#2B7FFF]/20 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-lg font-extrabold text-[#0A1E5C] dark:text-white">
                Event Chats
              </h1>
              <div className="hidden sm:block">
                <ThemeToggle compact />
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1A6BFF]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search event chats..."
                className="w-full rounded-full border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/70 dark:bg-[#0B1A3A] pl-10 pr-4 py-2 text-xs sm:text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 min-h-0 divide-y divide-[#D6E6FF]/60 dark:divide-[#2B7FFF]/15 overflow-y-auto">
            {filteredEvents.map((ev) => {
              const msgs = messagesByEvent[ev.id] || [];
              const lastMsg = msgs[msgs.length - 1];
              const isSelected = ev.id === selectedEventId;
              const onlineCount = ev.guests.filter((g) => g.online).length + 1;

              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => handleOpenChat(ev.id)}
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
            })}
          </div>
        </div>

        {/* Right: Wide, Full-Height Active Event Chat Room */}
        <div
          className={`flex-1 min-w-0 h-full min-h-0 ${
            mobileShowChat ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'
          }`}
        >
          {selectedEvent ? (
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
          )}
        </div>
      </div>
    </div>
  );
};
