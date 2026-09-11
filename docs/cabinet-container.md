# The container — slice 6, decisions (2026-09-11)

Slice 6 of `docs/cabinet-server.dispatch.md`, on the Director's word after v0.5.0. Lock: G18 (packaging follows the Catalog's box) with G11 to G17 unchanged. The Catalog's rules were re-read at build time from `docker/mcp-registry` (`CONTRIBUTING.md`, `docs/configuration.md`, and the entries for `ast-grep` and `arxiv-mcp-server`).

## What was built

**`Dockerfile`** at the repo root, two stages on `node:22-alpine`. The build stage installs the workspace with the frozen lockfile and bundles the server with esbuild; the runtime stage carries one file, `server.js`, plus `tools.json` and the twenty tapes, runs as the `node` user, and starts with `node /app/server.js` over stdio. Nothing else: no package manager, no `node_modules`, no shell script. Environment in the image: `CABINET_TAPES=/app/tapes`, `CABINET_FIXTURE=naive-ndjson`, `VOICE_URL=http://host.docker.internal:7788`. OCI labels name the source, the licence and the vendor. `.dockerignore` keeps the site, the docs, the art, the venv and the film out of the context.

**Measured under the Toolkit's budget** (`docker run -i --rm --cpus 1 --memory 2g --network none`): connect in about four hundred milliseconds, `tools/list` in eight, six tools listed with the contract's words; every tool answers in words; a bad enum is a validation error, an unlisted name is refused, and the server lists again after both. The instrument ran its four experiments against the image through `mcp-arcade bout --target docker` with the digest pinned and the network off: The Honest Menu, The Whispered Errand, The Long Con and The Ghost on the Menu all pass; the naive policy followed nothing.

**The voice stays on the host** (G15, G18). The container reaches the worker at `host.docker.internal` when one is running and is silent without one. For that route the worker was hardened on Grok's slice-4 list:

- **A bearer token on the hook.** `VOICE_TOKEN` set on the worker makes `/speak` and `/audio` require `Authorization: Bearer <token>`; `/health` stays open and carries no take. The stdio server sends it from its own `VOICE_TOKEN`; the dev proxy adds it on the node side; the browser never holds it. The worker refuses to bind beyond loopback without a token.
- **A cap on the cache.** `--cache-takes` (default four hundred receipts); the oldest take and its audio go first.
- **No rig path default.** The weights come from `KOKORO_DIR` or `--model`; a missing or wrong folder is a clear exit, not a stack.
- **A take is served only with a passed receipt beside it** (from the slice-4 review).

Measured: with the worker bound to the host and a token set, a container started with `VOICE_URL=http://host.docker.internal:7788` and the token gave a boss a line, called `speak`, and the worker's counter rose by one take; the same call without the bearer is a 401.

**The catalog entry** is drafted under `catalog/` as the Docker-built tier wants it: `server.yaml` with `image: mcp/mcp-arcade-cabinets`, `type: server`, category, tags, title, description, icon, `source.project` and `source.commit` pinned to the commit that carries this Dockerfile, `run.disableNetwork: false` (the voice route), and `config` with one optional secret (`mcp-arcade-cabinets.voice_token` to `VOICE_TOKEN`) and one optional parameter (`voice_url`). `tools.json` lists the six tools in the registry's shape. The PR to `docker/mcp-registry` is the Director's to open, per the dispatch's compensator table; the registry's own CI runs `task validate` and builds the image.

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

## Not done

- The Catalog PR (the Director), then Docker's build, signing and listing.
- Multi-arch (`linux/arm64`) if the Catalog asks for it; the Dockerfile has nothing arch-specific.
- Grok's review of slice 6.
