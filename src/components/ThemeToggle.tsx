import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTheme } from '../context/ThemeContext';
import { SPRING_POP } from './MotionPrimitives';

interface ThemeToggleProps {
  compact?: boolean;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  compact = false,
  className = '',
}) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      whileTap={{ scale: 0.94 }}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold transition-colors duration-200 ${
        compact ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-1.5 text-xs sm:text-sm'
      } ${
        isDark
          ? 'border-[#2B7FFF]/40 bg-[#13224A] text-white hover:bg-[#1A2D5E] hover:border-[#2B7FFF]'
          : 'border-[#D6E6FF] bg-white text-[#0A1E5C] hover:bg-[#F0F6FF] hover:border-[#1A6BFF]/50 shadow-sm'
      } ${className}`}
    >
      <span
        className={`relative flex h-5 w-5 items-center justify-center rounded-full overflow-hidden transition-colors duration-200 ${
          isDark ? 'bg-[#2B7FFF] text-white' : 'bg-[#1A6BFF] text-white'
        }`}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isDark ? 'moon' : 'sun'}
            initial={{ rotate: -180, opacity: 0, scale: 0.6 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 180, opacity: 0, scale: 0.6 }}
            transition={SPRING_POP}
            className="flex items-center justify-center"
          >
            {isDark ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
          </motion.span>
        </AnimatePresence>
      </span>
      <span>{isDark ? 'Dark' : 'Light'}</span>
    </motion.button>
  );
};
