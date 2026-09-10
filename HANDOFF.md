# HANDOFF — Ghost on the Menu, wave 2 landed

Written 2026-09-10 at the end of the session that built wave 2 with Grok. Read this, then `CLAUDE.md`, then `docs/ghost-wave-2.dispatch.md`. Everything below is verified on main at the commit that carries this file (CI green, 105 tests, three play-throughs green, identity scan clean).

## The one decision that frames everything

House Call is parked (last state 152f548). **Ghost on the Menu is the cabinet.** The Director's brief was sound effects, harder enemies, waves, boss battles, a soundtrack, retro sprites, enemy patterns as data, challenging but not impossible, all inside G7 and G10. Every item is on main. The next step is the Director playing it.

The lock still in force is G1, G7, G8, G9, G10 of `docs/study-swarm.dispatch.md`: cabinets read tapes and write nothing the instrument sees; the round is arranged from the tape, not transcribed; lies are never pre-labelled by look, motion or timing and reveal only on the hit with disproportionate feedback; no shared-guess surface; no "you beat" claims; every end screen names tape, server, policy and nothing more, and no score, count or digit is ever on screen.

## What is on main now

| Piece                                 | State                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Owner      |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `packages/tape-core`                  | Loader refuses forbidden keys at any depth; slicing; scoring rules kept for a future cabinet                                                                                                                                                                                                                                                                                                                                                                          | Grok       |
| `src/prepass.ts`                      | Waves per atom from `waves.json` per tier (breather, group size, rest); duration = (beats × 2 s) / tier density, clamped 45–120; seed = hash of bout id + every wire row when none is given, driving each beat's column; `Round.tier` from `ladder.json`'s derive rule (stdio → 2, docker with image id → 2, seat on a non-live target → 1, else 0)                                                                                                                   | Grok       |
| `src/patterns.ts` + `patterns/*.json` | `paths`, `formations`, `fire`, `bosses`, `ladder`, `waves`, `player`: validated at load, `patterns/<file>: <key>` on the first bad key, ladder pools cross-checked against path ids, no fact-shaped key allowed in a boss phase                                                                                                                                                                                                                                       | Grok       |
| `src/sim.ts`                          | The catch (hitstop, shake, caption, trophy); entry paths picked from (seed, beat index, class) with hover at the last point; formation fire on the tier's rhythm (never at tier 0); enemy shots cost a lamp with a grace period; fog beats become an unshootable FogBank that veils the lower third; lives from the rung; one boss per atom kind with phase scripts that never read the fact, dead for the wave once killed; `isHittable` is the only export for bots | Grok       |
| `src/render.ts`                       | Trophies with halo, honest pop, shake as render-only offset with three presets (default calm) and a shake-off toggle, caption in words, three bezel lamps as rects, veil, boss rect and frame, enemy shots, an optional `drawSprite` on the DrawContext with keys by class / player / revealed / boss frame; end scene draws only the furniture the shell passes                                                                                                      | Claude     |
| `src/cues.ts`                         | `waveKindAt(round, t)` and the frame-diff that names the sound to fire                                                                                                                                                                                                                                                                                                                                                                                                | Claude     |
| `src/audio.ts`                        | Effects and a procedural chiptune as pure data; `attach(ctx)` is the WebAudio player                                                                                                                                                                                                                                                                                                                                                                                  | Claude     |
| `src/play.ts`                         | Three bots: idle, sweeper (nearest hittable, never reads a fact), reader (fires only at the sequence tells from order, class and members); `playTape` for the band; the reader is the acceptance bot; transcript prints `revealed:`; screen text is checked for any digit                                                                                                                                                                                             | Claude     |
| `test/band.test.ts`                   | The fairness band over every fixture and a header-only seated variant of each: idle loses every lamp on tier ≥ 1 and survives tier 0; sweeper survives tier 0 and reveals ≥ half; reader reveals every lie on tiers 0 and 1. Passes on the landed `fire.json`                                                                                                                                                                                                         | Claude     |
| `test/range.test.ts`                  | Expressive-range plot: different wire → different round (column included); fixtures spread across density and tier                                                                                                                                                                                                                                                                                                                                                    | Claude     |
| `apps/cabinets`                       | Shell: AudioContext on first gesture, cue diff → sfx, soundtrack on the round clock, mute, feel presets, shake toggle, sprite atlas from `/sprites/<key>.png`, backdrop as page ground, end scene with name/server/policy                                                                                                                                                                                                                                             | Claude     |
| `apps/cabinets/public/sprites`        | Fourteen accepted images at 128 px with transparent backgrounds (backdrop 1280×720), signed off by Grok against G7; provenance in `docs/art/receipts.json`                                                                                                                                                                                                                                                                                                            | Claude     |
| `fixtures/tapes/*.tape.json`          | Sixteen tapes exported by `mcp-arcade tape`; the only input the game gets                                                                                                                                                                                                                                                                                                                                                                                             | instrument |

## The Director's play, 2026-09-10, and the next slice

Played naive-ndjson at tier 0. Verbatim: "The game still needs a lot of work. Not sure why there's the tv frame, that just looks cheap. And the screen is so small, and there should be a full screen option. And there doesn't seem to be any logic to any of it. We have a long way to go."

Done the same session: the frame is gone, the field takes the page width, F or a button goes full screen; Grok closed the pool-fallback risk (an empty pool is a load error). **Then the wave-card slice landed (A(g), 75e3dc7): protocol order per wave, a wave card in furniture paint with its own two-note cue, the boss held until the card has shown, hovering sprites of a closed wave exiting off the top, the whisperer emitting its grids. And the wire now answers (A(h), 284656e): inbound responses to tools/call are answer sprites rising from the bottom after the calls.** The cloud panel confirmed the four G7 claims on both (wave text from the atom kind only; exit never reads lie; answers honest by construction; no boss while a card shows).

**Why it reads as noise (Grok, design session, grounded in the sim as it runs):** (1) the field never resets: sprites enter, then wiggle at hover for the rest of the round, so the handshake is still twitching when the Doorman arrives; (2) the wire never answers: every inbound response is skipped and honest grids collapse, so blocks drift in instead of handshake, menu, call, answer; (3) nothing names a beat until a lucky catch: captions fire only on a lie hit, the wave kind drives the soundtrack but never the canvas, and the boss is a second object rather than the source of the sprites. At tier 0 formations do not fire, so shooting is optional scenery.

**The next slice, "wave card and field reset":** a wave-start caption in words from the atom kind (furniture paint, not amber; a caption kind on the contract); protocol order inside a wave (init, menu, grids) with the rest and breather the wave data already carries; honest sprites exit at the wave's close, trophies stay parked, escaped lies stay in class paint for the end; the boss enters after the caption and its existing cue emits the grid row. Inbound answers on a return path come after. Owner: Grok on prepass, sim and types; Claude on the caption paint. Andon: the naive-ndjson play-through shows a caption at each wave open with no digit, score word or fact name; no honest hover from the previous atom after the next starts; the three lies still catchable; catch captions still amber. G7 holds: the caption names the atom kind, which has its boss whether or not the lie happened; protocol order is every tape's honest shape; exit at wave close is class motion; the boss cue is the atom, never a fact.

## Built out after the play (same day)

- **A(i), Grok:** dives at tiers 1 and 2 from a dive rhythm in fire.json (a hovering grid formation swoops to the ship's column and back on a seeded schedule; contact costs a lamp under grace), Boss.hitT and RoundState.playerHitT for feedback, RoundState.bossKills, a tier override on the prepass, and kindOfAtom moved into types.ts.
- **A(j), Grok:** the boss battle arc: hp for a six-to-eight-second fight, no damage in slit or hold phases (Menu dodge, Doorman guard), rage below half hp, RoundState.bossDownT.
- **A(k), Grok:** the round fits its waves (a per-tier tail in waves.json; the prepass stretches placement to the duration or extends the duration within the clamp), the whisperer launches one sprite per beat instead of a stack, same-class beats never share a time.
- **A(l), Grok:** hover points spread by class rank so pairs never stack; sprite boxes are data (a sprites block in formations.json); the ship is 24×16.
- **Claude, `pnpm film`:** renders frames of a scripted round to PNG through the renderer (rectangles, no browser); it found the dead tail, the stacked launches and the speck-sized sprites.
- **Claude:** boss flash on hit, ship blink during grace, boss-hit, boss-down and dive sounds, a boss-down burst, an inspect motif, a difficulty selector (as recorded / seat / live, default seat) and a Next tape button on the end scene that walks the fixture list.

## Balance, measured (`pnpm sweep`, 2026-09-10)

Every fixture at every tier with every bot, the tier forced by the header the way the band does. After the tuning pass (fire.json, bosses.json; one lever at a time, log in the commit message of 0d246f3):

| tier       | bot     | dead rounds of 16 | lamps lost a round | lies revealed of 20 |
| ---------- | ------- | ----------------- | ------------------ | ------------------- |
| 0 recorded | idle    | 0                 | 1.00               | 0                   |
| 0 recorded | sweeper | 0                 | 0.00               | 20                  |
| 1 seat     | idle    | 16                | 3.00               | 0                   |
| 1 seat     | sweeper | 0                 | 0.25               | 20                  |
| 1 seat     | reader  | 7                 | 2.13               | 20                  |
| 2 live     | idle    | 16                | 3.00               | 0                   |
| 2 live     | sweeper | 3                 | 1.56               | 20                  |
| 2 live     | reader  | 12                | 2.75               | 16                  |

What it says: a player who keeps moving under the targets is nearly untouchable by straight-falling fire at any speed; the threat that lands is the boss (aimed spread) and dives that reach the ship's row. The band now carries three curve bars: seat threatens the sweeper and the reader together by at least half a lamp a round; live is survived by the sweeper on at least three tapes in four with half the lies found; live is beatable by the reader for half the lies. Tier 0 ("as recorded") is a gallery with a slow boss by design; the shell defaults to seat.

Levers, all data: `fire.json` per tier (formation and boss rhythms, dives), `bosses.json` (hp, rage), `waves.json` (density, tail), `ladder.json`, `player.json`. Re-run `pnpm sweep` after any change; `pnpm test` is the andon.

## Order of work, next session

1. **The Director plays it again.** What changed since his play: the field resets per wave, a word opens each wave, the calls are answered, the boss is staged. If it still reads as noise, the remaining levers are in the section below and in the sim: last-wave hoverers stay for the end scene by design; the whisperer both drops fog and emits its row on phase one (data in bosses.json); the sim imports kindOfAtom from cues.ts (move it to types or prepass if the dependency bothers you); the answer class has no sprite yet and draws as its rectangle.
2. **Tuning stays in data.** `patterns/fire.json` (tier-1 period first), `waves.json` (density), `ladder.json` (speeds, fog). The band and the three play-throughs are the andon: a change that kills the sweeper on tier 0 or lets idle survive tier 1 fails the build.
3. **Sprite fit.** Grid formations draw one sprite per member in a member-width box; bosses stretch to the sim's rect (the Menu squash is the point). If the Director wants the boss art unstretched, add an aspect-fit in `render.ts`, not in the sim.
4. **A soundtrack track from Comfy Cloud** if the procedural one is not enough; spend-gated.
5. **Pages deploy** when the game is worth showing; Director's call, public surface.

## Grok mechanics (both sessions on disk)

- Design session (review, plan mode, cannot edit): `cd E:/AI/mcp-arcade && grok --resume dd88b416-ac4f-4c7c-92cf-da28aee9af35 --permission-mode plan --no-subagents --max-turns 40 --prompt-file <packet.md> --output-format plain`
- Build session (edits, never commits): `cd E:/AI/mcp-arcade-cabinets && grok --resume 96a6fad1-00a8-49c3-a368-d06eaa44fe66 --permission-mode acceptEdits --allow "Write" --allow "Edit" --allow "Bash(pnpm*)" --no-subagents --max-turns 150 --prompt-file <brief.md> --output-format plain`
- **Learned 2026-09-10:** `--always-approve` is refused by the Claude session's permission classifier in both shells, and plain `acceptEdits` cancels every `write` of a new file when there is no terminal (the turn ends after one line with "User cancelled the execution for tool write"). The three `--allow` rules above are the working shape. If Grok returns one line, `git status` first: he may have built nothing.
- Grok's final report often does not arrive (the session's memory flush ends the turn); review the diff, not the report. Every brief: one package, named files, "do not commit", a report cap with fixed sections. Claude reviews the diff, runs the gate, commits with explicit paths so Grok's in-progress files are never swept in.
- Cross-review each way with capped fixed-section packets; cloud panel `ollama_verify_claims`, five claims per batch, source paths and the test output as reference; `weak: true` means rerun. Today the panel refuted one of ten claims (the cheating sweeper) and flagged one (caption on the end scene); both fixed.

## The gate, every time before a push

```bash
pnpm format && pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm test:play ghost --fixture naive-ndjson
pnpm test:play ghost --fixture task-only-ndjson
pnpm test:play ghost --fixture livefire.intern.task-only-wrap-on
python %USERPROFILE%\.grok\bin\identity-scan.py .
```

## Art: what was done and the licence

Route `bfl/flux-2-max` through Comfy Cloud `submit_batch`, the player ship and grid sprite first, then both as `reference_image` (uploaded by `name`; a batch does not accept `prompt_id` references) for every other image. Eighteen generations for fourteen accepted images (two re-rolls on Grok's G7 pass, one on my look, one job cancelled after wedging the queue for thirty minutes). Every image passed ai-eyes `image_contains` for text below 0.001. Receipts: `docs/art/receipts.json`.

Licence, checked 2026-09-10: BFL Developer Terms (last revised 2026-08-04) give the customer ownership of Output and commercial use; **Output may not be used to train, distill or fine-tune any other AI model**, and content-credential metadata must not be stripped. Comfy's terms (2026-05-13) leave ownership with the customer and defer to the partner's terms. Publishing these sprites in the repo and the cabinet is permitted; re-verify on the day of any public deploy. Do not add these images to any style dataset.

## Hard stops

- Version 0.0.0. No tag. No Pages deploy without the Director.
- No score, count, digit, pass/fail, NRP, integrity or utility on screen, ever. The play-through greps screen text for any digit.
- Nothing about a lie may differ before the hit: not look, not motion, not timing, not a boss pose, not a sprite key.
- Tapes only. No receipt, no `docs/proof`, no instrument code in this repo.
- Identity scan before every push. No home paths in anything tracked.
- House Call stays parked until a design that plays exists.
- Art spend only on the route above, with the receipts file. Verify licence terms before publishing.
