import React, { useEffect, useState } from 'react';
import {
  CalendarRange,
  Compass,
  Home,
  Images,
  LogIn,
  MessageCircle,
  Plus,
  PlusCircle,
  User,
  Users,
} from 'lucide-react';
import { AppPage, UserProfile } from '../types';
import { MonteLogo } from './MonteLogo';
import { ThemeToggle } from './ThemeToggle';

interface AppShellProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  totalUnreadChats: number;
  user: UserProfile;
  isGuestMode?: boolean;
  onPromptAuth?: (message?: string, mode?: 'login' | 'signup') => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentPage,
  onNavigate,
  totalUnreadChats,
  user,
  isGuestMode = false,
  onPromptAuth,
  children,
}) => {
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [visualHeight, setVisualHeight] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const vv = window.visualViewport;
    if (!vv) return;

    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      if (!isMobile) {
        setKeyboardOpen(false);
        setVisualHeight(null);
        return;
      }
      const heightRatio = vv.height / window.innerHeight;
      const isKb = heightRatio < 0.78;
      setKeyboardOpen(isKb);
      setVisualHeight(Math.round(vv.height));
    };

    handleResize();
    vv.addEventListener('resize', handleResize);
    window.addEventListener('resize', handleResize);
    return () => {
      vv.removeEventListener('resize', handleResize);
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  const desktopNavItems: {
    id: AppPage;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'create', label: 'Create', icon: PlusCircle },
    { id: 'rooms', label: 'My Rooms', icon: CalendarRange },
    { id: 'chats', label: 'Chats', icon: MessageCircle, badge: totalUnreadChats },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'media', label: 'Media', icon: Images },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const isNavActive = (id: AppPage) => {
    if (id === 'rooms' && currentPage === 'event-room') return true;
    return currentPage === id;
  };

  const chatViewportStyle =
    currentPage === 'chats' && visualHeight
      ? { height: `${visualHeight}px` }
      : undefined;

  return (
    <div
      style={chatViewportStyle}
      className={`bg-[#F0F6FF] dark:bg-[#0A1430] text-[#0A1E5C] dark:text-white flex overflow-x-clip transition-colors duration-300 ${
        currentPage === 'chats' ? 'h-[100dvh] overflow-hidden' : 'min-h-[100dvh]'
      }`}
    >
      {/* Desktop Left Sidebar (>= 768px) */}
      <aside className="hidden md:flex md:flex-col md:w-60 lg:w-64 xl:w-72 md:fixed md:inset-y-0 md:left-0 z-30 border-r border-[#D6E6FF] dark:border-[#2B7FFF]/20 bg-white dark:bg-[#0B1A3A] px-4 py-5 transition-colors duration-300">
        <div
          onClick={() => onNavigate('dashboard')}
          className="cursor-pointer flex items-center justify-center pb-5 border-b border-[#D6E6FF] dark:border-[#2B7FFF]/15"
        >
          <MonteLogo size="sm" layout="horizontal" />
        </div>

        <nav className="mt-6 flex-1 space-y-1.5">
          {desktopNavItems.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`relative w-full flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold transition-all duration-150 ${
                  active
                    ? 'bg-[#1A6BFF] text-white shadow-monte'
                    : 'text-[#0A1E5C]/80 dark:text-white/80 hover:bg-[#F0F6FF] dark:hover:bg-[#13224A] hover:text-[#1A6BFF] dark:hover:text-[#2B7FFF]'
                }`}
              >
                <span className="relative z-10 flex items-center gap-3">
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </span>
                {item.badge && item.badge > 0 ? (
                  <span
                    className={`relative z-10 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-extrabold ${
                      active
                        ? 'bg-white text-[#1A6BFF]'
                        : 'bg-[#1A6BFF] text-white dark:bg-[#2B7FFF]'
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Theme Toggle + Mini Profile */}
        <div className="mt-auto pt-4 border-t border-[#D6E6FF] dark:border-[#2B7FFF]/15 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0A1E5C]/60 dark:text-white/60">
              Theme
            </span>
            <ThemeToggle compact />
          </div>

          {isGuestMode ? (
            <div className="rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-[#F0F6FF]/85 dark:bg-[#13224A] p-3 space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 shrink-0 rounded-full bg-[#1A6BFF]/15 text-[#1A6BFF] dark:text-[#2B7FFF] flex items-center justify-center">
                  <Compass className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-[#0A1E5C] dark:text-white">
                    Guest Visitor
                  </p>
                  <p className="truncate text-[11px] text-[#0A1E5C]/60 dark:text-white/60">
                    Preview Mode
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onPromptAuth?.(undefined, 'login')}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1A6BFF] hover:bg-[#2B7FFF] py-2 text-xs font-extrabold text-white shadow-sm transition active:scale-95"
              >
                <LogIn className="h-3.5 w-3.5" />
                Sign In
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className="w-full flex items-center gap-3 rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/20 bg-[#F0F6FF]/80 dark:bg-[#13224A] p-2.5 text-left hover:border-[#1A6BFF]/50 transition"
            >
              <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden ring-2 ring-[#1A6BFF]/40 bg-[#1A6BFF] text-white flex items-center justify-center text-xs font-extrabold">
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
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[#0A1E5C] dark:text-white">
                  {user.name}
                </p>
                <p className="truncate text-xs text-[#0A1E5C]/60 dark:text-white/60">
                  @{user.username}
                </p>
              </div>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        style={chatViewportStyle}
        className={`flex-1 md:pl-60 lg:pl-64 xl:pl-72 flex flex-col w-full min-w-0 overflow-x-clip ${
          currentPage === 'chats' ? 'h-[100dvh] overflow-hidden' : 'min-h-[100dvh]'
        }`}
      >
        {/* Slim Sticky Mobile Top Header (< 768px) with iOS/Android safe-area-inset-top */}
        <header className="md:hidden sticky top-0 z-30 shrink-0 flex items-center justify-between gap-2 border-b border-[#D6E6FF] dark:border-[#2B7FFF]/20 bg-white/95 dark:bg-[#0B1A3A]/95 backdrop-blur-md px-3.5 py-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="flex items-center min-w-0"
          >
            <MonteLogo size="xs" layout="horizontal" />
          </button>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('media')}
              className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
                currentPage === 'media'
                  ? 'border-[#1A6BFF] bg-[#1A6BFF] text-white'
                  : 'border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF] dark:bg-[#13224A] text-[#0A1E5C] dark:text-white'
              }`}
              aria-label="Open Media Vault"
              title="Media Vault"
            >
              <Images className="h-4 w-4" />
            </button>

            <ThemeToggle compact />

            {isGuestMode ? (
              <button
                type="button"
                onClick={() => onPromptAuth?.(undefined, 'login')}
                className="inline-flex items-center gap-1 rounded-full bg-[#1A6BFF] hover:bg-[#2B7FFF] px-3 py-2 text-xs font-extrabold text-white shadow-sm transition active:scale-95"
              >
                <LogIn className="h-3.5 w-3.5" />
                Sign In
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate('profile')}
                className="h-9 w-9 rounded-full overflow-hidden ring-2 ring-[#1A6BFF]/50 bg-[#1A6BFF] text-white flex items-center justify-center text-xs font-bold"
                aria-label="Open profile"
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
            )}
          </div>
        </header>

        {/* Slim Guest Preview Banner */}
        {isGuestMode && (
          <div className="shrink-0 border-b border-[#1A6BFF]/25 bg-gradient-to-r from-[#0B2E8F] via-[#1A6BFF] to-[#2B7FFF] px-3.5 sm:px-4 py-2 text-white">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
              <p className="font-semibold text-white/95">
                <span className="font-extrabold">Preview Mode</span> — Sign in to create rooms &amp; save events
              </p>
              <button
                type="button"
                onClick={() =>
                  onPromptAuth?.(
                    'Create a free account to host rooms, invite friends, and save your events.',
                    'signup'
                  )
                }
                className="shrink-0 rounded-full bg-white text-[#0B2E8F] hover:bg-[#F0F6FF] px-3 py-1 text-[11px] font-extrabold shadow-xs transition active:scale-95"
              >
                Create Free Account
              </button>
            </div>
          </div>
        )}

        <main
          className={
            currentPage === 'chats'
              ? `flex-1 min-h-0 overflow-hidden ${
                  keyboardOpen ? 'pb-0' : 'pb-[calc(4.5rem+env(safe-area-inset-bottom))]'
                } md:pb-0 flex flex-col`
              : `flex-1 ${
                  keyboardOpen ? 'pb-4' : 'pb-[calc(6rem+env(safe-area-inset-bottom))]'
                } md:pb-8 overflow-x-clip`
          }
        >
          {children}
        </main>
      </div>

      {/* Native-Style 5-Tab Mobile Bottom Navigation Bar (< 768px) — auto-hides when phone keyboard is open */}
      {!keyboardOpen && (
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-white/95 dark:bg-[#0B1A3A]/95 backdrop-blur-lg px-2 pt-1.5 pb-[calc(0.45rem+env(safe-area-inset-bottom))] transition-colors duration-300"
      >
        <div className="grid grid-cols-5 items-center gap-1 max-w-md mx-auto">
          {/* 1. Home */}
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl px-1 transition-colors ${
              isNavActive('dashboard')
                ? 'text-[#1A6BFF] dark:text-[#2B7FFF]'
                : 'text-[#0A1E5C]/65 dark:text-white/65'
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="mt-0.5 text-[10px] font-extrabold">Home</span>
          </button>

          {/* 2. Rooms */}
          <button
            type="button"
            onClick={() => onNavigate('rooms')}
            className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl px-1 transition-colors ${
              isNavActive('rooms')
                ? 'text-[#1A6BFF] dark:text-[#2B7FFF]'
                : 'text-[#0A1E5C]/65 dark:text-white/65'
            }`}
          >
            <CalendarRange className="h-5 w-5" />
            <span className="mt-0.5 text-[10px] font-extrabold">Rooms</span>
          </button>

          {/* 3. + Create (Highlighted Royal-Blue Pill) */}
          <button
            type="button"
            onClick={() => onNavigate('create')}
            aria-label="Create Room"
            className="min-h-[48px] flex flex-col items-center justify-center"
          >
            <span
              className={`flex h-11 w-12 items-center justify-center rounded-2xl bg-[#1A6BFF] text-white shadow-monte transition active:scale-95 ${
                currentPage === 'create' ? 'ring-2 ring-[#2B7FFF] ring-offset-2 dark:ring-offset-[#0B1A3A]' : ''
              }`}
            >
              <Plus className="h-6 w-6 stroke-[2.8]" />
            </span>
          </button>

          {/* 4. Chats */}
          <button
            type="button"
            onClick={() => onNavigate('chats')}
            className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl px-1 transition-colors ${
              isNavActive('chats')
                ? 'text-[#1A6BFF] dark:text-[#2B7FFF]'
                : 'text-[#0A1E5C]/65 dark:text-white/65'
            }`}
          >
            <div className="relative">
              <MessageCircle className="h-5 w-5" />
              {totalUnreadChats > 0 && (
                <span className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#1A6BFF] dark:bg-[#2B7FFF] px-1 text-[9px] font-extrabold text-white">
                  {totalUnreadChats}
                </span>
              )}
            </div>
            <span className="mt-0.5 text-[10px] font-extrabold">Chats</span>
          </button>

          {/* 5. Profile */}
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl px-1 transition-colors ${
              isNavActive('profile')
                ? 'text-[#1A6BFF] dark:text-[#2B7FFF]'
                : 'text-[#0A1E5C]/65 dark:text-white/65'
            }`}
          >
            <User className="h-5 w-5" />
            <span className="mt-0.5 text-[10px] font-extrabold">Profile</span>
          </button>
        </div>
      </nav>
      )}
    </div>
  );
};
