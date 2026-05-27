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
# --shamefully-hoist hoists all packages to root node_modules so externalized
# modules (bcrypt, @prisma/client, etc.) are resolvable at runtime from /app.
RUN pnpm install --frozen-lockfile --shamefully-hoist

# Source + build
COPY --from=pruner /app/out/full/ .
# turbo prune does not include root-level config files — copy manually
COPY --from=pruner /app/tsconfig.base.json ./tsconfig.base.json
RUN pnpm --filter @maoleaw/shared build
RUN pnpm --filter @maoleaw/db generate
RUN pnpm --filter @maoleaw/api build

# ──────────────────────────────────────────────────────────
# Stage 3: runner — production image
# pnpm uses a virtual store (.pnpm/) with symlinks, so we copy
# the entire node_modules to avoid broken symlink resolution.
# ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat dumb-init openssl
WORKDIR /app
ENV NODE_ENV=production PORT=4000

# Webpack bundle
COPY --from=builder /app/apps/api/dist ./dist

# Full node_modules (includes pnpm virtual store + all symlinks)
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:4000/v1/health || exit 1

USER node
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
