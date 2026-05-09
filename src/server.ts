import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr/node';
import express, { Request, Response, NextFunction } from 'express';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import bootstrap from './main.server';

import { Resend } from 'resend';
import cors from 'cors';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import morgan from 'morgan';
import winston from 'winston';
import Joi from 'joi';
import validator from 'validator';
import dotenv from 'dotenv';

dotenv.config({ path: join(process.cwd(), '.env') });

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

const defaultDistFolder = resolve(process.cwd(), 'dist', 'sparrow-food');
const serverDistFolder = resolve(defaultDistFolder, 'server');
const browserDistFolder = resolve(defaultDistFolder, 'browser');
const indexHtml = join(serverDistFolder, 'index.server.html');
const dataFolder = resolve(browserDistFolder, 'assets', 'data');

console.log('serverDistFolder:', serverDistFolder);
console.log('browserDistFolder:', browserDistFolder);
console.log('dataFolder:', dataFolder);
console.log('cwd:', process.cwd());

if (!existsSync(dataFolder)) {
  console.error('Data folder missing:', dataFolder);
  process.exit(1);
}

const categoriesData = JSON.parse(readFileSync(join(dataFolder, 'categories.json'), 'utf8'));
const subItemData = JSON.parse(readFileSync(join(dataFolder, 'subItemData.json'), 'utf8'));
const productsData = JSON.parse(readFileSync(join(dataFolder, 'products.json'), 'utf8')) as Product[];

const logsFolder = resolve(process.cwd(), 'logs');
if (!existsSync(logsFolder)) {
  mkdirSync(logsFolder, { recursive: true });
}

const logger = winston.createLogger({
  level: process.env['LOG_LEVEL'] || 'info',
  format: process.env['NODE_ENV'] === 'production'
    ? winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      )
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
  transports: [new winston.transports.Console()]
});

const normalizeEnv = () => {
  if (process.env['CONTACT_EMAIL']) {
    process.env['CONTACT_EMAIL'] = process.env['CONTACT_EMAIL'].trim();
  }
  if (process.env['EMAIL_API_KEY']) {
    process.env['EMAIL_API_KEY'] = process.env['EMAIL_API_KEY'].trim();
  }
};

normalizeEnv();

const envKeys = Object.keys(process.env).filter(k =>
  ['EMAIL_API_KEY', 'CONTACT_EMAIL', 'ALLOWED_ORIGINS', 'NODE_ENV', 'PORT'].includes(k)
);
logger.info('Environment variables detected:', envKeys);

const contactEmail = process.env['CONTACT_EMAIL'];
const resendApiKey = process.env['EMAIL_API_KEY'];
const emailSender = 'Sparrow Food <admin@sparrowfood.com>';

if (!contactEmail || !resendApiKey) {
  logger.error('Missing required email configuration. EMAIL_API_KEY and CONTACT_EMAIL are required.');
  process.exit(1);
}

const resend = new Resend(resendApiKey);

const app = express();
const commonEngine = new CommonEngine();

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

const allowedOrigins = process.env['ALLOWED_ORIGINS']
  ? process.env['ALLOWED_ORIGINS'].split(',').map(origin => origin.trim()).filter(Boolean)
  : ['http://localhost:4200', 'https://sparrowfood.com', 'https://www.sparrowfood.com'];

// FIX 1: Fixed escapeRegExp — was double-escaping backslash, breaking wildcard regex
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const isOriginAllowed = (origin: string) => {
  if (!origin) return true;
  return allowedOrigins.some((allowed) => {
    if (allowed === origin) return true;
    if (allowed.includes('*')) {
      const pattern = '^' + allowed.split('*').map(escapeRegExp).join('.*') + '$';
      return new RegExp(pattern).test(origin);
    }
    return false;
  });
};

logger.info('Allowed CORS origins', { allowedOrigins });

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many email requests. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(compression({ level: 6, threshold: 1024 }));
app.use(morgan('combined', { stream: { write: (message: string) => logger.info(message.trim()) } }));

// FIX 2: Body parser must come BEFORE the content-type normalizer
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// FIX 3: Normalize content-type for POST requests missing it, so body-parser doesn't silently skip them
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'POST' && !req.headers['content-type']?.includes('application/json')) {
    req.headers['content-type'] = 'application/json';
  }
  next();
});

app.use('/api/email/', emailLimiter);
app.use(generalLimiter);

// FIX 4: abortEarly: false so ALL Joi validation errors are reported at once, not just the first
const joiOptions = { abortEarly: false };

const priceListSchema = Joi.object({ email: Joi.string().email().required() });
const contactSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  email: Joi.string().email().required(),
  message: Joi.string().min(10).max(1000).required()
});
const inquirySchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  email: Joi.string().email().required(),
  message: Joi.string().min(10).max(1000).required(),
  productName: Joi.string().max(200).optional(),
  brand: Joi.string().max(100).optional(),
  packSize: Joi.string().max(50).optional()
});

const retryableEmailStatus = [408, 429, 500, 502, 503, 504];
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendEmail = async (message: any, maxRetries = 2) => {
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      await resend.emails.send(message);
      return;
    } catch (error: any) {
      const statusCode = error?.response?.status || error?.response?.statusCode || error?.statusCode || error?.code || 0;
      const errorMessage = error?.message || 'Unknown Resend error';

      logger.warn('Resend email attempt failed', { attempt: attempt + 1, statusCode, error: errorMessage });

      if (attempt === maxRetries || !retryableEmailStatus.includes(Number(statusCode))) {
        logger.error('Resend email failed permanently', {
          statusCode,
          error: errorMessage,
          responseBody: error?.response?.data || error?.response?.body || null
        });
        throw error;
      }

      await wait(500 * Math.pow(2, attempt));
    }
  }
};

const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', {
    message: err?.message,
    stack: err?.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  const isDevelopment = process.env['NODE_ENV'] !== 'production';
  res.status(err.status || err.statusCode || 500).json({
    error: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack })
  });
};

const sanitizeInput = (input: unknown) => {
  if (typeof input === 'string') return validator.escape(input);
  return input;
};

app.get('/health', (req, res) => {
  logger.info('Health check requested');
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env['NODE_ENV'] || 'development'
  });
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *\nAllow: /\nSitemap: ${req.protocol}://${req.get('host')}/sitemap.xml\n`);
});

app.get('/sitemap.xml', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const urls = ['/', '/products', '/contact', '/about'];
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${baseUrl}${url}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`).join('\n')}\n</urlset>`;
  res.type('application/xml');
  res.send(sitemapXml);
});

app.get('/api/categories', (req, res) => res.json(categoriesData));
app.get('/api/subItemData', (req, res) => res.json(subItemData));

app.get('/api/products', (req, res) => {
  const category = typeof req.query['category'] === 'string' ? req.query['category'] : '';
  const subItem = typeof req.query['subItem'] === 'string' ? req.query['subItem'] : '';

  let filteredProducts: Product[] = productsData;
  if (category) filteredProducts = filteredProducts.filter((p: Product) => p.category === category);
  if (subItem) filteredProducts = filteredProducts.filter((p: Product) => p.subItem === subItem);

  res.json(filteredProducts);
});

app.post('/api/email/send-price-list', async (req, res) => {
  try {
    // FIX 5: Log incoming body to catch parsing failures early
    logger.info('Price list request body:', { body: req.body, contentType: req.headers['content-type'] });

    const { error, value } = priceListSchema.validate(req.body, joiOptions);
    if (error) {
      const messages = error.details.map(d => d.message).join(', ');
      logger.warn('Price list validation failed:', messages);
      return res.status(400).json({ error: 'Invalid email address provided', details: messages });
    }

    const { email } = value;
    const sanitizedEmail = validator.normalizeEmail(email);
    if (!sanitizedEmail) {
      logger.warn('Price list normalization failed for email:', email);
      return res.status(400).json({ error: 'Invalid email address provided' });
    }

    logger.info('Processing price list request for:', sanitizedEmail);

    const userMessage = {
      from: emailSender,
      to: sanitizedEmail,
      subject: 'Sparrow Food Industries - Price List Request Received',
      html: `
        <h2>Hello!</h2>
        <p>Thank you for requesting the Sparrow Food price list.</p>
        <p>We have received your request and will follow up with the requested details shortly.</p>
        <p>If you have any immediate questions, please reply to this email or contact us directly.</p>
        <hr>
        <p><strong>Sparrow Food Industries</strong></p>
        <p>Plot Number R1-1, Survey number 115/4<br>
          Hinjewadi - kasarsai road,<br>
          Nearby Chaitanya Education Institution, At.Nere, Post. Jambhe,<br>
          Dist. Pune - 411033</p>
        <p>Email: ${validator.escape(contactEmail)}</p>
        <p>Phone: +917276130808</p>
      `
    };

    const adminMessage = {
      from: emailSender,
      to: contactEmail,
      subject: `New Price List Request from ${sanitizedEmail}`,
      html: `
        <h3>New Price List Request</h3>
        <p><strong>Email:</strong> ${validator.escape(sanitizedEmail)}</p>
        <p>This user has requested the Sparrow Food price list.</p>
        <p><em>Timestamp: ${new Date().toISOString()}</em></p>
      `
    };

    await Promise.all([sendEmail(adminMessage), sendEmail(userMessage)]);
    logger.info('Price list emails sent successfully for:', sanitizedEmail);
    return res.json({ success: true, message: 'Price list request received successfully' });
  } catch (error) {
    logger.error('Error sending price list emails:', error);
    return res.status(500).json({ error: 'Failed to process price list request. Please try again later.' });
  }
});

app.post('/api/email/send-contact', async (req, res) => {
  try {
    // FIX 5: Log incoming body to catch parsing failures early
    logger.info('Contact request body:', { body: req.body, contentType: req.headers['content-type'] });

    const { error, value } = contactSchema.validate(req.body, joiOptions);
    if (error) {
      const messages = error.details.map(d => d.message).join(', ');
      logger.warn('Contact validation failed:', messages);
      return res.status(400).json({ error: 'Please provide valid name, email, and message (10-1000 characters)', details: messages });
    }

    const { name, email, message } = value;
    const sanitizedName = sanitizeInput(name) as string;
    const sanitizedEmail = validator.normalizeEmail(email);
    const sanitizedMessage = sanitizeInput(message) as string;

    if (!sanitizedEmail) {
      logger.warn('Contact email normalization failed for email:', email);
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    logger.info('Processing contact message from:', sanitizedEmail);

    const adminMessage = {
      from: emailSender,
      to: contactEmail,
      subject: `New Contact Message from ${sanitizedName}`,
      html: `
        <h3>New Message from Contact Form</h3>
        <p><strong>From:</strong> ${sanitizedName}</p>
        <p><strong>Email:</strong> ${sanitizedEmail}</p>
        <hr>
        <p><strong>Message:</strong></p>
        <p>${sanitizedMessage}</p>
        <hr>
        <p><em>Received: ${new Date().toISOString()}</em></p>
      `
    };

    const userMessage = {
      from: emailSender,
      to: sanitizedEmail,
      subject: 'Sparrow Food Industries - We received your message',
      html: `
        <h2>Thank you for contacting Sparrow Food Industries</h2>
        <p>Hi ${validator.escape(sanitizedName)},</p>
        <p>We received your message and will respond as soon as possible.</p>
        <hr>
        <p><strong>Your message:</strong></p>
        <p>${sanitizedMessage}</p>
        <hr>
        <p>If you need immediate assistance, reply to this email or contact us directly.</p>
        <p><strong>Contact:</strong> ${validator.escape(contactEmail)}</p>
      `
    };

    await Promise.all([sendEmail(adminMessage), sendEmail(userMessage)]);
    logger.info('Contact email and confirmation sent successfully from:', sanitizedEmail);
    return res.json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    logger.error('Error sending contact email:', error);
    return res.status(500).json({ error: 'Failed to send message. Please try again later.' });
  }
});

app.post('/api/email/send-inquiry', async (req, res) => {
  try {
    // FIX 5: Log incoming body to catch parsing failures early
    logger.info('Inquiry request body:', { body: req.body, contentType: req.headers['content-type'] });

    const { error, value } = inquirySchema.validate(req.body, joiOptions);
    if (error) {
      const messages = error.details.map(d => d.message).join(', ');
      logger.warn('Inquiry validation failed:', messages);
      return res.status(400).json({ error: 'Please provide valid email and message (10-1000 characters)', details: messages });
    }

    const { name, email, message, productName, brand, packSize } = value;
    const inquiryText = `${productName || ''} ${message || ''}`.toLowerCase();
    if (inquiryText.includes('chili flakes')) {
      logger.warn('Blocked chili flakes inquiry from:', email);
      return res.status(400).json({ error: 'Inquiries about chili flakes are not accepted' });
    }

    const sanitizedName = sanitizeInput(name) as string;
    const sanitizedEmail = validator.normalizeEmail(email);
    const sanitizedMessage = sanitizeInput(message) as string;
    const sanitizedProductName = productName ? (sanitizeInput(productName) as string) : 'N/A';
    const sanitizedBrand = brand ? (sanitizeInput(brand) as string) : 'N/A';
    const sanitizedPackSize = packSize ? (sanitizeInput(packSize) as string) : 'N/A';

    if (!sanitizedEmail) {
      logger.warn('Inquiry email normalization failed for email:', email);
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    logger.info('Processing product inquiry from:', sanitizedEmail);

    const adminMessage = {
      from: emailSender,
      to: contactEmail,
      subject: `New Product Inquiry from ${sanitizedName}`,
      html: `
        <h3>New Product Inquiry</h3>
        <p><strong>From:</strong> ${sanitizedName}</p>
        <p><strong>Email:</strong> ${sanitizedEmail}</p>
        <p><strong>Product:</strong> ${sanitizedProductName}</p>
        <p><strong>Brand:</strong> ${sanitizedBrand}</p>
        <p><strong>Pack Size:</strong> ${sanitizedPackSize}</p>
        <hr>
        <p><strong>Message:</strong></p>
        <p>${sanitizedMessage}</p>
        <hr>
        <p><em>Received: ${new Date().toISOString()}</em></p>
      `
    };

    const userMessage = {
      from: emailSender,
      to: sanitizedEmail,
      subject: 'Sparrow Food Industries - We received your inquiry',
      html: `
        <h2>Thank you for your inquiry</h2>
        <p>Hi ${validator.escape(sanitizedName)},</p>
        <p>We received your inquiry about <strong>${validator.escape(sanitizedProductName)}</strong>.</p>
        <p>Our team will review your message and get back to you shortly.</p>
        <hr>
        <p><strong>Your message:</strong></p>
        <p>${sanitizedMessage}</p>
        <hr>
        <p>If you need immediate assistance, reply to this email or contact us at ${validator.escape(contactEmail)}.</p>
      `
    };

    await Promise.all([sendEmail(adminMessage), sendEmail(userMessage)]);
    logger.info('Inquiry email and confirmation sent successfully from:', sanitizedEmail);
    return res.json({ success: true, message: 'Inquiry sent successfully' });
  } catch (error) {
    logger.error('Error sending inquiry email:', error);
    return res.status(500).json({ error: 'Failed to send inquiry. Please try again later.' });
  }
});

app.use(express.static(browserDistFolder, { maxAge: '1y', index: false }));

app.get('*', (req, res, next) => {
  commonEngine
    .render({
      bootstrap,
      documentFilePath: indexHtml,
      url: `${req.protocol}://${req.headers.host}${req.originalUrl}`,
      publicPath: browserDistFolder,
      providers: [{ provide: APP_BASE_HREF, useValue: req.baseUrl }]
    })
    .then((html) => res.send(html))
    .catch((err) => next(err));
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use(errorHandler);

const port = Number(process.env['PORT']) || 4000;
const host = '0.0.0.0';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(port, host, () => {
    logger.info(`Node Express server listening on http://${host}:${port}`);
  });
}

export default app;