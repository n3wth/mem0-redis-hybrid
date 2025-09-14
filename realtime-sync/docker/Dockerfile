# Multi-stage build for optimized production image
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM node:20-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    curl \
    dumb-init \
    tini

# Create app directory and user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S realtime -u 1001 -G nodejs

WORKDIR /app

# Copy built dependencies from builder stage
COPY --from=builder --chown=realtime:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=realtime:nodejs package*.json ./
COPY --chown=realtime:nodejs src/ ./src/
COPY --chown=realtime:nodejs config/ ./config/

# Create logs directory
RUN mkdir -p logs && chown -R realtime:nodejs logs

# Set environment variables
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"

# Expose ports
EXPOSE 3001 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3002/health || exit 1

# Switch to non-root user
USER realtime

# Use tini as entrypoint for proper signal handling
ENTRYPOINT ["tini", "--"]

# Start the application
CMD ["node", "src/index.js"]