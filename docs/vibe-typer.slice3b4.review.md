# Review — Vibe Typer slice 3, sub-slice B part four (the coherence pass)

**Reviewer:** Kimi K2.6 (`kimi-k2.6:cloud` through the local Ollama daemon), packet only: the lock G23–G30, the slice-3 kickoff, and the diff of `cabinet/vibe-typer-s3b4` against the run's branch with the levers' lines, the corpus asks and the receipts omitted. **Date:** 2026-09-16. **Coordinator's note:** no halt; the one change (the authoring script refuses an unknown flag and a non-numeric chunk, concurrency, temperature or timeout) applied with the finishing pass before the merge. The coordinator's own read of the levers found two pools the re-voice pointed the wrong sheet at (the quick-sync chatter, and the level stories written as restatements of the product), redone in the same finishing pass. Line numbers cite the diff, not the merged files.

## 1. The two voice sheets against the dispatch's decisions (fond, benign, nothing yells, no brand or model)

`packages/vibe-typer/patterns/voice/user.md:1` mandates lower case, no capitals, no exclamation marks, one concrete image at most (cousin, fridge, fern, yogurt), and forbids digits, model names, tool names, and sarcasm at the agent’s expense. The user is delighted, not disappointed — this matches G25’s nothing-yells rule and the dispatch’s “fond, benign”.

`packages/vibe-typer/patterns/voice/agent.md:1` mandates a capital on the first word, warm concrete language, ten-to-twelve words, and forbids digits, model names, their own name (Sprocket is a character, not a model — G17 holds), and anything that reads as a status report. The tone is sycophantic but not cloying; it matches the dispatch.

Neither sheet contains a brand name, a model name, a digit, or a British spelling. Both are hashed into the run receipt via `textHash` (`author-lib.mjs:39`).

**hold**

## 2. The script changes (chunk and concurrency flags, the kept lines passed back, serial calls for one pool, the settle andon, --revoice, slugGate as authoring-only)

`--chunk` defaults to 40 (`author.mjs:122`), `--concurrency` defaults to 2 (`author.mjs:110`), and `--revoice` is a boolean flag (`author.mjs:231`). `chunkEven` (`author-lib.mjs:288`) splits lists into evenly sized chunks rather than a full call and a thin remainder; it is covered by property tests (`author.test.ts:288`).

The memory mechanism (`author.mjs:670`–`700`) passes the last 120 kept lines of a slot back into the next call’s user prompt under a fixed heading, so a slot writes with knowledge of what it has already kept. This is the fix for the 189-stranger problem.

`slotNags` runs its two sub-slots at `mapLimit(..., 1, ...)` (`author.mjs:1900`, `author.mjs:1927`), not the default width, because two calls in flight writing the same pool cannot see each other’s memory and dedupe back under the floor. The `settle` andon (`author.mjs:1970`) refuses to replace a pool when a re-voice would take it under its floor, keeping the old pool and logging the reason.

`slugGate` (`author.mjs:1565`) adds a second lock that refuses any line containing a level id. It lives in the authoring script, not in `lineFault`, because it is a fact about how the prompts are keyed, not a rule about what a player-facing line may say.

No determinism leak affects game logic: `Date.now` appears only in receipt stamps and wall-clock timing (`author.mjs:1432`, `author.mjs:1480`). No `Math.random`, no object-key order dependence, no `WeakMap`.

No model-written string reaches a lever without the gate: the memory block only recycles already-gated lines, and `askSlot` still runs every candidate through the gate.

However, two inputs are swallowed silently. First, `parseArgv` stores any `--key` in `flags` without validating against `FLAGS` (`author.mjs:240`), so a typo like `--concurency 4` is ignored and the default 2 runs. Second, `runOpts` (`author.mjs:1480`) passes `--temperature`, `--timeout`, `--concurrency` and `--chunk` through `Number()` without `Number.isFinite`, so a non-numeric value becomes `NaN` and propagates into `Math.max(1, NaN)`.

**change** — In `packages/vibe-typer/scripts/author.mjs`:

- Add `'only'` to `FLAGS` at line 83.
- After extracting `key` from a `--` argument in `parseArgv`, add: `if (!FLAGS.has(key)) throw new Fail('bad flag', \`unknown flag --${key}\`);`
- In `runOpts`, guard each numeric flag, e.g.: `const temperature = Number(args.flags.temperature ?? DEFAULT_TEMPERATURE); if (!Number.isFinite(temperature)) throw new Fail('bad flag', '--temperature must be a number');` and likewise for `timeoutMs`, `concurrency`, and `chunk`.

## 3. The editor subcommand (drops only, never below a floor, reasons recorded)

`commandEdit` (`author.mjs:2200`) reads every pool back with the voice sheet in front of it and asks the model only for drop indexes. `EDITOR_RULES` (`author.mjs:2240`) explicitly forbid rewrites, replacements, or reordering.

The floor guard is built into each `editJobs` entry: `canDrop` for flat pools checks `lines.length - drop.size > floor` (`author.mjs:2340`); for tiered pools it checks `left(owner[i]) > floor` (`author.mjs:2355`). A drop that would breach the floor is refused and recorded as `refused` with `whyRefused: 'the pool is at its floor'` (`author.mjs:2290`–`2305`).

`readDrops` (`author.mjs:2265`) bounds-checks every index (1-based, converted to 0-based), deduplicates with a `Set`, and discards non-integers or out-of-range entries, so a malformed editor answer cannot corrupt a pool.

**hold**

## 4. The pins-unique bar and the re-pin rebuild

`test/level.test.ts:136` adds `pins no piece into two levels`, which walks every level’s `snippets` and asserts no id is shared. This bar failed before the shared `used` set was introduced and passes after.

`slotStories` (`author.mjs:1432`) now carries one `used` set across all sixteen levels. A collision (`author.mjs:1700`) triggers a re-ask with the taken pieces filtered out (`author.mjs:1710`). In revoice mode, the pinned set is rebuilt from scratch rather than merged: `ctx.pinned.clear()` (`author.mjs:1735`), then repopulated from the new writes and the untouched old levels.

**hold**

## 5. The receipts (chunk, concurrency, calls, wall, hashes of the sheets)

The run receipt records `chunk: 40`, `concurrency: 4` (the run width; the script default is 2), `revoice: true`, and the two voice hashes (`user: b57134ea…`, `agent: 60690cb…`) at `author.mjs:1515` and in the slice doc (`docs/vibe-typer.slice3.md:1375`). The shipped pass used 95 calls, the two remedy passes 54, and the editor 27, for 176 calls total and 203 minutes of wall time for the shipped content.

**hold**

## 6. The read printed in the doc: does it sound like one user and one agent, and which lines break it

The sample printed in `docs/vibe-typer.slice3.md:1470` (level 1, tier zero) reads as one user: lower case, concrete, short, present tense, no metaphors. The agent mostly reads as Sprocket: warm, agrees first, builds second, no status-report language.

Two lines break the agent voice: `the pie cools on the sill` and `the peach has a fresh stem` — second clauses that wander from the work into domestic abstraction. The doc discloses them honestly and names the fix (more spare in `agent.replies` next time).

**hold**

## 7. What the lead should know before merging and before the next authoring pass

- Two agent reply lines remain off-voice; the editor dropped their sibling but was refused at floor because `agent.replies` was only three lines over its floor of 72. The next pass should write that pool with more than `REVOICE_SPARE` of 4.
- 63 editor drops were refused at floor; the pools that need headroom are the small ones (`agent.replies`, `user.reviews`, `agent.ships`) and the large `reactionsByTopic`.
- The voice sheets are hashed into receipts; a Director revision changes the run fingerprint and must be re-run to keep the pin.
- Eight drains were retuned after the re-pick; all sixteen budgets now sit between 0.883 and 0.942.
- This sub-slice touches no runtime seat logic; G11 and G13 are unaffected.
- No British spelling, digit, or barred word reaches a lever in this pass.

**hold**

## Summary

- Fix `parseArgv` to reject unknown `--` flags and `runOpts` to reject non-numeric `--chunk`, `--concurrency`, `--temperature`, and `--timeout` in `packages/vibe-typer/scripts/author.mjs`.
- No halts.
