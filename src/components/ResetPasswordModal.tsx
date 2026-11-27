import React, { useState } from 'react';
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Lock, X } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabaseClient.js';
import { ThemeToggle } from './ThemeToggle';
import { SPRING_SNAPPY } from './MotionPrimitives';

interface ResetPasswordModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) {
        setError(updateErr.message);
        return;
      }
      setDone(true);
      setTimeout(() => {
        setPassword('');
        setConfirmPassword('');
        setDone(false);
        onSuccess();
      }, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[96] flex items-center justify-center bg-[#0A1430]/75 backdrop-blur-sm p-4"
      onClick={() => !loading && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={SPRING_SNAPPY}
        className="w-full max-w-md rounded-3xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#D6E6FF] dark:border-[#2B7FFF]/20">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F0F6FF] dark:bg-[#0B1A3A] text-[#1A6BFF] dark:text-[#2B7FFF]">
              <KeyRound className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-[#0A1E5C] dark:text-white">
                Set New Password
              </h2>
              <p className="text-[11px] text-[#0A1E5C]/60 dark:text-white/60">
                Choose a strong password for MONTE EVENTS
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              aria-label="Close modal"
              className="rounded-full p-1.5 text-[#0A1E5C]/60 dark:text-white/60 hover:bg-[#F0F6FF] dark:hover:bg-[#1A2D5E]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {done ? (
          <div className="py-6 text-center space-y-2">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <p className="text-base font-extrabold text-[#0A1E5C] dark:text-white">
              Password Updated!
            </p>
            <p className="text-xs text-[#0A1E5C]/65 dark:text-white/65">
              Taking you back into MONTE EVENTS…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#0A1E5C]/70 dark:text-white/70 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1A6BFF]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="At least 6 characters"
                  required
                  className="w-full rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] pl-10 pr-10 py-2.5 text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0A1E5C]/50 dark:text-white/50 hover:text-[#1A6BFF]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#0A1E5C]/70 dark:text-white/70 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1A6BFF]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Re-enter your new password"
                  required
                  className="w-full rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] pl-10 pr-4 py-2.5 text-sm text-[#0A1E5C] dark:text-white focus:border-[#1A6BFF] focus:outline-none"
                />
              </div>
            </div>

            {error && (
              <p className="rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#1A6BFF] hover:bg-[#2B7FFF] disabled:opacity-60 py-3 text-sm font-extrabold text-white shadow-monte transition"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Updating Password…' : 'Save New Password'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};
