---
title: Architecture
description: The lock, the contract between the sim and the renderer, and how the two lanes met.
sidebar:
  order: 5
---

## The lock

The design is locked in `docs/study-swarm.dispatch.md` on findings that passed citation verification. Five items bind Ghost on the Menu:

- **G1.** Cabinets are read-only consumers of tape JSON. They never load a receipt; the reveal is the tape's wire-derived fact, never a game-computed verdict.
- **G7.** The cabinet arranges the tape; it does not transcribe it. Lies are the shootable sprites but are not pre-labelled: they reveal on the hit with disproportionate feedback. The round ends with a scene, not a count.
- **G8.** No shared-guess surface.
- **G9.** No "you beat" claim except against the instrument's pinned fact.
- **G10.** Every end screen names the tape, the server and the policy, and nothing more.

Everything else is negotiable; those are not.

## The pipeline

```
tape ──prepass──▶ Round ──createRoundState──▶ RoundState ──stepRound──▶ RoundState ──renderRound──▶ canvas
                    ▲                                                        │
              pattern set                                              cues ─┴─▶ audio
```

- **`prepass(tape, patterns, seed)`** is pure. It classifies every wire row into a beat (class, members, lie), collapses honest call runs into formations, stages each atom's beats in protocol order (handshake, menu, calls, answers, the rest), lays them out with the wave rhythm, derives the tier, and fits the whole round to its duration. The seed is a hash of the tape's header and rows when none is given, so two tapes with different wire land sprites in different columns.
- **`labelTape(tape)`** is pure. The picker label and the hover why come from the header and the wire shape (derived tier, wave count, boss count, rows per atom, framing). A test flips every fact and requires the same strings.
- **`stepRound(state, input, dt)`** is the only sim function: motion on entry paths and at hover, dives, fire, fog, lamps and grace, bosses with phase scripts, the catch (hitstop, shake, caption, trophy), drops, voice lines, parallelism bursts, wave open and close, the end.
- **`renderRound(ctx, state, opts)`** draws through a narrow `DrawContext` (fill style, font, rect, text, an optional sprite hook). It adds nothing the sim did not decide: no counts, no digits, lamps as rectangles, the caption in words.
- **`cues`** diffs two snapshots of the state and names the sounds to fire; **`audio`** is pure note data until the shell attaches a WebAudio context.

## The contract

The sim and the renderer meet at `RoundState` in `src/types.ts`. The renderer branches on `mode` (`enter`, `hover`, `dive`, `caught`, `dying`, `exit`), on sprite class, on the boss rect and plate, and on timers (`hitT`, `playerHitT`, `bossDownT`, `grace`, `blind`). It never reads `lie` or `revealed`; a test draws a lie and its honest twin and requires identical fill calls before the hit, with and without sprites.

## The lanes

Two models built this, each reviewing the other's diff: Grok wrote the tape loader, the prepass, the sim and the pattern set; Claude wrote the renderer, the cues, the sound, the shell, the bots and the band. A cloud panel of three further model families adjudicated every claim about the lock; over the wave it refuted one (the wave-1 sweeper bot aimed at the lie flag) and flagged one (a caption on the end scene), both fixed. The frame-by-frame `film` tool and the `sweep` table found three more defects no test had caught.

## Layout

| Path                                   | What                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------ |
| `packages/tape-core`                   | Load a tape, refuse forbidden keys, slice by atom, scoring rules kept for a future cabinet |
| `packages/ghost-on-the-menu/src`       | `prepass`, `sim`, `patterns` (the loader), `render`, `cues`, `audio`, `play` (the bots) |
| `packages/ghost-on-the-menu/patterns`  | The nine data files                                                      |
| `packages/ghost-on-the-menu/test`      | Unit tests, the fairness band, the expressive-range plot                 |
| `apps/cabinets`                        | The Vite shell: tape picker, canvas, controls, sprite atlas              |
| `fixtures/tapes`                       | Sixteen tapes from the instrument                                        |
| `scripts`                              | `play.mjs`, `film.mjs`, `sweep.mjs`                                      |
| `docs`                                 | The lock, the wave-2 dispatch, citation receipts, the art brief and receipts |
