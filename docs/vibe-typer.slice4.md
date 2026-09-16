# Vibe Typer — slice 4, the container tools, the look, the voice

**Date:** 2026-09-16. **Builder:** Opus (this slice). **Coordinator:** Claude (Fable 5.1). **Director:** Mike.
**Brief:** `docs/vibe-typer.kickoff-s4.md` under `docs/vibe-typer.dispatch.md` (the lock G23–G30, G28 amended),
with the inherited G11–G18 where a model sits.
**Branch:** one per sub-slice from `main`, one commit each, not merged.

Slice 4 runs as four sub-slices (A–D). Each appends its own section below and its own evidence to the
standards table. Version stays `0.10.0`; the release is `0.11.0` on the Director's word.

## Standards compliance

| Standard                 | Score | Evidence                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PIN_PER_STEP             | 3     | The tool contract is JSON committed beside the code (`tools.vibe.json`) and mirrored byte for byte into `catalog/tools.vibe.json`, both versioned with the package and both compared by a test. `VIBE_SEAT_SYSTEM` is one frozen string. The headless round is seeded and its bot is a named spec, so the same seed and the same calls give the same run.                                  |
| ANDON_AUTHORITY          | 3     | The contract loader halts at import on a description that whispers, carries a fact word or gains a digit, before the server lists. The code gate refuses on the first failure and never repairs. `pnpm verify`, the band bar, the pack's marker gate and CI's tarball contract all halt. The stdio server halts if the catalog listing has drifted.                                        |
| NAMED_COMPENSATORS       | 3     | This sub-slice performs no irreversible call. The one irreversible act is the branch push; the compensator is `git push origin --delete cabinet/vibe-typer-s4a`, owner the coordinator. Nothing here publishes, tags, releases or writes outside the repo; `sit` writes only into `film/`, which is ignored. The npm rows are `docs/npm-launcher.md`'s and are unchanged by this work.     |
| DECOMPOSE_BY_SECRETS     | 3     | Two cabinets, two contracts, two stdio entries, two packed bundles. What the typing cabinet's server needs and what the shooter's needs change on different clocks and now live in different files; the word maps both seats share were lifted into `vibe-words.ts` so the push path does not carry the pull path's cloud client. Measured: the alternative costs 135,401 B (below).       |
| UNCERTAINTY_GATED_HUMANS | 2     | `pnpm sit --cabinet vibe-typer --seat mcp` exists so the Director reads real asks off the push path before it ships; the numbers and the samples are below, beside the pull path's for the same two models. The feel numbers stay `// Director` constants in `codegate.ts`. No checkpoint blocks play, because nothing here plays without a client pointing at the cabinet.                |
| EXTERNAL_VERIFIER        | 3     | Every tool output is judged by a gate the caller never sees, written from the corpus rather than from any model. The fact-blind test runs the same call sequence over a tape and its flipped twin and compares. CI drives both built bins in another process on another machine and requires each to list its own four or six names. The diff review is a different family, per the slice. |

## Sub-slice A — the container tools

**Branch:** `cabinet/vibe-typer-s4a`, one commit, not merged, not pushed, nothing published.
`pnpm verify`, `pnpm build:play` and `pnpm build:launcher` (both packages) green; `npm pack --dry-run` on both;
both built bins driven over stdio.

`@mcptoolshop/vibe-typer --mcp` used to print a line naming this slice and leave with two. It is now the typing
cabinet's own MCP server: four tools, `view`, `product`, `ask` and `react`, over a headless endless run. Any
client can sit in the user's chair and send the requests the agent types — the push path of the seat whose pull
path shipped in slice 3.

### What was built

| File                                                | What                                                                                                        |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `packages/cabinet-server/tools.vibe.json`           | new — the typing cabinet's contract, the same shape as `tools.json`                                         |
| `catalog/tools.vibe.json`                           | new — its flat-array mirror, generated from the contract, compared by a test                                |
| `packages/cabinet-server/src/tool-names.ts`         | `VIBE_TOOL_NAMES`, `VibeToolName`, `AnyToolName`                                                            |
| `packages/cabinet-server/src/contract.ts`           | `loadContract(raw, names, file)`, `assertCatalogTools(raw, contract, file)`, `VIBE_CONTRACT`, `vibeToolDef` |
| `packages/cabinet-server/src/gate.ts`               | `namesRegex(tools)`, `VIBE_NAMES`                                                                           |
| `packages/cabinet-server/src/vibe-words.ts`         | new — the stack, language and band words both seats read                                                    |
| `packages/cabinet-server/src/endless.ts`            | the four word helpers moved out and re-exported; nothing else moved                                         |
| `packages/cabinet-server/src/vibe-cabinet.ts`       | new — the four tools over a `VibeHost` of words; `reactFault`, `splitNotes`, `tooLong`                      |
| `packages/cabinet-server/src/vibe-host.ts`          | new — the host over a live `RunState`: the view, the product, the gate, the repeat rule, the reaction slot  |
| `packages/cabinet-server/src/vibe-seat.ts`          | new — `VIBE_SEAT_SYSTEM` and `vibeSeatPrompt`, for `sit` only                                               |
| `packages/cabinet-server/src/server-vibe.ts`        | new — the stdio entry, the headless endless round, the catalog check                                        |
| `packages/cabinet-server/src/client.ts`             | `chatTools` takes an optional `timeoutMs`                                                                   |
| `packages/cabinet-server/src/index.ts`              | the exports                                                                                                 |
| `packages/cabinet-server/package.json`              | the `vibe-typer` workspace dependency; `build` emits `dist/server-vibe.js`                                  |
| `packages/cabinet-server/tsconfig.json`             | `tools.vibe.json` in `include`                                                                              |
| `packages/vibe-typer/src/codegate.ts`               | `productFault`, lifted out of the gate's last step                                                          |
| `packages/vibe-typer/src/level.ts`                  | the product override no longer waits on a fed request                                                       |
| `packages/vibe-typer/src/sim.ts`                    | `feedProduct`, `feedReaction`, `reactionWaiting`, `suppliedProductOf`, the reaction slot                    |
| `packages/vibe-typer/src/index.ts`                  | the barrel                                                                                                  |
| `packages/launcher-vibe-typer/src/cli.ts`           | `runMcp`, the usage, `MCP_LINE` and `MCP_EXIT` gone                                                         |
| `packages/launcher/scripts/build.mjs`               | `STDIO_BUNDLES` per cabinet; `layoutOf` requires `cabinet-stdio.js` for both                                |
| `.github/workflows/release.yml`                     | one smoke for both seats' tool lists; the Vibe tarball must carry `cabinet-stdio.js`                        |
| `scripts/sit-vibe.mjs`                              | `--seat pull\|mcp`, the push-path measurement, one shared bundle                                            |
| `packages/cabinet-server/test/contract.test.ts`     | the Vibe contract, its halts, and both catalog mirrors                                                      |
| `packages/cabinet-server/test/vibe-cabinet.test.ts` | new — fact-blind per tool, the boundary, the gates                                                          |
| `packages/cabinet-server/test/vibe-server.test.ts`  | new — the version, the headless round, the stdio server                                                     |
| `packages/vibe-typer/test/sim.test.ts`              | two new describes: the product on its own, the reaction slot                                                |
| `packages/vibe-typer/test/spelling.test.ts`         | the contract and its mirror are scanned                                                                     |
| `packages/launcher-vibe-typer/test/cli.test.ts`     | `--mcp` is a mode, and says what is missing rather than exiting two                                         |
| `pnpm-lock.yaml`                                    | the workspace link, three lines. No new dependency of any kind.                                             |

Thirty tests added; the suite is **694 across 54 files** (664 across 52 before).

### The tool contract

Four tools, all fact-blind, all answered in words, none of them ever carrying a digit, a model name or a tool
name inside the field. Every property is a bounded string; there is no array and no nested object anywhere in
the schema, and that closedness is the point.

| Tool      | Properties                                                            | Read-only | Answers                                                                                                                                                                 |
| --------- | --------------------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `view`    | none                                                                  | yes       | the view, as `key value` lines (below)                                                                                                                                  |
| `product` | `product` ≤ 80                                                        | no        | `the next level will build that` / `the product is set` / `the gate refused it (<rule>); the cabinet draws one of its own instead`                                      |
| `ask`     | `ask` ≤ 200, `code` ≤ 2048, `title` ≤ 80, `notes` ≤ 600, all required | no        | `the next request is queued` / `the next level is full` / `the gate refused it (<reason>); the cabinet plays one of its own instead`                                    |
| `react`   | `text` ≤ 160                                                          | no        | `the user will say it at the next thing that ships` / `a reaction is already waiting; dropped` / `the gate refused it (<rule>); the user says one of their own instead` |

**`view`**, one key to a line, in this order:

```
product   the name the next level will carry
team      shell | python | script | sharp | java | tables | wires
language  bash | python | javascript | c sharp | java | sql | a json remote call envelope naming one tool
band      easy | warm | hot | hotter
asked     (zero to three lines: the last three things asked for)
pairs     (the typist's weak letter pairs, omitted when there are none)
next      the next level wants a product | the product is set
room      the next level has room | the next level is full
```

Everything in it is about the **next** endless level, drawn with `endlessPeek`, because the level in hand was
fixed at level start and does not move (G26) and because a client that writes for the level it can see would
always be one level too late (G13). `product` is the name a client gave with the `product` tool when it gave
one, and the noun list's own draw otherwise — which is the name the level will actually carry, so `{product}`
in an ask lands right. The count of open slots is never a number: `room` is a word.

### The gate order, per tool

Every tool's first step is the contract's own bound: a field longer than the `maxLength` written in
`tools.vibe.json` is refused as `too long` and nothing shorter is put in its place. The stdio server's zod
shape rejects such a field at the transport, so what this catches is an in-process caller.

- **`product`** — the bound, then normalize (trim, drop wrapping quotes, collapse whitespace), then
  `productFault`: plain keyboard characters, then `lineFault` (the scan every authored line passes: empty,
  padded, a digit or a closed word, a model's name, a shout, more than one sentence, more than twelve words),
  then the American spelling list, then at most eight words. Accepted, it is the next level's product and the
  first name offered wins; a second before that level turns is answered `the product is set` and dropped.
- **`ask`** — the bounds on all four fields, then `notes` split on newlines, then the level's own room, then
  **`repeat`**, then `gateCode` against the **next** level's stack and band from `endlessPeek`, with
  `corpusOf(state)`, `leversOf(state).difficulty` and `VALUE_TOLERANCE`. The code gate's fourteen reasons and
  their order are slice 3's and are unchanged. Accepted, `feedRequests` queues it for the next level. When the
  buffer is already as long as the next level, `the next level is full` and the request is dropped. Nothing
  blocks, nothing waits, nothing is retried on the client's behalf.
- **`react`** — the bound, then normalize, then `lineFault`, then `VIBE_NAMES` (the four lever names plus the
  vendor list), then a no-repeat window over the run's last eight user lines. Accepted, the line goes into a
  one-line slot on the run and lands at the next ship in place of the authored reaction — or in place of the
  review when that ship is the level's deploy. A second line before that ship is dropped.
- **`view`** — no gate: it is generated, not accepted.

**The repeat rule.** A request whose ask matches something already queued for this level, or something the user
said in the last eight lines, is refused as `repeat` before the code gate sees it. The comparison is
`lineKey` — letters only, lower case — over both the ask as written and the ask with `{product}` filled in
with the name the next level will carry, because a client may write either and both land on the field as the
same line. The window is the whole queue (which is exactly the level being written and is never longer than
that level) plus `REACT_WINDOW`, the same eight-line window a reaction is compared against, so the cabinet has
one no-repeat number rather than two. The `ask` tool description says so, which is where a client reads it.

Nags stay authored. There is no `nag` tool in this sub-slice.

### The one-beat-ahead rule, as implemented

A client reads `view`, which describes the level **after** the one being typed, and sends requests for it while
the current one is still on the screen. `planLevel` splices whatever is in the buffer when the level turns and
draws the rest from the corpus, so a client that is slow, wrong or absent costs the run nothing — the corpus
plays and no one is told. `react` is the same shape one beat smaller: the line a client writes after reading
the view lands at the **next** ship, not the one it was reacting to, which is what lets a client at cloud
latency stay ahead of a sim that never waits.

The reaction slot lives beside the run, in the context the sim keeps in a `WeakMap`, not on `RunState`. A line
that has not been said yet is therefore not in anything a player could save or replay, and a run that is never
fed one stringifies byte for byte as it always did (a test asserts both).

### The headless round's pace

The server steps every 33 ms with the real elapsed time as `dt`, so one second of sim is one second of wall
clock. Measured on this rig over three seeds at tier zero, to the level:

| Typist      | Levels a run | Seconds a level | Levels a minute | Seconds a slot |
| ----------- | ------------ | --------------- | --------------- | -------------- |
| `typist:35` | 3.0          | 221.1           | 0.27            | 55.3           |
| `typist:45` | 4.0          | 204.1           | 0.29            | 51.0           |
| `typist:60` | 5.3          | 167.6           | 0.36            | 41.9           |
| `perfect`   | 6.7          | 145.0           | 0.41            | 36.3           |

The round runs under `typist:45`, which gives a client **fifty-one seconds a slot**. The honest reading of the
table is that the latency argument for a slower typist does not hold: even a perfect typist leaves thirty-six
seconds a slot, and the slowest turn measured on either seat below was 15.3 seconds. `typist:45` is the default
because a cabinet a client is watching should read like someone playing it, not like a benchmark — and because
the margin costs nothing. `CABINET_BOT` moves it.

### The pack and the tarballs

`packages/launcher/scripts/build.mjs` had one `STDIO_BUNDLE` and a boolean `stdio`. It now has one bundle per
cabinet and `stdio` names which — `ghost` for `cabinet-server/dist/server.js`, `vibe` for
`dist/server-vibe.js` — and both are laid down as `dist/cabinet-stdio.js`, which `layoutOf` now requires for
both packages. The marker needles did not change. `npm pack --dry-run --json` on this rig:

| Package                          | Files       | Packed             | Unpacked           | `cabinet-stdio.js` |
| -------------------------------- | ----------- | ------------------ | ------------------ | ------------------ |
| `@mcptoolshop/ghost-on-the-menu` | 63 → 63     | 5.88 → 5.88 MB     | 8.40 → 8.40 MB     | 1,519,109 B        |
| `@mcptoolshop/vibe-typer`        | **72 → 73** | **1.14 → 1.49 MB** | **2.71 → 4.51 MB** | **1,883,774 B**    |

The Vibe tarball grows by one file: **+0.35 MB packed, +1.80 MB unpacked**. Ghost does not move at all. The
Vibe stdio bundle is larger than Ghost's because it carries the typing corpus — two hundred and forty-nine
snippets and the levers — which is what a cabinet that plans its own levels needs.

### The release workflow

- The smoke step's Vibe `--mcp` exit-two block is gone. The tools/list step is now one shell function run
  twice: `packages/launcher` must list exactly `fire, say, speak, sfx, view, tapes` and
  `packages/launcher-vibe-typer` must list exactly `view, product, ask, react`. Set equality both ways, so
  neither may list the other's names.
- The tarball contract moves `dist/cabinet-stdio.js` for the Vibe package from `gone` to `need`.
- Two job-summary lines are reworded. Nothing else in the workflow moves: it is release-only, the filename is
  load-bearing for Trusted Publishing on both packages, and there is still no `environment:`.

Driven locally against the built bins, which is what CI does:

```
node packages/launcher/dist/cli.js --mcp            → fire,say,speak,sfx,view,tapes
node packages/launcher-vibe-typer/dist/cli.js --mcp → view,product,ask,react
```

### `pnpm sit --cabinet vibe-typer --seat mcp`

`--seat pull` is slice 3's path and stays the default. `--seat mcp` builds the typing cabinet over a host on
the same `RunState` the sit plays, gives the model the four tools from `VIBE_CONTRACT` and, per slot, the text
the `view` tool would have returned, and dispatches every call the model makes to `cabinet.call`. It counts
asks, acceptances, refusals by gate reason, prose-with-no-call, names off the menu, latency and the tool-call
log by name. There is no fallback to the pull path inside it.

A slot is up to four turns, not one, and a turn after the first carries what this slot has already pulled and
what the cabinet said back. A refusal does not end the slot; a queued request does.

#### The numbers, measured on this rig, 2026-09-16

Three levels, tier zero, seed one, `typist:45` on the push path and `perfect` on the pull path (each seat's own
default). Both seats sat in the cloud tier; there is no `ANTHROPIC_API_KEY` on this rig. **These are live
models on a live daemon: the numbers move run to run and are a read, not a bar.**

**Push path — the four levers:**

| Model                | Asks | Accepted | Latency min / middle / most | Refusals by gate reason                                                      | Tool calls                 | Played  |
| -------------------- | ---- | -------- | --------------------------- | ---------------------------------------------------------------------------- | -------------------------- | ------- |
| `kimi-k2.6:cloud`    | 40   | 8        | 938 / 6346 / 12974 ms       | repeat 10, too-many-lines 4, value-out-of-band 3, bad-notes 1, too-wide 1    | ask 27, view 10, product 3 | 8 of 16 |
| `gpt-oss:120b-cloud` | 36   | 8        | 388 / 1305 / 2540 ms        | too-many-lines 10, value-out-of-band 3, bad-notes 1, no answer 1, too-wide 1 | ask 23, view 9, product 3  | 8 of 16 |

Prose with no call: none for either. Names off the menu: none for either. Valuation 939 (kimi) and 976
(gpt-oss) against 651 for the same seed with no seat.

This is the run **after** the repeat gate of the coordinator's review item. For the record: before it, kimi
queued the same ask four times running (32 asks, 8 accepted, no `repeat` reason to refuse them with), and
gpt-oss queued ten with four near-duplicates. The gate now refuses ten of kimi's forty asks as repeats and the
eight it queues are eight different requests.

**Pull path — the same two models, the same session, for comparison:**

| Model                | Asks | Accepted | Latency min / middle / most | Refusals by gate reason                                 | Played  |
| -------------------- | ---- | -------- | --------------------------- | ------------------------------------------------------- | ------- |
| `kimi-k2.6:cloud`    | 15   | 9        | 3314 / 5869 / 10885 ms      | too-many-lines 5, value-out-of-band 1                   | 9 of 16 |
| `gpt-oss:120b-cloud` | 18   | 8        | 1374 / 2525 / 8257 ms       | too-wide 6, bad-notes 2, bad-ask 1, answered in words 1 | 8 of 16 |

The two paths agree on what each model gets wrong, which is the useful finding: **gpt-oss writes too wide** and
**kimi writes too long** on both seats, exactly as slice 3 measured. What differs is the shape of the work: the
push path spends more turns (a client pulls `view` and `product` as well as `ask`) at lower latency per turn,
and lands in the same place. Full transcripts: `film/sit-vibe-mcp.txt` and `film/sit-vibe-pull.txt` (ignored).

#### Ten sampled asks from the push path

The first five each model queued, verbatim from `film/sit-vibe-mcp.txt`. The Director's read, not a test.

**`kimi-k2.6:cloud`, bash, band one — `make a dog walk block for {product}`** — "dog walk block creator"

```bash
echo "dog walk block" > block.txt
sha256sum block.txt > hash.txt
cat hash.txt
```

**`kimi`, bash — `let {product} show the last three walks`** — "show recent dog walks"

```bash
#!/bin/bash
CHAIN="dogwalk.chain"
tail -n 3 "$CHAIN" | while read -r line; do
  hash=$(echo "$line" | cut -d'|' -f1)
  dog=$(echo "$line" | cut -d'|' -f2)
  time=$(echo "$line" | cut -d'|' -f3)
  echo "$dog was walked at $time"
done
```

**`kimi`, bash — `let {product} count total steps for all walks`** — "count total steps in chain"

```bash
#!/bin/bash
chain="dog_walk_chain.txt"
total=0
while IFS= read -r line; do
  steps=$(echo "$line" | grep -o 'steps:[0-9]*' | cut -d: -f2)
  total=$((total + steps))
done < "$chain"
echo "total steps: $total"
```

**`kimi`, csharp, band two — `a tiny thing, every duck needs a shoe`** — "duck shoe reminder"

```csharp
using System;

class DuckShoe
{
    static void Main()
    {
        Console.WriteLine("Every duck needs a shoe.");
        Console.WriteLine("Quack quack, now with style!");
    }
}
```

**`kimi`, csharp — `make a hat listing class for {product}`** — "hat listing class"

```csharp
public class HatListing
{
    public string Name { get; set; }
    public decimal Price { get; set; }
    public string Size { get; set; }
    public string Color { get; set; }
    public bool IsSold { get; set; }

    public void MarkAsSold()
    {
        IsSold = true;
    }
}
```

**`gpt-oss:120b-cloud`, bash, band one — `make {product} record a walk with timestamp and distance`** — "record walk entry"

```bash
#!/bin/bash
timestamp=$(date +%s)
 distance=$1
prev=$(tail -n 1 chain.txt 2>/dev/null || echo "")
hash=$(echo -n "$prev$timestamp$distance" | sha256sum | awk '{print $1}')
echo "$timestamp $distance $hash" >> chain.txt
```

**`gpt-oss`, bash — `show total distance from {product} chain`** — "total distance calculator"

```bash
#!/bin/bash
chain_file="dogwalk.chain"
if [[ ! -f "$chain_file" ]]; then
  echo "no walk data"
  exit 1
fi
total=$(awk '{sum+=$2} END {print sum}' "$chain_file")
echo "total distance walked: $total"
```

**`gpt-oss`, bash — `list all walks from {product}`** — "list walks from blockchain"

```bash
#!/usr/bin/env bash
# list walks from the blockchain file
BLOCKCHAIN_FILE="dogwalks.chain"
if [[ ! -f "$BLOCKCHAIN_FILE" ]]; then
  echo "blockchain file not found"
  exit 1
fi
cat "$BLOCKCHAIN_FILE"
```

**`gpt-oss`, csharp, band two — `please create {product} for trading hat collections`** — "simple hat marketplace"

```csharp
using System;
using System.Collections.Generic;

public class HatMarketplace {
    private List<string> hats = new List<string>();
    public void AddHat(string hat) => hats.Add(hat);
    public IEnumerable<string> GetHats() => hats;
}
```

**`gpt-oss`, csharp — `please give me a {product} that tracks daily walks`** — "dog walk subscription box tracker"

```csharp
public class DogWalkBox
{
    public string Owner { get; set; }
    public int WalkCount { get; private set; }
    public void LogWalk()
    {
        WalkCount++;
        Console.WriteLine($"Walk logged. Total walks: {WalkCount}");
    }
}
```

The taste reading, for the Director: with the repeat gate in, both seats write ten different requests and the
run reads like a person asking for one more thing each time — a block creator, then the last three walks, then
the total steps. What they still get wrong is what slice 3 measured: **gpt-oss writes too wide** and **kimi
writes too long**, both caught mechanically, neither reaching the field. Two things worth a later look, neither
this sub-slice's to fix: kimi's fourth sample (`a tiny thing, every duck needs a shoe`) is a fine line but it
does not describe the code it came with, which is a gap no mechanical gate can close; and gpt-oss's first
sample carries a stray leading space on a line, which is legal bash and unpleasant to type.

### The band, with the seat off

`pnpm test:play vibe-typer --tier 0 --bot typist:40` and
`pnpm test:play vibe-typer --endless yes --tier 0 --bot perfect` were run on this branch and on `main`'s own
`codegate.ts`, `level.ts`, `sim.ts` and `index.ts` restored into this worktree, and the two transcripts
diffed: **no difference in either**, character for character.

| Play-through                           | `main` | this branch |
| -------------------------------------- | ------ | ----------- |
| `--tier 0 --bot typist:40`             | 31     | 31          |
| `--endless yes --tier 0 --bot perfect` | 1830   | 1830        |

Twenty-one pieces and six levels in the endless run, four pieces and one level in the story run, both sides.
Every old bar in `band.test.ts` holds unchanged, and the suite is green.

### Decisions

Numbered, with the reason. The first eight restate what the coordinator settled; the rest are what this
sub-slice had to decide for itself.

1. **A second stdio entry, not a flag.** `server-vibe.ts` beside `server.ts`, bundled to `dist/server-vibe.js`.
   The two cabinets' servers change on different clocks (DECOMPOSE_BY_SECRETS), and a flag would put the
   shooter's sim, its tape menu and its voice probe inside the typing cabinet's package for nothing. `server.ts`
   is unchanged in behavior and Ghost's `--mcp` still lists its six.
2. **A second contract file, not a keyed object.** `tools.vibe.json` beside `tools.json`, loaded by the same
   parameterized loader, mirrored into `catalog/tools.vibe.json`. The registry's `tools.json` is a flat array
   per server, and two cabinets are two servers, so "its own cabinet key" is satisfied by a sibling file.
   `catalog/server.yaml` and the Docker image are the shooter's and were **not** touched: the image still
   carries Ghost's six tools only, and a Vibe image is a later pass.
3. **The four tools are `view`, `product`, `ask`, `react`**, in that order, all fact-blind, all answered in
   words, and no output from any of them ever carries a digit or names a model.
4. **The headless round is endless, seeded, and plays under a typist bot**, restarting on the next seed when
   the bar empties. The integration stack is seasoned from tapes on disk through `tape-core` only (G30);
   `CABINET_TAPES` names the directory and a missing one is said once on stderr and never a crash.
5. **The Vibe launcher's `--mcp` is real.** `MCP_LINE` and `MCP_EXIT` are gone; `runMcp` spawns the packed
   `cabinet-stdio.js` and passes `CABINET_TAPES` for the bundled tapes, identical in shape to Ghost's.
6. **The pack lays a stdio bundle down for both cabinets**, from a per-cabinet source, and `layoutOf` requires
   it for both — so a Vibe dist without it halts at `prepack`, before the irreversible step.
7. **`release.yml` smokes both tool lists** and the Vibe tarball must now carry `cabinet-stdio.js`.
8. **`pnpm sit --cabinet vibe-typer --seat mcp`** drives the contract in-process; `--seat pull` is the default
   and is unchanged.
9. **`VIBE_SERVER_VERSION` is declared, not imported.** The brief asked `server-vibe.ts` to import
   `SERVER_VERSION` from `server.ts`. Measured, both ways, on the same tree: the import costs **135,401 B** in
   the Vibe stdio bundle (1,882,035 B declaring it against 2,017,436 B importing it, before the prompt edits
   below moved both by a few hundred bytes), because the bottom of `server.ts` is a top-level side effect a
   bundler must keep, and keeping
   it drags the shooter's whole graph into a package named for the other cabinet. The release gate greps that
   constant out of that file and it may not move, so the typing cabinet declares its own and a test asserts it
   equals the one the gate's own regex finds in `server.ts` **and** the package's version — which is a stronger
   andon than the import would have been, because it also catches a manifest drift.
10. **The word maps moved to `vibe-words.ts`.** `bandWord`, `STACK_WORDS`, `LANGUAGE_WORDS` and `sayablePairs`
    were in `endless.ts`, which imports the Anthropic SDK and the shooter's personas for the pull path's tiers.
    Importing them from the push path pulled all of that in: the Vibe stdio bundle measured 2,607,077 B before
    the move and 1,882,035 B after, a saving of **725,042 B**. `endless.ts` re-exports them, so nothing that
    reads them from there had to change. (The shipped bundle is 1,883,774 B; the prompt edits of decision 26 and the review items
    account for the difference.)
11. **The `notes` field is one string, split on newlines, and is NOT trimmed to three.** The contract admits
    bounded strings and closed enums and nothing else, which is why notes cannot be an array. Splitting is not
    fixing — dropping a fourth note would be. The code gate refuses more than three and names the reason, which
    is what every other bound on this path does.
12. **A refusal answers the reason word and never the detail.** `gateCode` returns a detail beside the reason
    and the pull path's `sit` prints it, but two of its forms carry a digit (`too-wide` and `too-many-lines`
    carry a count) and one lifts a word out of the refused text (`spelling: <word>`). No tool output may carry
    either (G12, G17, the no-digit rule), so the tools say `the gate refused it (too-wide)` and stop. The
    detail is still printed by `sit`, which is not the field.
13. **A spelling fault is answered as `a British spelling`.** Same reason: `lineFault` and `britishHit` return
    a rule and a word respectively, and the word is part of the line.
14. **`full` is the buffer being as long as the next level, and a refusal costs no slot.** The pull path counts
    slots it has given up on, because the shell decides when to stop asking. Here the client decides, so there
    is no retry budget to keep: whatever is not queued when the level turns is drawn from the corpus exactly as
    it always was.
15. **`VIBE_NAMES` refuses the four lever names in a reaction, and the cost was measured first.** `view`,
    `product`, `ask` and `react` are ordinary English in a way `sfx` and `tapes` are not. Of the **1,621**
    authored reaction and review lines the user can say, **none** carries any of the four, so the rule costs the
    authored pool nothing and closes the same hole on the client's side. It is scoped to the reaction, which is
    the only text a client proposes as a line.
16. **`feedProduct` is its own lever, and `planLevel`'s override no longer waits on a fed request.**
    `feedRequests` carried a product beside its snippets, and a `product` tool call with no request behind it
    would have done nothing at all. The override is endless-only as before; the listed levels' products are
    authored and are the band's ground.
17. **A product is dropped once its level has been planned, always.** It used to be dropped only when snippets
    were taken with it. With a product that can arrive alone, holding it any longer would put one client's name
    on every level after it.
18. **The reaction is one slot on the run's context, not a queue and not a field on `RunState`.** One slot,
    because a client that is a beat ahead has exactly one line in hand; on the context, so a run that is never
    fed one is byte-identical in `JSON.stringify` and nothing a player could save carries a line that has not
    been said.
19. **The reaction takes the review at the deploy.** The brief's rule, and it is the right one: the line a
    client wrote after reading the view is about the thing that shipped, and at the last request the thing that
    shipped is the level.
20. **`vibeHostFor` reads a `VibeLive`, not a bare state.** The server starts the next run underneath a client
    that never disconnects, and the seed moves with it; capturing either would have made the view describe a
    run that had ended.
21. **The view shows the next level's product, not the current one.** The pull path sends the level in hand's
    product, which is the wrong one for a request being written for the level after it — `{product}` in the ask
    is filled at plan time with the **next** level's name. `endlessPeek` already knows it, and a client that
    named one with `product` sees its own name back.
22. **The view shows a client its own queued asks first, then the chat's.** The pull path concatenates and
    takes the last three, which silently drops the queued asks as soon as three lines have been said — the
    opposite of what slice 3 decision 19 intended. `recentAsks` takes the last three queued and tops up from
    the chat. The pull path's ordering is a bug worth a later fix; the shell is untouched by this sub-slice and
    it was left alone.
23. **The language word in the view is lower case.** `C sharp` and `SQL` are the only two that would otherwise
    put three capitals on a cabinet's own words, and nothing here yells (G25).
24. **`chatTools` gained an optional `timeoutMs`.** Its budgets are three and eight seconds, which is right for
    one verb and far too short for a whole snippet: measured, `kimi-k2.6:cloud` timed out on twelve turns out
    of twenty-three and never wrote a line. The option defaults to the old budgets, so the boss seat's path is
    unchanged; `sit --seat mcp` passes twenty seconds, the same room the pull path gives.
25. **A slot on the push path is up to four turns, and a turn after the first carries the slot's history.**
    Measured with one turn: both cloud tags spend it naming a product and never reach `ask` — twelve turns,
    twelve `product` calls, no requests at all. That is what a client with no memory of its own last call does; a
    real client sees what the cabinet answered and goes on. A refused request does not end the slot, which is
    the push path's answer to the pull path's one re-ask.
26. **The `ask` tool description carries the ask line's own rules.** Measured: with the rules only in the sit's
    system prompt, `gpt-oss:120b-cloud` wrote twenty `bad-ask` refusals in a row — "Create a bash script that
    announces a weekend dashboard when run on Saturday or Sunday", a developer's instruction, not a vibe
    coder's line. A real client reads the tool description and nothing else, so that is where the rules belong.
    With them there, the same model accepted three of four slots on the next run.
27. **`sit` builds ONE bundle for both packages, not two.** The sim keeps a run's buffer in a `WeakMap` beside
    the state, so two bundles are two `WeakMap`s: the cabinet's `feedRequests` looked up a state made by the
    other copy, found nothing, and dropped every request without a word. Measured before the fix: six accepted
    requests, none played, valuation identical to a run with no seat at all. One bundle shares the module.
    The pull path is unchanged by it — same functions, same numbers.
28. **The contract loader names the file a halt is about.** There are two contract files now and a halt that
    said `tools.json` about the other one would send a reader to the wrong place. The file name is set for the
    length of one synchronous load and put back after.
29. **`assertCatalogTools` is parameterized over the contract and the file**, and the Vibe server checks its own
    mirror at start exactly as the shooter's does, treating a missing file (the packed launcher) as not a
    mismatch.
30. **`zodShape` and the tapes directory are copied into `server-vibe.ts` rather than imported.** Seven lines
    and one line respectively, against the 135 kB of decision 9. Moving `zodShape` into `contract.ts` would put
    zod into `dist/index.js`, which both launchers ship for the endless route.

The four below came out of the review; the review subsection at the end records where each came from.

31. **An over-long field is refused, never clipped.** The cabinet used to slice every string field to the
    contract's `maxLength` and gate the short version. That is a repair, and this path never repairs: a client
    whose request was silently shortened and then accepted would have played code it did not write. `tooLong`
    reads the bound out of `vibeToolDef`, so the contract stays the one place it is written down, and the
    reason word is `too long`. The stdio server's zod shape already rejects such a field at the transport, so
    what this catches is an in-process caller — `pnpm sit`, a test, anything holding a cabinet directly.
32. **`ask` refuses a repeat, mechanically, before the code gate.** The view lists what has been asked for
    lately and a model may read it or not; measured, kimi wrote the same request into four slots running. A
    no-repeat rule belongs in the gate, where the shooter's `say` has always kept its own. The comparison is
    `lineKey` over the ask as written **and** with `{product}` filled in, because both land on the field as the
    same line. The window is the whole queue — exactly the level being written, and never longer than that
    level — plus `REACT_WINDOW`, so there is one no-repeat number in this cabinet and not two. The reason word
    is `repeat`, the `ask` description says so, and the band never reaches this code because the band feeds the
    sim directly and never calls a tool.
33. **`wholeEnv` treats a value that is not a whole number as absent, not as the default.** `CABINET_TIER=abc`
    and `CABINET_SEED=1.5` used to reach the fallback through `NaN`, which afterwards reads as though the
    operator had asked for the default. A leading minus is allowed, because the sim folds a seed through
    `>>> 0` and a negative one is an ordinary seed to it.
34. **The fact-blind test asserts the fixture carries `temporal.rug_pull` before it builds the twin.** The
    whole comparison is "flip this fact and nothing moves"; a tape that lost the atom would make every
    assertion in that describe pass by saying nothing at all.

### Irreversible actions

None in this sub-slice. Nothing is published, tagged, released or written outside the repo; `sit` writes only
into `film/`, which is ignored. The one irreversible act is pushing the branch.

| Action                                   | Undo                                              | State afterwards                       | Owner       |
| ---------------------------------------- | ------------------------------------------------- | -------------------------------------- | ----------- |
| `git push origin cabinet/vibe-typer-s4a` | `git push origin --delete cabinet/vibe-typer-s4a` | The branch is gone; `main` never moved | Coordinator |

The npm rows are unchanged and binding: `docs/npm-launcher.md`, plus the second package's rows in
`docs/vibe-typer.slice3.md`. Cutting a GitHub release still publishes **both** packages to npm and neither is
undoable after seventy-two hours.

### What this sub-slice did not do, on purpose

- **The `nag` tool.** The kickoff defers it until the three above are measured. The nag pools stay authored and
  `maybeNag` is untouched.
- **The shell.** `apps/cabinets` is not in this diff at all. The browser cabinet still reaches the seat through
  `/cabinet/endless` and knows nothing about the container tools.
- **A Vibe Docker image.** `catalog/server.yaml` and the `Dockerfile` are the shooter's and were not touched;
  the image still carries Ghost's six tools. A second server entry in the registry is a later pass.
- **The `/voice` proxy on the Vibe package.** That is sub-slice C.
- **The pull path's `recentAsks` ordering**, which decision 22 names as a bug and leaves in place, because the
  shell is not this sub-slice's to change.
- **Any public surface.** No README, no package page, no handbook, no landing page, no changelog, no version
  bump: all of those are the lead's, and the version stays `0.10.0`.
- **Art, beds, translations.** Sub-slices B and D.

### Review (Kimi K2.6, from a packet)

The diff went to Kimi K2.6 as a packet — the lock, the brief and the diff with levers' lines, receipts, images
and the lockfile omitted — and came back **halt** with four items. The coordinator accepted three, refused one
with a reason, and added one of its own. All five are applied or answered here and folded into the single
commit.

| #   | Item                                                                              | Disposition     | Where it landed                                                                      |
| --- | --------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------ |
| 1   | `caps`/`clip` truncates an over-long field and gates the short version — a repair | **accepted**    | Decision 31; `tooLong` in `vibe-cabinet.ts`; three tests, one per tool               |
| 2   | `checkVibeCatalogListing` should throw on a missing `catalog/tools.vibe.json`     | **refused**     | Below, with the reason                                                               |
| 3   | `whole()` coerces a bad env value to the fallback through `NaN`                   | **accepted**    | Decision 33; `wholeEnv` in `server-vibe.ts`; a parse test                            |
| 4   | The fact-blind twin could pass vacuously if the fixture lost `temporal.rug_pull`  | **accepted**    | Decision 34; one `expect` before the twins are built                                 |
| 5   | `ask` should refuse a repeat mechanically, not by asking the view to be read      | **coordinator** | Decision 32; `isRepeatAsk` in `vibe-host.ts`; three tests; the numbers were re-taken |

**Item 2, refused, and why.** `checkVibeCatalogListing` keeps treating a missing `catalog/tools.vibe.json` as
not-a-mismatch. The published npm package does not carry `catalog/` at all — neither package does, and the
shooter's `checkCatalogListing` has the same `catch` for the same reason — so throwing would break `--mcp` in
every published package while catching nothing a reader could act on. The mirror is a **repo-tree invariant**,
not a runtime one, and the contract test asserts it byte for byte against `VIBE_CONTRACT`, which is where a
drift is caught and where it can be fixed. The check that stays at start is the one that matters: if the file
**is** there and has drifted, the server halts before it lists.

**What item 5 cost and bought.** The sit was re-run end to end after the gate landed and the push-path table
and the ten samples above are that fresh run. Before the gate, kimi queued the same ask four times running; it
now refuses ten of kimi's forty asks as repeats and the eight it queues are eight different requests. The pull
path's table is as measured and was not re-run: nothing in this item touches it. The band with the seat off is
untouched — the band feeds the sim directly and never calls a tool — and both play-throughs still diff clean
against `main`.

## Sub-slice B, batch one — the piece tiles

**Branch:** `cabinet/vibe-typer-s4b1`, one commit, not merged, not pushed, nothing published.
`pnpm verify`, `pnpm build:play` and `pnpm build:launcher` (both packages) green; `npm pack --dry-run --json`
on both, measured against `main`.

**Spend:** eight generations. One contact sheet per stack — seven stacks, eight piece kinds each — plus one
re-roll of the python sheet. Seven accepted, one rejected. The Director opened the count for this batch rather
than capping it at twelve, because the last batch stopped at seven of twelve and the tiles are the single
largest piece of the look. A generation per tile would have been fifty-six, and would have held the palette
worse, because fifty-six separate draws have fifty-six chances to drift.

No other art was made. Avatars, milestone cards and the backdrop stay in later batches on their own approval.

### What was built

```
apps/cabinets/public/vibe/tiles/<stack>/<kind>.png   56 tiles, 128x128 RGBA, seven stacks x eight kinds.
                                                     880 KB in total; 4.6 KB to 27.6 KB each.
apps/cabinets/scripts/slice-tiles.mjs                the cut: PNG in and out over node:zlib, no dependency.
apps/cabinets/scripts/slice-tiles.d.mts              its types, so the test that pins the cell math is TS.
apps/cabinets/src/typer-tiles.ts                     PIECE_KINDS, the topic table, pieceKindOf.
apps/cabinets/src/vibe-typer.ts                      Piece gains a kind; the tiles Map, asked per stack;
                                                     drawPreview draws the tile over the block when one is
                                                     loaded and the block alone when one is not.
apps/cabinets/test/typer-tiles.test.ts               15 tests: the derivation over the shipped corpus, and
                                                     the slicer against a synthetic sheet.
apps/cabinets/test/typer-mount.test.ts               + one: a piece ships and the preview takes the block
                                                     path, because jsdom loads no image.
docs/art/receipts.json                               + vibe_typer_batch_2: route, the `licence` pointer,
                                                     acceptance, compensators, 64 rows (8 sheets, 56 tiles).
.gitignore                                           + docs/art/originals-vibe-2/
```

### The route

`bfl/flux-2-max` through the official Comfy Cloud MCP (`partner_generate`, the workflow-persist path,
`Flux2ImageNode`) — the same route, and under the same `licence` block, as batch one and as Ghost's brief-1
set. `2:1` was asked for and the node rendered 1024x768, exactly as it did in batch one; a 4x2 grid in a 4:3
frame gives tall cells, which costs nothing because every box is padded to a square before it is cut.

The reference chain is what held the set together. The first sheet (bash) took the **shipped terminal frame**
by public raw URL, so the tiles are cousins of the frames and the logo. Every later sheet took the **accepted
bash sheet** by `prompt_id`. It worked better than expected: the eight crop boxes land within two or three
pixels of each other across all seven sheets, so the model redrew the same eight objects in a new palette
rather than reinventing them.

`submit_batch` was tried first for the six followers and refused: its `medias[]` takes a public URL or an
uploaded name and not a Comfy output by `prompt_id`. Handing a partner node an auth-gated URL is against the
skill's rule and a fresh signed link expires in about five minutes, so the six went out as six calls instead
of one batch. Six submits cost six round trips and nothing else; the jobs still ran concurrently.

### The prompts, verbatim

Every sheet is the same prompt with one clause swapped. The **first** sheet opens:

> In exactly the same chunky flat 16-bit arcade illustration style, palette weight and pixel scale as the
> reference image:

and every later sheet opens:

> In exactly the same chunky flat 16-bit arcade illustration style, palette weight, pixel scale and four
> column by two row layout as the reference sheet, and with exactly the same eight icons drawn the same way,
> but in a different palette:

The body is identical in all eight:

> a contact sheet of eight separate small icons laid out in a strict grid of four columns and two rows on one
> unbroken flat near-black (#101018) background. There are no grid lines, no borders, no boxes, no panels and
> no frames of any kind — only the eight icons floating on the same near-black ground, each one small and
> centered in its own cell with wide empty near-black margins all around it, so that no icon touches another
> and no icon touches the edge of the picture. Each cell holds exactly one icon and nothing else. Reading the
> top row from left to right and then the bottom row from left to right, the eight icons are: first, a small
> blocky machine box with one square input slot cut into its left side and one square output slot cut into its
> right side; second, a small plain grid of blank empty cells, three columns by three rows; third, one rounded
> raised button cap seen straight on, a single smooth blank top with a thick side edge under it; fourth, a
> short segment of road with one right-angle bend in it, a plain thick band with a corner; fifth, a plain
> closed ring, a thick circular band with a round hole through the middle; sixth, a single page with one
> folded-over corner, completely blank; seventh, one rounded speech bubble with a small tail at its lower
> left, completely empty inside; eighth, four upright bars of four different heights standing side by side in
> a row on a flat base. Everything is drawn perfectly flat and face on, straight at the viewer, no
> perspective, no tilt, no angle. Every icon is drawn in

then the stack's four colors by name and hex, then the amber clause, then the closing clause:

> Hard edges, flat colors, no gradients, no reflections, no noise, no texture, no vignette. No letters, no
> numbers, no words, no arrows, no symbols, no user interface labels, no text of any kind anywhere in the
> image.

The color clauses, in full:

| Sheet          | The clause                                                                                                                                                 |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| bash           | moss green (#5b8c5a), pale green (#7aa878), deep green (#3e6b48) and light green (#9ec49a) only, on the flat near-black (#101018) ground                   |
| csharp         | slate blue (#6a8aaa), pale sky blue (#8fb0cc), deep slate blue (#47637f) and light sky blue (#a9c6dd) only, on the flat near-black (#101018) ground        |
| java           | bronze (#a08040), pale tan (#c2a063), deep brown (#7a5f2c) and light sand (#d8bd8a) only, on the flat near-black (#101018) ground                          |
| javascript     | warm amber (#e8a04a), pale apricot (#f0bd7d), deep ochre (#b87a2c) and light cream (#f6d6ac) only, on the flat near-black (#101018) ground                 |
| python         | steel blue (#5a7fa8), pale blue (#7fa3c6), deep navy blue (#3f5c7d) and light powder blue (#a8c4de) only, on the flat near-black (#101018) ground          |
| python re-roll | medium steel blue (#5a7fa8), pale blue (#7fa3c6), muted slate blue (#3f5c7d) and light powder blue (#a8c4de) only, on the flat near-black (#101018) ground |
| sql            | muted violet (#7a6aa0), pale lilac (#9a8cc0), deep plum (#584a78) and light lavender (#bdb2d8) only, on the flat near-black (#101018) ground               |
| integration    | dark teal (#2a5a5a), muted teal (#468080), deep teal (#1c4040) and light teal (#6fa5a5) only, on the flat near-black (#101018) ground                      |

Every sheet but javascript then carries `, with one small warm amber (#e8a04a) accent on one icon.` — javascript
is the amber stack, so a separate amber accent would have had nothing to stand against, and that clause is
replaced by a full stop. The python re-roll adds one sentence before the closing clause:

> Keep the icons in the middle of that range and clearly lighter than the ground: the body of every icon is a
> medium blue at the weight of the reference sheet's greens, never a dark navy and never nearly black, and the
> darkest blue is used only for thin edges.

### Per sheet

| Sheet          | Seed | Verdict      | Glyph score | What it is, and why                                                                                                                                                                                |
| -------------- | ---- | ------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| bash           | 7401 | accepted     | 0.0000083   | The first sheet, and the reference for the other six. A clean 4x2 on the first look, all eight objects in the greens, one amber accent on the machine, nothing touching an edge.                   |
| csharp         | 7402 | accepted     | 0.000022    | The same eight shapes in slate blue, within two pixels of the bash layout.                                                                                                                         |
| java           | 7403 | accepted     | 0.000013    | The same eight in bronze and sand. The button reads as a dish rather than a cap — the one place the palette pushed the form. Kept: it is still a raised round thing and reads apart from the ring. |
| javascript     | 7404 | accepted     | 0.0000070   | The amber stack, so no separate accent. The road lost its lane dashes, a small miss against the bash sheet and no loss at 128 px.                                                                  |
| python         | 7405 | **rejected** | 0.000012    | A miss on palette, not on layout. The eight shapes are right and glyph-free, but the model read "deep navy blue" as the whole picture: every icon body came back nearly as dark as the ground.     |
| sql            | 7406 | accepted     | 0.0000095   | The same eight in violet and lilac, road dashes intact.                                                                                                                                            |
| integration    | 7407 | accepted     | 0.0000062   | The same eight in teal, the darkest palette in the set. The ring and the cap sit closer to the ground than elsewhere; they still read, and the plate the slicer keeps is what carries them.        |
| python re-roll | 7408 | accepted     | 0.000013    | It corrected, and overcorrected: the bodies are paler than the steel blue the brief names, closer to ice. Kept, because contrast against a near-black screen is what a small block needs.          |

The brief's exact mid-tone blue was not hit on either python generation. That is this batch's one unmet color
note, and it is a miss, not a style choice: two generations were spent on it and the better of the two was
installed.

### Per tile

All 56 passed `ai-eyes image_contains` on "text, letters, numbers or written words" at threshold 0.02, on the
first look, with no re-slice and no re-roll for a glyph. The scores:

| Kind     | bash        | csharp      | java        | javascript  | python      | sql         | integration |
| -------- | ----------- | ----------- | ----------- | ----------- | ----------- | ----------- | ----------- |
| function | 0.000013401 | 0.000014930 | 0.000020777 | 0.000007396 | 0.000011309 | 0.000011401 | 0.000007033 |
| table    | 0.000028037 | 0.000021158 | 0.000019844 | 0.000046922 | 0.000031671 | 0.000014146 | 0.000028940 |
| button   | 0.000003272 | 0.000007260 | 0.000006440 | 0.000004440 | 0.000003425 | 0.000001908 | 0.000002572 |
| route    | 0.000010572 | 0.000023470 | 0.000018212 | 0.000100000 | 0.000027782 | 0.000007519 | 0.000008960 |
| loop     | 0.0002      | 0.0003      | 0.0001      | 0.0001      | 0.0006      | 0.0001      | 0.0001      |
| file     | **0.0024**  | 0.0006      | 0.0002      | 0.0015      | 0.0005      | 0.0006      | 0.0012      |
| message  | 0.0017      | 0.0008      | 0.0012      | 0.0009      | 0.0006      | 0.0003      | 0.0006      |
| chart    | 0.0002      | 0.0004      | 0.0005      | 0.0004      | 0.0001      | 0.0003      | 0.0001      |

The highest score in the batch is bash's `file` at 0.0024, eight times under the threshold. It is not a glyph:
a blank page is page-shaped, and page-shaped is most of what that query measures. Looked at at full size, the
page carries nothing at all. The same effect lifts every `file` and `message` tile, and every one is still
well under.

And the sizes, in KB — every tile is under the 40 KB the brief sets:

| Kind     | bash | csharp | java | javascript | python | sql  | integration |
| -------- | ---- | ------ | ---- | ---------- | ------ | ---- | ----------- |
| function | 21.7 | 11.7   | 12.4 | 23.2       | 12.1   | 17.6 | 16.8        |
| table    | 24.8 | 13.1   | 15.3 | 21.8       | 15.0   | 17.6 | 15.8        |
| button   | 26.2 | 16.9   | 18.6 | 27.6       | 17.5   | 22.0 | 21.7        |
| route    | 19.1 | 9.3    | 10.9 | 18.1       | 10.1   | 15.6 | 17.4        |
| loop     | 24.9 | 16.8   | 17.9 | 27.5       | 17.6   | 21.0 | 19.2        |
| file     | 15.8 | 4.6    | 5.1  | 12.8       | 5.0    | 11.7 | 10.5        |
| message  | 20.1 | 8.6    | 9.0  | 17.4       | 9.0    | 14.2 | 14.3        |
| chart    | 17.2 | 8.1    | 8.7  | 18.8       | 7.9    | 13.6 | 12.3        |

Every tile's source cell and crop box is a row in `docs/art/receipts.json → vibe_typer_batch_2.images`, with
its job id, its seed, the prompt that made its sheet, its glyph score and one line on what it is.

### The slice

`apps/cabinets/scripts/slice-tiles.mjs` is committed and takes a sheet and a stack name. It has no dependency:
neither `sharp` nor `pngjs` is in the lockfile, no published package may gain a runtime dependency, and a
build-side devDependency would still have to be justified for something `node:zlib` already does. So the
script decodes and encodes 8-bit PNG itself — inflate, unfilter, refilter, deflate — in about 120 lines.

The cut does **not** assume a grid. The model does not lay its icons on even centers, and a fixed cell
rectangle clips them. Instead the ink is projected onto the two axes: rows first, giving two bands; then
columns inside each band, giving four runs; then each box is tightened to its own icon's vertical extent. A
projection does not care whether an icon is one piece or several, so a chart's bars and a table's nine cells
each come out as one box. Then each box is padded to a square about its own center with an eight per cent
margin, clamped inside the picture, and area-averaged down to 128x128.

It **throws** rather than guesses when a sheet is not a clean four by two — `expected 2 rows of icons, found 1`
— so a sheet that would have to be interpreted is a re-roll, not a crop. That is this batch's andon, and no
sheet tripped it.

The ground is keyed **down to a translucent plate**, not away to nothing. A tile is drawn over a packed block
in one of the stack's four colors, and two of the four are lighter than the icon's own fill: on a fully
transparent ground the file and the bubble vanished on those two. Half a plate (alpha 128, ramping to 255
across the icon's edge) keeps the block's hue readable through it and gives every icon the same dark surface
whichever color it landed on. This was tried both ways and looked at before it was chosen.

### The asset layer, and the fallback rule

`drawPreview` draws the flat block first, exactly as before — same rect, same palette entry, same 0.9 alpha,
same pop scale — and then, **when a tile for `(stack, kind)` is loaded**, draws that tile as the largest square
the block holds, centered. A wide block shows its own color either side of the picture; a block too small to
hold anything legible simply shows a very small picture on a patch of color. `packPieces` and `frameBox` are
untouched, so the packing is identical either way: the art changed what is inside the blocks, never where they
land.

The tiles load as plain `Image` elements off `import.meta.env.BASE_URL + 'vibe/tiles/<stack>/<kind>.png'`;
`load` puts one in a Map keyed `<stack>/<kind>`, `error` takes it out, and nothing ever waits on a load. That
is the frames' rule, and a Pages build without `vibe/tiles/` still plays.

They are asked for **per stack, the first time a level of that stack draws**, not all 56 at the mount. A story
level is one stack, so a player who opens "a website for my cat" fetches eight files and not fifty-six; in
endless it costs one burst of eight per stack change. Measured in the browser against the built bundle: opening
the bash level produced exactly eight requests under `/vibe/tiles/`, all `bash/`.

jsdom hands an `Image` no file, so the Map stays empty there and the mount test takes the block path. A test
asserts that directly: it plays a full request, checks the valuation moved, and requires `fillRect` on the
canvas and no `drawImage` at all.

### What a piece is a picture of

`BuiltPiece` in the sim is still `{ id, size }`. Sub-slice A had just proved both play-throughs byte-identical
and a field added to the sim would have moved them, so the kind is derived in the shell instead, at the one
moment the shipped snippet is still in reach: the `piece` event is pushed by `ship`, the step returns before
`advance` touches the request index or the level, and the shell drains once per step. `pieceKindOf` is a pure
function of the snippet's id and topics.

Two steps, first match wins:

| Step | Rule                                                                             | Covers                                      |
| ---- | -------------------------------------------------------------------------------- | ------------------------------------------- |
| 1    | The snippet's topics, in the order it lists them, against a curated table of 426 | 239 of the 249 corpus snippets              |
| 2    | `hashString(snippet.id) % 8`                                                     | the remaining 10, and the whole wires stack |

The table maps 423 of the 500 distinct topics the corpus and the tapes carry. What comes out over the shipped
corpus:

| Kind     | Snippets | Some of the topics that name it                                    |
| -------- | -------- | ------------------------------------------------------------------ |
| table    | 75       | `cte`, `join`, `group-by`, `arrays`, `hashmap`, `records`, `cache` |
| loop     | 51       | `for-loop`, `while-loop`, `iterator`, `streams`, `async-await`     |
| function | 41       | `functions`, `lambda`, `closures`, `generics`, `recursion`         |
| message  | 29       | `print`, `strings`, `formatting`, `try-catch`, `validation`        |
| file     | 17       | `file-io`, `parsing`, `regex`, `serialization`, `configuration`    |
| button   | 13       | `events`, `observer-pattern`, `state-machine`, `getters`           |
| route    | 12       | `routing`, `http`, `middleware`, `graph`, `dependency-injection`   |
| chart    | 11       | `statistics`, `aggregate`, `rank`, `arithmetic`, `report`          |

The shape is lopsided and that is the corpus, not the table: a typing corpus for six languages really is mostly
collections and loops. All eight kinds appear, which a test asserts.

`integration` is deliberately **not** in the table. Every snippet in the wires stack carries that topic, so
mapping it would have drawn one picture for the whole stack; the ids (`int-<server>-<tool>-<band>`) hash apart
and give it the same variety the others get. A test asserts both halves of that.

The table is read through a `Map`, not indexed as an object. The corpus genuinely carries topics called
`constructor` and `toString`, and a plain-object lookup answers those two out of `Object.prototype` — every
snippet whose topics missed the table would have come back with a function where a kind should be. A test
checks `valueOf`, `hasOwnProperty`, `__proto__` and `isPrototypeOf` all miss and still resolve to a real kind.

### The tarballs

Measured with `npm pack --dry-run --json` on `main` and on this branch, after `pnpm build:launcher` each time.

| Package                          | Tarball, main | Tarball, here | Δ        | Entries  |
| -------------------------------- | ------------- | ------------- | -------- | -------- |
| `@mcptoolshop/vibe-typer`        | 1,562,919 B   | 2,465,700 B   | +902,781 | 73 → 129 |
| `@mcptoolshop/ghost-on-the-menu` | 6,168,862 B   | 6,171,917 B   | +3,055   | 63 → 63  |

The Vibe package gains 56 entries — `dist/play/vibe/tiles/<stack>/<kind>.png` — and 881 KB of them. Ghost gains
**no entries at all**: the `vite` public split put nothing under `dist/play/vibe/` in the shooter's bundle, and
`checkDist`'s stray check passed, which was confirmed by reading both file lists and not by trusting the gate.
Ghost's 3 KB is the shared bundle carrying the derivation module, which the `ghost` build does not tree-shake
out; that is pre-existing behavior for this file and is left alone here.

### In the shell

Both story levels below were played end to end against the **built** Pages bundle in a browser, with synthetic
`KeyboardEvent('keydown')` typing, and the preview canvas read back afterwards. Saved to `film/` (ignored):

- `film/tiles-bash.png` — "a website for my cat", four pieces shipped and the deploy ribbon down: two bubbles,
  a ring and a folded page, each a square on its block, the greens showing either side.
- `film/tiles-sql.png` — "a ledger of every sandwich i have eaten", two grids at very different sizes in the
  ledger frame, which is the topic mapping visible end to end: a `cte` snippet drew a table.

### Decisions

35. **One contact sheet a stack, sliced here, instead of a generation a tile.** Fifty-six generations would
    have been fifty-six chances for the palette and the pixel scale to drift, and the set has to sit on one
    palette to be a set. One sheet holds eight icons in one draw under one prompt; the cutting is geometry,
    costs nothing, and is deterministic and tested. The evidence that it worked is in the crop boxes: across
    seven sheets they land within two or three pixels of each other.
36. **The slicer finds the cells; it does not assume them.** The model does not center its icons on an even
    grid. A fixed cell rectangle would have clipped the wide ones and a re-roll would have been the only
    remedy. A projection finds whatever the model drew, and throws when what it drew is not a clean 4x2.
37. **The slicer has no dependency, and writes its own PNG.** `sharp` and `pngjs` are not in the lockfile, no
    published package may gain a runtime dependency, and a devDependency at the root would still need a reason
    for something `node:zlib` already does. Decode, unfilter, refilter, encode is about 120 lines and one of
    the tests round-trips it.
38. **The ground is keyed to a translucent plate, not to nothing.** Two of every stack's four block colors are
    lighter than the icons' own fill, and an icon on a clear ground disappears on those two. A half plate keeps
    the block's hue visible through it and gives every icon the same surface. Both were rendered and looked at
    before this was chosen.
39. **The block is still drawn, and the tile sits on it as a centered square.** The packed area has to keep
    reading as one filled surface — that is what the preview is for — and a square tile stretched into a wide
    rect would have been the only other way to fill it, at the cost of the drawing. So the block fills the rect
    and the picture sits in the middle of it.
40. **The kind is derived in the shell, not added to the sim.** `BuiltPiece` stays `{ id, size }`. Sub-slice A
    had just proved both play-throughs byte-identical; a field in the sim would have moved them for a picture
    the sim never draws.
41. **A curated topic table first, a hash of the id second.** 500 distinct topics over 249 snippets is a second
    corpus to maintain if every one of them must have an opinion. 426 entries carry 96 per cent of the corpus,
    and the hash covers the tail deterministically.
42. **`integration` is not in the table.** It is on every snippet in the wires stack, so it would have drawn
    one tile for that whole stack. The ids hash apart instead.
43. **The table is a `Map`.** `constructor` and `toString` are real topics in this corpus and a plain object
    answers them from its prototype. This was found by the typechecker refusing the literal and is a real bug
    that would have shipped silently.
44. **Tiles load per stack, at the first frame of a level in that stack.** Fifty-six images at the mount would
    have fetched six stacks a story level never visits. Eight per stack, once, is the same rule the frames
    follow with a smaller set.
45. **The python sheet was re-rolled, and the re-roll is a miss in the other direction.** The first came back
    nearly black, which is useless at the size a block gives. The re-roll came back paler than the steel blue
    the brief names. The paler one ships, because contrast against a near-black screen is what the tile needs;
    the brief's mid-tone was not hit either time and that is stated in the receipt as a miss.
46. **`submit_batch` was not used for the followers.** Its `medias[]` takes a public URL or an uploaded name,
    not a Comfy output by `prompt_id`. Handing a partner node an auth-gated URL is against the skill's rule and
    a signed link expires in minutes, so six calls went out instead of one batch. This is recorded so the next
    art batch does not rediscover it.

### Standards

**NAMED_COMPENSATORS (3).** Generation is an irreversible spend, so the compensators are named in
`docs/art/receipts.json → vibe_typer_batch_2.compensators` with an owner each: nothing enters the repo until it
is accepted, so the rejected python sheet is a receipt row and a Comfy library entry and nothing else (its file
is under the git-ignored originals directory and it is in neither `apps/` nor `packages/`);
`git rm -r apps/cabinets/public/vibe/tiles` returns the preview to flat blocks with no other change, because
the block is still drawn first and the tile is only drawn when one is loaded; and the branch is deletable until
it is merged. Every generation, accepted or rejected, is a row with its job id, seed and prompt, so the spend
is auditable at eight. No skip.

**PIN_PER_STEP (3).** Every row carries the model slug as the tool accepted it, the seed, the full prompt and
the reference it chained from, and every tile row carries the sheet it came from, its cell and its crop box.
The cut is a committed script with no dependency and no randomness, so the same sheet gives the same 56 tiles
on any machine; a test pins its cell math against a synthetic sheet. The kind derivation is a pure function of
a snippet's id and topics with no clock and no seed in it, and a test asserts it answers the same way twice.

**ANDON_AUTHORITY (3).** Three halts. `ai-eyes image_contains` at 0.02 on every sheet and every tile, before
anything is installed. `findCells` throws rather than guessing when a sheet is not a clean 4x2, so an
uninterpretable sheet is a re-roll and never a crop — a test proves the throw. And `pnpm verify` plus
`checkDist`'s stray check hold the packaging: the Ghost tarball was read entry by entry, not trusted.

**EXTERNAL_VERIFIER (3).** The glyph check is SigLIP2 through `ai-eyes`, a different model family from the BFL
model that drew the images, and it never sees the prompt. The slicer's test feeds a synthetic sheet whose
answer is known by construction rather than by looking at a generated one. The shell evidence is the built
bundle played in a real browser, not the mount stub. The diff review is a different family, per the slice.
