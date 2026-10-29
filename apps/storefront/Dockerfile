# syntax=docker/dockerfile:1
# Production image for the Libas-ul-Fakhar storefront (Next.js standalone output).
# Built by docker-compose.yml at the repository root; see DEPLOY.md.

FROM node:24-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---------------------------------------------------------------- dependencies
FROM base AS deps
COPY package.json package-lock.json ./
# `npm install` (not `npm ci`): the lock file is written on Windows and lacks some
# Linux-only optional packages that sharp needs; versions still follow the lock file.
RUN npm install --no-audit --no-fund

# ---------------------------------------------------------------- build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Public values are baked into the client bundle at build time
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_WHATSAPP
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_WHATSAPP=$NEXT_PUBLIC_WHATSAPP
# The catalogue is prerendered, so the build reads the database. The connection
# string arrives as a build secret: it is never stored in an image layer.
RUN --mount=type=secret,id=database_url \
    DATABASE_URL="$(cat /run/secrets/database_url)" npm run build

# ---------------------------------------------------------------- runtime
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Database setup script and what it needs (migrations, seed catalogue, SQL mapping)
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/db ./db
COPY --from=builder --chown=nextjs:nodejs /app/src/lib ./src/lib

# Uploaded product photos live on a volume mounted here
RUN mkdir -p data/uploads/products && chown -R nextjs:nodejs data
USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/robots.txt >/dev/null || exit 1

# Apply new migrations (and seed an empty database), then start the server
CMD ["sh", "-c", "node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/db.ts setup && exec node server.js"]
