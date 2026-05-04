import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AboutComponent {
  stats = [
    { number: '13+', label: 'Product Categories' },
    { number: '500+', label: 'Products' },
    { number: '100%', label: 'Quality Assured' },
    { number: '24/7', label: 'Support' }
  ];

  whyChoose = [
    { title: 'Scalable Solutions for Growing Businesses', desc: 'Our flexible solutions are designed to grow with your business, supporting increased demand while maintaining quality, efficiency, and cost-effectiveness.' },
    { title: 'Quick Response & Technical Support', desc: 'We ensure fast communication and reliable technical assistance, helping clients resolve challenges quickly and keep operations running smoothly.' },
    { title: 'Strong Sourcing Network', desc: 'Our extensive sourcing network enables us to procure high-quality ingredients efficiently, ensuring consistency, availability, and competitive pricing.' },
    { title: 'Customer-centric approach', desc: 'We prioritize our customers by understanding their unique needs and delivering tailored solutions, ensuring consistent quality, reliability, and long-term partnerships.' }
  ];

  setsApart = [
    { title: 'Flexible MOQs', desc: 'Order quantities that suit your business scale—no unnecessary burden.' },
    { title: 'Global Reach', desc: 'Exporting to multiple international markets with reliable supply chains.' },
    { title: 'Customized Packaging', desc: 'Tailor-made pack sizes and formats as per your requirement.' },
    { title: 'Food Safety First', desc: 'Certified compliance with global food safety standards ensures every product is safe and healthy for your family.' },
    { title: 'Consistent Quality', desc: 'Products backed by stringent quality standards and processes.' },
    { title: 'Fast Lead Times', desc: 'Efficient operations ensuring timely deliveries.' }
  ];

  facilities = [
    { title: 'Food Safety Standards', desc: 'Adhering to international food safety standards with regular audits and certifications for global compliance.' },
    { title: 'Modern Technology', desc: 'State-of-the-art equipment designed to maintain hygiene, efficiency, and consistency across all production lines.' },
    { title: 'Quality Assurance', desc: 'Rigorous testing and quality control processes ensure every product meets the highest standards before reaching you.' }
  ];

  trackByStat(index: number): string {
    return 'stat-' + index;
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  trackByWhyChoose(index: number): string {
    return 'why-' + index;
  }

  trackBySetsApart(index: number): string {
    return 'apart-' + index;
  }

  trackByFacility(index: number): string {
    return 'facility-' + index;
  }
}
