import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  private apiUrl = environment.apiUrl + '/email';

  constructor(private http: HttpClient) { }

  sendPriceList(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/send-price-list`, { email });
  }

  sendContactEmail(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/send-contact`, data);
  }

  sendInquiryEmail(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/send-inquiry`, data);
  }
}
