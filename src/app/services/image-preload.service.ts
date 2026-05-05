import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

interface PreloadedImage {
  url: string;
  blob?: Blob;
  dataUrl?: string;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class ImagePreloadService {
  private imageCache = new Map<string, PreloadedImage>();
  private preloadingProgress$ = new BehaviorSubject<number>(0);
  private readonly MAX_CACHE_SIZE = 100; // Maximum images to keep in memory
  private readonly PRELOAD_TIMEOUT = 15000; // 15 seconds timeout per image
  private activePreloads = new Set<string>();

  constructor() {
    this.initializeBrowserCache();
  }

  /**
   * Initialize browser disk cache by preloading images
   * This ensures consistent URLs for browser caching
   */
  private initializeBrowserCache(): void {
    // Browser automatically caches images with consistent URLs
    // No query params = better caching
  }

  /**
   * Preload a single image and store in memory
   */
  preloadImage(imageUrl: string): Promise<void> {
    // Normalize URL to prevent duplicates
    const normalizedUrl = this.normalizeUrl(imageUrl);

    // Return immediately if already cached
    if (this.imageCache.has(normalizedUrl)) {
      return Promise.resolve();
    }

    // Return immediately if already preloading
    if (this.activePreloads.has(normalizedUrl)) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.activePreloads.add(normalizedUrl);

      const img = new Image();
      const timeoutId = setTimeout(() => {
        img.onload = img.onerror = null;
        this.activePreloads.delete(normalizedUrl);
        resolve();
      }, this.PRELOAD_TIMEOUT);

      img.onload = () => {
        clearTimeout(timeoutId);
        // Store in cache with timestamp
        this.imageCache.set(normalizedUrl, {
          url: normalizedUrl,
          timestamp: Date.now()
        });
        this.activePreloads.delete(normalizedUrl);
        this.enforceMaxCacheSize();
        resolve();
      };

      img.onerror = () => {
        clearTimeout(timeoutId);
        this.activePreloads.delete(normalizedUrl);
        resolve(); // Resolve even on error to not block other preloads
      };

      // Use crossOrigin for proper CORS handling
      img.crossOrigin = 'anonymous';
      img.src = normalizedUrl;
    });
  }

  /**
   * Preload multiple images in parallel
   */
  preloadImages(imageUrls: string[]): Promise<void[]> {
    return Promise.all(imageUrls.map(url => this.preloadImage(url)));
  }

  /**
   * Smart preload: preload all images initially, then smart load next/prev
   */
  async preloadAllProductImages(products: any[], smartPreloadCount: number = 3): Promise<void> {
    // Extract unique image URLs from products
    const imageUrls = this.extractUniqueImages(products);

    // Split into batches
    const batchSize = 5;
    for (let i = 0; i < imageUrls.length; i += batchSize) {
      const batch = imageUrls.slice(i, i + batchSize);
      await this.preloadImages(batch);

      // Update progress
      const progress = Math.min(100, ((i + batchSize) / imageUrls.length) * 100);
      this.preloadingProgress$.next(Math.round(progress));
    }

    this.preloadingProgress$.next(100);
  }

  /**
   * Smart preload next and previous images around current index
   */
  async smartPreloadAround(products: any[], currentIndex: number, range: number = 2): Promise<void> {
    const urls: string[] = [];

    // Preload next items
    for (let i = 1; i <= range; i++) {
      const nextIndex = currentIndex + i;
      if (nextIndex < products.length && products[nextIndex].image) {
        urls.push(products[nextIndex].image);
      }
    }

    // Preload previous items
    for (let i = 1; i <= range; i++) {
      const prevIndex = currentIndex - i;
      if (prevIndex >= 0 && products[prevIndex].image) {
        urls.push(products[prevIndex].image);
      }
    }

    // Preload in background without blocking
    this.preloadImages(urls).catch(() => {
      // Silently handle errors
    });
  }

  /**
   * Check if image is cached
   */
  isCached(imageUrl: string): boolean {
    return this.imageCache.has(this.normalizeUrl(imageUrl));
  }

  /**
   * Get cached image data URL (for optimization purposes)
   */
  getCachedImageUrl(imageUrl: string): string | null {
    const normalized = this.normalizeUrl(imageUrl);
    const cached = this.imageCache.get(normalized);
    return cached?.dataUrl || null;
  }

  /**
   * Get preloading progress
   */
  getPreloadingProgress(): Observable<number> {
    return this.preloadingProgress$.asObservable();
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.imageCache.clear();
    this.activePreloads.clear();
    this.preloadingProgress$.next(0);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; urls: string[] } {
    return {
      size: this.imageCache.size,
      urls: Array.from(this.imageCache.keys())
    };
  }

  /**
   * Normalize URL to prevent duplicates and ensure consistent caching
   */
  private normalizeUrl(imageUrl: string): string {
    // Remove query parameters that might be added
    let url = imageUrl.split('?')[0].trim();

    // Convert to webp if not already
    url = url.replace(/\.(jpg|jpeg|png|gif)$/i, '.webp');

    return url;
  }

  /**
   * Extract unique image URLs from products
   */
  private extractUniqueImages(products: any[]): string[] {
    const uniqueUrls = new Set<string>();

    products.forEach(product => {
      if (product.image) {
        const normalized = this.normalizeUrl(product.image);
        uniqueUrls.add(normalized);
      }
    });

    return Array.from(uniqueUrls);
  }

  /**
   * Enforce max cache size by removing oldest entries
   */
  private enforceMaxCacheSize(): void {
    if (this.imageCache.size > this.MAX_CACHE_SIZE) {
      // Find oldest entry by timestamp
      let oldestKey: string | null = null;
      let oldestTime = Infinity;

      for (const [key, value] of this.imageCache.entries()) {
        if (value.timestamp < oldestTime) {
          oldestTime = value.timestamp;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        this.imageCache.delete(oldestKey);
      }
    }
  }

  /**
   * Prefetch image using fetch API for optimal browser caching
   * This ensures the image is fetched and cached by the browser
   */
  prefetchViaFetch(imageUrl: string): Promise<void> {
    const normalizedUrl = this.normalizeUrl(imageUrl);

    return fetch(normalizedUrl, {
      method: 'GET',
      mode: 'cors',
      cache: 'force-cache'
    })
      .then(() => {
        this.imageCache.set(normalizedUrl, {
          url: normalizedUrl,
          timestamp: Date.now()
        });
        this.enforceMaxCacheSize();
      })
      .catch(() => {
        // Silently handle fetch errors
      });
  }
}
