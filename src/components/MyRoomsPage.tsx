import React, { useMemo, useState } from 'react';
import {
  Calendar,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { EventRoomTab, MonteEvent } from '../types';
import { motion } from 'motion/react';
import { formatDateShort, formatKES } from '../data/sampleData';
import { ThemeToggle } from './ThemeToggle';
import { SPRING_SNAPPY, ScrollProgressBar } from './MotionPrimitives';

interface MyRoomsPageProps {
  events: MonteEvent[];
  onOpenEvent: (eventId: string, tab?: EventRoomTab) => void;
  onDeleteEvent: (eventId: string) => void;
  onCreateRoom: () => void;
}

export const MyRoomsPage: React.FC<MyRoomsPageProps> = ({
  events,
  onOpenEvent,
  onDeleteEvent,
  onCreateRoom,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');

  const availableTypes = useMemo(() => {
    const set = new Set(events.map((e) => e.customType || e.type));
    return ['All', ...Array.from(set)];
  }, [events]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      const label = e.customType || e.type;
      if (typeFilter !== 'All' && label !== typeFilter) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        label.toLowerCase().includes(q)
      );
    });
  }, [events, search, typeFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0A1E5C] dark:text-white">
            My Event Rooms ({events.length})
          </h1>
          <p className="text-xs sm:text-sm text-[#0A1E5C]/65 dark:text-white/65">
            All your planned roadtrips, birthdays, and trips in one place.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          <button
            type="button"
            onClick={onCreateRoom}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#1A6BFF] hover:bg-[#2B7FFF] px-5 py-2.5 text-xs sm:text-sm font-extrabold text-white shadow-monte transition"
          >
            <Plus className="h-4 w-4" />
            Create Room
          </button>
        </div>
      </div>

      {/* Search & Filter chips */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1A6BFF]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter rooms by name or location..."
            className="w-full rounded-full border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] pl-10 pr-4 py-2 text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {availableTypes.map((t) => {
            const active = typeFilter === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`relative rounded-full px-3.5 py-1.5 text-xs font-extrabold transition-colors ${
                  active
                    ? 'text-white'
                    : 'bg-white dark:bg-[#13224A] border border-[#D6E6FF] dark:border-[#2B7FFF]/25 text-[#0A1E5C]/75 dark:text-white/75'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="my-rooms-type-pill"
                    transition={SPRING_SNAPPY}
                    className="absolute inset-0 rounded-full bg-[#1A6BFF]"
                  />
                )}
                <span className="relative z-10">{t}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Rooms Grid or Empty State */}
      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] p-12 text-center space-y-3">
          <p className="text-base font-extrabold text-[#0A1E5C] dark:text-white">
            {events.length === 0
              ? 'No event rooms yet'
              : 'No rooms match your filter'}
          </p>
          <p className="text-xs sm:text-sm text-[#0A1E5C]/65 dark:text-white/65 max-w-md mx-auto">
            {events.length === 0
              ? 'Create your first roadtrip, birthday, or beach getaway room to start inviting guests and tracking budgets.'
              : 'Try clearing your search or selecting All.'}
          </p>
          <button
            type="button"
            onClick={onCreateRoom}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#1A6BFF] hover:bg-[#2B7FFF] px-5 py-2.5 text-xs sm:text-sm font-extrabold text-white shadow-monte transition"
          >
            <Plus className="h-4 w-4" />
            Create Your First Room
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((event) => {
            const paid = event.guests.filter((g) => g.paid).length;
            const total = event.guests.length;
            const pct = total > 0 ? Math.round((paid / total) * 100) : 0;

            return (
              <motion.div
                key={event.id}
                whileHover={{ y: -3 }}
                transition={SPRING_SNAPPY}
                className="group overflow-hidden rounded-3xl border border-[#D6E6FF] dark:border-[#2B7FFF]/20 bg-white dark:bg-[#13224A] shadow-sm hover:shadow-monte dark:hover:shadow-monte-dark transition-shadow flex flex-col"
              >
              <div
                className={`relative h-40 bg-gradient-to-br ${event.coverGradient} overflow-hidden`}
              >
                {event.coverImage && (
                  <img
                    src={event.coverImage}
                    alt={event.name}
                    className="h-full w-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A1430]/85 via-transparent to-transparent" />
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  <span className="rounded-full bg-[#1A6BFF] px-3 py-1 text-[11px] font-extrabold text-white">
                    {event.customType || event.type}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/95 dark:bg-[#0A1430]/90 px-2.5 py-1 text-[11px] font-bold text-[#0A1E5C] dark:text-white">
                    <Calendar className="h-3 w-3 text-[#1A6BFF]" />
                    {formatDateShort(event.date)}
                  </span>
                </div>
                <div className="absolute bottom-3 left-3.5 right-3.5">
                  <h3 className="text-base font-extrabold text-white truncate">
                    {event.name}
                  </h3>
                  <p className="text-xs text-white/85 inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{event.location}</span>
                  </p>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between space-y-3.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="inline-flex items-center gap-1 text-[#0A1E5C]/75 dark:text-white/75">
                    <Users className="h-3.5 w-3.5 text-[#1A6BFF]" />
                    {paid}/{total} Paid
                  </span>
                  <span className="text-[#1A6BFF] dark:text-[#2B7FFF]">
                    {formatKES(event.costPerPerson)} / person
                  </span>
                </div>

                <ScrollProgressBar percent={pct} />

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onOpenEvent(event.id, 'guests')}
                    className="flex-1 rounded-xl bg-[#1A6BFF] hover:bg-[#2B7FFF] py-2.5 text-xs font-extrabold text-white transition"
                  >
                    Open Room
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenEvent(event.id, 'chat')}
                    className="relative rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/35 bg-[#F0F6FF] dark:bg-[#0B1A3A] px-3.5 py-2.5 text-xs font-bold text-[#0A1E5C] dark:text-white hover:border-[#1A6BFF]"
                    title="Open Event Chat"
                  >
                    <MessageCircle className="h-4 w-4 text-[#1A6BFF] dark:text-[#2B7FFF]" />
                    {event.unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#1A6BFF] px-1 text-[10px] font-extrabold text-white">
                        {event.unreadCount}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Permanently delete "${event.name}" and its guests/chat?`
                        )
                      ) {
                        onDeleteEvent(event.id);
                      }
                    }}
                    className="rounded-xl border border-red-400/35 bg-red-500/10 hover:bg-red-500/20 px-3 py-2.5 text-red-600 dark:text-red-400 transition"
                    title="Delete Room"
                    aria-label={`Delete ${event.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
        </div>
      )}
    </div>
  );
};
