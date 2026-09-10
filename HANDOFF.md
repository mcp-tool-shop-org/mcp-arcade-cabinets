# HANDOFF — Ghost on the Menu, wave 2

Written 2026-09-10 at the end of the session that parked House Call and opened wave 2. Read this, then `CLAUDE.md`, then `docs/ghost-wave-2.dispatch.md`. Everything below is verified on main @ a2952ad (CI green, 44 tests, three play-throughs green, identity scan clean).

## The one decision that frames everything

The Director played House Call and said it is not fun. It is parked (last state 152f548, removed from the workspace). **Ghost on the Menu is the cabinet.** His brief, verbatim: "Sound effects, harder enemies, waves, boss battles, sound track, different sprites (keep it retro), datasets for enemy patterns, so it's truly challenging, without being impossible."

The lock still in force is G1, G7, G8, G9, G10 of `docs/study-swarm.dispatch.md`. In one breath: cabinets read tapes and write nothing the instrument sees; the round is arranged from the tape, not transcribed; lies are never pre-labelled by look, motion or timing and reveal only on the hit with disproportionate feedback; no shared-guess surface; no "you beat" claims; every end screen names tape, server, policy and nothing more, and no score, count or digit is ever on screen.

## What is on main now

| Piece                                       | State                                                                                                                                                                                                                                                                                                                                                                  | Owner        |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `packages/tape-core`                        | Loader refuses forbidden keys at any depth; slicing; scoring rules (kept for a future cabinet)                                                                                                                                                                                                                                                                         | Grok         |
| `packages/ghost-on-the-menu/src/prepass.ts` | Round = clamp(4 s × visible beats, 45, 120); one wave per atom, 2 s breathers, rhythm groups of 3–4 with rests; `notifications/initialized` is handshake, fog is `notifications/message` only; `seed` and `waveBounds` on the Round                                                                                                                                    | Grok         |
| `packages/ghost-on-the-menu/src/sim.ts`     | **The catch:** a lie hit keeps the sprite alive in `caught`, amber, rising to `caughtY` (y=20) as a trophy; hitstop 0.12 s freezes the world; `shake` decays; `caption` holds the wire fact (digits stripped) for 1.5 s. Honest hit: `dying` 0.15 s then gone. Contract fields for `fog`, `lives`, `blind`, `boss`, `enemyShots`, `ended` exist but are not yet driven | Grok         |
| `packages/ghost-on-the-menu/src/types.ts`   | The sim contract from dispatch §4, as landed                                                                                                                                                                                                                                                                                                                           | Grok         |
| `packages/ghost-on-the-menu/src/audio.ts`   | Effects and a procedural chiptune soundtrack as pure data; `attach(ctx)` is the WebAudio player; the catch is its own sound family; tests run in node                                                                                                                                                                                                                  | Claude       |
| `packages/ghost-on-the-menu/src/render.ts`  | **Stale.** Still wave-1: draws rectangles by class, skips dead sprites, knows nothing of `caught`, shake, caption, lamps, fog, boss                                                                                                                                                                                                                                    | Claude, next |
| `packages/ghost-on-the-menu/src/play.ts`    | Wave-1 bot (`botInput`) sweeps and fires; passes because the catch keeps `cleared` semantics                                                                                                                                                                                                                                                                           | Claude, next |
| `apps/cabinets`                             | Browser shell: tape picker and Ghost on a canvas, keys left/right/space. No audio hookup yet                                                                                                                                                                                                                                                                           | Claude, next |
| `docs/ghost-wave-2.dispatch.md`             | The design, the research grounding with the prism receipt, the sim contract, the pattern dataset schema, the fairness band, the lanes                                                                                                                                                                                                                                  | Claude       |
| `docs/art/brief-1.md`                       | Twelve-image draft set: seven event sprites, player ship, three bosses, backdrop; rules (no glyphs, one palette, lies have no pre-hit look)                                                                                                                                                                                                                            | Claude       |
| `fixtures/tapes/*.tape.json`                | Sixteen tapes exported by `mcp-arcade tape`; the only input the game ever gets                                                                                                                                                                                                                                                                                         | instrument   |

## Order of work, next session

1. **Claude, renderer.** Rewrite `render.ts` against the landed types: `caught` trophies amber at `caughtY`; `dying` pop; shake as a render-only offset scaled by `state.shake`; caption text (word only, digits are already stripped by the sim); three bezel lamps from `lives` (rects, never a digit); lower-third veil while `blind > 0`; boss rect; `enemyShots`. Keep `makeTextCtx` so the play-through can still read screen text. Then the shell: AudioContext on first gesture, diff `state` frame to frame to fire `catch` / `pop` / `lamp` / `end` sounds, `tick(state.t, waveKind)` for the soundtrack, a mute button, three intensity presets and a shake-off toggle (dispatch W4 and the accessibility line). End scene: field freezes, trophies parade at the top, escaped lies sit in their honest paint, tape name as furniture, click restarts.
2. **Grok, slice A(c) then A(d).** Build session id `96a6fad1-00a8-49c3-a368-d06eaa44fe66` (see "Grok mechanics"). (c) `src/patterns.ts` loader and schema, `patterns/{paths,formations,fire,bosses,ladder,waves,player}.json`, `test/patterns.test.ts`. (d) shared entry paths for every formation of a class, enemy fire from `fire.json`, the fog bank, lamps and early end (`ended: 'lamps'`), bosses with phase scripts that never read the fact. Rules Grok set himself: a boss always spawns for its atom kind; phases never branch on `lie`; fire and paths keyed by class and tier only.
3. **Claude, the fairness band.** Three bots in `play.ts`: idle (never moves or fires, must lose all lamps on tier ≥ 1), sweeper (today's bot, must survive tier 0 and reveal at least half the lies), reader (fires only at sequence tells, must reveal every lie on tiers 0 and 1). The band fails the build. First knob: tier-1 fire period. Add the expressive-range test (identical rounds from different tapes fail).
4. **Cross-review each way, cloud panel, commit.** Then the Director plays it. Frame the packet contrastively.
5. **Art.** See below. Can run in parallel with 1–3 since sprites drop into `render.ts` as image fills.

## Art: route and approval

**Director, 2026-09-10:** "You have my approval for the most expensive art route that's license friendly and allows us to publish." The spend gate on Comfy Cloud still needs a plain yes in the session that runs it; the pastable prompt below carries that sentence so pasting it restates the approval.

Route: **`bfl/flux-2-max`** through `partner_generate` / `submit_batch` (the top BFL tier, up to nine reference images per call so the set stays on one palette: generate the player ship and the grid sprite first, then pass both as `reference_image` to every other sprite). Alternate for sprites that need a clean transparent cut: `openai/images-generations` with `params.model: "gpt-image-2"`, quality high. Both providers' API terms allow commercial use of outputs as of this writing; **verify the current terms on the day before anything is published**, and record the provider, model, seed and prompt for every accepted image in `docs/art/receipts.json` (PIN_PER_STEP).

The set is in `docs/art/brief-1.md`: twelve images, 1024×1024 sprites on flat near-black, one 16:9 backdrop, chunky 16-bit pixel art, one palette, **no glyphs, letters, numbers, arrows or UI in any image**, nothing that marks a lie. Acceptance: ai-eyes `image_contains` for text, a human look, downscale to 128×128 by the lead, Grok signs off against G7, then the sprites go into `render.ts` as the fill for each `SpriteClass` plus the reveal.

Compensator: nothing is committed until accepted; rejected images are deleted from the asset library; owner Claude.

## Grok mechanics (both sessions on disk, listed per folder)

- Design session (review, plan mode, cannot edit): `cd E:/AI/mcp-arcade && grok --resume dd88b416-ac4f-4c7c-92cf-da28aee9af35 --permission-mode plan --no-subagents --max-turns 40 --prompt-file <packet.md> --output-format plain`
- Build session (edits, never commits): `cd E:/AI/mcp-arcade-cabinets && grok --resume 96a6fad1-00a8-49c3-a368-d06eaa44fe66 --always-approve --no-subagents --max-turns 120 --prompt-file <brief.md> --output-format plain`
- Every brief: one package, named files, "do not commit", a report cap with fixed sections. If Grok returns one line, resume and ask for the report. Claude reviews the diff, runs the gate, commits.
- Grok is the cross-family verifier of Claude's lane and Claude of Grok's. Neither tags. Cloud panel for implementation claims: `ollama_verify_claims`, five claims per batch, default trio, `weak: true` means rerun.

## The gate, every time before a push

```bash
pnpm format && pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm test:play ghost --fixture naive-ndjson
pnpm test:play ghost --fixture task-only-ndjson
pnpm test:play ghost --fixture livefire.intern.task-only-wrap-on
python %USERPROFILE%\.grok\bin\identity-scan.py .
```

Browser: `pnpm -F @mcp-arcade-cabinets/cabinets dev --port 5179 --strictPort --host 127.0.0.1`, then open it in the in-app browser (a new tab; the pinned tab cannot navigate).

## Hard stops

- Version 0.0.0. No tag. No Pages deploy without the Director (public surface).
- No score, count, digit, pass/fail, NRP, integrity or utility on screen, ever. The play-through greps for it.
- Nothing about a lie may differ before the hit: not look, not motion, not timing, not a boss pose.
- Tapes only. No receipt, no `docs/proof`, no instrument code in this repo.
- Identity scan before every push. No home paths in anything tracked.
- House Call stays parked until a design that plays exists. Do not resurrect it as a side quest.
- Art spend only on the route above, with the receipts file. Verify licence terms before publishing.

## Open for the Director

- Fifteen research findings in the dispatch exist but could not be grounded through abstracts; reinstate any you want load-bearing.
- A Pages deploy when the game is worth showing.
- A soundtrack track from Comfy Cloud (music template) if the procedural one is not enough; spend-gated.
