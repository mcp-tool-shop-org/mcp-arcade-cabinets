# Vibe Typer — slice 1, the package

**Date:** 2026-09-15. **Builder:** Opus (this slice). **Coordinator:** Claude (Fable 5.1). **Director:** Mike.
**Brief:** `docs/vibe-typer.kickoff.md` (slice 1) under `docs/vibe-typer.dispatch.md` (the lock G23–G30).
**Branch:** `cabinet/vibe-typer-s1`, one commit, not merged.
**Rename:** the cabinet was briefed as _You're Absolutely Right!_ and renamed to **Vibe Typer** by the Director mid-slice; the old name survives only as the tagline in `patterns/cabinet.json`. Everything in this slice is built under the new name.

Headless only. No art, no audio, no Vite entry, no npm, no spend. `apps/cabinets` is slice 2 and is untouched.

## Standards compliance

| Standard                 | Score | Evidence                                                                                                                                                                                                               |
| ------------------------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PIN_PER_STEP             | 3     | Every draw comes from the seed through `src/seed.ts`; `sim.test.ts` and `band.test.ts` both assert a byte-identical `RunState` for the same `(levers, seed, tier, endless, weakBigrams, stack)` and input stream.      |
| ANDON_AUTHORITY          | 3     | `patterns.ts` halts at load with `patterns/<file>: <key>`; `corpus.ts` halts on a snippet nobody could type; the band fails `pnpm test`; `pnpm test:play vibe-typer` fails `pnpm verify`. Tests prove each halt fires. |
| NAMED_COMPENSATORS       | 2     | The slice's only irreversible action is the branch push. Compensator: `git push origin --delete cabinet/vibe-typer-s1` (owner: the coordinator). No npm, no release, no Pages in this slice.                           |
| DECOMPOSE_BY_SECRETS     | 3     | Rules in `src/`, content in `patterns/`, the corpus port in `scripts/`, disk access in `play.ts` alone. The dependency arrows below hold; `index.ts` imports no `node:` module, which the shell bundle depends on.     |
| UNCERTAINTY_GATED_HUMANS | 2     | Every number the Director owns is JSON with a note in the table below, never a constant in code. Where the dispatch was silent I chose and wrote the choice down under **Decisions**.                                  |
| EXTERNAL_VERIFIER        | 2     | This builder never reviews its own diff; the coordinator sends it to a different family before merge. The band is the mechanical check that does not ask the builder whether the game is fair.                         |

## What was built

`packages/vibe-typer` (`@mcp-arcade-cabinets/vibe-typer`, `"private": true`, version `0.8.2`, same `tsconfig`, scripts and vitest wiring as `packages/ghost-on-the-menu`).

```
src/
  types.ts        every type; no logic
  seed.ts         FNV-1a hash, mulberry32, a seeded shuffle and a weighted pick
  patterns.ts     loads and validates eight lever files; DEFAULT_PATTERNS; halts "patterns/<file>: <key>"
  corpus.ts       loads patterns/corpus/*.json, the character trigram model, the integration stack
  difficulty.ts   value(snippet) — surprisal + travel + length + punctuation + identifier + bracket (G24)
  score.ts        hype steps, pay, milestones, Copilot, keystroke pitch (G23)
  context.ts      drain, cost, refill, hardcore burn, the mid-level ramp, the near miss (G26)
  level.ts        plans a level from levers + seed + weak bigrams; endless chaining (G26, G27)
  sim.ts          createRun / stepRun / the keystroke reducer — the only stateful module
  lines.ts        picks user and agent lines by tier and beat, no repeat inside a level (G28)
  play.ts         the bots and the play-through entry; the only module that reads the disk
  index.ts        the barrel for the shell; no node: imports
patterns/
  cabinet.json levels.json score.json context.json difficulty.json user.json agent.json products.json
  corpus/{bash,csharp,java,javascript,python,sql}.json
test/
  patterns corpus difficulty score context level lines sim band play  (+ helpers.ts, not a test file)
scripts/
  port-corpus.mjs  the re-runnable port from the prototype
```

Dependency arrows, as briefed: `sim → level → corpus, difficulty, score, context, lines, patterns, seed`; `play → sim`; nothing imports `play` except the runner and its test; nothing imports `apps/`.

Outside the package, three files changed and no more:

- `scripts/play.mjs` — registers the `vibe-typer` cabinet beside `ghost`. The ghost branch is byte-identical apart from the shared `CABINETS` check that replaced its `cabinet !== 'ghost'` line; the new flags (`seed`, `stack`, `level`, `endless`, `dated`) are additions to the known-flag set, and `typerScreenHit` is a new export.
- `package.json` — `verify` gains `&& pnpm test:play vibe-typer --tier 0 --bot typist:40`.
- `docs/vibe-typer.slice1.md` — this file.

`pnpm-lock.yaml` also moved, because the new workspace package exists.

## The corpus port

`node packages/vibe-typer/scripts/port-corpus.mjs` (also `pnpm -F @mcp-arcade-cabinets/vibe-typer port:corpus`). It reads `E:/AI/prototypes/packages/dev-op-typer/DevOpTyper/Assets/Calibration/<lang>.json` (PascalCase) and `.../Snippets/<lang>.json` (camelCase) and writes `patterns/corpus/<stack>.json`. The prototype is never written to. `--src <dir>` or `VIBE_TYPER_CORPUS_SRC` moves the source.

| Stack      | Calibration | Snippets | Kept    | Rejected | Bands (1..7)         |
| ---------- | ----------- | -------- | ------- | -------- | -------------------- |
| bash       | 35          | 5        | 40      | 0        | 6 7 7 5 5 5 5        |
| csharp     | 35          | 7        | 42      | 0        | 7 5 7 7 6 5 5        |
| java       | 35          | 7        | 42      | 0        | 6 6 7 7 6 5 5        |
| javascript | 35          | 7        | 42      | 0        | 7 6 7 7 5 5 5        |
| python     | 35          | 8        | 43      | 0        | 7 7 7 7 5 5 5        |
| sql        | 35          | 5        | 40      | 0        | 6 7 6 6 5 5 5        |
| **total**  | **210**     | **39**   | **249** | **0**    | 39 38 41 39 32 30 30 |

**Rejects: none.** Every snippet in the prototype is plain ASCII with no tab, so the reject paths (tab in code, non-ascii in code, empty code, band out of range, duplicate id) never fired on this source. They stay in the script and in `corpus.ts`, and `corpus.test.ts` proves the loader halts on a tab, because the next corpus that lands may not be so clean.

Normalisation applied: `\r\n` and `\r` to `\n`, trailing whitespace stripped per line, trailing blank lines dropped, output sorted by band then id. Blank lines inside a snippet survive in `code` and are skipped when the sim hands the player lines to type.

The **integration** stack has no file. It is built at plan time from tape headers and rows (G30): for each `tools/call` row, the tool name off `note`, and one line per envelope tier — the bare name at band 1, `{"method": "tools/call", "name": "<tool>"}` at band 3, the full JSON-RPC envelope at band 5. Notes carry the server name and the policy word and nothing else. `play.ts` is the only place that opens `fixtures/tapes`; the shell will pass the same snippets in as data. Over the baked tapes under `fixtures/tapes` this yields 21 integration snippets from 7 distinct tool names (`echo`, `leak`, `view`, `tapes`, `ollama_corpus_list`, `ollama_corpus_health`, `ollama_research`).

## The band, and the numbers it settled

`test/band.test.ts` is the andon: every bar below is asserted for seeds `[1, 2, 3]`, all eight listed levels and all four tiers, and a failure fails `pnpm test`. The whole band runs in about 1.4 s.

| Bar                                                            | Result                                                       |
| -------------------------------------------------------------- | ------------------------------------------------------------ |
| `idle` never ships at any tier                                 | holds — zero pieces, zero valuation, every tier, every level |
| `idle` reaches a compaction at tiers 0–2                       | holds (within thirty simulated minutes)                      |
| `idle` ends by context at tier 3                               | holds, every level, every seed                               |
| `typist(40, 0.03)` ships every level at tier 0, no compaction  | holds — 0 compactions in all 24 runs                         |
| `typist(40, 0.03)` at tier 1, at most one compaction/level     | holds — worst case 1 (levels 5 and 6, one seed each)         |
| `typist(60, 0.02)` at tier 2, at most one compaction/level     | holds — worst case 1 (level 3, one seed)                     |
| `perfect` ships every level at tier 3                          | holds — 0 compactions, 0 context ends                        |
| `typist(40, 0.03)` at tier 3 ends by context on ≥ half         | holds — ends by context on **all eight** levels, all seeds   |
| endless with `perfect` at tier 0 runs ≥ 6 levels               | holds — 6, 7, 7 (seeds 1, 2, 3)                              |
| endless with `typist(40, 0.03)` runs ≥ 2 levels                | holds — 3, 4, 4                                              |
| valuation never falls; hype always on the tier's ladder        | holds; the drive loop throws if the valuation ever falls     |
| the streak drops only on a bad key, a bad line or a compaction | holds — zero unexplained drops across every tier and bot     |
| every chat line passes the forbidden scan                      | holds — all tiers, all levels, no digit and no barred word   |
| same seed and bot twice → deep-equal final state               | holds (and `sim.test.ts` asserts byte-identical JSON)        |
| `perfect` at tier 0 lights Copilot at least once a level       | holds — 19 to 111 lightings per three-seed level             |
| Copilot never lights in hardcore                               | holds                                                        |

### The sweep that set them

Read `cN` compactions and `xN` context-ends summed over three seeds, `sN` pieces shipped (12 = every request of every seed), `tN` mean seconds of play, `pN` Copilot lightings, `vN` mean valuation. Levels L0–L7 in `levels.json` order.

```
tier 0 idle           L0 c66 x0 s0  | L1 c75 x0 s0  | L2 c45 x0 s0  | L3 c48 x0 s0  | L4 c27 x0 s0  | L5 c36 x0 s0  | L6 c18 x0 s0  | L7 c15 x0 s0
tier 0 typist:40:0.03 L0 c0 x0 s12 t204 v82  | L1 c0 x0 s12 t166 v55  | L2 c0 x0 s12 t327 v132 | L3 c0 x0 s12 t312 v127 | L4 c0 x0 s12 t557 v239 | L5 c0 x0 s12 t416 v186 | L6 c0 x0 s12 t773 v421 | L7 c0 x0 s12 t950 v365
tier 0 typist:60:0.02 L0 c0 x0 s12 t139 | L1 c0 x0 s12 t112 | L2 c0 x0 s12 t218 | L3 c0 x0 s12 t209 | L4 c0 x0 s12 t371 | L5 c0 x0 s12 t276 | L6 c0 x0 s12 t515 | L7 c0 x0 s12 t636
tier 0 perfect        L0 c0 x0 s12 t92 p24 v254 | L1 t74 p19 v166 | L2 t146 p37 v412 | L3 t140 p37 v407 | L4 t239 p64 v889 | L5 t182 p45 v547 | L6 t333 p88 v1186 | L7 t413 p111 v1372
tier 1 typist:40:0.03 L0 c0 | L1 c0 | L2 c0 | L3 c0 | L4 c0 | L5 c1 | L6 c1 | L7 c0        (all shipped)
tier 2 typist:60:0.02 L0 c0 | L1 c0 | L2 c0 | L3 c1 | L4 c0 | L5 c0 | L6 c0 | L7 c0        (all shipped)
tier 2 typist:40:0.03 L0 c1 | L1 c2 | L2 c3 | L3 c4 | L4 c2 | L5 c3 | L6 c1 | L7 c3        (all shipped; not a bar)
tier 3 typist:40:0.03 x3 on every level (hardcore hurts)
tier 3 typist:60:0.02 x1..x3 per level (hardcore still hurts)
tier 3 perfect        s12 on every level, c0, x0 (hardcore is beatable clean)
endless tier 0 typist:40:0.03 levels 3,4,4  val 315,318,289
endless tier 0 perfect        levels 6,7,7  val 1829,3163,2605
```

Three tuning passes got there. The first put a whole bar's worth of drain into one request and compacted everywhere; the second read the measured seconds per request off the sweep and set each level's drain so the bar covers about **1.6 requests at forty words a minute**, which is the rule the numbers below encode; the third eased level one and two for hardcore (`perfect` lost one seed on L1) and slowed the endless growth so a clean typist gets past six levels.

### The numbers the Director owns

These live in JSON so they can be moved without a build. JSON has no comments; this table is the comment.

**`patterns/levels.json`** — per level, the tier-zero drain (a tier scales it), how hard it ramps inside the level, and the deploy bonus.

| Level | id                  | stack      | band | requests | drainPerSec | drainRamp | shipBonus | _// Director_                   |
| ----- | ------------------- | ---------- | ---- | -------- | ----------- | --------- | --------- | ------------------------------- |
| 0     | cat-website         | bash       | 1–2  | 4        | 0.0042      | 0.25      | 3         | the teaching level; slowest bar |
| 1     | duck-rides          | python     | 1–2  | 4        | 0.0048      | 0.25      | 3         | shorter snippets, faster bar    |
| 2     | fridge-chain        | javascript | 2–3  | 4        | 0.0029      | 0.25      | 8         |                                 |
| 3     | plant-dashboard     | sql        | 2–3  | 4        | 0.0030      | 0.3       | 8         |                                 |
| 4     | self-newsletter     | bash       | 3–4  | 4        | 0.0017      | 0.3       | 18        |                                 |
| 5     | coffee-loyalty      | java       | 3–4  | 4        | 0.0023      | 0.3       | 18        |                                 |
| 6     | book-club-metaverse | csharp     | 4–5  | 4        | 0.0012      | 0.4       | 35        | longest code, gentlest clock    |
| 7     | app-that-rates-apps | python     | 4–5  | 4        | 0.0010      | 0.4       | 35        |                                 |

Also `creepShare: 0.3` (three requests in ten carry an "oh also"), `weakBias: 0.35` (how hard the planner leans toward the player's weak pairs), and `endless: { startBand: 1, bandEvery: 2, drainStart: 0.0046, drainGrow: 1.06, requests: 4, refillShare: 0.5, messageCost: 0.04, shipBonus: 5 }` — the band climbs one every two levels and the drain grows six percent a level, which is what ends an endless run.

**`patterns/context.json`** — per tier. `drainPerSec` is the fallback for a level that names none; `drainScale` is what the tier does to a level's rate.

| Tier | word     | drainScale | messageCost | refillShare | hardcoreBurnPerError | _// Director_                       |
| ---- | -------- | ---------- | ----------- | ----------- | -------------------- | ----------------------------------- |
| 0    | easy     | 1          | 0.03        | 0.6         | 0                    | one by definition                   |
| 1    | warm     | 1.3        | 0.04        | 0.55        | 0                    |                                     |
| 2    | hot      | 1.7        | 0.05        | 0.5         | 0                    |                                     |
| 3    | hardcore | 2.4        | 0.06        | 0.45        | 0.01                 | the only tier where a mistype costs |

The arithmetic behind the tuning, for whoever moves these next: a request costs the bar `drainPerSec × drainScale × seconds + messageCost`, and a ship refills a share of what is missing, so the level survives without a compaction exactly while that cost stays under `refillShare`. Every bar in the band is that inequality in different clothes.

**`patterns/score.json`** — hype steps `[streak 0 → 1, 3 → 2, 6 → 3, 10 → 4, 15 → 5]`; `copilotStreak: 6`, `copilotSeconds: 8`, `copilotDiscount: 0.4`; milestones `seed` at 100, `series a` at 500, `unicorn` at 1800 (a strong single level reaches _seed_, a good late level reaches _series a_, and only a long endless run reaches _unicorn_); `hardcore: { hypeCap: 3, shipMultiplier: 1.5 }` — hardcore cannot climb past three, and is paid half again for the same work.

**`patterns/difficulty.json`** — the QWERTY key map (47 keys, 47 shifted), the key-pair costs (`repeat 1.1`, `sameFinger 2.6`, `sameHand 1.35`, `alternate 0.85`, `rowJump 0.55`, `shift 1.2`, `space 0.5`, `newline 0.7`, `unknown 1.5`) and the formula weights (`surprisal 1`, `travel 1`, `length 0.35`, `punctuation 12`, `identifier 2.5` for names of `identifierMin: 8` characters or more, `bracket 1.6`, `scale 0.02`). Nesting depth is deliberately absent (Scalabrino 2018 finds it weak). The mean value by band is strictly increasing over the whole corpus, which `difficulty.test.ts` asserts.

## Decisions

Where the dispatch and the kickoff were silent, the choice and the reason.

1. **`createRun` takes four options the kickoff did not list:** `levelIndex` (which listed level to play — the band needs to address all eight), `dated` (the kickoff's `lines.ts` note says the picker reads it off `createRun`), `corpus` and `integration` (the integration stack has no file and the kickoff forbids `node:fs` outside `play.ts`, so the caller passes the snippets in as data). Everything else on the surface is exactly as briefed.
2. **`LevelPlan` carries `drainRamp`.** The kickoff lists the ramp in `levels.json` but not on the plan; the sim needs it per level, and `rateAt(plan, requestIndex)` is pure because of it.
3. **`context.json` gained `drainScale` per tier.** A level names its drain in tier-zero terms and the tier scales it. Without this, a level that overrides `drainPerSec` would lose all tier difficulty — and every level overrides it, because a band-five request takes five times as long to type as a band-one request and a single global rate cannot be fair to both.
4. **`levels.json` gained `weakBias`.** How hard the planner leans toward weak pairs is a number the Director may want to move; it does not belong in code.
5. **`score.json` spells hype steps as objects** (`{ streak, hype }`) rather than the kickoff's two parallel arrays. One row is one rule and the loader can name the bad one.
6. **`request`, `creep` and `ship` are transitional beats** that hold for exactly one step and swallow that step's input. This is what makes "shown and voiced before it is typeable" (Q4.1) true in the reducer and not just in the prose, and it gives the shell a frame to play the ship flash on.
7. **A compaction is an event, not a beat.** It can land in the middle of a line, and moving the beat would throw away what the player is typing. `Beat` still carries `'compaction'` for the shell's use; the sim never sets it.
8. **Reactions and reviews are free; asks and creeps cost `messageCost`.** G26 says each user message costs a slice, but charging the reaction fires immediately after the ship refill and quietly eats it. The two messages that cost are the two that start work.
9. **Copilot discounts per line, not per request.** Taking a line with Tab adds that line's share of the request's characters to `discountShare`, and the ship pays `value × (1 − share × (1 − copilotDiscount))`. The built piece is the discounted value too, so the preview still grows by exactly what the score counts (G24). Tab fills the line; Enter still sends it.
10. **The streak counts clean lines and adds one more on a ship**, as the kickoff's two sentences say; a mistyped character resets it and drops hype to one.
11. **`stepRun` clears `events` at the top of the step**, so what the shell drains after a step is that step's events. The shell does not have to empty the array.
12. **Run context (levers, corpus, picker, code lines) lives in a `WeakMap`, not on `RunState`.** `RunState` stays plain JSON data, which is what makes the byte-identical determinism test possible. `codeOf`, `leversOf`, `agentNameOf` and `planOf` read it back.
13. **Endless is its own ladder** from level zero, with products drawn from `products.json`; it does not replay the eight listed levels first. "Rising bands and drain until the bar empties" reads as a generated ladder, and the listed levels have authored products.
14. **A listed run is one level.** `over: 'shipped'` after its last request, exactly as the play-through's summary reports it.
15. **Corpus titles are not authored lines.** Four of 249 carry a digit or a barred word (`ES6 class`, `neural network forward pass with relu`, `generic bounded type utility`, `debounce utility function`). `safeTitle` falls back to a clean topic, then to the words "that thing", so `{title}` can never leak a digit into the chat.
16. **Probe names are skipped in the integration stack.** A tape's `arcade.unlisted.<hash>` rows are the shooter's probes, not tools anyone runs; the planner keeps names that read like tool names.
17. **The lever gate is stricter than `VOICE_FORBIDDEN` alone:** no exclamation mark and no shouted word (three or more capitals in a row), because nothing yells (G25); at most one sentence-ending `.` or `?`, and it must end the line; at most twelve words; no tool or model name (a second list, `MODEL_FORBIDDEN`, beside the copied one). `Claudette` passes — no word in either list matches it on a boundary.
18. **The play-through's screen is the lines between the three-line header and the `valuation:` footer**, which is where `scripts/play.mjs` scans with `SCREEN_FORBIDDEN`. The valuation is a number on the board and is allowed (G23); nothing else on that screen carries a digit.
19. **The bot spec is `idle`, `perfect` or `typist:<wpm>[:<rate>]`**, and `typist:40` means a three percent mistype rate — the band's typist. `pnpm verify` runs `--tier 0 --bot typist:40`.
20. **Any bot that empties the bar at tier zero fails the play-through**, idle included. The gentlest tier is the acceptance bar and the rule reads better without an exemption.

## What slice 2 consumes

The shell imports from `@mcp-arcade-cabinets/vibe-typer` (`src/index.ts`). No `node:` module is reachable through it; `./play` stays off the barrel and only its types are re-exported.

```ts
export const CABINET = 'vibe-typer';

// the run
createRun(opts: CreateRunOpts): RunState        // { levers?, corpus?, integration?, seed, tier, endless,
                                                //   weakBigrams?, stack?, agentName?, dated?, levelIndex? }
stepRun(state: RunState, input: RunInput, dt: number): RunState   // mutating; dt in seconds
codeOf(state): string[]        // the current request's lines, creep included once it has landed
planOf(state): LevelPlan
leversOf(state): Patterns
agentNameOf(state): string
nextSeed(seed: number, runs: number): number

// the levers
DEFAULT_PATTERNS: Patterns
loadPatterns(raw): Patterns    // halts "patterns/<file>: <key>"
lineFault(line): string | null
lineTier(tier): '0' | '1' | '2'
tierContext(set, tier): ContextTier
VOICE_FORBIDDEN, MODEL_FORBIDDEN, STACKS, CORPUS_STACKS

// the corpus and the difficulty formula
DEFAULT_CORPUS: Corpus
loadCorpus(raw), buildModel(texts), surprisal(model, text), codeLines(snippet), inBand(...), weakWeight(...)
integrationSnippets(seeds: IntegrationSeed[]): Snippet[]   // the shell passes tapes it globbed
withIntegration(corpus, snippets): Corpus
value(snippet, model, set), valueOf(text, model, set), valueParts(...), travel(...), travelCost(...)

// the scoreboard, the bar, the words, the planner
hypeFor, hypeLadder, pay, milestoneCrossed, copilotReady, pitchFor, PITCH_CAP
clamp, drain, spend, refill, burn, rateAt, isNearMiss, FULL, EMPTY, NEAR_MISS
LinePicker, fill, safeTitle
planLevel, levelDefAt
hashString, seededRandom, mixSeed, shuffleOrder, weightedPick

// types
Band Beat BuiltPiece ChatLine Creep Event LevelPlan Request RunInput RunState Snippet Stack Tier
CreateRunOpts PlanOpts PickerOpts Corpus IntegrationSeed NgramModel ValueParts
Patterns CabinetSet LevelsSet LevelDef EndlessDef ScoreSet HypeStep Milestone ContextSet ContextTier
DifficultySet KeyPos UserSet AgentSet ProductsSet TierLines
Bot BotSpec PlayArgs Transcript          // types only; the values live in ./play
```

### Amended in slice 2 (the quick sync)

The shell's slice added one rule to this package and nothing else. The surface above gains:

- **A beat.** `Beat` is `'request' | 'reply' | 'code' | 'ship' | 'compaction' | 'creep' | 'sync'`. The `sync`
  beat is a quick sync: three short lines of meeting chatter the player types between two requests, never in
  front of the first and never after the last. Enter sends one like a reply line (clean, or the agent's "hmm"),
  and it pays nothing, builds nothing, costs the bar nothing — the drain stops for it — and leaves the streak
  exactly where it stands.
- **An event.** `{ kind: 'sync'; on: boolean }`, raised when the meeting starts and when it ends.
- **A lever.** `levels.json` gains `syncShare` (`0.25`): the seeded share of levels that draw one. `user.json`
  gains `syncs`, at least twelve lines of five words or fewer, through the same gate as every other line; the
  loader halts with `patterns/user.json: syncs.<i>` on a long one. `LevelPlan` carries `syncAt?: number`, the
  request index the meeting sits in front of, drawn after the requests so the lever never moves the snippets.
- **An export.** `syncOf(state): string[]` — the three lines in typing order, empty outside the beat.

Every band bar in `test/band.test.ts` holds at its original number and `syncShare` was not re-tuned; the
reasoning and the sweep are in `docs/vibe-typer.slice2.md`.

The shape the shell should expect: call `createRun` once, then `stepRun(state, input, dt)` per frame with at most one keystroke, drain `state.events` after each step for the cues, and read `state.chat`, `codeOf(state)`, `state.target`, `state.typed`, `state.errors`, `state.built`, `state.context`, `state.valuation`, `state.hype`, `state.streak`, `state.copilot`. The field words to print come from `DEFAULT_PATTERNS.cabinet.words` (`valuation`, `vibes`, `streak`, `context`), the display name and tagline from the same file, and a rename is that file plus the package directory.

Left for slice 2, as briefed: `apps/cabinets/src/vibe-typer.ts`, the two-card picker with Ghost as default, the DOM chat and editor, the canvas preview, the keystroke audio and the cue table, the bed with tempo on hype, quick sync, and Pages. Slice 3 takes the seat, the voice and the retro.

## Verification

```
pnpm verify        lint · typecheck · test (41 files, 432 tests) · build · test:play ghost · test:play vibe-typer
pnpm test          packages/vibe-typer: 10 files, 95 tests, ~1.4 s (the band is 14 of them)
```

The play-through printed by `pnpm test:play vibe-typer --tier 0 --bot typist:40`:

```
Vibe Typer
level cat-website stack bash tier easy bot typist:40 seed 1 endless no
level shipped
product a website for my cat
stack bash
agent Claudette
user can we name the folders after my plants
agent That will be lovely, writing it out
agent Shipped it, exactly as you described
user the whole thing works, i checked twice
valuation: 96
pieces: 4
levels: 1
compactions: 0
```

**One thing this slice did not fix.** `prettier --check .` fails on three files that arrived with commit `4384902` and belong to the coordinator: `docs/absolutely-right.citations.json`, `docs/absolutely-right.dispatch.md` and `docs/absolutely-right.kickoff.md` (table padding only). They are outside this slice's file scope and are being renamed to `docs/vibe-typer.*` by the coordinator, so touching them here would only make that rename conflict. `pnpm verify` is green on this branch once `pnpm format` has been run over those three; everything else — lint, typecheck, all 432 tests, the build and both play-throughs — passes as committed.
