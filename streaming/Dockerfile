# Use FFmpeg base image with Ubuntu
FROM jrottenberg/ffmpeg:7.1-ubuntu

# Install Node.js
RUN apt-get update && \
    apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy worker code
COPY worker.js ./

# Create uploads directory
RUN mkdir -p /app/uploads/processed

# Expose port for health checks (optional)
EXPOSE 3001

# Override the ffmpeg entrypoint from base image
ENTRYPOINT []

# Start the worker
CMD ["node", "worker.js"]
