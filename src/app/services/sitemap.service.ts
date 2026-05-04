import { Injectable } from '@angular/core';
import { DataService } from './data.service';

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

@Injectable({
  providedIn: 'root'
})
export class SitemapService {
  private baseUrl = 'https://sparrowfood.com';

  constructor(private dataService: DataService) {}

  /**
   * Generate sitemap XML content
   */
  async generateSitemap(): Promise<string> {
    const urls: SitemapUrl[] = [];

    // Static pages
    urls.push(
      { loc: `${this.baseUrl}/`, changefreq: 'weekly', priority: 1.0 },
      { loc: `${this.baseUrl}/about`, changefreq: 'monthly', priority: 0.8 },
      { loc: `${this.baseUrl}/products`, changefreq: 'weekly', priority: 0.9 },
      { loc: `${this.baseUrl}/contact`, changefreq: 'monthly', priority: 0.7 },
      { loc: `${this.baseUrl}/flavors`, changefreq: 'weekly', priority: 0.8 },
      { loc: `${this.baseUrl}/seasonings`, changefreq: 'weekly', priority: 0.8 }
    );

    // Dynamic product pages
    const productUrls = await this.generateProductUrls();
    urls.push(...productUrls);

    return this.buildSitemapXml(urls);
  }

  /**
   * Generate URLs for product categories and sub-items
   */
  private async generateProductUrls(): Promise<SitemapUrl[]> {
    const urls: SitemapUrl[] = [];

    try {
      const categories = await this.dataService.getCategories().toPromise();
      const subItemData = await this.dataService.getSubItemData().toPromise();

      if (categories) {
        for (const category of categories) {
          // Category page
          urls.push({
            loc: `${this.baseUrl}/products?group=${encodeURIComponent(category.key)}`,
            changefreq: 'weekly',
            priority: 0.8
          });

          // Sub-item pages
          if (subItemData && subItemData[category.key]) {
            for (const subItem of subItemData[category.key]) {
              urls.push({
                loc: `${this.baseUrl}/products?group=${encodeURIComponent(category.key)}&subItem=${encodeURIComponent(subItem)}`,
                changefreq: 'weekly',
                priority: 0.7
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error generating product URLs for sitemap:', error);
    }

    return urls;
  }

  /**
   * Build XML sitemap from URL array
   */
  private buildSitemapXml(urls: SitemapUrl[]): string {
    const urlElements = urls.map(url => {
      let xml = `  <url>\n    <loc>${url.loc}</loc>\n`;

      if (url.lastmod) {
        xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
      }

      if (url.changefreq) {
        xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
      }

      if (url.priority !== undefined) {
        xml += `    <priority>${url.priority}</priority>\n`;
      }

      xml += '  </url>\n';
      return xml;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlElements}</urlset>`;
  }

  /**
   * Generate robots.txt content
   */
  generateRobotsTxt(): string {
    return `User-agent: *
Allow: /

# Block access to admin areas
Disallow: /admin/
Disallow: /api/private/

# Allow access to CSS, JS, and image files
Allow: *.css
Allow: *.js
Allow: *.png
Allow: *.jpg
Allow: *.jpeg
Allow: *.gif
Allow: *.webp
Allow: *.svg

# Sitemap
Sitemap: ${this.baseUrl}/sitemap.xml

# Crawl delay (optional)
Crawl-delay: 1`;
  }
}