import { CommonModule } from '@angular/common';
import { Component, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { EmailService } from '../services/email.service';

@Component({
  selector: 'app-footer',
  standalone: true,   // ✅ mark as standalone
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FooterComponent implements OnDestroy {
  email: string = '';
  isLoading: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';
  private destroy$ = new Subject<void>();
  private successTimer: any;

  constructor(private emailService: EmailService, private cdr: ChangeDetectorRef) {}

  ngOnDestroy(): void {
    this.clearSuccessTimer();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private clearSuccessTimer() {
    if (this.successTimer) {
      clearTimeout(this.successTimer);
      this.successTimer = null;
    }
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  sendPriceList() {
    if (!this.email || !this.email.includes('@')) {
      this.errorMessage = 'Please enter a valid email address';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.emailService.sendPriceList(this.email).pipe(takeUntil(this.destroy$)).subscribe(
      (response) => {
        this.successMessage = 'Price list request received! A confirmation has been sent to your email.';
        this.email = '';
        this.isLoading = false;
        this.clearSuccessTimer();
        this.successTimer = setTimeout(() => { 
          this.successMessage = ''; 
          this.cdr.markForCheck();
        }, 5000);
        this.cdr.markForCheck();
      },
      (error) => {
        this.errorMessage = 'Failed to send price list. Please try again.';
        this.isLoading = false;
        this.cdr.markForCheck();
        console.error('Email error:', error);
      }
    );
  }
}
