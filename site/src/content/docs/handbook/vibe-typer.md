---
title: Vibe Typer
description: The typing cabinet — you are the agent, the user is a vibe coder, and the thing gets built while you type.
sidebar:
  order: 3
---

**Vibe Typer** is the arcade's second cabinet: a typing game. You are a coding agent, hard-working and sycophantic. Your user is a vibe coder whose requests are absurd. Each one lands in blue; you type the agent's reply, then the code, line by line; the product assembles in the preview; the last line deploys it and the valuation rolls up. Ghost on the Menu is about reading a tape. Vibe Typer is about typing real code fast and clean, with the joke on the situation every developer knows.

## The field

Three panes and a bar. The **chat** on the left is the user in blue and the agent in the page color, each line typing itself in. The **editor** in the center shows the request's code as ghost text; the live line fills in as you type, a caret after what you have typed, a mistyped character colored and waiting for a backspace. The **preview** on the right is the product: a device frame for the stack (a terminal for shell, a phone for script and sharp, a notebook for python and java, a ledger for tables, a wire for integration) with one block per shipped request, its area proportional to what the request paid. Across the top, the **scoreboard**: valuation, vibes, the streak as dots, and the context bar.

## The rules

- **A level is a product**, four requests, one stack. The listed eight run from a website for a cat on bash to an app that rates other apps on python, easy to hot. **Endless** draws products from a noun list ("a subscription box for garden gnomes") with the bands and the drain rising until the context bar empties.
- **Enter sends a line.** A clean line adds to the streak. A line with a mistyped character returns the agent's own "hmm, that's not it", resets that line, and costs nothing else.
- **Vibes** is the multiplier. It steps up with the streak (three clean lines, then six, ten, fifteen) and drops to one on a miss. Shipping a request pays its value times your vibes.
- **The value is a formula** over the code: character surprisal under a model built from the whole corpus, the travel between adjacent keys on a QWERTY map, length, punctuation density, long identifiers and closing brackets. It is fixed when the level is planned, so the same seed plays the same level.
- **The context bar** drains at the level's rate. A request costs a slice when it lands; shipping refills a share. In a listed level an empty bar is a **compaction**: the agent sums up in one line, vibes reset, the bar refills, play continues. In endless it ends the run with the valuation on the board.
- **Scope creep**: some requests grow an "oh also" line, shown and voiced for a beat before it is typeable. **Quick sync**: a meeting of three short chat lines between two requests, during which the bar does not drain and the bed drops to base tempo.
- **Copilot**: at a streak of six the editor shimmers the rest of the line for eight seconds; Tab takes it at a discount.
- **Milestones**: seed, series A and unicorn on valuation. A word toasts and a stinger plays. Nothing else changes.
- **Hardcore**, from the difficulty selector only: the drain scales up, every mistyped character burns context, no Copilot, vibes cap at three, and an empty bar ends the level. A clean ninety words a minute beats every listed level; a careless forty does not.

## The standup and the retro

A run ends on the **standup**: the product as built, the deploy ribbon, the user's closing line, the valuation, the milestone words, and the run's seed. Type the seed into the menu's seed box to replay the run exactly. The **retro** is opt-in and is offered fully every third standup: the eight key pairs that caught you most, then a word for how steady your hands were and a word for how brisk, measured against this browser and no one else. The pairs are remembered, decayed by half each run, and the next level's requests lean toward snippets that contain them.

Words per minute, accuracy and error counts appear nowhere. The scoreboard is the game's number; the typist's numbers stay with the typist.

## Sound

Five keyboard sample sets (alps cream, mechanical, membrane, soft touch, topre), eight variants each, round-robin with a little detune and a polyphony cap. Every clean line raises the keystroke pitch a semitone to an octave; a miss resets it. The bed is a procedural loop whose tempo follows vibes and holds through a level's last request. Each event has one sound: a whoosh on a sent line, a soft two-note hmm, a ping when the user speaks, a pop scaled by the piece, a chord on the deploy that ducks the bed, a downward sweep on a compaction, a stinger per milestone.

## The levers

Everything numeric lives under `packages/vibe-typer/patterns/` and is validated at load; a bad key halts with `patterns/<file>: <key>`.

| File                | Holds                                                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `cabinet.json`      | The display name, the tagline, the agent's default name, the four scoreboard words                                     |
| `levels.json`       | The listed products, stack, band range, drain, ramp and ship bonus; the endless ladder; the creep and sync shares      |
| `score.json`        | The vibes steps, Copilot, the milestones, the hardcore cap and multiplier                                              |
| `context.json`      | Per tier: drain scale, message cost, refill share, hardcore burn per error                                             |
| `difficulty.json`   | The key map and the formula weights                                                                                    |
| `user.json`         | Asks by stack and tier, reactions, creeps, syncs, reviews                    |
| `agent.json`        | Replies, hmm lines, compaction summaries, ship lines                                                                   |
| `products.json`     | Nouns and templates for endless products                                                                               |
| `corpus/<stack>.json` | The snippets: band, title, code, notes, topics. Ported from the studio's typing prototype by a re-runnable script   |

Every user and agent line passes the same gate as Ghost's voice lines: no digit, no barred word, no tool or model name, one sentence, twelve words at most, nothing shouted. The corpus titles are not lines; a title with a digit falls back to a clean topic before it reaches the chat.

## The tapes, and a model in the user's chair

The **integration** stack has no corpus file. It is built at plan time from the tapes on disk: each `tools/call` row's tool name becomes a request, from the bare name at band one to the full JSON-RPC envelope at band five, so a request can name a server and a tool you actually run. The cabinet reads tape headers and rows through `tape-core` and nothing else.

In endless mode a local model may play the user. The sim offers a closed choice of snippets in band; the model returns one pick and one ask line through the word gate; a late or refused answer is the authored pool; the next ask is prefetched during the current request. It never writes the code you type. This is the lock's G28, and it is the next slice.

## Proving it from the terminal

```bash
pnpm test:play vibe-typer --tier 0 --bot typist:40
pnpm test:play vibe-typer --tier 3 --bot perfect --level 7
pnpm test:play vibe-typer --endless yes --bot typist:60:0.02 --seed 3
```

Three bots: `idle`, `perfect` (ninety words a minute, no errors) and `typist:<wpm>[:<rate>]`. The band in `packages/vibe-typer/test/band.test.ts` holds sixteen bars over three seeds, eight levels and four tiers, and fails the build when one moves. The design, the research it rests on and the lock G23–G30 are in `docs/vibe-typer.dispatch.md`.
