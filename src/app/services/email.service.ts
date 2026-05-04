import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { timeout, catchError, switchMap } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  private apiUrl = environment.apiUrl + '/email';
  private baseUrl = environment.apiUrl.replace('/api', '');

  constructor(private http: HttpClient) {}

  private wakeUp(): Observable<any> {
    return this.http.get(`${this.baseUrl}/health`).pipe(
      catchError(() => of(null)) // silently ignore errors, just proceed
    );
  }

  sendPriceList(email: string): Observable<any> {
    return this.wakeUp().pipe(
      switchMap(() =>
        this.http.post(`${this.apiUrl}/send-price-list`, { email }).pipe(
          timeout(60000),
          catchError(err => {
            if (err.name === 'TimeoutError') {
              return throwError(() => ({
                error: { error: 'Request timed out. Please try again.' }
              }));
            }
            return throwError(() => err);
          })
        )
      )
    );
  }

  sendContactEmail(data: any): Observable<any> {
    return this.wakeUp().pipe(
      switchMap(() =>
        this.http.post(`${this.apiUrl}/send-contact`, data).pipe(
          timeout(60000),
          catchError(err => {
            if (err.name === 'TimeoutError') {
              return throwError(() => ({
                error: { error: 'Request timed out. Please try again.' }
              }));
            }
            return throwError(() => err);
          })
        )
      )
    );
  }

  sendInquiryEmail(data: any): Observable<any> {
    return this.wakeUp().pipe(
      switchMap(() =>
        this.http.post(`${this.apiUrl}/send-inquiry`, data).pipe(
          timeout(60000),
          catchError(err => {
            if (err.name === 'TimeoutError') {
              return throwError(() => ({
                error: { error: 'Request timed out. Please try again.' }
              }));
            }
            return throwError(() => err);
          })
        )
      )
    );
  }
}