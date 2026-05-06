import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, retry } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    retry(2), // Retry failed requests up to 2 times
    catchError((error: any) => {
      let errorMessage = '';

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = `Client Error: ${error.error.message}`;
      } else {
        // Backend error
        switch (error.status) {
          case 400:
            errorMessage = error.error?.error || 'Bad request - please check your input';
            break;
          case 401:
            errorMessage = 'Unauthorized - please check your credentials';
            break;
          case 403:
            errorMessage = 'Access forbidden';
            break;
          case 404:
            errorMessage = 'Service not found';
            break;
          case 429:
            errorMessage = 'Too many requests - please try again later';
            break;
          case 500:
            errorMessage = 'Server error - please try again later';
            break;
          case 503:
            errorMessage = 'Service temporarily unavailable - please try again later';
            break;
          default:
            errorMessage = `Error: ${error.message}`;
        }
      }

      // Log error for debugging (in development)
      console.error('HTTP Error:', {
        status: error.status,
        message: errorMessage,
        url: error.url,
        timestamp: new Date().toISOString()
      });

      return throwError(() => ({
        message: errorMessage,
        status: error.status,
        originalError: error
      }));
    })
  );
};
