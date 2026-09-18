# Etapa 1: Build de Vite
FROM node:20-alpine AS builder
WORKDIR /app

# Inyectamos la URL de la API y la clave pública de Clerk
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

ARG VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Etapa 2: Servidor Nginx ligero
FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]