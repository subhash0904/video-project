# Backend Dockerfile - Multi-stage build
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.29.1 --activate
WORKDIR /app

# Install all dependencies + build
FROM base AS build
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY src ./src/
RUN pnpm run build
RUN pnpm prisma generate
# Prune to production deps only
RUN pnpm prune --prod

# Final production image
FROM node:20-alpine AS production
WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma/
COPY package.json ./

# Create upload directories
RUN mkdir -p uploads/raw uploads/processed uploads/thumbnails

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["node", "dist/server.js"]
