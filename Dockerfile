# Pinned to an exact release so a stale cached `node:22-alpine` cannot ship.
# 22.23.4 fixes the October 2026 Node.js security releases (CVE-2026-111497
# Brotli RCE, reachable here through Express 5's body parser). Bump both
# values together, and keep .nvmrc in step.
ARG NODE_VERSION=22.23.4
ARG ALPINE_VERSION=3.24

# Base stage for all environments
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS base

ARG PORT=3000

WORKDIR /app

# Copy package files
COPY package*.json ./

# Development stage
FROM base AS development

# Install all dependencies (including devDependencies)
RUN npm install --legacy-peer-deps

# Copy application code
COPY . .

# Expose port (configurable via PORT env var)
EXPOSE ${PORT}

# Start in development mode with hot reload
CMD ["npm", "run", "start:dev"]

# Builder stage for production
FROM base AS builder

# Install all dependencies (needed for build)
RUN npm install --legacy-peer-deps

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install only production dependencies (skip prepare script for husky)
RUN npm install --omit=dev --ignore-scripts --legacy-peer-deps && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main"]