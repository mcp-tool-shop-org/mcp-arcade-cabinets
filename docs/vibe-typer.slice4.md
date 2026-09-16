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

## Sub-slice B, batch two — the avatars

**Branch:** `cabinet/vibe-typer-s4b2`, one commit, not merged, not pushed, nothing published.
`pnpm verify`, `pnpm build:play` and `pnpm build:launcher` (both packages) green; `npm pack --dry-run --json`
on both, measured against `main`.

**Spend:** nine generations. Seven for the user's portrait and two for Sprocket's; two are installed. The
Director opened the count for this batch as for the last, because the two portraits are the faces of the game
and a re-roll that lands is cheaper than a face that does not.

It took seven because the user's portrait was read twice and changed twice. First the knocked-over plant was
withdrawn (decision 58). Then the character itself was set — the vibe coder is a man with an overgrown beard
and a mess of hair — which is a new subject rather than a correction, so it started again from a fresh draw
(decision 59). Four generations are the first character and three are the set one; the four are receipt rows
and nothing else.

No other art was made. The milestone cards and the backdrop stay in later batches on their own approval.

### What was built

```
apps/cabinets/public/vibe/avatars/user.png    the user, 128x128 RGBA opaque, 13,445 B.
apps/cabinets/public/vibe/avatars/agent.png   Sprocket, 128x128 RGBA opaque, 7,174 B.
apps/cabinets/scripts/cut-avatar.mjs          the cut: one picture in, one 128 px avatar out. No dependency;
                                              the PNG codec, the ink threshold, the margin and `squareOf`
                                              are imported from `slice-tiles.mjs`, not copied.
apps/cabinets/scripts/cut-avatar.d.mts        its types, so the test that pins the box math is TS.
apps/cabinets/src/vibe-typer.ts               the chat header is built from spans with two `img` elements
                                              in it, instead of one text node.
apps/cabinets/index.html                      `--vibe-avatar` on `.vibe`, `.vibe-avatar`, `.vibe-dot`.
apps/cabinets/test/avatar-cut.test.ts         9 tests: the box, the stray-speck floor, the square, the
                                              opaque 128, determinism, the round trip, both refusals, and
                                              the subject's containment on both axes.
apps/cabinets/test/typer-mount.test.ts        + 2: the header's two faces and their sources, and a failed
                                              load taking one face out and leaving the words alone.
docs/art/receipts.json                        + vibe_typer_batch_3: route, the `licence` pointer, acceptance,
                                              compensators, 7 rows (5 generations, 2 installed).
.gitignore                                    + docs/art/originals-vibe-3/
```

### The route and the chain

`bfl/flux-2-max` through the official Comfy Cloud MCP (`partner_generate`, the workflow-persist path,
`Flux2ImageNode`) — the same route, and under the same `licence` block, as the two batches before this one.
`1:1` was asked for on every call and the node rendered 1024x768 every time, exactly as `2:1` did in those
batches. It costs nothing here, because the cut squares the drawing about its own ink and every prompt asked
for the drawing to sit inside a square area in the middle of the picture for that reason.

`submit_batch` was not tried. Batch one established that its `medias[]` takes a public URL or an uploaded
name and not a Comfy output by `prompt_id`, and every generation in this batch chains from a `prompt_id`.

The chain, in order:

| Generation | Reference                          | Why                                                         |
| ---------- | ---------------------------------- | ----------------------------------------------------------- |
| user 7501  | the accepted bash piece-tile sheet | so the portraits sit on the tiles' palette weight and scale |
| user 7502  | the accepted bash piece-tile sheet | the same, after the first take's misses                     |
| user 7503  | user 7502                          | a two-item change list, not a fresh draw                    |
| agent 7504 | user 7503                          | so the two faces are cousins, not strangers                 |
| agent 7505 | agent 7504                         | a four-item change list                                     |
| user 7506  | user 7503                          | a two-item change list, after the Director's read           |
| user 7507  | the accepted Sprocket portrait     | the character was set, so palette and scale only            |
| user 7508  | user 7507                          | a four-item change list                                     |
| user 7509  | user 7508                          | a two-item change list                                      |

The change-list shape is what carried this batch. A fresh draw from the same brief re-rolls everything,
including what was already right; a reference plus a short list of what must change moved exactly the named
things and left the rest to the eye pixel for pixel. Every generation in this batch that landed came out of a
change list rather than out of a longer prompt — including the last one, which fixed two named things on a
picture drawn a minute earlier without disturbing the beard, the hair, the eyes or the framing.

The one thing a change list cannot do is change who the picture is of. When the character was set, the chain
started again from a fresh draw against the accepted Sprocket portrait, taken for palette weight and pixel
scale only. Asking the rejected picture to become a different person would have been a fresh draw wearing a
change list's clothes.

### The prompts, verbatim

All five open with the style clause the tiles used, name every color by name and hex, carry
"drawn perfectly flat and face on ... no perspective, no tilt, no angle", and close with the batch-one
closing clause: "Hard edges, flat colors, no gradients, no reflections, no noise, no texture, no vignette. No
letters, no numbers, no words, no arrows, no symbols, no user interface labels, no text of any kind anywhere
in the image." Every prompt is in `docs/art/receipts.json` in full, on its own row, with the job that ran it.

The two that produced the shipped images, in their own words. **The user, take three:**

> Exactly the same picture as the reference image — the same person, the same shaggy amber hair, the same
> fond open grin, the same deep navy round-necked shirt with the light cream collar band, the same pose, the
> same size and the same position on the same unbroken flat near-black (#101018) background, in exactly the
> same chunky flat 16-bit arcade illustration style, palette weight and pixel scale — with only two things
> changed. First, the mug with the small leafy plant in it is clearly knocked over to one side: the whole mug
> leans at an obvious angle, its base lifted off the surface on one side, plainly tilted and not standing
> upright, with a few loose leaves sticking out at odd angles. Second, the small open laptop in front of the
> person is deep navy (#1b2440) rather than grey, and its screen is still one completely flat plain near-black
> rectangle with nothing on it at all — no picture, no glow, no icons, no dots and no marks — and there is no
> badge, logo or mark anywhere on the laptop. Everything else is unchanged. There is no border, no outline, no
> frame, no box and no panel of any kind around the picture or around anything in it, and the whole drawing
> stays inside a square area in the exact middle of the picture with plain empty near-black to the left and to
> the right of it. The person is of no particular gender: no beard, no makeup and no jewelry. …

**Sprocket, take two:**

> Exactly the same character as the reference image — the same terminal window used as a head, the same
> narrow strip across its top, the same two eyes and one upward-curving smile on its face, the same single
> blank amber key cap below it, the same size and the same position, in exactly the same chunky flat 16-bit
> arcade illustration style, palette weight and pixel scale — with four things changed. First, the background
> is one unbroken perfectly flat near-black (#101018) field over the whole picture, corner to corner, exactly
> the same shade everywhere: no vignette, no darker edges, no lighter middle, no shading and nothing at all in
> the margins. Second, there is no glow, no halo, no bloom and no soft light of any kind around the window,
> around the key cap or around any line — every edge is a hard edge between two flat colors. Third, the
> window's corners are only slightly rounded, so it reads as a plain terminal window rather than a soft
> rounded square, and it is clearly wider than it is tall. Fourth, the two eyes are solid filled light cream
> (#f6d6ac) circles, completely filled in with no hole and no dark center. …

**The user, take four**, the one that ships, is a two-item list against take three:

> Exactly the same picture as the reference image — the same person, the same thick shaggy amber hair, the
> same wide happy eyes, the same face, the same deep navy (#1b2440) round-necked shirt with the light cream
> (#f6d6ac) collar band, the same pose, the same size and the same position, and the same small open laptop
> in deep navy (#1b2440) in front of them with its screen one completely flat plain near-black rectangle with
> nothing on it at all … with only two things changed. First, the plant is gone and nothing is knocked over,
> tipped, leaning or falling: beside the laptop there is either nothing at all or one single plain mug
> standing level and upright on its base, empty, with no plant in it, no leaves, no stems and nothing sticking
> out of it or lying around it. Second, the grin is closed-lipped: a wide, warm, fond smile with the lips
> together and no teeth showing at all, no open mouth and no gap. Everything else is unchanged. …

**The set character, take three**, the one that ships, is a two-item list against take two:

> Exactly the same picture as the reference image — the same man, the same huge overgrown shaggy beard
> spreading down over his chest, the same big unbrushed mess of hair sticking out in every direction, the same
> happy eyes and the same blush, the same pose, the same size and the same position … with only two things
> changed. First, his mouth is closed: one single thick curved band of a mouth turning clearly upward at both
> ends, with the lips pressed together, drawn as one solid unbroken shape and nothing else. There are no teeth,
> nothing white inside the mouth, no dark red opening, no gap and no hole — his mouth is shut and he is smiling
> with it shut. Second, the laptop in front of him is deep navy (#1b2440), the same navy as his shirt, rather
> than gray … Everything else is unchanged. …

Its fresh draw and its first change list are in the receipt in full, as every prompt in this batch is.

One slip worth recording rather than quietly fixing: the user's third prompt says "rather than grey", a
British spelling, in a repo whose standing rule is American English. The prompt is stored verbatim in the
receipt because it is the record of what was sent, so it is not edited; nothing that spelling touches is
player- or reader-facing, and the next art batch should watch for it.

**Gender: how it was held open, and then closed.** The brief asked for a user who was gender-neutral by
design, and the first four takes held that by naming the absence rather than a gender: "Draw one person of no
particular gender: no beard, no makeup, no jewelry, no long styled hair and no gendered clothing — just a
friendly face and a shirt." No pronoun, no noun for a person of either gender, and the two features a model
most often reads as gendered — facial hair on one side, makeup and long styled hair on the other — were ruled
out together, so neither absence was a signal on its own. It worked: what came back was a plain round-necked
sweater, a shoulder-length shaggy mess of hair and a face with no cue either way.

That requirement is withdrawn. The Director set the character, and the vibe coder is a man with an overgrown
beard and a mess of hair — the first thing the old prompt ruled out is now the first thing the new one asks
for. The technique is kept here because it is the answer to a question that will come back on another
character, not because it is still in force on this one. Decision 59.

### Per generation

| Generation | Seed | Verdict      | Glyph score | What it is, and why                                                                                                                                                                                                                                                                                            |
| ---------- | ---- | ------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| user       | 7501 | **rejected** | 0.0000037   | A warm, chaotic person at a laptop, glyph-free, and three misses. The picture carries a drawn frame — a lighter rounded outline around all four edges, which this prompt did not ban. No deep navy anywhere, and a mint accent rather than the pale sky blue named. The mug stands upright.                    |
| user       | 7502 | **rejected** | 0.0000087   | The frame is gone, the drawing sits where a square cut can hold it, the shirt is the deep navy with a cream collar. Two misses left: the mug still stands upright, and the laptop came back gray. Superseded by the third take rather than installed.                                                          |
| user       | 7503 | superseded   | 0.0000058   | Both named changes landed and nothing else moved: the mug leans at a clear angle with its base lifted, the laptop is deep navy, the screen still blank. Accepted on the day, then withdrawn on the Director's read — the tipped plant reads as strange rather than chaotic. Decision 58.                       |
| agent      | 7504 | **rejected** | 0.000030    | The character is right: a terminal window as a head, an empty title strip, two eyes, a smile, one blank amber key. The ground is not — a lighter gray-brown with a vignette at the edges and a soft glow on every cream line. An avatar is cut opaque onto a `#101018` pane, so that is a gray box.            |
| agent      | 7505 | accepted     | 0.000017    | Flat near-black corner to corner, squarer corners, an empty strip, a blank amber key. Two small misses stand: a faint halo still sits against the cream outline, and the eyes are a cream ring around a slightly deeper cream rather than one solid fill. Both are gone by 128 px.                             |
| user       | 7507 | **rejected** | 0.000015    | The right character, drawn too tidy. The frame is right — a man at a laptop, one upright mug, no plant — but the beard is short and trimmed rather than overgrown, the hair is combed, the mouth is a flat line, and the laptop is gray. Four named misses, so the next pass was a change list.                |
| user       | 7508 | **rejected** | 0.0000097   | Two of the four landed, and they are the two that matter: the beard is huge, untrimmed and shaggy down over his chest, and the hair is a big unbrushed pile in every direction. The face turned warm too. Two misses left: the mouth came back open with teeth, and the laptop is still gray.                  |
| user       | 7509 | accepted     | 0.000016    | Both named changes landed and nothing else moved: the mouth is one solid dark band turning up at both ends with the lips shut, and the laptop is the deep navy of his shirt. Two small things stand: the mug is a pale mint rather than the pale sky blue named, and the shadows under the eyes never arrived. |
| user       | 7506 | superseded   | 0.000016    | A clean fix on the first generation, nothing else moved. The plant is gone, one plain mug stands level and empty beside the laptop, and the smile is closed-lipped. Installed, then superseded when the Director set the character. Decision 59.                                                               |

No portrait was hit on a first generation, and every generation that landed came after a change list. That is
the batch's one real finding and it is in the decisions below.

### Per installed image

| File        | Size              | Ink box         | Square         | Glyph score | At 32 px                                                                                                                      |
| ----------- | ----------------- | --------------- | -------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `user.png`  | 128x128, 13,445 B | 317,77 455x556  | 222,33 645x645 | 0.000035    | the pile of hair and beard around a pale face on a navy torso reads as this person, not a generic one; eyes and mouth go soft |
| `agent.png` | 128x128, 7,174 B  | 274,126 474x526 | 206,84 610x610 | 0.000015    | plainly a dark screen with a face and one amber square under it; it survives the size better                                  |

Both are well under the 40 KB the brief sets, both are exactly 128x128, and every pixel is alpha 255 — read
off the decoded buffer rather than trusted to the encoder. Every glyph check in this batch, on the nine
1024x768 generations and on the two installed cuts, is at or below **0.000035**, five hundred times under the
0.02 threshold, on the first look, with no re-cut and no re-roll for a glyph.

That 0.000035 is the installed user avatar, which is the highest in the batch and about twice its 1024 px
original's. It is not a glyph: the cut puts the laptop and the mug side by side as two hard-edged rectangles,
and rectangle-shaped is part of what that query measures. Looked at at full size, there is nothing written on
it. It is the same effect batch one saw lift its `file` and `message` tiles.

"At 32 px" was checked and not assumed: each avatar was area-averaged down to 32 and blown back up with no
smoothing, and looked at.

### The cut

`apps/cabinets/scripts/cut-avatar.mjs` is committed and takes a picture and an output path. It has no
dependency, and it does not have its own PNG codec either: the decoder, the encoder, the ink threshold, the
eight per cent margin and `squareOf` are all imported from `slice-tiles.mjs`, so the two cuts in this repo
cannot drift apart. What is new is about forty lines.

The tiles had eight icons to find on a sheet, so the slicer projects the ink onto two axes and hunts for
bands. An avatar picture holds one drawing, so there is nothing to hunt for: the whole of the ink is the
subject. `inkBox` projects, takes the first and last row and column that carry ink, and hands that one box to
the same `squareOf` the tiles use. Rows and columns with fewer than two lit pixels do not count, which is
what stops a single stray speck in a corner from dragging the box out to the whole picture and turning the
avatar into a letterbox of the subject. A test asserts exactly that, with a speck planted in two corners.

It **throws** rather than guessing in two cases: when nothing on the picture clears the ink threshold, and
when the ink fills the frame so there is no subject to square. Either is a re-roll, not a crop. Both throws
have a test.

The one deliberate difference from the tile cut is alpha. A tile is drawn over a packed block in one of the
stack's four colors, so its ground is keyed down to a translucent plate. An avatar is drawn on the chat pane,
whose background is `#101018` — the same near-black the pictures are drawn on — so keying buys nothing and
costs bytes. The avatars stay fully opaque and their ground simply matches the pane. That is also why the
Sprocket generation with a gray-brown ground was rejected outright: on an opaque cut, a ground that is not
the pane's is a visible box around the face.

### The header, and the fallback rule

The chat header was one text node, `${product} · ${agentName}`. It is now five children: the user's face, a
span with the product, a span with `·`, the agent's face, a span with the agent's name. The words are byte
for byte what they were — a test asserts the whole string, not a substring.

The user's face comes before the product because the product is theirs and the header never names them; the
agent's sits against the agent's name. Both are plain `img` elements with `alt=""`, because they are
decoration and the two names beside them already carry the meaning for a screen reader. Both are
`decoding="async"` and both load off `import.meta.env.BASE_URL + 'vibe/avatars/<who>.png'`, so a Pages build
under `/<repo>/play/` and a package build with a relative base each ask for the right file.

Nothing waits on a load. On `error` the element removes itself, and what is left is exactly today's header:
the same string, in the same order, with the same spacing, and no empty element standing in for a picture
that never arrived. That is the frames' rule and the tiles' rule, and jsdom — which hands an `Image` no file
— is the case it is written for. Two tests cover it: one fails one face and requires the other to stay, the
other fails both and requires the header's children to be exactly three spans.

They are inline elements, not flex items, on purpose. A flex header would have made each text run its own
flex item, and the separator's two spaces would have collapsed; keeping them inline is what lets the test
assert the exact string. The one span that needs it, `.vibe-dot`, carries `white-space: pre` so `·` keeps
its spaces when the header wraps.

**The size.** `--vibe-avatar` is defined on `.vibe` as
`clamp(20px, calc(var(--vibe-font, 0.95rem) * 1.5), 32px)`, so it moves with the settings row's type: 21.6px
at `small`, 25.2px at `medium`, 30px at `large` (the default) and 32px at `huge`, where the cap bites. The
cap is what keeps the header in proportion at the top of the range rather than letting a 36px face crowd a
0.85rem line.

There is deliberately no `line-height` on the header. Pinning every line to the face's height was tried first
and measured: with the longest product in the corpus at `huge` type on a 1280-wide window it made the header
106px, because the two lines that carry no face were inflated to 32px as well. Letting each line size itself
gives 88px for the same case — the lines with a face are as tall as the face, and the wrap lines stay the
height they were. Both numbers were read off the live page.

**At 1280 and at 420.** At 1280 with the longest product ("a ledger of every sandwich i have eaten") at
`huge`, the header wraps to three lines and fits, with both faces in place; at the default type with a short
product it is one line. At 420 the panes stack to one column and the header is one line. Measured in the page
at 420: `document.documentElement.scrollWidth` equals its `clientWidth` both with the faces and with them
hidden, so they add no horizontal overflow. Nothing here animates, so reduced motion is unchanged; and the
editor's `.vibe-line { white-space: pre }` — slice 3's rule that a token never breaks and a long line scrolls
sideways — is untouched, which the diff shows and the 1280 frame shows working.

A per-line avatar mark beside each chat line was considered and **not** done. It is optional in the brief, it
would have put a picture inside the nag and creep styling that slice 2 tuned, and the header is where the two
names are. It stays available for a later pass.

### In the shell

Photographed in a real browser against the **built** Vibe package bundle
(`packages/launcher-vibe-typer/dist/play`), served on a local port because the Browser pane serves the main
checkout. Saved to `film/` (git-ignored):

- `film/avatars.png` — 1280x860, `huge` type, "a ledger of every sandwich i have eaten": both faces at 32px,
  the user's before the product, Sprocket's before its name, the header wrapping to three lines and fitting.
- `film/avatars-default.png` — 1280x860, the default type and a short product: one line, both faces at 30px.
- `film/avatars-narrow.png` — 420x900: the panes stacked, the header on one line, both faces in place.

Read back out of the page at the same time: both images report `naturalWidth` 128 and `clientWidth` 32 at
`huge`, both carry `alt=""`, and the header's text is `a ledger of every sandwich i have eaten · Sprocket`.
All three frames were retaken after the user's fourth take was installed, so what is in `film/` is the
shipping pair.

### The tarballs

Measured with `npm pack --dry-run --json` on `main` and on this branch, after `pnpm build:launcher` each time.

| Package                          | Tarball, main | Tarball, here | Δ       | Entries   |
| -------------------------------- | ------------- | ------------- | ------- | --------- |
| `@mcptoolshop/vibe-typer`        | 2,465,700 B   | 2,487,007 B   | +21,307 | 129 → 131 |
| `@mcptoolshop/ghost-on-the-menu` | 6,171,917 B   | 6,172,544 B   | +627    | 63 → 63   |

The Vibe package gains exactly two entries, `dist/play/vibe/avatars/{user,agent}.png`, and 20,619 B of
picture. Ghost gains **no entries at all** — its file list was read and filtered for anything matching `vibe`,
which came back empty, rather than trusting `checkDist`'s stray check. Its 627 B is the shared
`apps/cabinets/index.html`, which is the source of both builds and now carries the avatar CSS; `grep` over
Ghost's built bundle finds no `vibe/avatars` at all, so the `VITE_CABINET` fold dropped the code as designed.

### Decisions

47. **A change list against a reference beats a longer prompt.** Neither portrait landed on a fresh draw, and
    both landed on the generation right after one. A fresh draw re-rolls everything, including what was
    already right; naming a reference and two or four specific changes moved exactly those and left the rest
    alone. This is recorded because it is cheap and repeatable: get the composition on a fresh draw, then fix
    the details by list.
48. **Every prompt bans the frame, by name.** The user's first take came back with a drawn border around all
    four edges. Batch one's sheet prompt had banned "borders, boxes, panels and frames" and this one dropped
    that clause as sheet-specific; it is not sheet-specific. It is in every prompt after 7501.
49. **The avatars are cut opaque, and the tiles stay keyed.** A tile is drawn over a colored block, so its
    ground has to key down to a plate. An avatar is drawn on a pane painted the same near-black the picture is
    drawn on, so keying buys nothing and costs bytes. The consequence is that the ground's exact shade becomes
    an acceptance criterion, and it is why 7504 was rejected on its ground alone.
50. **The cut imports the slicer instead of copying it.** The PNG codec, the ink threshold, the eight per cent
    margin and `squareOf` are one implementation used by both cuts. Forty new lines is the whole of
    `cut-avatar.mjs`; a second copy of a hand-written PNG encoder would have been a second thing to keep
    right.
51. **The cut finds the subject; it does not assume the frame.** The node renders 4:3 whatever aspect is asked
    for, and the model chooses where in that frame to draw. A fixed center crop would have worked on these two
    and failed on the next one. A projection finds whatever was drawn, and a two-pixel floor per row and
    column stops a stray speck from turning the crop into a letterbox.
52. **It throws on a picture with no subject.** Nothing above the ink threshold, or ink filling the frame, is
    a re-roll and never a crop. That is this batch's andon, and neither accepted picture came near it.
53. **The header keeps its exact string, so the faces are inline and not flex items.** A flex header would
    have collapsed the separator's spaces and made "the words are unchanged" a claim rather than an assertion.
    Inline elements with `vertical-align: middle` keep the text nodes exactly what they were, and the test
    asserts the whole string rather than a substring.
54. **`alt=""`, and the names carry the meaning.** The header already says the product and the agent's name.
    An alt text on either face would have read them out twice; the user is deliberately never named at all,
    and an alt text on their face would have been the one place the header named them.
55. **No `line-height` on the header.** Pinning every line to the face inflates the wrap lines of a long
    product name to 32px each. Measured on the live page at `huge` with the longest product: 106px pinned,
    88px unpinned. The faces still set the height of the lines they are in.
56. **`--vibe-avatar` is clamped at 32px.** It scales with the settings row's type, which is what keeps the
    header in proportion, but the header's own text is a fixed 0.85rem and a 36px face beside it reads as a
    mistake. 20px to 32px covers all four settings and the cap only bites at `huge`.
57. **No per-line avatar mark this batch.** It is optional in the brief and it would have put a picture inside
    the nag and creep styling that slice 2 tuned. The header is where the names are; the lines stay words.
58. **The knocked-over plant is withdrawn, and the user's portrait is the plain one.** "A mug or a plant
    knocked slightly askew" was the brief's own shorthand for a founder who is a little chaotic, and it was
    pursued through three generations and finally hit. Read back at the size the header shows it, the tipped
    plant does not read as chaos; it reads as something wrong with the picture, which is worse than not having
    it. So the detail is withdrawn rather than defended: the plant is gone, the desk carries one plain upright
    mug, and the chaos is carried by the hair, which is where it survives 32 px anyway. The grin went
    closed-lipped in the same pass, which also clears the band of teeth the third take carried. The lesson for
    the next art batch is that a detail worth three generations at 1024 px is worth checking at 32 px before
    the first one.
59. **The character is set: the vibe coder is a man with an overgrown beard and a mess of hair.** The brief
    had asked for a user who was gender-neutral by design, and four generations delivered that. Read on the
    screen, a deliberately unmarked person is a person the player cannot picture — the cabinet's premise is
    that someone specific is asking for these products, and specific is what the face has to carry. So the
    Director set it rather than leaving it open, and the batch started the portrait again. It started with a
    **fresh draw**, not a change list: the change-list method moves named details on a picture and cannot turn
    one person into another, and asking it to would have been a fresh draw with a change list's wording. The
    accepted Sprocket portrait was the reference, for palette weight and pixel scale only. The gender-neutral
    prompt technique is written up above rather than deleted, because the question comes back on the next
    character.

### Standards

**NAMED_COMPENSATORS (3).** Generation is an irreversible spend, so the compensators are named in
`docs/art/receipts.json → vibe_typer_batch_3.compensators` with an owner each: nothing enters the repo until
it is accepted, so the five outright rejections are receipt rows and Comfy library entries and nothing else,
and the two superseded user takes were each written in and taken back out of this same unmerged commit —
nothing that is not installed is in the tree, and no file of any of the seven is in `apps/` or `packages/`;
`git rm apps/cabinets/public/vibe/avatars/*.png` returns the header to exactly today's text with no other
change, because the header is built from its spans and each face removes itself on `error`; and the branch is
deletable until it is merged. Every generation — accepted, rejected or superseded — is a row with its job id,
seed, full prompt and reference, so the spend is auditable at nine. No skip.

**PIN_PER_STEP (3).** Every row carries the model slug as the tool accepted it, the seed, the full prompt and
the job it chained from, and both installed rows carry the ink box and the crop square they were cut at. The
cut is a committed script with no dependency and no randomness, so the same picture gives the same avatar on
any machine; a test runs it twice and compares the buffers, and another pins its box math against a synthetic
picture whose answer is known by construction.

**ANDON_AUTHORITY (3).** Three halts. `ai-eyes image_contains` at 0.02 on every generation and on both
installed cuts, before anything is installed. `inkBox` throws rather than guessing when a picture has no
subject or when its ink fills the frame, so an uninterpretable picture is a re-roll and never a crop — two
tests prove the throws. And the header's own fallback is a halt of the same kind at run time: a face that does
not load takes itself out rather than leaving a broken box, which two mount tests assert.

**EXTERNAL_VERIFIER (3).** The glyph check is SigLIP2 through `ai-eyes`, a different model family from the
BFL model that drew the images, and it never sees the prompt. The cut's test feeds a synthetic picture whose
box is known by construction rather than measured off a generated one. The shell evidence is the built Vibe
package bundle photographed in a real browser at two window sizes, with the DOM read back, not the mount stub.
The diff review is a different family, per the slice.

### Review (Kimi K2.6, from a packet)

The diff went to Kimi K2.6 as a packet — the lock, the brief and the diff with levers' lines, receipts, images
and the lockfile omitted — and came back **halt** with two items. The coordinator accepted both. Both are
applied here and folded into the single commit.

| #   | Item                                                                                            | Disposition  | Where it landed                                                      |
| --- | ----------------------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------- |
| 1   | "keeps the whole subject inside the avatar it cuts" asserts only vertical containment           | **accepted** | `apps/cabinets/test/avatar-cut.test.ts`; two `expect`s on the x axis |
| 2   | "writes a 128x128 avatar that is opaque all the way out to its ground" checks red and blue only | **accepted** | the same file; one `expect` on the green channel of the corner pixel |

**Item 1.** The containment test held the square to the subject's top and bottom and said nothing about its
left and right, so a cut that shaved a shoulder off one side would have passed it. The test now also requires
`square.x` to be strictly below `SUBJECT.x` and `square.x + square.w` to be strictly above
`SUBJECT.x + SUBJECT.w`. It matters more on this axis than on the other: the synthetic subject is taller than
it is wide, exactly as a portrait is, so the horizontal margin is the one the square adds and therefore the
one an off-by-one in `squareOf`'s clamp would eat first.

**Item 2.** The opacity test read the corner pixel's red and blue and skipped its green. `#101018` has a
distinct green (`0x10`), and a cut that wrote two channels correctly and dropped the third would have passed.
All three channels are now asserted. This is the one place the ground's exact shade is checked mechanically,
and the ground's exact shade is an acceptance criterion in this batch — it is why the first Sprocket
generation was rejected — so it should not have been checked at two thirds.

Both items are in the test file only. No source changed and no test was added — the nine that were there got
three more assertions — which is the right shape for this review: nothing it found was a bug in the cut, both
were places where a passing test was not proving what it claimed. `pnpm verify` was re-run after them:
`Test Files 56 passed (56)`, `Tests 721 passed (721)`, both play-throughs still byte-identical to `main`.

## Sub-slice C — the voice on the user's lines

Branch `cabinet/vibe-typer-s4c`. G15 in the typing cabinet's words: the user says their own asks, their scope
creeps, their check-ins, their reactions and their reviews out loud through the host-side worker; every take is
heard back and receipted by fx-dub before it plays; a take that misses its beat waits for the next ask. The
agent's lines are never spoken — the player types those, and the keystroke is the score's voice (G29). The
meeting is never spoken either. The Vibe launcher lights `/voice`, which it deliberately did not at `0.10.0`.

### What was built

| File                                              | What changed                                                                                 |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `packages/vibe-typer/patterns/cabinet.json`       | the `voice` block: the user's preset, rate and loudness, and the straggle budget             |
| `packages/vibe-typer/src/patterns.ts`             | `VoiceSet`, `loadVoice`, and the halt on every bound the worker itself enforces              |
| `packages/vibe-typer/patterns/voice/user.md`      | `## The voice`, naming the same preset, and the character in `## Who they are`               |
| `packages/vibe-typer/test/patterns.test.ts`       | the loader halts, and the sheet and the lever must name the same preset                      |
| `packages/cabinet-server/src/voice.ts`            | `SpeakJob`: the least a job needs to be spoken, so `speakLine` serves both cabinets          |
| `packages/cabinet-server/src/voice-vibe.ts`       | `vibeVoiceLine` (which lines) and `createVibeVoicer` (when a take may play) — new            |
| `packages/cabinet-server/test/voice-vibe.test.ts` | the line rule as a table, the timing rule on a fake worker and a hand-turned clock — new     |
| `packages/cabinet-server/src/{browser,index}.ts`  | both exported                                                                                |
| `apps/cabinets/src/typer-audio.ts`                | `setBedDuck`, and one `bedLevel()` so the cue duck and the take duck cannot fight            |
| `apps/cabinets/src/vibe-typer.ts`                 | the Voice checkbox, the probe, the pref, the drain, the speaker, the duck, `data-vibe-voice` |
| `apps/cabinets/test/typer-mount.test.ts`          | the shell's half: the box, the pref, the job, the words, the silence when it is off          |
| `apps/cabinets/test/typer-audio.test.ts`          | the take duck holds through the cue duck's timer and through a change of bed                 |
| `packages/launcher-vibe-typer/src/cli.ts`         | `voiceUrl` and `voiceToken` from the environment; `USAGE` names both                         |
| `packages/launcher-vibe-typer/test/*.ts`          | the worker routes pass and everything else 404s; `--help` names the two variables            |
| `packages/launcher/scripts/build.mjs`             | `data-vibe-voice` is a Vibe needle                                                           |
| `scripts/sit-vibe.mjs`                            | `--voice auto\|on\|off`, `--voice-url`, `--seat none`, and a wall-clock play under the voice |

`voice/worker.py` is unchanged. `packages/vibe-typer/src` is untouched except the loader; the sim did not move.

### The lever, and the voice

```json
"voice": { "user": { "preset": "am_echo", "rate": 1.0, "loudness": -4 }, "maxGap": 0.5 }
```

**The character is the Director's, set 2026-09-16 and recorded as decision 59 above:** the user is a man with
an overgrown beard and messy hair who has been up all night and does not mind. The avatar batch carries it in
the picture; this sub-slice carries it in the voice, and the sheet gained one plain sentence saying it at the
top of `## Who they are`, so the next authoring pass writes to the same person the art and the voice now show.
That sentence names him nothing, gives no age and carries no digit, because the lines must not carry those
either. The rest of the sheet is as it was authored — re-voicing the whole brief is the lead's, not a
builder's.

**`am_echo`, chosen by measurement.** The twenty lines of `patterns/voice/user.md` were spoken through every
American male preset in the worker's catalog except Ghost's `am_michael`, at rate 1.0, loudness −4 and a
half-second budget, and heard back:

| Preset      | Receipted | Mean  | What it lost                                       |
| ----------- | --------- | ----- | -------------------------------------------------- |
| `am_echo`   | 18 / 20   | 500ms | two number words written as numerals               |
| `am_fenrir` | 17 / 20   | 429ms | the two numerals, and `liftoff` heard as two words |
| `am_liam`   | 17 / 20   | 442ms | the same three                                     |
| `am_eric`   | 17 / 20   | 435ms | the two numerals, and `ducks` heard as `ducts`     |
| `am_adam`   | 17 / 20   | 453ms | the same three as `am_fenrir`                      |
| `am_puck`   | 16 / 20   | 874ms | those, and `duck` heard as `stuck`                 |

`am_echo` is the pick because the receipt is the gate: a voice the listener mishears is a voice that does not
play, and it was the only one of the six that lost nothing to a misheard word. It reads a lower-case line as a
person talking rather than as an announcement, which is the register of a founder at four in the morning, and
it is neither of the two men the shooter's bosses use.

**Rate 1.0 and loudness −4 are `// Director` numbers.** Ghost's cast sits at 0.9 and −4. The rate is faster
here because the user's line is five to ten words in the present tense and has to land inside the beat it was
said on, where a boss's line has a wave to sit under; the loudness is Ghost's, so the duck depth tuned for one
cabinet is right for the other and nothing yells (G25).

**`maxGap` stays at fx-dub's default half-second, and that is a measurement, not an inheritance.** Ghost's
straggle finding was that Kokoro holds longer than half a second between two sentences, and Ghost's fallback
lines have two. The user's lines cannot: `lineFault` already refuses more than one sentence. Across every take
in every run below — 111 of them — `no_internal_straggle` refused none. The budget is a lever, so the Director
can move it; nothing here asks for it to move.

### The line rule

One function, `vibeVoiceLine`, decided from the beat and the step's events and never from the words, because a
rule that read the text would change when the pools were re-authored. A table test covers every row.

| Who   | Beat      | Also in the step  | Spoken as  |
| ----- | --------- | ----------------- | ---------- |
| user  | `request` | —                 | the ask    |
| user  | `creep`   | —                 | the creep  |
| user  | `code`    | the check-in flag | the nag    |
| user  | `ship`    | —                 | a reaction |
| user  | `ship`    | the `ship` event  | the review |
| user  | `sync`    | anything          | not spoken |
| agent | any       | anything          | never      |

The review is told from the reaction by the `ship` event, which the sim pushes only on a level's last request —
so the class comes out of the step's own events, not out of an index the shell would have to keep. A check-in
is only a check-in on the code beat, which is the only beat the sim raises one on.

### The timing rule, and why `createVoicer` was not reused

The line goes to the worker the moment it lands; the chat shows it at once and nothing on the field waits. The
take plays the moment its receipt is back if the beat it belongs to is still in hand — the ask through the
`request` and `reply` beats, the creep through `creep` and the `code` beat that follows it, the check-in on its
code beat, a reaction or a review from the `ship` frame into the next request's reply. A take that missed its
beat waits for the **next request boundary** and plays there. A failed receipt is never played; mute silences
the take and not the receipt; the run ending drops whatever is in hand.

**Two takes may be in hand, and only for one pair.** The queue is a line of at most two, oldest first: the
reaction or the review of the request that just shipped, and then the ask of the request that follows it. That
pair is the reason the cap is not one, and the reason is in the cold numbers below — the sim says the reaction
on the `ship` frame and enters the next request one step later, so on a cold cache the ask lands about thirty
milliseconds after it, while the worker is still holding the reaction's take. With one slot the reaction was
replaced every single time and the user's one comedic line was only ever heard on a warm cache. So:

- the reaction plays as soon as its receipt is back — the next request's reply beat is still in hand for it,
  because the chat still shows it above the ask;
- the ask plays when its own receipt is back **and** the reaction's audio has finished, which the shell learns
  from the take element's `ended` and `pnpm sit` — which plays nothing — takes from the receipt's own measured
  length;
- the ask plays at once if the reaction's receipt failed, or if it was dropped: a slot with nothing to play
  leaves rather than blocking the one behind it.

Everything else replaces, as it did. A creep or a check-in arriving while two are in hand drops the older of
the two and never the one whose audio is in the air; a take that is playing is never cut off, and the line
behind it waits. The cap is two, so nothing stacks; the sim waits for none of it and the field never learns.

`createVoicer` gives none of that without the adapter becoming the rule, so `createVibeVoicer` is written beside
it and Ghost's is untouched. Four differences, each load-bearing:

1. **In hand is a beat, not a caption.** Ghost matches the caption's text against the job's, or allows a clear
   field inside a caption window. The typing cabinet has no caption and no window; faking one would hand the
   Vibe rule a time allowance that is not in it.
2. **The boundary is an edge, not a level.** Ghost's breather is a state the round is in or out of. `request`
   holds for exactly one step here, so a level test would play a held take on the same frame that held it —
   there is a test for that case, and it is the one a reused `createVoicer` would fail.
3. **Two takes may be in hand**, in order, for the reaction-then-ask pair. Ghost holds one and a newer boss line
   is the boss saying the newer thing; here the two lines are one person a step apart and both are the joke.
4. **A take runs to the end of its audio.** Ghost's play hook is fire and forget, and a newer take cuts the
   older one off at the element. Here the hook is handed a `done`, the queue moves when the audio is over, and
   two takes are never in the air at once.

What is shared is everything that talks to the worker: `speakLine`, `voiceHealth`, `VoiceReceipt`, the status
words. `speakLine` now takes `SpeakJob` — the words, the kind, the delivery and the budget — which `VoiceJob`
satisfies structurally, so one client serves both cabinets and neither imports the other's personas.

### Ducking

`typer-audio.ts` gained `setBedDuck(on)`, the small additive method Ghost's engine already has. It is the same
depth as the cue duck (`DUCK`), and the two can no longer fight: both now read one `bedLevel()`, so the cue
duck's timer running out under a playing take does not lift the bed, and changing the bed mid-take keeps the
take's duck at the new mode's level. The keystroke samples are never touched — the player is typing under the
voice and the keystroke is the score's voice (G29) — and `music: off` has no bed to duck, so the method does
nothing there. `soft` and `off` are unchanged in level: the bed is still not a clock.

### The chrome

A **Voice** checkbox in the controls row, built only under `LOCAL_SEATS` and off and disabled until the worker
answers `voiceHealth` through `/voice`, probed every five seconds so starting `pnpm voice` after the page opened
still lights it. The `voice` pref lives under `vibe.prefs` and turns the box on by itself the first time a
worker answers. The status is words beside it and nothing else: `voice ready`, `voice on`, `voice off`, `voice
speaking ahead`, `voice: receipt ok`, `voice: spoke on the beat`, `voice: held for the next ask`, `voice: spoke
at the next ask`, `voice: receipt failed, not played`, `voice: no worker (pnpm voice)`. Nothing on the field, in
the chat or on the standup names the engine, the preset or a count.

It is not the seat's checkbox and does not wait on endless: a story level has a user too.

**The run's opening ask is held for the box.** `createRun` says the first ask before any step runs, so it is in
the chat but in no step's events, and it is said before the worker has answered its first probe. It waits in the
mount for the box and goes as soon as the box is on, unless the reply beat is gone by then — the first thing the
user says is the one line a player is certain to be reading.

### The launcher

`packages/launcher-vibe-typer/src/cli.ts` now passes `voiceUrl: process.env.VOICE_URL ?? 'http://127.0.0.1:7788'`
and `voiceToken: process.env.VOICE_TOKEN ?? null`, exactly as Ghost's does, and `USAGE` names both in Ghost's
words. `allow.ts` is shared and did not change, so the dev server and the two launchers are in step by
construction. `serve.test.ts` in that package now asserts the four worker calls reach the upstream with the
bearer added server-side, and that `/voice/voices`, a traversal under `/voice/audio/`, a malformed take name and
a POST to `/health` all 404 before a socket is opened.

The pack's marker gate gained one Vibe needle, `data-vibe-voice`, for a reason the other needles have: this
package now stands a `/voice` proxy, and a shell built without the voice chrome would leave that proxy with no
caller and give the player a cabinet whose user never speaks, with nothing to show it. Measured on the Pages
build (`pnpm build:play`, no `VITE_LOCAL_SEATS`): neither `data-vibe-voice` nor `data-vibe-seat` survives, which
is the half of the test a jsdom mount cannot do.

### What was measured, live on this rig

The worker on CUDA (`kokoro-onnx` + `faster-whisper small.en`), `pnpm sit --cabinet vibe-typer --voice on
--levels 3`, a perfect typist, tier 0, seed 1, played in wall-clock time. Nothing is played in `sit`; the
receipt is the artifact.

The cold runs are on an empty cache directory — the worker restarted with `VOICE_CACHE` pointed at a folder
that did not exist, so not one line in them was a cache hit.

| Run                                             | Voiced | Receipt ok     | Failed | On the beat | At the next ask | Dropped | Replaced | Mean to receipt |
| ----------------------------------------------- | ------ | -------------- | ------ | ----------- | --------------- | ------- | -------- | --------------- |
| `--seat none`, cold cache                       | 34     | 25 (2 cached)  | 2      | 23          | 1               | 1       | 5        | 604 ms          |
| `--seat none`, warm cache                       | 34     | 31 (31 cached) | 2      | 27          | 1               | 3       | 0        | 7 ms            |
| `--seat mcp --model kimi-k2.6:cloud` (2 levels) | 23     | 20 (17 cached) | 1      | 18          | 0               | 2       | 1        | 161 ms          |

Per take, speaking took 0.24 to 1.6 s and hearing it back 0.08 to 0.42 s; a cached line answered in 3 to 14 ms.
The third row is the push path, with a model in the user's chair writing the asks: most of its lines are cache
hits and the ones the model wrote are not, which is why its mean sits between the cold and the warm runs.

**The finding the two-slot rule exists for: with one take in hand, the reaction and the review were only ever
heard on a warm cache.** The sim says the reaction on the `ship` frame and enters the next request one step
later, so on a cold cache the ask lands about thirty milliseconds after it while the worker is still holding
the reaction's take — and a single slot replaced it every time. Measured, before and after, same seed, same
tier, same typist, cold both times:

| Cold, `--seat none`                   | One take in hand | Two in hand, the reaction then its ask |
| ------------------------------------- | ---------------- | -------------------------------------- |
| Receipted takes that played           | 20 of 21         | 24 of 25                               |
| Reaction and review takes that played | **0 of 11**      | **6 of 11**                            |
| Replaced at the worker                | 10               | 5                                      |
| Mean to the receipt                   | 709 ms           | 604 ms                                 |

So the user's one comedic line is now audible on a first run, which is the whole of the change. The five that
are still replaced are the ones a third line landed on: a scope creep or a check-in arriving while the pair is
in hand takes the older of the two, which is the cap doing what a cap is for.

**Warm, the cap costs two takes, and that is the trade.** Before the amendment a newer take cut the older one
off at the element, so 30 of 31 played; now a take runs to the end of its audio and the one behind it waits,
and two of them find their beat gone by the time the queue reaches them — 28 of 31 play, one of those at the
next ask, and three are dropped. Nothing is ever heard over the top of anything else, which is what the cap
was for; the warm run simply hears two fewer lines than a run that talked over itself.

The authored pools are finite, so the cabinet also warms itself: after one run of a level, that level's user
answers in single-digit milliseconds. Nothing here was tuned to make the table look better.

**Zero `no_internal_straggle` refusals in 111 takes.** See the lever, above.

**The refused takes, read as findings.** Every one is the listener's spelling or hearing, none is the audio:

| Line                                                                      | Check                                | What was heard                          |
| ------------------------------------------------------------------------- | ------------------------------------ | --------------------------------------- |
| `add up the numbers from one to ten in a marketplace for hat collections` | `line_present`, `no_invented_speech` | `from 1 to 10 ... for hack collections` |
| `show every toy she has reviewed`                                         | `line_present`, `no_invented_speech` | `show every tie she has reviewed`       |
| `have a website for my cat say hello to visitors`                         | `line_present`, `no_invented_speech` | `for my cats`                           |
| `the slider moves like a fern toward sunlight.`                           | `line_present`, `no_invented_speech` | `towards sunlight`                      |

The first is the largest of them: `faster-whisper small.en` writes number words as numerals, and **158 of the
2,808 authored user lines carry a number word** — about one line in eighteen, which will never be heard by this
listener and will always be text on the field instead. The fix is the same field the cast hint uses and is the
Director's to take: an `initial_prompt` that carries spelled-out numbers would steer the transcription without
touching a check. It was not done here, because decision 7 of the brief opens the hint for the agent's name and
nothing else, and because a take we cannot verify still does not play. The fourth is worth naming on its own:
the written line is American English, as every surface must be, and the listener supplied the British form.

**The agent's name does not need the hint, measured.** Not one of the 2,808 authored user lines names the agent
— the sheet forbids naming a tool or a model, and `Sprocket` appears in none of them. Ten lines written to name
him were spoken through the worker as it stands: nine receipted, and **none of the refusals was the name** (the
one that failed lost `thing` to `things`). `CAST_HINT` is unchanged and `voice/worker.py` is untouched.

**A worker bug found and not fixed.** Re-speaking a line whose receipt failed, when the receipt had been cleared
from the cache but its `.failed.wav` had not, answers 500: `wav.rename(wav.with_suffix('.failed.wav'))` in
`voice/worker.py` raises on Windows when the destination already exists, where `Path.replace` would not. It is
unreachable in normal use, because `_evict` removes all three files together and a cached failed receipt is
returned without re-rendering; it is reachable by hand-clearing the cache, which is how it was found. Recorded,
not changed: the worker is not this sub-slice's to edit.

### The shell, smoked

The dev server on 5174 from this worktree, the worker on 7788, the Browser pane driven with synthetic keydowns.

- The **Voice** box is built, off and disabled, and says `voice: no worker (pnpm voice)` when nothing answers;
  with the worker up it reads `voice ready` and the remembered pref turns it on by itself.
- `POST /voice/speak` through the proxy returns 200 and the receipt the shell acts on. The body the shell sent
  is the lever verbatim: `preset am_echo, rate 1.0, loudness -4.0, kind user, max_gap_s 0.5`.
- A passing receipt's take is fetched at `GET /voice/audio/<id>.wav` → 200, `audio/wav`, a real RIFF file
  (88–92 kB), and the status reads `voice: spoke on the beat`. A failing one reads `voice: receipt failed, not
played` and no audio is fetched at all.
- A take that missed its beat showed `voice: held for the next ask` and played at the following request.
- Re-smoked after the two-slot amendment: a level played through with the box on fetched its takes one after
  another rather than on top of one another, and the audio for each was a real RIFF file (88 to 138 kB). The
  status walked `voice speaking ahead` to `voice: spoke on the beat` and, for the one line in the level whose
  receipt fails, to `voice: receipt failed, not played` with no audio fetched for it.
- No digit reached the chat pane and nothing on the page named the engine or the preset. (One authored user
  line contains the ordinary English verb `whisper`; that is a word the user says, not the listener's name.)

The Browser pane runs no animation frames while it is hidden, which is the same limit `docs/cabinet-voice.md`
records for Ghost; the long play-throughs above are `pnpm sit`, which does not need them.

### The gates

`pnpm verify` green: `Test Files 57 passed (57)`, `Tests 766 passed (766)`, `eslint` and `prettier --check`
clean over the whole tree. `pnpm build:play` and `pnpm build:launcher` green for both packages. Both
play-throughs byte-identical to `main` — `node scripts/play.mjs ghost --fixture naive-ndjson` and
`node scripts/play.mjs vibe-typer --tier 0 --bot typist:40` run on this branch and on `main`'s sources in the
same tree, diffed, no difference. `git diff main --stat` is empty for `packages/ghost-on-the-menu`, every
README, `site/`, `CHANGELOG.md`, `catalog/` and `docs/art/`, and touches `packages/vibe-typer/src` only in
`patterns.ts`. Both `package.json` versions stay `0.10.0`.

`npm pack --dry-run --json`, measured on this branch and on `main` in the same tree:

| Package                          | Files          | Packed                  | Unpacked                |
| -------------------------------- | -------------- | ----------------------- | ----------------------- |
| `@mcptoolshop/vibe-typer`        | 131, unchanged | 2,487,007 → 2,491,788 B | 5,664,591 → 5,680,068 B |
| `@mcptoolshop/ghost-on-the-menu` | 63, unchanged  | 6,172,544 → 6,173,794 B | 8,820,538 → 8,826,413 B |

The Vibe tarball grows by four kilobytes, a sixth of one per cent, and no file is added or removed: the voice
is code in a bundle that was already there, and nothing about it is an asset.

### What was refused, and why

- **Reusing `createVoicer` with an adapter.** Three rules differ, and an adapter that carries three rules is the
  rule. Writing the second voicer keeps Ghost's timing untouched and both sets of tests honest. Never both.
- **Tuning `maxGap` up because Ghost's refusals came from it.** Measured instead: zero straggle refusals here.
- **Adding spelled-out numbers to `CAST_HINT`.** A real finding and a real fix, and out of this brief's bounds.
- **Fixing the worker's failed-take rename.** Same reason; recorded above with the one-line remedy.
- **Playing an unreceipted take, or a take whose receipt failed.** G15 is the receipt.
- **Speaking the agent's lines, or the meeting.** The player types the agent; the meeting would bury the ask.
- **Changing the sim to make room for the reaction.** Sub-slice A proved the play-throughs byte-identical and
  this sub-slice keeps them that way. The ship frame's length is a design question, not a builder's.
- **More than two takes in hand.** Two is the cap and there is no third slot: a queue that can grow is a queue
  that plays the user over themselves a request later, and the cabinet would owe the player an apology rather
  than a joke. A creep or a check-in landing on a full queue takes the older of the two and nothing stacks.

### Frame checks

- **Nothing about a fact reaches the worker.** The job carries the gated words, the kind `user`, a preset, a
  rate, a loudness and a budget. No tape, no level, no score, no valuation — `SpeakJob` has no room for one, and
  the cabinet's fact-blind discipline is untouched because the sim did not change.
- **No digit on screen.** Every voice status is words; the take is audio. The mount test asserts no digit on the
  chat pane with the voice on.
- **The band is untouched.** `packages/vibe-typer/src` changed only in `patterns.ts`, and only to load a block
  the sim never reads.
- **The model is a character.** Nothing names the engine, the listener, the verifier or the preset anywhere a
  player looks; the preset is a lever and the chrome is three words.

### Decisions

60. **The preset is a data lever, and the sheet names it too.** `cabinet.json → voice.user` carries the preset,
    the rate and the loudness, and `voice.maxGap` the budget; the loader halts on each of the worker's own
    bounds so a bad value is a build failure rather than a silent cabinet. The preset's shape is checked here
    and its membership at the worker, which owns the catalog. `patterns/voice/user.md` names the same preset
    under `## The voice`, and a test reads both and requires them to agree, so the brief a writing model is
    given and the voice a player hears cannot drift apart.

61. **Which lines are spoken is decided from the beat and the events, never from the text.** `vibeVoiceLine` is
    one pure function with a table test. A rule that matched words would have to be re-checked every time the
    pools were re-authored, and the pools are re-authored.

62. **The review is told from the reaction by the `ship` event.** It is in the same step, the sim pushes it only
    on a level's last request, and reading it costs the shell no state of its own.

63. **A second voicer, not an adapter over Ghost's.** Four rules differ — in hand is a beat and not a caption,
    the boundary is an edge and not a level, two takes may be in hand for the reaction-then-ask pair, and a
    take runs to the end of its audio instead of being cut off by the next one. Each has a test that a reused
    `createVoicer` would fail. The client, the receipt and the status words stay shared.

64. **The creep's beat window is `creep` and the `code` beat after it.** The brief named the windows for the
    ask, the reaction and the check-in and was silent here. The sim says the creep on the `creep` frame and
    appends the line to the code beat that follows, so that pair is the window; anything narrower would hold a
    take that arrived a second later, for a line still on the field.

65. **`speakLine` takes the least a job needs.** `SpeakJob` — text, kind, voice, budget — which `VoiceJob`
    already satisfies. One worker client for two cabinets, and the typing cabinet does not import a persona
    written for a boss.

66. **A take that a faster one lands on top of is counted as dropped.** Two cached takes can come back inside
    one frame, and only one can play. The first version lost the older one silently; the numbers in this
    document would have been wrong by exactly the amount that mattered. There is a test.

67. **The Voice box is `LOCAL_SEATS`, not the endless seat.** A story level has a user. The seat's mark stays
    what it is and the voice has its own, so the pack can check each half separately.

68. **The run's opening ask waits in the mount for the checkbox.** It is said by `createRun`, before any step,
    so no drain can see it; and it is said before the first probe answers. It goes when the box comes on, and
    is given up if the reply beat has passed.

69. **`setBedDuck` is additive, and one `bedLevel()` decides the bed.** The typing cabinet already had a timed
    duck for the deploy; a take's duck outlives a timer. Both now read one function, so the timer running out
    under a take does not lift the bed and a change of bed mid-take keeps the take's depth.

70. **`--seat none` and a wall-clock play.** A voice measurement wants a run with no model in it, and a rule
    about whether a receipt beat its beat cannot be measured by a loop that runs a level in four milliseconds.
    Under `--voice on` the levels are played at the shell's own pace, with the shell's accumulator, step cap and
    creep hold; with the voice off the tight loop is exactly the loop it was.

71. **The refused takes are findings and stay in this document.** One line in eighteen carries a number word the
    listener writes as a numeral, and those lines will be text on the field until the Director takes the hint
    change. Nothing was tuned to make the table look better.

72. **Two takes in hand, and only for the reaction and the ask behind it.** The first cut of this sub-slice held
    one, which is what the brief said, and the cold measurement showed what one slot costs: not one reaction or
    review was ever heard on a first run, because the next ask lands thirty milliseconds after it and took the
    slot. The reaction is the user's comedic line and the cabinet is a comedy, so the pair queues: the reaction
    plays on its own beat and the ask waits for its audio to end. Two is the cap — a queue that can grow plays
    the user over themselves — and every other line still replaces, as it did.

73. **A take runs to the end of its audio, and the play hook says when that is.** The hook is handed a `done`
    the shell wires to the take element's `ended`, `pause` and `error`, so the queue moves on the audio and not
    on a guess. A caller that plays nothing — `pnpm sit` — ignores it and the queue waits out the receipt's own
    measured length instead, which is the same length the element would have taken. Muting calls `done` at
    once: nothing is audible, so nothing behind it should wait.

74. **A slot with nothing to play leaves rather than blocking the one behind it.** A failed receipt, a refusal,
    a worker that did not answer: the take is counted and the slot goes, so the ask plays at once when the
    reaction was never going to be heard. Without it the rule would trade one silent line for two.

### Standards

**NAMED_COMPENSATORS (3).** This sub-slice performs no irreversible act at all. The only outward step is the
branch push, undone by `git push origin --delete cabinet/vibe-typer-s4c`; the branch is deletable until it is
merged and merges as one commit. Nothing is published, tagged or released: both `package.json` versions stay
`0.10.0` and `docs/npm-launcher.md`'s table is not entered. The lever is data — `git checkout main --
packages/vibe-typer/patterns/cabinet.json` returns the cabinet to a silent user with no other change, because
the chrome is off until a worker answers and a worker that never answers is a cabinet that plays as it did. The
worker writes only into its own cache directory, which is git-ignored and which `_evict` bounds at 400 takes.
No skip.

**PIN_PER_STEP (3).** The preset, the rate, the loudness and the straggle budget are all in `cabinet.json`,
versioned with the package and validated at load; the shell, `pnpm sit` and the tests all read the same block,
and the mount test asserts the job carries exactly it. Every take carries a receipt naming the engine, the
listener, the verifier, the preset, the rate, the loudness, the budget, the text and what was heard, written
beside the audio. The sim is seeded and untouched, so a run at a seed says the same lines in the same order and
the voice measurement is repeatable.

**ANDON_AUTHORITY (3).** Two halts and a gate. The loader halts the build on any voice value the worker would
refuse, naming the key. The receipt halts the take: a failed check means the audio is never served and never
played, the shell says so in words, and the slot leaves so nothing waits behind a take that will never sound. And the pack's marker gate halts a Vibe package whose shell lost the
voice chrome, which would otherwise ship a proxy with no caller. All three are exercised by tests, and the
receipt gate was exercised live four times in the runs above.

**DECOMPOSE_BY_SECRETS (3).** What changes together is together: which lines are spoken and when a take may
play are one new file with one test file; the worker protocol stayed in `voice.ts` and grew one shared type; the
chrome, the pref and the speaker are the shell's; the proxy is the launcher's and its allowlist is one shared
module both cabinets read. The sim knows nothing about any of it.

**UNCERTAINTY_GATED_HUMANS (2).** The preset was chosen by measurement across the catalog and stated with its
reason, and it is a lever the Director can change in one line; the rate, the loudness and the budget are
`// Director` numbers with their first values justified here. The character came from the Director and is
recorded as a decision. What is not gated: the reaction finding is reported with three named options rather
than one recommendation, which is the right shape for a feel question but leaves the Director a choice to make
before `0.11.0` rather than a change to approve.

**EXTERNAL_VERIFIER (3).** No model checks its own work anywhere in this path. The line is written by one model
(or by the authored pool), spoken by Kokoro, heard back by faster-whisper and judged by fx-dub — three
different systems, and the judge never sees the generator's reasoning, only the audio and the one line it was
supposed to be. The timing rule is tested against a fake worker whose answers the test chooses, so the rule is
proved by construction and not by a recording. The diff review is a different family from the writer.

### Review (Kimi K2.6, from a packet)

Halt, four items, all four accepted and applied in the same commit. Three are in code that only runs when
something has already gone wrong, which is where this sub-slice's own tests were thinnest; the fourth is a test
whose assertion did not carry its own claim.

1. **The speak chain had no `catch`.** `speakLine` catches its own transport errors, so the chain only rejects
   if something above it throws — a hook that threw, a body past its guards. It would have left the slot
   pending for the rest of the run, blocking the take behind it, with the numbers still saying the take was on
   its way. **Applied:** the chain has a `.catch()` that drops the slot when the token still matches, counts it
   as a worker that did not answer, and says one static word. A test rejects the speak hook and asserts the
   status, the count and that the next line still plays.

2. **A playback error left the bed ducked.** The take element's `error` listener called `finishTake()` but not
   `duckBeds(false)`, so a take that failed to play held the bed down until the next one ended. Every other way
   a take can end already un-ducked. **Applied:** the `error` listener un-ducks as `pause` and `ended` do.

3. **The worker's own words were printed on the controls row.** The refusal status was built from
   `SpeakAnswer.error` with digits and path separators stripped — which stops a path and a number and stops
   nothing else. `kokoro has no such preset` would have reached the player, and the model is a character (G17).
   **Applied:** two static words, one per refusal class, and the worker's sentence is never printed anywhere.
   A test hands the voicer a refusal whose error names an engine and asserts the engine is not in the status.
   Ghost's `createVoicer` has the same shape in the same place; it is named here and is not this branch's to
   change.

4. **A "naming nothing" test that named five words.** The assertion listed the preset and four engine words a
   reviewer thought of, which is not the claim the test makes. **Applied:** it asserts the cabinet's own
   `NAMES` regex from `gate.ts` — every engine, vendor, model and seat word the say gate refuses — and `DIGIT`,
   the same class the field is held to, over `root.textContent`. `VIBE_NAMES` is deliberately not the one used:
   it adds the typing cabinet's four lever names and `the ask` is a beat word on this field. The preset is kept
   as its own assertion, because it is a lever's value and is in no list. `DIGIT`, `NAMES` and `VIBE_NAMES` are
   now exported from both barrels so a shell test can hold itself to the same rule the gate holds a line to.

## Sub-slice B, batch three — the milestone cards and the deploy ribbon

**Branch:** `cabinet/vibe-typer-s4b3`, one commit, not merged, not pushed, nothing published. Rebased onto
`940a5f5` after sub-slice C landed; the two conflicts were both "each side appended" — the mount test's
imports and this document's sections — and the decisions below are renumbered to follow C's last, 74.
`pnpm verify`, `pnpm build:play` and `pnpm build:launcher` (both packages) green; `npm pack --dry-run --json`
on both, measured against a clean build of `main`.

**Spend:** thirteen generations that ran, plus one submit refused before it ran. Four are installed. The
Director opened the count for this batch as for the two before it, because the cards and the ribbon are the
moments the game celebrates.

Eight of the thirteen went on the seed card, and seven of those eight lost the same fight twice over. The
brief asks for a 3:1 banner; the two batches before this one had recorded that the node renders 4:3 whatever
aspect is asked for; so the first six takes tried to get a 3:1 picture out of a 4:3 frame, either by asking
for a banner that would survive a crop or by asking for a motif small enough to sit inside one. Neither
landed, in six generations, because neither is a thing a change list can move. The seventh take stopped
asking and changed the canvas instead, and the three images after it cost one, two and two.

No other art was made. The backdrop stays in batch four on its own approval.

### What was built

```
apps/cabinets/public/vibe/cards/seed.png       480x160 RGBA opaque, 35,005 B.
apps/cabinets/public/vibe/cards/series-a.png   480x160 RGBA opaque, 42,832 B.
apps/cabinets/public/vibe/cards/unicorn.png    480x160 RGBA opaque, 51,572 B.
apps/cabinets/public/vibe/cards/deployed.png   640x80 RGBA, ground keyed away, 13,591 B.
apps/cabinets/scripts/cut-banner.mjs           the cut: one picture in, one banner out at an exact size.
                                               No dependency; the PNG codec, the ground, the two key
                                               thresholds and the ink box are imported from
                                               slice-tiles.mjs and cut-avatar.mjs, not copied.
apps/cabinets/scripts/cut-banner.d.mts         its types, so the test that pins the aspect math is TS.
apps/cabinets/scripts/slice-tiles.mjs          KEY_LO and KEY_HI gain an `export`. Nothing else moves.
apps/cabinets/scripts/slice-tiles.d.mts        + those two.
apps/cabinets/src/typer-cards.ts               CARD_SLUGS, DEPLOY_SLUG, cardSlugOf — the one table —
                                               and CARD_ASPECT and RIBBON_ASPECT, the two shapes the
                                               preview sizes its pictures from.
apps/cabinets/src/vibe-typer.ts                the four pictures load at the mount; the toast takes a card
                                               behind its word; drawPreview lays the ribbon down in place
                                               of the flat bar.
apps/cabinets/index.html                       untouched. The card is drawn on the canvas, so this
                                               batch adds no CSS at all and the file is byte-identical
                                               to main — which is why Ghost's tarball does not move.
apps/cabinets/test/banner-cut.test.ts          13 tests: the box sources, the aspect fit both ways round,
                                               the clamp, the two alphas, determinism, the round trip and
                                               the flat-field refusal.
apps/cabinets/test/typer-cards.test.ts         7 tests: the table against the shipped lever, both
                                               ways, and the four installed files against the two
                                               aspect constants the preview draws from.
apps/cabinets/test/typer-mount.test.ts         + 3: the card drawn over the preview with the toast
                                               left a plain word, the word-only path when nothing
                                               loads, and the deploy band taking the flat-bar path.
                                               The first of the three also fires the preload's
                                               handlers after unmount and requires nothing to move.
docs/art/receipts.json                         + vibe_typer_batch_4: route, the `licence` pointer,
                                               acceptance, compensators, 18 rows (14 generations or
                                               submits, 4 installed).
.gitignore                                     + docs/art/originals-vibe-4/
```

### The route, and the thing the last two batches had wrong

`bfl/flux-2-max` through the official Comfy Cloud MCP (`partner_generate`, the workflow-persist path,
`Flux2ImageNode`) — the same route, and under the same `licence` block, as the three batches before this one.
`submit_batch` was not tried; batch one established that its `medias[]` takes a public URL or an uploaded
name and not a Comfy output by `prompt_id`, and every generation here chains from a `prompt_id`.

**The node honors `params.width` and `params.height`.** Batch one asked for `2:1` and batch two for `1:1`
through the tool's own top-level `aspect_ratio`, both came back 1024x768, and both batches wrote that up as
"the node renders 4:3 whatever aspect is asked for". That is not what is happening: the top-level
`aspect_ratio` does not reach `Flux2ImageNode`, and `params.width` / `params.height` do, exactly, within
256..2048 on each side in steps of 32. The bounds are not a guess either — the ribbon was first submitted at
1280x160 and the node refused it **before it ran**, naming its own config: `Value 160 smaller than min of
256`, `model.height`, `min 256, max 2048, step 32`. That refusal cost nothing and is a receipt row.

So the cards are generated at 1440x480, an exact 3x downscale to 480x160, and the ribbon at 2048x256, an
exact 3.2x downscale to 640x80. Nothing in this batch is cropped through its own art.

This is the batch's most portable finding and it is why the seed card cost eight generations rather than two.

### The chain

| Generation    | Reference                     | Why                                                              |
| ------------- | ----------------------------- | ---------------------------------------------------------------- |
| seed 7601     | the accepted bash tile sheet  | so the cards sit on the tiles' palette weight and pixel scale    |
| seed 7602     | seed 7601                     | a three-item change list                                         |
| seed 7603     | seed 7601                     | a four-item list against the first take, not the failed second   |
| seed 7604     | the accepted bash tile sheet  | a fresh draw: the composition changed to a full-bleed card       |
| seed 7605     | seed 7604                     | a three-item change list                                         |
| seed 7606     | seed 7605                     | a three-item change list                                         |
| seed 7607     | seed 7606                     | palette and scale only; the canvas changed, so the prompt is new |
| seed 7608     | seed 7607                     | a two-item change list, on color alone                           |
| series A 7609 | the accepted seed card (7607) | a fresh draw: a change list cannot turn a plant into a rocket    |
| unicorn 7610  | the accepted seed card (7607) | a fresh draw, same reason                                        |
| ribbon 7611   | the accepted seed card (7607) | palette and scale; the subject is new                            |
| unicorn 7612  | unicorn 7610                  | a two-item change list                                           |
| ribbon 7613   | ribbon 7611                   | a two-item change list                                           |

Batch two's finding held again, with one correction on its edge. A change list against a reference moves the
named details and leaves the rest pixel for pixel: both of the re-rolls that landed here (unicorn 7612,
ribbon 7613) did exactly that, on two items each. What a change list cannot move is **the shape of the
picture**. Six of them asked, in six different wordings, for the drawing to be smaller or the banner to be
shorter, and not one of them moved it. A change list edits what is drawn; it does not edit the canvas.

### The prompts, verbatim

All thirteen open with the style clause the tiles and the avatars used, name every color by name and hex,
and close with batch one's closing clause: "Hard edges, flat colors, no gradients, no reflections, no noise,
no texture, no vignette. No letters, no numbers, no words, no arrows, no symbols, no user interface labels,
no text of any kind anywhere in the image." Every one of them also bans the frame by name (batch two's
decision 48). Every prompt is in `docs/art/receipts.json` in full, on its own row, with the job that ran it.
American English throughout, checked before sending: batch two's `gray` is not repeated here.

**The seed card, take seven**, the one that ships and the reference for the other three:

> In exactly the same chunky flat 16-bit arcade illustration style, palette weight and pixel scale as the
> reference image, and with exactly the same potted seedling drawn the same way: one wide landscape card that
> fills the whole picture, corner to corner. The entire background of the picture, every part of it, is one
> unbroken perfectly flat deep navy (#1b2440) field — exactly the same shade in all four corners and along
> all four edges, with no vignette, no darker edges, no lighter middle and no shading, and no near-black and
> no black anywhere in the picture at all. In the left-hand third of the card, and only there, stands one
> small plain pot with one short straight stem growing out of it and exactly one single leaf on that stem —
> one leaf, and no other leaf anywhere. Behind the pot sits one round glow drawn as three flat concentric
> rings of warm amber (#e8a04a) and light cream (#f6d6ac), every ring hard-edged, sitting straight on the
> deep navy with no gray, no black, no dark edge and no outline of any kind around it. … The right-hand two
> thirds of the card, from the glow across to the right edge of the picture, is completely empty flat deep
> navy with nothing drawn on it at all: no lines, no bars, no dashes, no dots, no marks and no shapes of any
> kind. …

**The series A card, take one**, a fresh draw against that:

> … In the left-hand third of the card, and only there, stands one small plain rocket, exactly where the
> potted plant stands in the reference and at exactly the same size, with exactly the same round glow of
> three flat concentric rings of warm amber (#e8a04a) and light cream (#f6d6ac) behind it. The rocket stands
> upright on a launch stand and is seen straight from the side: a tall rounded body with one pointed nose
> cone at the top and two small fins at its base, resting on a simple stand of two straight legs and one
> short crossbar. One single flame comes out from under the rocket, drawn as one plain pointed shape in warm
> amber (#e8a04a) and light cream (#f6d6ac), with no smoke, no sparks, no exhaust cloud and no trail. …

**The unicorn card, take two**, a two-item list against its own first take:

> … with only two things changed. First, the middle of the glow, everything inside the innermost ring, is one
> flat deep navy (#1b2440) disc, exactly the same deep navy as the card behind it, so that the light cream
> (#f6d6ac) unicorn stands against dark navy and reads clearly instead of standing on cream. … Second, the
> pale slab of cream that spreads out to the right of the glow is gone … The unicorn stays one flat light
> cream (#f6d6ac) shape, there is no rainbow anywhere, no stars, no sparkles, no twinkles and no small
> floating shapes around it …

**The deploy ribbon, take one**, whose body is unchanged in the take that ships:

> … one long thin horizontal ribbon lying straight across the middle of a very wide, very short picture, on
> one unbroken perfectly flat near-black (#101018) field that fills every other part of the picture … One
> thin light cream (#f6d6ac) line runs the whole length of the ribbon just inside its top edge and another
> thin light cream (#f6d6ac) line runs the whole length of the ribbon just inside its bottom edge. Between
> those two cream lines the ribbon is one completely empty flat warm amber field from end to end, with
> nothing drawn on it at all: no lines, no bars, no dashes, no dots, no marks, no shapes and no shading. At
> each end the ribbon is folded: a short piece of the band folds back on itself and sits slightly lower than
> the main band, drawn in deep ochre (#b87a2c) so it reads as the underside of the ribbon, and the very end
> of each folded piece is cut into a shallow V-shaped notch. …

### Per generation

| Generation     | Seed | Size     | Verdict      | Glyph score | What it is, and why                                                                                                                                                                                    |
| -------------- | ---- | -------- | ------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| seed 7601      | 7601 | 1024x768 | **rejected** | 0.000013    | A handsome banner and three misses: two leaves where one was asked for, a muddy brown glow, and a drawn banner of 1024x395 — 2.59:1, so a 3:1 cut would have eaten the cream bands.                    |
| seed 7602      | 7602 | 1024x768 | **rejected** | 0.000015    | A regression. The glow went amber; in exchange a thick cream border appeared around the whole banner, two stray amber lines crossed the empty navy where the word goes, and the aspect did not move.   |
| seed 7603      | 7603 | 1024x768 | **rejected** | 0.000017    | One leaf at last, cream bands gone. But the glow now spills above and below the strip, the margins came back mid-gray, the pot turned green, and the ink box is 2.49:1 — further away.                 |
| seed 7604      | 7604 | 1024x768 | **rejected** | 0.000019    | The composition solved and the details left: full-bleed navy, motif in the left third, right two thirds clean. Two leaves again, an orange pot, and a glow a 3:1 crop would clip.                      |
| seed 7605      | 7605 | 1024x768 | **rejected** | 0.000016    | One leaf landed. "Smaller" did the opposite — the glow grew to about 415 px in a 768 px frame and picked up a dark gray outer ring.                                                                    |
| seed 7606      | 7606 | 1024x768 | **rejected** | 0.000025    | The gray ring gone, the leaf right, the motif still about half the height where a third was asked for twice. Three generations spent asking for smaller, none of them moved it.                        |
| seed 7607      | 7607 | 1440x480 | **accepted** | 0.000011    | A real 3:1 card on the first try at the right canvas. One leaf, air above and below the badge, the right two thirds clean. The pot and the outer ring are orange, not amber.                           |
| seed 7608      | 7608 | 1440x480 | **rejected** | 0.000034    | The one generation spent on the color miss, and it went the wrong way: the glow turned pink and salmon and the pot stayed orange.                                                                      |
| series A 7609  | 7609 | 1440x480 | **accepted** | 0.000029    | A rocket upright on a two-legged stand with one flame, in the seed card's place at the seed card's size, in the same round badge. Its badge middle came back navy, not cream.                          |
| unicorn 7610   | 7610 | 1440x480 | **rejected** | 0.000034    | The right drawing with no contrast in it: a cream unicorn on the badge's cream middle, which disappears at the size the toast shows. A pale slab of cream also spread out right.                       |
| ribbon (first) | 7611 | 1280x160 | **refused**  | —           | `Value 160 smaller than min of 256`, `model.height`. Refused before it ran, nothing charged. The finding that sets the ribbon's canvas.                                                                |
| ribbon 7611    | 7611 | 2048x256 | **rejected** | 0.0001      | The right ribbon on the wrong ground: folded ends, V notches, two cream lines, an empty middle — and a textured mid-gray field around it. The ribbon is drawn over the preview, so that is a gray box. |
| unicorn 7612   | 7612 | 1440x480 | **accepted** | 0.0000044   | Both named changes landed and nothing else moved: a flat navy disc behind the cream unicorn, and the cream slab gone. One amber horn, no rainbow, no sparkles.                                         |
| ribbon 7613    | 7613 | 2048x256 | **accepted** | 0.000015    | Black corner to corner, flat and untextured, which is what the key wants; the ribbon itself unchanged from the take before.                                                                            |

### The misses, stated

Three, and none of them is defended.

1. **The amber is an orange.** The seed card, the unicorn card and the ribbon all came back with an orange
   where the arcade's warm amber (`#e8a04a`) was named, and the one change list spent on it went past amber
   into salmon. The orange ships. It is consistent across all four images, which for a set matters more than
   the hex does, and at the size the toast shows them it reads as the arcade's amber — but it is not the
   color the brief names and it is not called a style choice here.
2. **The cards' navy is three navies.** The plates measure `#17314b`, `#21384f` and `#274059` against the
   `#1b2440` asked for, so the unicorn card's ground is visibly lighter than the seed card's side by side.
   They are never shown side by side, which is the only reason this ships.
3. **The badge interiors do not match.** The seed card's glow is filled cream behind the plant; the series A
   and unicorn badges have a navy middle. The unicorn's navy was asked for deliberately, because a cream
   unicorn on cream vanished. The seed card was not re-rolled to match it, and that is a spend decision
   rather than a design one.

The first is the same shape of miss batch one recorded on its python sheet, and the lesson is the same one:
two generations on a color is the budget, and after that the miss is written down.

### The cut

`apps/cabinets/scripts/cut-banner.mjs` is committed and takes a picture, an output path and a size. It has no
dependency and no PNG codec of its own: the decoder, the encoder, the ground, the two key thresholds and the
ink box all come from `slice-tiles.mjs` and `cut-avatar.mjs`. What is new is about eighty lines.

A tile sheet has eight icons to hunt for; an avatar picture has one drawing with air around it; a banner has
neither problem and one the others do not — the answer has to be a rectangle at a named aspect, because the
shell draws a word over it at a size it has already chosen.

So **where the drawing is** is a flag rather than an assumption. `--frame` takes the whole picture, which is
what a card or a ribbon generated at its own aspect is; without it the ink is hunted for, which is what a
motif drawn inside a 4:3 frame needs. `fitAspect` then grows the short side where the picture has room and
trims the long side where it does not, centres the result on the box and clamps it inside the picture. All
four images here were generated at their own aspect, so all four were cut with `--frame` and the fit came out
a no-op to the pixel; the growing and the trimming are both exercised by the tests instead, against synthetic
pictures whose answers are known by construction.

There is deliberately **no eight per cent margin**. A portrait is a subject with air around it and wants one;
a banner is its own edge, and ground padded around a card would read as a dark border against the board.

Alpha parts the two of them again, for batch two's reason — what is underneath.

- A **card** is drawn behind a word on the board, on nothing but the page, so it is opaque and its own navy
  is the card.
- The **ribbon** is drawn over the preview, which already carries the device frame and the packed blocks. An
  opaque ribbon would punch a band of its own ground straight through that picture, so the ribbon's ground is
  keyed away to nothing over `slice-tiles.mjs`'s own two thresholds and the ribbon floats. Measured on the
  installed file: 23,668 pixels clear, 27,047 solid, 485 on the ramp between.

It **throws** rather than guessing in two cases: when no rectangle at the aspect fits inside the picture, and
when the finished cut carries fewer than four distinct colors. The second is this batch's mechanical andon —
a card that came back as one flat field is a re-roll and never an install — and both have a test.

### The asset layer, and the fallback rule

The four pictures load as plain `Image` elements off `import.meta.env.BASE_URL + 'vibe/cards/<slug>.png'`;
`load` puts one in a Map keyed by slug, `error` takes it out, and nothing ever waits on a load. That is the
frames' rule, the tiles' rule and the avatars' rule, and a Pages build without `vibe/cards/` still plays.

The one place this batch parts from the tiles is **when** they are asked for. Tiles are fetched per stack, at
the first frame of a level in that stack, because a level's stack is known a frame before a piece lands.
A milestone is not: it is a line the valuation crosses without warning, and a picture fetched at that moment
would arrive after the toast had gone. So all four are asked for at the mount, in one burst — 143,000 bytes,
once per field.

**The card is drawn on the preview, and the board's toast is left alone.** The first cut of this batch put
the card behind the toast's own word as a CSS background, which is a tidy piece of DOM and the wrong place:
the toast is a status line at the end of the scoreboard row, about 140 px wide, and a 480x160 picture shrunk
into it reads as a dark smudge with a word on it. The art was invisible at the only size it was ever shown
at, which means the batch did not do the thing it was made for. So the picture moved to the preview, where
the ribbon already works and where the game already celebrates, and the toast went back to being exactly
what it was: the milestone word, as text, in the same live region, announced the same way, with nothing
behind it and no CSS added anywhere.

`drawPreview` draws the card `CARD_W` wide — 440 of the preview's 480, so a 20 px margin either side — at
`CARD_ASPECT`, centered on both axes over the packed pieces. The word goes on top of it in the field's own
face at 28 px, centered on the card's right-hand two thirds, because every card draws its motif in its left
third and leaves the rest flat navy. That is what makes a card reusable for any wording, and it is why the
word never lands on the art.

The word on the card is **cream** (`#f6d6ac`), not the near-black the ribbon's word uses. The two are the
same decision reaching opposite answers for the same reason the ground treatments do: the ribbon's word sits
on flat amber and the card's word sits on flat navy, so each takes the palette's other end. The coordinator's
brief called for "the same cream the ribbon's word uses"; the ribbon's word is in fact `#101018`, and cream
is what that sentence wants on a navy card, so cream is what it is — noted here rather than silently
reinterpreted.

**One clock, two things.** The card is drawn while `toastLeft > 0`, which is the board's own toast timer, so
the word and the picture arrive and leave on the same frame and cannot come apart. A short fade either end
(`CARD_FADE_MS`) is the only movement this batch adds, and under `prefers-reduced-motion: reduce` the card
shows and hides hard instead — read live with `matchMedia` in the one branch that draws it, rather than
cached at mount, so a player who changes the setting mid-run gets the answer they asked for. The picture
itself is a still either way.

**The drawing order** is frame, pieces, card, confetti, ribbon, flash — the order the brief names. The card
goes over the pieces because it is the celebration and they are the scenery, and under the deploy's confetti
and ribbon because a deploy that lands during a milestone's two seconds is the louder event.

`CARD_ASPECT` and `RIBBON_ASPECT` live in `typer-cards.ts` rather than the shell, because they are facts
about the files rather than feel numbers, and a test reads all four installed PNGs off disk and holds them to
both. A card re-cut at another size fails the suite rather than drawing squashed.

**The ribbon.** `drawPreview` drew a flat amber bar 26px tall with `deployed` at its left. It now draws the
ribbon the full width of the preview at the file's own 8:1, centered on the same band, with `deployed`
centered over it — the ribbon has folded ends and an empty middle, so centered is where the word belongs. The
baseline is the same number in both paths, `PREVIEW_H - 27`, so the word does not move vertically when the
picture arrives. With no ribbon loaded the old two lines run exactly as they did, word at `x = 16` and all.

**The fallback, everywhere.** A card that is missing, slow or broken leaves the milestone word doing the
whole job on the board, exactly as it did before this batch; a ribbon that is missing leaves the flat amber
bar. Neither path waits on anything. jsdom hands an `Image` no file, so that is the path the mount tests take
by default, and one of them installs a subclass whose `src` setter fires `load` to take the other.

### In the shell

Played end to end against the **built Vibe package bundle** (`packages/launcher-vibe-typer/dist`, served by
the package's own CLI on a local port), in a real browser, with synthetic `KeyboardEvent('keydown')` typing
about 20 ms apart. Saved to `film/` (git-ignored):

- `film/cards.png` — 1265x612, the whole field a few frames into a milestone: the seed card at 440 px across
  the middle of the preview with its badge at full size and `seed` in cream on its empty right half, and the
  board's toast up at the top right as the plain word `seed` with nothing behind it. Driven by an endless run
  until the valuation crossed 100.
- `film/ribbon.png` — 960x720, the preview's own canvas at the deploy on a level-one run: the ribbon across
  the terminal frame with its folded ends and its two cream lines, `deployed` centered in the empty middle,
  and the frame and the packed tiles showing through above and below it where the ground was keyed away.

Two notes on the method, because both cost time and will cost it again. The render loop is stopped on the
frame the picture is wanted, so a two-second state is photographed rather than chased — and that is one-way:
restoring `requestAnimationFrame` afterwards does not restart a loop that has no callback pending, so a
frozen run is spent and the next frame needs a fresh one. And a Browser pane that is not on screen suspends
`requestAnimationFrame` altogether, which stops the field dead; a `MessageChannel` pump standing in for
`requestAnimationFrame` is not throttled and runs the shell at real speed with real timestamps while the pane
is hidden.

Read back out of the page at the same time: all four card files answer 200 with the byte counts they were
installed at, and the board's toast carries the milestone word with an empty `style.backgroundImage` and no
child element — the status line is a status line again.

### The tarballs

Measured with `npm pack --dry-run --json` on a clean export of `main` at `940a5f5` and on this branch,
after `pnpm build:launcher` each time. Both figures were re-taken after the rebase, because sub-slice C moved
the Vibe package underneath them.

| Package                          | Tarball, main | Tarball, here | Δ        | Entries   |
| -------------------------------- | ------------- | ------------- | -------- | --------- |
| `@mcptoolshop/vibe-typer`        | 2,491,987 B   | 2,634,977 B   | +142,990 | 131 → 135 |
| `@mcptoolshop/ghost-on-the-menu` | 6,173,794 B   | 6,173,794 B   | 0        | 63 → 63   |

The Vibe package gains exactly four entries, `dist/play/vibe/cards/{seed,series-a,unicorn,deployed}.png`, and
their four file sizes come to 143,000 B — so the whole tarball delta is the art, minus a few bytes the
compressor found. Ghost does not move **at all**, to the byte: drawing the card on the canvas rather than in the DOM
left `apps/cabinets/index.html` byte-identical to `main`, and that file was the only thing the two builds
shared that this batch had been touching. Its file list was also read and filtered for anything matching
`vibe`, which came back empty, rather than trusting `checkDist`'s stray check.

### The sim

Untouched, and mechanically so: `git diff main --stat -- packages/` and `-- scripts/` are both empty, and so
is `git diff main --stat` over `README*`, `site/`, `CHANGELOG.md`, `catalog/` and `voice/`. After the rebase
both play-throughs were also run for real on a clean export of `main` at `940a5f5` and on this branch and
diffed line by line: `pnpm test:play ghost --fixture naive-ndjson` and
`pnpm test:play vibe-typer --tier 0 --bot typist:40` are byte-identical across the two.

### Decisions

75. **Generate at the aspect; do not crop to it.** Six generations were spent trying to get a 3:1 picture out
    of a 4:3 frame, three of them asking in three wordings for the drawing to be smaller. None moved it. The
    fix was one parameter: `params.width` and `params.height` reach `Flux2ImageNode` and are honored, within
    256..2048 in steps of 32. Every image in this batch after that is generated at its own aspect and cut
    with a no-op fit. This corrects what batches one and two recorded, and it is the finding worth carrying.
76. **A change list moves details; it cannot move the canvas.** Batch two's method held for everything it was
    built for — both re-rolls that landed here moved two named things and left the rest pixel for pixel — and
    failed six times running on composition. The rule this adds to it: if the thing that is wrong is the shape
    of the picture rather than something drawn in it, stop writing change lists and change the generation.
77. **The card is the whole picture.** A card drawn as a banner inside a frame has to be found, cropped and
    trimmed, and the trim goes through its own art. A card drawn corner to corner is its own edge: the cut is
    a no-op, the plate is flat, and there is no ground to key or to pad. That is why `frameBox` exists.
78. **The three cards share a badge and a layout, so they read as a set.** The brief names only the seed
    card's glow, but the rocket and the unicorn were asked for in the same round badge, in the same place, at
    the same size. At 48 px the silhouette is most of what a player sees, and three different silhouettes
    would have read as three different things rather than three rungs of one ladder.
79. **The motif sits in the left third and the rest of the card is empty.** The brief says the word is drawn
    over the art; art under a word is a word that cannot be read. Every prompt asks for the right two thirds
    to be completely empty, and the CSS pads the word off the badge, so the word always lands on flat navy.
    It is also what lets the cards be reused for any wording, which is what the brief asks the art to allow.
80. **The word is the toast's own text, behind a background image — not a canvas layer.** A canvas would have
    had to draw the word itself, which takes it out of the live region, out of the accessibility tree and out
    of the reach of the test that rules the field's American English. The card is decoration and the word is
    content, so the card is a background and the word is a text node. It also makes the fallback exact rather
    than approximate.
81. **The cards load at the mount, not on demand.** This is the one place this batch breaks the tiles' rule,
    and the reason is that a milestone has no warning. A stack is known a frame before a piece lands; a
    valuation line is crossed mid-keystroke, and a picture fetched then would arrive after the toast had
    gone. Four files, 143,000 bytes, one burst, once per field.
82. **The ribbon is keyed and the cards are opaque.** Batch two's decision 49 said the ground's treatment
    follows what is underneath, and this is the same rule reaching the opposite answer twice in one batch: a
    card sits on the page, so it is opaque; the ribbon sits on the preview over a drawn device frame and
    drawn blocks, so its ground is keyed away to nothing and it floats. An opaque ribbon would have been a
    black bar across the picture.
83. **The word is centered on the ribbon and left-aligned on the flat bar.** The ribbon has folded ends and an
    empty middle, so centered is where its art puts the word; the flat bar is a plain band and its word has
    always been at `x = 16`. The baseline is the same number in both paths, so the word does not jump
    vertically when the picture arrives, and the fallback is byte for byte the two lines that were there.
84. **The milestone names reach the file names through one table, and it is a `Map`.** `series a` has a space
    in it and its file is `series-a.png`; nothing but that table holds the two together. A test walks the
    shipped `score.json` and requires a card for every milestone in it, so a fourth milestone added there
    fails the suite rather than toasting a word with no picture. It is a `Map` for batch one's decision 43:
    a plain object answers `constructor` and `toString` out of its prototype.
85. **`KEY_LO` and `KEY_HI` gained an `export` rather than a second copy.** The ribbon's key has to be the
    tiles' key or the two will drift. Two `export` keywords on two existing constants is the whole change to
    `slice-tiles.mjs`, and nothing in its behavior moves.
86. **The color miss is stated after one re-roll, not chased.** Batch one spent two generations on the
    python sheet's blue and wrote the miss down; this batch spent one on the amber and did the same. The
    difference is that here the miss is consistent across all four images, which is what makes it livable:
    a set that is uniformly a shade off is a set, and a set where one of four has been corrected is not.

87. **The card is drawn on the preview, not behind the toast's word.** The first cut of this batch put it
    in the board's toast as a CSS background, which is the tidier DOM and the wrong surface: the toast is a
    status line about 140 px wide at the end of the scoreboard row, and a 480x160 picture shrunk into it
    reads as a dark smudge. The art was invisible at the only size it was ever shown at, so the batch was
    not doing the thing it was made for. The ribbon was already the model — the preview is where the game
    celebrates, and it has the room. So the picture moved there at 440 px with the word over its empty half,
    the toast went back to being the milestone word and nothing else, and `index.html` came out of the diff
    entirely, which is also why Ghost's tarball no longer moves by a byte.

### Standards

**NAMED_COMPENSATORS (3).** Generation is an irreversible spend, so the compensators are named in
`docs/art/receipts.json → vibe_typer_batch_4.compensators` with an owner each: nothing enters the repo until
it is accepted, so the nine rejections are receipt rows and Comfy library entries and nothing else, and no
file of any of them is in `apps/` or `packages/`; the one refused submit produced no job and no file at all;
`git rm -r apps/cabinets/public/vibe/cards` returns the board to the plain milestone word and the preview to
the flat amber bar with no other change, because the word is the toast's own text and the bar is still the
path the preview takes when no ribbon is loaded; and the branch is deletable until it is merged. Every
generation and the refusal are rows with their job id, seed, full prompt and reference, so the spend is
auditable at thirteen. No skip.

**PIN_PER_STEP (3).** Every row carries the model slug as the tool accepted it, the seed, the full prompt,
the job it chained from and the canvas it was generated at — including the refused submit, which carries the
node's own bounds as the reason. Every installed row carries the box, the rectangle and the alpha treatment
it was cut with. The cut is a committed script with no dependency and no randomness, so the same picture
gives the same banner on any machine; a test runs it twice and compares the buffers, and others pin the
aspect math against synthetic pictures whose answers are known by construction. The milestone-to-file table
is a pure function of a name with no clock and no seed in it.

**ANDON_AUTHORITY (3).** Five halts. `ai-eyes image_contains` at 0.02 on every generation and on all four
installed cuts, before anything is installed. `fitAspect` throws rather than guessing when no rectangle at
the aspect fits. `cutSheet` throws when the finished cut carries fewer than four colors, so a picture that
came back as one flat field is a re-roll and never an install — a test proves it. `typer-cards.test.ts`
reads the four installed files off disk and fails if any of them is not the shape the preview sizes it from,
so a re-cut at another size cannot ship a squashed card. And the shell's own fallback is a halt of the same
kind at run time: a card that does not load leaves the plain word and a ribbon that does not load leaves the
flat bar, which three mount tests assert. The node's pre-spend refusal of the
1280x160 submit is a fifth, and it is the partner's rather than ours; it is recorded because it is what
established the bounds.

**EXTERNAL_VERIFIER (3).** The glyph check is SigLIP2 through `ai-eyes`, a different model family from the
BFL model that drew the images, and it never sees the prompt. The cut's tests feed synthetic pictures whose
boxes are known by construction rather than measured off a generated one. The table test reads the shipped
`score.json` through the package's own loader rather than a copy of the names. The shell evidence is the
built Vibe package bundle played in a real browser with the canvas and the DOM read back, not the mount stub.
The diff review is a different family, per the slice.

### Review (Kimi K2.6, from a packet)

The diff went to Kimi K2.6 as a packet — the lock, the brief and the diff with levers' lines, receipts,
images and the lockfile omitted. One of its four items is this branch's and was accepted; the other three
described the base moving rather than anything on this branch, and are recorded as that rather than argued
with. The packet was cut against a `main` that sub-slice C had already moved, so three of the four read the
voice's files as missing or changed when what had changed was where the branch was standing.

| #   | Item                                                                                        | Disposition         | Where it landed                                                             |
| --- | ------------------------------------------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------- |
| 1   | The card preload's `load` and `error` handlers write into the closed-over Map after unmount | **accepted**        | `apps/cabinets/src/vibe-typer.ts`, `apps/cabinets/test/typer-mount.test.ts` |
| 2–4 | Three items about the voice's wiring, its tests and its lever                               | **not this branch** | the base had moved; nothing applied                                         |

**Item 1.** Four files are asked for the moment the field is built, and a player who leaves the cabinet
before they land would have a handler writing into a Map belonging to a field nobody is looking at. The two
handlers now take the mount's own `left` flag, which is the guard sub-slice C's voice probes take for the
same reason, and the preload moved from an inline loop to an `askCards()` called just after that flag exists,
so the guard reads a variable that is already there rather than one hoisted past it.

The assertion that came with it is worth a line, because the obvious one would have been worthless. Asserting
that a late `load` leaves the DOM alone passes whether or not the guard is there — after `unmount` the tick
returns early and the root has already been replaced, so nothing would have moved either way. That is exactly
the shape batch two's review caught twice: a passing test that is not proving what it claims. So the test
fires the **`error`** half instead, on the four images the preload actually made, and reads the card count
back off `debug()`: guarded, the four stay; unguarded, `cards.delete` empties the Map. Checked both ways —
with the guard removed the test fails with `expected +0 to be 4`, and with it restored the file is green.
`debug()` gained a `cards` count for that, which is the same test-only surface the seat counts already use
and which nothing on the field reads (G17, G23).

## Sub-slice D, part two — the beds per stack

**Branch:** `cabinet/vibe-typer-s4d2`, one commit, not pushed. `pnpm format`, `pnpm verify`, `pnpm build:play`
and `pnpm build:launcher` all green; both play-throughs unchanged, because nothing the sim reads was touched.

Seven recorded beds, one a corpus stack, behind `music: on`. `soft` keeps the procedural hat it has had since
slice 3 and never reaches for a file. `off` stays off. Nothing in the set ties tempo or level to the context
bar: **the bed is not a clock** still holds, and the beds were asked for with that written into the tags.

### The route

|          |                                                                                                                                                                                              |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Template | `audio_ace_step_1_5_checkpoint` — the same id Ghost's nine beds were made on, which is why they sound like one arcade                                                                        |
| Model    | ACE-Step 1.5 turbo (`ace_step_1.5_turbo_aio.safetensors`), loaded on the cloud GPU                                                                                                           |
| Where    | Comfy Cloud, `rtx_pro_6000`; `run_template` for the first job, `submit_batch` for the seven                                                                                                  |
| Estimate | `estimate_credits` on the template returned **0 credits** before the first job, and it was right: the graph carries no paid API node, so nothing is billed per unit                          |
| Spent    | **42.70 GPU seconds** over eight jobs — 7.91 for the first and 34.79 for the batch of seven, a mean of 4.97 a bed. The billing feed reports `gpu_seconds` and no `credits_used` on all eight |
| Kept     | 7 of 8. The first job was a route proof and is not installed; every one of the seven that followed was accepted on the first roll, so there are no rejections and no re-rolls                |

The cloud rather than the local card, because the studio's default for generation is the cloud, because it
leaves the local GPU free for the voice worker and the translations, and because Ghost's beds were made this way
and are receipted this way. The kickoff had written the local GPU with the watchdog up; the route moved, and the
reason is written down rather than left in a diff.

Full route, every override verbatim, and a row a generation: `docs/art/receipts.json → vibe_typer_beds`.

### The tags, verbatim

One sentence of instrument color, then the same family sentence on all seven:

> Calm lo-fi chiptune, instrumental, no vocals, no voice, no singing, no humming, no vocal chops. Mellow and
> unhurried, a steady relaxed groove with a soft 8-bit drum machine and a gentle bassline. Even dynamics from
> start to finish: no build, no riser, no drop, no sweep, no ticking, no countdown. Loopable background music
> for a quiet workspace.

The no-vocals rule is said five ways on purpose. The field may carry no words a model wrote (G17), and a sung
word is a word, so it is not enough to hope an instrumental tag holds — `lyrics` is `[instrumental]` and the
tags name vocals, voice, singing, humming and vocal chops each by itself. The no-clock rule is the second half
of the sentence, and it is why no riser, no drop, no sweep, no ticking and no countdown are all spelled out: a
bed that swells under a draining bar is the reading slice 3 spent a whole sub-slice removing.

Every bed: **96 bpm**, which is `BED_MODES.on.bpm`, so the tempo rule scales from a known base and a rate of
one is the bed as recorded. Every bed: **A minor**, one key across the set, because the cabinet's synth cues are
all built off `ROOT = 220` — A — so a bed in A sits with the cues instead of beside them. Time signature 4.
Seeds 8201 for the proof and 8202 to 8208 for the seven, one a generation.

| Stack         | Seed | Color sentence                                        |
| ------------- | ---- | ----------------------------------------------------- |
| `bash`        | 8202 | A warm square wave lead over a soft muted kick.       |
| `csharp`      | 8203 | Cool analog pad chords, airy and wide.                |
| `java`        | 8204 | A woody marimba melody, soft mallets.                 |
| `javascript`  | 8205 | A bright amber bell melody, glockenspiel and celesta. |
| `python`      | 8206 | A mellow sine wave lead, rounded and soft.            |
| `sql`         | 8207 | Low drawbar organ chords, warm and still.             |
| `integration` | 8208 | Sparse plucked notes over a soft hum drone.           |

Each color was picked to sit beside the stack's own palette in `PALETTES`: green and a square wave, the cool
blue-grey and pads, java's brown and a marimba, the amber and bells, python's blue and a sine, the violet and an
organ, and teal with plucks over a hum for the stack that is about wiring things together.

### Fifty-two seconds asked for, thirty-eight installed

The first job asked for 38 seconds and got 38 seconds of file with **30.4 seconds of music** in it and the rest
silence. That is not a 38 second loop, and it is not a fluke: Ghost's own `menu.mp3` is 40 seconds of file with
35.3 seconds of music, which is why Ghost holds a bed 36 seconds and crossfades to the next one rather than
hard-looping into the hole. So the seven were asked for at **52** and cut down to 38. Their bodies run 44.8 to
50.5 seconds, and every window fits inside one with room to start a few bars past the opening.

The cut, per bed, is three things and its numbers are in the receipt:

1. **A bar-aligned window.** A cheap onset envelope finds the downbeat phase against a 2.5 second bar at 96 bpm;
   the window starts on the latest downbeat the body allows, capped at eight seconds in. ACE-Step opens sparse
   and fills in, so a window a few bars past the opening is the arrangement the track actually settles on. The
   seven start between 4.27 and 7.62 seconds; `java` starts earliest because it has the shortest body.
2. **A one-beat fold.** The last 0.625 seconds of the window are crossed back over the first at equal power, so
   the frame after the last frame _is_ the frame that followed it in the master. The loop is continuous in the
   source rather than continuous by luck.
3. **A gain and a soft ceiling.** Level set by gain to a -13.0 LUFS target, held by a `tanh` soft clip at
   -0.4 dBFS, and the gain corrected once against what the clipped signal measures. Chiptune is peaky; a hard
   ceiling pulled four to five decibels of loudness out with it when it was tried. Corrections ran -0.73 to
   +2.36 dB.

### Acceptance, measured

| Bed                                 | Seconds | Bytes   | LUFS   | Peak  | Join | Head/tail gap | Transcript |
| ----------------------------------- | ------- | ------- | ------ | ----- | ---- | ------------- | ---------- |
| `bash`                              | 38.000  | 609,024 | -13.55 | 0.921 | 0.25 | 4.46 dB       | empty      |
| `csharp`                            | 38.000  | 609,024 | -13.53 | 0.845 | 0.26 | 14.77 dB      | empty      |
| `java`                              | 38.000  | 609,024 | -13.62 | 0.946 | 0.49 | 1.53 dB       | empty      |
| `javascript`                        | 38.000  | 609,024 | -13.55 | 0.928 | 0.39 | 3.86 dB       | empty      |
| `python`                            | 38.000  | 609,024 | -13.55 | 0.798 | 0.44 | 2.90 dB       | empty      |
| `sql`                               | 38.000  | 609,024 | -13.62 | 0.823 | 0.22 | 1.62 dB       | empty      |
| `integration`                       | 38.000  | 609,024 | -13.58 | 0.960 | 0.66 | 5.46 dB       | empty      |
| _Ghost's `menu.mp3`, the reference_ | 40.000  | 665,252 | -11.59 | 1.138 | 30.7 | 42.50 dB      | —          |

- **No words.** faster-whisper `small.en` on this rig's GPU over each installed mp3, language `en`, beam 1, no
  VAD filter. All seven transcribe to the empty string — nought characters. A real word would have been a miss
  and a re-roll; none was. The first job's master was already empty too, which is what said the tags were
  carrying the rule before seven were spent on it.
- **Duration** is exactly 38.000 seconds on all seven, inside the 36 to 40 the brief sets and beside Ghost's own
  36 and 40.
- **Loudness** is integrated BS.1770-4 — K-weighting applied in the frequency domain, 400 ms blocks at 75 per
  cent overlap, absolute gate at -70 LUFS, relative gate 10 LU under the gated mean. Ghost's `menu.mp3` measures
  -11.59 on the same code. The widest distance from it is 2.03 dB and the narrowest 1.94, both inside the 3 dB
  the brief allows.
- **Size** is 609,024 bytes each, 594.75 KB, under the 700 KB budget. 48 kHz stereo at 128 kbps constant, which
  is `libsndfile`'s rung below Ghost's own measured ~133 kbps.
- **The seam** is read as the one-sample jump from the last frame back to the first against the median jump
  inside the file. The seven land at 0.22 to 0.66, all under one. The head/tail RMS gap is the weaker reading
  and is reported anyway: `csharp`'s 14.77 dB is two different chords fifty milliseconds either side of a bar
  line, not a hole — its join is the second cleanest in the set.
- **Listening is not claimed.** Claude cannot hear these. Every number above is measured; whether a bed is the
  right music for its stack is the Director's, from the installed paths.

`ffmpeg` is not on this rig, so the encode went through `libsndfile` by way of the repo's existing voice venv
(`soundfile`, which writes MP3 since libsndfile 1.1). The install is mp3 like Ghost's tracks, with no size cost
to report: flac masters would have been about 3.5 MB a bed, mp3 is 0.6.

### The shell

`apps/cabinets/src/typer-audio.ts` grows `VIBE_TRACK_KEYS` — the seven stacks, Ghost's `TRACK_KEYS` discipline
in the typing cabinet — and the machinery for one recorded bed at a time.

| Mode              | What plays                                 | What is scheduled                                    |
| ----------------- | ------------------------------------------ | ---------------------------------------------------- |
| `on`              | the level's stack bed, if its file is here | nothing else: no kick, no bass, no hat, no beats     |
| `on`, bed missing | the procedural bar, exactly as today       | the `on` bar, unchanged                              |
| `soft`            | the procedural hat, exactly as today       | the `soft` bar, unchanged; no file is ever asked for |
| `off`             | nothing                                    | nothing                                              |

The two sources are **one bed with two inputs and never play together**. `bedLevel()` returns zero while a
recording has the level, so the cue duck, the take duck and the tick all keep working and all agree; the bar is
not laid down at all while a recording plays, which also means the beats a user message could land on are gone,
exactly as in `off`.

- **Lazy, per stack.** `audio.setStack(stack)` runs on the audio's own frame and is idempotent. Asking is what
  fetches the file, on the same rule the piece tiles follow: a cabinet that plays one story level never fetches
  the other six stacks' music, and in endless a stack change costs one fetch. The mount also sets the stack the
  moment the engine is built, so the fetch starts on the first gesture rather than the first frame after it.
- **The tempo rule, in the same numbers.** The recording's `playbackRate` is `tempo / 96` — the very number the
  bar's own tempo is scaled by, taken from the same `tempo` variable, so the two sources cannot drift. At `on`'s
  96 bpm and 0.06 a step, vibes of 5 give 119.04 bpm, a rate of **1.24**; vibes of 1 give 1.00. It holds through
  a level's last request because `tempo` holds. `preservesPitch` is set where the browser has it, so a faster
  bed keeps its key. The context bar is never read.
- **The seam.** A hard loop on one element, as Ghost does, because the fold made the loop point continuous in
  the source. The 0.8 second crossfade — Ghost's `BED_FADE_S` — is spent where it is actually needed: handing
  the level between the procedural bed and a recording when a file arrives, and between two recordings when the
  stack changes. A bed that finishes leaving is paused and keeps its place, so returning to a stack picks the
  loop up rather than opening on the same bar every time.
- **The fallback is silence about it.** A file that 404s, a file that is broken, a Pages build with no
  `vibe/tracks/`, a browser with no media element at all: `playing` never leaves `null` and the procedural bed
  keeps the bar. Nothing yells, nothing waits, and there is no timer to wait on.
- **Mute is by hand.** The graph's mute is `master.gain`, and `master` cannot reach a media element. So a mute
  stops every recording at once rather than over a crossfade, and unmuting starts the one that has the level.

### The gates, and the tarballs

`checkDist` in `packages/launcher/scripts/build.mjs` now requires `play/vibe/tracks/<key>.mp3` **by name** for
every key in the Vibe layout, not just the directory, and `release.yml`'s tarball contract adds
`dist/play/vibe/tracks/` to the Vibe package's `carries`. The reason is the fallback above: a missing bed is
silent by design, which is right at run time and wrong at pack time, where the only sign would be a stack that
quietly never plays its music. Exercised both ways — with the seven removed from a built dist the gate halts
naming each file and exits 1; with them back it exits 0.

|                                  | Entries | Packed      | Unpacked    |
| -------------------------------- | ------- | ----------- | ----------- |
| `@mcptoolshop/vibe-typer` before | 131     | 2.38 MB     | 5.42 MB     |
| `@mcptoolshop/vibe-typer` after  | 138     | 6.41 MB     | 9.48 MB     |
| the seven beds                   | 7       | 4,263,168 B | 4,263,168 B |

The packed and unpacked deltas are the same 4.07 MB because mp3 does not compress. `@mcptoolshop/ghost-on-the-menu`
is 63 entries, 5.89 MB packed, and carries **zero** `dist/play/vibe/` or `dist/play/keys/` files — read off the
tarball's own file list rather than trusted to the gate.

### Tests

`apps/cabinets/test/typer-audio.test.ts` grows ten cases over a `FakeBed` the engine is handed through a maker,
so nothing in a test touches a real media element: the seven keys are the seven `STACKS` and the pack script
names each of them; a stack's bed plays under `on` and only once its file says it is ready; no bar is laid down
under a recording; `soft` and `off` never reach for a file and `soft` still lays its own hat; a missing file and
a run with no media element both fall back to the bar; the rate is 1.00 at one vibe and 1.24 at five and holds
through the last request; two beds cross without either being cut off; the take duck and the cue duck both reach
a recording at the same `DUCK`; a mute stops it at once and the end stops it for good; and a stack is asked for
once. An eleventh reads the seven files off disk and fails if one is missing or over 700 KB.
`typer-mount.test.ts` gains `track` in `debug()` and asserts it is `null` under `music: 'on'` in jsdom, which is
the no-audio path the fallback is for.

### Decisions

88. **`soft` gets no recorded bed, and that is not the slice-3 "left open" being ignored.** Slice 3 wrote that
    when the beds land, `soft` should get its own treatment rather than a muted `on`. It now has one, and the
    treatment is that it keeps the procedural hat. The modes are a choice between a pulse and a tick; handing
    `soft` a full arrangement at low volume would make it the loud mode under a quiet name, and a player who
    wants the music has `on` one line away. Seven more beds mixed for `soft` is a batch on its own approval, not
    a thing to decide inside this one.
89. **The two sources never overlap.** A recording could have played _over_ the bar, and that was the first
    shape tried. It is wrong twice: two tempos climbing the same curve from different sources beat against each
    other, and "falls back to the procedural bed" only means something if the procedural bed is not already
    playing. So `bedLevel()` returns zero while a recording has the level and `tick` lays no bar down, which
    also means the `ping` cue's beat-joined kick is gone under a recording — the same thing that happens in
    `off`, for the same reason, and it was already decided there (slice 3, decision 4).
90. **The seam is fixed in the file, not worked around in the shell.** Ghost hard-loops beds with seconds of
    silence on the end and hides it behind a 36 second hold and a crossfade to a different bed. Vibe Typer has
    no such schedule — a level can sit in one stack for minutes — so the hole would be heard every 38 seconds.
    A self-crossfading pair of elements per stack would also solve it and costs fourteen media elements, a timer
    and a second clock; folding one beat back over the first costs nothing at run time and makes the loop
    continuous in the source. The shell then sets `loop = true` on one element, exactly as Ghost does.
91. **The cut runs in the scratchpad and its parameters are in the receipt, rather than a script in the tree.**
    The avatar batch committed `cut-avatar.mjs` because it is node and rides the repo's own toolchain. This cut
    is numpy and `soundfile` and belongs to the voice venv; a python file under `apps/` would be in no test, in
    no lint and in no CI, which is a worse kind of unreproducible than none at all. Every number the cut used —
    the master, its body, the downbeat phase, the window start, the fold and the gain — is a field on that bed's
    receipt row, so the cut is reproducible from the master and the receipt.
92. **52 seconds asked for, 38 installed, and both numbers are in the receipt.** `seconds` in Ghost's rows is
    what was asked for. Here the two differ for a real reason, so the row carries `seconds_asked` and
    `seconds_installed` rather than one number that would have to mean whichever the reader needed.
93. **A minor across the set, because the cues are in A.** The brief said one key and left which open. `ROOT` in
    `typer-audio.ts` is 220 Hz, and every stinger in the cue table is built off it. A bed in A minor puts the
    deploy chord, the end chord and the milestone lift inside the bed's own key instead of a semitone away from
    it seven different ways.
94. **`BED_TRACK_LEVEL` is 0.5, and it is an element volume, not a bus gain.** The recordings do not go through
    the Web Audio graph at all — they are media elements, as Ghost's are — so they cannot sit at `BED_LEVEL`'s
    0.16 on the bed bus. Half volume on a bed mastered to -13.5 LUFS is roughly where 0.16 puts the procedural
    bar under the keystroke, and it is one `// Director` number to move if the Director hears otherwise.
95. **A bed that leaves is paused and keeps its place.** Ghost's rule is that a bed never restarts from zero,
    and it is right here for a different reason: in endless a run can cross back into a stack it has already
    played, and opening on the same eight bars every time would make the music read as a level marker. Pausing
    rather than leaving it running is the one departure — nothing here plays a run of beds the way a shift does,
    so a bed nobody can hear has no reason to keep decoding.
96. **The pack gate checks files, the run-time path checks nothing.** They are the same list and they disagree
    on purpose. At run time a missing bed must be invisible, because Pages and a half-built dist are both real
    and a player should get a cabinet that works. At pack time a missing bed must be a halt, because the tarball
    is the last moment anything can be noticed. `VIBE_TRACK_KEYS` is spelled twice — once in TypeScript, once in
    the pack script, which is plain node and may not import it — and a test fails the build if the two ever
    disagree.

### Standards

**NAMED_COMPENSATORS (3).** Two irreversible acts, both named with an owner in
`docs/art/receipts.json → vibe_typer_beds.compensators`. The generation is GPU seconds and cannot be undone;
its compensator is that nothing enters the repo until it is accepted, so an unaccepted job is a receipt row and
a Comfy library entry and nothing else — and there are none in this batch. The installed beds:
`git rm apps/cabinets/public/vibe/tracks/*.mp3` returns `music: on` to exactly today's procedural bed with no
other change, because `playing` then never leaves `null`; the one thing that does not return by itself is the
pack gate, so the same undo removes the `files` list from the vibe entry in `build.mjs` and
`dist/play/vibe/tracks/` from the vibe `carries` list in `release.yml`. Nothing is published, tagged or
released: both `package.json` versions stay `0.10.0`. No skip.

**PIN_PER_STEP (3).** Every generation is a receipt row with the template id, the seed, the bpm, the key, the
length, the lyrics field and its own color sentence verbatim, beside the GPU seconds it drew. ACE-Step on a
fixed seed is deterministic, and the masters are kept under `docs/art/originals-vibe-beds/` so the cut can be
re-run without re-generating. The cut itself is pinned by the six numbers on each row rather than by a script.
The tempo rule takes its number from the same `tempo` variable the bar uses, so it cannot be pinned to a
different value by accident.

**ANDON_AUTHORITY (3).** Three halts, all exercised. The no-words check is the first: an installed bed whose
transcript is not empty is a miss and a re-roll, run over all seven and green on all seven. The pack gate is the
second, and `packages/launcher/test/pack-gate.test.ts` exercises it against a real `dist` in a temp directory —
one bed missing, all seven missing, and all seven present — so the halt is proved and not described. The test
suite is the third: the seven keys must equal `STACKS`, the pack script must name each of them, every file must
exist and be under 700 KB, `soft` must never reach for one, and a bed the browser will not start hands the
level back to the bar instead of leaving the cabinet quiet.

**DECOMPOSE_BY_SECRETS (3).** What changes together is together. The bed list, the levels, the crossfade and the
tempo rule are all in `typer-audio.ts`, behind `setStack` and `track()`; the shell knows only which stack the
level is in and hands that over on the frame it already had. The pack gate knows the file names and nothing
about audio. `release.yml` knows one path prefix. Nothing in `packages/` moved at all, and the sim is untouched.

**UNCERTAINTY_GATED_HUMANS (2).** The two numbers the Director owns outright are `// Director` constants at the
top of their module, each with its decision and its reason beside the marker: `BED_TRACK_MODE`, which mode plays
a recording, and `BED_TRACK_LEVEL`, how loud it plays. `BED_TRACK_BPM` and `BED_CROSS_S` carry no marker because
neither is a free choice — the first is `BED_BPM`, which already has one, and the second is Ghost's
`BED_FADE_S`; both say so where they are declared. Every choice the brief left open is a numbered decision above
with its reason. The spend was approved as a batch before it ran, and the one
thing the batch could not resolve, whether these are the right seven pieces of music, is stated as not gated
and left to the Director, who hears them. What is not gated and should be named: the route moved from the local
GPU to the cloud on the reasons above, and that is written as a decision rather than asked as a question.

**EXTERNAL_VERIFIER (3).** Nothing here checks its own work. The music is written by ACE-Step and heard back by
faster-whisper, a different model from a different family, which never sees the tags — only the audio and the
question of whether there is a word in it. The loudness, the duration, the size and the seam are arithmetic over
the decoded samples, not a judgement. The builder does not review its own diff; the coordinator sends it to a
different family. And the one thing no verifier here can settle — whether the music is good — is not claimed by
the builder at all.

### Review (Kimi K2.6, from a packet)

Halt, four items. Three accepted and applied in the same commit, one refused. The two that matter both sit in
the same place: what happens when the recording does not play, which is the path the fallback exists for and
the one the first cut of this sub-slice tested least.

1. **The `// Director` marker on `BED_TRACK_MODE` and `BED_TRACK_LEVEL` is a quote.** **Refused.** It is not a
   quote; it is this repo's convention for a feel constant the Director owns, and the kickoff's own standards
   table asks for exactly that — feel numbers stay `// Director` constants or JSON levers. The markers stay.
   What the item was right about underneath is that a marker is not a reason: `BED_TRACK_LEVEL` carried only
   "a recorded bed's own gain" beside its marker, which says what the number is and not why it is 0.5. **Taken
   that far:** both comments now state the decision and its reason where the marker is, and the review also
   turned up a claim that was simply wrong — the standards paragraph said all four of `BED_TRACK_MODE`,
   `BED_TRACK_LEVEL`, `BED_TRACK_BPM` and `BED_CROSS_S` were `// Director` constants, and the last two never
   were. They are not free choices: one is `BED_BPM` and the other is Ghost's `BED_FADE_S`. The paragraph now
   says so, and so do the two declarations.
2. **`void el.play()` swallowed an autoplay rejection.** **Accepted.** The real failure is worse than an
   unhandled rejection in a console: `play()` does not throw when autoplay policy refuses it, it returns a
   promise that rejects, and by the time it rejects `pickTrack` has already set `playing`, dropped the bar's
   clock and started fading the procedural bed out. The cabinet would have gone quiet and stayed quiet, with a
   console error as the only explanation. **Applied:** `startTrack` now catches both shapes — the rejected
   promise and a synchronous throw — and hands the level straight back through a new `dropTrack`, which zeroes
   and pauses the element, removes it from `tracks` and restores the bed level over the same crossfade. Removed
   rather than kept, so `pickTrack` does not choose it again on the next level in that stack and fade the bar
   out once more for nothing; a rejection that lands after the stack has moved on changes nothing, because
   `dropTrack` checks that this bed still holds the level. Two cases cover it: an element whose `play()` rejects
   and one whose `play()` throws, both ending with the bar back and, for the rejecting one, a second visit to
   the same stack that does not try again.
3. **The pack-gate claim in `typer-audio.test.ts` only greps `build.mjs` for seven names.** **Accepted, and
   taken the stronger way rather than the weaker one.** The comment claimed the gate halts; the assertion
   proved only that two lists have not drifted. Both halves are now true.
   `packages/launcher/test/pack-gate.test.ts` builds a `dist` in a temp directory that passes every part of the
   gate — layout, needles, the other cabinet's needle absent — stubs `process.exit` and `process.stderr.write`
   so a halt is a throw the case can read, and runs `checkDist` three ways: all seven present and silent, one
   bed missing and halting with that file named and no other, and all seven missing and all seven named. The
   middle case is the one that matters, because six beds out of seven is exactly what a directory check waves
   through. The comment in `typer-audio.test.ts` is reduced to what its assertion proves and points here.
4. **`carries` only proves that some file under the prefix exists.** **Accepted.** `dist/play/vibe/tracks/` in
   the Vibe package's `carries` list would have passed on one bed out of seven. **Applied:** the seven paths are
   in that package's `need` list instead, derived by `map` from a `VIBE_BEDS` array so an eighth stack is one
   edit, and the redundant prefix is gone from `carries` — `dist/play/vibe/` already covers it, and two
   overlapping checks of different strengths is how the weaker one gets trusted. The comment says what is
   checked and why the tarball is the last place a missing bed can be noticed.

## Sub-slice B, batch four — the backdrop

**Branch:** `cabinet/vibe-typer-s4b4` from `9a8aa4b`, one commit, not merged, not pushed, nothing published.
`pnpm verify`, `pnpm build:play` and `pnpm build:launcher` (both packages) green; `npm pack --dry-run --json`
on both, measured against a clean build of `main`.

**Spend:** one generation, accepted on the first look. Nothing was re-rolled and nothing was refused.

That is worth a sentence, because the batch before it spent eight on one card. Seven of those eight went on
getting a 3:1 picture out of a 4:3 frame, and the fix was to ask the node for the canvas rather than to argue
with it in the prompt. This batch asked for 2048x1152 in the first call and spent its whole budget on the
drawing.

### What was built

```
apps/cabinets/public/vibe/field/backdrop.png  1280x720 RGBA opaque, 136,895 B, 32 colors.
apps/cabinets/scripts/cut-banner.mjs          + `flatten` and the `--flatten N` flag: a coverage-weighted
                                              median cut over the color histogram. This is the size gate.
                                              + `flattenArg`, which refuses a flag with nothing usable
                                              after it rather than skipping the pass in silence.
apps/cabinets/scripts/cut-banner.d.mts        + its type, and `flatten` on `cutSheet`'s options.
apps/cabinets/src/vibe-typer.ts               NARROW_PX, and `askBackdrop()` beside `askCards()`.
apps/cabinets/index.html                      `position: relative` on `.vibe`, the
                                              `.vibe.vibe-backdrop::before` rule, and one line in each of
                                              the two media queries that turn it off.
apps/cabinets/test/banner-cut.test.ts         + 8: the flatten's count, its determinism, that it leaves
                                              alpha alone, its refusal of a count under two, that it
                                              splits by coverage rather than by extent, and three on
                                              `--flatten`'s own validation (the review's item 4).
apps/cabinets/test/typer-backdrop.test.ts     7 tests: the installed file's size, shape, color count and
                                              opacity, the stylesheet's alpha and stacking, and the two
                                              media queries — including the one that holds the shell's
                                              NARROW_PX and the stylesheet's breakpoint together.
apps/cabinets/test/typer-mount.test.ts        + 5: the class goes on when the picture loads, stays off
                                              under reduced motion, stays off on a narrow field, leaves
                                              nothing behind when the file is missing, and does not go on
                                              after the field has gone.
docs/art/receipts.json                        + vibe_typer_batch_5: route, the `licence` pointer,
                                              acceptance with the contrast table, compensators, 2 rows.
.gitignore                                    + docs/art/originals-vibe-5/
```

### The route

`bfl/flux-2-max` through the official Comfy Cloud MCP (`partner_generate`, the workflow-persist path,
`Flux2ImageNode`) — the same route, and under the same `licence` block, as the four batches before this one.
Chained from the accepted seed milestone card (job `440d18ae`, seed 7607) by `prompt_id`, for palette weight
and pixel scale; that card is a cousin of the bash tile sheet, the device frames and the logo, so the room is
on the same palette as everything else on the field.

**2048x1152, and why not 1280x720.** Batch three established that the node honors `params.width` and
`params.height` within 256..2048 in steps of 32. 720 is not a multiple of 32, so the shipping size cannot be
asked for directly; 2048x1152 is the largest exact 16:9 the node will take, and it comes down to 1280x720 by
exactly 1.6.

### The prompt, verbatim

> In exactly the same chunky flat 16-bit arcade illustration style, palette weight and pixel scale as the
> reference image: one wide landscape illustration of a small office at night, filling the whole picture
> corner to corner, seen from behind an empty desk chair. The chair is in the foreground with its back to the
> viewer, empty, drawn as one flat dark shape. Beyond it stands a dark desk, and on the desk one computer
> screen seen from behind and slightly to one side with its light spilling forward: the visible face of the
> screen is one completely flat plain warm amber (#e8a04a) rectangle with absolutely nothing on it — no
> picture, no lines, no bars, no icons, no dots and no marks of any kind. Behind the desk is a window looking
> out on a city at night: a few small square lights scattered across dark towers, and nothing else. One plant
> in a pot stands beside the desk, and a few plain cables run down from the desk to the floor. The whole room
> is drawn in deep navy (#1b2440) and near-black (#101018), with slate blue (#6a8aaa) on a few edges; the
> only warm color anywhere is the amber of the screen and the small amber glow it throws on the desk and on
> the back of the chair. It is a dark picture on purpose: the middle of the picture, where the screen and the
> desk are, is the lightest part, and the top edge, the bottom edge, the left edge and the right edge are all
> deep navy and near-black with nothing bright in them at all. Everything is drawn perfectly flat with hard
> edges and no shading, seen straight on from behind the chair, with no tilted lines and no dramatic angle.
> There is no border, no outline, no frame, no box and no panel of any kind around the picture. Hard edges,
> flat colors, no gradients, no reflections, no noise, no texture, no vignette. No letters, no numbers, no
> words, no arrows, no symbols, no user interface labels, no text of any kind anywhere in the image.

It carries this slice's standing clauses: the style opening, every color by name and hex, the frame banned by
name (batch two's decision 48), and batch one's closing clause. American English throughout, checked before
sending.

### The one generation

| Generation | Seed | Size      | Verdict      | Glyph score | What it is                                                                                                                                                                                      |
| ---------- | ---- | --------- | ------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| backdrop   | 7701 | 2048x1152 | **accepted** | 0.0000032   | Everything the brief named, first look: the empty chair from behind, the amber screen with nothing on its face, a window with a handful of lit city windows, a plant, cables down to the floor. |

The glyph check matters more here than on any picture in this slice, and it is worth saying why rather than
just quoting the number. This is a room with a computer screen in it and a city full of lit windows behind
it, which is two invitations to write something. The screen came back as one flat amber rectangle and the
city's windows came back as plain squares: 0.0000032 on the generation and 0.000010 on the installed cut,
both three orders of magnitude under the 0.02 threshold, on the first look, with no re-cut and no re-roll.

### The flatten, which is a size gate

Straight off the resize the file was **1,534,868 bytes** against a 300 KB cap — five times over. The cause is
not the resize and not the encoder: the generation carries **33,330 distinct colors** in a picture that reads
as about a dozen. That is grain, the prompt bans noise and texture by name, and grain is precisely what a PNG
cannot compress.

So `cut-banner.mjs` gained `--flatten N`: a median cut over the color histogram — not over the pixels, because
921,600 pixels and thirty thousand colors are two very different numbers and the boxes only ever need the
second — splitting each box at its **coverage-weighted** median so a box that is mostly one shade does not
hand half its entries to a color nobody can see, and mapping every pixel to its box's weighted average.
Nothing in it is random and every sort is stable, so the same picture gives the same palette on any machine.

Measured across the range before choosing:

| Colors | Bytes       |
| ------ | ----------- |
| none   | 1,534,868   |
| 16     | 130,108     |
| 24     | 131,434     |
| 32     | **136,895** |
| 48     | 145,372     |
| 64     | 153,497     |

32 ships. Everything from 16 up is comfortably under the cap, so the choice is not about bytes at all: 32 is
the count at which the room's steps — the wall, the window frame, the sill, the desk, the floor and the glow
— each still have their own color, and the picture is a flat 16-bit illustration rather than a posterized
photograph. The size gate is a happy consequence of doing what the prompt asked for in the first place.

### The misses, stated

Two, and neither is defended.

1. **The grain is the cut's problem, not the model's solution.** The prompt bans noise and texture by name
   and the generation carries both, visible as a mottle on the wall. What ships is flat, but the flatness is
   `--flatten`'s and not the model's, and at full size the wall reads as a blotchy field rather than a clean
   one. At the 0.18 the field draws it at, none of that is visible — which is the only reason it ships
   rather than being re-rolled.
2. **A soft vignette at the corners**, which the prompt also bans by name. It survives the flatten as a
   slightly darker ring of colors. It is, if anything, useful at this alpha, because it pushes the room away
   from the field's edges — but it is not what was asked for and it is not called a style choice here.

### The contrast, measured

The Director set the starting alpha at **0.18** and asked what it costs the chat and the editor. The answer
is: nothing at all, and that is a fact about the panes rather than about the alpha.

**The panes are left opaque.** `.vibe-pane` keeps `background: #101018`, so the room does not show through
the chat or the editor and their contrast is not close to what it was but identical: `#e6e6e6` on `#101018`
is 15.17:1 with the room and 15.17:1 without it. A test holds that hex, so the numbers below cannot quietly
stop being true when somebody reaches for a translucent pane.

That is also the whole idea, and it is the brief's own words: the backdrop is _the room the field sits in_.
The panes are the screen furniture; the room is what shows between them, around them and behind the board
and the controls.

Where the room does show, the composite is `0.18 × backdrop + 0.82 × #0b0b0f`, because the pseudo-element
sits at `z-index: -1` and lands on the page's own near-black. Measured off the installed file:

| Where                                          | Worst background | label `#9a9aa6` | number `#e8a04a` | page text `#e6e6e6` | dots `#5b8c5a` |
| ---------------------------------------------- | ---------------- | --------------- | ---------------- | ------------------- | -------------- |
| the darkest color in the picture (50.1% of it) | `#0a0b10`        | 7.06:1          | 8.95:1           | 15.75:1             | 5.00:1         |
| the top 15%, where the board row sits          | `#191e25`        | 6.02:1          | 7.62:1           | 13.42:1             | 4.26:1         |
| the bottom 15%, the controls and the hint      | `#34240c`        | 5.38:1          | 6.81:1           | 11.99:1             | 3.81:1         |
| no backdrop at all, for reference              | `#0b0b0f`        | 7.06:1          | 8.94:1           | 15.74:1             | 5.00:1         |

"Worst background" is the brightest color covering at least half a per cent of that band, rather than the
single brightest pixel: the absolute lightest color in the picture is the screen's brightest amber and it
covers 0.00% of it, so holding the field to it would be measuring against something nobody can see.

Every piece of text on the field stays above 4.5:1 at its worst. The streak dots reach 3.81:1 in the bottom
band, and never appear there — in the board row, where they do appear, they are 4.26:1, and they are a run of
bullet characters carrying an `aria-label` rather than text.

**0.24 was measured and not taken**: it drops the board's labels to 4.08:1 against the same measure, which is
under the line. 0.12 was measured too and is indistinguishable from no room at all in the board row. 0.18 is
what ships.

### In the shell

`.vibe` gains `position: relative` and a `::before`. That is the whole of it.

The picture is **CSS on a pseudo-element, not a canvas layer**, and the reason is what is in front of it: the
chat and the editor are DOM panes, and a canvas cannot sit behind a DOM pane without giving the whole field a
stacking order to keep right. A pseudo-element costs nothing per frame, takes `cover` and `center` for free,
and — the part that matters most — lets the two media queries live in the stylesheet, so a window dragged
past the breakpoint answers with no listener and no resize handler anywhere.

It is a pseudo-element rather than the wrapper's own `background` because the picture is shown at an alpha of
its own and a background image has none; it is absolutely positioned so it is not a flex item of the column
it hangs off; and it is at `z-index: -1` so it sits behind the board, the panes and the controls and composites
against the page's near-black, which is the ground every number above was measured on.

**Three things have to be true before the class goes on.** The file has to load, the player must not have
asked for less movement, and the field must not be narrow. The shell asks `matchMedia` for the last two
before it asks for the picture at all, so a narrow or a calm client never fetches 137 KB it is not going to
draw. The stylesheet then carries the same two queries, which is what handles a window that changes after the
mount.

**Narrow is 900px**, which is not a new number: it is the breakpoint `.vibe-panes` already stacks to one
column at. On one column the room is behind a wall of text and buys nothing. That number now lives in two
languages — `NARROW_PX` in the shell and a `@media` block in the stylesheet — so `typer-backdrop.test.ts`
reads `index.html` and holds them together; change either and the suite says so.

**Missing is the quiet case.** There is no `error` handler, because there is nothing to undo: no element
stands in for the picture, so a file that never arrives leaves the class off, the custom property unset and
the field exactly as it was. jsdom is that case by default, which is the path most of the mount suite takes.

**The settings row gains no toggle.** A decision, below.

### In the shell, photographed

Played against the **built Vibe package bundle** (`packages/launcher-vibe-typer/dist`, served by the
package's own CLI on a local port), in a real browser at 1280x880, with synthetic `KeyboardEvent('keydown')`
typing about 20 ms apart, stopped two requests into a level-one run. Saved to `film/` (git-ignored):

- `film/backdrop.png` — 1264x593, the field with the room behind it: the window's lit squares across the
  board row, the desk edge and the floor glow in the gutters between the panes and under the controls, and
  the three panes sitting opaquely on top of it.

Read back out of the page at the same time: the wrapper carries `vibe-backdrop`, its `--vibe-backdrop` is the
build's own base plus `vibe/field/backdrop.png`, the computed `::before` is `opacity: 0.18`,
`background-size: cover`, `background-position: 50% 50%`, `z-index: -1`, and `.vibe-pane`'s computed
background is `rgb(16, 16, 24)` — opaque, as the contrast table assumes.

One note on the method, because it cost a retake: a `z-index: -1` pseudo-element paints **behind its
ancestors' backgrounds**, so a capture wrapper with an opaque background of its own hides the room completely.
The frame above is taken with that wrapper transparent and the page's near-black filled onto the output
canvas instead, which is what the browser itself does.

### The tarballs

Measured with `npm pack --dry-run --json` on a clean export of `main` at `9a8aa4b` and on this branch, after
`pnpm build:launcher` each time.

| Package                          | Tarball, main | Tarball, here | Δ        | Entries   |
| -------------------------------- | ------------- | ------------- | -------- | --------- |
| `@mcptoolshop/vibe-typer`        | 2,634,977 B   | 2,772,425 B   | +137,448 | 135 → 136 |
| `@mcptoolshop/ghost-on-the-menu` | 6,173,794 B   | 6,174,310 B   | +516     | 63 → 63   |

The Vibe package gains exactly one entry, `dist/play/vibe/field/backdrop.png`, and 136,895 B of it. Ghost
gains **no entries at all**: its file list was read and filtered for anything matching `vibe`, which came back
empty, rather than trusting `checkDist`'s stray check. Its 516 B is the shared `apps/cabinets/index.html`,
which is the source of both builds and now carries the room's rule — the same thing batch three's first cut
cost it before that batch moved its drawing to the canvas.

### The sim

Untouched: `git diff main --stat -- packages/` and `-- scripts/` are both empty, and so is
`git diff main --stat` over `README*`, `site/`, `CHANGELOG.md`, `catalog/` and `voice/`. Both play-throughs
were run on a clean export of `main` at `9a8aa4b` and on this branch and diffed line by line:
`pnpm test:play ghost --fixture naive-ndjson` and `pnpm test:play vibe-typer --tier 0 --bot typist:40` are
byte-identical across the two.

### Decisions

97. **The room is CSS on a pseudo-element, not a canvas layer.** The chat and the editor are DOM panes and a
    canvas cannot sit behind a DOM pane without the whole field growing a stacking order to keep right. A
    pseudo-element costs nothing per frame, takes `cover` and `center` for free, and lets both media queries
    live in the stylesheet — which is why a window dragged past the breakpoint answers correctly with no
    listener and no resize handler anywhere in the shell.
98. **The panes stay opaque, and the room is what shows around them.** This is the brief's own framing — the
    backdrop is the room the field sits in — and it is also the safest possible answer to "the chat and the
    editor must stay readable": with an opaque pane their contrast is not close to what it was, it is the
    same number. A translucent pane would have put a picture under the editor's own text, which slice 2 and
    slice 3 tuned, in exchange for an effect nobody asked for. A test holds the pane's background hex.
99. **0.18, measured rather than guessed.** The Director's starting number survived measurement and is what
    ships. Over the darkest half of the picture nothing on the field moves at all; in the board row the
    worst realistic background takes the labels to 6.02:1 and in the controls row to 5.38:1, both well over
    4.5:1. 0.24 was measured and refused, because it takes the labels to 4.08:1.
100.  **The picture is asked for only when it can be drawn.** `matchMedia` is consulted before the `Image` is
      built, so a narrow window or a player who asked for less movement never fetches 137 KB that the
      stylesheet is going to hide. The stylesheet carries the same two queries for everything that changes
      after the mount.
101.  **Narrow is the breakpoint that already existed.** 900px is where `.vibe-panes` stacks to one column, and
      a room behind a single column of text buys nothing. The cost of reusing it is that one number now lives
      in two languages, so a test reads the stylesheet and holds it to the shell's `NARROW_PX`.
102.  **There is no `error` handler on the backdrop, on purpose.** Everywhere else in this slice a picture that
      fails has something to undo — a face to remove, a Map entry to delete. This one has nothing: no element
      stands in for it, so a file that never arrives leaves the class off and the field exactly as it was. The
      absence is the fallback.
103.  **`--flatten` is a cut option, not a fourth script.** The backdrop is the same shape of problem
      `cut-banner.mjs` already solves — one picture in, one landscape rectangle out at an exact size — and the
      flatten is a pass over the result rather than a different job. A fourth script would have been a fourth
      copy of the PNG codec's import list.
104.  **32 colors, and the size gate is a consequence rather than the reason.** Every count from 16 up clears
      the 300 KB cap, so bytes did not pick the number; 32 is where the room's steps each still have their own
      color. That the same pass takes 1.5 MB to 137 KB is what makes doing the prompt's own bidding — flat
      colors, no noise — worth doing in the cut as well as in the prompt.
105.  **The median cut runs over the histogram and splits at the weighted median.** Thirty thousand colors is a
      small number and 921,600 pixels is not, and the boxes only ever need the first. Weighting the split by
      coverage is what keeps a box that is mostly one shade from spending half its palette on colors that
      cover a handful of pixels — which on a picture that is half near-black is most of them.
106.  **The settings row gains no toggle this batch.** The two media queries already answer the two reasons a
      player would want the room off, and they answer without being asked. A third control on a row that slice
      3 tuned, for a picture drawn at 18 per cent, is a lever looking for a problem. If the Director wants one
      later it is one checkbox and one class, and the fallback path it would use is already built and tested.

### Standards

**NAMED_COMPENSATORS (3).** Generation is an irreversible spend, so the compensators are named in
`docs/art/receipts.json → vibe_typer_batch_5.compensators` with an owner each. Nothing was rejected in this
batch, so nothing is a receipt row and nothing else; the one generation is installed and its original is
under the git-ignored `docs/art/originals-vibe-5/`. `git rm -r apps/cabinets/public/vibe/field` returns the
field to a plain dark page with no other change, because the class only goes on when the picture loads and
the stylesheet draws nothing without it. The branch is deletable until it is merged. No skip.

**PIN_PER_STEP (3).** The one row carries the model slug as the tool accepted it, the seed, the full prompt,
the job it chained from and the canvas it was generated at; the installed row carries the box, the rectangle
and the flatten it was cut with. The cut is a committed script with no dependency and no randomness — the
median cut sorts stably and takes no seed — so the same picture gives the same 32 colors on any machine, and
a test holds the installed file to that count. The alpha, the breakpoint and the two media queries are all
constants in files under review rather than numbers in a comment.

**ANDON_AUTHORITY (3).** Four halts. `ai-eyes image_contains` at 0.02 on the generation and on the installed
cut, before anything is installed. `cutSheet` still throws when the finished picture carries fewer than four
colors, so a flatten that collapsed the room to nothing is a re-roll and never an install. `typer-backdrop`
holds the installed file to its size, its shape, its color count and its opacity, and holds the stylesheet to
the alpha, the stacking and both media queries — so the room cannot quietly get brighter or start showing on
a phone. And the shell's own absence rule is a halt at run time: no file, no class, no element, no change.

**EXTERNAL_VERIFIER (3).** The glyph check is SigLIP2 through `ai-eyes`, a different model family from the
BFL model that drew the image, and it never sees the prompt. The contrast numbers are computed from the
installed file's own pixels against the WCAG relative-luminance formula, not judged by eye. The breakpoint
test reads the stylesheet as text rather than trusting the shell's copy of the number. The shell evidence is
the built Vibe package bundle photographed in a real browser with the computed styles read back. The diff
review is a different family, per the slice.

### Review (Kimi K2.6, from a packet)

The diff went to Kimi K2.6 as a packet — the lock, the brief and the diff with levers' lines, receipts,
images and the lockfile omitted — and came back **halt** with four items. The coordinator refused one and
accepted three. All four are recorded, refusal included.

| #   | Item                                                                                   | Disposition  | Where it landed                                                                 |
| --- | -------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------- |
| 1   | The `// Director` marker on the alpha in `index.html` reads as a quotation             | **refused**  | the marker stays; the comment beside it was rewritten                           |
| 2   | `askBackdrop`'s comment names the Director in running prose                            | **accepted** | `apps/cabinets/src/vibe-typer.ts`                                               |
| 3   | A test title in `typer-backdrop.test.ts` names the Director in running prose           | **accepted** | `apps/cabinets/test/typer-backdrop.test.ts`                                     |
| 4   | `--flatten` with no value, or a value that is not a number, silently skips the flatten | **accepted** | `apps/cabinets/scripts/cut-banner.mjs`, `apps/cabinets/test/banner-cut.test.ts` |

**Item 1, refused.** `/* // Director */` on a constant's own line is this repo's convention for a feel number
the Director owns, not a quotation of anything he said, and it is on dozens of constants across the shell
already. The marker stays. What was fair in the item is that a marker on its own says who owns a number and
nothing about why it is that number, so the comment beside it now carries the decision and its reason: kept
low so the board stays legible, measured rather than picked, with the contrast table in this document and
0.24 named as measured and refused.

**Items 2 and 3, accepted.** The marker convention is for a constant's own line. Everywhere else, prose says
the decision and the reason and does not say whose decision it was — which is this slice's standing rule and
is the shape every other comment in these four batches already takes. The comment on `askBackdrop` now reads
"at the low alpha the stylesheet owns", and the test is now called _draws the room low and behind everything,
so the board stays legible_. Neither says anything new; both say it the way the rest of the file does.

**Item 4, accepted, and it was a real hole.** `Number(undefined)` is `NaN`, `NaN > 0` is false, and
`cutSheet` skipped the flatten without a word. On this batch's own picture that is the difference between
136,895 bytes and 1,534,868 going into the repo, with nothing on the terminal to say which one had happened —
the failure mode is not a crash, it is a file that looks exactly like one that was asked for. `flattenArg` is
now exported, validates `Number.isInteger(n) && n >= 2`, and throws with the value it was given; the runner
catches it, writes the message and the usage to stderr and exits 2, **before** it goes looking for the input
file, so the message is about the flag rather than about a missing picture. Six unit tests cover the bad
values and the absent flag, and one more runs the script with `spawnSync` and holds it to a non-zero exit, the
usage on stderr and no `ENOENT` in it.

**One thing item 4 uncovered, fixed with it.** Rewriting the runner showed that two edits from batch three
had silently failed to apply: the usage string still read `[--frame]` with no mention of `--key`, and the
`colors` field meant for the run's stdout was never there. Both were non-asserting string replacements
against a line prettier had already reflowed, so nothing said they had missed. The usage now names all three
flags and the run prints its color count, which is the number a `--flatten` run most wants to see. It is a
documentation defect rather than a behavior one — `--key` has worked correctly since batch three and its
tests have covered it — but it is the second time in this slice that a non-asserting replacement has quietly
done nothing, and that is worth writing down rather than just fixing.
