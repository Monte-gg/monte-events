import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.monteevents.app',
  appName: 'Monte Events',
  webDir: 'docs',
  backgroundColor: '#0B1220',
  server: {
    androidScheme: 'https',
    allowNavigation: [
      'monte-events.onrender.com',
      'ibktiagimozgdixoepoq.supabase.co',
      '*.supabase.co',
    ],
  },
  android: {
    backgroundColor: '#0B1220',
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#0B1220',
      showSpinner: false,
    },
  },
};

export default config;
