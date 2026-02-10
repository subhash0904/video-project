FROM node:20-alpine AS base

FROM base AS dependencies
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install

FROM base AS build
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS production
WORKDIR /app

ENV NODE_ENV=production

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

EXPOSE 3000

CMD ["node", "dist/server.js"]
