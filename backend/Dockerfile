# Use Node.js 24 as the base image
FROM node:24-slim

# Set working directory
WORKDIR /app

# Install necessary system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create volume for persistent data
VOLUME ["/app/test-results"]

# Environment variables
ENV NODE_ENV=production \
    PORT=3000

# Add healthcheck endpoint
COPY healthcheck.js /app/healthcheck.js

# Healthcheck using Node.js instead of curl
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node healthcheck.js

# Security: Run as non-root user
RUN useradd -m appuser && chown -R appuser /app
USER appuser

# Start the application
CMD ["node", "index.js"]
