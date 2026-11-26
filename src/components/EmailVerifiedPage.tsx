import React from 'react';
import { ArrowRight, CheckCircle2, MailCheck, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { MonteLogo } from './MonteLogo';
import { ThemeToggle } from './ThemeToggle';
import { EASE_SKIPER, MagneticButton, SPRING_POP } from './MotionPrimitives';

interface EmailVerifiedPageProps {
  email?: string;
  isSignedIn: boolean;
  onContinue: () => void;
}

export const EmailVerifiedPage: React.FC<EmailVerifiedPageProps> = ({
  email,
  isSignedIn,
  onContinue,
}) => {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-[#F0F6FF] via-white to-[#D6E6FF] dark:from-[#0A1430] dark:via-[#0B1A3A] dark:to-[#0B2E8F]/40 flex flex-col items-center justify-center px-5 py-10 transition-colors duration-300">
      {/* Decorative royal blue paint wash accents */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-[#1A6BFF]/15 blur-3xl dark:bg-[#2B7FFF]/20" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-[#2B7FFF]/20 blur-3xl dark:bg-[#1A6BFF]/20" />

      {/* Theme Toggle top-right */}
      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: EASE_SKIPER }}
        className="relative z-10 w-full max-w-md flex flex-col items-center text-center"
      >
        {/* MONTE EVENTS Logo */}
        <MonteLogo size="lg" animated />

        {/* Verified Card */}
        <div className="mt-6 w-full rounded-3xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] p-7 sm:p-8 shadow-monte dark:shadow-monte-dark space-y-5">
          {/* Animated Checkmark Badge */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...SPRING_POP, delay: 0.1 }}
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 ring-8 ring-emerald-500/10"
          >
            <svg
              viewBox="0 0 48 48"
              fill="none"
              className="h-11 w-11 text-emerald-500"
              aria-hidden="true"
            >
              <motion.circle
                cx="24"
                cy="24"
                r="20"
                stroke="currentColor"
                strokeWidth="3.5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
              />
              <motion.path
                d="M15 24.5 L21.5 31 L33.5 18"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.35, delay: 0.22, ease: 'easeOut' }}
              />
            </svg>
          </motion.div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3.5 py-1 text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
              <MailCheck className="h-3.5 w-3.5" />
              Account Confirmed
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0A1E5C] dark:text-white">
              Email Verified!
            </h1>
            <p className="text-sm text-[#0A1E5C]/70 dark:text-white/70 leading-relaxed">
              Your <span className="font-bold text-[#1A6BFF] dark:text-[#2B7FFF]">MONTE EVENTS</span> email address has been verified. You’re all set to plan roadtrips, track M-Pesa splits, and chat with the squad.
            </p>
          </div>

          {email && (
            <div className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-[#F0F6FF] dark:bg-[#0B1A3A] px-4 py-2 text-xs font-bold text-[#0A1E5C] dark:text-white max-w-full">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span className="truncate">{email}</span>
            </div>
          )}

          <div className="pt-2">
            <MagneticButton
              type="button"
              onClick={onContinue}
              className="monte-shimmer-btn relative overflow-hidden w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1A6BFF] hover:bg-[#2B7FFF] px-6 py-3.5 text-sm font-extrabold text-white shadow-monte transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              <span>
                {isSignedIn ? 'Enter Monte Dashboard' : 'Continue to Log In'}
              </span>
              <ArrowRight className="h-4 w-4" />
            </MagneticButton>
          </div>
        </div>

        <p className="mt-5 text-xs font-bold text-[#0B2E8F]/80 dark:text-[#D6E6FF]/80">
          Plan it. Invite them. Monte it.
        </p>
      </motion.div>
    </div>
  );
};
