# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Build the static site
RUN npm run build

# Production stage - serve with nginx
FROM nginx:alpine

# Copy built files to nginx
COPY --from=builder /app/.vitepress/dist /usr/share/nginx/html

# Copy custom nginx config for SPA routing with proper cache headers
# Note: No X-Frame-Options to allow embedding in dashboard iframe
RUN echo 'server { \
    listen 3900; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # HTML files - no cache (always fresh) \
    location ~* \.html$ { \
        add_header Cache-Control "no-cache, no-store, must-revalidate"; \
        add_header Pragma "no-cache"; \
        add_header Expires "0"; \
    } \
    \
    location / { \
        try_files $uri $uri/ $uri.html /index.html; \
        # Default no-cache for HTML responses \
        add_header Cache-Control "no-cache, no-store, must-revalidate"; \
        add_header Pragma "no-cache"; \
        add_header Expires "0"; \
    } \
    \
    # Static assets - cache for 1 year (use content hash in filename) \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 3900

CMD ["nginx", "-g", "daemon off;"]
