# Use Node.js 18 as base for the backend
FROM node:18-alpine as backend

WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy backend source
COPY backend/ ./

EXPOSE 3000

# Use Python 3.11 as base for the complete system
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    mpg123 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

WORKDIR /app

# Copy Python requirements and install
COPY mopidy-server/requirements.txt ./mopidy-server/
RUN pip install -r mopidy-server/requirements.txt

# Copy backend from previous stage
COPY --from=backend /app/backend ./backend

# Copy mopidy server
COPY mopidy-server/ ./mopidy-server/

# Copy root package.json and any additional files
COPY package.json ./

# Create audio directory
RUN mkdir -p backend/audio

# Expose ports
EXPOSE 3000 6680 6600

# Create startup script
RUN echo '#!/bin/bash\n\
set -e\n\
echo "Starting Mopidy server..."\n\
cd mopidy-server && python3 server.py --daemon &\n\
echo "Waiting for Mopidy to start..."\n\
sleep 5\n\
echo "Starting Express backend..."\n\
cd backend && npm start\n\
' > start.sh && chmod +x start.sh

CMD ["./start.sh"]
