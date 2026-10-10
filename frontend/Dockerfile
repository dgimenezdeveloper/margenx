# ==========================================
# STAGE 1: Build SPA Assets
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Argumentos requeridos en tiempo de build por Vite
ARG VITE_API_URL
ARG VITE_CLERK_PUBLISHABLE_KEY

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY

# Cache de paquetes
COPY package*.json ./
RUN npm ci

# Copiar código fuente y compilar
COPY . .
RUN npm run build

# ==========================================
# STAGE 2: Nginx Minimal Static Web Server
# ==========================================
FROM nginx:1.27-alpine AS runner

# Copiar configuración optimizada para SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar estáticos compilados desde el builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# Healthcheck interno del contenedor web
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]