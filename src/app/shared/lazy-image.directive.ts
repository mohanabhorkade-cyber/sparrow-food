import { Directive, ElementRef, Input, OnInit, OnDestroy, Renderer2, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
  selector: '[appLazyImage]'
})
export class LazyImageDirective implements OnInit, OnDestroy {
  @Input() src!: string;
  @Input() alt: string = '';
  @Input() loading: 'lazy' | 'eager' | 'auto' = 'lazy';
  @Input() fetchpriority: 'high' | 'low' | 'auto' = 'auto';

  private observer: IntersectionObserver | null = null;
  private isBrowser: boolean;

  constructor(
    private el: ElementRef, 
    private renderer: Renderer2,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    if (!this.src) {
      return;
    }

    if (this.isBrowser && this.loading === 'lazy') {
      this.setupIntersectionObserver();
    } else {
      this.loadImage();
    }
  }

  ngOnDestroy() {
    this.disconnectObserver();
  }

  private setupIntersectionObserver() {
    if (!this.isBrowser) return;

    try {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              this.loadImage();
              this.disconnectObserver();
            }
          });
        },
        { rootMargin: '50px 0px', threshold: 0.01 }
      );
      this.observer.observe(this.el.nativeElement);
    } catch {
      // Fallback for browsers without IntersectionObserver
      this.loadImage();
    }
  }

  private disconnectObserver() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  private loadImage() {
    if (!this.src) {
      return;
    }

    this.renderer.setAttribute(this.el.nativeElement, 'src', this.src);
    this.renderer.setAttribute(this.el.nativeElement, 'loading', this.loading);
    this.renderer.setAttribute(this.el.nativeElement, 'fetchpriority', this.fetchpriority);
    this.renderer.setAttribute(this.el.nativeElement, 'decoding', 'async');
    
    if (this.alt) {
      this.renderer.setAttribute(this.el.nativeElement, 'alt', this.alt);
    }
  }
}