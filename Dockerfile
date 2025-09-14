# Use Node.js 22 slim as base image
FROM node:22-slim

# Install build dependencies required for redis-memory-server
RUN apt-get update && apt-get install -y \
    build-essential \
    make \
    g++ \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port (adjust as needed)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]