FROM node:22-alpine AS base

FROM base AS deps
WORKDIR /app

RUN echo "https://mirror.arvancloud.ir/alpine/v3.20/main" > /etc/apk/repositories \
 && echo "https://mirror.arvancloud.ir/alpine/v3.20/community" >> /etc/apk/repositories \
 && apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci --prefer-offline --no-audit --progress=false


FROM base AS builder
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

ARG EXTERNAL_API_KEY
ENV EXTERNAL_API_KEY=$EXTERNAL_API_KEY

COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY prisma/bins/schema-engine-linux-musl-openssl-3.0.x /app/node_modules/@prisma/engines/schema-engine-linux-musl-openssl-3.0.x
# Generate Prisma client
ENV PRISMA_SCHEMA_ENGINE_BINARY=/app/node_modules/@prisma/engines/schema-engine-linux-musl-openssl-3.0.x
RUN npx prisma generate

# Force Prisma CLI/engines to be present during build
RUN npx prisma --version

RUN npm run build


FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true
ENV PORT=3000
ENV PRISMA_SCHEMA_ENGINE_BINARY=/app/node_modules/@prisma/engines/schema-engine-linux-musl-openssl-3.0.x
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

RUN mkdir -p public

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# copy full node_modules from builder, not deps
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts

USER nextjs

EXPOSE 3000

CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node server.js"]
