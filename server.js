const express = require('express');
const path = require('path');
const app = express();

const distPath = path.join(__dirname, 'dist/sparrow-food/browser');
app.use(express.static(distPath));

// Sitemap for SEO
// Sitemap for SEO
app.get('/sitemap.xml', (req, res) => {
  const baseUrl = 'https://www.sparrowfood.com';
  const urls = ['/', '/products', '/contact', '/about'];
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url><loc>${baseUrl}${url}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`).join('\n')}
</urlset>`;
  res.type('application/xml');
  res.send(sitemapXml);
});

// Robots.txt
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  // res.send(`User-agent: *\nAllow: /\nSitemap: ${req.protocol}://${req.get('host')}/sitemap.xml\n`);
  res.send(`User-agent: *\nAllow: /\nSitemap: https://www.sparrowfood.com/sitemap.xml\n`);
  
});

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 4200;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Angular app running on port ${PORT}`);
});