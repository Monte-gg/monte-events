export const APP_VERSION = '1.4.1';
export const ANDROID_APK_URL =
  'https://github.com/Monte-gg/monte-events/releases/latest/download/MonteEvents.apk';

export interface AppUpdateInfo {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  releaseUrl: string;
  downloadUrl: string;
  releaseNotes: string;
}

function parseSemver(v: string): [number, number, number] {
  const clean = String(v || '0.0.0').replace(/^v/i, '').trim();
  const parts = clean.split('.').map((p) => Number.parseInt(p, 10) || 0);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

export function isNewerVersion(latest: string, current: string): boolean {
  const [lMaj, lMin, lPat] = parseSemver(latest);
  const [cMaj, cMin, cPat] = parseSemver(current);
  if (lMaj !== cMaj) return lMaj > cMaj;
  if (lMin !== cMin) return lMin > cMin;
  return lPat > cPat;
}

export async function checkForAppUpdate(): Promise<AppUpdateInfo> {
  const fallback: AppUpdateInfo = {
    currentVersion: APP_VERSION,
    latestVersion: APP_VERSION,
    hasUpdate: false,
    releaseUrl: 'https://github.com/Monte-gg/monte-events/releases/latest',
    downloadUrl: ANDROID_APK_URL,
    releaseNotes: '',
  };

  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 6000);
    const res = await fetch(
      `https://api.github.com/repos/Monte-gg/monte-events/releases/latest?t=${Date.now()}`,
      {
        signal: controller.signal,
        cache: 'no-store',
        headers: { Accept: 'application/vnd.github+json' },
      }
    );
    window.clearTimeout(timer);
    if (!res.ok) return fallback;

    const data = (await res.json()) as {
      tag_name?: string;
      html_url?: string;
      body?: string;
      assets?: { name?: string; browser_download_url?: string }[];
    };

    const latestTag = (data.tag_name || APP_VERSION).replace(/^v/i, '');
    const apkAsset = (data.assets || []).find((a) =>
      String(a.name || '').toLowerCase().endsWith('.apk')
    );

    return {
      currentVersion: APP_VERSION,
      latestVersion: latestTag,
      hasUpdate: isNewerVersion(latestTag, APP_VERSION),
      releaseUrl: data.html_url || fallback.releaseUrl,
      downloadUrl: apkAsset?.browser_download_url || ANDROID_APK_URL,
      releaseNotes: (data.body || '').slice(0, 260),
    };
  } catch {
    return fallback;
  }
}
