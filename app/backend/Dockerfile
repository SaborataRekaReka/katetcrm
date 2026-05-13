FROM node:20-bookworm-slim AS deps
WORKDIR /app

RUN apt-get update -y \
	&& apt-get install -y --no-install-recommends openssl ca-certificates \
	&& rm -rf /var/lib/apt/lists/*

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

FROM node:20-bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update -y \
	&& apt-get install -y --no-install-recommends openssl ca-certificates wget \
	&& rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY package*.json ./
COPY prisma ./prisma
COPY --from=build /app/dist ./dist

EXPOSE 3001

CMD ["sh", "-lc", "npx prisma migrate deploy && node dist/src/main.js"]
