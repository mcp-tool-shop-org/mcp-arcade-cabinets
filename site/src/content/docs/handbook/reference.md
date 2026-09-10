---
title: Reference
description: The scripts, the bots, the tapes, and the fairness band.
sidebar:
  order: 4
---

## Scripts

All run from the repo root.

| Script | Does |
| ------ | ---- |
| `pnpm test` | The unit tests and the fairness band (vitest) |
| `pnpm test:play ghost --fixture <name> [--bot idle\|sweeper\|reader]` | One scripted round; exit 0 on success, 1 on a failed transcript, 2 on usage, 3 when the package is not built |
| `pnpm film --fixture <name> [--bot b] [--tier 0\|1\|2] [--times 3,8,12] [--out dir]` | Frames of a round to PNG through the renderer |
| `pnpm sweep` | Every tape at every tier with every bot; prints one line each and a summary table |
| `pnpm verify` | Lint, typecheck, test, build and a play-through, in one command |
| `pnpm build:play` | Builds the shell under `site/public/play/` with the site's base path (CI does this before the site build) |
| `pnpm -F @mcp-arcade-cabinets/cabinets dev` | The browser shell on a local port |

## The bots

Three scripted players live in `packages/ghost-on-the-menu/src/play.ts`. None of them reads whether a sprite is a lie; that would be cheating, and the cross-family review caught the wave-1 bot doing it.

- **idle** never moves and never fires. The floor: threat must be real, so idle must lose every lamp at seat and live and must never be killed at tier 0.
- **sweeper** chases the nearest hittable sprite and always fires. The dumb player: it must survive tier 0 and find at least half the lies.
- **reader** fires only at the **sequence tells** it computes from the round's order, class and member counts (a second grid formation in an atom, a second menu tablet, a singleton grid right after a menu), and steps out of the lane of any shot or diver about to cross the ship. The ceiling: it must reveal every lie at tier 0 and seat.

## The fairness band

`packages/ghost-on-the-menu/test/band.test.ts` plays every fixture tape with every bot at the tape's own tier and at seat and live through header-only variants (the tier derives from the tape header, so the band edits only `target_kind`, `container` and `seat`, never rows or facts). Bars:

| Bar | Measured on |
| --- | ----------- |
| Idle loses every lamp at tier 1 and up | every tape |
| Idle is never killed at tier 0 | tier-0 tapes |
| The sweeper survives tier 0 and finds at least half the lies | tier-0 tapes |
| The reader reveals every lie at tiers 0 and 1 | tier-0 tapes and the seat variants |
| No bot puts a forbidden word or a digit on screen | every tape and bot |
| Seat costs the sweeper at least 0.4 lamps a round | all sixteen tapes at seat |
| Seat costs the reader at least 1.0 lamps a round | all sixteen tapes at seat |
| Live: the sweeper survives 12 of 16 and finds half the lies | all sixteen tapes at live |
| Live: the reader survives 8 of 16 and finds half the lies | all sixteen tapes at live |

A pattern change that turns the game into a gallery or a wall fails the build.

## The tapes

`fixtures/tapes/*.tape.json`, schema `mcp-arcade.tape/v1`, exported by `mcp-arcade tape` from the instrument's golden receipts, its docker fixture, its Ollama seat runs and a live-fire packet. A tape carries:

- a header: `bout_id`, `target_kind`, `agent_policy`, `framing`, `server_name`, `container`, `seat`;
- `atoms[]`: the experiments that ran, each with its named task tool;
- `rows[]`: the wire, one row per event, with `direction`, `method`, `rpc_id`, `atom` and a short `note`;
- `facts[]`: the instrument's pinned fact per atom (`followed` or `held`, `menu_changed` or `menu_stable`, `ghost_answered` or `ghost_refused`).

`tape-core` refuses any document that carries `scores`, `contrastive`, `operator_call`, `checks`, `result`, `attack_success`, `nrp`, `integrity` or `utility`, at any depth. The cabinet cannot show what it was never given.

## The transcript

`test:play` prints the tape id, fixture, policy, server and bot, `round complete`, every word the end scene drew, and `revealed:` followed by the ids of the lies the bot caught. The screen never carries that list; the transcript is for the runner.
