# Multi-Stage Production Dockerfile for Rad Suite Core (<80 lines)
FROM node:24-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
    libc6-dev \
    libsqlite3-dev \
    python3 \
    make \
    g++ \
    wget \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Builder stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# Runner stage
FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4125
ENV HOSTNAME="0.0.0.0"

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/scripts ./scripts

# Create mount points for persistent database and radatlas cache
RUN mkdir -p /app/radatlas /app/db_backups /app/plugins && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 4125

CMD ["node", "./node_modules/next/dist/bin/next", "start", "-p", "4125"]
