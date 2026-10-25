FROM node:22-bookworm-slim
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter @hirebit/api db:generate
EXPOSE 3000
CMD ["pnpm", "--filter", "@hirebit/api", "dev"]
