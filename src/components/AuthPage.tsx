import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Compass,
  Eye,
  EyeOff,
  Film,
  Loader2,
  Lock,
  Mail,
  Phone,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import { MonteLogo } from './MonteLogo';
import { ThemeToggle } from './ThemeToggle';
import { EASE_SKIPER, MagneticButton, SPRING_SNAPPY } from './MotionPrimitives';
import { signInWithEmail, signUpWithEmail } from '../lib/monteService';
import { requestPasswordResetOnApi, sendWelcomeEmailOnApi } from '../lib/api';
import { supabase } from '../lib/supabaseClient.js';

interface AuthPageProps {
  onLogin: (payload?: {
    userId?: string;
    name?: string;
    email?: string;
    phone?: string;
    avatarUrl?: string;
  }) => void;
  onExploreAsGuest?: () => void;
  onShowToast?: (message: string, type?: 'success' | 'info') => void;
  /** When true, renders directly as an overlay modal (for Guest conversion prompts) */
  asModal?: boolean;
  initialMode?: 'login' | 'signup';
  contextMessage?: string | null;
  onCloseModal?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onLogin,
  onExploreAsGuest,
  onShowToast,
  asModal = false,
  initialMode = 'login',
  contextMessage = null,
  onCloseModal,
}) => {
  const [showSplash, setShowSplash] = useState(!asModal);
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const googleTimeoutRef = useRef<number | null>(null);

  // Bug Fix #1: Reset Google OAuth "Redirecting..." state when user navigates back
  useEffect(() => {
    const resetGoogleLoading = () => {
      if (googleTimeoutRef.current !== null) {
        window.clearTimeout(googleTimeoutRef.current);
        googleTimeoutRef.current = null;
      }
      setGoogleLoading(false);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        resetGoogleLoading();
      }
    };

    window.addEventListener('pageshow', resetGoogleLoading);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('pageshow', resetGoogleLoading);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (googleTimeoutRef.current !== null) {
        window.clearTimeout(googleTimeoutRef.current);
      }
    };
  }, []);

  // Subtle cursor-reactive parallax drift for splash decorative droplets
  const prefersReduced = useReducedMotion();
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const parallaxX = useSpring(rawX, { stiffness: 120, damping: 18 });
  const parallaxY = useSpring(rawY, { stiffness: 120, damping: 18 });

  const handleSplashMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReduced) return;
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    rawX.set(((e.clientX - cx) / cx) * 7);
    rawY.set(((e.clientY - cy) / cy) * 7);
  };

  // Bug Fix #2: Clear inline auth errors on tab switch
  const handleSwitchMode = (nextMode: 'login' | 'signup') => {
    setMode(nextMode);
    setForgotMode(false);
    setAuthError(null);
    setAuthNotice(null);
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setAuthError('Please enter your email address.');
      return;
    }
    setResetLoading(true);
    setAuthError(null);
    setAuthNotice(null);
    const res = await requestPasswordResetOnApi(trimmed);
    setResetLoading(false);
    if (!res.ok) {
      setAuthError(res.error || 'Could not send reset link. Please try again.');
      return;
    }
    setAuthNotice('Check your inbox for your reset link');
    onShowToast?.('Check your inbox for your reset link', 'success');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);
    setAuthNotice(null);

    try {
      if (mode === 'signup') {
        if (!name.trim()) {
          setAuthError('Please enter your full name.');
          return;
        }
        const { data, error } = await signUpWithEmail({
          name: name.trim(),
          email: email.trim(),
          password,
          phone: phone.trim(),
        });
        if (error) {
          setAuthError(error.message);
          return;
        }
        // Fire non-blocking welcome email via Brevo
        void sendWelcomeEmailOnApi(email.trim(), name.trim());
        if (data.session && data.user) {
          onLogin({
            userId: data.user.id,
            name: name.trim(),
            email: data.user.email || email.trim(),
            phone: phone.trim() || undefined,
          });
        } else {
          setAuthNotice(
            'Account created! Please check your email to confirm your account, then log in.'
          );
          setMode('login');
        }
      } else {
        const { data, error } = await signInWithEmail(email.trim(), password);
        if (error) {
          setAuthError(error.message);
          return;
        }
        if (data.user) {
          onLogin({
            userId: data.user.id,
            name: (data.user.user_metadata?.full_name as string) || undefined,
            email: data.user.email || undefined,
            phone: (data.user.user_metadata?.phone as string) || undefined,
          });
        }
      }
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Unable to authenticate right now.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleOAuth = async () => {
    setAuthError(null);
    setAuthNotice(null);
    setMagicLinkSent(false);
    setGoogleLoading(true);

    // 10-second fallback timeout so button never stays stuck
    if (googleTimeoutRef.current !== null) {
      window.clearTimeout(googleTimeoutRef.current);
    }
    googleTimeoutRef.current = window.setTimeout(() => {
      setGoogleLoading(false);
      googleTimeoutRef.current = null;
    }, 10000);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + window.location.pathname,
        },
      });
      if (error) {
        if (googleTimeoutRef.current !== null) {
          window.clearTimeout(googleTimeoutRef.current);
          googleTimeoutRef.current = null;
        }
        setAuthError(error.message);
        onShowToast?.(error.message, 'info');
        setGoogleLoading(false);
      }
    } catch (err) {
      if (googleTimeoutRef.current !== null) {
        window.clearTimeout(googleTimeoutRef.current);
        googleTimeoutRef.current = null;
      }
      const msg =
        err instanceof Error ? err.message : 'Google Sign-In failed. Please try again.';
      setAuthError(msg);
      onShowToast?.(msg, 'info');
      setGoogleLoading(false);
    }
  };

  const handleMagicLink = async () => {
    setAuthError(null);
    setAuthNotice(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setAuthError('Enter your email address above first to receive a Magic Link.');
      emailInputRef.current?.focus();
      return;
    }

    setMagicLinkLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          emailRedirectTo: window.location.origin + window.location.pathname,
        },
      });
      if (error) {
        setAuthError(error.message);
        onShowToast?.(error.message, 'info');
        return;
      }
      setMagicLinkSent(true);
      setAuthNotice('Check your email for your login link');
      onShowToast?.('Check your email for your login link!', 'success');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to send login link.';
      setAuthError(msg);
      onShowToast?.(msg, 'info');
    } finally {
      setMagicLinkLoading(false);
    }
  };

  // Bug Fix #3: Fast Splash Screen (< 450ms total entrance) + "Explore as Guest"
  if (showSplash && !asModal) {
    return (
      <div
        onMouseMove={handleSplashMouseMove}
        className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-[#F0F6FF] via-white to-[#D6E6FF] dark:from-[#0A1430] dark:via-[#0B1A3A] dark:to-[#0B2E8F]/40 flex flex-col items-center justify-center px-6 py-10 transition-colors duration-300"
      >
        <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-[#1A6BFF]/15 blur-3xl dark:bg-[#2B7FFF]/20" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-[#2B7FFF]/20 blur-3xl dark:bg-[#1A6BFF]/20" />

        <div className="absolute top-5 right-5 z-20">
          <ThemeToggle />
        </div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: { staggerChildren: 0.045 },
            },
          }}
          className="relative z-10 flex flex-col items-center text-center max-w-md"
        >
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 12 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.22, ease: EASE_SKIPER },
              },
            }}
          >
            <MonteLogo
              size="xl"
              animated
              parallaxX={parallaxX}
              parallaxY={parallaxY}
            />
          </motion.div>

          <motion.p
            variants={{
              hidden: { opacity: 0, y: 12 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.2, ease: EASE_SKIPER },
              },
            }}
            className="mt-5 text-lg sm:text-xl font-extrabold tracking-tight text-[#0A1E5C] dark:text-white"
          >
            Plan it. Invite them. Monte it.
          </motion.p>

          <motion.p
            variants={{
              hidden: { opacity: 0, y: 12 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.2, ease: EASE_SKIPER },
              },
            }}
            className="mt-2 text-sm text-[#0A1E5C]/70 dark:text-white/70 max-w-xs"
          >
            Organize roadtrips, birthdays &amp; beach getaways with split budgets, M-Pesa tracking, live group chats, and shared media vaults.
          </motion.p>

          <motion.div
            variants={{
              hidden: { opacity: 0, y: 12 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.2, ease: EASE_SKIPER },
              },
            }}
            className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto"
          >
            <MagneticButton
              type="button"
              onClick={() => setShowSplash(false)}
              className="monte-shimmer-btn relative overflow-hidden w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1A6BFF] hover:bg-[#2B7FFF] px-8 py-3.5 text-sm font-bold text-white shadow-monte transition-colors"
            >
              <span>Get Started</span>
              <ArrowRight className="h-4 w-4" />
            </MagneticButton>

            {onExploreAsGuest && (
              <motion.button
                type="button"
                onClick={onExploreAsGuest}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={SPRING_SNAPPY}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/40 bg-white/85 dark:bg-[#13224A] px-6 py-3.5 text-sm font-bold text-[#0A1E5C] dark:text-white hover:border-[#1A6BFF] dark:hover:border-[#2B7FFF] hover:shadow-[0_0_0_3px_rgba(43,127,255,0.22)] transition-all"
              >
                <Compass className="h-4 w-4 text-[#1A6BFF] dark:text-[#2B7FFF]" />
                Explore as Guest
              </motion.button>
            )}
          </motion.div>

          <motion.div
            variants={{
              hidden: { opacity: 0, y: 12 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.2, ease: EASE_SKIPER },
              },
            }}
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-white/80 dark:bg-[#13224A]/90 border border-[#D6E6FF] dark:border-[#2B7FFF]/30 px-4 py-2 text-xs font-semibold text-[#0B2E8F] dark:text-[#D6E6FF]"
          >
            <Camera className="h-3.5 w-3.5 text-[#1A6BFF] dark:text-[#2B7FFF]" />
            <span>Videos &amp; photos from your events live here</span>
            <Film className="h-3.5 w-3.5 text-[#1A6BFF] dark:text-[#2B7FFF]" />
          </motion.div>
        </motion.div>
      </div>
    );
  }

  const AuthCardContent = (
    <div className="rounded-3xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-white dark:bg-[#13224A] p-6 sm:p-7 shadow-monte dark:shadow-monte-dark">
      {asModal && (
        <div className="flex items-center justify-between gap-2 pb-4 mb-4 border-b border-[#D6E6FF] dark:border-[#2B7FFF]/20">
          <div className="flex items-center gap-2">
            <img src="./favicon.svg" alt="Monte" className="h-7 w-7" />
            <span className="text-sm font-extrabold text-[#0A1E5C] dark:text-white">
              MONTE EVENTS
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            {onCloseModal && (
              <button
                type="button"
                onClick={onCloseModal}
                aria-label="Close modal"
                className="rounded-full p-1.5 text-[#0A1E5C]/65 dark:text-white/65 hover:bg-[#F0F6FF] dark:hover:bg-[#1A2D5E]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {contextMessage && (
        <div className="mb-4 rounded-2xl border border-[#1A6BFF]/30 bg-[#F0F6FF] dark:bg-[#0B1A3A] px-3.5 py-2.5 text-xs font-semibold text-[#0B2E8F] dark:text-[#D6E6FF]">
          {contextMessage}
        </div>
      )}

      {/* Tabs: Log In / Sign Up with gliding pill */}
      <div className="grid grid-cols-2 rounded-2xl bg-[#F0F6FF] dark:bg-[#0A1430] p-1 mb-5">
        {(['login', 'signup'] as const).map((tabMode) => {
          const active = mode === tabMode;
          return (
            <button
              key={tabMode}
              type="button"
              onClick={() => handleSwitchMode(tabMode)}
              className={`relative rounded-xl py-2.5 text-sm font-bold transition-colors ${
                active
                  ? 'text-white'
                  : 'text-[#0A1E5C]/70 dark:text-white/70 hover:text-[#0A1E5C] dark:hover:text-white'
              }`}
            >
              {active && (
                <motion.span
                  layoutId={asModal ? 'modal-auth-mode-pill' : 'auth-mode-pill'}
                  transition={SPRING_SNAPPY}
                  className="absolute inset-0 rounded-xl bg-[#1A6BFF] shadow-sm"
                />
              )}
              <span className="relative z-10">
                {tabMode === 'login' ? 'Log In' : 'Sign Up'}
              </span>
            </button>
          );
        })}
      </div>

      {forgotMode ? (
        <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-[#0A1E5C] dark:text-white">
              Reset your password
            </h3>
            <p className="text-xs text-[#0A1E5C]/65 dark:text-white/65">
              Enter your email address and we’ll send you a Monte Events password reset link.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#0A1E5C]/70 dark:text-white/70 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1A6BFF] dark:text-[#2B7FFF]" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (authError) setAuthError(null);
                }}
                placeholder="you@example.com"
                required
                className="w-full rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] pl-10 pr-4 py-2.5 text-sm text-[#0A1E5C] dark:text-white placeholder:text-[#0A1E5C]/40 dark:placeholder:text-white/40 focus:border-[#1A6BFF] focus:outline-none focus:ring-2 focus:ring-[#1A6BFF]/20"
              />
            </div>
          </div>

          {authError && (
            <p className="rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400">
              {authError}
            </p>
          )}

          {authNotice && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{authNotice}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={resetLoading}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#1A6BFF] hover:bg-[#2B7FFF] disabled:opacity-60 py-3.5 text-sm font-extrabold text-white shadow-monte transition"
          >
            {resetLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            {resetLoading ? 'Sending Reset Link…' : 'Send Reset Link'}
          </button>

          <button
            type="button"
            onClick={() => {
              setForgotMode(false);
              setAuthError(null);
              setAuthNotice(null);
            }}
            className="w-full text-center text-xs font-bold text-[#1A6BFF] dark:text-[#2B7FFF] hover:underline"
          >
            Back to Log In
          </button>
        </form>
      ) : (
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
                onChange={(e) => {
                  setName(e.target.value);
                  if (authError) setAuthError(null);
                }}
                placeholder="Your full name"
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
              ref={emailInputRef}
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (authError) setAuthError(null);
                if (magicLinkSent) setMagicLinkSent(false);
              }}
              placeholder="you@example.com"
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
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (authError) setAuthError(null);
                }}
                placeholder="+254 7XX XXX XXX"
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
              onChange={(e) => {
                setPassword(e.target.value);
                if (authError) setAuthError(null);
              }}
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
          {mode === 'login' && (
            <div className="mt-1.5 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setForgotMode(true);
                  setAuthError(null);
                  setAuthNotice(null);
                }}
                className="text-xs font-bold text-[#1A6BFF] dark:text-[#2B7FFF] hover:underline"
              >
                Forgot password?
              </button>
            </div>
          )}
        </div>

        {authError && (
          <p className="rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400">
            {authError}
          </p>
        )}

        {authNotice && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{authNotice}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || googleLoading || magicLinkLoading}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#1A6BFF] hover:bg-[#2B7FFF] disabled:opacity-60 py-3.5 text-sm font-extrabold text-white shadow-monte transition active:scale-[0.99]"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {loading
            ? 'Connecting to Monte...'
            : mode === 'signup'
            ? 'Create Account'
            : 'Enter Monte'}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>
      )}

      {/* Divider with whitespace-nowrap */}
      <div className="relative my-5 flex items-center justify-center gap-3">
        <div className="h-px flex-1 bg-[#D6E6FF] dark:bg-[#2B7FFF]/20" />
        <span className="whitespace-nowrap shrink-0 text-xs font-semibold text-[#0A1E5C]/55 dark:text-white/55">
          or continue with
        </span>
        <div className="h-px flex-1 bg-[#D6E6FF] dark:bg-[#2B7FFF]/20" />
      </div>

      {/* Auth Provider Buttons: Google OAuth + Email Magic Link */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={handleGoogleOAuth}
          disabled={googleLoading || magicLinkLoading}
          className="flex items-center justify-center gap-2 rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/50 dark:bg-[#0B1A3A] px-4 py-2.5 text-xs font-bold text-[#0A1E5C] dark:text-white hover:bg-[#D6E6FF]/50 dark:hover:bg-[#1A2D5E] disabled:opacity-60 transition"
        >
          {googleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#1A6BFF] dark:text-[#2B7FFF]" />
          ) : (
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
          )}
          <span className="whitespace-nowrap">
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </span>
        </button>

        <button
          type="button"
          onClick={handleMagicLink}
          disabled={magicLinkLoading || googleLoading}
          className="flex items-center justify-center gap-2 rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/50 dark:bg-[#0B1A3A] px-4 py-2.5 text-xs font-bold text-[#0A1E5C] dark:text-white hover:bg-[#D6E6FF]/50 dark:hover:bg-[#1A2D5E] disabled:opacity-60 transition"
        >
          {magicLinkLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#1A6BFF] dark:text-[#2B7FFF]" />
          ) : (
            <Mail className="h-4 w-4 shrink-0 text-[#1A6BFF] dark:text-[#2B7FFF]" />
          )}
          <span className="whitespace-nowrap">
            {magicLinkLoading
              ? 'Sending link…'
              : magicLinkSent
              ? 'Link Sent!'
              : 'Continue with Email'}
          </span>
        </button>
      </div>

      {/* Subtle Guest Preview link at bottom of Login form */}
      {!asModal && onExploreAsGuest && (
        <div className="mt-5 pt-4 border-t border-[#D6E6FF]/80 dark:border-[#2B7FFF]/15 text-center">
          <button
            type="button"
            onClick={onExploreAsGuest}
            className="text-xs font-bold text-[#1A6BFF] dark:text-[#2B7FFF] hover:underline transition"
          >
            Continue as Guest (Preview)
          </button>
        </div>
      )}
    </div>
  );

  if (asModal) {
    return (
      <div
        className="fixed inset-0 z-[95] flex items-center justify-center bg-[#0A1430]/75 backdrop-blur-sm p-4"
        onClick={onCloseModal}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={SPRING_SNAPPY}
          className="w-full max-w-md max-h-[92vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {AuthCardContent}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-[#F0F6FF] via-white to-[#D6E6FF] dark:from-[#0A1430] dark:via-[#0B1A3A] dark:to-[#0A1430] flex flex-col items-center justify-center px-4 py-8">
      <div className="pointer-events-none absolute -top-28 -right-28 h-80 w-80 rounded-full bg-[#1A6BFF]/15 blur-3xl dark:bg-[#2B7FFF]/15" />
      <div className="pointer-events-none absolute -bottom-28 -left-28 h-80 w-80 rounded-full bg-[#0B2E8F]/10 blur-3xl dark:bg-[#1A6BFF]/15" />

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
        <div className="flex flex-col items-center text-center mb-6">
          <MonteLogo size="lg" />
          <p className="mt-3 text-sm sm:text-base font-bold text-[#0A1E5C] dark:text-white">
            Plan it. Invite them. Monte it.
          </p>
        </div>

        {AuthCardContent}

        <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-[#0B2E8F] dark:text-[#D6E6FF]">
          <Camera className="h-4 w-4 text-[#1A6BFF] dark:text-[#2B7FFF]" />
          <span>Videos &amp; photos from your events live here</span>
        </div>
      </div>
    </div>
  );
};
