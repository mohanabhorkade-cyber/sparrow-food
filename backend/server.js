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

require('dotenv').config({ path: path.join(__dirname, '.env') });

// Winston Logger Configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
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
console.log("API KEY exists:", !!process.env.EMAIL_API_KEY);
console.log("CONTACT_EMAIL:", process.env.CONTACT_EMAIL);

if (!contactEmail || !resendApiKey) {
  logger.error('Missing required email configuration. EMAIL_API_KEY and CONTACT_EMAIL are required.');
  process.exit(1);
}

const resend = new Resend(resendApiKey);

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
} 

const app = express();
app.set('trust proxy', 1);

// Security Middleware  
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

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:4200'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limiting
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many email requests. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Compression
app.use(compression({
  level: 6,
  threshold: 1024 // Only compress responses > 1KB
}));

// Logging Middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Body Parser with size limits
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Apply rate limiters
app.use('/api/email/', emailLimiter);
app.use(generalLimiter);

// Input Validation Schemas
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

      logger.warn('Resend email attempt failed', {
        attempt: attempt + 1,
        statusCode,
        error: errorMessage
      });

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

// Global Error Handler Middleware
const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';

  res.status(err.status || 500).json({
    error: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack })
  });
};

// Sanitize input function
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return validator.escape(input);
  }
  return input;
};

// Send Price List Email
app.post('/api/email/send-price-list', async (req, res) => {
  try {
    const { error, value } = priceListSchema.validate(req.body);
    if (error) {
      logger.warn('Price list validation failed:', error.details[0].message);
      return res.status(400).json({
        error: 'Invalid email address provided'
      });
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
        <p>Sparrow Food Industries<br>
          Plot Number R1-1,<br>
          Survey number 115/4<br>
          Hinjewadi - kasarsai road,<br>
          Nearby Chaitanya Education Institution, At.Nere,Post. Jambhe,<br>
          Dist.pune - 411033</p>
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
    res.json({
      success: true,
      message: 'Price list request received successfully'
    });
  } catch (error) {
    logger.error('Error sending price list emails:', error);
    res.status(500).json({
      error: 'Failed to process price list request. Please try again later.'
    });
  }
});

// Send Contact Email
app.post('/api/email/send-contact', async (req, res) => {
  try {
    const { error, value } = contactSchema.validate(req.body);
    if (error) {
      logger.warn('Contact validation failed:', error.details[0].message);
      return res.status(400).json({
        error: 'Please provide valid name, email, and message (10-1000 characters)'
      });
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
    res.json({
      success: true,
      message: 'Message sent successfully'
    });
  } catch (error) {
    logger.error('Error sending contact email:', error);
    res.status(500).json({
      error: 'Failed to send message. Please try again later.'
    });
  }
});

// Send Product Inquiry Email
app.post('/api/email/send-inquiry', async (req, res) => {
  try {
    const { error, value } = inquirySchema.validate(req.body);
    if (error) {
      logger.warn('Inquiry validation failed:', error.details[0].message);
      return res.status(400).json({
        error: 'Please provide valid email and message (10-1000 characters)'
      });
    }

    const { name, email, message, productName, brand, packSize } = value;
    const inquiryText = `${productName || ''} ${message || ''}`.toLowerCase();
    if (inquiryText.includes('chili flakes')) {
      logger.warn('Blocked chili flakes inquiry from:', email);
      return res.status(400).json({
        error: 'Inquiries about chili flakes are not accepted'
      });
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
    res.json({
      success: true,
      message: 'Inquiry sent successfully'
    });
  } catch (error) {
    logger.error('Error sending inquiry email:', error);
    res.status(500).json({
      error: 'Failed to send inquiry. Please try again later.'
    });
  }
});

// Enhanced Health Check
app.get('/health', (req, res) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  };

  logger.info('Health check requested');
  res.json(healthCheck);
});

// 404 Handler
app.use('*', (req, res) => {
  logger.warn('404 - Route not found:', req.originalUrl);
  res.status(404).json({ error: 'Route not found' });
});

// Error Handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
const server = app.listen(PORT, HOST, () => {
  logger.info(`Backend server running on ${HOST}:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});
