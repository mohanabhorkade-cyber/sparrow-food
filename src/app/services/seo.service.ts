import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { Title, Meta, MetaDefinition } from '@angular/platform-browser';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { DOCUMENT } from '@angular/common';

export interface SeoData {
  title?: string;
  description?: string;
  keywords?: string;
  author?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  siteName?: string;
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  canonicalUrl?: string;
  structuredData?: any;
  breadcrumb?: Array<{ name: string; url: string }>;
}

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private isBrowser: boolean;
  private isServer: boolean;

  constructor(
    private titleService: Title,
    private metaService: Meta,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.isServer = isPlatformServer(this.platformId);
  }

  /**
   * Update all SEO meta tags dynamically
   */
  updateSeo(data: SeoData): void {
    // Set page title
    if (data.title) {
      this.titleService.setTitle(data.title);
    }

    // Basic meta tags
    const metaTags: MetaDefinition[] = [];

    if (data.description) {
      metaTags.push({ name: 'description', content: data.description });
    }

    if (data.keywords) {
      metaTags.push({ name: 'keywords', content: data.keywords });
    }

    if (data.author) {
      metaTags.push({ name: 'author', content: data.author });
    }

    // Open Graph tags
    if (data.title) {
      metaTags.push({ property: 'og:title', content: data.title });
    }

    if (data.description) {
      metaTags.push({ property: 'og:description', content: data.description });
    }

    if (data.image) {
      metaTags.push({ property: 'og:image', content: data.image });
      metaTags.push({ property: 'og:image:width', content: '1200' });
      metaTags.push({ property: 'og:image:height', content: '630' });
    }

    if (data.url) {
      metaTags.push({ property: 'og:url', content: data.url });
    }

    metaTags.push({ property: 'og:type', content: data.type || 'website' });
    metaTags.push({ property: 'og:site_name', content: data.siteName || 'Sparrow Food' });

    // Twitter Card tags
    metaTags.push({ name: 'twitter:card', content: data.twitterCard || 'summary_large_image' });

    if (data.title) {
      metaTags.push({ name: 'twitter:title', content: data.title });
    }

    if (data.description) {
      metaTags.push({ name: 'twitter:description', content: data.description });
    }

    if (data.image) {
      metaTags.push({ name: 'twitter:image', content: data.image });
    }

    // Viewport (ensure it's set)
    metaTags.push({ name: 'viewport', content: 'width=device-width, initial-scale=1' });

    // Update all meta tags
    this.metaService.addTags(metaTags);

    // Add canonical URL
    if (data.canonicalUrl) {
      this.setCanonicalUrl(data.canonicalUrl);
    }

    // Add structured data
    if (data.structuredData) {
      this.addStructuredData(data.structuredData);
    }

    // Add breadcrumb structured data
    if (data.breadcrumb && data.breadcrumb.length > 0) {
      this.addBreadcrumbStructuredData(data.breadcrumb);
    }
  }

  /**
   * Set canonical URL to prevent duplicate content
   */
  setCanonicalUrl(url: string): void {
    this.removeCanonicalUrl();

    const canonicalLink = this.document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    canonicalLink.setAttribute('href', url);
    this.document.head.appendChild(canonicalLink);
  }

  /**
   * Remove existing canonical URL
   */
  removeCanonicalUrl(): void {
    const canonicalLinks = this.document.head.querySelectorAll('link[rel="canonical"]');
    canonicalLinks.forEach(link => link.remove());
  }

  /**
   * Add JSON-LD structured data
   */
  addStructuredData(data: any): void {
    this.removeStructuredData();

    const script = this.document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(data);
    this.document.head.appendChild(script);
  }

  /**
   * Remove existing structured data
   */
  removeStructuredData(): void {
    const structuredDataScripts = this.document.head.querySelectorAll('script[type="application/ld+json"]');
    structuredDataScripts.forEach(script => script.remove());
  }

  /**
   * Add breadcrumb structured data
   */
  addBreadcrumbStructuredData(breadcrumbs: Array<{ name: string; url: string }>): void {
    const breadcrumbData = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: crumb.url
      }))
    };

    this.addStructuredData(breadcrumbData);
  }

  /**
   * Generate organization structured data for Sparrow Food
   */
  getOrganizationStructuredData(): any {
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Sparrow Food',
      description: 'Premium food ingredients and seasonings supplier',
      url: 'https://sparrowfood.com',
      logo: 'https://sparrowfood.com/assets/images/optimized/logo1.webp',
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+1-XXX-XXX-XXXX',
        contactType: 'customer service',
        availableLanguage: 'English'
      },
      sameAs: [
        'https://www.facebook.com/sparrowfood',
        'https://www.instagram.com/sparrowfood',
        'https://www.linkedin.com/company/sparrowfood'
      ]
    };
  }

  /**
   * Generate product structured data
   */
  getProductStructuredData(product: any): any {
    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.description || `${product.name} - Premium food ingredient from Sparrow Food`,
      image: product.image,
      brand: {
        '@type': 'Brand',
        name: product.brand || 'Sparrow Food'
      },
      offers: {
        '@type': 'Offer',
        price: product.price || 'Contact for pricing',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        seller: {
          '@type': 'Organization',
          name: 'Sparrow Food'
        }
      },
      category: product.category,
      additionalProperty: [
        {
          '@type': 'PropertyValue',
          name: 'Pack Size',
          value: product.packSize
        },
        {
          '@type': 'PropertyValue',
          name: 'Shelf Life',
          value: product.shelfLife
        },
        {
          '@type': 'PropertyValue',
          name: 'MOQ',
          value: product.moq
        }
      ]
    };
  }

  /**
   * Generate FAQ structured data
   */
  getFaqStructuredData(faqs: Array<{ question: string; answer: string }>): any {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer
        }
      }))
    };
  }

  /**
   * Update meta tags on route change
   */
  updateRouteSeo(routeData: { title?: string; meta?: any[] }): void {
    if (routeData.title) {
      this.titleService.setTitle(routeData.title);
    }

    if (routeData.meta) {
      this.metaService.addTags(routeData.meta);
    }
  }
}
