# The arcade's cabinets as MCP servers, for the Docker MCP Catalog (G18).
#
# Two stdio servers in one image, every asset baked in: Ghost on the Menu
# (six tools, the persona sheets, the twenty tapes) and, since 0.11.0, Vibe
# Typer (four tools, the levers and the corpus bundled in, the same tapes
# seasoning its wires stack). `CABINET` picks the server: unset or `ghost`
# is the shooter, which is what the Catalog listing describes; `vibe` is
# the typing cabinet. No network is needed to list or to play. Catalog
# default is silent (empty VOICE_URL). A local build with a host worker:
# VOICE_URL=http://host.docker.internal:7788 (and VOICE_TOKEN); the typing
# cabinet's server has no voice hook, so those apply to Ghost only. Budget:
# one CPU and two gigabytes, as the Toolkit gives each server.
#
# Operator tapes: keep /app/tapes baked. Mount a host dir at /tapes-user
# (read-only) and set CABINET_TAPES_USER=/tapes-user; listTapes merges it
# beside the baked twenty. Do not overlay /app/tapes.
#
# The overlay is the shooter's menu and Ghost's alone. The typing cabinet has
# no menu to merge into — its tapes only season the wires stack — so with
# CABINET=vibe the variable is not read, and the server says so once on
# stderr rather than leaving an operator to wonder about the mount.
#
# What each cabinet reads, and nothing else. A variable set for the cabinet
# that does not read it gets one path-free line on stderr at start, and so
# does a value the cabinet cannot use.
#
#   CABINET            both     ghost (or unset) is the shooter, vibe is the typist
#   CABINET_TAPES      both     where the tapes are
#   CABINET_TAPES_USER ghost    operator tapes merged beside the baked menu
#   CABINET_FIXTURE    ghost    which tape the round plays
#   CABINET_TIER       both     zero to three; anything else is a note and the default (one on the shooter, zero on the typing cabinet)
#   CABINET_SEED       both     a whole number; anything else is a note
#   CABINET_BOT        vibe     the typist at the keyboard, e.g. typist:45
#   VOICE_URL          ghost    the host worker's base; empty is silent
#   VOICE_TOKEN        ghost    the worker's bearer, when it binds beyond loopback
#
# Multi-arch: docker buildx build --platform linux/amd64,linux/arm64 .
# No GPU stage. FROM is the node:22-alpine index digest (amd64+arm64), not :latest.

FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS build
RUN corepack enable && corepack prepare pnpm@11.4.0 --activate
WORKDIR /src
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
# Every workspace importer the lockfile names, so a frozen install resolves.
COPY packages/tape-core/package.json packages/tape-core/
COPY packages/ghost-on-the-menu/package.json packages/ghost-on-the-menu/
COPY packages/vibe-typer/package.json packages/vibe-typer/
COPY packages/cabinet-server/package.json packages/cabinet-server/
COPY packages/launcher/package.json packages/launcher/
COPY packages/launcher-vibe-typer/package.json packages/launcher-vibe-typer/
COPY apps/cabinets/package.json apps/cabinets/
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY packages ./packages
RUN pnpm -F @mcp-arcade-cabinets/cabinet-server build

FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32
LABEL org.opencontainers.image.title="mcp-arcade-cabinets" \
      org.opencontainers.image.description="The arcade's cabinets as MCP servers: Ghost on the Menu (six tools a model pulls to sit in the boss of a replay shooter) and, with CABINET=vibe, Vibe Typer (four tools that seat any MCP client as the user of a typing game). Built from MCP servers' own wire." \
      org.opencontainers.image.source="https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.vendor="MCP Tool Shop"
ENV NODE_ENV=production \
    CABINET=ghost \
    CABINET_TAPES=/app/tapes \
    CABINET_TAPES_USER="" \
    CABINET_FIXTURE=naive-ndjson \
    VOICE_URL=""
WORKDIR /app
COPY --from=build /src/packages/cabinet-server/dist/server.js ./server.js
COPY --from=build /src/packages/cabinet-server/dist/server-vibe.js ./vibe.js
COPY fixtures/tapes ./tapes
RUN chown -R node:node /app
USER node
# `CABINET=vibe` runs the typing cabinet; unset or `ghost` is the shooter, and
# anything else is still the shooter — which keeps every existing `docker run`
# of this image meaning what it meant — but says so on stderr first. It is the
# variable with the largest consequence and was the only one the image treated
# as unvalidated: `vibee`, `Vibe` and `typer` all silently ran the shooter.
# `"$@"` forwards whatever the operator appended after the image name; the
# trailing `sh` is `$0` so the first of those lands in `$1`.
ENTRYPOINT ["sh", "-c", "case \"$CABINET\" in vibe) exec node /app/vibe.js \"$@\" ;; ghost|'') exec node /app/server.js \"$@\" ;; *) echo 'CABINET was not understood; the image runs the shooter' >&2 ; exec node /app/server.js \"$@\" ;; esac", "sh"]
