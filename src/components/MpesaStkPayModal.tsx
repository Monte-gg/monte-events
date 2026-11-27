import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { MonteEvent, UserProfile } from '../types';
import { formatKES } from '../data/sampleData';
import { supabase } from '../lib/supabase';
import {
  fetchPayheroPaymentStatusOnApi,
  initiatePayheroStkPushOnApi,
} from '../lib/api';
import { SPRING_POP, SPRING_SNAPPY } from './MotionPrimitives';

interface MpesaStkPayModalProps {
  open: boolean;
  event: MonteEvent;
  user: UserProfile;
  onClose: () => void;
  onPaymentConfirmed: (receiptOrRef: string) => void;
}

type PayStage = 'form' | 'submitting' | 'waiting_pin' | 'confirmed' | 'failed';

export const MpesaStkPayModal: React.FC<MpesaStkPayModalProps> = ({
  open,
  event,
  user,
  onClose,
  onPaymentConfirmed,
}) => {
  const defaultPhone =
    user.mpesaNumber && user.mpesaNumber !== 'Not linked'
      ? user.mpesaNumber
      : user.phone || '';

  const [phone, setPhone] = useState(defaultPhone);
  const [stage, setStage] = useState<PayStage>('form');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reference, setReference] = useState<string>('');
  const [mpesaReceipt, setMpesaReceipt] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(60);

  const pollIntervalRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (pollIntervalRef.current !== null) {
      window.clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (countdownRef.current !== null) {
      window.clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  useEffect(() => {
    if (open) {
      setPhone(defaultPhone);
      setStage('form');
      setErrorMsg(null);
      setReference('');
      setMpesaReceipt(null);
      setSecondsLeft(60);
    } else {
      clearTimers();
    }
    return () => clearTimers();
  }, [open, defaultPhone]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stage !== 'submitting') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, stage, onClose]);

  const startPolling = (ref: string) => {
    clearTimers();
    let elapsed = 0;
    setSecondsLeft(60);

    countdownRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    pollIntervalRef.current = window.setInterval(async () => {
      elapsed += 3;
      const statusRes = await fetchPayheroPaymentStatusOnApi(ref);

      if (statusRes.success && statusRes.status === 'paid') {
        clearTimers();
        const receiptCode = statusRes.mpesaReceipt || ref;
        setMpesaReceipt(receiptCode);
        setStage('confirmed');
        onPaymentConfirmed(receiptCode);
        window.setTimeout(() => {
          onClose();
        }, 2400);
        return;
      }

      if (statusRes.success && statusRes.status === 'failed') {
        clearTimers();
        setErrorMsg(
          'M-PESA payment was cancelled or failed. Please try again.'
        );
        setStage('failed');
        return;
      }

      if (elapsed >= 60) {
        clearTimers();
        setErrorMsg(
          'Timed out waiting for M-PESA confirmation. If you already paid, use "I\'ve Paid (Paste M-PESA Code)" or try again.'
        );
        setStage('failed');
      }
    }, 3000);
  };

  const handleSubmitCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = phone.trim();
    if (!cleaned) {
      setErrorMsg('Please enter your M-PESA phone number (07XX or 01XX).');
      return;
    }
    setErrorMsg(null);
    setStage('submitting');

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setErrorMsg('Please sign in again to complete your M-PESA payment.');
      setStage('failed');
      return;
    }

    const res = await initiatePayheroStkPushOnApi({
      accessToken,
      eventId: event.id,
      amount: event.costPerPerson,
      phone: cleaned,
      customerName: user.name || user.email,
    });

    if (!res.success || !res.reference) {
      setErrorMsg(res.error || 'Could not send M-PESA prompt. Please try again.');
      setStage('failed');
      return;
    }

    setReference(res.reference);
    setStage('waiting_pin');
    startPolling(res.reference);
  };

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="mpesa-stk-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-[#081128]/80 backdrop-blur-sm p-3 sm:p-4"
        onClick={() => {
          if (stage !== 'submitting') onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 14 }}
          transition={SPRING_SNAPPY}
          className="w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-3xl border border-emerald-500/35 bg-white dark:bg-[#13224A] shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-[#D6E6FF] dark:border-[#2B7FFF]/20 bg-gradient-to-r from-emerald-500/12 via-white to-[#F0F6FF] dark:from-emerald-500/15 dark:via-[#13224A] dark:to-[#0B1A3A] px-5 py-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-sm">
                <Smartphone className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h3 className="truncate text-base font-extrabold text-[#0A1E5C] dark:text-white">
                  Pay via M-PESA
                </h3>
                <p className="truncate text-xs text-[#0A1E5C]/65 dark:text-white/65">
                  Instant STK Push · Powered by PayHero
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-[#0A1E5C]/60 dark:text-white/60 hover:bg-[#F0F6FF] dark:hover:bg-[#1A2D5E]"
              aria-label="Close payment modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Payment Summary Card */}
            <div className="rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-[#F0F6FF]/80 dark:bg-[#0B1A3A] p-4 space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-bold text-[#0A1E5C]/60 dark:text-white/60">Event</span>
                <span className="font-extrabold text-[#0A1E5C] dark:text-white truncate max-w-[65%] text-right">
                  {event.name}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-bold text-[#0A1E5C]/60 dark:text-white/60">
                  Recipient
                </span>
                <span className="font-bold text-[#0A1E5C] dark:text-white truncate max-w-[65%] text-right">
                  {event.mpesaName || event.createdBy}
                  {event.mpesaNumber ? ` (${event.mpesaNumber})` : ''}
                </span>
              </div>
              <div className="pt-2 border-t border-[#D6E6FF] dark:border-[#2B7FFF]/20 flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#0A1E5C]/70 dark:text-white/70">
                  Amount Due
                </span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {formatKES(event.costPerPerson)}
                </span>
              </div>
            </div>

            {/* STAGE 1: FORM */}
            {(stage === 'form' || stage === 'submitting') && (
              <form onSubmit={handleSubmitCharge} className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-[#0A1E5C]/70 dark:text-white/70 mb-1.5">
                    Your M-PESA Phone Number
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    required
                    disabled={stage === 'submitting'}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 0712 345 678 or 0112 345 678"
                    className="w-full rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/35 bg-[#F0F6FF]/60 dark:bg-[#0B1A3A] px-4 py-3 text-sm font-bold text-[#0A1E5C] dark:text-white focus:border-emerald-500 focus:outline-none"
                  />
                  <p className="mt-1.5 text-[11px] text-[#0A1E5C]/60 dark:text-white/60">
                    An M-PESA PIN prompt will pop up directly on this phone number.
                  </p>
                </div>

                {errorMsg && (
                  <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-3.5 py-2.5 text-xs font-semibold text-red-600 dark:text-red-400 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={stage === 'submitting'}
                    onClick={onClose}
                    className="rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 px-4 py-3 text-xs sm:text-sm font-bold text-[#0A1E5C] dark:text-white hover:bg-[#F0F6FF] dark:hover:bg-[#1A2D5E]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={stage === 'submitting' || phone.trim().length < 9}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-55 px-5 py-3 text-sm font-extrabold text-white shadow-lg transition active:scale-95"
                  >
                    {stage === 'submitting' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending Prompt…
                      </>
                    ) : (
                      <>
                        <Smartphone className="h-4 w-4" />
                        Send M-PESA Prompt
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STAGE 2: WAITING FOR M-PESA PIN */}
            {stage === 'waiting_pin' && (
              <div className="py-4 text-center space-y-4">
                <div className="relative mx-auto flex h-16 w-16 items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-emerald-500/25 animate-ping" />
                  <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
                    <Smartphone className="h-7 w-7" />
                  </span>
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-extrabold text-[#0A1E5C] dark:text-white">
                    Check your phone and enter your M-PESA PIN...
                  </h4>
                  <p className="text-xs text-[#0A1E5C]/70 dark:text-white/70 max-w-xs mx-auto leading-relaxed">
                    Once you enter your M-PESA PIN, your spot will automatically confirm here.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#F0F6FF] dark:bg-[#0B1A3A] border border-[#D6E6FF] dark:border-[#2B7FFF]/30 px-4 py-1.5 text-xs font-bold text-[#1A6BFF] dark:text-[#2B7FFF]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Waiting for confirmation… ({secondsLeft}s)
                </div>
                {reference && (
                  <p className="text-[10px] font-mono text-[#0A1E5C]/50 dark:text-white/50">
                    Ref: {reference}
                  </p>
                )}
              </div>
            )}

            {/* STAGE 3: CONFIRMED */}
            {stage === 'confirmed' && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={SPRING_POP}
                className="py-5 text-center space-y-3"
              >
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl">
                  <CheckCircle2 className="h-9 w-9" />
                </span>
                <h4 className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                  Paid! Payment Confirmed
                </h4>
                {mpesaReceipt && (
                  <span className="inline-block rounded-full bg-emerald-500/15 border border-emerald-500/35 px-3.5 py-1 text-xs font-mono font-extrabold text-emerald-700 dark:text-emerald-300">
                    M-PESA Receipt: {mpesaReceipt}
                  </span>
                )}
                <p className="text-xs text-[#0A1E5C]/70 dark:text-white/70">
                  Your spot for <strong>{event.name}</strong> is locked in!
                </p>
              </motion.div>
            )}

            {/* STAGE 4: FAILED */}
            {stage === 'failed' && (
              <div className="py-3 text-center space-y-4">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 text-red-500">
                  <AlertCircle className="h-7 w-7" />
                </span>
                <div className="space-y-1">
                  <h4 className="text-base font-extrabold text-[#0A1E5C] dark:text-white">
                    Payment Not Completed
                  </h4>
                  <p className="text-xs text-[#0A1E5C]/70 dark:text-white/70 leading-relaxed">
                    {errorMsg || 'The M-PESA prompt could not be completed.'}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 px-4 py-2.5 text-xs font-bold text-[#0A1E5C] dark:text-white"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setStage('form');
                    }}
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-xs font-extrabold text-white shadow-sm"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-1.5 pt-1 text-[10px] font-semibold text-[#0A1E5C]/50 dark:text-white/50">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Secured by PayHero Kenya M-PESA
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};
