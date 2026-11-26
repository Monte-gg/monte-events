import React from 'react';
import { motion, MotionValue } from 'motion/react';

interface MonteLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  layout?: 'stacked' | 'horizontal';
  animated?: boolean;
  parallaxX?: MotionValue<number>;
  parallaxY?: MotionValue<number>;
  className?: string;
}

export const MonteLogo: React.FC<MonteLogoProps> = ({
  size = 'md',
  layout = 'stacked',
  animated = false,
  parallaxX,
  parallaxY,
  className = '',
}) => {
  const iconDims = {
    xs: 'w-9 h-9',
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24 sm:w-28 sm:h-28',
    xl: 'w-32 h-32 sm:w-36 sm:h-36',
  }[size];

  const textSize = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl sm:text-3xl',
    xl: 'text-3xl sm:text-4xl',
  }[size];

  const uid = React.useId().replace(/:/g, '');

  const SplatterMark = (
    <svg
      viewBox="0 0 160 160"
      className={`${iconDims} shrink-0 drop-shadow-md select-none overflow-visible`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`wc-main-${uid}`} cx="42%" cy="38%" r="60%">
          <stop offset="0%" stopColor="#4594FF" />
          <stop offset="48%" stopColor="#1A6BFF" />
          <stop offset="85%" stopColor="#0B2E8F" />
          <stop offset="100%" stopColor="#082370" />
        </radialGradient>
        <radialGradient id={`wc-wash-${uid}`} cx="65%" cy="65%" r="55%">
          <stop offset="0%" stopColor="#2B7FFF" stopOpacity="0.85" />
          <stop offset="70%" stopColor="#1A6BFF" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#0B2E8F" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Outer translucent watercolor wash */}
      <path
        d="M78,14 C98,10 120,20 132,36 C145,53 152,77 142,98 C133,118 117,138 95,144 C73,150 48,144 32,128 C16,112 10,88 16,65 C22,42 36,24 58,17 C65,15 71,15 78,14 Z"
        fill={`url(#wc-wash-${uid})`}
      />

      {/* Main organic blue watercolor paint splatter blob */}
      <path
        d="M82,22 C100,19 116,28 127,42 C137,56 143,74 136,92 C129,110 116,126 98,133 C79,140 57,136 42,123 C26,110 18,90 23,70 C28,50 41,34 60,26 C67,23 75,23 82,22 Z"
        fill={`url(#wc-main-${uid})`}
      />

      {/* Cursor-reactive parallax decorative splatter droplets */}
      <motion.g
        style={
          parallaxX && parallaxY
            ? { x: parallaxX, y: parallaxY }
            : undefined
        }
      >
        <circle cx="142" cy="34" r="5.5" fill="#2B7FFF" opacity="0.88" />
        <circle cx="149" cy="48" r="2.8" fill="#1A6BFF" opacity="0.75" />
        <circle cx="22" cy="34" r="4.5" fill="#1A6BFF" opacity="0.82" />
        <circle cx="14" cy="46" r="2.2" fill="#2B7FFF" opacity="0.7" />
        <circle cx="136" cy="126" r="6" fill="#0B2E8F" opacity="0.78" />
        <circle cx="146" cy="116" r="2.6" fill="#2B7FFF" opacity="0.8" />
        <circle cx="28" cy="132" r="4.8" fill="#2B7FFF" opacity="0.8" />
        <circle cx="18" cy="120" r="2.4" fill="#0B2E8F" opacity="0.65" />
        <ellipse
          cx="96"
          cy="14"
          rx="6"
          ry="3.2"
          transform="rotate(-18 96 14)"
          fill="#2B7FFF"
          opacity="0.78"
        />
        <ellipse
          cx="62"
          cy="146"
          rx="5.5"
          ry="2.8"
          transform="rotate(14 62 146)"
          fill="#1A6BFF"
          opacity="0.75"
        />
      </motion.g>

      {/* Subtle watercolor highlight inside blob */}
      <ellipse
        cx="62"
        cy="54"
        rx="22"
        ry="16"
        fill="#6BB0FF"
        opacity="0.22"
        transform="rotate(-25 62 54)"
      />

      {/* White circle ring */}
      <circle
        cx="80"
        cy="80"
        r="39"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="5.5"
        strokeLinecap="round"
      />

      {/* Bold white M inside ring */}
      <path
        d="M57 101 V59 H68.5 L80 79.5 L91.5 59 H103 V101 H92.5 V76.5 L82.5 93.5 H77.5 L67.5 76.5 V101 H57 Z"
        fill="#FFFFFF"
      />
    </svg>
  );

  if (layout === 'horizontal') {
    return (
      <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
        {SplatterMark}
        <div className="flex flex-col leading-none">
          <span
            className={`monte-graffiti-text inline-block -rotate-2 ${textSize}`}
          >
            MONTE EVENTS
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <div className={animated ? 'animate-float-logo' : ''}>{SplatterMark}</div>
      <div
        className={`monte-graffiti-text -mt-1.5 -rotate-3 text-center leading-none tracking-wide ${textSize}`}
      >
        MONTE EVENTS
      </div>
    </div>
  );
};
