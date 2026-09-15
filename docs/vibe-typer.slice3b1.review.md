# Review — Vibe Typer slice 3, sub-slice B part one (the authoring script and the sample)

**Reviewer:** Kimi K2.6 (`kimi-k2.6:cloud` through the local Ollama daemon), packet only: the lock G23–G30, the slice-3 kickoff, and the diff of `cabinet/vibe-typer-s3b1` against its base with the sample receipt JSON and the lockfile omitted. **Date:** 2026-09-15. **Coordinator's note:** no halt; all four changes applied on the branch before the merge (no trim before the gate, a `surplus` drop reason, the two parser tests, a run stamp on dry-run files); the parser walk was fixed as a consequence of the test. Line numbers cite the diff, not the merged files.

**Date:** 2026-09-15

## 1. The script's contract (subcommands, dry by default, --apply writes levers in key order)

`sample` and `run` subcommands exist in `scripts/author.mjs:1403-1404`. `run` without `--apply` is dry, writing candidates to `packages/vibe-typer/authoring/` (`author.mjs:1420-1421`). With `--apply`, `saveLevers` writes via `JSON.stringify(..., null, 2)` (`author.mjs:1450-1458`), preserving insertion order of keys already present in the parsed files; new keys (`story`, `snippets`, `ask`, `nags`, etc.) append to the end. A `prettier` pass runs after (`author.mjs:1461-1465`). The contract matches the brief.

**hold**

## 2. The gate path (every kept line through the package's own lineFault bundled by esbuild, the British list, no line edited into passing, drop reasons recorded)

Every kept line passes `makeGate`, which calls the package’s own `lineFault` first, then `britishHit`, then an optional word cap (`author-lib.mjs:226-236`). The package gate is bundled in-process by esbuild (`author.mjs:329-357`) and imported from temp; no copy is maintained. `keepFirstPassing` strips surrounding whitespace but never edits content into passing (`author-lib.mjs:198-220`). Drop tallies are merged per slot (`author-lib.mjs:222-224`) and rendered in the receipt.

However, `parseCandidates` (`author-lib.mjs:120-146`) uses `firstBracket` (`author-lib.mjs:148-154`), which scans for `[` or `{` without regard to string context in preceding prose. A bracket inside a preamble (e.g., “Here is an example: [1, 2] and the answer is…”) causes the parser to return the wrong JSON fragment. Because the prompt demands JSON only, this is an edge case, but the parser is explicitly lenient about prose.

**change** In `author-lib.mjs:148-154`, make `firstBracket` ignore brackets that appear inside unclosed double-quoted strings while scanning for the first JSON delimiter, or document that any preamble containing brackets will misparse.

## 3. The prompts (fact-blind, model-blind, the register, the rules, JSON only, the prompt hash pinned per slot)

The system prompt names no company, product, language, library, model or tool (`author.mjs:1024-1044`). It carries the barred-word list so the model steers around the gate. The register is gleeful, absurd, fond and benign, with no dated jokes. Every slot asks for JSON only. Prompt hashes are recorded per slot; the three shared prompts (asks, nags, reactions) hash identically across all seats, and the replies prompt differs per seat by design because it embeds that seat’s own kept nags (`docs/vibe-typer.author-sample.md:33-44`).

**hold**

## 4. The transports (OpenRouter and Ollama streaming, retries, structured errors, no key in any file)

Ollama streams over `/api/chat` as NDJSON (`author.mjs:433-512`). OpenRouter uses a non-streaming POST (`author.mjs:514-564`). `callModel` retries once (`author.mjs:566-588`). Errors are structured via `Fail` with codes `daemon down`, `model refused`, `bad answer`, etc. (`author.mjs:293-301`). `OPENROUTER_API_KEY` is read from `process.env` and never persisted (`author.mjs:516`).

But `opts.temperature` and `opts.timeoutMs` are passed to the transports without validation. `Number(args.flags.temperature ?? DEFAULT_TEMPERATURE)` yields `NaN` for `--temperature=bad`, which reaches the API body or `AbortSignal.timeout` (`author.mjs:484`, `author.mjs:520`).

**change** Reject non-finite `temperature` (require `0 <= t <= 2`) and non-finite positive `timeoutMs` in `parseArgv` or before the transport calls.

## 5. The parser and the pure helpers and their tests

`parseCandidates`, `groupCandidates`, `keepFirstPassing`, `britishHit`, `promptHash`, `sampleSnippets`, `productPhrase`, `corpusTopics`, and `chunk` are pure, isolated from network and disk, and covered by 39 tests (`docs/vibe-typer.slice3.b1.md:234`). Tests verify fence stripping, preamble forgiveness, bracket-inside-string balance, trailing-comma repair, British-list boundaries, word-cap enforcement, hash stability, and deterministic snippet selection (`packages/vibe-typer/test/author.test.ts`).

The same preamble-bracket leak noted in §2 lives here (`author-lib.mjs:148-154`). Additionally, `groupCandidates` silently drops non-string entries (`author-lib.mjs:166-167`); this is acceptable because the gate would drop them anyway, but it means an array slot returning `[null, 7, "line"]` counts as one candidate, not three.

**change** Fix `firstBracket` to respect string context when scanning for the first JSON delimiter.

## 6. The sample document and receipt (three seats, the retired tag, cost and latency, no Director quote, no digits inside lines)

Three seats produced columns: `ollama:kimi-k2.6:cloud`, `openrouter:openai/gpt-6-astra`, and `ollama:mistral-large-3:675b-cloud` (`docs/vibe-typer.author-sample.md:33-44`). The retired tag `ollama:deepseek-v3.1:671b-cloud` is recorded with HTTP 410 (`docs/vibe-typer.author-sample.md:7-11`). Cost and latency are tabulated (`docs/vibe-typer.author-sample.md:119-127`). No file quotes the Director. No digit appears inside any kept game line; digits occur only in receipt prose, markdown tables, and snippet IDs.

**hold**

## 7. Tone and G25 in the sampled lines (what would you prune)

G25 holds: no exclamation marks, no all-caps words, no yelling in any kept line. Prune candidates on taste:

- mistral reaction `cal-py-d1-003`: “concatenation is my new favorite way to name ducks” — programmer jargon in the user’s voice; the prompt asks for plain words (`docs/vibe-typer.author-sample.md:91`).
- mistral reaction `cal-py-d2-004`: “the list just sliced itself and the ducks are taking notes” — “sliced itself” is incoherent plain language for a list slice (`docs/vibe-typer.author-sample.md:95`).
- gpt-6-astra nag-6: “are we nearly a business?” — too corporate, not absurd (`docs/vibe-typer.author-sample.md:75`).

**hold**

## 8. What the full run and the sim sub-slice should know

The full run must settle two gate questions before executing: the plural of a barred word (`scores` passes `score`) and the curly apostrophe (`i’m`, `It’s`) (`docs/vibe-typer.slice3.b1.md:187-189`). The sim sub-slice must implement the nag mechanic, the loader for `ask`, `story`, `snippets`, `nags`, `nagReplies`, `reactionsByTopic` and `reviewsByProduct`, and the band bars for nag count (`docs/vibe-typer.slice3.b1.md:252`).

However, `pnpm verify` end-to-end and `pnpm build:play` were explicitly not run on this branch (`docs/vibe-typer.slice3.b1.md:247`). The brief requires both green before merge.

**change** Run `pnpm verify` and `pnpm build:play` end-to-end, confirm green, and record the result in the slice doc before merge.

## Summary

- **change:** `author-lib.mjs:148-154` — `firstBracket` misparses JSON when prose before it contains brackets; respect string context or document the limitation.
- **change:** `author.mjs:484` and `author.mjs:520` — validate `temperature` and `timeoutMs` are finite numbers before they reach the transport; reject NaN and out-of-range values.
- **change:** `docs/vibe-typer.slice3.b1.md:247` — run `pnpm verify` and `pnpm build:play` end-to-end and confirm green before merge.
- No halts.
