# Ghost on the Menu — the cabinet as an MCP server, for the Docker MCP Catalog (G18).
#
# One stdio server, every asset baked in: the bundled server, the tool
# contract, the persona sheets and the twenty tapes. No network is needed
# to list or to play. Catalog default is silent (empty VOICE_URL). A local
# build with a host worker: VOICE_URL=http://host.docker.internal:7788
# (and VOICE_TOKEN). Budget: one CPU and two gigabytes, as the Toolkit gives
# each server.

FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@11.4.0 --activate
WORKDIR /src
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/tape-core/package.json packages/tape-core/
COPY packages/ghost-on-the-menu/package.json packages/ghost-on-the-menu/
COPY packages/cabinet-server/package.json packages/cabinet-server/
COPY apps/cabinets/package.json apps/cabinets/
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY packages ./packages
RUN pnpm -F @mcp-arcade-cabinets/cabinet-server build

FROM node:22-alpine
LABEL org.opencontainers.image.title="Ghost on the Menu" \
      org.opencontainers.image.description="Ghost on the Menu as an MCP server: six tools a model pulls to sit in the boss of an arcade shooter where the player is the agent, built from MCP servers' own wire." \
      org.opencontainers.image.source="https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.vendor="MCP Tool Shop"
ENV NODE_ENV=production \
    CABINET_TAPES=/app/tapes \
    CABINET_FIXTURE=naive-ndjson \
    VOICE_URL=""
WORKDIR /app
COPY --from=build /src/packages/cabinet-server/dist/server.js ./server.js
COPY fixtures/tapes ./tapes
RUN chown -R node:node /app
USER node
ENTRYPOINT ["node", "/app/server.js"]
