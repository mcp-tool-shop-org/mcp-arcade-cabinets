# Vibe Typer — slice 3, sub-slice B, part one: the authoring script and the sample

**Date:** 2026-09-15. **Builder:** Opus (this sub-slice). **Coordinator:** Claude (Fable 5.1). **Director:** Mike.
**Brief:** `docs/vibe-typer.kickoff-s3.md` § Sub-slice B, under `docs/vibe-typer.dispatch.md` (the lock G23–G30).
**Branch:** `cabinet/vibe-typer-s3b1`, two commits, not merged: the build, then the Kimi review's four changes with
`main` merged in.

This section belongs in `docs/vibe-typer.slice3.md`; that file is a sibling branch's to create, so it is written
here in the same house style and the coordinator folds it in at merge.

What landed: the offline authoring script, its pure helpers, its tests, and the forty-line sample read from three
writing models. **The full authoring run was not executed.** It waits on the Director's pick, which is the halt the
kickoff's standards table calls for. No lever and no corpus file changed on this branch; the only new data is the
sample receipt and the sample document. Version stays `0.9.0`.

## Standards compliance

| Standard                 | Score | Evidence                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------ | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PIN_PER_STEP             | 3     | Every call records the model, the route, the date, the temperature and the sha256 of the exact prompt text (system, a blank line, user) in `docs/vibe-typer.author-sample.json`. The same model at the same prompt hash is the replay; the hashes are in the sample document and in the table below, and the three shared prompts hashed identically across all four seats. |
| ANDON_AUTHORITY          | 3     | The gate halts a line and never repairs it. A level product that names a real company with no brand-free phrase halts the whole run rather than putting a brand in a prompt. A seat that will not answer is recorded and the other seats continue. The sample itself is the halt before the full run, and `run` was deliberately not executed.                              |
| NAMED_COMPENSATORS       | 2     | The only irreversible action on this branch is the branch push. Compensator: `git push origin --delete cabinet/vibe-typer-s3b1` (owner: the coordinator). The four calls to the studio's OpenRouter account cost $0.19717 and cannot be unspent; that is reported rather than compensated. No npm, no tag, no release, no Pages deploy, no lever write.                     |
| DECOMPOSE_BY_SECRETS     | 3     | Four things that change for four reasons: `author-lib.mjs` (parsing and gating, pure and tested), the prompts, the two transports, the slots that know the schema. The package's `lineFault` and `britishHit` are bundled in from the barrel with esbuild, never copied, so the authoring gate cannot drift from the game's.                                                |
| UNCERTAINTY_GATED_HUMANS | 3     | The script stops at the sample by construction; `run` exists, is implemented, and was not run. `run` without `--apply` is itself dry. The sample document ends with `Pick: ____`. Where the brief was silent the choice is under **Decisions** with its reason.                                                                                                             |
| EXTERNAL_VERIFIER        | 3     | None of the four writing seats is the coordinator's family and none is this builder's; three different families answered. The gate is mechanical and is the package's own, so no model judges its own line. The diff goes to a different family from a packet before merge.                                                                                                 |

## What the script does

`packages/vibe-typer/scripts/author.mjs`, beside `port-corpus.mjs`, with
`pnpm -F @mcp-arcade-cabinets/vibe-typer author`. It is `node`-only: no TypeScript loader, no new dependency, and
the lockfile did not move. It asks a writing model for the user's and the agent's lines, gates every candidate, and
writes what passed as **data**. Nothing in it is imported by the game and nothing in it runs at play time.

```
node scripts/author.mjs sample --model <spec>[,<spec>...] [--level duck-rides] [--out docs/vibe-typer.author-sample]
node scripts/author.mjs run    --model <spec> [--only stories|asks|nags|reactions|reviews|pools] [--apply]
```

`<spec>` is `openrouter:<model-id>` or `ollama:<tag>`. Ollama goes to `/api/chat` with `stream: true` and the answer
is read as NDJSON, because node's fetch drops a non-streaming answer after five minutes of silent headers and a
cloud tag writing thirty lines takes longer than that; the receipt keeps `prompt_eval_count` and `eval_count`.
OpenRouter is one non-streaming POST with the referer and title headers, and its `usage.cost` is recorded.

- **`sample`** is the Director's read: ten asks, ten check-ins, ten reactions and ten agent replies for one level.
  Each call adds its model's column to `docs/vibe-typer.author-sample.json` and re-renders
  `docs/vibe-typer.author-sample.md`, so three calls make the side-by-side.
- **`run`** is the full pass and the default is dry: without `--apply` it writes the candidates and a report to
  `packages/vibe-typer/authoring/<stamp>-<slot>.json`, where `<stamp>` is the date and the time of day to the
  millisecond, one stamp per invocation, and touches no lever. With `--apply` it writes the kept lines
  into the lever and corpus files, two-space indented with a trailing newline and the existing key order kept, then
  runs prettier over exactly the files it touched. Each slot is one function with one prompt.

Three candidates come back per line. The script keeps the first that passes and counts why the others fell, by
`lineFault` reason or `british:<word>`. **It never edits a line into passing.**

Errors are structured and exit non-zero with a one-line reason and no stack: `missing key`, `daemon down`,
`model refused`, `bad answer`, `bad json`, `brand in product`, `no level`, `thin corpus`, `bad flag`, `bundle`.

## The gate

Every kept line passes the package's own `lineFault` **and** the package's own `britishHit` — both bundled out of
`src/index.ts` with esbuild in process, the same trick `scripts/sit.mjs` uses, so the script uses the real gate and
never a copy of either list. On top of the two:

- a tighter word cap where the lever needs one: ten words for an ask template, so a seven-word product still reads
  once `{product}` is substituted at plan time; five for a sync line, which slice 1 already caps at five.

`makeGate(lineFault, britishHit, opts)` takes both by injection. `author-lib.mjs` is plain ESM so that `node` can
run the script with no loader, which is exactly why it cannot import the TypeScript module itself; injection is what
keeps the one list in one place. The test composes the gate the same way, out of `src/patterns.ts` and
`src/spelling.ts`, so nothing anywhere carries a second copy.

## The schema the full run will write

This is the data contract, written out in full because the sim and loader sub-slice was building against it in
parallel. It landed on `main` as sub-slice B part two while this branch was open, so what follows is now a
description of what the levers hold rather than a promise about them.

- **Asks per snippet.** A `patterns/corpus/<stack>.json` snippet gains `"ask": string` — a template in the user's
  voice describing the job that snippet's code actually does for the product. `{product}` may appear and is
  substituted at plan time, so the template itself is what the gate sees; templates stay at ten words or fewer so a
  seven-word product still reads. No `{title}`.
- **Level stories.** A `patterns/levels.json` level gains `"story": string` (a one-line premise the standup shows,
  passing the gate) and `"snippets": [id, id, id, id]` — pinned, in order, all from the level's stack and inside its
  band. The four asks then tell one story: the first sets it up, the middle two escalate, the fourth is the deploy
  with a twist. Sixteen levels in the end: two per corpus stack (twelve), a third for python and javascript
  (fourteen), and two `integration` levels that keep drawing from a band (`snippets` omitted), because the
  integration stack is built from tapes at play time and has no file. The full run authors the story levels first —
  the model picks four snippets from a candidate list of that stack and band range, given titles and code, and
  writes the story plus the four asks that become those snippets' `ask` — then writes an `ask` for every remaining
  snippet.
- **Nags and replies.** `patterns/user.json` gains `"nags": string[]` (short check-ins in the user's voice, of the
  "are you done yet" kind: status, are we live, did it deploy, can I see it, my cousin is asking; five words or
  fewer is the sweet spot, twelve is the cap) and `patterns/agent.json` gains `"nagReplies": string[]` (the agent's
  fond, sycophantic, unbothered replies: nearly there, one more line, it is going to be lovely). Fifty of each.
- **Reactions per piece.** `patterns/user.json` gains `"reactionsByTopic": Record<topic, string[]>`, keyed by the
  corpus `topics` words, three reactions per topic naming what just shipped — a loop, a table, a button — in the
  user's voice. The generic tier pools stay as the fallback.
- **Reviews per product.** `patterns/user.json` gains `"reviewsByProduct": Record<levelId, string[]>`, three per
  level, keyed by the level id. The generic `reviews` pool stays as the fallback.
- **Every pool ends at least three times its slice-1 size.** Asks: `MIN_ASKS 16` per stack and tier today, covered
  by the per-snippet asks, with the templates in `user.json → asks[stack][tier]` kept as the fallback and topped up
  too. Reactions 12 → 36, creeps 12 → 36, reviews 8 → 24, replies 24 → 72, hmm 12 → 36, compactions 8 → 24,
  ships 8 → 24, syncs 12 → 36 at five words or fewer.

`run`'s slots are `stories`, `asks`, `nags`, `reactions`, `reviews` and `pools`, in that order; `stories` runs first
so a pinned snippet keeps its story's ask and the `asks` slot skips it. The pool targets are one constant at the top
of the script.

## The three seats, and the one that was gone

The kickoff named one OpenRouter frontier model of the session's choice, `kimi-k2.6:cloud` and
`deepseek-v3.1:671b-cloud`.

| Seat         | Model                        | Why                                                                                                                                                                                                                                                                                                      |
| ------------ | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenRouter   | `openai/gpt-6-astra`         | The newest flagship non-Anthropic chat model in the catalog (`created` 2026-09-04), and not a mini or nano tier. The brief's words were "the newest GPT-5-family chat model"; GPT-6 Astra shipped to OpenRouter after that line was written and is the same pick the rule was aiming at. See Decision 1. |
| Ollama Cloud | `kimi-k2.6:cloud`            | Named in the brief. Answered every slot.                                                                                                                                                                                                                                                                 |
| Ollama Cloud | `mistral-large-3:675b-cloud` | Stands in for the retired seat: the largest live cloud tag on this rig from a fourth family, so the three columns are three different families (Decision 2).                                                                                                                                             |
| Ollama Cloud | `deepseek-v3.1:671b-cloud`   | **Gone.** HTTP 410, twice: "deepseek-v3.1:671b was retired at 2026-07-15". Recorded in the receipt, left out of the tables.                                                                                                                                                                              |

`openai/gpt-6-astra` was chosen after reading `GET https://openrouter.ai/api/v1/models` and sorting OpenAI's entries
by `created`. `gpt-6-astra-pro` is the same weights served at a higher reasoning mode for the same price; the plain
tier was taken because this is writing, not reasoning, and the cheaper latency is the better trade for a run of
hundreds of calls.

## The prompts

One system prompt is shared by every slot, so a hash difference between two slots is the material and nothing else.
It names the game, the register and the mechanical rules, and it carries the barred word list so the model steers
around the gate instead of being marked down by it. It names **no** company, product, language, library, model or
tool, and it tells the model not to name one either. The register it asks for is the dispatch's: gleeful and absurd,
the user fond and never the villain, the joke on a situation every developer shares, nothing that yells, no dated
jokes, and humor that will still read in five years (Q5.5 to Q5.7, G25, G28).

| Slot      | Prompt sha256                                                      |
| --------- | ------------------------------------------------------------------ |
| asks      | `07a941cf282592dd5a0cde38390cdb416405cb52a9521f98d3ad250f6b7cfdf5` |
| nags      | `c5b3675adfbc6e0be7376d665a6b94ed99e64192309d7e54f0e7b67c471c9c5e` |
| reactions | `87de735da4d25565842f7321d77f631b5b7e74547c9174d52f816a9ebf9407b7` |

Those three are byte-for-byte the same for every seat, which the receipt proves. The replies prompt carries that
seat's own check-ins, so its hash is per seat by design: `556c5ed571037f2f…` (kimi), `3a5135827ff34496…`
(gpt-6-astra), `729427b635402c9c…` (mistral-large-3).

## What came back

`docs/vibe-typer.author-sample.md` is the side-by-side; `docs/vibe-typer.author-sample.json` is the receipt.

| Model                               | Kept | Dropped                                     | Wall, four calls | Tokens in | Tokens out | Cost       |
| ----------------------------------- | ---- | ------------------------------------------- | ---------------- | --------- | ---------- | ---------- |
| `ollama:kimi-k2.6:cloud`            | 40   | none                                        | 754.7 s          | 3471      | 26345      | none       |
| `openrouter:openai/gpt-6-astra`     | 40   | none                                        | 97.0 s           | 3459      | 3128       | **$0.197** |
| `ollama:mistral-large-3:675b-cloud` | 39   | too many words 9, forbidden word or digit 4 | 24.7 s           | 3574      | 1699       | none       |
| `ollama:deepseek-v3.1:671b-cloud`   | 0    | the tag is retired                          | —                | 0         | 0          | none       |

The OpenRouter call is a paid call on the studio's account: **$0.19717 for the four calls**, 3,459 prompt tokens and
3,128 completion tokens. The two Ollama Cloud seats carry no per-token cost.

Kimi's twenty-six thousand output tokens against three thousand kept lines is thinking, not writing; it is the
reason for the twelve-minute wall time. Mistral was thirty times faster and lost a line to the ten-word ask cap.

Three things worth the Director's eye while he reads:

- **Nobody yelled and nobody wrote British.** Across the three hundred and sixty candidates the three seats were
  asked for, the gate caught no exclamation mark, no shouted word and no British spelling at all; the only drops
  were mistral running past the ten-word ask cap and four candidates carrying a digit or a barred word. The register
  held, so the differences between the columns are taste.
- **The gate let a plural through a barred word.** `VOICE_FORBIDDEN` barred `score` on a word boundary, so `scores`
  passed, and two of mistral's kept lines use it. **Closed on main:** sub-slice B part two added `FORM_FORBIDDEN`,
  which catches the inflected forms.
- **The gate let a curly apostrophe through.** Four of mistral's kept lines carry one (`i’m`, `It’s`), and no other
  seat wrote one. `lineFault` had no ASCII rule and the script is forbidden to edit a line into passing, so all four
  were kept as written. **Closed on main:** `lineFault` now refuses a non-ASCII character with `'not ascii'`, and it
  refuses rather than straightens, which is the right half of the rule to have chosen.

**The sample was not re-read under the merged gate, and the Director reads it as it stands.** Those six lines would
now be drops, so the merged gate is stricter than the columns below it suggest — which only sharpens the read, since
a tighter gate is the one the full run will use. Re-running would have spent the OpenRouter account again and moved
the lines the Director is about to compare. A smoke run of the same prompts against mistral after the merge confirms
the new rules fire: `not ascii` appeared as a drop reason for the first time.

## Decisions

Where the brief was silent, the choice and the reason.

1. **The OpenRouter seat is `openai/gpt-6-astra`, not a GPT-5.6 tier.** The brief said "the newest OpenAI GPT-5-family
   chat model that is not a mini/nano variant". OpenRouter's catalog now carries GPT-6 Astra (2026-09-04), newer than
   every GPT-5.6 tier (2026-07-09). The rule's evident purpose is a frontier non-Anthropic writer, and the brief also
   says the pick is the session's choice as long as the exact id and the reason are recorded. Both are recorded.
2. **The third seat is `mistral-large-3:675b-cloud`.** `deepseek-v3.1:671b-cloud` is still in `/api/tags` on this rig
   but answers 410 with "retired at 2026-07-15"; `glm-4.6` and `qwen3-coder:480b` are retired the same way. Of the
   cloud tags that do answer, Mistral Large 3 is the largest from a family neither the coordinator, the builder nor
   the other two seats belong to, which is what the sample is for.
3. **The sample merges rather than overwrites.** The brief's CLI takes one `--model`; the document wants three
   columns. Each `sample` call reads the receipt if it is there, adds or replaces its own model's entry, and
   re-renders the whole document, so three calls build the side-by-side and one call re-reads a single seat without
   re-spending the others. `--model` also takes a comma-separated list for one sitting.
4. **A seat that answered nothing is kept in the receipt and dropped from the tables.** Forty rows of the same
   error teaches nothing and buries the lines the Director is there to read; the receipt keeps every call, and the
   document opens with a short table naming the seat and what came back.
5. **The agent answers its own seat's check-ins.** The reply slot's prompt carries that model's kept nags, so the two
   tables read as one exchange and a weak check-in cannot be rescued by another model's reply. A reply keeps its
   check-in's key rather than its place in the answer, so a nag that fell the gate leaves a hole in both tables at
   the same row. The cost is that the reply prompt's hash differs per seat, which the document says.
6. **A candidate is gated exactly as it was written, padding included.** The first draft stripped surrounding
   whitespace on the reasoning that padding is the model's serializer rather than its writing, and counted the
   strips in the receipt. The Kimi review called that what it is — the script editing a line into passing — and it
   is right: the rule has no exception that survives contact with a second exception. A padded line is now a drop
   with the gate's own `padded` reason, like any other, and `trimmed` is gone. Nothing was lost by it: the count was
   zero for all four seats.
7. **A brand in a level's product halts the run.** The prompt must name no real company, but one level's product is
   written with one. `PRODUCT_PHRASE` maps that product to the dispatch's own brand-free words for it
   ("a rideshare for ducks"), a `BRAND_NAMES` regex catches the case, and a product that hits it with no entry — or
   whose entry still names the company — throws `brand in product` rather than sending a brand. The levers keep the
   Director's product strings unchanged; only the prompt sees the phrase.
8. **Ask templates are capped at ten words, not the gate's twelve.** `{product}` is one word in the template and up
   to seven in the level; twelve-word templates would read as nineteen-word asks on the field. Sync lines keep
   slice 1's five.
9. **The sample's ten snippets are picked with no randomness:** every python snippet at band two or below, sorted by
   id, the first ten. A sample the Director compares across models has to ask all of them about the same code, and a
   seed would be one more thing to record.
10. **Three candidates are asked for and all three are read.** The first that passes is kept, the rest that pass are
    filed as `alternates` in the receipt, and the rest that fail are counted by reason. The Director prunes on read;
    the alternates are there so the full run has somewhere to fall back to without asking again.
11. **The parser is lenient about shape, strict about content.** It strips a code fence, walks the balanced spans in
    order (respecting strings and escapes), forgives one trailing comma, and accepts an object keyed by id, an array
    of arrays, a flat array of `n × 3`, or a flat array of `n`. What it will not do is guess a missing line: a key
    with nothing for it is counted as `missing` and rendered as a dash, and a candidate it cannot place is counted
    as `surplus` rather than dropped in silence.
12. **Each call is retried once and then recorded.** A seat that fails twice becomes a receipt line, not a halt, so
    one dead tag does not cost the other two seats their run. The same message twice reads as "(twice)".
13. **`run` writes candidates by default and levers only under `--apply`.** The brief asks for this; what it does not
    say is what `--apply` does about formatting, so it writes two-space JSON with a trailing newline in the existing
    key order and then runs the repo's own prettier over exactly the files it touched, so the diff a reviewer reads
    is the lines and not the whitespace.
14. **The gate is bundled, not copied.** The package's barrel `src/index.ts` is built in process with esbuild and
    imported, the same shape `scripts/sit.mjs` uses, into the system temp directory and removed afterwards, and
    `lineFault` and `britishHit` come out of it. A copied regex would drift from the game's on the first commit that
    changes one — which is exactly what the merge below would have done to the British list.
15. **`packages/vibe-typer/tsconfig.json` gains `allowJs`.** The test imports the script's helpers, which are plain
    ESM because the script is `node`-only; without it `tsc --noEmit` cannot see the module. `checkJs` stays off, so
    nothing else changes.
16. **The authoring output directory is `packages/vibe-typer/authoring/`,** beside the levers it will feed, and it is
    created on demand. It holds no file today because `run` has not been run.
17. **One run stamp per invocation, not per day.** Every file a `run` writes shares `<date>-<hhmmssmmm>`, so a second
    dry run on the same day sits beside the first instead of on top of it. The candidates a run threw away are the
    thing somebody reads afterwards to decide whether the prompt moved in the right direction; overwriting them
    loses the comparison the dry run exists for.
18. **A candidate the shaping cannot place is counted, never discarded.** `groupCandidates` returns
    `{ groups, dropped }` and tallies `surplus`: a key nobody asked about, a row past the last key, or the remainder
    of a flat array longer than the keys but not `keys.length × 3`. A silent discard is a line the Director paid for
    and never saw.
19. **The parser tries every bracket, not only the first.** A preamble can carry one of its own ("Here are the lines
    [one per piece]:"), which the first draft would have tried to parse and then given up on. Each balanced span is
    tried in order and the first that parses and holds at least one string wins; a value that parses but holds no
    string — a bare `[1, 2]` in a preamble — is kept only as the fallback. Both shapes are tested.

## The Kimi review of this diff

No halt, four changes, all applied in the second commit, with `main` merged in the same commit.

| #   | The reviewer's finding                                                                   | What changed                                                                                                         |
| --- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1   | `keepFirstPassing` trimmed a candidate before gating, editing a padded line into passing | The trim is gone and `trimmed` with it; `padded` is a drop reason like any other. Decision 6 is rewritten above.     |
| 2   | `groupCandidates` silently discarded surplus candidates from a flat array                | It returns `{ groups, dropped }` and tallies `surplus`; `askSlot` merges that into the slot's drops. Decision 18.    |
| 3   | The parser was untested against a preamble carrying a bracket                            | It was also broken there. It now walks every balanced span; five parser tests cover it. Decision 19.                 |
| 4   | Dry-run filenames used only the date, so a second run the same day overwrote the first   | One `<date>-<hhmmssmmm>` stamp per invocation, carried in every file the run writes and in the receipt. Decision 17. |

The merge brought sub-slice A's `src/spelling.ts` and sub-slice B part two's data contract and gate change. Two
things follow from it: the script's own British list is deleted in favor of the package's `britishHit`, bundled from
the barrel beside `lineFault` (Decision 14, and the gate section above); and the two findings this sub-slice raised
are closed by `FORM_FORBIDDEN` and `'not ascii'` in `lineFault`, which is recorded where they were raised.

## Verification

- `pnpm -F @mcp-arcade-cabinets/vibe-typer typecheck` — clean. `pnpm typecheck` across the workspace — clean.
- `pnpm test` — green, `packages/vibe-typer/test/author.test.ts` 43 of them, holding `parseCandidates`,
  `groupCandidates`, the composed gate, `keepFirstPassing`, `mergeDropped`, `promptHash`, `sampleSnippets`,
  `productPhrase`, `corpusTopics` and `chunk`. No test touches the network. The spelling list has its own test
  (`test/spelling.test.ts`, from sub-slice A) and is no longer tested twice.
- `pnpm lint` — eslint and prettier clean over the whole repo.
- `node scripts/author.mjs --help` prints the usage and exits zero; an unknown command, an unknown flag, an unknown
  slot and an unknown level each exit two with one reason line and the usage, and no stack.
- The whole `sample` path was smoke-run once after the merge against `mistral-large-3:675b-cloud`, writing outside
  the repo, to prove the barrel bundle, the injected gate and the rendering still work end to end. It kept 39 of 40
  and drew `not ascii` as a drop reason, which is the merged gate doing its new job. Its output was deleted; the
  committed sample stands as the Director's read.
- `pnpm verify` end to end and `pnpm build:play` were not run; this branch changes no game code.

## What this leaves for the rest of sub-slice B

1. **The Director picks a model** from `docs/vibe-typer.author-sample.md` and the pick, the id, the prompt hash and
   the date go into `docs/vibe-typer.slice3.md`.
2. **Then the full run**, slot by slot, dry first (`run --only stories`, read the candidates, then `--apply`).
3. **The nag mechanic in the sim**, the loader for `ask`, `story`, `snippets`, `nags`, `nagReplies`,
   `reactionsByTopic` and `reviewsByProduct`, and the band bars for the nag count — landed on `main` as sub-slice B
   part two while this branch was open, against the schema written out above.
