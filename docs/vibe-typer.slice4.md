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
