# Production image for apps/api, deployed to Cloud Run (ADR 0002).
# Build context is the pruned output, not the repo:
#   pnpm nx run api:prune
#   docker build -f apps/api/Dockerfile dist/apps/api
# `prune` writes main.js, a package.json with only the API's runtime
# dependencies and a matching pnpm-lock.yaml.

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-slim AS deps
# Same pnpm as the workspace (root package.json `packageManager`).
ARG PNPM_VERSION=10.28.0
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY workspace_modules ./workspace_modules
RUN pnpm install --prod --frozen-lockfile

FROM node:${NODE_VERSION}-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json main.js ./
USER node
# Cloud Run sets PORT (8080); main.ts reads it.
EXPOSE 8080
CMD ["node", "main.js"]
