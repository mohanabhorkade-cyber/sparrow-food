import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';

export interface BreadcrumbItem {
  label: string;
  url?: string;
  active?: boolean;
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.scss']
})
export class BreadcrumbComponent implements OnChanges {
  @Input() breadcrumbs: BreadcrumbItem[] = [];

  constructor(private seoService: SeoService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['breadcrumbs'] && this.breadcrumbs.length > 0) {
      // Update breadcrumb structured data
      const breadcrumbData = this.breadcrumbs.filter(crumb => crumb.url).map((crumb, index) => ({
        name: crumb.label,
        url: crumb.url!
      }));

      this.seoService.addBreadcrumbStructuredData(breadcrumbData);
    }
  }
}
