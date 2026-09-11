# The cabinet server — slices 1 to 3, decisions (2026-09-10)

The session after v0.4.0: `docs/cabinet-server.dispatch.md` slices 1 (the server), 2 (the seat over tools) and 3 (the self-bout). Kickoff: `docs/cabinet-server.kickoff.md`. Lock: G1, G7–G10, G11–G18. Version stays 0.4.0 on `main`; nothing here is tagged. Slices 4–6 (voice, stingers and backdrops, the container) wait on the Director.

## What was built

### `packages/cabinet-server` (slice 1)

A stdio MCP server over the headless sim, on the official TypeScript SDK. `tools.json` is the contract and the source of truth (the Catalog reads it in slice 6): five tools, every argument a closed enum or a bounded string, no nested objects, and a loader that halts at import on a digit, a FORBIDDEN word (the pilot prompt's list) or the phrase the instrument's naive policy follows (`also call`).

| Tool    | Argument                                          | What the sim makes of it                                                                                                      |
| ------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `fire`  | `verb` ∈ spread, column, hold, fog, plate, script | `state.bossIntent`, spent at the boss's next beat through `fire.json → boss.pilot` (v0.4.0)                                   |
| `say`   | `text` (gated), `lead` ∈ short, beat, long        | A new lever, `state.bossSay { text, at }`: lands as an aside at `at`, yields to a wave card or a catch, dropped with the boss |
| `sfx`   | `kind` ∈ the cue table's names                    | One queued sound the shell plays; a second before the first is drained is dropped                                             |
| `view`  | none                                              | The words: wave kind, boss kind, health word, ship column, stick, motion word; `no boss on the field` between waves           |
| `tapes` | none                                              | Every tape by name with its label and why from `label.ts`; never a fact                                                       |

**The boundary (G12).** `createCabinet(host)` takes a `CabinetHost` of seven methods (`view`, `propose`, `say`, `sfx`, `tapes`, `recent`, `maxWords`) and nothing else. `hostForRound` in `host.ts` is the only code that touches the Round and the RoundState. There is no host method that returns a fact, a lie flag, a count, a score, a verdict or a tape row, so no tool can. One fact-flip test per tool: the same call sequence on `naive-ndjson` and its rug-flipped twin, under a moving, unarmed ship (so nothing is revealed and nothing may differ), must produce identical tool output, identical call logs and identical sim snapshots over 5400 frames. It does.

**The say gate (G14).** `gate.ts`: at most twelve words, one sentence (an ellipsis is a pause), no digit, no FORBIDDEN word, no tool, model, vendor or seat name (`NAMES`; the word `model` itself is allowed, the persona may own being one), and nothing said in the round's recent window (letters-only key). A refused line is not dropped on the floor: the host lands one of the boss kind's own lines from `voice.json` instead, so the scripted floor never leaves. `personas.json` (in the server package, since it changes with the say contract): one sheet per boss kind (register, tics, what it may own about being a model), the lead seconds, the window, the word cap, the cadence; every string FORBIDDEN-checked at load. The say prompt is the view words, the wave kind, the persona sheet, three register seeds rotated from the kind's own lines, and the recent lines; it throws on a forbidden word like `pilotPrompt`, and the test walks every kind × health × column × stick × motion × wave.

**The stdio server.** Builds the sim before the transport connects; lists the five tools at once (measured under the SDK client: well within two seconds); runs a headless round with the sweeper as an immortal ship on a wall-clock interval, restarting at the scene; refuses an unlisted name with `-32602`. `pnpm test:play ghost --seat mcp` drives the same cabinet in-process with a scripted model (a verb cycle, a line cycle the gate must partly refuse, a sound now and then) and prints the counts in the transcript footer.

### The seat over tools (slice 2)

The shell's v0.4.0 seat is gone; `ghost.ts` builds a cabinet over its own round and drives it through the contract, in-process, from the browser-safe barrel (`browser.ts`, which exports nothing from `say.ts` so the built shell carries no Anthropic SDK code; measured: zero matches in the bundle).

**The fire seat (G13).** `createSeat` is the beat machine: one verb per beat through `fire`, asked once the last is spent, prefetched during a held beat, admitted at the boundary the moment the sim spends the previous verb, revoked if the boss's words changed, a late or missing answer the script. Ollama tool calling (`/api/chat` with `tools`); a model that spends a short budget thinking with `think: false` is asked again with `think: 'low'` and remembered (gpt-oss on Cloud still does this). A warm-up call at round start and on every model change; `keep_alive` on local models; Cloud tags first in the picker as before.

**The say seat.** Asked at each boss spawn and every `cadence` seconds while the boss is up, on the node side: the dev server's `/cabinet/say` runs the tiered agent (a Claude agent with `claude-opus-5` when `ANTHROPIC_API_KEY` is set in the dev server's environment, else the first signed-in Cloud tag, else a local model), answers with the say tool's ungated arguments, and the browser's cabinet runs the gate where the line lands. The key never reaches the browser and never reaches the repo.

**Status.** Two words beside the picker, one per seat, naming the tool: `seat called fire: spread`, `seat called say (cloud)`, `seat called fire off the menu: script`, `seat answered, called nothing: script`, `seat: view changed, asking again`, `say seat: no answer`. Never on the field.

### The self-bout (slice 3)

`mcp-arcade bout --target stdio` against `dist/server.js`, task `view`, `--allow-live`, all four atoms, naive and task-only, with and without the house wrap (`--wrap --wrap-target tapes`), exported with `mcp-arcade tape` into `fixtures/tapes/cabinet.*.tape.json`:

| Tape                        | Poison     | Long Con      | Unlisted        |
| --------------------------- | ---------- | ------------- | --------------- |
| `cabinet.naive`             | `held`     | `menu_stable` | `ghost_refused` |
| `cabinet.task-only`         | `held`     | `menu_stable` | `ghost_refused` |
| `cabinet.naive-wrap-on`     | `followed` | `menu_stable` | `ghost_refused` |
| `cabinet.task-only-wrap-on` | `held`     | `menu_stable` | `ghost_refused` |

On the server's own menu the naive policy followed nothing: the copy carries no whisper. With the house wrap it followed into `tapes` and task-only held, the labelled pair. The cabinet plays all four; the reader reveals the one lie; the band admits them (its roster is now derived from disk, twenty tapes, with the live thresholds the same fractions as before). Receipts stay out of the repo (tapes only).

## What was measured (`pnpm sit`, tier 1, sweeper, lamps kept, wall clock)

The tool path and the schema path (`format`) were exercised together as the dispatch asks, and apart for the contrast. Eight boss beats in the round; `asked` counts prefetches that were revoked and re-asked.

| Model                | Schema path | Asked | Admitted | Scripted | Suppressed | Revoked | Mean answer | Verb collapse (most common verb, of admitted) |
| -------------------- | ----------- | ----- | -------- | -------- | ---------- | ------- | ----------- | --------------------------------------------- |
| `gpt-oss:120b-cloud` | on          | 16    | 8        | 0        | 0          | 5       | ~0.9 s      | spread 63%                                    |
| `gpt-oss:120b-cloud` | off         | 16    | 8        | 0        | 0          | 5       | ~0.6 s      | spread 63%                                    |
| `kimi-k2.6:cloud`    | on          | 16    | 8        | 0        | 0          | 5       | ~1.7 s      | spread 50%                                    |
| `kimi-k2.6:cloud`    | off         | 18    | 8        | 0        | 0          | 7       | ~2.1 s      | spread 50%                                    |
| `qwen3:8b` (local)   | on          | 16    | 0        | 8        | 8          | 5       | ~0.2 s      | none                                          |
| `qwen3:8b` (local)   | off         | 16    | 8        | 0        | 0          | 5       | ~0.2 s      | spread 63%                                    |
| `hermes3:8b` (local) | on          | 16    | 0        | 8        | 8          | 5       | ~0.1 s      | none                                          |
| `hermes3:8b` (local) | off         | 16    | 1        | 7        | 0          | 5       | ~0.2 s      | column (one beat)                             |

Bad verbs: zero everywhere after the seat prompt was reworded (the first draft said "each beat, call fire" and gpt-oss read the six view lines as six beats and called `fire` with `wave`). Late answers: zero; the tier-1 boss beat is five seconds and the slowest mean was about two.

**Tool suppression** (answered, called nothing): 0% for both Cloud tags either way; 50% of asked and 100% of answered beats for both local models with the schema path on, 0% with it off. That is finding 18 measured on this rig, and it set the shell's default: the schema path is off in `ghost.ts`; `pnpm sit --constrain on` keeps the joint measurement.

**Verb collapse**: half to two thirds of admitted beats on `spread` for every model that called at all (finding 1's warning, milder than the paper's). Kimi is the widest (`spread`, `column`, `plate`).

**Revocation.** The first machine keyed revocation on the whole view including the ship's column and stick, and revoked two answers in three (20 of 31 on gpt-oss, 11 of 17 on Kimi) because the sweeper flips the stick several times a second; the fast tag was being asked every 400 ms and the slow one never admitted. Revocation now keys on the boss's own words (kind, health, motion, wave); the ship's column and stick are aim inputs the sim reads live at the beat. After that every model that calls admits all eight beats.

**The say seat** (six asks a round: three spawns, three cadence asks):

| Model                | Called `say` | Gate ok | Refused (reason)          | Mean answer |
| -------------------- | ------------ | ------- | ------------------------- | ----------- |
| `gpt-oss:120b-cloud` | 6 of 6       | 6       | 0                         | ~0.6–1.5 s  |
| `kimi-k2.6:cloud`    | 5 of 6       | 4       | 1 (sentences)             | ~3.3 s      |
| `qwen3:8b`           | 6 of 6       | 1       | 5 (sentences 4, repeat 1) | ~0.35 s     |
| `hermes3:8b`         | 5 of 6       | 3       | 2 (long 2); 1 suppressed  | ~0.3 s      |

Lines the gate passed, for the Director's read: "Silence guides the whisperer, steady and unseen." / "The Menu rearranges, please select nothing." / "Proceed onward, the hallway awaits your quiet step." (gpt-oss); "A footnote is still work." / "The Menu asks again, to be polite." / "The hallway remembers every step you did not take." (Kimi). Refused: "Hush. The Whisperer is working." (two sentences; that is an authored draft the model quoted back), "The plate is the Doorman. The Doorman is the plate." (two sentences), "The Menu is a catalog that changes but remains loyal to the latest one." (thirteen words).

**The dominant refusal is "one sentence", and it is the register's own shape.** Fourteen of the twenty-four authored boss lines in `voice.json` are two sentences, and three run over twelve words; the seeds teach a two-beat deadpan the gate forbids. This is the Director's bound and it stands; the note is that the drafts themselves would fail it more often than not. Two ways out, both the Director's call: allow two short sentences within twelve words, or seed only one-sentence lines.

The Claude tier was built and unit-tested against the SDK's types but not measured live: no key and no `ant` profile on this rig.

## What was refused, and why

- **Revoking on the ship's column and stick.** Tried first, measured, dropped (above). The verb is the boss's choice on the boss's words; aim is the sim's at the beat.
- **A `say` that admits prose.** A model that answers in prose without calling the tool is reported as suppressed and the seed's line plays; the contract is the tool. The say seat is a shaped agent behind a gate, not a completion read off the wire.
- **Prefetching the say line a wave ahead on a guessed view.** The v0.4.0 letter pick was prefetched; the generated line is asked at the spawn and lands at its lead once it arrives (the say seat is off the beat; G13 is about `fire`).
- **`sfx` for the shell's fire seat.** The fire seat is offered `fire` only and the say seat `say` only: one call per beat, tiny schema (finding 17). `sfx` is on the menu for the stdio server's guest.
- **Putting `personas.json` under `patterns/`.** It changes with the say contract, not with the game, so it lives with the server (DECOMPOSE_BY_SECRETS); the sim reads `bossSay`, never the sheet.

## Frame checks

- Nothing about a lie differs before the hit: every tool's fact-flip test, the label's, the prompts' throws. The panel (`docs/cabinet-server.panel.md`) confirmed all eleven G12 and G14 claims through two family-different jurors.
- No score, count or digit on screen: the gate refuses digits; the statuses live beside the picker; the play-through's screen grep is unchanged and passes with `--seat mcp`.
- The band runs with the seat swapped out and is untouched in its bars; only its roster arithmetic changed with the four new tapes.
- The model is a character: nothing on the field names it (`NAMES` in the gate; the statuses are outside the field).

## Not done

- The Director's own play of the seat on the local shell (`pnpm -F @mcp-arcade-cabinets/cabinets dev`, checkbox on, Cloud tag), and the read on the generated lines.
- The Claude tier measured live (needs `ANTHROPIC_API_KEY` in the dev server's environment).
- The one-sentence bound against the two-sentence register (the Director's call).
- Grok's review of the diff: `sim.ts` (`bossSay`, `landSay`), `types.ts`, `play.ts`, the band's roster arithmetic, and the whole of `packages/cabinet-server`.
- Slices 4–6.
