import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  compact?: boolean;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ compact = false, className = '' }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold transition-all duration-200 active:scale-95 ${
        compact ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-1.5 text-xs sm:text-sm'
      } ${
        isDark
          ? 'border-[#2B7FFF]/40 bg-[#13224A] text-white hover:bg-[#1A2D5E] hover:border-[#2B7FFF]'
          : 'border-[#D6E6FF] bg-white text-[#0A1E5C] hover:bg-[#F0F6FF] hover:border-[#1A6BFF]/50 shadow-sm'
      } ${className}`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full transition-colors ${
          isDark ? 'bg-[#2B7FFF] text-white' : 'bg-[#1A6BFF] text-white'
        }`}
      >
        {isDark ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
      </span>
      <span>{isDark ? 'Dark' : 'Light'}</span>
    </button>
  );
};
