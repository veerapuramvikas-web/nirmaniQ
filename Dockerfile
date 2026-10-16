# ==========================================
# Build Stage
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Accept build arguments for Vite environment variables
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Set as environment variables during build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Install dependencies first for Docker caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy all source files
COPY . .

# Build Vite SPA application (dist directory created)
RUN npm run build

# ==========================================
# Production Stage (Nginx Alpine)
# ==========================================
FROM nginx:alpine

# Remove default Nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
