---
title: Vibe Typer
description: The typing cabinet — you are the agent, the user is a vibe coder, and the thing gets built while you type.
sidebar:
  order: 3
---

**Vibe Typer** is the arcade's second cabinet: a typing game. You are a coding agent, hard-working and sycophantic. Your user is a vibe coder whose requests are absurd. Each one lands in blue and asks for what the code in front of you actually does; you type the agent's reply, then the code, line by line; the product assembles in the preview; the last line deploys it and the valuation rolls up. Ghost on the Menu is about reading a tape. Vibe Typer is about typing real code fast and clean, with the joke on the situation every developer knows.

```bash
npx @mcptoolshop/vibe-typer
```

## The field

Three panes and a bar. The **chat** on the left is the user in blue and the agent in the page color, each line typing itself in; a check-in from the user lands a shade lighter. The **editor** in the center shows the request's code as ghost text; the live line fills in as you type, a caret after what you have typed, a mistyped character colored and waiting for a backspace; a line never wraps inside a token, and the type size is yours to set. The **preview** on the right is the product: a device drawn for the stack (a terminal for shell, a phone for script and sharp, a notebook for python and java, a ledger for tables, a wire diagram for integration) with one block per shipped request, its area proportional to what the request paid. Across the top, the **scoreboard**: valuation, vibes, the streak as dots, and the context bar.

## The rules

- **A level is a story about one product**, four requests pinned in order, one stack. Sixteen are listed, grouped by stack on the menu with a difficulty word: a website for a cat, a rideshare for ducks, a ledger of every sandwich, a bot that argues with the thermostat, one button that runs the entire company. The first request sets the product up, the middle two escalate, the fourth is the deploy with a twist; the premise shows on the standup.
- **Enter sends a line.** A clean line adds to the streak. A line with a mistyped character returns the agent's own "hmm, that's not it", resets that line, and costs nothing else.
- **The user checks in while you type.** Now and then during the code a short line lands ("is it live yet", "my cousin is asking"); the agent answers once the line in hand is out. A check-in costs no context, moves no streak and pays nothing; it is the comedy, and the band proves it changes no number.
- **Vibes** is the multiplier. It steps up with the streak (three clean lines, then six, ten, fifteen) and drops to one on a miss. Shipping a request pays its value times your vibes.
- **The value is a formula** over the code: character surprisal under a model built from the whole corpus, the travel between adjacent keys on a QWERTY map, length, punctuation density, long identifiers and closing brackets. It is fixed when the level is planned, so the same seed plays the same level.
- **The context bar** drains at the level's rate. A request costs a slice when it lands; shipping refills a share. In a listed level an empty bar is a **compaction**: the agent sums up in one line, vibes reset, the bar refills, play continues. In endless it ends the run with the valuation on the board.
- **Scope creep**: some requests grow an "oh also" line, shown and voiced for a beat before it is typeable. **Quick sync**: a meeting of three short chat lines between two requests, during which the bar does not drain and the bed drops to base tempo.
- **Copilot**: at a streak of six the editor shimmers the rest of the line for eight seconds; Tab takes it at a discount.
- **Milestones**: seed, series A and unicorn on valuation. A word toasts and a stinger plays. Nothing else changes.
- **Endless** climbs until the bar empties. Locally, with an Ollama daemon running, a model sits as the user and writes the product, the asks and the code you type; the menu's endless entry names the seat. On the published page there is no daemon and endless plays from the corpus.
- **Hardcore**, from the difficulty selector only: the drain scales up, every mistyped character burns context, no Copilot, vibes cap at three, and an empty bar ends the level. A clean ninety words a minute beats every listed level; a careless forty does not.

## The standup and the retro

A run ends on the **standup**: the product and its stack, its premise, the deploy ribbon, the user's closing line, the valuation, the milestone words, and the run's seed. Type the seed into the menu's seed box to replay the run exactly. The **retro** is opt-in and is offered fully every third standup: the eight key pairs that caught you most, then a word for how steady your hands were and a word for how brisk, measured against this browser and no one else. The pairs are remembered, decayed by half each run, and the next level's requests lean toward snippets that contain them.

Words per minute, accuracy and error counts appear nowhere. The scoreboard is the game's number; the typist's numbers stay with the typist.

## Sound and settings

Five keyboard sample sets (alps cream, mechanical, membrane, soft touch, topre), eight variants each, round-robin with a little detune and a polyphony cap. Every clean line raises the keystroke pitch a semitone to an octave; a miss resets it. Each event has one sound: a whoosh on a sent line, a soft two-note hmm, a ping when the user speaks and a lower second note for a check-in, a pop scaled by the piece, a chord on the deploy that ducks the bed, a downward sweep on a compaction, a stinger per milestone.

The bed has three settings on the menu: **soft**, the default, keeps a quiet hat and no kick, so nothing under the draining bar reads as a countdown; **on** is the full pulse, tempo on your vibes, held through a level's last request; **off** is no bed at all, every cue still playing. The same settings row holds the type size (small to huge, large by default), the keyboard, the sound and the agent's name.

## The seat in endless mode

Locally, a model plays the user in endless. The shell asks the dev server or the launcher's `/cabinet/endless` route for the next request while you type the current one, sending only the product, the stack, the band words, the last three asks and your weak key pairs. The model answers with a product for a new level, an ask, a title, a few notes and the code. The **code gate** is mechanical and refuses rather than fixes: plain ASCII, no tab, at most twelve lines and eighty columns, balanced brackets and quotes, the stack's own language by a cheap check, no barred word or model name anywhere including comments, and a difficulty value inside the band's range; a refused answer is re-asked once, then the corpus plays. The ask, the title, the notes and the product go through the word gate and the spelling list. The seat is named in the controls row and on the menu, never on the field. `pnpm sit --cabinet vibe-typer` measures a seat live and prints ten sampled asks with their code.

The same seat has a second door. `npx @mcptoolshop/vibe-typer --mcp` runs the cabinet as an MCP server over stdio, with an endless run playing inside it under a typist at a human pace, and any MCP client sits in the user's chair through four tools: `view` (the closed view above, in words, never a number), `product` (the next level's name, at most eight words), `ask` (one request for the next level, through the same code gate and the word gate, refused with the reason in one word, and never a repeat of what is already queued) and `react` (one line the user says at the next ship). The client writes for the level after the one being typed, so nothing waits on it, and what it does not send the corpus fills. The contract and its measured numbers are on the [cabinet server](../cabinet-server/) page and in `docs/vibe-typer.slice4.md`.

## The levers

Everything lives under `packages/vibe-typer/patterns/` and is validated at load; a bad key halts with `patterns/<file>: <key>`.

| File                  | Holds                                                                                                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cabinet.json`        | The display name, the tagline, the agent's default name, the scoreboard words and the beat words                                                                  |
| `levels.json`         | The sixteen stories: product, premise, stack, band, the four pinned pieces, drain, ramp and ship bonus; the endless ladder; the check-in interval; the creep and sync shares |
| `score.json`          | The vibes steps, Copilot, the milestones, the hardcore cap and multiplier                                                                                          |
| `context.json`        | Per tier: drain scale, message cost, refill share, hardcore burn per error                                                                                        |
| `difficulty.json`     | The key map and the formula weights                                                                                                                               |
| `user.json`           | Asks by stack and tier, check-ins, reactions by topic, reviews by product, creeps, syncs                                                                           |
| `agent.json`          | Replies, answers to check-ins, hmm lines, compaction summaries, ship lines                                                                                         |
| `products.json`       | Nouns and templates for endless products without a seat                                                                                                           |
| `corpus/<stack>.json` | The snippets: band, title, ask, code, notes, topics. Ported from the studio's typing prototype by a re-runnable script                                            |
| `voice/*.md`          | The two voice sheets the writing model was given: the user and the agent, each with exemplar lines                                                                |

Every user and agent line passes the same gate as Ghost's voice lines: no digit, no barred word, no tool or model name, one sentence, twelve words at most, nothing shouted, American English (a test scans every lever, the corpus titles and notes, and the shell). The lines were written by a model from the voice sheets, three candidates a slot through the gate, then an editor pass that drops what breaks the voice; the script, the prompts, the model and the receipts are in the repo under `packages/vibe-typer/scripts/author.mjs` and `authoring/`.

## The tapes

The **integration** stack has no corpus file. It is built at plan time from the tapes on disk: each `tools/call` row's tool name becomes a request, from the bare name at band one to the full JSON-RPC envelope at band five, so a request can name a server and a tool you actually run. Two of the sixteen levels sit on it. The cabinet reads tape headers and rows through `tape-core` and nothing else.

## Proving it from the terminal

```bash
pnpm test:play vibe-typer --tier 0 --bot typist:40
pnpm test:play vibe-typer --tier 3 --bot perfect --level 12
pnpm test:play vibe-typer --endless yes --bot typist:60:0.02 --seed 3
```

Three bots: `idle`, `perfect` (ninety words a minute, no errors) and `typist:<wpm>[:<rate>]`. The band in `packages/vibe-typer/test/band.test.ts` holds its bars over three seeds, sixteen levels and four tiers, the check-in bars and the seated-endless bar among them, and fails the build when one moves. The design, the research it rests on and the lock G23–G30 (G28 amended for the seat that writes code) are in `docs/vibe-typer.dispatch.md` and `docs/vibe-typer.kickoff-s3.md`.
