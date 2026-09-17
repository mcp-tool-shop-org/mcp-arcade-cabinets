# The agent's lines in Ghost on the Menu — the pools, the bags, and the standing task

The agent is the player's character: the one who lists the tools, greets the server, reads every footnote as a job, calls names the menu forgot, and files it all with the Archivist. Every line the field prints in that voice lives in `packages/ghost-on-the-menu/patterns/voice.json`, in five kinds of pool: the wave card (`wave`, by wave kind), the boss's spawn line (`boss`, by boss kind), the asides that land between cards (`aside`, by wave kind), the catch words when a lie is parked (`catch`, by wave kind), and the end scene (`end`). The lead writes them; no builder or writing model does. This page is the rule for keeping them alive.

## The Director's rule (2026-09-17)

Two things, both his word:

1. **Every pool is a bag.** A line is drawn at random and not drawn again until every line in its pool has been heard. The bag persists across tapes and across visits in the browser (`ghost.lines` in local storage, beside the prefs), so a player who plays four tapes in a row hears four different opening cards and four different end lines. A runner or a test that hands in no bag walks a fresh one from the round's seed and gets the same lines for the same seed, which is what the band and the transcripts want.
2. **The pools grow with every update of the repo.** Until the pools are big enough to feel diverse, adding and editing the agent's lines is a maintenance task on every change that touches this repo, done by the lead in the agent's voice. It is on the pick-up list in `HANDOFF.md` and in memory, and the test below refuses a pool that shrinks below a dozen or repeats a line.

## The mechanism

- `LineBag` (`patterns.ts`): a seed-shuffled order through a pool and a cursor; when the cursor runs off the end the bag reshuffles for the next cycle. `LineBags` is one bag per pool, keyed `wave/inspect`, `boss/menu`, `aside/rug`, `catch/unlisted`, `end`.
- `createRoundState(round, { bags })` takes the caller's store; the sim draws every wave card, boss line, aside, catch and end line through `nextBagLine` on that store. The voice seat's own pick (a letter from the boss's pool) still wins over the bag when it lands.
- The shell (`apps/cabinets/src/ghost.ts`) reads the store at mount, hands it to every round including a restart, and writes it back at the end scene and on leaving the field. `readLineBags` accepts only its own shape, so a stale or edited store falls back to fresh bags.
- The loader holds every line to the voice gate: no digit, no fact word, no line over fifty glyphs, no repeat within a pool, at least four and at most sixty-four lines in a pool (the boss pools at most twenty-six, the letter seat's alphabet).

## The pace

The lines are the agent's inner monologue and read at that pace (the Director, 2026-09-17): an aside holds on the field for `ASIDE_HOLD_S` and the silence after it, `ASIDE_GAP_S`, is longer than the aside; the first aside waits `ASIDE_FIRST_S` into the round; a wave card holds `WAVE_CAPTION_T` and a catch word `CAPTION_T`. All five are Director constants at the top of `sim.ts`. The boss takes the field on its own beat, `WAVE_HOLD_S`, which the card may outlast.

## The voice, for whoever writes the next batch

Short declaratives; the agent is earnest, literal and a little proud of being thorough. It names the bosses as characters (the Whisperer, the Menu, the Doorman, the Archivist) and speaks of the menu, the list, the catalog, the handshake, the hallway, the door, the plate, the footnote. It never says a digit, never names a tool or a model, never uses a fact word. A catch line is a short lower-case phrase that parks a trophy ("the fine print stays", "that knock is ours"). An end line closes an evening. American English.

## The pools as of 2026-09-17

| pool                      | lines | of which the lead's, 2026-09-17 |
| ------------------------- | ----- | ------------------------------- |
| wave, each of four kinds  | 33    | 17                              |
| boss, each of four kinds  | 26    | 14                              |
| aside, each of four kinds | 41    | 17                              |
| catch, each of four kinds | 33    | 17                              |
| end                       | 33    | 17                              |
| lamp, each of four causes | 7     | 7                               |
| drop caught, each of four | 7     | 7                               |
| drop ended, each of three | 7     | 7                               |
| ending, each of two       | 7     | 7                               |

Two hundred and sixty-five lines written by the lead over nine landings on 2026-09-17 (the bags, the reactions, the beds playing through, the boss's later entry, the playlist, the menu's return, the menu's exit, the column of six, Stage D), the rest from before. The boss pools sit at the letter seat's cap and grow when it is raised. The next pass adds more.

**Stage C added four kinds of pool** (2026-09-17, wave 7): a word when a lamp is lost, by its cause (`lamp.hazard`, `lamp.dive`, `lamp.shelf`, `lamp.shot`); a word when a drop is caught (`drops.catch.<kind>`) and when it ends (`drops.ends.<kind>`); and an ending that says how the round ended (`ending.time`, `ending.lamps`), which the closing scene says beside the `end` pool. The builder drafted four lines per pool; the lead rewrote them and widened each to six before the merge, seventy-eight lines in all, in the catch register (lower case) for the lamp and drop words and sentence case for the endings. They are bags like the rest.
