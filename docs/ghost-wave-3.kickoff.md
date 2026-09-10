# Kickoff — Ghost on the Menu wave 3: drops, voice, more enemies, longer rounds, hardcore

Paste this to start the session. Repo: E:/AI/mcp-arcade-cabinets (mcp-tool-shop-org). Read `HANDOFF.md`, then `CLAUDE.md`, then this. Version is 0.2.0, published 2026-09-10 (tag, release, Pages). This wave publishes as **0.3.0** when the Director says so, not before.

## Standing frame

- The lock holds: G1, G7, G8, G9, G10 of `docs/study-swarm.dispatch.md`. Cabinets read tapes only. Nothing about a lie may differ before the hit (look, motion, timing, sprite key, drop, label). No score, count or digit on screen. The end scene names tape, server, policy and nothing more.
- Grok is the build partner. Grok designs and builds his lane (loader, prepass, sim, patterns) in the build session; Claude owns render, cues, audio, shell, bots, the band, the docs. Each reviews the other's diff; neither tags. Headless: `--permission-mode acceptEdits --allow "Write" --allow "Edit" --allow "Bash(pnpm*)"`; review the diff, his reports often do not arrive.
- The cloud panel (`ollama_verify_claims`, three families, five claims a batch) adjudicates every G7 claim before it lands.
- The gate before every push: `pnpm verify`, `pnpm sweep` when a pattern changed, identity scan (`python $USERPROFILE/.grok/bin/identity-scan.py .`), CI green. Standing authority to commit, push, merge.
- Tuning is data in `packages/ghost-on-the-menu/patterns/`. The fairness band is the andon.
- Art spend on bfl/flux-2-max through Comfy Cloud `submit_batch` (medias by uploaded name), receipts in `docs/art/receipts.json`, ai-eyes glyph check, Grok G7 sign-off. New sprites are a spend: state the count and wait for the yes. Open asks: the answer sprite, a Comfy Cloud soundtrack.
- The Director's word after v0.2.0: "The drop would need to fall toward the character, since you can't move forward. We need to make more of a narrative and add humor to it." And after: many more enemy types, longer levels, the difficulty never gets hard so there should be a hardcore mode, and the MCPs should be labelled by difficulty at the start with an explanation behind an "i" the cursor hovers over.

## The six slices, in order

### 1. Drops that fall toward the ship

A downed boss drops a **lamp**; a cleared formation (every member hit) drops a **spread shot** for a while. Drops spawn where the thing died and fall toward the ship's row, drifting toward its column, so they are catchable without moving forward. Data in a new `patterns/drops.json` (what drops from what, fall speed, drift, catch box, spread duration). A drop never keys on a lie: a boss drops its lamp whether or not the wave had one, a formation drops whether honest or lie. Render: a drop sprite key per kind, rectangles until art. Cues: a catch sound. Bots: the sweeper catches what crosses its lane, the reader ignores drops. Panel claim: drops are class motion, never fact motion.

### 2. Voice: narrative and humor

A line per wave open and per boss enter, drawn in the wave card's furniture paint under the wave word, and a line on the end scene above the furniture. Lines live in `patterns/voice.json` keyed by atom kind and boss kind, several per key, picked by the round seed. They name the experiment and the creature, never the fact, never the outcome, never a digit: the Whisperer gets a line about whispering whether or not anyone listened. Funny is the brief; dry, short, arcade-attract-mode dry. The Director writes or approves the final lines; ship a draft set of four per key for him to react to. Panel claim: no line differs by fact. The play-through greps every line for digits and fact words.

### 3. Many more enemy types

Today the classes are handshake, menu, call grid, answer, fog bank and three bosses. The wire has more shapes in it and the tapes carry them: notifications, pings, `resources/list`, `prompts/list`, error responses, the second `initialize`, a call that returns an error, a call with a long payload. Grok maps every distinct wire shape in the sixteen tapes to a class with its own sprite key, path pool, hover motion and fire (so a round is as varied as its wire), and adds pure hazards the bosses emit (the Doorman's plates as projectiles, the Menu's dropped bands, the Whisperer's echoes) that are boss data, never fact data. Target: at least eight sprite classes and three hazard kinds on the field. Each new class is one entry in `formations.json` sprites, `paths.json`, `fire.json`. Art for the new classes is a spend ask with the count.

### 4. Longer rounds

The duration clamp is 45 to 120 seconds and the tail is per tier. Make rounds long enough to feel like a level: a wave is several passes over its wire (the same atom's calls arranged twice or three times with different paths), a boss fight is a phase script that lasts, an intermission between waves shows the voice line. Raise the clamp in `waves.json` per tier (seat around three minutes, live four, hardcore five), keep the round fitted to its waves, and keep `pnpm test` under two minutes by letting the band run the bots at a faster fixed step.

### 5. Hardcore

A fourth rung in `ladder.json`: hardcore. Never derived from a header; only forced from the difficulty selector. Faster fire, denser waves, boss rage from the start, one lamp, hazards on, no grace beyond the blink. The band gets a bar: idle dies inside the first wave, the sweeper dies every round, the reader survives at least 4 of 16 and finds at least a third of the lies. Hardcore must be beatable by the reader on some tape or it is a wall, not a mode.

### 6. Labels at the start

The tape picker becomes a list with a difficulty label per tape and an "i" the cursor hovers over for the why. The label and the why derive only from the header and the wire shape: the derived tier (fixture, seat, live), the number of waves, the number of bosses, the wire density (rows per second of round), the framing. They never mention a fact, a lie count or an outcome. Example why: "Live server over stdio, four waves, three bosses, dense wire." The panel confirms the label never differs by fact; a test flips a tape's facts and requires identical label and why.

## Order of work

Slice 1 and 2 first (the Director asked for them). Then 6 (small, visible). Then 3, 4, 5 together, because they change the sweep and the band at once. Grok gets a design session per slice with the sim on disk, then builds; Claude reviews, renders, docs. Handbook pages (`site/src/content/docs/handbook/`) and README change with each slice; translations run before the 0.3.0 tag.

## Andon

- A drop, a line, a label or a new class that reads a fact fails the wave.
- A digit or a fact word on screen fails the play-through.
- The band fails the build if a tier becomes a gallery or a wall.
- No tag, no release, no version bump without the Director's word.
