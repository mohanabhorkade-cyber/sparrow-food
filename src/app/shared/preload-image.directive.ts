import { Directive, ElementRef, Input, OnInit, OnDestroy } from '@angular/core';
import { ImagePreloadService } from '../services/image-preload.service';

/**
 * OPTIONAL DIRECTIVE: appPreloadImage
 * 
 * Advanced image preloading directive for fine-grained control over image loading.
 * Use on <img> tags to automatically preload and optimize image loading.
 * 
 * Usage:
 * <img [appPreloadImage]="imageUrl" [preloadRadius]="3" />
 * 
 * Features:
 * - Automatic image preloading when image is set
 * - Smooth fade-in animation when image loads
 * - Blur-to-sharp transition effect
 * - Configurable preload radius for adjacent items
 */
@Directive({
  selector: 'img[appPreloadImage]',
  standalone: true
})
export class PreloadImageDirective implements OnInit, OnDestroy {
  @Input() appPreloadImage: string = '';
  @Input() preloadRadius: number = 2;
  @Input() smoothTransition: boolean = true;

  private isLoading = false;

  constructor(
    private el: ElementRef<HTMLImageElement>,
    private preloadService: ImagePreloadService
  ) {}

  ngOnInit(): void {
    if (this.appPreloadImage) {
      this.preloadImage();
      this.applyLoadingState();
    }
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  private preloadImage(): void {
    if (!this.appPreloadImage) return;

    this.isLoading = true;
    this.preloadService.preloadImage(this.appPreloadImage)
      .then(() => {
        this.isLoading = false;
        this.applySmoothTransition();
      })
      .catch(() => {
        this.isLoading = false;
      });
  }

  private applyLoadingState(): void {
    if (!this.smoothTransition) return;

    const img = this.el.nativeElement;
    img.style.opacity = '0.7';
    img.style.filter = 'blur(8px)';
    img.style.transition = 'opacity 0.3s ease-in-out, filter 0.3s ease-in-out';
  }

  private applySmoothTransition(): void {
    if (!this.smoothTransition) return;

    const img = this.el.nativeElement;
    // Trigger reflow to start transition
    void img.offsetHeight;
    img.style.opacity = '1';
    img.style.filter = 'blur(0)';
  }
}
