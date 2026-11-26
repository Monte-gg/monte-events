import React from 'react';
import {
  CalendarRange,
  Home,
  Images,
  MessageCircle,
  PlusCircle,
  User,
} from 'lucide-react';
import { AppPage, UserProfile } from '../types';
import { motion } from 'motion/react';
import { MonteLogo } from './MonteLogo';
import { ThemeToggle } from './ThemeToggle';
import { SPRING_SNAPPY } from './MotionPrimitives';

interface AppShellProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  totalUnreadChats: number;
  user: UserProfile;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentPage,
  onNavigate,
  totalUnreadChats,
  user,
  children,
}) => {
  const navItems: {
    id: AppPage;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'create', label: 'Create', icon: PlusCircle },
    { id: 'rooms', label: 'My Rooms', icon: CalendarRange },
    { id: 'chats', label: 'Chats', icon: MessageCircle, badge: totalUnreadChats },
    { id: 'media', label: 'Media', icon: Images },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const isNavActive = (id: AppPage) => {
    if (id === 'rooms' && currentPage === 'event-room') return true;
    return currentPage === id;
  };

  return (
    <div
      className={`bg-[#F0F6FF] dark:bg-[#0A1430] text-[#0A1E5C] dark:text-white flex transition-colors duration-300 ${
        currentPage === 'chats' ? 'h-dvh overflow-hidden' : 'min-h-screen'
      }`}
    >
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 xl:w-72 lg:fixed lg:inset-y-0 lg:left-0 z-30 border-r border-[#D6E6FF] dark:border-[#2B7FFF]/20 bg-white dark:bg-[#0B1A3A] px-4 py-5 transition-colors duration-300">
        <div
          onClick={() => onNavigate('dashboard')}
          className="cursor-pointer flex items-center justify-center pb-5 border-b border-[#D6E6FF] dark:border-[#2B7FFF]/15"
        >
          <MonteLogo size="sm" layout="horizontal" />
        </div>

        <nav className="mt-6 flex-1 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`relative w-full flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold transition-colors ${
                  active
                    ? 'text-white'
                    : 'text-[#0A1E5C]/75 dark:text-white/75 hover:bg-[#F0F6FF] dark:hover:bg-[#13224A] hover:text-[#1A6BFF] dark:hover:text-[#2B7FFF]'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="sidebar-active-pill"
                    transition={SPRING_SNAPPY}
                    className="absolute inset-0 rounded-2xl bg-[#1A6BFF] shadow-monte"
                  />
                )}
                <span className="relative z-10 flex items-center gap-3">
                  <Icon className="h-5 w-5" />
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

          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className="w-full flex items-center gap-3 rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/20 bg-[#F0F6FF]/80 dark:bg-[#13224A] p-2.5 text-left hover:border-[#1A6BFF]/50 transition"
          >
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="h-10 w-10 rounded-full object-cover ring-2 ring-[#1A6BFF]/40"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-[#0A1E5C] dark:text-white">
                {user.name}
              </p>
              <p className="truncate text-xs text-[#0A1E5C]/60 dark:text-white/60">
                @{user.username}
              </p>
            </div>
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div
        className={`flex-1 lg:pl-64 xl:pl-72 flex flex-col w-full ${
          currentPage === 'chats' ? 'h-dvh overflow-hidden' : 'min-h-screen'
        }`}
      >
        {/* Mobile sticky brand bar (hidden on lg+) */}
        <header className="lg:hidden sticky top-0 z-30 shrink-0 flex items-center justify-between border-b border-[#D6E6FF] dark:border-[#2B7FFF]/20 bg-white/90 dark:bg-[#0B1A3A]/95 backdrop-blur-md px-4 py-2.5">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="flex items-center"
          >
            <MonteLogo size="xs" layout="horizontal" />
          </button>
          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className="h-8 w-8 rounded-full overflow-hidden ring-2 ring-[#1A6BFF]/50 bg-[#1A6BFF] text-white flex items-center justify-center text-xs font-bold"
              aria-label="Open profile"
            >
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-full w-full object-cover"
              />
            </button>
          </div>
        </header>

        <main
          className={
            currentPage === 'chats'
              ? 'flex-1 min-h-0 overflow-hidden pb-[62px] lg:pb-0 flex flex-col'
              : 'flex-1 pb-24 lg:pb-10'
          }
        >
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-white/95 dark:bg-[#0B1A3A]/95 backdrop-blur-lg px-2 py-1.5 transition-colors duration-300">
        <div className="grid grid-cols-6 gap-0.5 max-w-lg mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`relative flex flex-col items-center justify-center rounded-xl py-1.5 px-1 transition-colors ${
                  active
                    ? 'text-[#1A6BFF] dark:text-[#2B7FFF]'
                    : 'text-[#0A1E5C]/60 dark:text-white/60 hover:text-[#1A6BFF]'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="mobile-nav-pill"
                    transition={SPRING_SNAPPY}
                    className="absolute inset-0 rounded-xl bg-[#F0F6FF] dark:bg-[#13224A]"
                  />
                )}
                <div className="relative z-10">
                  <Icon className="h-5 w-5" />
                  {item.badge && item.badge > 0 ? (
                    <span className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#1A6BFF] dark:bg-[#2B7FFF] px-1 text-[10px] font-extrabold text-white">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <span className="relative z-10 mt-0.5 text-[10px] font-bold truncate max-w-full">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
