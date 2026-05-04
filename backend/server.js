const express = require('express');
const nodemailer = require('nodemailer');
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

const normalizeEmailAuth = () => {
  if (process.env.EMAIL_USER) {
    process.env.EMAIL_USER = process.env.EMAIL_USER.trim();
  }

  if (process.env.EMAIL_PASSWORD) {
    // Remove ALL whitespace including tabs, newlines, etc.
    const rawPassword = process.env.EMAIL_PASSWORD;
    const normalizedPassword = rawPassword.replace(/\s+/g, '');

    if (normalizedPassword !== rawPassword) {
      logger.info('Normalizing EMAIL_PASSWORD: removing whitespace');
      process.env.EMAIL_PASSWORD = normalizedPassword;
    }
  }

  if (process.env.CONTACT_EMAIL) {
    process.env.CONTACT_EMAIL = process.env.CONTACT_EMAIL.trim();
  }
};

normalizeEmailAuth();

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

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
   connectionTimeout: 10000,  // 10 seconds to connect
  greetingTimeout: 10000,    // 10 seconds for greeting
  socketTimeout: 30000       // 30 seconds for socket
});

// Test email connection
transporter.verify((error, success) => {
  if (error) {
    logger.error('Email configuration error:', error);
    logger.error('Email User:', process.env.EMAIL_USER);
    logger.error('Email Password configured:', !!process.env.EMAIL_PASSWORD);
    logger.warn('Email service verification failed - check EMAIL_USER and EMAIL_PASSWORD in environment');
  } else {
    logger.info('✓ Email service is ready');
  }
});

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
    // Validate input
    const { error, value } = priceListSchema.validate(req.body);
    if (error) {
      logger.warn('Price list validation failed:', error.details[0].message);
      return res.status(400).json({
        error: 'Invalid email address provided'
      });
    }

    const { email } = value;
    const sanitizedEmail = validator.normalizeEmail(email);

    logger.info('Processing price list request for:', sanitizedEmail);

    const adminEmail = process.env.CONTACT_EMAIL || process.env.EMAIL_USER;

    const userMailOptions = {
      from: process.env.EMAIL_USER,
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
        <p>Email: ${validator.escape(adminEmail)}</p>
        <p>Phone: +917276130808</p>
      `};

    const adminMailOptions = {
      from: process.env.EMAIL_USER,
      to: adminEmail,
      subject: `New Price List Request from ${sanitizedEmail}`,
      html: `
        <h3>New Price List Request</h3>
        <p><strong>Email:</strong> ${validator.escape(sanitizedEmail)}</p>
        <p>This user has requested the Sparrow Food price list.</p>
        <p><em>Timestamp: ${new Date().toISOString()}</em></p>
      `
    };

    await transporter.sendMail(adminMailOptions);
    await transporter.sendMail(userMailOptions);

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
    // Validate input
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

    logger.info('Processing contact message from:', sanitizedEmail);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.CONTACT_EMAIL,
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

    await transporter.sendMail(mailOptions);

    logger.info('Contact email sent successfully from:', sanitizedEmail);
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
    // Validate input
    const { error, value } = inquirySchema.validate(req.body);
    if (error) {
      logger.warn('Inquiry validation failed:', error.details[0].message);
      return res.status(400).json({
        error: 'Please provide valid email and message (10-1000 characters)'
      });
    }

    const { name, email, message, productName, brand, packSize } = value;

    // Check if inquiry mentions chili flakes
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

    logger.info('Processing product inquiry from:', sanitizedEmail);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.CONTACT_EMAIL,
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

    await transporter.sendMail(mailOptions);

    logger.info('Inquiry email sent successfully from:', sanitizedEmail);
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
