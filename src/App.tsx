import React, { useCallback, useMemo, useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import {
  INITIAL_EVENTS,
  INITIAL_MEDIA,
  INITIAL_MESSAGES,
  INITIAL_NOTIFICATIONS,
  INITIAL_USER_PROFILE,
  SAMPLE_FRIENDS,
  pickAutoReplies,
} from './data/sampleData';
import {
  AppPage,
  ChatMessage,
  EventRoomTab,
  Guest,
  MediaItem,
  MonteEvent,
  NotificationItem,
  UserProfile,
} from './types';
import { AuthPage } from './components/AuthPage';
import { AppShell } from './components/AppShell';
import { DashboardPage } from './components/DashboardPage';
import { CreateRoomPage } from './components/CreateRoomPage';
import { EventRoomPage } from './components/EventRoomPage';
import { GlobalChatsPage } from './components/GlobalChatsPage';
import { MyRoomsPage } from './components/MyRoomsPage';
import { MediaVaultPage } from './components/MediaVaultPage';
import { ProfilePage } from './components/ProfilePage';
import { MediaLightbox } from './components/MediaLightbox';
import { ToastContainer, ToastData } from './components/Toast';

function getCurrentTimeLabel(): string {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function MonteAppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState<AppPage>('dashboard');
  const [user, setUser] = useState<UserProfile>(INITIAL_USER_PROFILE);
  const [events, setEvents] = useState<MonteEvent[]>(INITIAL_EVENTS);
  const [media, setMedia] = useState<MediaItem[]>(INITIAL_MEDIA);
  const [messagesByEvent, setMessagesByEvent] =
    useState<Record<string, ChatMessage[]>>(INITIAL_MESSAGES);
  const [notifications, setNotifications] =
    useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  const [activeEventId, setActiveEventId] = useState<string>(INITIAL_EVENTS[0].id);
  const [activeEventTab, setActiveEventTab] = useState<EventRoomTab>('guests');
  const [activeChatEventId, setActiveChatEventId] = useState<string | null>(
    INITIAL_EVENTS[0].id
  );
  const [typingByEvent, setTypingByEvent] = useState<Record<string, string | null>>({});

  const [lightboxMedia, setLightboxMedia] = useState<MediaItem | null>(null);
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'info' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearEventUnread = useCallback((eventId: string) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, unreadCount: 0 } : e))
    );
  }, []);

  const totalUnreadChats = useMemo(
    () => events.reduce((acc, e) => acc + e.unreadCount, 0),
    [events]
  );

  const handleLogin = (payload?: { name?: string; email?: string; phone?: string }) => {
    if (payload?.name || payload?.email || payload?.phone) {
      setUser((prev) => {
        const nextName = payload.name || prev.name;
        const parts = nextName.split(' ');
        const initials = (
          (parts[0]?.[0] || 'M') + (parts[1]?.[0] || parts[0]?.[1] || 'E')
        ).toUpperCase();
        return {
          ...prev,
          name: nextName,
          email: payload.email || prev.email,
          phone: payload.phone || prev.phone,
          initials,
        };
      });
    }
    setIsAuthenticated(true);
    setCurrentPage('dashboard');
    showToast('Welcome to MONTE EVENTS!');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentPage('dashboard');
    showToast('Logged out successfully', 'info');
  };

  const handleOpenEvent = (eventId: string, tab: EventRoomTab = 'guests') => {
    setActiveEventId(eventId);
    setActiveEventTab(tab);
    setCurrentPage('event-room');
    if (tab === 'chat') {
      clearEventUnread(eventId);
    }
  };

  const handleEventTabChange = (tab: EventRoomTab) => {
    setActiveEventTab(tab);
    if (tab === 'chat' && activeEventId) {
      clearEventUnread(activeEventId);
    }
  };

  const handleSelectGlobalChat = (eventId: string) => {
    setActiveChatEventId(eventId);
    clearEventUnread(eventId);
  };

  const handleNavigate = (page: AppPage) => {
    setCurrentPage(page);
    if (page === 'chats' && activeChatEventId) {
      clearEventUnread(activeChatEventId);
    }
  };

  const handleCreateEvent = (newEvent: MonteEvent) => {
    setEvents((prev) => [newEvent, ...prev]);
    setMessagesByEvent((prev) => ({
      ...prev,
      [newEvent.id]: [
        {
          id: `welcome-${Date.now()}`,
          eventId: newEvent.id,
          senderId: 'me',
          senderName: user.name,
          senderInitials: user.initials,
          senderColor: '#1A6BFF',
          isMe: true,
          text: `Welcome to ${newEvent.name}! Meeting point & payment details will be pinned right here. Let’s Monte it!`,
          timestamp: getCurrentTimeLabel(),
          pinned: true,
          reactions: [{ emoji: '🔥', users: [user.name] }],
        },
      ],
    }));
    setActiveEventId(newEvent.id);
    setActiveEventTab('guests');
    setCurrentPage('event-room');
    showToast(`Room "${newEvent.name}" created!`);
  };

  const handleToggleGuestPaid = (eventId: string, guestId: string) => {
    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== eventId) return ev;
        return {
          ...ev,
          guests: ev.guests.map((g) => {
            if (g.id !== guestId) return g;
            const nextPaid = !g.paid;
            showToast(
              nextPaid
                ? `${g.name} confirmed as Paid — In the Event!`
                : `${g.name} moved back to Pending`,
              nextPaid ? 'success' : 'info'
            );
            return {
              ...g,
              paid: nextPaid,
              paidAt: nextPaid ? 'Just now' : undefined,
            };
          }),
        };
      })
    );
  };

  const handleAddGuestToEvent = (eventId: string, guest: Guest) => {
    setEvents((prev) =>
      prev.map((ev) =>
        ev.id === eventId
          ? {
              ...ev,
              guests: [...ev.guests, guest],
              maxGuests: Math.max(ev.maxGuests, ev.guests.length + 1),
            }
          : ev
      )
    );
  };

  const handleUploadMedia = (eventId: string, items: MediaItem[]) => {
    setMedia((prev) => [...items, ...prev]);
  };

  const handleSendMessage = (
    eventId: string,
    text: string,
    options?: {
      replyTo?: { id: string; senderName: string; text: string };
      media?: { type: 'photo' | 'video'; url: string; title?: string };
    }
  ) => {
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      eventId,
      senderId: 'me',
      senderName: user.name,
      senderInitials: user.initials,
      senderColor: '#1A6BFF',
      isMe: true,
      text,
      timestamp: getCurrentTimeLabel(),
      reactions: [],
      replyTo: options?.replyTo,
      media: options?.media,
    };

    setMessagesByEvent((prev) => ({
      ...prev,
      [eventId]: [...(prev[eventId] || []), newMsg],
    }));

    // Also add chat media to event media vault
    if (options?.media) {
      const targetEvent = events.find((e) => e.id === eventId);
      if (targetEvent) {
        setMedia((prev) => [
          {
            id: `chat-vault-${Date.now()}`,
            eventId,
            eventName: targetEvent.name,
            type: options.media!.type,
            url: options.media!.url,
            thumbnail: options.media!.url,
            title: options.media!.title || 'Shared in Chat',
            uploadedBy: user.name,
            uploadedAt: 'Just now',
          },
          ...prev,
        ]);
      }
    }

    // Trigger 1-2 realistic auto-replies from friends in this event
    const targetEvent = events.find((e) => e.id === eventId);
    const poolFriends =
      targetEvent && targetEvent.guests.length > 0
        ? targetEvent.guests
        : SAMPLE_FRIENDS.slice(0, 3);

    const replies = pickAutoReplies(text);
    const friend1 = poolFriends[0];
    const friend2 = poolFriends[1] || poolFriends[0];

    if (friend1) {
      setTypingByEvent((prev) => ({ ...prev, [eventId]: friend1.name }));
      setTimeout(() => {
        const reply1: ChatMessage = {
          id: `auto-1-${Date.now()}`,
          eventId,
          senderId: friend1.id,
          senderName: friend1.name,
          senderInitials: friend1.initials,
          senderColor: friend1.avatarColor,
          isMe: false,
          text: replies[0],
          timestamp: getCurrentTimeLabel(),
          reactions: [],
        };
        setMessagesByEvent((prev) => ({
          ...prev,
          [eventId]: [...(prev[eventId] || []), reply1],
        }));

        if (friend2 && friend2.id !== friend1.id && replies[1]) {
          setTypingByEvent((prev) => ({ ...prev, [eventId]: friend2.name }));
          setTimeout(() => {
            const reply2: ChatMessage = {
              id: `auto-2-${Date.now()}`,
              eventId,
              senderId: friend2.id,
              senderName: friend2.name,
              senderInitials: friend2.initials,
              senderColor: friend2.avatarColor,
              isMe: false,
              text: replies[1],
              timestamp: getCurrentTimeLabel(),
              reactions: [],
            };
            setMessagesByEvent((prev) => ({
              ...prev,
              [eventId]: [...(prev[eventId] || []), reply2],
            }));
            setTypingByEvent((prev) => ({ ...prev, [eventId]: null }));
          }, 1500);
        } else {
          setTypingByEvent((prev) => ({ ...prev, [eventId]: null }));
        }
      }, 1100);
    }
  };

  const handleToggleReaction = (eventId: string, messageId: string, emoji: string) => {
    setMessagesByEvent((prev) => ({
      ...prev,
      [eventId]: (prev[eventId] || []).map((msg) => {
        if (msg.id !== messageId) return msg;
        const existing = msg.reactions.find((r) => r.emoji === emoji);
        if (!existing) {
          return {
            ...msg,
            reactions: [...msg.reactions, { emoji, users: [user.name] }],
          };
        }
        const hasMe = existing.users.includes(user.name);
        const nextUsers = hasMe
          ? existing.users.filter((u) => u !== user.name)
          : [...existing.users, user.name];
        const nextReactions =
          nextUsers.length === 0
            ? msg.reactions.filter((r) => r.emoji !== emoji)
            : msg.reactions.map((r) =>
                r.emoji === emoji ? { ...r, users: nextUsers } : r
              );
        return { ...msg, reactions: nextReactions };
      }),
    }));
  };

  const handleTogglePin = (eventId: string, messageId: string) => {
    setMessagesByEvent((prev) => ({
      ...prev,
      [eventId]: (prev[eventId] || []).map((msg) =>
        msg.id === messageId ? { ...msg, pinned: !msg.pinned } : msg
      ),
    }));
    showToast('Updated pinned messages', 'info');
  };

  const handleMarkNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const activeEvent = events.find((e) => e.id === activeEventId) || events[0];

  return (
    <>
      {!isAuthenticated ? (
        <AuthPage onLogin={handleLogin} />
      ) : (
        <AppShell
          currentPage={currentPage}
          onNavigate={handleNavigate}
          totalUnreadChats={totalUnreadChats}
          user={user}
        >
          {currentPage === 'dashboard' && (
            <DashboardPage
              user={user}
              events={events}
              media={media}
              notifications={notifications}
              onMarkNotificationsRead={handleMarkNotificationsRead}
              onOpenEvent={handleOpenEvent}
              onNavigate={handleNavigate}
              onSelectMedia={setLightboxMedia}
            />
          )}

          {currentPage === 'create' && (
            <CreateRoomPage
              creatorName={user.name}
              onCreateEvent={handleCreateEvent}
              onCancel={() => setCurrentPage('dashboard')}
              onShowToast={showToast}
            />
          )}

          {currentPage === 'rooms' && (
            <MyRoomsPage
              events={events}
              onOpenEvent={handleOpenEvent}
              onCreateRoom={() => setCurrentPage('create')}
            />
          )}

          {currentPage === 'event-room' && activeEvent && (
            <EventRoomPage
              event={activeEvent}
              activeTab={activeEventTab}
              onTabChange={handleEventTabChange}
              messages={messagesByEvent[activeEvent.id] || []}
              media={media.filter((m) => m.eventId === activeEvent.id)}
              user={user}
              typingUser={typingByEvent[activeEvent.id] || null}
              onBack={() => setCurrentPage('rooms')}
              onToggleGuestPaid={handleToggleGuestPaid}
              onAddGuestToEvent={handleAddGuestToEvent}
              onUploadMedia={handleUploadMedia}
              onSendMessage={handleSendMessage}
              onToggleReaction={handleToggleReaction}
              onTogglePin={handleTogglePin}
              onSelectMedia={setLightboxMedia}
              onShowToast={showToast}
            />
          )}

          {currentPage === 'chats' && (
            <GlobalChatsPage
              events={events}
              messagesByEvent={messagesByEvent}
              media={media}
              user={user}
              activeChatEventId={activeChatEventId}
              typingByEvent={typingByEvent}
              onSelectChatEvent={handleSelectGlobalChat}
              onSendMessage={handleSendMessage}
              onToggleReaction={handleToggleReaction}
              onTogglePin={handleTogglePin}
              onAddGuestToEvent={handleAddGuestToEvent}
              onSelectMedia={setLightboxMedia}
              onShowToast={showToast}
            />
          )}

          {currentPage === 'media' && (
            <MediaVaultPage
              events={events}
              media={media}
              user={user}
              onUploadMedia={handleUploadMedia}
              onSelectMedia={setLightboxMedia}
              onShowToast={showToast}
            />
          )}

          {currentPage === 'profile' && (
            <ProfilePage
              user={user}
              events={events}
              media={media}
              onUpdateProfile={setUser}
              onOpenEvent={handleOpenEvent}
              onSelectMedia={setLightboxMedia}
              onLogout={handleLogout}
              onShowToast={showToast}
            />
          )}
        </AppShell>
      )}

      <MediaLightbox item={lightboxMedia} onClose={() => setLightboxMedia(null)} />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MonteAppContent />
    </ThemeProvider>
  );
}
