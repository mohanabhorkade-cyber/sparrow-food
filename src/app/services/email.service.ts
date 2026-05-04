import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, from, Observable, switchMap, throwError, timeout } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EmailService {
private apiUrl = environment.apiUrl + '/email';
  constructor(private http: HttpClient) { }
   // Wake up Render backend before sending
  private wakeUp(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/health`).pipe(
      timeout(60000),
      catchError(() => from([null])) // ignore wake-up errors
    );
  }
   private withTimeout(request: Observable<any>): Observable<any> {
    return request.pipe(
      timeout(60000),
      catchError(err => {
        if (err.name === 'TimeoutError') {
          return throwError(() => ({
            error: { error: 'Request timed out. Server is starting up, please try again in 30 seconds.' }
          }));
        }
        return throwError(() => err);
      })
    );
  }

   sendPriceList(email: string): Observable<any> {
    return this.wakeUp().pipe(
      switchMap(() => this.withTimeout(
        this.http.post(`${this.apiUrl}/send-price-list`, { email })
      ))
    );
  }

  sendContactEmail(data: any): Observable<any> {
    return this.wakeUp().pipe(
      switchMap(() => this.withTimeout(
        this.http.post(`${this.apiUrl}/send-contact`, data)
      ))
    );
  }

  sendInquiryEmail(data: any): Observable<any> {
    return this.wakeUp().pipe(
      switchMap(() => this.withTimeout(
        this.http.post(`${this.apiUrl}/send-inquiry`, data)
      ))
    );
  }
}
