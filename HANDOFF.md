# HANDOFF — Ghost on the Menu, v0.5.0

Read this, then `CLAUDE.md`, then `docs/cabinet-server.md` (slices 1–3: the decisions and the numbers) and `docs/cabinet-voice.md` (slice 4: the voice), then `docs/ollama-content.md` (the v0.4.0 seats). The lock is G1, G7–G10 in `docs/study-swarm.dispatch.md` and G11–G18 in `docs/cabinet-server.dispatch.md`. `docs/cabinet-server.kickoff.md` is history (slices 1–3 landed on `main`, untagged); `docs/ollama-content.kickoff.md` and `docs/ghost-wave-3.kickoff.md` are older history.

**This is a pickup after v0.5.0 (Claude, 2026-09-11, full treatment, published on the Director's word): slices 1–4 of `docs/cabinet-server.dispatch.md`, the music rework and the tuning, reviewed by Grok (`docs/cabinet-server.review.md`, `docs/cabinet-voice.review.md`).** Tag `v0.5.0`, GitHub release, Pages. Still `0.x`, still not npm. The tuning diff (`git log fe47dae..b4c5a33`: `patterns.ts`, `sim.ts`, the pattern files) shipped before Grok's review of it; that review is still owed.

## What landed after v0.4.0 (untagged, on `main`)

- **`packages/cabinet-server`**: the cabinet as a stdio MCP server (official SDK). Tools `fire`, `say`, `sfx`, `view`, `tapes` from `tools.json`; fact-blind at the boundary (`CabinetHost` of words; fact-flip test per tool); the say gate and `personas.json`; the say seat tiered by capability (Claude agent by `ANTHROPIC_API_KEY` on the node side, else Cloud tag, else local). `pnpm test:play ghost --seat mcp`. New sim lever `state.bossSay` (a gate-passed line lands as an aside).
- **The shell's seats moved behind the contract** (`apps/cabinets/src/ghost.ts`): the fire seat through Ollama tool calling with prefetch, revoke on the boss's words, warm-up, `keep_alive`; the say seat through the dev server's `/cabinet/say`. Two status words beside the picker name the tool each seat called. The schema path is off in the shell (measured: it silences local models).
- **`pnpm sit`** reports per model: verb collapse, tool suppression, bad verbs, revoked, late, and what the gate refused. `--constrain on|off`, `--say on|off`, `--seat mcp|prompt`.
- **The Ghost's own tapes**: `fixtures/tapes/cabinet.*.tape.json` from `mcp-arcade bout --target stdio` against the server (naive and task-only, wrap off and on). On its own menu the naive policy followed nothing. The band's roster is derived from disk now (twenty tapes).
- **The panel**: `docs/cabinet-server.panel.md`, every G12 and G14 claim confirmed by two family-different jurors. Grok's review (`docs/cabinet-server.review.md`): no halt; the gate now refuses any digit glyph; only one-sentence lines seed the say prompt (the Director's word).
- **The voice (slice 4, G15)**: `voice/worker.py` (Kokoro + faster-whisper + fx-dub's spoken-content receipt), the `speak` tool, voice sheets in `personas.json`, the voicer in the shell (a **Voice** checkbox, on only when `pnpm voice` is up), `pnpm sit --voice`. Numbers and decisions in `docs/cabinet-voice.md`.

## Next

1. **The Director plays the seat on the local shell**: `pnpm voice` in one terminal, `pnpm -F @mcp-arcade-cabinets/cabinets dev` in another, the **Ollama bosses** and **Voice** checkboxes, a Cloud tag. Hears the lines. Set `ANTHROPIC_API_KEY` in the dev server's environment to sit the Claude tier; it was built, not measured live.
2. **The voice pass on `voice.json`** is the Director's: the seed pools are thin (whisperer three, menu five, doorman two one-sentence lines of eight each), and the three preset voices (`bf_emma`, `am_michael`, `bm_george`) are a first cast. A clone per boss kind waits on a consented recording; `personas.json → boss.<kind>.voice.clone` is the slot.
3. **Grok's slice-4 review is in** (`docs/cabinet-voice.review.md`, no halt): the three changes it asked for are applied (the shell's audio url behind the proxy, the worker's audio route receipt-gated, the voicer never plays over a catch and drops a held take on a newer line). Its slice-6 list stands: bind for the container, a secret on the hook, a cache cap, no rig path default. Its paragraph on the budget is for the Director: start at one second.
4. **The music** was reworked on the Director's play notes (a bed holds two minutes, then crossfades into the playing wave's bed; bursts as an overlay; a fade at the scene). With **Voice** on every boss speaks its authored spawn line, so the voice is audible without a seat. **Tuning on the same notes:** rounds fifteen percent longer with every clock slowed to match, bursts of four to nine seconds that climb by wave (`copiesLater`, `intensityLater` in `parallelism.json`). The band admits it with the live sweeper exactly on the bar; a third longer did not (nine deaths against five). Longer waves than this mean a fourth lamp on the long tiers or a relaxed band, the Director's call. Grok reviews the pattern and loader diff (`patterns.ts` gains `copiesAt`, `intensityAt`, `waveProgress`; `sim.ts` reads them in `fireScale` and `spawnDecoys`). The Director hears it again; the `poison`, `rug`, `unlisted` and `breather` beds are no longer picked by the shell (the boss beds carry their waves) and are the Director's to reassign or retire.
5. **Slices 5–6** (stingers and backdrops; the container and the Catalog PR) wait on the Director's word. Slice 6 will have to revisit `SHIP_GATE.md`, whose `[mcp]` rows still say "not an MCP server", and bake the tapes and `tools.json` into the image; the voice stays on the host.
6. Translations before any later tag, not before.

---

## The v0.4.0 pickup as it was written

Read this, then `CLAUDE.md`, then `docs/ollama-content.md` (the decisions from the Ollama session). `docs/study-swarm.dispatch.md` is G1, G7, G8, G9, G10 only. `docs/ollama-content.kickoff.md` and `docs/ghost-wave-3.kickoff.md` are history — the seats shipped as v0.4.0; wave 3 shipped as v0.3.0.

**This is a pickup after v0.4.0 (Claude, 2026-09-10, the Ollama seats, full treatment, published on the Director's word).** Tag `v0.4.0`, GitHub release, Pages. Still `0.x`, still not npm. The next thing that matters is the Director's own play of the seat on the local shell.

## What shipped in v0.4.0

- **The Cloud boss now sits.** `gpt-oss` on Ollama Cloud ignores `think: false`; v0.3.0's default seat was the scripted boss every beat. `pilot.ts` retries with `think: 'low'` and remembers. Measured ~550 ms a beat, no fallbacks (`pnpm sit`).
- **The seat is felt.** `spread` is a wide fan, `column` leans the boss over the ship then aims, `hold` is a silent still beat. New lever `fire.json → tiers.N.boss.pilot { fan, spread, lean }` with schema and fact-flip tests. The view carries the stick and the phase motion word; health is against the real max.
- **The voice seat.** Each boss picks which of its own `voice.json` lines it says at spawn (a letter reply; `state.bossLine`). Drafts unchanged.
- **Seat status** beside the picker (words only; never on the field). Retired Cloud tags say so instead of silently scripting.
- **`pnpm sit`** (`scripts/sit.mjs`): the headless sit that measured all of this.
- Refused with reasons in `docs/ollama-content.md`: parallelism toggle (seed's fairness), path pick and phase pick (not this session, written up), asides.

## Next (Director, 2026-09-10): the cabinet server

The Director authorised a study-swarm for the next layer: the cabinet as an MCP server in a Docker container, listed in the Docker MCP Catalog, whose tools are the levers a model uses (fire, say, sfx, stinger, voice, backdrop). The dispatch is `docs/cabinet-server.dispatch.md`: 24 verified findings, the lock extended G11–G18, the tool list as levers, a six-slice build plan. The paste-ready brief for slices 1–3 is `docs/cabinet-server.kickoff.md`.

1. Next session: paste `docs/cabinet-server.kickoff.md` (server, seat over tools, self-bout). Not voice, stingers, backdrops or the container yet.
2. Still open from v0.4.0: play the seat locally and react to the voice drafts; Grok reviews the Ollama-session diff (`git log 6e1b95f..v0.4.0`).
3. Everything below this line is the v0.3.0 pickup as it was written, kept for the layout, lanes, lock and gate. Where it says `v0.3.0` / `23b5d87`, read `v0.4.0` and the tag.

---

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

## The Ollama session as it was briefed (done; kept for the record)

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

The Ollama session crossed lanes on the Director's brief: Claude edited `sim.ts` (the seat's verbs, the lean, the hold, the line pick), `pilot.ts`, `patterns.ts` and `fire.json`. Grok should review that diff (`git log 6e1b95f..main`).

Each reviews the other's diff. Cloud panel on G7 claims. Neither partner tags; the Director's word cuts a version.

## Layout

| Path                                  | What                                                                                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/cabinet-server`             | The cabinet as a stdio MCP server: `tools.json`, `personas.json`, the gate, the boundary, the seat machine, the say tiers, the voicer |
| `voice/`                              | The host-side voice worker (Kokoro, faster-whisper, fx-dub). `pnpm voice`. Runs from `.venv`, never in the container                  |
| `packages/tape-core`                  | Load a tape, refuse forbidden keys at any depth, slice by atom                                                                        |
| `packages/ghost-on-the-menu/src`      | `prepass`, `sim`, `patterns`, `render`, `cues`, `audio`, `play`, `label`, `pilot`                                                     |
| `packages/ghost-on-the-menu/patterns` | Ten JSON files: paths, formations, fire, bosses, ladder, waves, player, drops, voice, parallelism                                     |
| `apps/cabinets`                       | Vite shell. `pnpm build:play` writes gitignored `site/public/play/` for Pages                                                         |
| `fixtures/tapes`                      | Twenty tapes (sixteen from the instrument, four the cabinet recorded of itself). The only input the game gets                         |
| `site/`                               | site-theme landing + Starlight handbook. `secondaryCta` stays `{ href: 'handbook/', label: 'Read the Handbook' }`                     |
| `scripts`                             | `play.mjs`, `film.mjs`, `sweep.mjs`, `sit.mjs`                                                                                        |

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
