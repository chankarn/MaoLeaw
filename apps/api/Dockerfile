# ──────────────────────────────────────────────────────────
# Stage 0: base — Alpine Node + pnpm
# ──────────────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# ──────────────────────────────────────────────────────────
# Stage 1: pruner — extract only the API workspace subtree
# ──────────────────────────────────────────────────────────
FROM base AS pruner
WORKDIR /app
RUN pnpm add -g turbo@2
COPY . .
RUN turbo prune @maoleaw/api --docker

# ──────────────────────────────────────────────────────────
# Stage 2: builder — install, generate Prisma client, build
# ──────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

# Install step is cached separately from source changes
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

# Source + build
COPY --from=pruner /app/out/full/ .
RUN pnpm --filter @maoleaw/db generate
RUN pnpm --filter @maoleaw/api build

# ──────────────────────────────────────────────────────────
# Stage 3: runner — lean production image
# Webpack bundles all app source into dist/main.js.
# Only the externals (@prisma/client, bcrypt) need node_modules.
# ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat dumb-init
WORKDIR /app
ENV NODE_ENV=production PORT=4000

# Webpack bundle
COPY --from=builder /app/apps/api/dist ./dist

# Prisma: JS client + generated client + query-engine binary (linux-musl)
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# bcrypt: native module externalized from webpack
COPY --from=builder /app/node_modules/bcrypt ./node_modules/bcrypt

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:4000/v1/health || exit 1

USER node
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
