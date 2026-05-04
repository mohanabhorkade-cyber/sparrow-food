# Sparrow Food - Production Ready Business Website

A full-stack Angular 19 (frontend) + Node.js/Express (backend) business website with production-grade security, monitoring, and deployment setup.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sparrow-food
   ```

2. **Install dependencies**
   ```bash
   # Frontend
   npm install

   # Backend
   cd backend
   npm install
   cd ..
   ```

3. **Environment Setup**
   ```bash
   # Copy environment template
   cp backend/.env.example backend/.env

   # Edit backend/.env with your values
   nano backend/.env
   ```

4. **Start development servers**
   ```bash
   # Terminal 1: Backend
   cd backend && npm run dev

   # Terminal 2: Frontend
   npm start
   ```

5. **Access the application**
   - Frontend: http://localhost:4200
   - Backend API: http://localhost:5000

## 🏗️ Production Deployment

### Option 1: Docker Deployment (Recommended)

1. **Build and run with Docker Compose**
   ```bash
   # Set environment variables
   cp backend/.env.example backend/.env
   # Edit .env with production values

   # Build and start services
   docker-compose up -d --build
   ```

2. **Access your application**
   - Frontend: http://localhost:4200
   - Backend: http://localhost:5000

### Option 2: PM2 Process Manager

1. **Install PM2 globally**
   ```bash
   npm install -g pm2
   ```

2. **Build the application**
   ```bash
   npm run build:prod
   npm run build:ssr
   ```

3. **Start with PM2**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

### Option 3: Cloud Platforms

#### Frontend (Static Hosting)
- **Vercel**: Connect GitHub repo, auto-deploys on push
- **Netlify**: Drag & drop dist folder or connect repo
- **AWS S3 + CloudFront**: For scalable static hosting

#### Backend (Server Hosting)
- **Render**: Free tier, auto-deploys from Git
- **DigitalOcean App Platform**: Managed Node.js hosting
- **Heroku**: Traditional PaaS hosting

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
# Environment
NODE_ENV=production
PORT=5000

# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
CONTACT_EMAIL=contact@sparrowfood.com

# Security
ALLOWED_ORIGINS=https://yourdomain.com
LOG_LEVEL=info

# Monitoring (Optional)
SENTRY_DSN=your-sentry-dsn
```

#### Frontend (environment.prod.ts)
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-api-domain.com/api',
  sentryDsn: 'your-sentry-dsn'
};
```

## 🔒 Security Features

- ✅ Helmet.js security headers
- ✅ CORS protection with allowed origins
- ✅ Rate limiting (5 emails per 15 minutes per IP)
- ✅ Input validation with Joi
- ✅ XSS protection via input sanitization
- ✅ HTTPS enforcement in production
- ✅ Secure email credentials via environment variables

## 📊 Monitoring & Logging

- ✅ Winston structured logging (file + console)
- ✅ Morgan HTTP request logging
- ✅ Sentry error tracking
- ✅ Health check endpoint (`/health`)
- ✅ PM2 process monitoring

## 🚀 CI/CD Pipeline

### GitHub Actions Setup

1. **Add repository secrets** in GitHub Settings:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`
   - `RENDER_DEPLOY_HOOK`

2. **Push to main branch** - automatic deployment

### Manual Deployment

```bash
# Build for production
npm run build:prod
npm run build:ssr

# Optimize images
npm run optimize-images

# Deploy frontend to Vercel
vercel --prod

# Deploy backend to Render
curl -X POST $RENDER_DEPLOY_HOOK
```

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run tests in CI mode
npm test -- --watch=false --browsers=ChromeHeadless
```

## 📁 Project Structure

```
sparrow-food/
├── src/
│   ├── app/
│   │   ├── components/     # Angular components
│   │   ├── services/       # Angular services
│   │   └── environments/   # Environment configs
│   └── assets/            # Static assets
├── backend/
│   ├── server.js          # Express server
│   ├── package.json       # Backend dependencies
│   └── .env.example       # Environment template
├── dist/                  # Build output
├── Dockerfile             # Multi-stage Docker build
├── docker-compose.yml     # Docker orchestration
├── ecosystem.config.js    # PM2 configuration
└── .github/workflows/     # CI/CD pipelines
```

## 🔧 Development Scripts

```bash
# Development
npm start              # Start dev server
npm run build          # Development build
npm test               # Run tests

# Production
npm run build:prod     # Production build
npm run build:ssr      # SSR build
npm run serve:ssr      # Serve SSR

# Utilities
npm run optimize-images # Image optimization
```

## 🚨 Production Checklist

### Security ✅
- [ ] Environment variables configured
- [ ] HTTPS enabled
- [ ] CORS properly configured
- [ ] Rate limiting active
- [ ] Input validation working

### Performance ✅
- [ ] Gzip compression enabled
- [ ] Critical CSS inlined
- [ ] Images optimized
- [ ] Bundle sizes within limits
- [ ] Caching headers set

### Deployment ✅
- [ ] Docker containers working
- [ ] PM2 processes running
- [ ] CI/CD pipeline active
- [ ] Health checks passing
- [ ] Monitoring configured

### Monitoring ✅
- [ ] Error tracking (Sentry)
- [ ] Logging configured
- [ ] Health endpoints responding
- [ ] Performance metrics collected

## 🆘 Troubleshooting

### Common Issues

1. **Build fails**
   ```bash
   rm -rf node_modules dist
   npm install
   npm run build:prod
   ```

2. **Email not sending**
   - Check Gmail app password
   - Verify environment variables
   - Check server logs

3. **CORS errors**
   - Update ALLOWED_ORIGINS in .env
   - Restart backend service

4. **Performance issues**
   ```bash
   npm run optimize-images
   npm run build:prod
   ```

## 📞 Support

For issues or questions:
- Check the logs in `backend/logs/`
- Review GitHub Actions output
- Check health endpoint: `/health`

## 📄 License

This project is licensed under the ISC License.

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
