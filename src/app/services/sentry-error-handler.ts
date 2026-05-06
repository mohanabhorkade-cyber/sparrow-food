import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { environment } from '../../environments/environment';

// Initialize Sentry conditionally
let Sentry: any = null;
try {
  // Dynamic import to avoid build issues if Sentry is not available
  const sentryModule = require("@sentry/angular");
  Sentry = sentryModule;

  Sentry.init({
    dsn: environment.sentryDsn || '',
    environment: environment.production ? 'production' : 'development',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: environment.production ? 0.1 : 1.0,
    // Session Replay
    replaysSessionSampleRate: environment.production ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,
    // Release tracking
    release: environment.version,
    // Ignore certain errors
    beforeSend(event: any, hint: any) {
      // Ignore network errors and 4xx client errors
      if (event.exception) {
        const error = hint.originalException;
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as any).status;
          if (status >= 400 && status < 500) {
            return null; // Don't send client errors to Sentry
          }
        }
      }
      return event;
    }
  });
} catch (error: any) {
  console.warn('Sentry not available:', error?.message || error);
}

@Injectable()
export class SentryErrorHandler implements ErrorHandler {
  constructor(private injector: Injector) {}

  handleError(error: any): void {
    if (Sentry) {
      const eventId = Sentry.captureException(error.originalError || error);

      // Log to console in development
      if (!environment.production) {
        console.error('Error captured by Sentry:', error);
        console.error('Sentry Event ID:', eventId);
      }
    } else {
      // Fallback to console logging
      console.error('Error (Sentry not available):', error);
    }

    // You can also show user-friendly error messages here
    // This depends on your error handling strategy
  }
}
