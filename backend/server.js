const express = require('express');
const { Resend } = require('resend');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const winston = require('winston');
const Joi = require('joi');
const validator = require('validator');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '.env') });

if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

const normalizeEnv = () => {
  if (process.env.CONTACT_EMAIL) {
    process.env.CONTACT_EMAIL = process.env.CONTACT_EMAIL.trim();
  }
  if (process.env.EMAIL_API_KEY) {
    process.env.EMAIL_API_KEY = process.env.EMAIL_API_KEY.trim();
  }
};

normalizeEnv();

const contactEmail = process.env.CONTACT_EMAIL;
const resendApiKey = process.env.EMAIL_API_KEY;
const emailSender = 'Sparrow Food <admin@sparrowfood.com>';

console.log('API KEY exists:', !!process.env.EMAIL_API_KEY);
console.log('CONTACT_EMAIL:', process.env.CONTACT_EMAIL);

if (!contactEmail || !resendApiKey) {
  logger.error('Missing required email configuration. EMAIL_API_KEY and CONTACT_EMAIL are required.');
  process.exit(1);
}

const resend = new Resend(resendApiKey);

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

const app = express();
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean)
  : ['http://localhost:4200', 'https://sparrowfood.com', 'https://www.sparrowfood.com'];

// FIX 1: Fixed escapeRegExp — was double-escaping backslash, breaking wildcard regex for *.railway.app
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const isOriginAllowed = (origin) => {
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
  origin: function (origin, callback) {
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
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(compression({ level: 6, threshold: 1024 }));
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));

// FIX 2: Body parsers first so req.body is always populated before route handlers
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// FIX 3: Normalize content-type for POST requests missing it
// Prevents body-parser from silently skipping body parsing when Content-Type header is absent
app.use((req, res, next) => {
  if (req.method === 'POST' && !req.headers['content-type']?.includes('application/json')) {
    req.headers['content-type'] = 'application/json';
  }
  next();
});

app.use('/api/email/', emailLimiter);
app.use(generalLimiter);

// FIX 4: abortEarly: false — report ALL Joi validation errors at once, not just the first
const joiOptions = { abortEarly: false };

const priceListSchema = Joi.object({
  email: Joi.string().email().required()
});

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
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sendEmail = async (message, maxRetries = 2) => {
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      await resend.emails.send(message);
      return;
    } catch (error) {
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

const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  const isDevelopment = process.env.NODE_ENV !== 'production';
  res.status(err.status || 500).json({
    error: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack })
  });
};

const sanitizeInput = (input) => {
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
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.post('/api/email/send-price-list', async (req, res) => {
  try {
    // FIX 5: Log body on entry — confirms whether body-parser is working
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
    res.json({ success: true, message: 'Price list request received successfully' });
  } catch (error) {
    logger.error('Error sending price list emails:', error);
    res.status(500).json({ error: 'Failed to process price list request. Please try again later.' });
  }
});

app.post('/api/email/send-contact', async (req, res) => {
  try {
    // FIX 5: Log body on entry — confirms whether body-parser is working
    logger.info('Contact request body:', { body: req.body, contentType: req.headers['content-type'] });

    const { error, value } = contactSchema.validate(req.body, joiOptions);
    if (error) {
      const messages = error.details.map(d => d.message).join(', ');
      logger.warn('Contact validation failed:', messages);
      return res.status(400).json({ error: 'Please provide valid name, email, and message (10-1000 characters)', details: messages });
    }

    const { name, email, message } = value;
    const sanitizedName = sanitizeInput(name);
    const sanitizedEmail = validator.normalizeEmail(email);
    const sanitizedMessage = sanitizeInput(message);

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
    res.json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    logger.error('Error sending contact email:', error);
    res.status(500).json({ error: 'Failed to send message. Please try again later.' });
  }
});

app.post('/api/email/send-inquiry', async (req, res) => {
  try {
    // FIX 5: Log body on entry — confirms whether body-parser is working
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

    const sanitizedName = sanitizeInput(name);
    const sanitizedEmail = validator.normalizeEmail(email);
    const sanitizedMessage = sanitizeInput(message);
    const sanitizedProductName = productName ? sanitizeInput(productName) : 'N/A';
    const sanitizedBrand = brand ? sanitizeInput(brand) : 'N/A';
    const sanitizedPackSize = packSize ? sanitizeInput(packSize) : 'N/A';

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
    res.json({ success: true, message: 'Inquiry sent successfully' });
  } catch (error) {
    logger.error('Error sending inquiry email:', error);
    res.status(500).json({ error: 'Failed to send inquiry. Please try again later.' });
  }
});

const distPath = path.join(__dirname, 'dist/sparrow-food/browser');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.use('*', (req, res) => {
  logger.warn('404 - Route not found:', req.originalUrl);
  res.status(404).json({ error: 'Route not found' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Backend server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => logger.info('Process terminated'));
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => logger.info('Process terminated'));
});