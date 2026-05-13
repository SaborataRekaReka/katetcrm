FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM deps AS build
WORKDIR /app

COPY nest-cli.json ./
COPY tsconfig*.json ./
COPY prisma ./prisma
COPY src ./src
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY prisma ./prisma
COPY --from=build /app/dist ./dist

EXPOSE 3001

CMD ["sh", "-lc", "npx prisma migrate deploy && node dist/main.js"]
