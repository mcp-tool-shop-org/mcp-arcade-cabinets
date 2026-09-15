# Kickoff — Vibe Typer, slice 1: the package

Paste-ready brief for one Opus builder. Read `docs/vibe-typer.dispatch.md` first (the brief, the research, the lock G23–G30, the levers, the build plan), then `CLAUDE.md`, then this file. The worked example for every pattern named below is `packages/ghost-on-the-menu`; copy its **shape**, never its game.

## Standing frame

- The lock is G23–G30 in the dispatch, plus inherited G8, G12, G14, G17. Every design question is answered there; if it is not, choose the joyful reading and write the choice down in `docs/vibe-typer.slice1.md` under "Decisions".
- Version stays `0.x`. No new npm package. Nothing in `packages/tape-core`, `packages/ghost-on-the-menu`, `packages/cabinet-server`, `packages/launcher`, `catalog/`, `.github/workflows/release.yml` is edited by this slice. `apps/cabinets` is slice 2, not this one.
- Work on branch `cabinet/vibe-typer-s1` from `main`. One commit at the end of the slice (`feat: Vibe Typer, slice 1 — the package`), pushed to `origin`. Do not merge; the coordinator merges after review.
- Gate before the push: `pnpm verify` green from the repo root, including the new play-through. Run the identity scan from the repo root before pushing: `python %USERPROFILE%\.grok\bin\identity-scan.py .` (PowerShell: `python "$env:USERPROFILE\.grok\bin\identity-scan.py" .`); any hit outside `node_modules` halts the push.
- No spend: no image generation, no audio generation, no cloud model calls. Headless only.
- Every text line in every lever passes the digit and forbidden-word scan (copy `VOICE_FORBIDDEN` from `packages/ghost-on-the-menu/src/patterns.ts:48` into the new loader; keep the two lists identical, and say so in a comment). Lines are at most twelve words, one sentence, no tool or model names, no digits, nothing cruel. The user is absurd and lovable; the agent is sycophantic and hard-working. Write at least the counts in the lever table below; more is welcome.

## Standards compliance (this slice)

| Standard                 | Score | Evidence                                                                                                                                |
| ------------------------ | ----- | --------------------------------------------------------------------------------------------------------------------------------------- |
| PIN_PER_STEP             | 2     | Seeded sim; every band bar and play-through replays byte-for-byte from `(seed, levers, input)`.                                         |
| ANDON_AUTHORITY          | 2     | The loader halts on any lever fault; the band fails `pnpm test`; `test:play` fails `pnpm verify`.                                       |
| NAMED_COMPENSATORS       | 2     | The slice's only irreversible action is `git push` of a branch; compensator: `git push origin --delete cabinet/vibe-typer-s1`. No skip. |
| DECOMPOSE_BY_SECRETS     | 2     | Sim, levers, corpus, bots and the play script are separate modules with the dependency arrows listed below.                             |
| UNCERTAINTY_GATED_HUMANS | 2     | Numbers the Director owns (hardcore drain, hype steps, Copilot window) are data with a `// Director` comment, not code.                 |
| EXTERNAL_VERIFIER        | 2     | The diff is reviewed by a different family from a packet before merge; this builder never reviews its own work.                         |

## Package layout

`packages/vibe-typer/` (`"name": "@mcp-arcade-cabinets/vibe-typer"`, `"private": true`, same `tsconfig.json`, `package.json` scripts and `vitest` wiring as `packages/ghost-on-the-menu`; the root `vitest.config.ts` and `pnpm-workspace.yaml` already glob it).

```
src/
  types.ts        every type below; no logic
  seed.ts         mulberry32 + a string hash; copy the shape of ghost's shift.ts:46, never import ghost
  patterns.ts     loads and validates every lever in patterns/; DEFAULT_PATTERNS; halts with "patterns/<file>: <key>"
  corpus.ts       loads patterns/corpus/*.json; the character n-gram model; snippet lookup by stack and band
  difficulty.ts   value(snippet) — the deterministic formula (G24); pure
  score.ts        hype steps, streak, milestones, Copilot discount; pure
  context.ts      the context bar: drain, cost, refill, hardcore burn; pure
  level.ts        plan a level from levers + seed + weak bigrams: the ordered requests with fixed code and value (G26, G27); endless chaining
  sim.ts          createRun / stepRun / the keystroke reducer; the only stateful module
  lines.ts        pick user/agent lines by tier and beat with no repeat inside a level; dated skip
  play.ts         headless bots and the play-through entry (off the barrel like ghost's play.ts; node:fs allowed here only)
  index.ts        the barrel for the shell (slice 2): no node: imports
patterns/
  cabinet.json  levels.json  score.json  context.json  difficulty.json  user.json  agent.json  products.json
  corpus/bash.json  corpus/csharp.json  corpus/java.json  corpus/javascript.json  corpus/python.json  corpus/sql.json
test/
  patterns.test.ts  corpus.test.ts  difficulty.test.ts  score.test.ts  context.test.ts  level.test.ts  sim.test.ts  lines.test.ts  band.test.ts  play.test.ts
scripts/
  port-corpus.mjs   one-shot port from the prototype (see Corpus)
```

Dependency arrows: `sim → level → corpus, difficulty, score, context, lines, patterns, seed`. `play → sim`. Nothing imports `play` except the play script and its test. Nothing imports `apps/`.

## Types (src/types.ts)

```ts
export type Stack = 'bash' | 'csharp' | 'java' | 'javascript' | 'python' | 'sql' | 'integration';
export type Tier = 0 | 1 | 2 | 3; // 3 = hardcore, selector only (G25, G26)
export type Beat = 'request' | 'reply' | 'code' | 'ship' | 'compaction' | 'creep';
export interface Snippet {
  id: string;
  stack: Stack;
  band: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  title: string;
  code: string;
  notes: string[];
  topics: string[];
}
export interface Request {
  id: string;
  ask: string;
  reply: string;
  snippet: Snippet;
  value: number;
  creep?: { line: string; ask: string };
}
export interface LevelPlan {
  id: string;
  product: string;
  stack: Stack;
  tier: Tier;
  requests: Request[];
  drainPerSec: number;
  refillShare: number;
  messageCost: number;
  shipBonus: number;
  seed: number;
}
export interface RunInput {
  key?: string;
  backspace?: boolean;
  enter?: boolean;
  tab?: boolean;
} // one keystroke per step, or none
export interface RunState {
  plan: LevelPlan;
  endless: boolean;
  levelIndex: number;
  requestIndex: number;
  beat: Beat;
  target: string;
  typed: string;
  lineIndex: number; // the line being typed, the player's buffer, which line of the snippet
  errors: number[]; // indices in typed that are wrong; empty means clean
  context: number; // 0..1
  valuation: number;
  hype: number;
  streak: number; // the scoreboard (G23)
  copilot: { until: number; used: boolean } | null; // G26: null in hardcore
  built: { id: string; size: number }[]; // the preview pieces (G24)
  chat: { who: 'user' | 'agent'; line: string; at: number }[];
  clock: number;
  over: boolean;
  ended?: 'shipped' | 'context';
  events: Event[]; // drained by the shell each frame
}
export type Event =
  | { kind: 'key'; ok: boolean; pitch: number } // pitch = streak clamped to 12 (G29)
  | { kind: 'line'; ok: boolean }
  | { kind: 'hmm' }
  | { kind: 'piece'; size: number }
  | { kind: 'ship'; nearMiss: boolean }
  | { kind: 'message'; who: 'user' | 'agent' }
  | { kind: 'compaction' }
  | { kind: 'milestone'; name: string }
  | { kind: 'copilot'; on: boolean }
  | { kind: 'creep' }
  | { kind: 'over'; how: 'shipped' | 'context' };
```

The sim's public surface is exactly `createRun(opts: { levers?: Patterns; seed: number; tier: Tier; endless: boolean; weakBigrams?: Record<string, number>; stack?: Stack; agentName?: string })`, `stepRun(state, input, dt)` (mutating, `dt` in seconds), and the pure helpers. No score field is hidden anywhere else; `valuation`, `hype`, `streak` are the whole scoreboard.

## The sim (src/sim.ts)

State machine per request: `request` (the user's ask lands in chat; `message` event; context pays `messageCost`) → `reply` (the agent's reply is the target line; typed like code but prose) → `code` (the snippet's lines one at a time; Enter sends a line; a line with any error at Enter emits `hmm`, appends the agent's hmm line to chat, resets `typed` for that line, sets `streak = 0`, `hype = 1`, costs nothing else — G25) → optional `creep` (if the request carries creep: the user's "oh also" line lands as a `message` and a `creep` event; the creep line is appended as one more code line and is not typeable until the next step — Q4 implication) → `ship` (the last line sent: pay `value * hype` into `valuation`, push a `built` piece of `size = value`, refill context by `refillShare`, emit `piece` and, on the level's last request, `ship` with `nearMiss = context < 0.1` before the refill; append the user's reaction to chat; `streak += 1`; hype steps from `score.json`; milestone events when `valuation` crosses a threshold) → next request, or the next level (endless) or `over: 'shipped'`.

Keystrokes: `key` matches `target[typed.length]` → append, `streak` unchanged (streak counts clean **lines**, pitch = min(streak, 12)); mismatch → append and record the index in `errors` (the character is shown wrong and waits for backspace; G25), `streak = 0`, `hype = 1`, and in hardcore burn `hardcoreBurnPerError` off context. `backspace` pops and clears the error at that index. `tab` with Copilot active completes the current line at `copilotDiscount` of value and sets `used`. Copilot turns on when `streak >= copilotStreak` and off after `copilotSeconds` or one use; never in hardcore.

Context: drains `drainPerSec * dt` every step, ramped by `levels.json → drainRamp` across the level's requests (the only mid-level ramp, G26). At `context <= 0`: tier 0–2 in a level → `compaction` event, the agent's compaction summary in chat, `hype = 1`, `streak = 0`, `context = 1`, play continues; endless → `over: 'context'`; hardcore → `over: 'context'`.

Determinism: everything random comes from `seed` through `seed.ts`. `createRun` with the same `(levers, seed, tier, endless, weakBigrams, stack)` and the same input sequence produces byte-identical `RunState` (a test asserts it).

## Levels (src/level.ts, patterns/levels.json)

`levels.json`: an ordered list of at least eight levels, each `{ id, product, stack, requests, bandMin, bandMax, drainPerSec, drainRamp, refillShare, messageCost, shipBonus }`, plus `endless: { startBand, bandEvery, drainStart, drainGrow, products: 'products.json' }`. Level one is bash, band 1–2, four requests, slow drain. Products are absurd and authored ("Uber but for ducks", "a blockchain for the office fridge"). The planner picks snippets inside the band by seed, weights toward snippets containing the caller's weak bigrams (`weakBigrams` map; empty in the band), never repeats a snippet inside a run, and computes each request's `value` with `difficulty.ts` at plan time. The `ask` and `reply` come from `lines.ts` keyed by `(tier, stack, beat)`; the `ask` template may carry `{product}` and `{title}` placeholders filled from the level and the snippet title. Creep is attached to a seeded fraction of requests from `levels.json → creepShare`, using a one-line snippet from the same stack at band ≤ the request's band.

## Difficulty (src/difficulty.ts, patterns/difficulty.json) — G24

`value(snippet, model, weights)` returns a positive number, deterministic, computed as: sum over characters of the surprisal (bits) under a character trigram model built once from the whole corpus with add-one smoothing (`corpus.ts`), plus `travel` = sum over adjacent character pairs of the key-pair cost from `difficulty.json → keyMap` (a QWERTY row/column/hand/finger table; same finger = highest, same hand = mid, alternating = lowest; shifted characters add `shiftCost`), plus `length * lengthWeight`, plus `punctuationDensity * punctuationWeight`, plus `identifierWeight` for each identifier of eight or more characters and `bracketWeight` for each closing bracket. Weights are data. Tests: monotone in length for otherwise-identical text; `))` costs more than `ab`; the same snippet gives the same value across two model builds; every corpus snippet's value increases with its band on average (a weak check: mean value by band is non-decreasing).

## Score (src/score.ts, patterns/score.json) — G23, G24

`score.json`: `hypeSteps` (e.g. streak thresholds `[0, 3, 6, 10, 15]` → hype `[1, 2, 3, 4, 5]`; Director's numbers, comment them), `copilotStreak`, `copilotSeconds`, `copilotDiscount`, `milestones` (`[{ name: 'seed', at }, { name: 'series a', at }, { name: 'unicorn', at }]`; milestone names are words, never digits on the field), `hardcore: { hypeCap, shipMultiplier }`. Pure functions: `hypeFor(streak)`, `pay(valuation, value, hype)`, `milestoneCrossed(before, after)`.

## Context (src/context.ts, patterns/context.json) — G26

`context.json`: per tier `{ drainPerSec, messageCost, refillShare, hardcoreBurnPerError }` defaults that `levels.json` may override per level. Pure functions with tests at the boundaries (never below 0, never above 1).

## Lines (src/lines.ts, patterns/user.json, patterns/agent.json, patterns/cabinet.json) — G28

`user.json`: `{ asks: { [stack]: { [tier]: string[] } }, reactions: { [tier]: string[] }, creeps: string[], reviews: string[], dated: string[] }` with at least sixteen asks per stack at tier 0–2 (hardcore reuses tier 2), twelve reactions per tier, twelve creeps, eight reviews, eight dated. Asks may use `{product}` and `{title}`. `agent.json`: `{ replies: string[] (≥ 24), hmm: string[] (≥ 12), compactions: string[] (≥ 8), ships: string[] (≥ 8) }`. `cabinet.json`: `{ name: "Vibe Typer", tagline: "You're absolutely right.", agentName: 'Claudette', words: { valuation, hype: 'vibes', streak, context } }` (the field words the shell will print; a rename is this file and the package directory). The picker never repeats a line inside a level; `dated` is skipped unless `createRun` gets `dated: true`. The loader rejects any line with a digit, any forbidden word, any tool or model name, more than twelve words, or more than one sentence. Tone: the user is comically absurd and fond of the agent ("can it be more blockchain", "make the button feel premium", "my cousin says use rust"); the agent is sycophantic and eager ("Great idea, adding a duck now", "You're absolutely right, shipping it"). Nothing cruel, nothing that yells (G25).

## Corpus (src/corpus.ts, patterns/corpus/*.json, scripts/port-corpus.mjs)

Port from `E:/AI/prototypes/packages/dev-op-typer/DevOpTyper/Assets/Calibration/<lang>.json` (arrays of `{ Id, Language, Difficulty, Title, Code, Topics, Explain }`, thirty-five per language, five per band 1–7) and `.../Assets/Snippets/<lang>.json` (arrays of `{ id, language, difficulty, title, code, topics, explain }`). Output shape is `Snippet[]` per file with `band = Difficulty`, `notes = Explain`, `stack` from the file. Normalise line endings to `\n`, strip trailing whitespace per line, drop a trailing blank line, and reject any snippet whose code contains a tab or a non-ASCII character (write the rejects to the script's stderr with the reason; the count goes in the slice doc). Keep the port script in the package and re-runnable; commit its output. The corpus is studio-authored content; no licence text is needed beyond the repo's.

The n-gram model: character trigram counts over all corpus code, add-one smoothing, built once and cached on the loaded corpus object; `surprisal(text)` in bits. Stack `integration` has no corpus file: its snippets are built at plan time from tape headers and rows (`tape-core`'s `loadTape` over `fixtures/tapes/*.tape.json`, read through `node:fs` only in `play.ts` and passed in as data; the shell passes them from its glob): for each `tools/call` row a one-line JSON-RPC envelope `{"jsonrpc":"2.0","id":N,"method":"tools/call","params":{"name":"<tool>"}}` with band by envelope tier (bare name at band 1, method and name at band 3, the full envelope at band 5+), title from the tool name, notes from the server name and policy words only. Never a fact, never a receipt (G30).

## Bots and the play-through (src/play.ts, scripts/play.mjs)

Bots, each `(state, rng) => RunInput`: `idle` (never types), `typist(wpm, errorRate)` (types the next target character at a seeded cadence, mistypes at `errorRate`, backspaces its own errors on the next step, presses Enter at line end), `perfect` (typist at 90 wpm, zero errors). `play(args)` exported from `dist/play.js` as `scripts/play.mjs:208` expects: args `--tier`, `--endless`, `--bot`, `--seed`, `--stack`; runs one level (or endless until over) at a fixed `dt = 1/60`, prints a plain summary (words only, plus the valuation, which is allowed on the board), and exits non-zero on `over: 'context'` for tier 0. Register `vibe-typer` in `scripts/play.mjs:191` beside `ghost` (do not touch the ghost branch), and append `&& pnpm test:play vibe-typer --tier 0 --bot typist:40` to the root `verify` script.

`SCREEN_FORBIDDEN` in `scripts/play.mjs:18` applies to this cabinet's printed summary too; the summary must pass it.

## The band (test/band.test.ts)

Bars, every one asserted, all seeds `[1, 2, 3]`, all levels in `levels.json`, all four tiers:

- `idle` never ships a request at any tier and reaches `compaction` (tiers 0–2) or `over: 'context'` (tier 3).
- `typist(40, 0.03)` ships every level at tier 0 without a compaction, and at tier 1 with at most one compaction per level.
- `typist(60, 0.02)` ships every level at tier 2 with at most one compaction per level.
- `perfect` ships every level at tier 3 (hardcore is beatable by a clean 90 wpm).
- `typist(40, 0.03)` at tier 3 ends by context on at least half the levels (hardcore hurts).
- Endless with `perfect` runs at least six levels before `over: 'context'` at tier 0; with `typist(40, 0.03)` at least two.
- The scoreboard is monotone: `valuation` never decreases; `hype` is always inside `hypeSteps`; `streak` resets exactly on a bad line or a mistyped key.
- Every chat line, every ask, every reply and every printed word passes the forbidden scan (copy Ghost's `SCREEN_FORBIDDEN` idea into a test helper; no digit except in `valuation`).
- Determinism: same seed, same bot, same input stream twice → deep-equal final state.
- Copilot: with `perfect` at tier 0 Copilot turns on at least once per level and never in hardcore.

Tune `levels.json` and `context.json` until the bars hold; the numbers are data and the band is the andon. Record the final numbers and the sweep in `docs/vibe-typer.slice1.md`.

## Tests beyond the band

`patterns.test.ts` (every lever loads; a digit in a line halts with the file and key; a missing key halts; the two forbidden lists are identical), `corpus.test.ts` (counts per stack and band; no tabs; the model is deterministic), `difficulty.test.ts`, `score.test.ts`, `context.test.ts`, `level.test.ts` (no snippet repeats; weak-bigram bias measurably shifts picks; creep share holds), `sim.test.ts` (each transition; hmm resets only the line; compaction refills; hardcore burn; Copilot tab), `lines.test.ts` (no repeat inside a level; dated skipped by default), `play.test.ts` (the CLI runs and its output passes the screen scan).

## Deliverables

1. The package, green under `pnpm verify` from the root.
2. `docs/vibe-typer.slice1.md`: what was built, the corpus port counts and rejects, the band numbers, every decision taken where the dispatch was silent, and what is left for slice 2 (the shell) with the exact `index.ts` surface the shell will consume.
3. One commit on `cabinet/vibe-typer-s1`, pushed. Identity scan clean. No merge.

Do not start the shell. Do not add art, audio files or a Vite entry. Do not touch Ghost.
