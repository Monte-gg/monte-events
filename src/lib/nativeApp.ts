import { Capacitor } from '@capacitor/core';

/**
 * Returns true when running inside the installed native Android/iOS Capacitor app.
 * Returns false in regular desktop or mobile web browsers.
 */
export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}
