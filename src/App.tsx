import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { ThemeProvider } from './context/ThemeContext';
import { supabase } from './lib/supabase';
import {
  ApiStatus,
  addGuestOnApi,
  checkApiHealth,
  createMediaOnApi,
  createRoomOnApi,
  deleteAccountOnApi,
  deleteRoomOnApi,
  fetchMediaFromApi,
  fetchMembersFromApi,
  fetchRoomMessagesFromApi,
  fetchRoomsFromApi,
  joinRoomOnApi,
  removeGuestOnApi,
  sendRoomMessageOnApi,
  sendWelcomeEmailOnApi,
  toggleGuestPaymentOnApi,
} from './lib/api';
import {
  addGuestInSupabase,
  createEventInSupabase,
  deleteEventInSupabase,
  fetchProfileFromSupabase,
  loadAllMonteData,
  sendMessageInSupabase,
  signOutSupabase,
  toggleGuestPaidInSupabase,
  updateMessagePinInSupabase,
  updateMessageReactionsInSupabase,
  uploadMediaInSupabase,
  upsertProfileInSupabase,
} from './lib/monteService';
import {
  INITIAL_EVENTS,
  INITIAL_MEDIA,
  INITIAL_MESSAGES,
  INITIAL_NOTIFICATIONS,
  INITIAL_USER_PROFILE,
} from './data/sampleData';
import {
  GUEST_PREVIEW_EVENTS,
  GUEST_PREVIEW_MEDIA,
  GUEST_PREVIEW_MEMBERS,
  GUEST_PREVIEW_MESSAGES,
  GUEST_USER_PROFILE,
} from './data/guestPreviewData';
import {
  AppPage,
  ChatMessage,
  DirectMessage,
  EventRoomTab,
  Guest,
  MediaItem,
  MonteEvent,
  NotificationItem,
  PlatformMember,
  UserProfile,
} from './types';
import { AuthPage } from './components/AuthPage';
import { EmailVerifiedPage } from './components/EmailVerifiedPage';
import { ResetPasswordModal } from './components/ResetPasswordModal';
import { AppShell } from './components/AppShell';
import { DashboardPage } from './components/DashboardPage';
import { CreateRoomPage } from './components/CreateRoomPage';
import { EventRoomPage } from './components/EventRoomPage';
import { GlobalChatsPage } from './components/GlobalChatsPage';
import { MyRoomsPage } from './components/MyRoomsPage';
import { MembersPage } from './components/MembersPage';
import { MemberProfileModal } from './components/MemberProfileModal';
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

function detectEmailVerifiedFromUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const search = new URLSearchParams(window.location.search);
  const hash = window.location.hash || '';
  if (search.get('verified') === 'true') return true;
  if (search.get('type') === 'signup' || search.get('type') === 'email') return true;
  if (hash.includes('type=signup') || hash.includes('type=email')) return true;
  return false;
}

function detectResetPasswordFromUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const search = new URLSearchParams(window.location.search);
  const hash = window.location.hash || '';
  if (search.get('reset') === 'true') return true;
  if (hash.includes('type=recovery')) return true;
  return false;
}

function MonteAppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState<boolean>(
    () => detectResetPasswordFromUrl()
  );
  const [authModal, setAuthModal] = useState<{
    open: boolean;
    mode: 'login' | 'signup';
    message: string | null;
  }>({ open: false, mode: 'signup', message: null });
  const [showEmailVerified, setShowEmailVerified] = useState<boolean>(() =>
    detectEmailVerifiedFromUrl()
  );
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [supabaseStatus, setSupabaseStatus] = useState({
    connected: true,
    schemaReady: false,
  });
  const [apiStatus, setApiStatus] = useState<ApiStatus>('waking');
  const [currentPage, setCurrentPage] = useState<AppPage>('dashboard');
  const [user, setUser] = useState<UserProfile>(INITIAL_USER_PROFILE);
  const [events, setEvents] = useState<MonteEvent[]>(INITIAL_EVENTS);
  const [members, setMembers] = useState<PlatformMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [friends, setFriends] = useState<PlatformMember[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = window.localStorage.getItem('monte-friends');
      return saved ? (JSON.parse(saved) as PlatformMember[]) : [];
    } catch {
      return [];
    }
  });
  const [directMessagesByFriend, setDirectMessagesByFriend] = useState<
    Record<string, DirectMessage[]>
  >(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = window.localStorage.getItem('monte-direct-messages');
      return saved ? (JSON.parse(saved) as Record<string, DirectMessage[]>) : {};
    } catch {
      return {};
    }
  });
  const [activeChatSection, setActiveChatSection] = useState<'events' | 'friends'>('events');
  const [activeFriendId, setActiveFriendId] = useState<string | null>(null);
  const [viewingMember, setViewingMember] = useState<PlatformMember | null>(null);
  const [media, setMedia] = useState<MediaItem[]>(INITIAL_MEDIA);
  const [messagesByEvent, setMessagesByEvent] =
    useState<Record<string, ChatMessage[]>>(INITIAL_MESSAGES);
  const [notifications, setNotifications] =
    useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  useEffect(() => {
    let mounted = true;

    const applySupabaseSessionUser = async (
      sessionUser: {
        id: string;
        email?: string;
        created_at?: string;
        user_metadata?: Record<string, unknown>;
      } | null
    ) => {
      if (!mounted) return;
      if (!sessionUser) {
        return;
      }

      const uid = sessionUser.id;
      setSupabaseUserId(uid);
      setIsGuestMode(false);
      setAuthModal({ open: false, mode: 'login', message: null });
      setIsAuthenticated(true);

      const meta = sessionUser.user_metadata || {};
      const googleName =
        (meta.full_name as string) ||
        (meta.name as string) ||
        sessionUser.email?.split('@')[0] ||
        'Monte Member';
      const googleAvatar =
        (meta.avatar_url as string) || (meta.picture as string) || '';

      // Send one-time Welcome email on first-time Google / OAuth signup
      if (sessionUser.email && typeof window !== 'undefined') {
        const welcomeKey = `monte-welcome-sent-${uid}`;
        if (!window.localStorage.getItem(welcomeKey)) {
          const createdAtMs = sessionUser.created_at
            ? Date.parse(sessionUser.created_at)
            : 0;
          const isRecentSignup =
            createdAtMs > 0 && Date.now() - createdAtMs < 15 * 60 * 1000;
          if (isRecentSignup) {
            window.localStorage.setItem(welcomeKey, '1');
            void sendWelcomeEmailOnApi(sessionUser.email, googleName);
          }
        }
      }
      const parts = googleName.trim().split(/\s+/);
      const initials = (
        (parts[0]?.[0] || 'M') + (parts[1]?.[0] || parts[0]?.[1] || 'E')
      ).toUpperCase();

      setUser((prev) => ({
        ...prev,
        name: googleName,
        username:
          googleName.toLowerCase().replace(/[^a-z0-9_]/g, '') || prev.username,
        email: sessionUser.email || prev.email,
        phone: (meta.phone as string) || prev.phone,
        avatarUrl: googleAvatar || prev.avatarUrl,
        initials,
      }));

      const dbProfile = await fetchProfileFromSupabase(uid);
      if (mounted && dbProfile) {
        setUser((prev) => ({
          ...prev,
          ...dbProfile,
          avatarUrl: dbProfile.avatarUrl || googleAvatar || prev.avatarUrl,
        }));
      }
    };

    const syncFromSupabase = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const sessionUser = sessionData.session?.user || null;
        if (sessionUser) {
          await applySupabaseSessionUser(sessionUser);
        }
        const synced = await loadAllMonteData(sessionUser?.id || undefined);
        if (!mounted) return;
        setSupabaseStatus({
          connected: synced.connected,
          schemaReady: synced.schemaReady,
        });
        if (synced.events && synced.events.length > 0) {
          setEvents(synced.events);
          setActiveEventId((curr) =>
            synced.events!.some((e) => e.id === curr) ? curr : synced.events![0].id
          );
          setActiveChatEventId((curr) =>
            curr && synced.events!.some((e) => e.id === curr)
              ? curr
              : synced.events![0].id
          );
        }
        if (synced.media && synced.media.length > 0) {
          setMedia(synced.media);
        }
        if (synced.messagesByEvent && Object.keys(synced.messagesByEvent).length > 0) {
          setMessagesByEvent(synced.messagesByEvent);
        }
      } catch {
        if (mounted) {
          setSupabaseStatus({ connected: false, schemaReady: false });
        }
      }
    };

    // Listen for Google OAuth / Magic Link / Password Recovery / Sign Out auth state changes
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY') {
        setShowResetPasswordModal(true);
      }
      if (session?.user) {
        void applySupabaseSessionUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        setSupabaseUserId(null);
        setIsAuthenticated(false);
        setCurrentPage('dashboard');
      }
    });

    void syncFromSupabase();

    // Connect to Render Express API (graceful fallback to demo data if sleeping/unreachable)
    const syncFromRenderApi = async () => {
      const healthy = await checkApiHealth();
      if (!mounted) return;
      if (!healthy) {
        setApiStatus('demo');
        return;
      }
      setApiStatus('online');

      const [apiRooms, apiMedia, apiMembers] = await Promise.all([
        fetchRoomsFromApi(),
        fetchMediaFromApi(),
        fetchMembersFromApi(),
      ]);
      if (!mounted) return;
      if (apiMembers) {
        setMembers(apiMembers);
      }

      if (apiRooms && apiRooms.length > 0) {
        setEvents(apiRooms);
        setActiveEventId((curr) =>
          apiRooms.some((e) => e.id === curr) ? curr : apiRooms[0].id
        );
        setActiveChatEventId((curr) =>
          curr && apiRooms.some((e) => e.id === curr) ? curr : apiRooms[0].id
        );

        // Fetch per-room messages in parallel
        const msgEntries = await Promise.all(
          apiRooms.map(async (r) => {
            const msgs = await fetchRoomMessagesFromApi(r.id);
            return [r.id, msgs] as const;
          })
        );
        if (mounted) {
          setMessagesByEvent((prev) => {
            const next = { ...prev };
            for (const [roomId, msgs] of msgEntries) {
              if (msgs && msgs.length > 0) {
                next[roomId] = msgs;
              }
            }
            return next;
          });
        }
      }

      if (apiMedia && apiMedia.length > 0) {
        setMedia(apiMedia);
      }
    };

    void syncFromRenderApi();

    // Subscribe to live Realtime database changes across tabs/devices
    const channel = supabase
      .channel('monte-events-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_messages' },
        () => {
          void syncFromSupabase();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_guests' },
        () => {
          void syncFromSupabase();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        () => {
          void syncFromSupabase();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_media' },
        () => {
          void syncFromSupabase();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      authSubscription.unsubscribe();
      void supabase.removeChannel(channel);
    };
  }, []);

  const [activeEventId, setActiveEventId] = useState<string>('');
  const [activeEventTab, setActiveEventTab] = useState<EventRoomTab>('guests');
  const [activeChatEventId, setActiveChatEventId] = useState<string | null>(null);
  const [typingByEvent] = useState<Record<string, string | null>>({});

  const [lightboxState, setLightboxState] = useState<{
    items: MediaItem[];
    index: number;
  } | null>(null);
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const handleSelectMedia = useCallback(
    (item: MediaItem, list?: MediaItem[], explicitIndex?: number) => {
      const targetList = list && list.length > 0 ? list : media;
      const resolvedIndex =
        typeof explicitIndex === 'number' &&
        explicitIndex >= 0 &&
        explicitIndex < targetList.length
          ? explicitIndex
          : Math.max(
              0,
              targetList.findIndex((m) => m.id === item.id)
            );
      setLightboxState({
        items: targetList,
        index: resolvedIndex,
      });
    },
    [media]
  );

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

  const promptGuestToSignUp = useCallback(
    (
      message = 'Create a free account to save changes and invite friends.',
      mode: 'login' | 'signup' = 'signup'
    ) => {
      setAuthModal({ open: true, mode, message });
    },
    []
  );

  const handleExploreAsGuest = () => {
    setIsGuestMode(true);
    setIsAuthenticated(true);
    setUser(GUEST_USER_PROFILE);
    setEvents(GUEST_PREVIEW_EVENTS);
    setMembers(GUEST_PREVIEW_MEMBERS);
    setFriends(GUEST_PREVIEW_MEMBERS.slice(0, 3));
    setDirectMessagesByFriend({
      [GUEST_PREVIEW_MEMBERS[0].id]: [
        {
          id: 'pdm-1',
          friendId: GUEST_PREVIEW_MEMBERS[0].id,
          senderName: GUEST_PREVIEW_MEMBERS[0].name,
          senderInitials: GUEST_PREVIEW_MEMBERS[0].initials,
          isMe: false,
          text: 'Hey! Are you joining the Nairobi to Naivasha roadtrip this weekend?',
          timestamp: '10:20 AM',
        },
      ],
    });
    setActiveFriendId(GUEST_PREVIEW_MEMBERS[0].id);
    setMedia(GUEST_PREVIEW_MEDIA);
    setMessagesByEvent(GUEST_PREVIEW_MESSAGES);
    setActiveEventId(GUEST_PREVIEW_EVENTS[0].id);
    setActiveChatEventId(GUEST_PREVIEW_EVENTS[0].id);
    setCurrentPage('dashboard');
    showToast('Exploring in Guest Preview Mode', 'info');
  };

  const handleLogin = (payload?: {
    userId?: string;
    name?: string;
    email?: string;
    phone?: string;
    avatarUrl?: string;
  }) => {
    if (!payload?.userId) return;
    const wasGuest = isGuestMode;
    setIsGuestMode(false);
    setAuthModal({ open: false, mode: 'login', message: null });
    setSupabaseUserId(payload.userId);
    const nextName =
      payload.name || payload.email?.split('@')[0] || 'Monte Member';
    const parts = nextName.split(' ');
    const initials = (
      (parts[0]?.[0] || 'M') + (parts[1]?.[0] || parts[0]?.[1] || 'E')
    ).toUpperCase();
    setUser({
      ...INITIAL_USER_PROFILE,
      name: nextName,
      username: nextName.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'member',
      email: payload.email || '',
      phone: payload.phone || '',
      avatarUrl: payload.avatarUrl || '',
      initials,
    });
    if (wasGuest) {
      setEvents([]);
      setMedia([]);
      setMessagesByEvent({});
      setActiveEventId('');
      setActiveChatEventId(null);
      // Reload real rooms, media & members from backend/Supabase
      void Promise.all([
        fetchRoomsFromApi(),
        fetchMediaFromApi(),
        fetchMembersFromApi(),
      ]).then(([apiRooms, apiMedia, apiMembers]) => {
        if (apiRooms && apiRooms.length > 0) {
          setEvents(apiRooms);
          setActiveEventId(apiRooms[0].id);
          setActiveChatEventId(apiRooms[0].id);
        }
        if (apiMedia && apiMedia.length > 0) {
          setMedia(apiMedia);
        }
        if (apiMembers) {
          setMembers(apiMembers);
        }
      });
    }
    void fetchProfileFromSupabase(payload.userId).then((dbProfile) => {
      if (dbProfile) {
        setUser((prev) => ({ ...prev, ...dbProfile }));
      }
    });
    setIsAuthenticated(true);
    setCurrentPage('dashboard');
    showToast('Welcome to MONTE EVENTS!');
  };

  const handleLogout = async () => {
    if (!isGuestMode) {
      await signOutSupabase();
    }
    setIsGuestMode(false);
    setAuthModal({ open: false, mode: 'login', message: null });
    setSupabaseUserId(null);
    setIsAuthenticated(false);
    setEvents([]);
    setMedia([]);
    setMessagesByEvent({});
    setCurrentPage('dashboard');
    showToast(isGuestMode ? 'Exited Preview Mode' : 'Signed out successfully', 'info');
  };

  const handleDeleteAccount = async (): Promise<{ ok: boolean; error?: string }> => {
    if (isGuestMode) {
      promptGuestToSignUp('Sign in to manage your account settings.', 'login');
      return { ok: false, error: 'Not signed in.' };
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      return { ok: false, error: 'You must be signed in to delete your account.' };
    }
    const res = await deleteAccountOnApi(accessToken);
    if (!res.ok) {
      return res;
    }
    await signOutSupabase();
    setSupabaseUserId(null);
    setIsAuthenticated(false);
    setCurrentPage('dashboard');
    showToast('Your account has been permanently deleted.', 'info');
    return { ok: true };
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
    if (isGuestMode) {
      promptGuestToSignUp(
        'Create a free account to save your event room and invite guests.'
      );
      return;
    }
    setEvents((prev) => [newEvent, ...prev]);
    const welcomeMsg: ChatMessage = {
      id: `welcome-${Date.now()}`,
      eventId: newEvent.id,
      senderId: supabaseUserId || 'me',
      senderName: user.name,
      senderInitials: user.initials,
      senderColor: '#1A6BFF',
      isMe: true,
      text: `Welcome to ${newEvent.name}! Meeting point & payment details will be pinned right here. Let’s Monte it!`,
      timestamp: getCurrentTimeLabel(),
      pinned: true,
      reactions: [{ emoji: '🔥', users: [user.name] }],
    };
    setMessagesByEvent((prev) => ({
      ...prev,
      [newEvent.id]: [welcomeMsg],
    }));
    void createEventInSupabase(newEvent).then(() => sendMessageInSupabase(welcomeMsg));
    void createRoomOnApi(newEvent).then((savedRoom) => {
      if (!savedRoom) return;
      setApiStatus('online');
      setEvents((prev) =>
        prev.map((ev) => (ev.id === newEvent.id ? savedRoom : ev))
      );
      setActiveEventId((curr) => (curr === newEvent.id ? savedRoom.id : curr));
      setMessagesByEvent((prev) => {
        const existing = prev[newEvent.id] || [welcomeMsg];
        const next = { ...prev };
        delete next[newEvent.id];
        next[savedRoom.id] = existing.map((m) => ({ ...m, eventId: savedRoom.id }));
        return next;
      });
      void sendRoomMessageOnApi(savedRoom.id, {
        ...welcomeMsg,
        eventId: savedRoom.id,
      });
    });
    setActiveEventId(newEvent.id);
    setActiveEventTab('guests');
    setCurrentPage('event-room');
    showToast(`Room "${newEvent.name}" created!`);
  };

  const isUserRoomHost = useCallback(
    (event: MonteEvent): boolean => {
      if (isGuestMode) return false;
      if (event.hostId && supabaseUserId && event.hostId === supabaseUserId) {
        return true;
      }
      if (
        event.hostEmail &&
        user.email &&
        event.hostEmail.toLowerCase() === user.email.toLowerCase()
      ) {
        return true;
      }
      return (
        Boolean(user.name) &&
        event.createdBy.trim().toLowerCase() === user.name.trim().toLowerCase()
      );
    },
    [isGuestMode, supabaseUserId, user.email, user.name]
  );

  const handleDeleteEvent = (eventId: string) => {
    if (isGuestMode) {
      promptGuestToSignUp('Sign in to manage and delete your event rooms.');
      return;
    }
    const target = events.find((e) => e.id === eventId);
    if (target && !isUserRoomHost(target)) {
      showToast('Only the room host can delete this room.', 'info');
      return;
    }
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    setMessagesByEvent((prev) => {
      const next = { ...prev };
      delete next[eventId];
      return next;
    });
    setMedia((prev) => prev.filter((m) => m.eventId !== eventId));
    if (activeEventId === eventId) {
      setActiveEventId('');
      if (currentPage === 'event-room') {
        setCurrentPage('rooms');
      }
    }
    if (activeChatEventId === eventId) {
      setActiveChatEventId(null);
    }
    void deleteRoomOnApi(eventId);
    void deleteEventInSupabase(eventId);
    showToast(
      target ? `Deleted room "${target.name}"` : 'Room deleted',
      'info'
    );
  };

  const handleToggleGuestPaid = (eventId: string, guestId: string) => {
    if (isGuestMode) {
      promptGuestToSignUp(
        'Sign in to confirm M-Pesa payments and track event budgets.'
      );
      return;
    }
    const targetEvent = events.find((e) => e.id === eventId);
    if (targetEvent && !isUserRoomHost(targetEvent)) {
      showToast('Only the room host can confirm guest payments.', 'info');
      return;
    }
    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== eventId) return ev;
        return {
          ...ev,
          guests: ev.guests.map((g) => {
            if (g.id !== guestId) return g;
            const nextPaid = !g.paid;
            const paidAt = nextPaid ? 'Just now' : undefined;
            void toggleGuestPaidInSupabase(g.id, nextPaid, paidAt);
            void toggleGuestPaymentOnApi(eventId, g.id, nextPaid);
            showToast(
              nextPaid
                ? `${g.name} confirmed as Paid — In the Event!`
                : `${g.name} moved back to Pending`,
              nextPaid ? 'success' : 'info'
            );
            return {
              ...g,
              paid: nextPaid,
              paidAt,
            };
          }),
        };
      })
    );
  };

  const handleJoinRoom = useCallback(
    async (roomId: string) => {
      if (isGuestMode) {
        promptGuestToSignUp(
          'Create a free account to join this room and receive event updates.'
        );
        return;
      }
      const res = await joinRoomOnApi(roomId, {
        name: user.name,
        email: user.email,
        phone: user.phone,
      });
      if (res.ok && res.guest) {
        setEvents((prev) =>
          prev.map((ev) => {
            if (ev.id !== roomId) return ev;
            const alreadyIn = ev.guests.some(
              (g) =>
                g.id === res.guest!.id ||
                (user.email && g.email === user.email)
            );
            if (alreadyIn) return ev;
            return { ...ev, guests: [...ev.guests, res.guest!] };
          })
        );
        showToast(
          res.emailSent
            ? 'You joined the room! Check your email for confirmation.'
            : 'You joined the room!',
          'success'
        );
      }
    },
    [isGuestMode, promptGuestToSignUp, showToast, user.email, user.name, user.phone]
  );

  // Handle ?room=<id> or ?join=<code> invite links when signed in and rooms are loaded
  useEffect(() => {
    if (!isAuthenticated || isGuestMode || events.length === 0) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    const roomParam = params.get('room');
    if (!joinCode && !roomParam) return;

    const matched = joinCode
      ? events.find(
          (e) => e.inviteCode.toLowerCase() === joinCode.trim().toLowerCase()
        )
      : events.find((e) => e.id === roomParam);

    if (matched) {
      setActiveEventId(matched.id);
      setActiveEventTab('guests');
      setCurrentPage('event-room');
      if (joinCode) {
        void handleJoinRoom(matched.id);
      }
      const cleanUrl = `${window.location.origin}${window.location.pathname}`;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, [isAuthenticated, isGuestMode, events, handleJoinRoom]);

  const handleAddGuestToEvent = (eventId: string, guest: Guest) => {
    if (isGuestMode) {
      promptGuestToSignUp(
        'Create a free account to invite friends and manage guest lists.'
      );
      return;
    }
    const targetEvent = events.find((e) => e.id === eventId);
    if (targetEvent && !isUserRoomHost(targetEvent)) {
      showToast('Only the room host can add guests to this room.', 'info');
      return;
    }
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
    void addGuestInSupabase(eventId, guest);
    void addGuestOnApi(eventId, guest).then((savedGuest) => {
      if (!savedGuest) return;
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === eventId
            ? {
                ...ev,
                guests: ev.guests.map((g) =>
                  g.id === guest.id ? savedGuest : g
                ),
              }
            : ev
        )
      );
    });
  };

  const handleRemoveGuestFromEvent = (eventId: string, guestId: string) => {
    if (isGuestMode) {
      promptGuestToSignUp('Sign in to manage guests in your room.');
      return;
    }
    const targetEvent = events.find((e) => e.id === eventId);
    if (targetEvent && !isUserRoomHost(targetEvent)) {
      showToast('Only the room host can remove guests.', 'info');
      return;
    }
    setEvents((prev) =>
      prev.map((ev) =>
        ev.id === eventId
          ? { ...ev, guests: ev.guests.filter((g) => g.id !== guestId) }
          : ev
      )
    );
    void removeGuestOnApi(eventId, guestId);
    showToast('Guest removed from room', 'info');
  };

  const handleRefreshMembers = useCallback(async () => {
    if (isGuestMode) {
      setMembers(GUEST_PREVIEW_MEMBERS);
      return;
    }
    setMembersLoading(true);
    const list = await fetchMembersFromApi();
    if (list) {
      setMembers(list);
    }
    setMembersLoading(false);
  }, [isGuestMode]);

  const handleAddFriend = (member: PlatformMember) => {
    if (isGuestMode) {
      promptGuestToSignUp(
        'Create a free account to add friends and chat with them directly.'
      );
      return;
    }
    setFriends((prev) => {
      if (prev.some((f) => f.id === member.id)) return prev;
      const next = [member, ...prev];
      try {
        window.localStorage.setItem('monte-friends', JSON.stringify(next));
      } catch {
        // Ignore storage quota errors
      }
      return next;
    });
    showToast(`Added ${member.name} as a friend!`, 'success');
  };

  const handleStartFriendChat = (member: PlatformMember) => {
    setActiveChatSection('friends');
    setActiveFriendId(member.id);
    setCurrentPage('chats');
  };

  const handleSendDirectMessage = (friendId: string, text: string) => {
    if (isGuestMode) {
      promptGuestToSignUp(
        'Sign in to chat with your friends and plan events together.'
      );
      return;
    }
    if (!text.trim()) return;
    const dm: DirectMessage = {
      id: `dm-${Date.now()}`,
      friendId,
      senderName: user.name,
      senderInitials: user.initials,
      isMe: true,
      text: text.trim(),
      timestamp: getCurrentTimeLabel(),
    };
    setDirectMessagesByFriend((prev) => {
      const next = {
        ...prev,
        [friendId]: [...(prev[friendId] || []), dm],
      };
      try {
        window.localStorage.setItem('monte-direct-messages', JSON.stringify(next));
      } catch {
        // Ignore storage quota errors
      }
      return next;
    });
  };

  const handleInviteMemberToRoom = (roomId: string, member: PlatformMember) => {
    if (isGuestMode) {
      promptGuestToSignUp(
        'Create a free account to invite platform members to your event rooms.'
      );
      return;
    }
    const targetRoom = events.find((e) => e.id === roomId);
    const guest: Guest = {
      id: `g-mem-${Date.now()}`,
      name: member.name,
      phone: '',
      email: member.email || '',
      initials: member.initials,
      avatarColor: '#1A6BFF',
      amount: targetRoom?.costPerPerson || 0,
      paid: false,
      online: false,
    };
    handleAddGuestToEvent(roomId, guest);
    showToast(
      `Invited ${member.name} to ${targetRoom?.name || 'the room'}!`,
      'success'
    );
  };

  const handleUploadMedia = (_eventId: string, items: MediaItem[]) => {
    if (isGuestMode) {
      promptGuestToSignUp(
        'Create a free account to upload photos and videos to your Media Vault.'
      );
      return;
    }
    setMedia((prev) => [...items, ...prev]);
    void uploadMediaInSupabase(items);
    items.forEach((item) => {
      void createMediaOnApi(item);
    });
  };

  const handleSendMessage = (
    eventId: string,
    text: string,
    options?: {
      replyTo?: { id: string; senderName: string; text: string };
      media?: { type: 'photo' | 'video'; url: string; title?: string };
    }
  ) => {
    if (isGuestMode) {
      promptGuestToSignUp(
        'Sign in to chat with your event squad and share updates.'
      );
      return;
    }
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
    void sendMessageInSupabase(newMsg);
    void sendRoomMessageOnApi(eventId, newMsg);

    // Also add chat media to event media vault & Supabase
    if (options?.media) {
      const targetEvent = events.find((e) => e.id === eventId);
      if (targetEvent) {
        const mediaItem: MediaItem = {
          id: `chat-vault-${Date.now()}`,
          eventId,
          eventName: targetEvent.name,
          type: options.media.type,
          url: options.media.url,
          thumbnail: options.media.url,
          title: options.media.title || 'Shared in Chat',
          uploadedBy: user.name,
          uploadedAt: 'Just now',
        };
        setMedia((prev) => [mediaItem, ...prev]);
        void uploadMediaInSupabase([mediaItem]);
        void createMediaOnApi(mediaItem);
      }
    }
  };

  const handleToggleReaction = (eventId: string, messageId: string, emoji: string) => {
    if (isGuestMode) {
      promptGuestToSignUp('Create a free account to react to messages.');
      return;
    }
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
        void updateMessageReactionsInSupabase(messageId, nextReactions);
        return { ...msg, reactions: nextReactions };
      }),
    }));
  };

  const handleTogglePin = (eventId: string, messageId: string) => {
    if (isGuestMode) {
      promptGuestToSignUp('Create a free account to pin event announcements.');
      return;
    }
    setMessagesByEvent((prev) => ({
      ...prev,
      [eventId]: (prev[eventId] || []).map((msg) => {
        if (msg.id !== messageId) return msg;
        const nextPinned = !msg.pinned;
        void updateMessagePinInSupabase(messageId, nextPinned);
        return { ...msg, pinned: nextPinned };
      }),
    }));
    showToast('Updated pinned messages', 'info');
  };

  const handleUpdateProfile = (updated: UserProfile) => {
    if (isGuestMode) {
      promptGuestToSignUp(
        'Create a free account to customize your Monte Events profile.'
      );
      return;
    }
    setUser(updated);
    void upsertProfileInSupabase(supabaseUserId, updated);
  };

  const handleMarkNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const activeEvent = events.find((e) => e.id === activeEventId) || events[0];

  const handleContinueAfterVerified = () => {
    setShowEmailVerified(false);
    if (typeof window !== 'undefined') {
      const cleanUrl = `${window.location.origin}${window.location.pathname}`;
      window.history.replaceState({}, document.title, cleanUrl);
    }
    if (isAuthenticated) {
      setCurrentPage('dashboard');
      showToast('Welcome to MONTE EVENTS!');
    }
  };

  return (
    <>
      {showEmailVerified ? (
        <EmailVerifiedPage
          email={user.email || undefined}
          isSignedIn={isAuthenticated}
          onContinue={handleContinueAfterVerified}
        />
      ) : !isAuthenticated ? (
        <AuthPage
          onLogin={handleLogin}
          onExploreAsGuest={handleExploreAsGuest}
          onShowToast={showToast}
        />
      ) : (
        <AppShell
          currentPage={currentPage}
          onNavigate={handleNavigate}
          totalUnreadChats={totalUnreadChats}
          user={user}
          isGuestMode={isGuestMode}
          onPromptAuth={promptGuestToSignUp}
        >
          {currentPage === 'dashboard' && (
            <DashboardPage
              user={user}
              events={events}
              media={media}
              notifications={notifications}
              apiStatus={apiStatus}
              onMarkNotificationsRead={handleMarkNotificationsRead}
              onOpenEvent={handleOpenEvent}
              onNavigate={handleNavigate}
              onSelectMedia={handleSelectMedia}
            />
          )}

          {currentPage === 'create' && (
            <CreateRoomPage
              creatorName={user.name}
              creatorEmail={user.email}
              creatorId={supabaseUserId}
              onCreateEvent={handleCreateEvent}
              onCancel={() => setCurrentPage('dashboard')}
              onShowToast={showToast}
            />
          )}

          {currentPage === 'rooms' && (
            <MyRoomsPage
              events={events}
              isRoomHost={isUserRoomHost}
              onOpenEvent={handleOpenEvent}
              onDeleteEvent={handleDeleteEvent}
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
              isHost={isUserRoomHost(activeEvent)}
              typingUser={typingByEvent[activeEvent.id] || null}
              onBack={() => setCurrentPage('rooms')}
              onDeleteEvent={handleDeleteEvent}
              onJoinRoom={handleJoinRoom}
              onToggleGuestPaid={handleToggleGuestPaid}
              onAddGuestToEvent={handleAddGuestToEvent}
              onRemoveGuestFromEvent={handleRemoveGuestFromEvent}
              onUploadMedia={handleUploadMedia}
              onSendMessage={handleSendMessage}
              onToggleReaction={handleToggleReaction}
              onTogglePin={handleTogglePin}
              onSelectMedia={handleSelectMedia}
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
              friends={friends}
              directMessagesByFriend={directMessagesByFriend}
              activeChatSection={activeChatSection}
              activeFriendId={activeFriendId}
              onChangeChatSection={setActiveChatSection}
              onSelectChatEvent={handleSelectGlobalChat}
              onSelectFriend={setActiveFriendId}
              onSendMessage={handleSendMessage}
              onSendDirectMessage={handleSendDirectMessage}
              onToggleReaction={handleToggleReaction}
              onTogglePin={handleTogglePin}
              onAddGuestToEvent={handleAddGuestToEvent}
              onSelectMedia={handleSelectMedia}
              onViewMemberProfile={setViewingMember}
              onGoToMembers={() => setCurrentPage('members')}
              onShowToast={showToast}
            />
          )}

          {currentPage === 'members' && (
            <MembersPage
              members={members}
              friendIds={friends.map((f) => f.id)}
              events={events}
              currentUserEmail={user.email}
              loading={membersLoading}
              onRefresh={handleRefreshMembers}
              onAddFriend={handleAddFriend}
              onStartFriendChat={handleStartFriendChat}
              onViewMemberProfile={setViewingMember}
              onInviteMemberToRoom={handleInviteMemberToRoom}
              onCreateRoom={() => setCurrentPage('create')}
            />
          )}

          {currentPage === 'media' && (
            <MediaVaultPage
              events={events}
              media={media}
              user={user}
              onUploadMedia={handleUploadMedia}
              onSelectMedia={handleSelectMedia}
              onShowToast={showToast}
            />
          )}

          {currentPage === 'profile' && (
            <ProfilePage
              user={user}
              events={events}
              media={media}
              supabaseStatus={supabaseStatus}
              isGuestMode={isGuestMode}
              onPromptAuth={promptGuestToSignUp}
              onUpdateProfile={handleUpdateProfile}
              onOpenEvent={handleOpenEvent}
              onSelectMedia={handleSelectMedia}
              onLogout={handleLogout}
              onDeleteAccount={handleDeleteAccount}
              onShowToast={showToast}
            />
          )}
        </AppShell>
      )}

      {/* Guest Conversion Sign Up / Log In Modal */}
      {authModal.open && (
        <AuthPage
          asModal
          initialMode={authModal.mode}
          contextMessage={authModal.message}
          onCloseModal={() =>
            setAuthModal({ open: false, mode: 'signup', message: null })
          }
          onLogin={handleLogin}
          onShowToast={showToast}
        />
      )}

      {/* Set New Password Modal (?reset=true or PASSWORD_RECOVERY) */}
      <ResetPasswordModal
        open={showResetPasswordModal}
        onClose={() => {
          setShowResetPasswordModal(false);
          if (typeof window !== 'undefined') {
            const cleanUrl = `${window.location.origin}${window.location.pathname}`;
            window.history.replaceState({}, document.title, cleanUrl);
          }
        }}
        onSuccess={() => {
          setShowResetPasswordModal(false);
          if (typeof window !== 'undefined') {
            const cleanUrl = `${window.location.origin}${window.location.pathname}`;
            window.history.replaceState({}, document.title, cleanUrl);
          }
          showToast('Password updated successfully!', 'success');
        }}
      />

      {/* Member / Friend Profile Modal */}
      <MemberProfileModal
        member={viewingMember}
        isFriend={
          Boolean(viewingMember) &&
          friends.some((f) => f.id === viewingMember!.id)
        }
        isMe={
          Boolean(viewingMember?.email) &&
          Boolean(user.email) &&
          viewingMember!.email!.toLowerCase() === user.email.toLowerCase()
        }
        events={events}
        onClose={() => setViewingMember(null)}
        onAddFriend={handleAddFriend}
        onStartChat={handleStartFriendChat}
        onInviteToRoom={handleInviteMemberToRoom}
        onOpenEvent={(eventId) => handleOpenEvent(eventId, 'guests')}
      />

      <MediaLightbox
        items={lightboxState?.items || []}
        currentIndex={lightboxState ? lightboxState.index : -1}
        onChangeIndex={(nextIndex) =>
          setLightboxState((prev) => (prev ? { ...prev, index: nextIndex } : null))
        }
        onClose={() => setLightboxState(null)}
      />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <MonteAppContent />
      </ThemeProvider>
    </MotionConfig>
  );
}
