import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BadgeCheck,
  Camera,
  CheckCircle2,
  MapPin,
  Phone,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { EventType, UserProfile } from '../types';
import { EVENT_TYPES } from '../data/sampleData';
import { uploadFileToStorage } from '../lib/monteService';

interface CompleteProfileModalProps {
  open: boolean;
  user: UserProfile;
  isNewAccount?: boolean;
  onClose: () => void;
  onComplete: (updated: UserProfile) => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=240&q=80',
  'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=240&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=240&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80',
];

export const CompleteProfileModal: React.FC<CompleteProfileModalProps> = ({
  open,
  user,
  isNewAccount = false,
  onClose,
  onComplete,
}) => {
  const [name, setName] = useState(user.name || '');
  const [username, setUsername] = useState(user.username || '');
  const [phone, setPhone] = useState(user.phone || user.mpesaNumber || '');
  const [location, setLocation] = useState(user.location || 'Nairobi, KE');
  const [bio, setBio] = useState(
    user.bio && user.bio !== 'Weekend explorer & group trip planner.'
      ? user.bio
      : ''
  );
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  const [preferredTypes, setPreferredTypes] = useState<EventType[]>(
    user.preferredTypes?.length ? user.preferredTypes : ['Roadtrip', 'Birthday']
  );
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName(user.name || '');
    setUsername(user.username || '');
    setPhone(user.phone || user.mpesaNumber || '');
    setLocation(user.location || 'Nairobi, KE');
    setBio(
      user.bio && user.bio !== 'Weekend explorer & group trip planner.'
        ? user.bio
        : ''
    );
    setAvatarUrl(user.avatarUrl || '');
    setPreferredTypes(
      user.preferredTypes?.length ? user.preferredTypes : ['Roadtrip', 'Birthday']
    );
    setError(null);
  }, [open, user]);

  if (!open || typeof document === 'undefined') return null;

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadFileToStorage(file, 'avatars');
      setAvatarUrl(url);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const toggleType = (t: EventType) => {
    setPreferredTypes((prev) =>
      prev.includes(t) ? prev.filter((item) => item !== t) : [...prev, t]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanUsername = username.trim().replace(/^@+/, '').replace(/[^a-zA-Z0-9_]/g, '');
    const cleanPhone = phone.trim();
    const cleanLocation = location.trim();
    const cleanBio = bio.trim();

    if (cleanName.length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (cleanUsername.length < 2) {
      setError('Please choose a valid username.');
      return;
    }
    if (cleanPhone.length < 9) {
      setError('Please enter a valid phone / M-PESA number.');
      return;
    }
    if (cleanLocation.length < 2) {
      setError('Please enter your city or location.');
      return;
    }
    if (cleanBio.length < 4) {
      setError('Add a short bio so friends recognize you.');
      return;
    }

    const parts = cleanName.split(/\s+/);
    const initials = (
      (parts[0]?.[0] || 'M') + (parts[1]?.[0] || parts[0]?.[1] || 'E')
    ).toUpperCase();

    onComplete({
      ...user,
      name: cleanName,
      username: cleanUsername.toLowerCase(),
      phone: cleanPhone,
      mpesaNumber: cleanPhone,
      location: cleanLocation,
      bio: cleanBio,
      avatarUrl,
      initials,
      preferredTypes: preferredTypes.length > 0 ? preferredTypes : ['Roadtrip'],
      verified: true,
      profileCompleted: true,
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A1430]/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#0F1E42] shadow-2xl overflow-hidden my-auto max-h-[92dvh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0B2E8F] via-[#1A6BFF] to-[#2B7FFF] px-5 py-4 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
              <BadgeCheck className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold truncate">
                {isNewAccount ? 'Welcome! Complete Your Profile' : 'Complete Your Profile'}
              </h2>
              <p className="text-xs text-white/85 truncate">
                Finish setup to unlock your Verified Account badge
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit}
          className="p-5 space-y-4 overflow-y-auto flex-1"
        >
          {/* Avatar Picker */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-[#F0F6FF]/70 dark:bg-[#13224A] p-3.5">
            <div className="flex items-center gap-3">
              <div className="relative h-14 w-14 shrink-0 rounded-2xl overflow-hidden bg-[#1A6BFF] text-white flex items-center justify-center text-base font-extrabold ring-2 ring-[#1A6BFF]/40">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{user.initials || 'ME'}</span>
                )}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1A6BFF] hover:bg-[#2B7FFF] px-3 py-1.5 text-xs font-extrabold text-white transition active:scale-95"
                >
                  <Camera className="h-3.5 w-3.5" />
                  {uploadingAvatar ? 'Uploading…' : 'Upload Photo'}
                </button>
                <p className="text-[11px] text-[#0A1E5C]/60 dark:text-white/60 mt-1">
                  Or pick a quick avatar below
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFile}
                className="hidden"
              />
            </div>

            <div className="flex items-center gap-2 sm:ml-auto">
              {AVATAR_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAvatarUrl(preset)}
                  className={`h-9 w-9 rounded-full overflow-hidden border-2 transition ${
                    avatarUrl === preset
                      ? 'border-[#1A6BFF] scale-110'
                      : 'border-transparent opacity-75 hover:opacity-100'
                  }`}
                >
                  <img src={preset} alt="Avatar preset" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#0A1E5C]/80 dark:text-white/80 mb-1">
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1A6BFF]" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Samuel Nzung'a"
                  className="w-full rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/60 dark:bg-[#13224A] pl-9 pr-3 py-2.5 text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0A1E5C]/80 dark:text-white/80 mb-1">
                Username *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-extrabold text-[#1A6BFF]">
                  @
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="monte"
                  className="w-full rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/60 dark:bg-[#13224A] pl-8 pr-3 py-2.5 text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0A1E5C]/80 dark:text-white/80 mb-1">
                Phone / M-PESA Number *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1A6BFF]" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07XX XXX XXX"
                  className="w-full rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/60 dark:bg-[#13224A] pl-9 pr-3 py-2.5 text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0A1E5C]/80 dark:text-white/80 mb-1">
                City / Location *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1A6BFF]" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Nairobi, KE"
                  className="w-full rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/60 dark:bg-[#13224A] pl-9 pr-3 py-2.5 text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0A1E5C]/80 dark:text-white/80 mb-1">
              Short Bio *
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell friends what events you love (e.g. Roadtrips, House Parties, Beach getaways)..."
              className="w-full rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/60 dark:bg-[#13224A] px-3 py-2 text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0A1E5C]/80 dark:text-white/80 mb-1.5">
              Favorite Event Vibes
            </label>
            <div className="flex flex-wrap gap-1.5">
              {EVENT_TYPES.filter((t) => t !== 'Custom').map((type) => {
                const active = preferredTypes.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleType(type)}
                    className={`rounded-full px-3 py-1 text-xs font-extrabold border transition ${
                      active
                        ? 'border-[#1A6BFF] bg-[#1A6BFF] text-white'
                        : 'border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF] dark:bg-[#13224A] text-[#0A1E5C]/75 dark:text-white/75'
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400">
              {error}
            </p>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2">
            <button
              type="submit"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 py-3 px-4 text-sm font-extrabold text-white shadow-lg transition active:scale-95"
            >
              <CheckCircle2 className="h-4 w-4" />
              Complete & Verify Profile
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 px-4 py-3 text-xs font-extrabold text-[#0A1E5C]/75 dark:text-white/75 hover:bg-[#F0F6FF] dark:hover:bg-[#13224A] transition"
            >
              Later
            </button>
          </div>

          <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <Sparkles className="h-3.5 w-3.5" />
            Verified badge appears immediately on your profile & in Members
          </p>
        </form>
      </div>
    </div>,
    document.body
  );
};
