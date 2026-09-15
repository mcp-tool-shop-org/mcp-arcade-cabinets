# Vibe Typer — slice 2, the shell

**Date:** 2026-09-15. **Builder:** Opus (this slice). **Coordinator:** Claude (Fable 5.1). **Director:** Mike.
**Brief:** `docs/vibe-typer.kickoff-s2.md` under `docs/vibe-typer.dispatch.md` (the lock G23–G30).
**Branch:** `cabinet/vibe-typer-s2`, one commit, not merged.

The cabinet is playable in the browser. Ghost is untouched and plays exactly as before; the menu now opens on a
two-card switch with Ghost selected, and Vibe Typer sits beside it. No art, no music files, no voice, no npm,
no release, no spend. Version stays `0.8.2`.

## Standards compliance

| Standard                 | Score | Evidence                                                                                                                                                                                                                                |
| ------------------------ | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PIN_PER_STEP             | 2     | The shell steps the seeded sim at a fixed `1/60` and feeds one keystroke a step; the run's seed is printed on the standup and typing it into the menu's seed box replays the run. Nothing in the loop reads the wall clock for the sim. |
| ANDON_AUTHORITY          | 3     | `pnpm verify` and `pnpm build:play` gate the push; the cue table's `never` default makes a new event kind a type error, and `typer-cues.test.ts` walks every kind at run time as well; the jsdom mount test fails `pnpm test`.          |
| NAMED_COMPENSATORS       | 2     | The slice's only irreversible action is the branch push. Compensator: `git push origin --delete cabinet/vibe-typer-s2` (owner: the coordinator). No npm, no tag, no release, no Pages deploy from this branch.                          |
| DECOMPOSE_BY_SECRETS     | 3     | Four modules that change for four reasons: keys (the keyboard), cues (the table), audio (the sound), the mount (the field). The sim is untouched by the shell; the shell only reads `state` and drains `state.events`.                  |
| UNCERTAINTY_GATED_HUMANS | 2     | Every feel number is a `// Director` constant at the top of `typer-cues.ts`, `typer-audio.ts` and `vibe-typer.ts`, named and commented, and the table below repeats them. Where the brief was silent the choice is under Decisions.     |
| EXTERNAL_VERIFIER        | 2     | This builder never reviews its own diff; the coordinator sends it to a different family from a packet before merge. The band and the play-through are the mechanical checks that do not ask the builder whether the game is fair.       |

## What was built

```
apps/cabinets/src/
  typer-keys.ts    keydown → RunInput, pure; Escape is a hold, not a tap
  typer-cues.ts    Event → Cue, exhaustive with a `never` default; the shake and flash amounts
  typer-audio.ts   the keystroke engine (five sample sets, round-robin, detune, polyphony, pitch),
                   the synth cues, the procedural bed with tempo on vibes, the deploy duck
  vibe-typer.ts    mountVibeTyper: the three panes, the board, the loop, the prefs, the standup, the retro
apps/cabinets/public/keys/{alpscream,mechanical,membrane,softtouch,topre}/key_0{1..8}.wav
apps/cabinets/test/
  typer-keys.test.ts (9)   typer-cues.test.ts (11)   typer-mount.test.ts (5, jsdom)
apps/cabinets/index.html   the field's CSS, added below Ghost's and touching none of it
apps/cabinets/src/main.ts  the cabinet switch, Ghost's menu moved into `ghostMenu`, the new `vibeMenu`
apps/cabinets/package.json  + `@mcp-arcade-cabinets/vibe-typer: workspace:*`
apps/cabinets/tsconfig.json + `test` in `include`, so the tests typecheck with the app
package.json                + `jsdom` (dev), for the mount test
```

In `packages/vibe-typer`, the quick sync and nothing else (below). `pnpm-lock.yaml` moved for `jsdom`.
Nothing in `packages/ghost-on-the-menu`, `tape-core`, `cabinet-server`, `launcher`, `catalog/`,
`.github/workflows/`, `site/` or `voice/` was touched.

### The field

- **Chat** (left). The user in blue (`.vibe-user`), the agent in the page colour, each line typing itself in at
  `CHAT_CPS` and the pane scrolled to the bottom. The header is the product and the agent's name. Never a digit:
  the sim guarantees the lines and the shell adds none (the mount test asserts it over a played request).
- **Editor** (centre). The beat in words above (`BEAT_WORDS`, never the enum); the request's lines as ghost text
  with the live one drawn character by character as `pending` / `ok` / `bad` with a caret at the typed length.
  Copilot on: the rest of the line shimmers and a small `Tab` sits under the editor. A bad key colours its
  character and does nothing else (G25). A line sent wrong shakes the editor pane by the capped amount and the
  agent's "hmm" lands in the chat. The creep beat shows the line arriving and the shell holds that frame for
  `CREEP_HOLD_MS` by not stepping the sim, so it is visible before it is typeable (Q4.1).
- **Preview** (right, canvas, 480×360 at 2× DPR). A device frame by stack — a terminal for bash, a phone for
  javascript and csharp, a notebook for python and java, a ledger for sql, a wire for integration — and one block
  a built piece, area proportional to `size`, packed by a seeded slice-and-dice over the frame's inner box so the
  same run draws the same product. A piece pops in from `POP_FROM` over `POP_MS`. The ship flashes white at
  `FLASH_SHIP` for `FLASH_MS`, throws at most `CONFETTI_MAX` seeded specks, and lays a `deployed` ribbon in words.
- **Scoreboard** (top). The four words from `cabinet.json → words` with their values: the valuation rolling up over
  `ROLLUP_MS` and never down, the vibes as `×N`, the streak as dots capped at the octave, and the context bar,
  which turns warm under `WARM_AT` and hot under the package's own `NEAR_MISS`. A milestone word toasts for
  `TOAST_MS`. No words a minute, no accuracy, no count of mistakes — nowhere on the field (G23).

### The menu

Two cards at the top: Ghost on the Menu (selected by default) and Vibe Typer with its tagline. The choice
persists, so a returning player lands on their game. Ghost's menu below the switch is byte-identical apart from
being a function (`ghostMenu(wrap)`) instead of the body of `menu()`. Vibe Typer's menu is the eight listed
levels (product, stack word, band word — no band digits), an **Endless** row, the four tier words, the five
keyboards, the dated-jokes checkbox (off), the agent-name box (digits stripped) and the seed box (blank draws
`nextSeed` off the last run; a typed number replays it, a typed word is hashed). Every choice persists under the
`vibe.` prefix.

## The sample sets

Copied from `E:/AI/prototypes/packages/dev-op-typer/DevOpTyper/Assets/Sounds/Sfx/<Set>/` into
`apps/cabinets/public/keys/<set>/`, filenames kept, folders lower-cased. Studio-authored; no licence text needed.
The ambient sets and the loose `ui_click.wav` were not copied.

| Folder       | From         | Files                 | Each     | Format                 | Length  |
| ------------ | ------------ | --------------------- | -------- | ---------------------- | ------- |
| `alpscream`  | `AlpsCream`  | `key_01`…`key_08`.wav | 9,746 B  | mono, 44.1 kHz, 16-bit | 0.110 s |
| `mechanical` | `Mechanical` | `key_01`…`key_08`.wav | 8,864 B  | mono, 44.1 kHz, 16-bit | 0.100 s |
| `membrane`   | `Membrane`   | `key_01`…`key_08`.wav | 7,982 B  | mono, 44.1 kHz, 16-bit | 0.090 s |
| `softtouch`  | `SoftTouch`  | `key_01`…`key_08`.wav | 5,336 B  | mono, 44.1 kHz, 16-bit | 0.060 s |
| `topre`      | `Topre`      | `key_01`…`key_08`.wav | 10,628 B | mono, 44.1 kHz, 16-bit | 0.120 s |

Forty files, about 436 KB in all. Each set is eight variants of one key and **no error sample**, which is a
decision below. `pnpm build:play` copies `public/keys/` into `site/public/play/keys/` unchanged.

## The cue table

`typer-cues.ts` is a `switch` over `Event['kind']` whose default assigns to `never`: a new event kind in the
package is a type error here before it is a silent nothing on the field. `typer-cues.test.ts` walks a value of
every kind at run time as well. Within one step a repeat is dropped — a bad line raises both `line` and `hmm`
and they are one sound — while every keystroke keeps its own cue.

| Event              | Cue                        | Sound (transient + tail)                                          | Feel                            |
| ------------------ | -------------------------- | ----------------------------------------------------------------- | ------------------------------- |
| `key` ok           | `key`                      | the set's next variant, detuned, `playbackRate = 2 ** (pitch/12)` | —                               |
| `key` bad          | `keybad`                   | the same keyboard at `ERROR_RATE`, `ERROR_GAIN`, plus a low thud  | no shake, ever (G25)            |
| `line` ok          | `sent`                     | a click and a rising whoosh, 0.22 s                               | —                               |
| `line` bad         | `hmm`                      | a soft two-note "hmm", down, 0.45 s                               | shake `SHAKE_BAD_LINE`          |
| `hmm`              | `hmm`                      | the same, and only once a step                                    | shake `SHAKE_BAD_LINE`          |
| `message` user     | `ping`                     | a high blip; a kick joins it when it lands on a beat              | —                               |
| `message` agent    | `blip`                     | a low blip, 0.16 s                                                | —                               |
| `piece`            | `pop`                      | a click and a tone that drops and lengthens with `size`           | the piece pops in               |
| `ship`             | `deploy`                   | a four-note chord, 0.6 s; the bed ducks                           | flash, confetti, ribbon         |
| `ship` near miss   | `grazed`                   | the same chord an octave down and quieter; the bed ducks          | flash, confetti, ribbon         |
| `compaction`       | `compaction`               | a downward sweep, 0.5 s                                           | shake `SHAKE_COMPACTION`        |
| `milestone`        | `milestone`                | a three-note stinger, lifted by the milestone's own name          | the word toasts for two seconds |
| `copilot` on / off | `shimmerIn` / `shimmerOut` | a shimmer up, and back down                                       | the line shimmers, `Tab` shows  |
| `creep`            | `creep`                    | the ping with a second note climbing after it                     | the line is held, then lands    |
| `sync` on / off    | `syncIn` / `syncOut`       | two soft blips connecting, and one letting go                     | the beat word changes           |
| `over` shipped     | `endShipped`               | the end chord, `END_TAIL` — the one sound past the cap            | the standup                     |
| `over` context     | `endContext`               | a soft fade down, `TAIL_CAP`                                      | the standup                     |

Every sound has a transient (a filtered noise burst) and a tail (an enveloped oscillator), and none runs longer
than `TAIL_CAP` = 0.7 s except the end chord at 1.6 s.

## The feel constants

All `// Director`, all at the top of their module, all named in the code.

**`typer-cues.ts`** — `SHAKE_BAD_LINE 4`, `SHAKE_COMPACTION 6`, `SHAKE_SCALE_MAX 1.5`, `SHAKE_LONG_LINE 60`
(a line this long shakes the full scale), `FLASH_SHIP 0.4`, `CONFETTI_MAX 120`.

**`typer-audio.ts`** — `BED_BPM 96`, `BED_HYPE 0.06` (tempo is `BED_BPM × (1 + 0.06 × (vibes − 1))`),
`DETUNE 0.03`, `POLYPHONY 6`, `ERROR_GAIN 0.6`, `ERROR_RATE 0.7`, `DUCK 0.5` with `DUCK_S 0.7`, `MASTER 0.9`,
`BED_LEVEL 0.16`, `TAIL_CAP 0.7`, `END_TAIL 1.6`, `BEAT_WINDOW 0.08`.

**`vibe-typer.ts`** — `STEP 1/60`, `MAX_STEPS 8`, `CREEP_HOLD_MS 600`, `POP_MS 240` from `POP_FROM 1.3`,
`ROLLUP_MS 400`, `FLASH_MS 120`, `TOAST_MS 2000`, `CHAT_CPS 90`, `WARM_AT 0.25`, `PREVIEW_W 480` ×
`PREVIEW_H 360` at `PREVIEW_DPR 2`, `STEADY_CV 0.45`, `BRISK_CPS 5.5`, `SLOW_CPS 2.5`, `WEAK_DECAY 0.5`,
`RETRO_EVERY 3`, `RETRO_PAIRS 8`.

## Quick sync — the one sim change

A meeting interrupts a level: three short lines the player types, between two requests, never in front of the
first and never after the last.

- `patterns/user.json` gains `syncs`: **fourteen** lines (`sounds good`, `will do`, `can you share your screen`,
  `let me find the link`, …), each **five words or fewer** and through the same gate as every other authored
  line. The loader halts on a long one with `patterns/user.json: syncs.<i>` (`MIN_SYNCS 12`, `MAX_SYNC_WORDS 5`).
- `patterns/levels.json` gains `syncShare: 0.25`, and the loader halts on its absence.
- `Beat` gains `'sync'`; `Event` gains `{ kind: 'sync'; on: boolean }`; `LevelPlan` gains `syncAt?: number`, the
  request index the meeting sits in front of. A new export, `syncOf(state)`, hands the shell the three lines.
- Enter sends a sync line like a reply line: clean, the line lands in the chat and the meeting moves on; wrong,
  the agent's own "hmm" and the line resets. No value, no piece, no context cost, and the streak is exactly where
  it was either way.
- The typist bot types a sync like any other line, so the band and the play-through drive it.

### The numbers

At `syncShare 0.25`, **23 of the 96** (tier, level, seed) plans in the band draw a sync — a shade under a quarter,
as the lever says. The seeded draw happens _after_ the requests are picked, so the lever moves the meeting and
never the snippets: `sim.test.ts` asserts that a run with `syncShare: 0` plans the same snippet ids.

**Every band bar holds, unchanged, and `syncShare` was not re-tuned.** The measured sweep after the change, over
seeds 1–3 and all eight levels, is the slice-1 sweep to the number:

```
tier 0 typist:40:0.03   compactions 0 on every level; every level shipped
tier 1 typist:40:0.03   compactions 0 except L5 and L6, one seed each
tier 2 typist:60:0.02   compactions 0 except L3, one seed
tier 3 perfect          shipped on every level and every seed, no compaction
tier 3 typist:40:0.03   ends by context on all eight levels
endless perfect         6, 7, 7 levels (seeds 1, 2, 3), valuations 1829, 3163, 2605
endless typist:40:0.03  3, 4, 4 levels, valuations 315, 318, 289
pnpm test:play vibe-typer --tier 0 --bot typist:40   valuation 96, pieces 4, compactions 0
```

That the numbers did not move at all is the point of one decision below: **the bar does not drain during a sync.**
The first cut let it drain, and one bar moved — hardcore, level one, seed one, where a clean ninety-words typist
lost the level to the clock. Lowering `syncShare` could not fix it: that plan's draw sits below 0.05, so the
meeting survived every candidate share down to `0.05` (measured: 0.30, 0.25, 0.20, 0.15, 0.12, 0.10, 0.05 all
failed the same bar, and each step down only cost syncs elsewhere — 29, 23, 19, 17, 14, 12, 7 of 96). Re-tuning
the share alone could not hold the band, so the breather was made a real one.

## Decisions

Where the brief and the dispatch were silent, the choice and the reason.

1. **A quick sync stops the drain.** "No context cost" reads as the whole cost, and a breather whose clock still
   eats your context is not a breather (Q3 tempo hold). The clock runs, the bed drops to base tempo, the bar
   holds still. This is what keeps every band bar at its slice-1 number; the alternative — the drain running, the
   share re-tuned — could not hold hardcore at any share above zero (the measurement is above).
2. **A sync line lands in the chat as the agent's.** The player is the agent, and everything the player types is
   the agent speaking; the pool lives in `user.json` because the brief puts it there and because the meeting is
   the user's, not the agent's. The lines are written to read either way ("can you share your screen").
3. **A sync line never moves the streak; a mistyped character still does.** The brief protects the _line_. The
   keystroke rule is the same everywhere in the game (G25), and the band's "no unexplained drops" bar reads a
   bad key as an explanation, so nothing had to bend.
4. **Three lines a sync, from a pool of fourteen.** `SYNC_LINES` is a constant in `sim.ts` beside the beat, not a
   lever: the brief fixes it at three. Fourteen lines is two over the loader's floor, so a meeting never repeats
   itself and the shuffle has room.
5. **The beat words live in the shell, not in `cabinet.json`.** The brief asks for the beat word to come from
   `cabinet.json → words`, and that file has only the four scoreboard words; adding beat words is a lever change
   the slice's file scope forbids (`packages/vibe-typer` for the quick sync only). `BEAT_WORDS` is therefore a
   `// Director` constant at the top of `vibe-typer.ts`, marked as belonging beside the other field words the
   next time the package is open. What the lock actually asks — that the enum never reaches the screen — holds.
6. **Mute persists under `vibe.prefs`, not Ghost's key.** Ghost's `Prefs` type has no mute field and `readPrefs`
   drops what it does not know, so writing one there would be dropped on Ghost's next write; `apps/cabinets/src/ghost.ts`
   is outside this slice's file scope. The mute button behaves exactly like Ghost's and remembers itself under
   the `vibe.` prefix.
7. **Escape needs a `keyup` listener as well.** A hold cannot be told from a tap with `keydown` alone (a keydown
   repeat is an operating-system setting, not a clock). The mount adds one listener for Escape's release and
   removes it with the other on unmount; the mount test asserts both are gone.
8. **The mount returns `{ unmount, tick }`.** The brief's test section asks for a `tick(dt)` to drive the loop,
   which is also what keeps the loop honest: `requestAnimationFrame` calls the same function the test does.
9. **The context bar has two warm steps.** The brief says warm below 25 percent and calls that the near-miss
   threshold, but `context.ts` puts `NEAR_MISS` at 0.1. Both are kept: warm at `WARM_AT` 0.25, hot at the
   package's `NEAR_MISS`, so the bar tells the truth about the near miss the sim actually scores.
10. **The preview packs with slice-and-dice, not a shelf.** Area proportional to `size` is the lock (G24), and a
    treemap is the layout that makes area the only thing that matters. The seed picks the first cut's direction,
    so the same run draws the same product; the layout is recomputed when a piece lands, which is what lets the
    product look like one thing being assembled rather than a row of bricks.
11. **A bad key never shakes, and a bad line shakes the editor only.** The shake is a transform on the editor
    pane, so the chat stays readable and the preview stays still. Reduced motion turns the caret and the shimmer
    off in CSS; the shake is small enough at these numbers to leave alone.
12. **The set has no error sample, so a bad key is the same keyboard lower and quieter** (`ERROR_RATE 0.7`,
    `ERROR_GAIN 0.6`) with a low thud under it. dev-op-typer's sets are eight variants of one key and nothing
    else; a synthesised buzzer would have yelled.
13. **The keyboard theme loads lazily and fails quietly.** A missing or undecodable sample leaves the buffers
    empty and the procedural click plays, so the game is never silent (LoKey's own rule). The mount test runs
    that path: its fake context refuses to decode.
14. **`integration` is computed once in `main.ts` from the bundled tapes** — tool names off `tools/call` rows and
    the server and policy off the header, the same reading `play.ts` does on disk — and passed into the mount, so
    the corpus is seasoned and its model rebuilt over the envelopes (G30). No level names the integration stack,
    so those snippets season the valuation model rather than the level list; a stack picker is slice 3's if it
    wants one.
15. **The agent's name is stripped of digits and capped at 24 characters.** The name is on the field, and the
    field carries no digits but the valuation and the vibes (G23).
16. **The standup counts levels in words and prints the seed as a number.** "Many" past twelve, as briefed. The
    seed is the one number besides the scoreboard, because it is what makes the run replayable (PIN_PER_STEP).
17. **The retro measures consistency from the clean lines the shell timed** — the coefficient of variation of
    characters a second, steady under `STEADY_CV` — and speed as a word after it, never a number, and only against
    this browser (G8, G27). Fewer than four clean lines reads "still finding it" rather than inventing a verdict.
18. **Weak pairs are halved, then merged, at the standup** and handed to the next `createRun`, so the planner
    leans toward them in real requests and never drills them bare (Q1.9).
19. **The loop caps its catch-up at eight steps and holds during a creep.** A tab that slept does not fast-forward
    a level, and the creep's one transitional step is delayed by the shell rather than by a change in the sim.
20. **Ghost's menu moved into a function and changed in no other way.** The switch is above it; the tape list, the
    shift row, the codes, the prefs and `playAt` are as they were. `pnpm test:play ghost --fixture naive-ndjson`
    prints what it printed before, and the launcher's own marker gate passes on `pnpm build:launcher`.

## Verification

```
pnpm verify        lint · typecheck · test (44 files, 466 tests) · build · test:play ghost · test:play vibe-typer
pnpm build:play    site/public/play/index.html + assets + keys/ (both cabinets in one bundle)
pnpm build:launcher  the pack's own gate passes: data-local-seats, /ollama/api/tags,
                     /ollama/api/generate and "Ollama bosses" are all in the launcher shell
```

The Pages bundle drops the four launcher strings exactly as it always has — `LOCAL_SEATS` is false in a
production build without `VITE_LOCAL_SEATS`, Vite eliminates the branch, and that is the difference the launcher's
`build.mjs` greps for. The check that matters is the launcher build, and it passes.

Played in a browser against the dev server before the commit: the switch, Ghost's menu unchanged, Vibe Typer's
menu, a level typed end to end (reply, code, a creep, a ship with the flash, confetti and the ribbon), the
standup with the seed and the milestone word, the retro with its key map, and — on the third level at seed one —
the quick sync, with the beat reading "the meeting", the streak held at twelve dots and the bar not moving.

## What slice 3 needs from the shell

**The endless seat (the user, played by a model).** `mountVibeTyper`'s options are where it hooks in: add an
optional asker (`ask?: (view) => Promise<{ snippet: string; ask: string }>`), prefetch it during the current
request, and hand the sim the pick the way `createRun` already takes `integration` — as data, in a closed choice.
The place to fire the prefetch is the `advance` loop, next to where the shell drains events, because that is the
one place that knows a request has just been paid for; the place to fall back to the authored pool is the same
line, since a late answer must not stop a step (G11, G13). Nothing on the field may name the model (G17), so the
seat's status belongs in the controls row beside the mute button, as Ghost does it, never in the chat.

**The voice.** The events worth speaking are the user's, and they are already cued: `message` with `who: 'user'`
(the ask), `creep` (the "oh also"), and the `ship`'s reaction and review, which arrive as `message` user lines
after a `piece`. `syncIn` is a candidate and probably should not speak — the meeting is chatter, and speaking
three lines of it would bury the ask that follows. The shell hands the voice worker the line text, so the hook is
in `drainEvents`, where the chat line is already in hand; the cue name is enough to tell the voice which pool a
line came from. The agent's own lines stay unspoken: the player types them.

**The retro, wider.** It is built and opt-in (`RETRO_EVERY 3`), reads `state.weakBigrams` and the shell's own
clean-line timings, and has room under the key map for whatever slice 3 wants to add. What must not change is the
order — weak pairs, then consistency, then speed as a word, never a number, never against another player.

**What slice 3 should not have to do.** The beat words want moving into `patterns/cabinet.json → words` when the
package is next open (Decision 5), and the stack picker for the integration stack is unbuilt (Decision 14).
Neither blocks the seat or the voice.
