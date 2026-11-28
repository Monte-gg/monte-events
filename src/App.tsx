import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { ThemeProvider } from './context/ThemeContext';
import { supabase } from './lib/supabase';
import {
  ApiStatus,
  addGuestOnApi,
  checkApiHealth,
  createExpenseOnApi,
  createMediaOnApi,
  createRoomOnApi,
  deleteAccountOnApi,
  deleteExpenseOnApi,
  deleteRoomOnApi,
  fetchInvitePreviewFromApi,
  fetchMediaFromApi,
  fetchMembersFromApi,
  fetchRoomMessagesFromApi,
  fetchRoomsFromApi,
  joinRoomOnApi,
  removeGuestOnApi,
  sendRoomMessageOnApi,
  sendWelcomeEmailOnApi,
  submitGuestMpesaCodeOnApi,
  toggleGuestPaymentOnApi,
  updateRoomOnApi,
} from './lib/api';
import {
  addGuestInSupabase,
  createRoomDirectlyInSupabase,
  deleteEventInSupabase,
  deleteRoomDirectlyInSupabase,
  fetchInvitePreviewDirectlyFromSupabase,
  fetchProfileFromSupabase,
  joinRoomDirectlyInSupabase,
  loadAllMonteData,
  loadMembersDirectlyFromSupabase,
  loadRoomsDirectlyFromSupabase,
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
  ExpenseCategory,
  ExpenseItem,
  Guest,
  MediaItem,
  MonteEvent,
  NotificationItem,
  PlatformMember,
  PublicInvitePreview,
  UserProfile,
} from './types';
import { AuthPage } from './components/AuthPage';
import { EmailVerifiedPage } from './components/EmailVerifiedPage';
import { EventInvitePreviewPage } from './components/EventInvitePreviewPage';
import { ResetPasswordModal } from './components/ResetPasswordModal';
import { AppShell } from './components/AppShell';
import { DashboardPage } from './components/DashboardPage';
import { CreateRoomPage } from './components/CreateRoomPage';
import { EventRoomPage } from './components/EventRoomPage';
import { GlobalChatsPage } from './components/GlobalChatsPage';
import { MyRoomsPage } from './components/MyRoomsPage';
import { MembersPage } from './components/MembersPage';
import { MemberProfileModal } from './components/MemberProfileModal';
import { EventFlyerModal } from './components/EventFlyerModal';
import { MediaVaultPage } from './components/MediaVaultPage';
import { ProfilePage } from './components/ProfilePage';
import { MediaLightbox } from './components/MediaLightbox';
import { ToastContainer, ToastData } from './components/Toast';
import { AppUpdateInfo, checkForAppUpdate } from './lib/appVersion';
import { isNativeApp } from './lib/nativeApp';
import {
  NotificationChannelId,
  NotificationPermissionState,
  getNotificationPermissionStatus,
  requestNotificationPermission,
  sendDeviceNotification,
} from './lib/notifications';

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

function mergePlatformMembers(
  primary: PlatformMember[],
  secondary: PlatformMember[]
): PlatformMember[] {
  const byKey = new Map<string, PlatformMember>();
  const add = (m: PlatformMember) => {
    if (!m || !m.name) return;
    const key = (m.email || m.id || m.name).trim().toLowerCase();
    if (!key) return;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, m);
    } else if (!existing.avatarUrl && m.avatarUrl) {
      byKey.set(key, { ...existing, avatarUrl: m.avatarUrl });
    }
  };
  primary.forEach(add);
  secondary.forEach(add);
  return Array.from(byKey.values());
}

function MonteAppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const isGuestModeRef = useRef(false);
  const apiOnlineRef = useRef(false);
  const manualOfflineRef = useRef<boolean>(
    (() => {
      if (typeof window === 'undefined') return false;
      try {
        return window.localStorage.getItem('monte-manual-offline') === '1';
      } catch {
        return false;
      }
    })()
  );
  const syncFromSupabaseRef = useRef<(() => Promise<void>) | null>(null);
  const syncFromRenderApiRef = useRef<((timeoutMs?: number) => Promise<boolean>) | null>(null);
  const userRef = useRef<UserProfile>(INITIAL_USER_PROFILE);
  const eventsRef = useRef<MonteEvent[]>(INITIAL_EVENTS);
  const pushNotificationRef = useRef<
    ((payload: {
      id?: string;
      title: string;
      body: string;
      eventId?: string;
      channelId?: NotificationChannelId;
    }) => void) | null
  >(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const deletedRoomKeysRef = useRef<Set<string>>(
    (() => {
      if (typeof window === 'undefined') return new Set<string>();
      try {
        const raw = window.localStorage.getItem('monte-deleted-rooms');
        return raw ? new Set<string>(JSON.parse(raw) as string[]) : new Set<string>();
      } catch {
        return new Set<string>();
      }
    })()
  );
  useEffect(() => {
    isGuestModeRef.current = isGuestMode;
  }, [isGuestMode]);
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
  const [invitePreview, setInvitePreview] = useState<PublicInvitePreview | null>(
    null
  );
  const [joiningFromInvite, setJoiningFromInvite] = useState(false);
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
      } else if (mounted) {
        // Ensure signed-in user exists in public.profiles so they appear in Members directory
        void upsertProfileInSupabase(uid, {
          ...INITIAL_USER_PROFILE,
          name: googleName,
          username:
            googleName.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'member',
          email: sessionUser.email || '',
          phone: (meta.phone as string) || '',
          avatarUrl: googleAvatar || '',
          initials,
        });
      }

      // Hydrate & sync friends across Desktop Web, Mobile Web & Android APK via Supabase user_metadata
      const cloudFriends = Array.isArray(meta.monte_friends)
        ? (meta.monte_friends as PlatformMember[])
        : [];
      let localFriends: PlatformMember[] = [];
      if (typeof window !== 'undefined') {
        try {
          const raw = window.localStorage.getItem('monte-friends');
          localFriends = raw ? (JSON.parse(raw) as PlatformMember[]) : [];
        } catch {
          localFriends = [];
        }
      }
      const mergedFriends = mergePlatformMembers(cloudFriends, localFriends);
      if (mounted && mergedFriends.length > 0) {
        setFriends(mergedFriends);
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem('monte-friends', JSON.stringify(mergedFriends));
          } catch {
            // Ignore storage quota errors
          }
        }
        if (mergedFriends.length > cloudFriends.length) {
          void supabase.auth.updateUser({
            data: { monte_friends: mergedFriends },
          });
        }
      }
    };

    const syncFromSupabase = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const sessionUser = sessionData.session?.user || null;
        if (sessionUser) {
          await applySupabaseSessionUser(sessionUser);
        }
        const [synced, directRooms, directMembers] = await Promise.all([
          loadAllMonteData(sessionUser?.id || undefined),
          loadRoomsDirectlyFromSupabase(),
          loadMembersDirectlyFromSupabase(),
        ]);
        if (!mounted) return;
        setSupabaseStatus({
          connected: synced.connected || directRooms !== null,
          schemaReady: synced.schemaReady || directRooms !== null,
        });

        if (directMembers.length > 0 && !isGuestModeRef.current) {
          setMembers((prev) => mergePlatformMembers(prev, directMembers));
        }

        // Merge public.rooms AND legacy public.events (deduplicated by inviteCode) so no room is ever hidden
        const mergedMap = new Map<string, MonteEvent>();
        for (const r of directRooms || []) {
          const key = (r.inviteCode || r.id).toLowerCase();
          mergedMap.set(key, r);
        }
        for (const r of synced.events || []) {
          const key = (r.inviteCode || r.id).toLowerCase();
          if (!mergedMap.has(key)) {
            mergedMap.set(key, r);
          }
        }
        const sourceRooms = Array.from(mergedMap.values());

        if (sourceRooms.length > 0 && !isGuestModeRef.current) {
          const cleanSynced = sourceRooms.filter(
            (e) =>
              !deletedRoomKeysRef.current.has(e.id) &&
              !deletedRoomKeysRef.current.has(e.inviteCode)
          );
          setEvents((prev) => {
            const syncedCodes = new Set(cleanSynced.map((e) => e.inviteCode));
            const localOnly = prev.filter(
              (e) =>
                e.id.startsWith('evt-') &&
                !syncedCodes.has(e.inviteCode) &&
                !deletedRoomKeysRef.current.has(e.id) &&
                !deletedRoomKeysRef.current.has(e.inviteCode)
            );
            return [...localOnly, ...cleanSynced];
          });
          if (cleanSynced.length > 0) {
            setActiveEventId((curr) => (curr ? curr : cleanSynced[0].id));
            setActiveChatEventId((curr) => (curr ? curr : cleanSynced[0].id));
          }
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

    syncFromSupabaseRef.current = syncFromSupabase;
    void syncFromSupabase();

    // Connect to Render Express API (graceful fallback to offline/Supabase mode if sleeping/unreachable)
    const syncFromRenderApi = async (timeoutMs = 8000): Promise<boolean> => {
      if (manualOfflineRef.current) {
        if (mounted) {
          setApiStatus('demo');
          apiOnlineRef.current = false;
        }
        return false;
      }
      if (mounted) {
        setApiStatus('waking');
      }
      const healthy = await checkApiHealth(timeoutMs);
      if (!mounted) return false;
      if (!healthy) {
        setApiStatus('demo');
        apiOnlineRef.current = false;
        return false;
      }
      setApiStatus('online');
      apiOnlineRef.current = true;

      const [apiRooms, apiMedia, apiMembers] = await Promise.all([
        fetchRoomsFromApi(),
        fetchMediaFromApi(),
        fetchMembersFromApi(),
      ]);
      if (!mounted || isGuestModeRef.current) return true;
      if (apiMembers && apiMembers.length > 0) {
        setMembers((prev) => mergePlatformMembers(apiMembers, prev));
      }

      if (apiRooms && apiRooms.length > 0) {
        const cleanApiRooms = apiRooms.filter(
          (e) =>
            !deletedRoomKeysRef.current.has(e.id) &&
            !deletedRoomKeysRef.current.has(e.inviteCode)
        );
        setEvents((prev) => {
          const apiCodes = new Set(cleanApiRooms.map((e) => e.inviteCode));
          const localOnly = prev.filter(
            (e) =>
              e.id.startsWith('evt-') &&
              !apiCodes.has(e.inviteCode) &&
              !deletedRoomKeysRef.current.has(e.id) &&
              !deletedRoomKeysRef.current.has(e.inviteCode)
          );
          return [...localOnly, ...cleanApiRooms];
        });
        if (cleanApiRooms.length > 0) {
          setActiveEventId((curr) =>
            curr && (cleanApiRooms.some((e) => e.id === curr) || curr.startsWith('evt-'))
              ? curr
              : cleanApiRooms[0].id
          );
          setActiveChatEventId((curr) =>
            curr && (cleanApiRooms.some((e) => e.id === curr) || curr.startsWith('evt-'))
              ? curr
              : cleanApiRooms[0].id
          );
        }

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
      return true;
    };

    syncFromRenderApiRef.current = syncFromRenderApi;
    if (manualOfflineRef.current) {
      setApiStatus('demo');
    } else {
      void syncFromRenderApi();
    }

    // Detect public ?join=CODE invite link on load (even before sign-in)
    const loadPublicInvite = async () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const joinCode = params.get('join');
      if (!joinCode) return;

      const directPreview = await fetchInvitePreviewDirectlyFromSupabase(joinCode);
      if (!mounted) return;
      if (directPreview) {
        setInvitePreview(directPreview);
        return;
      }
      const apiPreview = await fetchInvitePreviewFromApi(joinCode);
      if (!mounted) return;
      if (apiPreview) {
        setInvitePreview(apiPreview);
        return;
      }
      // Graceful fallback to preview sample events if API is sleeping or demo invite code
      const fallback = GUEST_PREVIEW_EVENTS.find(
        (e) => e.inviteCode.toLowerCase() === joinCode.trim().toLowerCase()
      );
      if (fallback) {
        setInvitePreview({
          id: fallback.id,
          name: fallback.name,
          type: fallback.type,
          customType: fallback.customType,
          date: fallback.date,
          location: fallback.location,
          description: fallback.description,
          coverImage: fallback.coverImage,
          coverGradient: fallback.coverGradient,
          costPerPerson: fallback.costPerPerson,
          maxGuests: fallback.maxGuests,
          guestCount: fallback.guests.length,
          paidCount: fallback.guests.filter((g) => g.paid).length,
          inviteCode: fallback.inviteCode,
          createdBy: fallback.createdBy,
        });
      }
    };
    void loadPublicInvite();

    // Subscribe to live Realtime database changes across tabs/devices (with instant Chat, Room & Invite notifications)
    const channel = supabase
      .channel('monte-events-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms' },
        (payload) => {
          if (payload.eventType === 'INSERT' && !isGuestModeRef.current) {
            const row = (payload.new || {}) as Record<string, unknown>;
            const creator = String(row.created_by || '');
            const hostEmail = String(row.host_email || '');
            const me = userRef.current;
            const isMine =
              (me.email && hostEmail && me.email.toLowerCase() === hostEmail.toLowerCase()) ||
              (me.name && creator && me.name.toLowerCase() === creator.toLowerCase());
            if (!isMine && row.name) {
              pushNotificationRef.current?.({
                id: `rt-room-${String(row.id || Date.now())}`,
                title: `New Event Room: ${String(row.name)}`,
                body: `${creator || 'A member'} just created a new room in ${String(row.location || 'Monte Events')}.`,
                eventId: row.id ? String(row.id) : undefined,
                channelId: 'monte-general',
              });
            }
          }
          void syncFromSupabase();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'guests' },
        (payload) => {
          if (payload.eventType === 'INSERT' && !isGuestModeRef.current) {
            const row = (payload.new || {}) as Record<string, unknown>;
            const guestEmail = String(row.email || '').toLowerCase();
            const guestName = String(row.name || '').toLowerCase();
            const me = userRef.current;
            const roomId = String(row.room_id || '');
            const room = eventsRef.current.find((e) => e.id === roomId);
            if (
              (me.email && guestEmail && me.email.toLowerCase() === guestEmail) ||
              (me.name && guestName && me.name.toLowerCase() === guestName)
            ) {
              pushNotificationRef.current?.({
                id: `rt-invite-${String(row.id || Date.now())}`,
                title: `Room Invite: ${room?.name || 'Monte Event'}`,
                body: `You've been added to ${room?.name || 'an event room'}! Tap to view details.`,
                eventId: roomId || undefined,
                channelId: 'monte-friends',
              });
            }
          }
          void syncFromSupabase();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          if (payload.eventType === 'INSERT' && !isGuestModeRef.current) {
            const row = (payload.new || {}) as Record<string, unknown>;
            const sender = String(row.sender_name || 'Member');
            const text = String(row.text || 'Sent an attachment');
            const roomId = String(row.room_id || '');
            const me = userRef.current;
            if (sender.toLowerCase() !== me.name.toLowerCase()) {
              const room = eventsRef.current.find((e) => e.id === roomId);
              pushNotificationRef.current?.({
                id: `rt-msg-${String(row.id || Date.now())}`,
                title: `New Chat${room ? ` • ${room.name}` : ''}`,
                body: `${sender}: ${text.slice(0, 110)}`,
                eventId: roomId || undefined,
                channelId: 'monte-chats',
              });
            }
          }
          void syncFromSupabase();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'event_messages' },
        (payload) => {
          if (!isGuestModeRef.current) {
            const row = (payload.new || {}) as Record<string, unknown>;
            const sender = String(row.sender_name || 'Member');
            const text = String(row.text || 'Sent an attachment');
            const eventId = String(row.event_id || '');
            const me = userRef.current;
            if (sender.toLowerCase() !== me.name.toLowerCase()) {
              const room = eventsRef.current.find((e) => e.id === eventId);
              pushNotificationRef.current?.({
                id: `rt-emsg-${String(row.id || Date.now())}`,
                title: `New Chat${room ? ` • ${room.name}` : ''}`,
                body: `${sender}: ${text.slice(0, 110)}`,
                eventId: eventId || undefined,
                channelId: 'monte-chats',
              });
            }
          }
          void syncFromSupabase();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'media' },
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
  const [flyerEvent, setFlyerEvent] = useState<MonteEvent | null>(null);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [appUpdateInfo, setAppUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [notifPermission, setNotifPermission] =
    useState<NotificationPermissionState>('prompt');

  const pushNotification = useCallback(
    (payload: {
      id?: string;
      title: string;
      body: string;
      eventId?: string;
      channelId?: NotificationChannelId;
    }) => {
      const id = payload.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setNotifications((prev) => {
        if (prev.some((n) => n.id === id)) return prev;
        return [
          {
            id,
            title: payload.title,
            body: payload.body,
            time: getCurrentTimeLabel(),
            read: false,
            eventId: payload.eventId,
          },
          ...prev,
        ].slice(0, 30);
      });
      void sendDeviceNotification({
        title: payload.title,
        body: payload.body,
        channelId: payload.channelId,
      });
    },
    []
  );

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    pushNotificationRef.current = pushNotification;
  }, [pushNotification]);

  const handleCheckAppUpdate = useCallback(async (): Promise<void> => {
    const info = await checkForAppUpdate();
    setAppUpdateInfo(info);
    if (info.hasUpdate) {
      pushNotification({
        id: `app-update-${info.latestVersion}`,
        title: `Monte Events v${info.latestVersion} Available!`,
        body: 'A new update is ready with the latest features and fixes. Tap the Update card to install.',
        channelId: 'monte-general',
      });
    }
  }, [pushNotification]);

  const handleEnableNotifications = useCallback(async () => {
    const granted = await requestNotificationPermission();
    const status = await getNotificationPermissionStatus();
    setNotifPermission(status);
    if (granted) {
      showToast('Device notifications enabled!');
      void sendDeviceNotification({
        title: 'Monte Events Notifications Active',
        body: 'You will now receive alerts for app updates, new rooms, unpaid events, and M-PESA confirmations.',
      });
    } else {
      showToast('Enable notifications in your phone or browser settings.', 'info');
    }
  }, []);

  // Check for app updates + notification permissions on mount, on app resume/focus, and periodically
  useEffect(() => {
    void handleCheckAppUpdate();
    void getNotificationPermissionStatus().then((status) => {
      setNotifPermission(status);
      if (isNativeApp() && status === 'prompt') {
        void requestNotificationPermission().then(async () => {
          setNotifPermission(await getNotificationPermissionStatus());
        });
      }
    });

    const handleResumeSync = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void handleCheckAppUpdate();
      void syncFromSupabaseRef.current?.();
      if (!manualOfflineRef.current) {
        void syncFromRenderApiRef.current?.(10000);
      }
    };

    window.addEventListener('focus', handleResumeSync);
    document.addEventListener('visibilitychange', handleResumeSync);

    const dataInterval = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      void syncFromSupabaseRef.current?.();
    }, 30000);

    const updateInterval = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      void handleCheckAppUpdate();
    }, 60000);

    return () => {
      window.removeEventListener('focus', handleResumeSync);
      document.removeEventListener('visibilitychange', handleResumeSync);
      window.clearInterval(dataInterval);
      window.clearInterval(updateInterval);
    };
  }, [handleCheckAppUpdate]);

  // Surface unpaid / pending event reminders in the Notification Bell
  useEffect(() => {
    if (events.length === 0 || isGuestMode) return;
    setNotifications((prev) => {
      const existingIds = new Set(prev.map((n) => n.id));
      const additions: NotificationItem[] = [];
      for (const ev of events) {
        if (ev.costPerPerson <= 0) continue;
        const unpaidGuests = ev.guests.filter((g) => !g.paid);
        const meGuest = ev.guests.find(
          (g) =>
            (user.email && g.email && g.email.toLowerCase() === user.email.toLowerCase()) ||
            g.name.toLowerCase() === user.name.toLowerCase()
        );
        const id = `unpaid-${ev.id}`;
        if (existingIds.has(id)) continue;
        if (meGuest && !meGuest.paid) {
          additions.push({
            id,
            title: `Unpaid Event: ${ev.name}`,
            body: `Your contribution of KES ${ev.costPerPerson.toLocaleString()} is still pending. Tap to pay via M-PESA.`,
            time: 'Reminder',
            read: false,
            eventId: ev.id,
          });
        } else if (unpaidGuests.length > 0) {
          additions.push({
            id,
            title: `Pending Payments: ${ev.name}`,
            body: `${unpaidGuests.length} guest${unpaidGuests.length === 1 ? '' : 's'} still pending (KES ${ev.costPerPerson.toLocaleString()}/person).`,
            time: 'Reminder',
            read: false,
            eventId: ev.id,
          });
        }
      }
      if (additions.length === 0) return prev;
      return [...additions, ...prev].slice(0, 30);
    });
  }, [events, isGuestMode, user.email, user.name]);

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
      // Reload real rooms, media & members directly from Supabase + Render API
      void Promise.all([
        loadRoomsDirectlyFromSupabase(),
        fetchRoomsFromApi(),
        fetchMediaFromApi(),
        fetchMembersFromApi(),
      ]).then(([directRooms, apiRooms, apiMedia, apiMembers]) => {
        const resolvedRooms =
          directRooms && directRooms.length > 0 ? directRooms : apiRooms;
        if (resolvedRooms && resolvedRooms.length > 0) {
          const clean = resolvedRooms.filter(
            (e) =>
              !deletedRoomKeysRef.current.has(e.id) &&
              !deletedRoomKeysRef.current.has(e.inviteCode)
          );
          setEvents(clean);
          if (clean.length > 0) {
            setActiveEventId(clean[0].id);
            setActiveChatEventId(clean[0].id);
          }
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
    // Persist immediately to Supabase public.rooms (~150ms, never blocked by Render cold start)
    void createRoomDirectlyInSupabase(newEvent).then(async (directSaved) => {
      const savedRoom = directSaved || (await createRoomOnApi(newEvent));
      if (!savedRoom) return;
      if (!directSaved) {
        setApiStatus('online');
        apiOnlineRef.current = true;
      }
      const mergedRoom: MonteEvent = {
        ...newEvent,
        ...savedRoom,
        activities:
          savedRoom.activities && savedRoom.activities.length > 0
            ? savedRoom.activities
            : newEvent.activities,
        mainGuests:
          savedRoom.mainGuests && savedRoom.mainGuests.length > 0
            ? savedRoom.mainGuests
            : newEvent.mainGuests,
        subEvents:
          savedRoom.subEvents && savedRoom.subEvents.length > 0
            ? savedRoom.subEvents
            : newEvent.subEvents,
        locationPinUrl: savedRoom.locationPinUrl || newEvent.locationPinUrl,
        expenses:
          savedRoom.expenses && savedRoom.expenses.length > 0
            ? savedRoom.expenses
            : newEvent.expenses,
      };
      setEvents((prev) =>
        prev.map((ev) => (ev.id === newEvent.id ? mergedRoom : ev))
      );
      setActiveEventId((curr) => (curr === newEvent.id ? mergedRoom.id : curr));
      setFlyerEvent((curr) => (curr && curr.id === newEvent.id ? mergedRoom : curr));
      setMessagesByEvent((prev) => {
        const existing = prev[newEvent.id] || [welcomeMsg];
        const next = { ...prev };
        delete next[newEvent.id];
        next[mergedRoom.id] = existing.map((m) => ({ ...m, eventId: mergedRoom.id }));
        return next;
      });
      void sendRoomMessageOnApi(mergedRoom.id, {
        ...welcomeMsg,
        eventId: mergedRoom.id,
      });
    });
    setActiveEventId(newEvent.id);
    setActiveEventTab('guests');
    setCurrentPage('event-room');
    setFlyerEvent(newEvent);
    pushNotification({
      id: `created-${newEvent.inviteCode}`,
      title: `Room Created: ${newEvent.name}`,
      body: `Hosted by ${newEvent.createdBy} · KES ${newEvent.costPerPerson.toLocaleString()}/person. Share your flyer to invite guests!`,
      eventId: newEvent.id,
    });
    showToast(`Room "${newEvent.name}" created! Your Event Flyer is ready.`);
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

  const handleUpdateRoom = (
    eventId: string,
    updates: {
      totalBudget?: number;
      maxGuests?: number;
      costPerPerson?: number;
    }
  ) => {
    if (isGuestMode) {
      promptGuestToSignUp('Sign in to edit room budget and guest capacity.');
      return;
    }
    setEvents((prev) =>
      prev.map((ev) =>
        ev.id === eventId
          ? {
              ...ev,
              ...(updates.totalBudget !== undefined
                ? { totalBudget: updates.totalBudget }
                : {}),
              ...(updates.maxGuests !== undefined ? { maxGuests: updates.maxGuests } : {}),
              ...(updates.costPerPerson !== undefined
                ? { costPerPerson: updates.costPerPerson }
                : {}),
            }
          : ev
      )
    );
    void updateRoomOnApi(eventId, updates);
    showToast('Room budget & capacity updated!');
  };

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
    // Immediately tombstone ID & inviteCode so no in-flight sync or quick refresh brings it back
    deletedRoomKeysRef.current.add(eventId);
    if (target?.inviteCode) {
      deletedRoomKeysRef.current.add(target.inviteCode);
    }
    try {
      window.localStorage.setItem(
        'monte-deleted-rooms',
        JSON.stringify(Array.from(deletedRoomKeysRef.current))
      );
    } catch {
      // Ignore storage quota errors
    }

    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    setFlyerEvent((curr) => (curr && curr.id === eventId ? null : curr));
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
    // Delete directly in Supabase (~100ms) AND via Render service-role API (with retry) in parallel
    void deleteRoomDirectlyInSupabase(eventId, target?.inviteCode);
    void deleteRoomOnApi(eventId, target?.inviteCode);
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
            if (nextPaid) {
              setNotifications((curr) => curr.filter((n) => n.id !== `unpaid-${eventId}`));
              pushNotification({
                title: `Payment Confirmed — ${ev.name}`,
                body: `${g.name}'s KES ${Number(g.amount || ev.costPerPerson || 0).toLocaleString()} M-PESA payment is confirmed!`,
                eventId,
                channelId: 'monte-payments',
              });
            }
            return {
              ...g,
              paid: nextPaid,
              paymentStatus: nextPaid ? 'confirmed' : 'pending',
              paidAt,
            };
          }),
        };
      })
    );
  };

  const handleSubmitGuestMpesaCode = (
    eventId: string,
    guestId: string,
    mpesaCode: string
  ) => {
    if (isGuestMode) {
      promptGuestToSignUp(
        'Create a free account to submit M-PESA codes and confirm your event spot.'
      );
      return;
    }
    setEvents((prev) =>
      prev.map((ev) =>
        ev.id === eventId
          ? {
              ...ev,
              guests: ev.guests.map((g) =>
                g.id === guestId
                  ? { ...g, mpesaCode, paymentStatus: 'submitted' }
                  : g
              ),
            }
          : ev
      )
    );
    void submitGuestMpesaCodeOnApi(eventId, guestId, mpesaCode);
    const paidEvent = events.find((e) => e.id === eventId);
    pushNotification({
      title: `M-PESA Code Submitted — ${paidEvent?.name || 'Monte Event'}`,
      body: `Code ${mpesaCode}${paidEvent?.costPerPerson ? ` (KES ${paidEvent.costPerPerson.toLocaleString()})` : ''} submitted for host verification.`,
      eventId,
      channelId: 'monte-payments',
    });
    showToast(`M-PESA code ${mpesaCode} submitted for host verification!`);
  };

  const handleAddExpense = (
    eventId: string,
    payload: {
      title: string;
      category: ExpenseCategory;
      amount: number;
      paidBy: string;
    }
  ) => {
    if (isGuestMode) {
      promptGuestToSignUp(
        'Create a free account to log and track event expenses.'
      );
      return;
    }
    const tempExpense: ExpenseItem = {
      id: `exp-${Date.now()}`,
      roomId: eventId,
      title: payload.title,
      category: payload.category,
      amount: payload.amount,
      paidBy: payload.paidBy,
    };
    setEvents((prev) =>
      prev.map((ev) =>
        ev.id === eventId
          ? { ...ev, expenses: [tempExpense, ...(ev.expenses || [])] }
          : ev
      )
    );
    void createExpenseOnApi(eventId, payload).then((saved) => {
      if (!saved) return;
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === eventId
            ? {
                ...ev,
                expenses: (ev.expenses || []).map((ex) =>
                  ex.id === tempExpense.id ? saved : ex
                ),
              }
            : ev
        )
      );
    });
    showToast(`Expense "${payload.title}" logged!`);
  };

  const handleDeleteExpense = (eventId: string, expenseId: string) => {
    if (isGuestMode) {
      promptGuestToSignUp('Sign in to manage event expenses.');
      return;
    }
    const targetEvent = events.find((e) => e.id === eventId);
    if (targetEvent && !isUserRoomHost(targetEvent)) {
      showToast('Only the room host can delete expenses.', 'info');
      return;
    }
    setEvents((prev) =>
      prev.map((ev) =>
        ev.id === eventId
          ? {
              ...ev,
              expenses: (ev.expenses || []).filter((ex) => ex.id !== expenseId),
            }
          : ev
      )
    );
    void deleteExpenseOnApi(eventId, expenseId);
    showToast('Expense removed', 'info');
  };

  const handleJoinRoom = useCallback(
    async (roomId: string) => {
      if (isGuestMode) {
        promptGuestToSignUp(
          'Create a free account to join this room and receive event updates.'
        );
        return;
      }

      const targetEvent = events.find((e) => e.id === roomId);
      const optimisticGuest: Guest = {
        id: `g-join-${Date.now()}`,
        name: user.name,
        email: user.email || undefined,
        phone: user.phone || '',
        initials: user.initials,
        avatarColor: '#1A6BFF',
        amount: targetEvent?.costPerPerson || 0,
        paid: false,
        paymentStatus: 'pending',
        online: true,
      };

      // 1. Optimistically add user to the room immediately so joining feels instant
      setEvents((prev) =>
        prev.map((ev) => {
          if (ev.id !== roomId) return ev;
          const alreadyIn = ev.guests.some(
            (g) =>
              (user.email && g.email && g.email.toLowerCase() === user.email.toLowerCase()) ||
              g.name.toLowerCase() === user.name.toLowerCase()
          );
          if (alreadyIn) return ev;
          return { ...ev, guests: [...ev.guests, optimisticGuest] };
        })
      );
      showToast(`You joined ${targetEvent?.name || 'the room'}!`, 'success');

      // 2. Persist directly to Supabase public.guests (~150ms) AND notify Render API for Brevo email
      const [directGuest] = await Promise.all([
        joinRoomDirectlyInSupabase(roomId, {
          name: user.name,
          email: user.email,
          phone: user.phone,
          amount: targetEvent?.costPerPerson || 0,
        }),
        joinRoomOnApi(roomId, {
          name: user.name,
          email: user.email,
          phone: user.phone,
        }),
      ]);

      if (directGuest) {
        setEvents((prev) =>
          prev.map((ev) =>
            ev.id === roomId
              ? {
                  ...ev,
                  guests: ev.guests.map((g) =>
                    g.id === optimisticGuest.id ? directGuest : g
                  ),
                }
              : ev
          )
        );
      }
    },
    [events, isGuestMode, promptGuestToSignUp, showToast, user.email, user.initials, user.name, user.phone]
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

  const handleToggleOnlineMode = useCallback(async () => {
    if (apiStatus === 'online') {
      manualOfflineRef.current = true;
      apiOnlineRef.current = false;
      setApiStatus('demo');
      try {
        window.localStorage.setItem('monte-manual-offline', '1');
      } catch {
        // Ignore storage errors
      }
      showToast('Switched to Offline Mode. Tap the badge anytime to go Online.', 'info');
      return;
    }

    manualOfflineRef.current = false;
    try {
      window.localStorage.removeItem('monte-manual-offline');
    } catch {
      // Ignore storage errors
    }
    setApiStatus('waking');
    showToast('Going Online — syncing rooms, members & friends…', 'info');

    const [, apiOk] = await Promise.all([
      syncFromSupabaseRef.current?.() ?? Promise.resolve(),
      syncFromRenderApiRef.current?.(20000) ?? Promise.resolve(false),
    ]);

    if (apiOk) {
      showToast('You are now Online! Live API & Cloud Sync active.', 'success');
    } else {
      showToast('Cloud synced via Supabase. Server is waking up — tap Go Online again shortly.', 'info');
    }
  }, [apiStatus]);

  const handleRefreshMembers = useCallback(async () => {
    if (isGuestMode) {
      setMembers(GUEST_PREVIEW_MEMBERS);
      return;
    }
    setMembersLoading(true);
    const [apiList, supabaseList] = await Promise.all([
      fetchMembersFromApi(),
      loadMembersDirectlyFromSupabase(),
    ]);
    const merged = mergePlatformMembers(apiList || [], supabaseList || []);
    if (merged.length > 0) {
      setMembers(merged);
    }
    setMembersLoading(false);
  }, [isGuestMode]);

  useEffect(() => {
    if (currentPage === 'members' && members.length === 0 && !isGuestMode) {
      void handleRefreshMembers();
    }
  }, [currentPage, members.length, isGuestMode, handleRefreshMembers]);

  const handleRefreshAll = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const [updateInfo] = await Promise.all([
        checkForAppUpdate(),
        syncFromSupabaseRef.current?.() ?? Promise.resolve(),
        manualOfflineRef.current
          ? Promise.resolve(false)
          : (syncFromRenderApiRef.current?.(15000) ?? Promise.resolve(false)),
        handleRefreshMembers(),
      ]);
      setAppUpdateInfo(updateInfo);
      if (updateInfo?.hasUpdate) {
        pushNotification({
          id: `app-update-${updateInfo.latestVersion}`,
          title: `Monte Events v${updateInfo.latestVersion} Available!`,
          body: 'A new update is ready with the latest features and fixes. Tap the Update card to install.',
          channelId: 'monte-general',
        });
        showToast(
          `Update v${updateInfo.latestVersion} available! Tap the Update card to install.`,
          'success'
        );
      } else {
        showToast('Refreshed rooms, chats, members & updates!', 'success');
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, handleCheckAppUpdate, handleRefreshMembers]);

  const handleAddFriend = (member: PlatformMember) => {
    if (isGuestMode) {
      promptGuestToSignUp(
        'Create a free account to add friends and chat with them directly.'
      );
      return;
    }
    setFriends((prev) => {
      if (
        prev.some(
          (f) =>
            f.id === member.id ||
            (f.email && member.email && f.email.toLowerCase() === member.email.toLowerCase())
        )
      ) {
        return prev;
      }
      const next = [member, ...prev];
      try {
        window.localStorage.setItem('monte-friends', JSON.stringify(next));
      } catch {
        // Ignore storage quota errors
      }
      void supabase.auth.updateUser({
        data: { monte_friends: next },
      });
      return next;
    });
    pushNotification({
      title: `Friend Connected — ${member.name}`,
      body: `You and ${member.name} are now friends on Monte Events. Tap Chats to message them!`,
      channelId: 'monte-friends',
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
        'Create a free account to chat with friends and coordinate events.'
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
    pushNotification({
      title: `Invited ${member.name}`,
      body: `Sent room invite for "${targetRoom?.name || 'Monte Event'}" to ${member.name}.`,
      eventId: roomId,
      channelId: 'monte-friends',
    });
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
        'Create a free account to chat with friends and coordinate events.'
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

  const handleJoinFromInvitePreview = async () => {
    if (!invitePreview) return;
    if (!isAuthenticated || isGuestMode) {
      setAuthModal({
        open: true,
        mode: 'signup',
        message: `Sign in or create a free account to join "${invitePreview.name}".`,
      });
      return;
    }
    setJoiningFromInvite(true);
    await handleJoinRoom(invitePreview.id);
    const refreshedRooms =
      (await loadRoomsDirectlyFromSupabase()) || (await fetchRoomsFromApi());
    if (refreshedRooms && refreshedRooms.length > 0) {
      setEvents(
        refreshedRooms.filter(
          (e) =>
            !deletedRoomKeysRef.current.has(e.id) &&
            !deletedRoomKeysRef.current.has(e.inviteCode)
        )
      );
    }
    setJoiningFromInvite(false);
    setActiveEventId(invitePreview.id);
    setActiveEventTab('guests');
    setInvitePreview(null);
    setCurrentPage('event-room');
    if (typeof window !== 'undefined') {
      const cleanUrl = `${window.location.origin}${window.location.pathname}`;
      window.history.replaceState({}, document.title, cleanUrl);
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
      ) : invitePreview ? (
        <EventInvitePreviewPage
          preview={invitePreview}
          isSignedIn={isAuthenticated && !isGuestMode}
          joining={joiningFromInvite}
          onJoinEvent={handleJoinFromInvitePreview}
          onDismiss={() => {
            setInvitePreview(null);
            if (typeof window !== 'undefined') {
              const cleanUrl = `${window.location.origin}${window.location.pathname}`;
              window.history.replaceState({}, document.title, cleanUrl);
            }
          }}
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
          isRefreshing={isRefreshing}
          onRefresh={handleRefreshAll}
          onPromptAuth={promptGuestToSignUp}
        >
          {currentPage === 'dashboard' && (
            <DashboardPage
              user={user}
              events={events}
              media={media}
              notifications={notifications}
              apiStatus={apiStatus}
              onToggleOnlineMode={handleToggleOnlineMode}
              isRefreshing={isRefreshing}
              onRefresh={handleRefreshAll}
              updateInfo={appUpdateInfo}
              notifPermission={notifPermission}
              onCheckUpdate={handleCheckAppUpdate}
              onEnableNotifications={handleEnableNotifications}
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
              isGuestMode={isGuestMode}
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
              onSubmitGuestMpesaCode={handleSubmitGuestMpesaCode}
              onAddGuestToEvent={handleAddGuestToEvent}
              onRemoveGuestFromEvent={handleRemoveGuestFromEvent}
              onAddExpense={handleAddExpense}
              onDeleteExpense={handleDeleteExpense}
              onUpdateRoom={handleUpdateRoom}
              onUploadMedia={handleUploadMedia}
              onSendMessage={handleSendMessage}
              onToggleReaction={handleToggleReaction}
              onTogglePin={handleTogglePin}
              onSelectMedia={handleSelectMedia}
              onOpenFlyer={setFlyerEvent}
              onPromptGuestPay={() =>
                promptGuestToSignUp('Sign in to pay via M-PESA and confirm your spot.')
              }
              onMpesaPaymentConfirmed={async (eventId, reference) => {
                // Optimistically confirm current user in the room & refresh live room data
                setEvents((prev) =>
                  prev.map((ev) => {
                    if (ev.id !== eventId) return ev;
                    const exists = ev.guests.some(
                      (g) =>
                        (user.email &&
                          g.email &&
                          g.email.toLowerCase() === user.email.toLowerCase()) ||
                        g.name.toLowerCase() === user.name.toLowerCase()
                    );
                    if (exists) {
                      return {
                        ...ev,
                        guests: ev.guests.map((g) =>
                          (user.email &&
                            g.email &&
                            g.email.toLowerCase() === user.email.toLowerCase()) ||
                          g.name.toLowerCase() === user.name.toLowerCase()
                            ? {
                                ...g,
                                paid: true,
                                paymentStatus: 'confirmed',
                                mpesaCode: reference,
                                paidAt: 'Paid',
                              }
                            : g
                        ),
                      };
                    }
                    return {
                      ...ev,
                      guests: [
                        ...ev.guests,
                        {
                          id: `g-paid-${Date.now()}`,
                          name: user.name,
                          phone: user.phone || user.mpesaNumber || '',
                          email: user.email,
                          initials: user.initials,
                          avatarColor: '#1A6BFF',
                          amount: ev.costPerPerson,
                          paid: true,
                          paymentStatus: 'confirmed',
                          mpesaCode: reference,
                          online: true,
                          paidAt: 'Paid',
                        },
                      ],
                    };
                  })
                );
                const paidEv = events.find((e) => e.id === eventId);
                setNotifications((curr) => curr.filter((n) => n.id !== `unpaid-${eventId}`));
                pushNotification({
                  title: `M-PESA Payment Confirmed — ${paidEv?.name || 'Monte Event'}`,
                  body: `KES ${Number(paidEv?.costPerPerson || 0).toLocaleString()} paid${reference ? ` (Ref: ${reference})` : ''}. Your spot is confirmed!`,
                  eventId,
                  channelId: 'monte-payments',
                });
                showToast('M-PESA payment confirmed! You are in the event.');
                const freshRooms = await fetchRoomsFromApi();
                if (freshRooms && freshRooms.length > 0) {
                  const cleanFresh = freshRooms.filter(
                    (e) =>
                      !deletedRoomKeysRef.current.has(e.id) &&
                      !deletedRoomKeysRef.current.has(e.inviteCode)
                  );
                  setEvents(cleanFresh);
                }
              }}
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
              apiStatus={apiStatus}
              onToggleOnlineMode={handleToggleOnlineMode}
              isGuestMode={isGuestMode}
              updateInfo={appUpdateInfo}
              notifPermission={notifPermission}
              onCheckUpdate={handleCheckAppUpdate}
              onEnableNotifications={handleEnableNotifications}
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

      <EventFlyerModal
        event={flyerEvent}
        onClose={() => setFlyerEvent(null)}
        onShowToast={showToast}
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
