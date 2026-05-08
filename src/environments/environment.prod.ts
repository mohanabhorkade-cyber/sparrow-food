const browserOrigin = typeof window !== 'undefined' ? window.location.origin : '';

export const environment = {
  production: true,
  // Set the API URL explicitly when using a separate backend host.
  // For same-origin hosting, this will use the current site origin.
  apiUrl: browserOrigin ? `${browserOrigin}/api` : 'https://sparrow-food-backend-production.up.railway.app/api',
  appName: 'Sparrow Food',
  version: '1.0.0',
  sentryDsn: '' // Replace with actual Sentry DSN
};
