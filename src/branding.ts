export const BRANDING = {
  appName: import.meta.env.VITE_APP_NAME || 'PulseHQ',
  tagline:
    import.meta.env.VITE_APP_TAGLINE ||
    'Intelligent lead discovery and outreach',
  logoUrl: import.meta.env.VITE_APP_LOGO_URL || '/pulsehq-logo.svg',
  websiteUrl:
    import.meta.env.VITE_APP_WEBSITE ||
    'https://github.com/zmoinnovations/PulseHQ',
  footerText:
    import.meta.env.VITE_APP_FOOTER_TEXT || 'PulseHQ',
  versionLabel: import.meta.env.VITE_APP_VERSION || 'v1.0.0',
};
