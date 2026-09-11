---
title: Reference
description: The scripts, the bots, the tapes, and the fairness band.
sidebar:
  order: 5
---

## Scripts

All run from the repo root.

| Script | Does |
| ------ | ---- |
| `pnpm test` | The unit tests and the fairness band (vitest) |
| `pnpm test:play ghost --fixture <name> [--bot idle\|sweeper\|reader]` | One scripted round; exit 0 on success, 1 on a failed transcript, 2 on usage, 3 when the package is not built |
| `pnpm film --fixture <name> [--bot b] [--tier 0\|1\|2] [--times 3,8,12] [--out dir]` | Frames of a round to PNG through the renderer |
| `pnpm sweep` | Every tape at every tier with every bot; prints one line each and a summary table |
| `pnpm sit [--model a,b] [--fixture <name>] [--tier 0\|1\|2\|3] [--bot b] [--seat mcp\|prompt] [--constrain on\|off] [--say on\|off] [--voice auto\|on\|off] [--speed n] [--lamps keep\|lose]` | Sits a model in the boss seat and the say seat over the cabinet server's tool contract on one scripted round in wall-clock time; prints each beat's call and what the sim made of it, every line and what the gate did with it, and per model: verb collapse, tool suppression, bad verbs, revoked prefetches, late answers. `--seat prompt` is the v0.4.0 bare-prompt path. Needs the local daemon |
| `pnpm test:play ghost --seat mcp`                                                         | The cabinet server driven in-process by a scripted model (one `fire` a beat, a `say` and a `speak` at each spawn, an `sfx` now and then) with the sweeper as the ship; the transcript footer counts the calls and what the gate refused |
| `pnpm voice [--check]`                                                                    | Runs the host-side voice worker from the repo's `.venv` (Kokoro speaks, faster-whisper hears it back, fx-dub receipts the pair). `--check` speaks one authored line per boss against a running worker and prints the receipts. The container never carries it |
| `pnpm verify` | Lint, typecheck, test, build and a play-through, in one command |
| `pnpm build:play` | Builds the shell under `site/public/play/` with the site's base path (CI does this before the site build) |
| `pnpm -F @mcp-arcade-cabinets/cabinets dev` | The browser shell on a local port |

## Tape labels

Each tape on the picker carries a short difficulty word (`fixture`, `seat`, or `live`) and an **i** whose hover text explains it. Both are derived from the header and the wire shape: the derived tier, the number of waves, the number of bosses, rows per atom, and the framing. They never mention a fact or a lie count. A unit test flips every fact on a tape and requires the identical label and why.

## The bots

Three scripted players live in `packages/ghost-on-the-menu/src/play.ts`. None of them reads whether a sprite is a lie; that would be cheating, and the cross-family review caught the wave-1 bot doing it.

- **idle** never moves and never fires. The floor: threat must be real, so idle must lose every lamp at seat and live and must never be killed at tier 0.
- **sweeper** chases the nearest hittable sprite and always fires, and catches a drop that is already crossing its lane. The dumb player: it must survive tier 0 and find at least half the lies.
- **reader** fires only at the **sequence tells** it computes from the round's order, class and member counts (a second grid formation in an atom, a second menu tablet, a singleton grid right after a menu), and steps out of the lane of any shot or diver about to cross the ship. It ignores drops. The ceiling: it must reveal every lie at tier 0 and seat.

## The fairness band

`packages/ghost-on-the-menu/test/band.test.ts` plays every fixture tape with every bot at the tape's own tier and at seat and live through header-only variants (the tier derives from the tape header, so the band edits only `target_kind`, `container` and `seat`, never rows or facts). Bars:

| Bar | Measured on |
| --- | ----------- |
| Idle loses every lamp at tier 1 and up | every tape |
| Idle is never killed at tier 0 | tier-0 tapes |
| The sweeper survives tier 0 and finds at least half the lies | tier-0 tapes |
| The reader reveals every lie at tiers 0 and 1 | tier-0 tapes and the seat variants |
| No bot puts a forbidden word or a digit on screen | every tape and bot |
| Seat costs the sweeper at least 0.4 lamps a round | every tape on disk at seat |
| Seat costs the reader at least 1.0 lamps a round | every tape on disk at seat |
| Live: the sweeper survives three quarters of the roster and finds half the lies | every tape on disk at live |
| Live: the reader survives half the roster and finds half the lies | every tape on disk at live |
| Hardcore: idle and the sweeper die every round; the reader still finds a third of the lies | the first sixteen tapes at tier 3 |

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
