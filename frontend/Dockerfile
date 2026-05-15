# ────────────────────────────────────────────────────────────────
# Frontend Dockerfile — multi-stage build
# Stage 1 (builder): compile React app to static files
# Stage 2 (runtime): serve via Nginx + reverse-proxy /api/* to backend
# ────────────────────────────────────────────────────────────────

# ─── Stage 1: Build ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy lock files first for better caching
COPY package*.json ./
RUN npm install

# Copy the rest and build
COPY . .
RUN npm run build
# Output: /app/dist (static HTML/JS/CSS bundle)

# ─── Stage 2: Serve with Nginx ──────────────────────────────────
FROM nginx:alpine

# Replace default Nginx config with our SPA + reverse-proxy config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled React bundle
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]