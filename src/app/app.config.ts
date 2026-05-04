import { ApplicationConfig, provideZoneChangeDetection, ErrorHandler } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withEnabledBlockingInitialNavigation } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { SentryErrorHandler } from './services/sentry-error-handler';
import { httpErrorInterceptor } from './services/http-error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withEnabledBlockingInitialNavigation()),
    provideHttpClient(
      withInterceptors([httpErrorInterceptor])
    ),
    provideClientHydration(withEventReplay()),
    { provide: ErrorHandler, useClass: SentryErrorHandler }
  ]
};
