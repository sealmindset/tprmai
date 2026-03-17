FROM node:20-alpine AS base

# Install OpenSSL for Prisma compatibility on Alpine
RUN apk add --no-cache openssl

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Allow npm/prisma to work behind corporate SSL proxies (e.g., Zscaler)
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
RUN npm ci
RUN npx prisma generate
ENV NODE_TLS_REJECT_UNAUTHORIZED=1

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_TLS_REJECT_UNAUTHORIZED=0
RUN npx prisma generate
ENV NODE_TLS_REJECT_UNAUTHORIZED=1

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Compile seed.ts to seed.js using TypeScript compiler API
RUN node -e "const ts=require('typescript'),fs=require('fs');const s=fs.readFileSync('prisma/seed.ts','utf8');const r=ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}});fs.writeFileSync('prisma/seed.js',r.outputText);console.log('Compiled seed.ts -> seed.js');"

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma schema for runtime migration and seeding
COPY --from=builder /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder /app/prisma/seed.js ./prisma/seed.js
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=deps /app/node_modules/prisma ./node_modules/prisma

# Copy entrypoint script
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./entrypoint.sh"]
