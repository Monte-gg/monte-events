import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Download, Info, Smartphone } from 'lucide-react';
import { isNativeApp } from '../lib/nativeApp';

export const ANDROID_APK_DOWNLOAD_URL =
  'https://github.com/Monte-gg/monte-events/releases/latest/download/MonteEvents.apk';

interface DownloadAppCardProps {
  compact?: boolean;
}

export const DownloadAppCard: React.FC<DownloadAppCardProps> = ({
  compact = false,
}) => {
  const [showHelp, setShowHelp] = useState(false);

  // Automatically hide when already running inside the installed native app
  if (isNativeApp()) return null;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-emerald-500/35 bg-gradient-to-br from-[#0B1220] via-[#0F172A] to-[#0B2E8F] text-white shadow-monte ${
        compact ? 'p-4 sm:p-5' : 'p-5 sm:p-6'
      }`}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/15 blur-2xl" />
      <div className="pointer-events-none absolute -left-10 -bottom-12 h-40 w-40 rounded-full bg-[#1A6BFF]/25 blur-2xl" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          {/* Circular Monte Events M Icon Badge */}
          <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#2563EB] border-2 border-white/80 text-lg font-black text-white shadow-lg">
            <span className="pointer-events-none absolute -inset-1 rounded-full border border-blue-200/50 -rotate-12 scale-x-125 scale-y-75" />
            M
          </span>

          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-white">
                Download Monte Events App
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
                <Smartphone className="h-3 w-3" />
                Android APK
              </span>
            </div>
            <p className="text-xs sm:text-sm text-blue-100/85">
              Install the real Android app — no browser needed.
            </p>
          </div>
        </div>

        <a
          href={ANDROID_APK_DOWNLOAD_URL}
          download="MonteEvents.apk"
          className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 px-5 py-3 text-xs sm:text-sm font-extrabold text-white shadow-lg transition active:scale-95"
        >
          <Download className="h-4 w-4" />
          Download Android App (.apk)
        </a>
      </div>

      {/* Install instructions + iOS note */}
      <div className="relative z-10 mt-3.5 pt-3 border-t border-white/15 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-blue-100/80">
          <button
            type="button"
            onClick={() => setShowHelp((s) => !s)}
            className="inline-flex items-center gap-1.5 font-bold text-emerald-300 hover:text-emerald-200 transition"
          >
            <Info className="h-3.5 w-3.5" />
            How to install on Android
            {showHelp ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
          <span className="text-blue-200/75">
            Using iPhone? Tap <strong>Share → Add to Home Screen</strong> in Safari.
          </span>
        </div>

        {showHelp && (
          <p className="rounded-xl bg-white/10 border border-white/15 px-3.5 py-2 text-xs text-blue-50/90 leading-relaxed">
            On Android, tap the downloaded <strong className="font-mono">MonteEvents.apk</strong> file and allow{' '}
            <strong>&ldquo;Install from this source&rdquo;</strong> if prompted.
          </p>
        )}
      </div>
    </div>
  );
};
