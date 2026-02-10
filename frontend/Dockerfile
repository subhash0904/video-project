# Frontend Dockerfile - Multi-stage build
FROM node:20-alpine AS build
RUN corepack enable && corepack prepare pnpm@10.29.1 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Build-time env vars for Vite
ARG VITE_API_URL=/api
ARG VITE_STREAMING_BASE_URL=/hls
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_STREAMING_BASE_URL=${VITE_STREAMING_BASE_URL}

RUN pnpm run build

# Production - serve with Nginx
FROM nginx:alpine AS production

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
