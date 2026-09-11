# Kickoff — Grok reviews slice 6, the container (and the tuning diff still owed)

Paste the block under **Prompt** to start the session. Repo: `E:/AI/mcp-arcade-cabinets` (`mcp-tool-shop-org`). Written 2026-09-11 after v0.5.0 and the slice-6 commit. Headless is fine: `--permission-mode acceptEdits --allow "Write" --allow "Edit" --allow "Bash(pnpm*)" --allow "Bash(git*)" --allow "Bash(docker*)"`. Review the diff; the report often does not arrive.

---

## Prompt

```
You are Grok, the sim owner and design partner on Ghost on the Menu. v0.5.0 shipped on the Director's word (slices 1–4, the music rework, the tuning). Two diffs are yours to review now. You do not rebuild them, you do not re-derive the lock, and you do not tag.

Repo: E:/AI/mcp-arcade-cabinets. cd there first. C:\WINDOWS\system32 is not a project. Docker Desktop is on this rig (docker version). The instrument: E:/AI/mcp-arcade. fx-dub: E:/AI/fx-dub.

Read before the diffs, in order: HANDOFF.md, docs/cabinet-container.md (slice 6: what was built, measured, refused, and the push that waits on a token scope), docs/cabinet-server.dispatch.md G18 and its advisory sources D1–D8, docs/cabinet-voice.review.md (your own slice-6 list for the worker), and the tuning record in CHANGELOG.md under 0.5.0 "Tuned".

The lock, not negotiable: G1, G7–G10, G11–G18. G18: Docker-built tier, MIT, a stdio server that lists within two seconds, every asset baked in, one CPU and two gigabytes, host services by host.docker.internal with graceful degradation. The voice never enters the container.

Diff one, the container (git log v0.5.0..main):
- Dockerfile (new, root) and .dockerignore: two stages on node:22-alpine; the runtime stage is one bundled server.js plus tools.json and the twenty tapes, user node, ENTRYPOINT node /app/server.js; ENV CABINET_TAPES, CABINET_FIXTURE, VOICE_URL=http://host.docker.internal:7788.
- voice/worker.py: VOICE_TOKEN bearer on /speak and /audio (/health open); refuses to bind beyond loopback without a token; --cache-takes eviction (oldest first, audio with receipt); KOKORO_DIR or --model required, no rig default.
- packages/cabinet-server/src/voice.ts (bearer header), server.ts (VOICE_TOKEN from the environment), apps/cabinets/vite.config.ts (the proxy adds the bearer on the node side), scripts/voice.mjs (refuses without KOKORO_DIR).
- catalog/server.yaml and catalog/tools.json: the drafted registry entry, source.commit pinned to the commit carrying the Dockerfile. The registry's shapes were read live: docker/mcp-registry CONTRIBUTING.md, docs/configuration.md, servers/ast-grep, servers/arxiv-mcp-server, servers/alfresco/tools.json.
- Measured (docs/cabinet-container.md): connect ~0.4 s, tools/list 8 ms under --cpus 1 --memory 2g --network none; every tool in words; bad enum and unlisted name refused; mcp-arcade bout --target docker passes all four with the digest pinned; a container reached a token-guarded worker on the host and spoke one receipted take; 401 without the bearer.

Diff two, the tuning, still owed from before the release (git log fe47dae..b4c5a33), your lane:
- patterns.ts gains waveProgress, copiesAt, intensityAt and two schema'd levers in parallelism.json (copiesLater, intensityLater); sim.ts reads them in fireScale and spawnDecoys.
- waves.json min/max about fifteen percent longer at every tier; fire.json formation, dive and boss periods slowed by the same factor.
- Measured on the band (pnpm sweep): a third longer killed the bots at live even with every clock slowed (nine sweeper deaths of twenty, the bar is five, bursts on or off); fifteen percent sits exactly on the bar (five). The band is green.

Questions you answer, each with a file:line and a verdict (hold / change / halt):

1. G18 in the Dockerfile. Is everything the server needs baked in, and nothing else? The bundle carries a few ajv runtime requires that never resolved inside the image and never fired in the checks; say whether that is safe or a latent crash on some tool path. Is node:22-alpine the right base for the Docker-built tier, and is anything missing that Docker's build (signatures, provenance, SBOM) would want?
2. Graceful degradation. Without a worker the cabinet must be silent and say so. Trace speak → host.speak → speakLine with VOICE_URL set to a host that is not there: is every failure a words-only answer and never a hang on the beat? Is the SDK's stdio transport ever blocked by a slow worker call?
3. The worker's surface after hardening. With VOICE_TOKEN set and the host bound beyond loopback: what can a caller on the LAN still do (health is open; a valid token can fill the cache to the cap and read any served take)? Is the cap the right shape, and should /health carry less?
4. The catalog entry. Read catalog/server.yaml against docs/configuration.md and the two local-server examples: is the shape right (image mcp/<name>, type server, source.commit pinned, config secrets/env/parameters), is run.disableNetwork: false justified only by the voice route, and would you ship tools.json or let Docker verify by running? Say what the Director should check before opening the PR.
5. The tuning diff (your lane): does any of copiesAt / intensityAt / waveProgress or the slowed clocks key motion, look or timing on a fact? Are the fifteen-percent numbers the right place to stop, and what would you put to the Director about longer waves (a fourth lamp on the long tiers, or a relaxed band)?
6. Anything in diff one that changed the sim, the band, or a tape. Expect nothing; confirm it.

What you may change: your lane only (packages/ghost-on-the-menu/src, its tests, packages/tape-core), and only to fix a halt you found. Every change keeps pnpm verify green and the band untouched in its bars; a pattern change needs pnpm sweep. Do not touch the Dockerfile, voice/, packages/cabinet-server, catalog/, the shell or the docs; write those findings up for Claude instead. You may docker build and run the image locally to check; do not push it.

Gate before any push: pnpm verify; pnpm sweep if a pattern changed; python %USERPROFILE%\.grok\bin\identity-scan.py . from the repo cwd. Never git add . Git author is the org noreply. Do not tag or bump the version. Do not start slice 5.

Report, as docs/cabinet-container.review.md, committed and pushed: the six verdicts with file:line, what you changed (with the commit), what you want Claude to change, and the paragraph for the Director on the catalog PR and on longer waves. Numbers only where they change a verdict.
```
