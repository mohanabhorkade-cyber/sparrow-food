# Multi-stage build for Angular + Node.js
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Build stage for Angular
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Angular app
RUN npm run build:prod

# Build SSR
RUN npm run build:ssr

# Production stage
FROM base AS production
WORKDIR /app

# Copy built Angular app
COPY --from=builder /app/dist/sparrow-foods ./dist/sparrow-foods

# Copy backend
COPY backend/package*.json ./backend/
COPY backend/server.js ./backend/
COPY backend/.env.example ./backend/.env

# Install backend dependencies
WORKDIR /app/backend
RUN npm ci --only=production

# Create logs directory
RUN mkdir -p logs

# Switch back to root
WORKDIR /app

# Expose ports
EXPOSE 4200 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start both frontend and backend
CMD ["sh", "-c", "npm run serve:ssr:sparrow-foods & cd backend && npm start"]