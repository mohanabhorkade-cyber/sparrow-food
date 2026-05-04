# Email Functionality Fix - Deployment Guide

## Problem Summary
Email functionality was NOT working after deployment to Render + Netlify, but worked fine locally. This was caused by:

1. **Backend listening on localhost only** (not accepting external connections on Render)
2. **Incorrect host binding** - Node.js defaults to `127.0.0.1` which doesn't accept external requests
3. **Gmail authentication issues** - Possible whitespace in App Passwords

## Solutions Implemented

### 1. ✅ Backend Host Configuration (CRITICAL FIX)
**File**: `backend/server.js`

Changed from:
```javascript
app.listen(PORT, () => {
  logger.info(`Backend server running on port ${PORT}...`);
});
```

To:
```javascript
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
app.listen(PORT, HOST, () => {
  logger.info(`Backend server running on ${HOST}:${PORT}...`);
});
```

**Why this fixes it:**
- On Render (production), listen on `0.0.0.0` to accept external connections from Netlify
- Locally, still listen on `localhost` for security during development
- Without this, external requests are rejected at the network level

### 2. ✅ Email Password Normalization
**File**: `backend/server.js`

Enhanced whitespace handling in `.env` to remove all invisible characters from EMAIL_PASSWORD:
```javascript
const normalizedPassword = rawPassword.replace(/\s+/g, '');
```

**Why this helps:**
- Gmail App Passwords are sensitive to whitespace
- Handles newlines, tabs, spaces in environment variables

### 3. ✅ Enhanced Email Configuration Logging
**File**: `backend/server.js`

Added detailed logging to identify email configuration issues:
```javascript
transporter.verify((error, success) => {
  if (error) {
    logger.error('Email configuration error:', error);
    logger.error('Email User:', process.env.EMAIL_USER);
    logger.error('Email Password configured:', !!process.env.EMAIL_PASSWORD);
  }
});
```

### 4. ✅ Render Deployment Configuration
**File**: `render.yaml`

Created proper deployment manifest for Render to ensure correct environment setup.

## How to Deploy These Fixes

### Step 1: Update Backend Environment Variables on Render
Go to: Render Dashboard → Your Backend Service → Environment

Verify/Update these variables:
```
NODE_ENV=production
PORT=5000
EMAIL_USER=mohanbhorkade02@gmail.com
EMAIL_PASSWORD=[YOUR_16_CHAR_GMAIL_APP_PASSWORD] (NO SPACES!)
CONTACT_EMAIL=mohanbhorkade02@gmail.com
ALLOWED_ORIGINS=https://delightful-douhua-10175a.netlify.app,https://sparrowfood.com,https://www.sparrowfood.com
LOG_LEVEL=info
```

**IMPORTANT**: Gmail App Passwords must:
- Be exactly 16 characters
- Have NO spaces or whitespace
- Be a valid Gmail App Password (generated in Gmail Security settings)

### Step 2: Redeploy Backend on Render
1. Go to your Render dashboard
2. Find: sparrow-food-backend service
3. Click "Manual Deploy" OR trigger via GitHub push
4. Wait for deployment to complete

### Step 3: Test Email Endpoints
Once deployed, test each endpoint:

**Test 1 - Price List Email:**
```bash
curl -X POST https://sparrow-food-backend.onrender.com/api/email/send-price-list \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test@gmail.com"}'
```

**Test 2 - Contact Form:**
```bash
curl -X POST https://sparrow-food-backend.onrender.com/api/email/send-contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"your-test@gmail.com","message":"This is a test message with at least 10 characters"}'
```

**Test 3 - Product Inquiry:**
```bash
curl -X POST https://sparrow-food-backend.onrender.com/api/email/send-inquiry \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"your-test@gmail.com","message":"I am interested in your products for at least 10 characters","productName":"Turmeric"}'
```

### Step 4: Test on Frontend
1. Visit: https://delightful-douhua-10175a.netlify.app/
2. Try:
   - **Footer Price List**: Subscribe for price list
   - **Contact Page**: Fill and submit contact form
   - **Products Page**: Submit product inquiry

### Step 5: Monitor Logs
Go to Render Dashboard → Backend Service → Logs

Look for:
- ✅ `Backend server running on 0.0.0.0:5000 in production mode`
- ✅ `Email service is ready` (if configured correctly)
- ✅ Request logs from Netlify domain

## Troubleshooting

### Issue: Still getting CORS errors
**Solution**: Verify `ALLOWED_ORIGINS` in Render environment includes the exact Netlify domain URL

### Issue: Email still not sending
**Solutions**:
1. Check Gmail has "Less secure app access" enabled OR use App Passwords
2. Verify EMAIL_USER and EMAIL_PASSWORD have no whitespace
3. Check logs in Render dashboard for authentication errors
4. Test with a direct curl request to the backend

### Issue: Backend times out or won't start
**Solution**:
1. Check logs in Render dashboard
2. Verify NODE_ENV=production is set
3. Check for any syntax errors in the updated server.js

## Architecture Summary

```
┌─────────────────────────────────────┐
│  Netlify Frontend                   │
│  https://delightful-douhua-...app   │
└────────────┬────────────────────────┘
             │ API Requests
             │ (CORS verified)
             ↓
┌─────────────────────────────────────┐
│  Render Backend                     │
│  sparrow-food-backend.onrender.com  │
│  Listening: 0.0.0.0:5000           │
└────────┬───────────────────────────┘
         │ Email Service
         │ (Nodemailer + Gmail)
         ↓
    Gmail SMTP
```

## Files Modified
1. ✅ `backend/server.js` - Host configuration + email logging
2. ✅ `render.yaml` - Deployment configuration
3. ✅ `backend/.env` - (Review only, already has correct settings)

## Additional Notes

### Why localhost doesn't work in production:
- `localhost` / `127.0.0.1` = only the server itself can connect
- Netlify (external) cannot reach it
- `0.0.0.0` = accept connections from any interface
- Render automatically routes external traffic to `0.0.0.0:5000`

### Why it worked locally:
- Frontend (localhost:4200) and Backend (localhost:5000) are on same machine
- Both use loopback interface (127.0.0.1)
- No CORS issues because ALLOWED_ORIGINS includes localhost

---
**Last Updated**: May 4, 2026
