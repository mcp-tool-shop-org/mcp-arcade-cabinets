# Review — slice 6, the container, and the 0.5.0 tuning

Grok, sim owner. Read against G1, G7–G10, G11–G18; G18 is the one this slice builds. Diffs: `v0.5.0..main` (`d00d7c2` the image, `c1c54e0` the pin) and `fe47dae..b4c5a33` (the tuning). The lock is not re-derived. Nothing is tagged.

No halt in this lane. The sim, its tests, and `tape-core` are unchanged by this review. This file is the report.

---

## 1. G18 in the Dockerfile — **hold**

The runtime image is `server.js`, `tools.json`, and `tapes/` (measured: those three names, user `node`, `ENTRYPOINT node /app/server.js`). Personas, patterns and the SDK are inside the bundle. The voice is not. `.dockerignore` keeps the site, the docs, the venv and the film out. That is everything the server needs, and nothing else.

The ajv `require("ajv/dist/runtime/…")` strings in the bundle (`packages/cabinet-server/dist/server.js:2903` and the four beside it) are codegen templates, not live loads. The six tools register through zod (`server.ts:144`). The measured paths never compile an ajv schema, so they never resolve those modules. Safe for the contract as shipped. A future SDK path that did compile a JSON Schema inside the image would crash; do not copy `ajv` into alpine to paper over templates that do not run.

`node:22-alpine` is the right base for this stdio server: no GPU, no native addons, LTS. Signatures, provenance and the SBOM are Docker's build of the Docker-built tier, not Dockerfile lines. The OCI labels (`Dockerfile:22`) name source, licence and vendor; `image.revision` is theirs to stamp. Multi-arch is the not-done they already wrote.

## 2. Graceful degradation — **change**

`host.speak` (`host.ts:135`) is synchronous: it hands the job to the hook and returns `queued`. The stdio server's hook fires `speakLine` with `void` (`server.ts:103`). A worker that is not there is `catch` → `no worker` (`voice.ts:94`). The MCP handler does not await that fetch (`server.ts:147` is `cabinet.call`, which does not wait on the worker). Stdio is not blocked. A slow worker does not move the beat (G11, G13).

The guest is not told. `speak` answers "the boss will speak its line" whenever the hook exists (`cabinet.ts:154`), including when `VOICE_URL` points at a dead `host.docker.internal`. "The voice is silent on this cabinet" is only when `VOICE_URL` is empty. G18 is silent _and says so_. Return `silent` (or wait on a short abort and then say so) when `speakLine` comes back `no worker`. Do not hang the beat to find out; a 200 ms abort is enough to distinguish refused from missing.

## 3. The worker's surface after hardening — **change**

The slice-4 list is in: bearer on `/speak` and `/audio` (`worker.py:229`), bind beyond loopback refused without a token (`worker.py:330`), cache cap with oldest-first eviction (`worker.py:200`), no rig path default (`worker.py:324`), `/audio` served only with a passed receipt (`worker.py:256`).

With a token and a bind on the LAN, a caller who has the token can fill the cache to the cap and read any take `/speak` just returned. That is the token doing its job. `/health` is open and names the engine, the ASR, the device, the voice list, the cache size and the counters (`worker.py:239`). That is more than a liveness check. Cut it to `ok` (and, if you must, the engine word). The cap at four hundred, audio with receipt, is the right shape.

## 4. The catalog entry — **hold**

`catalog/server.yaml` matches the live `configuration.md` and the local-server examples: `image: mcp/mcp-arcade-cabinets`, `type: server`, `source.commit` pinned to `d00d7c2` (the commit that carries the Dockerfile, full hash), optional secret `mcp-arcade-cabinets.voice_token` → `VOICE_TOKEN`, optional `voice_url` parameter into `VOICE_URL`. `run.disableNetwork: false` is justified only by the voice route; ast-grep sets `true` because it has no host hop. Ship `catalog/tools.json` as the sibling the registry will read, and let Docker's CI launch the image too. The file can drift from the bundle; the launch is G18.

## 5. The tuning — **hold**

`waveProgress` (`patterns.ts:624`) is wave index over wave count. `copiesAt` / `intensityAt` interpolate the schema'd levers. `fireScale` (`sim.ts:116`) and `spawnDecoys` (`sim.ts:666`) read those and the seed's burst window. Decoys are `lie: false`. None of it keys motion, look or timing on a fact. The slowed clocks are `waves.json` min/max and `fire.json` periods, data, same factor. Fifteen percent is the right place to stop: the live sweeper sits on the bar (five deaths of twenty). Do not push duration past the andon.

## 6. Diff one vs the sim — **hold**

`git diff --name-only v0.5.0..main` does not touch `packages/ghost-on-the-menu`, `packages/tape-core`, or `fixtures/tapes`. The band and the tapes did not move.

---

## What I changed

Nothing in `packages/ghost-on-the-menu` or `packages/tape-core`. No halt in this lane. This file is the commit.

## What Claude should change

In the container and the worker (not done here):

1. `speak` should say the voice is silent when the worker is unreachable, without waiting on the beat (a short abort, then the silent words).
2. `/health` should not list voices, cache size or counters on an open port.

Do not copy ajv into the image. Do not move `source.commit` off `d00d7c2` unless the Dockerfile moves. Do not start slice 5 from this review.

## For the Director

**The Catalog PR.** Copy `catalog/server.yaml` and `catalog/tools.json` into `servers/mcp-arcade-cabinets/` on a fork of `docker/mcp-registry`. Check three things before you open it: the pinned `source.commit` is still `d00d7c2` (the Dockerfile, not a later docs pin); the icon URL loads; `disableNetwork: false` is a choice you want in the Catalog (it is the whole network, for the voice hop, not a host-only route). If Catalog users will not run a worker, set it `true` and keep voice as local-dev. Let their CI launch the image. Do not bake a token.

**Longer waves.** Stop at fifteen percent. The band is the andon and the sweeper is on it. A third longer killed nine of twenty with every clock slowed, bursts on or off; that is a wall, not a tune. A fourth lamp on the long tiers is a new lever, with its own band pass, not a silent extra. Do not relax the bar to fit a longer round.
