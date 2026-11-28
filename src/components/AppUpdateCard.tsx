import React, { useState } from 'react';
import { CheckCircle2, Download, RefreshCw, Sparkles } from 'lucide-react';
import { APP_VERSION, AppUpdateInfo } from '../lib/appVersion';
import { isNativeApp } from '../lib/nativeApp';

interface AppUpdateCardProps {
  updateInfo: AppUpdateInfo | null;
  onCheckUpdate: () => Promise<void>;
  showWhenUpToDate?: boolean;
}

export const AppUpdateCard: React.FC<AppUpdateCardProps> = ({
  updateInfo,
  onCheckUpdate,
  showWhenUpToDate = false,
}) => {
  const [checking, setChecking] = useState(false);

  const hasUpdate = Boolean(updateInfo?.hasUpdate);

  if (!hasUpdate && !showWhenUpToDate) {
    return null;
  }

  const handleCheck = async () => {
    setChecking(true);
    await onCheckUpdate();
    setChecking(false);
  };

  if (hasUpdate && updateInfo) {
    const native = isNativeApp();
    return (
      <div className="relative overflow-hidden rounded-3xl border border-[#2563EB]/50 bg-gradient-to-r from-[#0B2E8F] via-[#1A6BFF] to-[#2563EB] p-4 sm:p-5 text-white shadow-monte">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div className="flex items-start gap-3 min-w-0">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
              <Sparkles className="h-5 w-5 text-white" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-extrabold">
                  New Monte Events Update Available!
                </h3>
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-extrabold">
                  v{updateInfo.currentVersion} → v{updateInfo.latestVersion}
                </span>
              </div>
              <p className="text-xs text-white/90 mt-0.5">
                {native
                  ? 'Download and install the latest Android APK to get new features, permissions, and fixes.'
                  : 'A newer version of Monte Events is live! Refresh or download the latest Android APK.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            {native ? (
              <a
                href={updateInfo.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-[#0B2E8F] hover:bg-[#F0F6FF] px-4 py-2.5 text-xs sm:text-sm font-extrabold shadow-md transition active:scale-95"
              >
                <Download className="h-4 w-4" />
                Update App (v{updateInfo.latestVersion})
              </a>
            ) : (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-[#0B2E8F] hover:bg-[#F0F6FF] px-4 py-2.5 text-xs sm:text-sm font-extrabold shadow-md transition active:scale-95"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh to Update
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Up-to-date status card (shown in Profile -> Settings)
  return (
    <div className="rounded-3xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-white dark:bg-[#13224A] p-4 sm:p-5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-extrabold text-[#0A1E5C] dark:text-white">
            App Version v{APP_VERSION}
          </h3>
          <p className="text-xs text-[#0A1E5C]/65 dark:text-white/65">
            You&apos;re running the latest Monte Events build.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleCheck}
        disabled={checking}
        className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/35 bg-[#F0F6FF] dark:bg-[#0B1A3A] hover:border-[#1A6BFF] px-3.5 py-2 text-xs font-extrabold text-[#0A1E5C] dark:text-white transition"
      >
        <RefreshCw className={`h-3.5 w-3.5 text-[#1A6BFF] ${checking ? 'animate-spin' : ''}`} />
        {checking ? 'Checking…' : 'Check for Updates'}
      </button>
    </div>
  );
};
