# ==========================================
# STAGE 1: Build & Dependencies
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias necesarias para Prisma en Alpine
RUN apk add --no-cache openssl libc6-compat

# Copiar manifiestos de paquetes
COPY package*.json ./
COPY prisma ./prisma/

# Instalar todas las dependencias (incluyendo devDeps para compilar)
RUN npm ci

# Generar el cliente de Prisma
RUN npx prisma generate

# Copiar el código fuente y compilar TypeScript
COPY tsconfig*.json ./
COPY src ./src/
RUN npm run build

# Purgar dependencias de desarrollo para dejar solo las de producción
RUN npm prune --omit=dev && npm cache clean --force

# ==========================================
# STAGE 2: Lightweight Production Runtime
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

# Variables de entorno de producción
ENV NODE_ENV=production
ENV PORT=3000

# dumb-init para manejo correcto de señales de kernel (PID 1) y OpenSSL para Prisma engine
RUN apk add --no-cache openssl dumb-init libc6-compat

# Copiar únicamente artefactos compilados, cliente de prisma y dependencias limpias
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

# Asignar propiedad a usuario sin privilegios incluido en Alpine
USER node

EXPOSE 3000

# Entrada con dumb-init para permitir graceful shutdown de Node
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/index.js"]