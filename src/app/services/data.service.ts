import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, tap, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private categoriesCache: Observable<any> | null = null;
  private subItemDataCache: Observable<any> | null = null;
  private productsCache: Observable<any> | null = null;

  constructor(private http: HttpClient) {}

  getCategories(): Observable<any> {
    if (!this.categoriesCache) {
      this.categoriesCache = this.http.get<any>('assets/data/categories.json').pipe(
        shareReplay(1),
        catchError(err => {
          console.error('Failed to load categories:', err);
          this.categoriesCache = null;
          return of([]);
        })
      );
    }
    return this.categoriesCache;
  }

  getSubItemData(): Observable<any> {
    if (!this.subItemDataCache) {
      this.subItemDataCache = this.http.get<any>('assets/data/subItemData.json').pipe(
        shareReplay(1),
        catchError(err => {
          console.error('Failed to load subItemData:', err);
          this.subItemDataCache = null;
          return of({});
        })
      );
    }
    return this.subItemDataCache;
  }

  getProducts(): Observable<any> {
    if (!this.productsCache) {
      this.productsCache = this.http.get<any>('assets/data/products.json').pipe(
        shareReplay(1),
        catchError(err => {
          console.error('Failed to load products:', err);
          this.productsCache = null;
          return of([]);
        })
      );
    }
    return this.productsCache;
  }

  clearCache(): void {
    this.categoriesCache = null;
    this.subItemDataCache = null;
    this.productsCache = null;
  }
}
