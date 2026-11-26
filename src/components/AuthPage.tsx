import React, { useState } from 'react';
import {
  ArrowRight,
  Camera,
  Eye,
  EyeOff,
  Film,
  Lock,
  Mail,
  Phone,
  Sparkles,
  User,
} from 'lucide-react';
import { MonteLogo } from './MonteLogo';
import { ThemeToggle } from './ThemeToggle';

interface AuthPageProps {
  onLogin: (payload?: { name?: string; email?: string; phone?: string }) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [showSplash, setShowSplash] = useState(true);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('brian.kamau@monteevents.co.ke');
  const [password, setPassword] = useState('••••••••••');
  const [phone, setPhone] = useState('+254 712 345 678');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin({
      name: mode === 'signup' && name.trim() ? name.trim() : undefined,
      email: email.trim() || undefined,
      phone: mode === 'signup' && phone.trim() ? phone.trim() : undefined,
    });
  };

  if (showSplash) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-[#F0F6FF] via-white to-[#D6E6FF] dark:from-[#0A1430] dark:via-[#0B1A3A] dark:to-[#0B2E8F]/40 flex flex-col items-center justify-center px-6 py-10">
        {/* Decorative royal blue paint wash circles */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-[#1A6BFF]/15 blur-3xl dark:bg-[#2B7FFF]/20" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-[#2B7FFF]/20 blur-3xl dark:bg-[#1A6BFF]/20" />

        {/* Theme toggle top-right */}
        <div className="absolute top-5 right-5 z-20">
          <ThemeToggle />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center max-w-md animate-slide-up">
          <MonteLogo size="xl" animated />
          <p className="mt-5 text-lg sm:text-xl font-extrabold tracking-tight text-[#0A1E5C] dark:text-white">
            Plan it. Invite them. Monte it.
          </p>
          <p className="mt-2 text-sm text-[#0A1E5C]/70 dark:text-white/70 max-w-xs">
            Organize roadtrips, birthdays &amp; beach getaways with split budgets, M-Pesa tracking, live group chats, and shared media vaults.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setShowSplash(false)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1A6BFF] hover:bg-[#2B7FFF] px-8 py-3.5 text-sm font-bold text-white shadow-monte transition active:scale-[0.98]"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onLogin()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/40 bg-white/80 dark:bg-[#13224A] px-6 py-3.5 text-sm font-bold text-[#0A1E5C] dark:text-white hover:bg-[#F0F6FF] dark:hover:bg-[#1A2D5E] transition"
            >
              Quick Demo Enter
            </button>
          </div>

          <div className="mt-10 inline-flex items-center gap-2 rounded-full bg-white/80 dark:bg-[#13224A]/90 border border-[#D6E6FF] dark:border-[#2B7FFF]/30 px-4 py-2 text-xs font-semibold text-[#0B2E8F] dark:text-[#D6E6FF]">
            <Camera className="h-3.5 w-3.5 text-[#1A6BFF] dark:text-[#2B7FFF]" />
            <span>Videos &amp; photos from your events live here</span>
            <Film className="h-3.5 w-3.5 text-[#1A6BFF] dark:text-[#2B7FFF]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-[#F0F6FF] via-white to-[#D6E6FF] dark:from-[#0A1430] dark:via-[#0B1A3A] dark:to-[#0A1430] flex flex-col items-center justify-center px-4 py-8">
      {/* Subtle paint accents */}
      <div className="pointer-events-none absolute -top-28 -right-28 h-80 w-80 rounded-full bg-[#1A6BFF]/15 blur-3xl dark:bg-[#2B7FFF]/15" />
      <div className="pointer-events-none absolute -bottom-28 -left-28 h-80 w-80 rounded-full bg-[#0B2E8F]/10 blur-3xl dark:bg-[#1A6BFF]/15" />

      {/* Top bar with back to splash & theme toggle top-right */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowSplash(true)}
          className="rounded-full border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white/80 dark:bg-[#13224A] px-3.5 py-1.5 text-xs font-semibold text-[#0A1E5C] dark:text-white hover:bg-[#F0F6FF] dark:hover:bg-[#1A2D5E] transition"
        >
          Splash
        </button>
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-md animate-slide-up mt-8">
        {/* Centered Logo & Tagline */}
        <div className="flex flex-col items-center text-center mb-6">
          <MonteLogo size="lg" />
          <p className="mt-3 text-sm sm:text-base font-bold text-[#0A1E5C] dark:text-white">
            Plan it. Invite them. Monte it.
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-3xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-white dark:bg-[#13224A] p-6 sm:p-7 shadow-monte dark:shadow-monte-dark">
          {/* Tabs: Log In / Sign Up */}
          <div className="grid grid-cols-2 rounded-2xl bg-[#F0F6FF] dark:bg-[#0A1430] p-1 mb-6">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`rounded-xl py-2.5 text-sm font-bold transition ${
                mode === 'login'
                  ? 'bg-[#1A6BFF] text-white shadow-sm'
                  : 'text-[#0A1E5C]/70 dark:text-white/70 hover:text-[#0A1E5C] dark:hover:text-white'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`rounded-xl py-2.5 text-sm font-bold transition ${
                mode === 'signup'
                  ? 'bg-[#1A6BFF] text-white shadow-sm'
                  : 'text-[#0A1E5C]/70 dark:text-white/70 hover:text-[#0A1E5C] dark:hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#0A1E5C]/70 dark:text-white/70 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1A6BFF] dark:text-[#2B7FFF]" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Brian Kamau"
                    className="w-full rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] pl-10 pr-4 py-2.5 text-sm text-[#0A1E5C] dark:text-white placeholder:text-[#0A1E5C]/40 dark:placeholder:text-white/40 focus:border-[#1A6BFF] focus:outline-none focus:ring-2 focus:ring-[#1A6BFF]/20"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#0A1E5C]/70 dark:text-white/70 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1A6BFF] dark:text-[#2B7FFF]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@monteevents.co.ke"
                  required
                  className="w-full rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] pl-10 pr-4 py-2.5 text-sm text-[#0A1E5C] dark:text-white placeholder:text-[#0A1E5C]/40 dark:placeholder:text-white/40 focus:border-[#1A6BFF] focus:outline-none focus:ring-2 focus:ring-[#1A6BFF]/20"
                />
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#0A1E5C]/70 dark:text-white/70 mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1A6BFF] dark:text-[#2B7FFF]" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+254 712 345 678"
                    className="w-full rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] pl-10 pr-4 py-2.5 text-sm text-[#0A1E5C] dark:text-white placeholder:text-[#0A1E5C]/40 dark:placeholder:text-white/40 focus:border-[#1A6BFF] focus:outline-none focus:ring-2 focus:ring-[#1A6BFF]/20"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#0A1E5C]/70 dark:text-white/70 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1A6BFF] dark:text-[#2B7FFF]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] pl-10 pr-10 py-2.5 text-sm text-[#0A1E5C] dark:text-white placeholder:text-[#0A1E5C]/40 dark:placeholder:text-white/40 focus:border-[#1A6BFF] focus:outline-none focus:ring-2 focus:ring-[#1A6BFF]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0A1E5C]/50 dark:text-white/50 hover:text-[#1A6BFF]"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#1A6BFF] hover:bg-[#2B7FFF] py-3.5 text-sm font-extrabold text-white shadow-monte transition active:scale-[0.99]"
            >
              <Sparkles className="h-4 w-4" />
              Enter Monte
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-5 flex items-center justify-center">
            <div className="h-px w-full bg-[#D6E6FF] dark:bg-[#2B7FFF]/20" />
            <span className="bg-white dark:bg-[#13224A] px-3 text-xs font-semibold text-[#0A1E5C]/50 dark:text-white/50">
              or continue with
            </span>
            <div className="h-px w-full bg-[#D6E6FF] dark:bg-[#2B7FFF]/20" />
          </div>

          {/* Social Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => onLogin()}
              className="flex items-center justify-center gap-2 rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/50 dark:bg-[#0B1A3A] px-4 py-2.5 text-xs font-bold text-[#0A1E5C] dark:text-white hover:bg-[#D6E6FF]/50 dark:hover:bg-[#1A2D5E] transition"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                />
                <path
                  fill="#34A853"
                  d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z"
                />
                <path
                  fill="#1A6BFF"
                  d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z"
                />
                <path
                  fill="#EA4335"
                  d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                />
              </svg>
              Continue with Google
            </button>

            <button
              type="button"
              onClick={() => onLogin()}
              className="flex items-center justify-center gap-2 rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/50 dark:bg-[#0B1A3A] px-4 py-2.5 text-xs font-bold text-[#0A1E5C] dark:text-white hover:bg-[#D6E6FF]/50 dark:hover:bg-[#1A2D5E] transition"
            >
              <svg className="h-4 w-4 text-[#1A6BFF] dark:text-[#2B7FFF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
              Continue with Instagram
            </button>
          </div>
        </div>

        {/* Media Vault tagline */}
        <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-[#0B2E8F] dark:text-[#D6E6FF]">
          <Camera className="h-4 w-4 text-[#1A6BFF] dark:text-[#2B7FFF]" />
          <span>Videos &amp; photos from your events live here</span>
        </div>
      </div>
    </div>
  );
};
