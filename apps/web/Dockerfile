FROM node:22-bookworm-slim
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
COPY . .
RUN pnpm install --frozen-lockfile
EXPOSE 5173
CMD ["pnpm", "--filter", "@hirebit/web", "dev"]
