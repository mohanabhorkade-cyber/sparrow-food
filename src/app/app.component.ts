import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './footer/footer.component';
import { SeoService } from './services/seo.service';
import { LoadingService } from './services/loading.service';
import { filter, takeUntil } from 'rxjs/operators';
import { Observable, Subject } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, FooterComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'sparrow-food';
  currentBreadcrumbs: Array<{ label: string; url?: string; active?: boolean }> = [];
  private destroy$ = new Subject<void>();
  isLoading$: Observable<boolean>;

  constructor(
    private router: Router,
    private seoService: SeoService,
    private loadingService: LoadingService
  ) {
    this.isLoading$ = this.loadingService.isLoading$;
  }

  ngOnInit(): void {
    // Set default SEO data for the application
    this.seoService.updateSeo({
      title: 'Sparrow Food - Premium Food Ingredients & Seasonings',
      description: 'Leading supplier of premium food ingredients, seasonings, and flavorings. Quality products for food manufacturers and culinary professionals.',
      keywords: 'food ingredients, seasonings, flavorings, spices, food manufacturing, culinary supplies',
      author: 'Sparrow Food',
      image: 'https://sparrowfood.com/assets/images/og-image.jpg',
      url: 'https://sparrowfood.com',
      siteName: 'Sparrow Food',
      canonicalUrl: 'https://sparrowfood.com',
      structuredData: this.seoService.getOrganizationStructuredData()
    });

    // Update SEO on route changes
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationEnd) => {
        this.updateSeoForRoute(event.url);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateSeoForRoute(url: string): void {
    // Normalize URL by removing trailing slash for matching
    const normalizedUrl = url.replace(/\/$/, '') || '/';
    
    // Default SEO updates based on route
    const routeConfig: { [key: string]: { seo: Partial<import('./services/seo.service').SeoData>, breadcrumbs: Array<{ label: string; url?: string; active?: boolean }> } } = {
      '/': {
        seo: {
          title: 'Sparrow Food - Premium Food Ingredients & Seasonings',
          description: 'Leading supplier of premium food ingredients, seasonings, and flavorings. Quality products for food manufacturers and culinary professionals.',
          canonicalUrl: 'https://sparrowfood.com'
        },
        breadcrumbs: [{ label: 'Home', active: true }]
      },
      '/about': {
        seo: {
          title: 'About Us - Sparrow Food | Premium Food Ingredients Supplier',
          description: 'Learn about Sparrow Food, your trusted partner for premium food ingredients and seasonings. Quality products and exceptional service since our founding.',
          canonicalUrl: 'https://sparrowfood.com/about'
        },
        breadcrumbs: [
          { label: 'Home', url: '/' },
          { label: 'About Us', active: true }
        ]
      },
      '/products': {
        seo: {
          title: 'Products - Sparrow Food | Food Ingredients & Seasonings',
          description: 'Explore our comprehensive range of premium food ingredients, seasonings, and flavorings. Perfect for food manufacturers and culinary professionals.',
          canonicalUrl: 'https://sparrowfood.com/products'
        },
        breadcrumbs: [
          { label: 'Home', url: '/' },
          { label: 'Products', active: true }
        ]
      },
      '/contact': {
        seo: {
          title: 'Contact Us - Sparrow Food | Get In Touch',
          description: 'Contact Sparrow Food for premium food ingredients and seasonings. Get pricing, place orders, or ask questions about our products.',
          canonicalUrl: 'https://sparrowfood.com/contact'
        },
        breadcrumbs: [
          { label: 'Home', url: '/' },
          { label: 'Contact', active: true }
        ]
      },
      '/flavors': {
        seo: {
          title: 'Flavorings - Sparrow Food | Premium Food Flavorings',
          description: 'Discover our range of premium flavorings and food additives. Enhance your products with our high-quality flavor solutions.',
          canonicalUrl: 'https://sparrowfood.com/flavors'
        },
        breadcrumbs: [
          { label: 'Home', url: '/' },
          { label: 'Flavors', active: true }
        ]
      },
      '/seasonings': {
        seo: {
          title: 'Seasonings - Sparrow Food | Premium Food Seasonings',
          description: 'Explore our premium seasonings and spice blends. Perfect for food manufacturers looking to enhance flavor profiles.',
          canonicalUrl: 'https://sparrowfood.com/seasonings'
        },
        breadcrumbs: [
          { label: 'Home', url: '/' },
          { label: 'Seasonings', active: true }
        ]
      }
    };

    const config = routeConfig[normalizedUrl];
    if (config) {
      this.seoService.updateSeo({
        ...config.seo,
        url: `https://sparrowfood.com${url}`,
        image: 'https://sparrowfood.com/assets/images/og-image.jpg',
        breadcrumb: config.breadcrumbs.map(crumb => ({
          name: crumb.label,
          url: crumb.url ? `https://sparrowfood.com${crumb.url}` : undefined
        }))
      } as any);

      this.currentBreadcrumbs = config.breadcrumbs;
    }
  }
}
