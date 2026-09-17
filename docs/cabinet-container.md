# The container — slice 6, decisions (2026-09-11)

Slice 6 of `docs/cabinet-server.dispatch.md`, on the Director's word after v0.5.0. Lock: G18 (packaging follows the Catalog's box) with G11 to G17 unchanged. The Catalog's rules were re-read at build time from `docker/mcp-registry` (`CONTRIBUTING.md`, `docs/configuration.md`, and the entries for `ast-grep` and `arxiv-mcp-server`).

## What was built

**`Dockerfile`** at the repo root, two stages on `node:22-alpine`. The build stage installs the workspace with the frozen lockfile and bundles the server with esbuild; the runtime stage carries one file, `server.js`, plus `tools.json` and the twenty tapes, runs as the `node` user, and starts with `node /app/server.js` over stdio. Nothing else: no package manager, no `node_modules`, no shell script. Environment in the image: `CABINET_TAPES=/app/tapes`; `CABINET_FIXTURE` is baked empty and given its default on the shooter's branch of the entrypoint, so the typing cabinet never sees a variable it does not read; `VOICE_URL` is empty by default (silent), and a host worker is reached by setting it at run time. OCI labels name the source, the license and the vendor. `.dockerignore` keeps the site, the docs, the art, the venv and the film out of the context.

**Measured under the Toolkit's budget** (`docker run -i --rm --cpus 1 --memory 2g --network none`): connect in about four hundred milliseconds, `tools/list` in eight, six tools listed with the contract's words; every tool answers in words; a bad enum is a validation error, an unlisted name is refused, and the server lists again after both. The instrument ran its four experiments against the image through `mcp-arcade bout --target docker` with the digest pinned and the network off: The Honest Menu, The Whispered Errand, The Long Con and The Ghost on the Menu all pass; the naive policy followed nothing.

**The voice stays on the host** (G15, G18). The container reaches the worker at `host.docker.internal` when one is running and is silent without one. For that route the worker was hardened on Grok's slice-4 list:

- **A bearer token on the hook.** `VOICE_TOKEN` set on the worker makes `/speak` and `/audio` require `Authorization: Bearer <token>`; `/health` stays open and carries no take. The stdio server sends it from its own `VOICE_TOKEN`; the dev proxy adds it on the node side; the browser never holds it. The worker refuses to bind beyond loopback without a token.
- **A cap on the cache.** `--cache-takes` (default four hundred receipts); the oldest take and its audio go first.
- **No rig path default.** The weights come from `KOKORO_DIR` or `--model`; a missing or wrong folder is a clear exit, not a stack.
- **A take is served only with a passed receipt beside it** (from the slice-4 review).

Measured: with the worker bound to the host and a token set, a container started with `VOICE_URL=http://host.docker.internal:7788` and the token gave a boss a line, called `speak`, and the worker's counter rose by one take; the same call without the bearer is a 401.

**The catalog entry** is drafted under `catalog/` as the Docker-built tier wants it: `server.yaml` with `image: mcp/mcp-arcade-cabinets`, `type: server`, category, tags, title, description, icon, `source.project` and `source.commit` pinned to the commit that carries this Dockerfile, `run.disableNetwork: false` (the voice route), and `config` with one optional secret (`mcp-arcade-cabinets.voice_token` to `VOICE_TOKEN`) and one optional parameter (`voice_url`). `tools.json` lists the six tools in the registry's shape. The PR to `docker/mcp-registry` is the Director's to open, per the dispatch's compensator table; the registry's own CI runs `task validate` and builds the image.

## The polish wave (2026-09-17, wave 11 of the dogfood swarm)

Three things an operator reaches that the image could not answer before. Both stdio entries branch on their first argument: `--version` prints the server's name and version, `--help` or `-h` prints a usage with that cabinet's levers and the image's variable table (the rows live once in `packages/cabinet-server/src/env.ts`, held to the Dockerfile's canonical table by the surfaces test), and anything else is the old behavior, so no existing `docker run` changes meaning. Both entries register the stop signals: one tagged line on stderr, the transport closed, exit zero, so `docker stop` and a Toolkit shutdown end the container at once instead of waiting out the grace period; the launcher's `--mcp` child gets the same. And an unset `VOICE_URL` now means no voice: a start where the operator said nothing plays silent and `speak` says the cabinet has no voice, instead of probing an unconfigured loopback port and reporting that no worker answered; the bare default is still one variable away. The `tapes` tool marks each card as baked or added by the operator and names the one the round is playing, and the shooter's `view` says when the round was replaced, in the typing cabinet's own words and position. Details and ids in `docs/dogfood-swarm.md`.

The 0.12.0 image (the release that carries the polish wave's help, version, stop signal and voice default) is manifest list `sha256:1d882879d6ea8c4ef294fe0195ed7c5dd7ca1adbe52c71e21d43c0d799272518`, `linux/amd64` and `linux/arm64`, 240 MB on amd64, pulled back from the registry and smoked: both cabinets answer their version and list their tools with the network off under one CPU and two gigabytes, and `docker stop` ends the container in under half a second.

## What was measured, in numbers

| Check                                                  | Result                                                                                                                                                                                                                                                    |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Image                                                  | `ghcr.io/mcp-tool-shop-org/mcp-arcade-cabinets:0.5.0`, digest `sha256:743a9eda…3bca75`, `node:22-alpine`, one bundled file; pushed by the Director after refreshing the token's packages scope; the published filesystem re-fetched by digest scans clean |
| Connect over stdio, one CPU, two gigabytes, no network | ~0.4 s                                                                                                                                                                                                                                                    |
| `tools/list`                                           | 8 ms, six tools                                                                                                                                                                                                                                           |
| `mcp-arcade bout --target docker`                      | four experiments pass, digest pinned                                                                                                                                                                                                                      |
| Worker without bearer                                  | 401 on `/speak` and `/audio`; 200 on `/health`                                                                                                                                                                                                            |
| Container to host worker with bearer                   | one take spoken and receipted                                                                                                                                                                                                                             |

## What was refused, and why

- **The voice in the image.** The Toolkit's box is one CPU and two gigabytes and no GPU; Kokoro and the ASR stay on the host (G15, the GPU advisory).
- **Binding the worker beyond loopback without a token.** Refused by the worker itself.
- **Baking the venv or the weights into any image.** The worker is a host tool; its weights are licence-clean but large and belong to the host.
- **Opening the Catalog PR from here.** The dispatch names the Director as the owner of that irreversible action.

## Grok's review (2026-09-11, `docs/cabinet-container.review.md`)

No halt. Two changes, both applied the same day: `speak` now says "the voice is silent: no worker answers" when a worker is configured but does not answer, decided by a liveness probe with a two-hundred-millisecond abort that runs at start and every fifteen seconds and by every take's outcome, never on the beat; and the worker's `/health` is a liveness word (`ok`, the engine) with the voice list, cache size and counters moved to `/stats` behind the bearer. Held as advised: no ajv copied into the image; `source.commit` moved only because the server code the image is built from changed. For the Director, Grok's paragraph: check the pin, the icon and `disableNetwork` before the PR; stop the waves at fifteen percent; a fourth lamp is a new lever with its own band pass, never a silent extra.

## v0.6.0

The image was rebuilt from the v0.6.0 tree (the shift and the music do not enter the server; the fix from Grok's review does) and pushed as `ghcr.io/mcp-tool-shop-org/mcp-arcade-cabinets:0.6.0` (digest `sha256:3b6c80ea…85b95b`; re-fetched by digest, the `/app` layer scans clean and the server answers with its version); the catalog's `source.commit` is re-pinned to the release commit. The exported filesystem's `/app` layer scans clean; the base image's own files (Node's contributor list, Yarn's example path, Alpine's copyright line) trip the scanner's generic patterns and carry nothing of the operator.

## The Catalog PR (2026-09-11)

Opened on the Director's decision as [docker/mcp-registry#5061](https://github.com/docker/mcp-registry/pull/5061), with the network off: the Catalog cabinet is sealed (`run.disableNetwork: true`, no voice config), since the voice worker is a host GPU stack no Catalog user runs and the cabinet says the voice is silent without one. The voice route stays documented here for a local build. The pin is the v0.6.0 release commit; the icon is the brand logo; `tools.json` is in the registry's `inputSchema` shape. Their `task validate` passes every check (the title had to be title-cased and the icon under five hundred and twelve pixels, so the brand repo gained a small `icon.png`) and their `task build --tools` read the six tools and built the image from the pinned commit, both run here in a Go container before the PR went out.

## Not done

- Docker's review of the Catalog PR, then their build, signing and listing.
- Multi-arch (`linux/arm64`) if the Catalog asks for it; the Dockerfile has nothing arch-specific.

## 0.11.0 — both cabinets in one image (2026-09-16)

The image carries two stdio servers since 0.11.0: `/app/server.js` (Ghost, the six tools, as before) and
`/app/vibe.js` (Vibe Typer, the four tools of `tools.vibe.json`, the levers and the corpus bundled in by
esbuild, the twenty tapes seasoning its wires stack through `CABINET_TAPES`). `CABINET=vibe` selects the typing
cabinet; unset or anything else is the shooter, so every existing `docker run` keeps meaning what it meant, and
the Catalog listing under `catalog/` stays Ghost's. The build stage now copies every workspace importer the
lockfile names (the launchers and `vibe-typer` joined the workspace after 0.7.0, the last image), and the
entrypoint is a one-line `sh` case rather than a second image, because the two servers share their build and
their tapes and differ only in which bundle starts. Measured on this rig: both cabinets list their tools with
the network off under one CPU and two gigabytes, the app layer scans clean, and the image is pushed to GHCR as
`ghcr.io/mcp-tool-shop-org/mcp-arcade-cabinets:0.11.0` for `linux/amd64` and `linux/arm64` (manifest list `sha256:312068b2bc8465454c77ef0e4c19dbb9ceb2ebee74dfc9efe60d5a25f5105346`, 229 MB on amd64). The typing
cabinet's server has no voice hook, so `VOICE_URL` and `VOICE_TOKEN` apply to Ghost only. A Vibe entry in the
Docker MCP Catalog is a separate registry PR, the Director's, with `CABINET=vibe` in its `run.env`.

The 0.11.1 image (the release that carries the proofread and the server constants at 0.11.1) is manifest list
`sha256:f8c9d22e868f31b152c74a55677f3a35e21563712161947011488592c7a36676`, amd64 and arm64, pulled back from
the registry and smoked the same way: both cabinets list their tools with the network off.
