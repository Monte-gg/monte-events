import React, { useEffect, useRef, useState } from 'react';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from 'motion/react';

export const SPRING_SNAPPY = {
  type: 'spring' as const,
  stiffness: 440,
  damping: 32,
  mass: 0.8,
};

export const SPRING_POP = {
  type: 'spring' as const,
  stiffness: 500,
  damping: 24,
};

export const EASE_SKIPER = [0.22, 1, 0.36, 1] as const;

interface CountUpNumberProps {
  value: number;
  durationMs?: number;
  formatter?: (val: number) => string;
}

export const CountUpNumber: React.FC<CountUpNumberProps> = ({
  value,
  durationMs = 580,
  formatter = (v) => Math.round(v).toString(),
}) => {
  const prefersReduced = useReducedMotion();
  const [display, setDisplay] = useState<number>(prefersReduced ? value : 0);
  const fromRef = useRef<number>(0);

  useEffect(() => {
    if (prefersReduced) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }

    const startVal = fromRef.current;
    const diff = value - startVal;
    const startTime = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - t, 3);
      const current = startVal + diff * eased;
      setDisplay(current);
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [value, durationMs, prefersReduced]);

  return <>{formatter(display)}</>;
};

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
}

export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className = '',
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    el.style.setProperty('--my', `${e.clientY - rect.top}px`);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={{ y: -2 }}
      transition={SPRING_SNAPPY}
      className={`relative overflow-hidden rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/20 bg-white dark:bg-[#13224A] p-4 sm:p-5 shadow-sm transition-colors ${className}`}
    >
      {/* Cursor-tracking radial spotlight border & glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-200"
        style={{
          opacity: hovered ? 1 : 0,
          background:
            'radial-gradient(220px circle at var(--mx, 50%) var(--my, 50%), rgba(43, 127, 255, 0.22), transparent 72%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-200"
        style={{
          opacity: hovered ? 1 : 0,
          padding: '1.5px',
          background:
            'radial-gradient(180px circle at var(--mx, 50%) var(--my, 50%), rgba(43, 127, 255, 0.9), transparent 70%)',
          WebkitMask:
            'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
};

interface MagneticButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit';
  strength?: number;
}

export const MagneticButton: React.FC<MagneticButtonProps> = ({
  children,
  onClick,
  className = '',
  type = 'button',
  strength = 0.22,
}) => {
  const ref = useRef<HTMLButtonElement>(null);
  const prefersReduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 320, damping: 20 });
  const springY = useSpring(y, { stiffness: 320, damping: 20 });

  const handleMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (prefersReduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    x.set(dx * strength);
    y.set(dy * strength);
  };

  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={ref}
      type={type}
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ x: springX, y: springY }}
      whileTap={{ scale: 0.96 }}
      className={className}
    >
      {children}
    </motion.button>
  );
};

interface ScrollProgressBarProps {
  percent: number;
  heightClass?: string;
}

export const ScrollProgressBar: React.FC<ScrollProgressBarProps> = ({
  percent,
  heightClass = 'h-2.5',
}) => {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div
      className={`${heightClass} w-full rounded-full bg-[#D6E6FF] dark:bg-[#0A1430] overflow-hidden`}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.45, ease: EASE_SKIPER }}
        className="h-full rounded-full bg-gradient-to-r from-[#1A6BFF] to-[#2B7FFF]"
      />
    </div>
  );
};
