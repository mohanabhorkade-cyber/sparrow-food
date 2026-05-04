import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { EmailService } from '../../services/email.service';

@Component({
  selector: 'app-contact',
  imports: [CommonModule, HttpClientModule, ReactiveFormsModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactComponent implements OnInit, OnDestroy {
  productName = '';
  productImage = '';
  confirmationMessage = '';
  isError = false;
  isSubmitting = false;
  emailError = '';
  contactForm!: FormGroup;
  private hideMessageTimer: any;
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private emailService: EmailService,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder
  ) {
    this.contactForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      message: ['', [Validators.required]]
    });
  }

  ngOnInit() {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.productName = params['productName'] || '';
      this.productImage = params['productImage'] || '';
    });
  }

  ngOnDestroy(): void {
    this.clearHideMessageTimer();
    this.destroy$.next();
    this.destroy$.complete();
  }

  submitContact() {
    this.clearHideMessageTimer();
    this.emailError = '';

    if (this.contactForm.invalid) {
      if (this.contactForm.get('email')?.hasError('required')) {
        this.isError = true;
        this.confirmationMessage = 'Please enter your email address.';
        this.hideMessageAfterDelay();
        return;
      } else if (this.contactForm.get('email')?.hasError('email')) {
        this.isError = true;
        this.emailError = 'Please enter a correct email address (e.g., example@domain.com)';
        this.confirmationMessage = this.emailError;
        this.hideMessageAfterDelay();
        return;
      } else {
        this.isError = true;
        this.confirmationMessage = 'Please fill in all fields before submitting.';
        this.hideMessageAfterDelay();
        return;
      }
    }

    this.isSubmitting = true;
    this.confirmationMessage = '';

    const formData = {
      name: this.contactForm.get('name')?.value?.trim(),
      email: this.contactForm.get('email')?.value?.trim(),
      message: this.contactForm.get('message')?.value?.trim()
    };

    this.emailService.sendContactEmail(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.isError = false;
          this.emailError = '';
          this.confirmationMessage = 'Thank you! Your message has been received. We will contact you shortly.';

          this.contactForm.reset();
          this.hideMessageAfterDelay();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.isError = true;
          this.confirmationMessage = err?.error?.error || 'Unable to send your message right now. Please try again later.';
          this.hideMessageAfterDelay();
          this.cdr.markForCheck();
        }
      });
  }

  private hideMessageAfterDelay() {
    this.hideMessageTimer = setTimeout(() => {
      this.confirmationMessage = '';
      this.isError = false;
    }, 5000);
  }

  private clearHideMessageTimer() {
    if (this.hideMessageTimer) {
      clearTimeout(this.hideMessageTimer);
      this.hideMessageTimer = null;
    }
  }
}
