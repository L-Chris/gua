FROM node:25-alpine

WORKDIR /app

ARG NPM_REGISTRY=https://registry.npmmirror.com
ENV NEXT_TELEMETRY_DISABLED=1
ENV NPM_CONFIG_REGISTRY=$NPM_REGISTRY

RUN apk add --no-cache openssl

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

RUN npm run build \
  && mkdir -p .next/standalone/.next \
  && cp -R .next/static .next/standalone/.next/static \
  && if [ -d public ]; then cp -R public .next/standalone/public; fi

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && HOSTNAME=0.0.0.0 node .next/standalone/server.js"]
