import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { LazyImageDirective } from '../../shared/lazy-image.directive';

interface Product {
  name: string;
  category: string;
  subItem: string;
  brand: string;
  packSize: string;
  shelfLife: string;
  moq: string;
  freight: string;
  image: string;
}

@Component({
  selector: 'app-flavor',
  standalone: true,
  imports: [CommonModule, HttpClientModule, LazyImageDirective],
  templateUrl: './flavor.component.html',
  styleUrl: './flavor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FlavorComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  private destroy$ = new Subject<void>();

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.http
      .get<Product[]>('assets/data/products.json')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.products = data.filter((product) => product.category === 'flavors');
          this.cdr.markForCheck();
        },
        error: (err) => console.error('Failed to load flavors:', err)
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackByProduct(index: number, product: Product): string {
    return product.name || index.toString();
  }
}
