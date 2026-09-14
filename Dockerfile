# Ghost on the Menu — the cabinet as an MCP server, for the Docker MCP Catalog (G18).
#
# One stdio server, every asset baked in: the bundled server, the tool
# contract, the persona sheets and the twenty tapes. No network is needed
# to list or to play. Catalog default is silent (empty VOICE_URL). A local
# build with a host worker: VOICE_URL=http://host.docker.internal:7788
# (and VOICE_TOKEN). Budget: one CPU and two gigabytes, as the Toolkit gives
# each server.
#
# Operator tapes: keep /app/tapes baked. Mount a host dir at /tapes-user
# (read-only) and set CABINET_TAPES_USER=/tapes-user; listTapes merges it
# beside the baked twenty. Do not overlay /app/tapes.
#
# Multi-arch: docker buildx build --platform linux/amd64,linux/arm64 .
# No GPU stage. FROM is the node:22-alpine index digest (amd64+arm64), not :latest.

FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS build
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

FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32
LABEL org.opencontainers.image.title="Ghost on the Menu" \
      org.opencontainers.image.description="Ghost on the Menu as an MCP server: six tools a model pulls to sit in the boss of an arcade shooter where the player is the agent, built from MCP servers' own wire." \
      org.opencontainers.image.source="https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.vendor="MCP Tool Shop"
ENV NODE_ENV=production \
    CABINET_TAPES=/app/tapes \
    CABINET_TAPES_USER="" \
    CABINET_FIXTURE=naive-ndjson \
    VOICE_URL=""
WORKDIR /app
COPY --from=build /src/packages/cabinet-server/dist/server.js ./server.js
COPY fixtures/tapes ./tapes
RUN chown -R node:node /app
USER node
ENTRYPOINT ["node", "/app/server.js"]
