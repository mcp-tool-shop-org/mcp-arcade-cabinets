# HANDOFF — Ghost on the Menu, v0.3.0 pickup

Read this, then `CLAUDE.md`, then `docs/study-swarm.dispatch.md` (G1, G7, G8, G9, G10). `docs/ghost-wave-3.kickoff.md` is the brief that just shipped — treat it as history, not the next queue.

**This is a pickup after a Grok session that published v0.3.0.** The Director named the next session (2026-09-10): it is **entirely** the Ollama boss seat, then other ways Ollama can add content through the existing levers. Not wave 4. Not House Call. Not Docker MCP Toolkit. Voice drafts still wait on a play reaction; they are not this session.

## Where it is (verified 2026-09-10)

| What         | Value                                                                        |
| ------------ | ---------------------------------------------------------------------------- |
| Repo         | `E:/AI/mcp-arcade-cabinets` (`mcp-tool-shop-org/mcp-arcade-cabinets`)        |
| Commit / tag | `23b5d87` / `v0.3.0`                                                         |
| Release      | https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/releases/tag/v0.3.0 |
| Landing      | https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/                     |
| Game         | https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/                |
| Handbook     | https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/            |

Landing header **Play**, hero **Play Ghost on the Menu**, and the usage card all go to `/play/`. Live `/play/` serves the class sprites (`answer.png`) and ACE-Step beds (`parallelism.mp3`). Pagefind is up.

All workspace packages are `"private": true`. The release is the git tag, the GitHub release, and Pages. **Not npm. Not 1.0.0.** Identity scan was CLEAN on the tracked tree, the tag archive, and the re-fetched GitHub tarball.

## Next session (Director, 2026-09-10)

**Focus: the Ollama boss feature, then other Ollama content behind the proper levers.** The whole session. Do not start leftover slice-3 classes, sprite-fit, or a new wave unless this work is done and the Director says so.

### 1. The boss seat that already exists

Local only: `pnpm -F @mcp-arcade-cabinets/cabinets dev`. Checkbox **Ollama bosses**, model picker next to it. Vite proxies `/ollama` → `127.0.0.1:11434`. Cloud tags first; default `gpt-oss:120b-cloud` when pulled. Pages cannot reach the daemon.

| Piece                                                | Where                                     |
| ---------------------------------------------------- | ----------------------------------------- |
| Frozen prompt, parse, Cloud tag match                | `packages/ghost-on-the-menu/src/pilot.ts` |
| Shell checkbox, picker, `/api/tags`, `/api/generate` | `apps/cabinets/src/ghost.ts`              |
| Proxy                                                | `apps/cabinets/vite.config.ts`            |

The prompt is frozen and fact-blind (G7). `think: false` plus a short `num_predict`. Parse the **last** matching verb (`spread` / `column` / `hold` / `fog` / `plate` / `script`), not the first word. If the call fails, the sim keeps the scripted phase fire. A fact in the prompt is a halt.

Play it on the machine with the daemon. Make the seat actually change the fight in a way a player can feel, without ever seeing a lie.

### 2. Other ways Ollama can add content (levers first)

The cabinet already has data levers under `packages/ghost-on-the-menu/patterns/` (paths, formations, fire, bosses, ladder, waves, player, drops, voice, parallelism). Ollama may **fill those levers**, not invent a second sim.

Allowed shape: the model proposes or picks from a closed set the JSON already names (a voice line from `voice.json`, a path from a class pool, a boss phase already in `bosses.json`, a parallelism burst on/off as the file allows). Same G7 envelope as the boss seat: no fact, no lie flag, no digit, no score word. Seed still owns fairness. The band still andons a gallery or a wall.

Not in scope this session: a second generate path, writing new sprites, talking to an MCP server, Docker MCP Toolkit, or anything Pages would have to call.

If a new lever is needed, add it as JSON first, with a load-time schema and a fact-flip test, then let Ollama sit in it. Do not let the model key motion, look, or timing on a lie.

## What to do

1. Sit the local Ollama boss (Cloud tag if pulled). Feel it. Fix what is thin.
2. List other content seats that fit the lever rule above. Build the ones that stay inside G7.
3. Do not invent wave 4. Do not unpark House Call. Do not add a Docker MCP Toolkit server unless they ask — that is a later, separate slice (tools for an agent, not the generate path, not a Pages-to-localhost hop).
4. Voice drafts in `patterns/voice.json` still wait on a play reaction. They are not this session's job unless a lever-seat writes from that file without changing the copy.

## What shipped in 0.3.0

Wave 3 from the kickoff, plus spend-approved art and sound, plus the Cloud boss picker:

- **Drops** (`patterns/drops.json`): boss lamp, formation spread, fall **straight down** (drift 0). Never keyed on a lie. The kickoff said "drift toward the ship"; the Director's later play and the shipped sim are straight down. Move under them.
- **Voice** (`patterns/voice.json`): four-or-more dry lines per wave kind, boss kind, and the end, picked by the round seed. Drafts. They name the experiment and the creature, never a fact, never a digit.
- **Tape labels** (`src/label.ts`): fixture / seat / live plus an **i** why from header and wire shape. Fact-flip test. Hardcore is not a label; it is a selector override.
- **Hardcore**: ladder rung 3, selector only, never from `deriveTier`. One lamp, rage from the first shot, boss hazards (echo, band, plate).
- **Longer seat rounds**: duration clamps recorded 45–90, seat 90–180, live 50–130, hardcore 80–220.
- **More classes**: `init`, `ready`, `menu`, `grid`, `answer`, `fog`, `obstacle`, `stall`, `error`, plus three bosses. Handshake ack (`ready`) and error responses are their own classes.
- **Parallelism** (`patterns/parallelism.json`): seed-placed bursts of extra **honest** copies and a hotter track. Off on the recorded rung. Extra copies are never lies. Hardcore decoys fire; other rungs' extras do not unless `decoysFire`.
- **Art**: class sprites at 128 px under `apps/cabinets/public/sprites/` (answer, ready, error, drop-lamp, drop-spread, hazard-echo/band/plate, plus the v0.2.0 set). Receipts in `docs/art/receipts.json`. Flux 2 Max via Comfy Cloud. Licence: customer-owned, commercial ok, **must not train / distil / fine-tune**, do not strip credentials, do not add to a style dataset.
- **Sound**: recorded ACE-Step MP3s in `apps/cabinets/public/tracks/` (inspect, poison, rug, unlisted, whisperer, menu, doorman, breather, parallelism). Chiptune remains the fallback.
- **Ollama Cloud bosses**: `src/pilot.ts`. `isCloudModel` matches `:cloud$` or `-cloud$`. Default `gpt-oss:120b-cloud` when pulled. `think: false` and a short `num_predict` so a thinking 120B still returns one verb. Parse the last matching verb, not the first word.

## What is still open (not this session unless asked)

- **Voice approval.** Drafts in `patterns/voice.json`. Wait for the Director's play notes.
- **Slice 3 leftover:** the kickoff asked to map _every_ distinct wire shape in the sixteen tapes (`resources/list`, `prompts/list`, pings, long payloads, …). Not every shape has its own class yet. Classes today are the nine in `SpriteClass`. New sprites are a spend ask: count first, wait for the yes.
- **Sprite fit:** grid members draw in a member-width box; bosses stretch to the sim rect (the Menu squash is the point). If the Director wants boss art unstretched, that is an aspect-fit in `render.ts`, not a sim change. Claude's lane.
- **House Call** parked at `152f548` until a design that plays exists. `tape-core` still holds the scoring rules for that day.
- **Docker MCP Toolkit** later, separate.

## The lock

From `docs/study-swarm.dispatch.md`. Not negotiable:

- **G1.** Cabinets are read-only consumers of tape JSON (`mcp-arcade.tape/v1`). They never load a receipt. The reveal is the tape's wire-derived fact, never a game-computed verdict.
- **G7.** The cabinet arranges the tape; it does not transcribe it. Lies are shootable but not pre-labelled: they reveal on the hit. The round ends with a scene, not a count.
- **G8.** No shared-guess surface.
- **G9.** No "you beat" claim except against the instrument's pinned fact.
- **G10.** Every end screen names the tape, the server and the policy, and nothing more. No score, count, or digit on screen, ever.

Nothing about a lie may differ before the hit: look, motion, timing, sprite key, drop, label, boss pose, voice line, parallelism copy. Extra parallelism copies that clone a lie's class are still honest.

## Lanes

| Lane   | Owns                                                                                            |
| ------ | ----------------------------------------------------------------------------------------------- |
| Grok   | `tape-core`, `prepass`, `sim`, `patterns/*`, `label`, `pilot` (the frozen prompt and the parse) |
| Claude | `render`, `cues`, `audio`, `apps/cabinets` shell, bots, fairness band, docs, Pages copy         |

Each reviews the other's diff. Cloud panel on G7 claims. Neither partner tags; the Director's word cuts a version.

## Layout

| Path                                  | What                                                                                                              |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `packages/tape-core`                  | Load a tape, refuse forbidden keys at any depth, slice by atom                                                    |
| `packages/ghost-on-the-menu/src`      | `prepass`, `sim`, `patterns`, `render`, `cues`, `audio`, `play`, `label`, `pilot`                                 |
| `packages/ghost-on-the-menu/patterns` | Ten JSON files: paths, formations, fire, bosses, ladder, waves, player, drops, voice, parallelism                 |
| `apps/cabinets`                       | Vite shell. `pnpm build:play` writes gitignored `site/public/play/` for Pages                                     |
| `fixtures/tapes`                      | Sixteen tapes. The only input the game gets                                                                       |
| `site/`                               | site-theme landing + Starlight handbook. `secondaryCta` stays `{ href: 'handbook/', label: 'Read the Handbook' }` |
| `scripts`                             | `play.mjs`, `film.mjs`, `sweep.mjs`                                                                               |

Tuning is data. Change a lever, `pnpm sweep`, then `pnpm test` (the band is the andon). A change that makes a gallery or a wall fails the build.

## The gate, every time before a push

```bash
cd E:/AI/mcp-arcade-cabinets
pnpm verify
python %USERPROFILE%\.grok\bin\identity-scan.py .
```

`pnpm verify` is lint, typecheck, test, build, and `test:play ghost --fixture naive-ndjson`. When a pattern changed, also `pnpm sweep`. Identity scan from the **repo** cwd, never from `C:\WINDOWS\system32`. Stage explicit paths; never `git add .`. Do not add `site/public/play` or `site/dist`. Git author is the org noreply. Pages deploy is a public surface — scan before push even when npm is held.

## Hard stops

- Stays `0.x`. A publish is not a promotion to 1.0.0.
- No npm. Packages stay private.
- No score, count, digit, pass/fail, NRP, integrity or utility on screen. The play-through greps screen text for any digit.
- Tapes only. No receipt, no `docs/proof`, no instrument code in this repo.
- Identity never ships (home path, personal mailbox, Tailscale, token paths, legal name, scanner needles). Needles stay in `~/.grok/secrets/identity-needles.txt`.
- House Call stays parked.
- Art spend only on the Flux 2 Max / Comfy Cloud route, with receipts. Re-check licence before any public deploy of new images.

## How we got here (short)

v0.2.0 published 2026-09-10 (playable cabinet, fairness band, first sprite set). Director play at tier 0: TV frame cheap, field too small, no full screen, "no logic." Frame gone, field full width, F for full screen, then wave cards, protocol order, answers, dives, boss fights, aimed fire. Wave 3 kickoff: drops, voice, more enemies, longer rounds, hardcore, labels. Grok built the sim/data; spend-approved sprites and ACE-Step beds landed; Cloud boss picker landed still at 0.2.0; full treatment published **v0.3.0** the same day. Git history from `7534b30` through `23b5d87` is the diary. Older "next slice: wave card and field reset" in prior handoffs **already landed**.
