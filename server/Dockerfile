FROM node:18-alpine

WORKDIR /usr/src/app

# Install pnpm, NestJS CLI and ts-node globally
RUN npm install -g pnpm @nestjs/cli ts-node

# Copy package files
COPY package*.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

# Copy source code and config files
COPY . .

# Install additional dependencies
RUN pnpm add -D @types/node @types/express @types/socket.io
RUN pnpm add @nestjs/cache-manager@2.1.0 cache-manager@5.2.3

# Build the application
RUN pnpm run build

# List contents of dist directory for debugging
RUN ls -la dist/

# Clean up development dependencies
RUN pnpm prune --prod

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "dist/main"]