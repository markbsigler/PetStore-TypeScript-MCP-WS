# Build stage
FROM node:20-alpine3.19 AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN apk update && apk upgrade --no-cache \
  && npm ci \
  && npm audit fix --force

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

FROM node:20-alpine3.19

WORKDIR /app
WORKDIR /app

# Copy package files and install production dependencies
RUN apk update && apk upgrade --no-cache \
  && npm ci --omit=dev \
  && npm audit fix --force \
  && npm audit fix --force

# Copy built application
COPY --from=builder /app/dist ./dist

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

# Expose port
EXPOSE ${PORT}

# Start the application
CMD ["node", "dist/index.js"] 