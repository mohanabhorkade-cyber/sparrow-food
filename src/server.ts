import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr/node';
import express from 'express';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import bootstrap from './main.server';

interface Product {
  name: string;
  category: string;
  subItem: string;
  brand: string;
  packSize: string;
  shelfLife: string;
  moq: string;
  freight: string;
  image: string;
}

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');
const indexHtml = join(serverDistFolder, 'index.server.html');
const dataFolder = resolve(process.cwd(), 'src', 'assets', 'data');

const categoriesData = JSON.parse(readFileSync(join(dataFolder, 'categories.json'), 'utf8'));
const subItemData = JSON.parse(readFileSync(join(dataFolder, 'subItemData.json'), 'utf8'));
const productsData = JSON.parse(readFileSync(join(dataFolder, 'products.json'), 'utf8')) as Product[];

const app = express();
const commonEngine = new CommonEngine();

/**
 * REST API endpoints for product data
 */
app.get('/api/categories', (req, res) => {
  res.json(categoriesData);
});

app.get('/api/subItemData', (req, res) => {
  res.json(subItemData);
});

app.get('/api/products', (req, res) => {
  const category = typeof req.query['category'] === 'string' ? req.query['category'] : '';
  const subItem = typeof req.query['subItem'] === 'string' ? req.query['subItem'] : '';

  let filteredProducts: Product[] = productsData;

  if (category) {
    filteredProducts = filteredProducts.filter((product: Product) => product.category === category);
  }

  if (subItem) {
    filteredProducts = filteredProducts.filter((product: Product) => product.subItem === subItem);
  }

  res.json(filteredProducts);
});

/**
 * Generate and serve sitemap.xml
 */
app.get('/sitemap.xml', (req, res) => {
  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://sparrowfood.com/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://sparrowfood.com/about</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://sparrowfood.com/products</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://sparrowfood.com/contact</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://sparrowfood.com/flavors</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://sparrowfood.com/seasonings</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <!-- Dynamic product URLs will be added here -->
</urlset>`;

  res.header('Content-Type', 'application/xml');
  res.send(sitemapContent);
});

/**
 * Serve robots.txt
 */
app.get('/robots.txt', (req, res) => {
  const robotsContent = `User-agent: *
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
Sitemap: https://sparrowfood.com/sitemap.xml

# Crawl delay (optional)
Crawl-delay: 1`;

  res.header('Content-Type', 'text/plain');
  res.send(robotsContent);
});

/**
 * Serve static files from /browser
 */
app.get(
  '**',
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: 'index.html'
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.get('**', (req, res, next) => {
  const { protocol, originalUrl, baseUrl, headers } = req;

  commonEngine
    .render({
      bootstrap,
      documentFilePath: indexHtml,
      url: `${protocol}://${headers.host}${originalUrl}`,
      publicPath: browserDistFolder,
      providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
    })
    .then((html) => res.send(html))
    .catch((err) => next(err));
});

/**
 * Start the server when this file is executed directly.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
const port = process.env['PORT'] || 4000;
app.listen(port, () => {
  console.log(`Node Express server listening on http://localhost:${port}`);
});

export default app;
