# Vibe Typer, slice 3, sub-slice C — endless on a model

What was built, what it refuses, what a real seat wrote, and every decision the
brief was silent on. The kickoff is `docs/vibe-typer.kickoff-s3.md`; the lock is
G23–G30 in `docs/vibe-typer.dispatch.md`, with the inherited G11 to G14 and G17
where a model sits.

## Standards compliance

| Standard                 | Score | Evidence                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PIN_PER_STEP             | 3     | `ENDLESS_SYSTEM` is a frozen string and the prompt is built from a closed view; the schema both tiers answer through is one exported constant; the model is named per call by the caller and reported in every `sit` line. The sim's own draws stay seeded, and a test asserts the same feed twice gives a deep-equal state.                                     |
| ANDON_AUTHORITY          | 3     | The code gate refuses on the first failure and never repairs; a refusal stops that request dead. `pnpm verify`, the band bar and the launcher's marker gate all halt the build. The route answers in words and never passes a status code to the field.                                                                                                          |
| NAMED_COMPENSATORS       | 3     | This sub-slice performs no irreversible call. The one irreversible act is the branch push; the compensator is `git push origin --delete cabinet/vibe-typer-s3c`. Nothing here publishes, tags, releases or writes outside the repo. The `sit` script writes only to `film/`, which is ignored.                                                                   |
| DECOMPOSE_BY_SECRETS     | 3     | Four things change on four clocks and live in four files: the gate's rules (`codegate.ts`, pure), the sim's buffer (`sim.ts`, `level.ts`), the seat's prompt and transport (`cabinet-server/src/endless.ts`), and the two node routes. The shell knows about a buffer and a route and nothing about a model.                                                     |
| UNCERTAINTY_GATED_HUMANS | 2     | `pnpm sit --cabinet vibe-typer` exists so the Director reads ten real asks and their code before the seat is trusted on the field; the numbers and the samples are below. The feel numbers are `// Director` constants at the top of `codegate.ts` and the shell. No checkpoint blocks play, because nothing here plays without the Director turning the box on. |
| EXTERNAL_VERIFIER        | 3     | The seat's output is judged by a mechanical gate the seat never sees, in a different package, written from the corpus rather than from the model. The band bar measures the seated ladder against the unseated one. The diff review is a different model family, per the slice's standing frame.                                                                 |

## G28, as implemented

The kickoff amends G28: **in endless mode a seated model writes the product, the
ask, the code, the title and the notes, behind two gates; in the listed levels
everything stays authored and on the corpus.** That is what is here.

- The **code gate** is mechanical and new: `packages/vibe-typer/src/codegate.ts`.
- The **chat gate** is the existing one, `lineFault`, applied by the code gate to
  the ask, the title, every note and the product.
- The seat's **nags and reactions** are not in this sub-slice. A sibling adds the
  nag pools and the sim's nag event; the seat writing them is a later pass.
- Levels stay the band's ground. A listed level ignores the buffer entirely, and
  a test asserts it.

## Files

| File                                           | What                                                                               |
| ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| `packages/vibe-typer/src/codegate.ts`          | new — the code gate, pure, no `node:`                                              |
| `packages/vibe-typer/src/types.ts`             | `Snippet.ask?: string` (identical to the sibling's, so the merge is a no-op)       |
| `packages/vibe-typer/src/level.ts`             | `endlessBandAt`, `levelSeedFor`, `endlessPeek`; `PlanOpts.supplied` and `.product` |
| `packages/vibe-typer/src/sim.ts`               | `RunContext.supplied`; `feedRequests`, `suppliedCount`, `suppliedAsks`, `corpusOf` |
| `packages/vibe-typer/src/index.ts`             | the barrel                                                                         |
| `packages/vibe-typer/test/codegate.test.ts`    | new — one case per refusal reason, one acceptance per stack                        |
| `packages/vibe-typer/test/sim.test.ts`         | new describe: the seat's requests                                                  |
| `packages/vibe-typer/test/band.test.ts`        | new describe: endless with a seat                                                  |
| `packages/vibe-typer/test/helpers.ts`          | `DriveOpts.supply`, `seatFeed`, `seatFiller`                                       |
| `packages/cabinet-server/src/endless.ts`       | new — the seat: the frozen prompt, the schema, the two tiers                       |
| `packages/cabinet-server/src/client.ts`        | `chatJson` (no tools, a JSON schema, the low-think retry)                          |
| `packages/cabinet-server/src/index.ts`         | the exports                                                                        |
| `packages/cabinet-server/test/endless.test.ts` | new — the prompt, the parsing, the tiering, the transport                          |
| `packages/launcher/src/allow.ts`               | `ENDLESS_PATH`                                                                     |
| `packages/launcher/src/serve.ts`               | `parseEndlessView`, `endlessRoute`, the dispatch, `ServeOpts.endlessModule`        |
| `packages/launcher/test/serve.test.ts`         | the route and the view, over a real socket with a fake seat module                 |
| `packages/launcher/scripts/build.mjs`          | the marker gate's new needles                                                      |
| `apps/cabinets/vite.config.ts`                 | `cabinetEndless()`                                                                 |
| `apps/cabinets/src/vibe-typer.ts`              | the seat in the controls row, the probe, the prefetch, the standup line, `debug()` |
| `apps/cabinets/test/typer-mount.test.ts`       | new describe: the endless seat, mounted                                            |
| `scripts/sit.mjs`                              | `--cabinet ghost\|vibe-typer`, read before anything else                           |
| `scripts/sit-vibe.mjs`                         | new — the live measurement                                                         |

## The code gate, in order

First failure wins, and the reason is always the cheapest true thing to say.
The gate **accepts or refuses; it never fixes**.

| #   | Check                                                                                                                                         | Reason              |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 1   | shape: an object with string `ask`, `code`, `title`, an array of strings `notes`, optional string `product`; and the code, trimmed, non-empty | `empty`             |
| 2   | plain printable ASCII and newlines only                                                                                                       | `not-ascii`         |
| 3   | no tab, no carriage return inside a line                                                                                                      | `tab`               |
| 4   | at most twelve non-empty lines                                                                                                                | `too-many-lines`    |
| 5   | every line at most eighty columns                                                                                                             | `too-wide`          |
| 6   | `()[]{}` balanced over the block, quotes balanced inside each line                                                                            | `unbalanced`        |
| 7   | the stack's language, by the table below                                                                                                      | `wrong-language`    |
| 8   | no barred word anywhere, comments included                                                                                                    | `barred-word`       |
| 9   | no model, tool or company name anywhere (`MODEL_FORBIDDEN`)                                                                                   | `names-a-model`     |
| 10  | the difficulty formula's value inside the band's own corpus range                                                                             | `value-out-of-band` |
| 11  | the ask: ASCII, no `{title}`, no stray brace, then `lineFault`                                                                                | `bad-ask`           |
| 12  | the title: ASCII, then `lineFault`                                                                                                            | `bad-title`         |
| 13  | at most three notes, each ASCII and through `lineFault`                                                                                       | `bad-notes`         |
| 14  | the product, when present: ASCII, `lineFault`, at most eight words                                                                            | `bad-product`       |

The accepted snippet is
`{ id, stack, band: bandMin, title, code, notes, topics: [], ask }`.

**The barred list.** `BARRED_IN_CODE` is `VOICE_FORBIDDEN` **without its digit
branch**, because an index, a port and a column number are all digits and all
ordinary in code. Every word of that list is still refused anywhere in a seated
snippet, comments included — which does mean a seat may not write python's
`pass`, may not name a variable `score`, and may not write `FAIL` in a shell
script. Seven shipped corpus snippets carry one of those words; they are corpus,
not seat, and the gate never sees them. A test asserts the two lists stay in
step.

**The band range.** `bandRange(corpus, set, stack, bandMin, bandMax)` is the
least and the most any corpus snippet of that stack inside the range is worth by
the same formula the score pays on (G24), widened by `VALUE_TOLERANCE = 0.15`
either way. It is scoped to the **stack** because the stacks are not comparable:
a Java method and a shell line of the same band differ by far more than the
tolerance, so a corpus-wide range would gate nothing. When the corpus has nothing
in that range the gate refuses rather than guessing a ceiling — which is what
happens for `integration`, whose snippets are seasoned in from the tapes at plan
time and are not in the shipped corpus.

### The language table

`needs` is every-of, `must` is any-of, `mustNot` is none-of. A cheap table, not a
parser: it catches a model that answered in the wrong language, which is the
failure that actually happens.

| Stack         | needs | must (one of)                                                                                                                      | mustNot                                                                 |
| ------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `bash`        | —     | a line starting `echo export read cd mkdir cat grep sed awk for while case if [`, or `$…`, or a pipe, or a shebang                 | `console.log`, `System.out`, a `def name(` line                         |
| `csharp`      | `;`   | `var using namespace public private protected static class new string int bool double float long decimal char object void Console` | `System.out`, a `def name(` line, `console.log`, an `echo ` line        |
| `java`        | `;`   | `var public private protected static final class void String int boolean double float long char new System import java`            | `Console.Write`/`WriteLine`, a `def name(` line, `console.log`, `echo ` |
| `javascript`  | —     | `const let var function return import export class await async new`, or `=>`, or `console.`                                        | a `def `/`elif `/`print(` line, `System.out`, a `SELECT`/`INSERT` line  |
| `python`      | —     | a line starting `def class import from for if while with try except return print( @`, or an assignment                             | a line ending in `;`, a `) {` block opener, `console.log`, `System.out` |
| `sql`         | —     | `select create insert update delete from where join alter drop with group by order by` (any case)                                  | a `def `/`function `/`const `/`echo ` line, `console.log`               |
| `integration` | —     | `tools/call`, or `"method":`, or a line opening `{`, or a bare tool name                                                           | a `def `/`function `/`const `/`echo `/`SELECT ` line                    |

Java and C sharp overlap on purpose — `public class Thing {` is both — so each
names the other's give-away in `mustNot`. Measured against the whole shipped
corpus: **every snippet of every stack matches its own row and no other's**, and
a test asserts it, so the table cannot rot silently.

## The seat's prompt

Frozen, in `packages/cabinet-server/src/endless.ts`:

```
You are the user of a coding agent in an arcade cabinet. You cannot write code,
you are fond of the agent, and the things you want are absurd and sincere.
Answer with one JSON object and nothing else.
```

The user half is built from the view and nothing else — the product, the team as
one word (shell, python, script, sharp, java, tables, wires), the language to
write in, the band as a feeling (easy / warm / hot / hotter, by `bandMin`), the
last three asks, the weak pairs, and the field rules. It is **fact-blind (G12)**:
no tape, no receipt, no valuation, no corpus, nothing measured. It throws if
`FORBIDDEN` matches the finished text, exactly as `sayPrompt` does.

One deliberate exception to the throw: a weak pair is two characters out of real
code and can be a digit or a bracket, so pairs carrying a digit are **dropped**
before the text is built rather than thrown on. A leak anywhere else still
throws, and a test covers both.

## The two routes

`/cabinet/endless`, on both node sides, the same envelope as `/cabinet/say`:
post only (405), json only (415), a thirty-two kilobyte cap (413), a four
hundred millisecond minimum between asks and one in flight (429), and **words,
never a status code, on a failure** (`{ "error": "no answer" }` or
`{ "error": "model retired" }`).

The wait is **twenty seconds**, not the say seat's twelve: the seat writes a
whole snippet rather than one line, and the slowest accepted answer measured
below took fourteen and a half seconds. Nothing waits on it — the shell
prefetches during the request in hand and the corpus plays if it is late
(G11, G13) — so the ceiling only has to clear a slow answer.

What the route will accept as a view, bounded before it reaches the prompt:

| Field                 | Bound                                               |
| --------------------- | --------------------------------------------------- |
| `product`             | a non-empty string, cut to a hundred and twenty     |
| `stack`               | the seven stacks, a closed set, else refused        |
| `bandMin` / `bandMax` | whole numbers one to seven, min no greater than max |
| `recent`              | at most three strings, each cut to two hundred      |
| `weak`                | at most twenty-four strings, each cut to two        |
| `newLevel`            | true only when it is literally `true`               |

## The prefetch bookkeeping

In `advance`, immediately after `drainEvents` — the one place that knows a
request has just been paid for, and the place where a late answer costs the step
nothing.

The shell asks when all of these hold: the run is endless, `LOCAL_SEATS` is on,
the box is checked, a daemon answered, no call is in flight, and
`suppliedCount(state) + given < requests`, where `requests` is the **next**
level's count from `endlessPeek` and `given` counts the slots this level has
already handed to the corpus. A refused answer is re-asked **once** for the same
slot; a second refusal gives that slot up silently and the status line says
`seat: the authored pool`. `given` resets when the level index moves.

The view's `stack`, `bandMin` and `bandMax` come from `endlessPeek`, which plans
nothing: it draws the next endless level's definition from a fresh stream of the
same seed. That matters, because the fed snippet carries the stack the gate was
told, and a level's creep line is drawn from the level's own stack — telling the
seat the current level's language would mix two languages inside one level.

The status line, in the controls row and never on the field:
`seat: looking for a daemon` → `seat thinking` while a call is in flight →
`seat: <the model's tag>` when an answer is accepted → `seat: the authored pool`
when the box is off, the daemon is down, or two answers in a row were refused.
The tag carries digits; the controls row is not the field, exactly as Ghost
prints its own beside the mute button, so G17 holds. The standup, which **is**
the field's end card, says only `the user was a model` or
`the user was the authored pool`.

## The marker gate

Measured, not assumed: a Pages build **keeps** `/ollama/api/tags`,
`Ollama bosses`, `/cabinet/say`, `/cabinet/endless` and `Model user`, and
**strips** `data-local-seats` and `data-vibe-seat`. So the brief's condition for
adding `/cabinet/endless` as a needle — survives in the launcher build, gone from
the Pages build — is not met by the path, and gating the fetch behind
`LOCAL_SEATS` the way Ghost does would not change that, because Ghost's own path
needles survive too. The needle that actually discriminates is the mount mark,
so `data-vibe-seat` was added as the endless seat's, set on the controls row only
when `LOCAL_SEATS && opts.endless`. `/cabinet/endless` is in the list as well,
since a missing one is still a broken pack, and the comment in `build.mjs` now
says which needles are load-bearing and which are belt.

## `pnpm sit --cabinet vibe-typer`

`scripts/sit.mjs` reads `--cabinet` before anything else — Ghost is the default
and its path is unchanged byte for byte — and hands the rest of the argv to
`scripts/sit-vibe.mjs`. That script bundles `vibe-typer` and `cabinet-server`
in-process with esbuild, asks the seat for each slot of each level in wall-clock
time, gates every answer, re-asks once on a refusal, feeds the accepted ones, and
plays the run with a perfect typist.

```
pnpm sit --cabinet vibe-typer --model gpt-oss:120b-cloud,kimi-k2.6:cloud \
         --levels 3 --tier 0 --bot perfect
```

### The numbers, measured on this rig, 2026-09-15

Three levels, tier zero, perfect typist, seed one. No `ANTHROPIC_API_KEY` on this
rig, so both seats sat in the cloud tier.

| Model                | Asks | Accepted | Latency min / middle / most | Refusals by gate reason                                                                                                            |
| -------------------- | ---- | -------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `gpt-oss:120b-cloud` | 20   | 7        | 1450 / 1967 / 2491 ms       | too-wide 7, bad-notes (more than one sentence) 3, bad-notes (forbidden word or digit) 1, bad-notes (not ascii) 1, wrong-language 1 |
| `kimi-k2.6:cloud`    | 17   | 7        | 3373 / 6428 / 8308 ms       | too-many-lines 6, not-ascii 1, too-wide 1, unbalanced 1, value-out-of-band (over) 1                                                |

Both runs reached four levels and played every request the seat wrote: seven of
sixteen requests in each run came from the model, the rest from the corpus.
Valuation 760 (gpt-oss) and 942 (kimi) against 651 for the same seed with no seat
at all — the seated runs pay more because the seat's snippets sit at the top of
the band's range, which is exactly what the tolerance allows and no more.

The two seats fail differently and that is the useful finding: **gpt-oss writes
too wide** (one-line C sharp programs at a hundred and thirty columns) and
over-writes its notes; **kimi writes too long** (fifteen to twenty lines). Both
are caught mechanically, both are re-asked once, and neither reaches the field.

Two tags on this rig are dead and were not usable: `qwen3-coder:480b-cloud` and
`deepseek-v3.1:671b-cloud` both answer 410 "was retired". Note that the daemon's
retired reason is lost on a non-200 by the existing `chatOnce`, which maps any
non-404 failure to `ollama down`; the say seat has always had this shape and it
is not reopened here.

### Ten sampled asks with their code

From the run above. The Director's read, not a test.

**`kimi-k2.6:cloud`, bash, band one — `make {product} show only the prime weekends in one year`** — "prime weekend finder"

```bash
#!/bin/bash
for w in {1..52}; do
    f=0
    for d in 2 $(seq 2 $((w-1))); do
        [ $((w%d)) -eq 0 ] && f=1
    done
    [ $f -eq 0 ] && echo "weekend $w is prime"
done
```

**`kimi`, bash — `make {product} whisper the next weekend's moon phase`** — "weekend moon whisperer"

```bash
#!/bin/bash
moon=$(( ($(date +%s) / 86400 + 4) % 29 ))
if [ $moon -lt 7 ]; then
    phase="waxing"
elif [ $moon -lt 15 ]; then
    phase="full near"
else
    phase="waning"
fi
echo "next weekend moon: $phase"
```

**`kimi`, bash — `make {product} hum a tune for saturday morning`** — "weekend morning hum generator"

```bash
#!/bin/bash
weekend_hum=("do" "re" "mi" "fa" "so" "la" "ti")
day_of_week=$(date +%u)
if [ "$day_of_week" -eq 6 ]; then
    for note in "${weekend_hum[@]}"; do
        echo -n "$note "
        sleep 0
    done
    echo
fi
```

**`kimi`, csharp, band two — `make {product} hum a lullaby when sad`** — "sad mood lullaby"

```csharp
using System;

class LaundryOracle {
    static void Main() {
        string[] moods = {"sad", "tired", "calm"};
        foreach (var m in moods) {
            if (m == "sad") {
                Console.WriteLine("hmm hmm hmm... gentle cycle");
            }
        }
    }
}
```

**`kimi`, csharp — `let {product} sort hats by brim size`** — "sort hats by brim width"

```csharp
using System;
using System.Linq;

class HatSorter {
    static void Main() {
        string[] hats = { "tiny", "wide", "medium", "extra wide" };
        var sorted = hats.OrderBy(h => h.Length);
        foreach (var h in sorted) Console.WriteLine(h);
    }
}
```

**`kimi`, csharp — `let {product} trade hats by moon phase`** — "moon phase hat pricing"

```csharp
using System;
class HatMarket {
    enum Phase { New, Waxing, Full, Waning }
    static void Main() {
        var today = Phase.Full;
        var price = today == Phase.Full ? 50 : 20;
        Console.WriteLine($"Hats cost {price} moons tonight.");
    }
}
```

**`gpt-oss:120b-cloud`, bash — `show weekend summary using {product} in a simple table`** — "weekend summary table"

```bash
printf "day  count\n"
printf "sat   %d\n" 5
printf "sun   %d\n" 3
total=$((5+3)); printf "total %d\n" "$total"
```

**`gpt-oss`, bash — `display weekend summary using {product} in a simple table`** — "weekend table output"

```bash
printf "sat sun\n"
printf "---- ----\n"
date +"%a %d" | head -n2
printf "\n"
```

**`gpt-oss`, csharp — `can you show a sunrise greeting for {product}`** — "sunrise greeting"

```csharp
using System;
class P{
static void Main(){
string name="friend";Console.WriteLine($"good morning {name}");
}
}
```

**`gpt-oss`, csharp — `use {product} to deliver sunrise vibes`** — "toast drone greeting"

```csharp
using System;
class P{static void Main(){
Console.WriteLine("hello everyone");
Console.WriteLine("good morning, sunrise!");
}}
```

The taste reading, for the Director: kimi writes the funnier ask and the more
interesting code and takes three times as long; gpt-oss is quick and literal and
its C sharp is ugly (it collapses braces onto one line, which is legal and
unpleasant to type). Neither is nag-worthy on its own and both are better than a
template with a title hole, which is what slice one shipped.

## The band

`pnpm test:play vibe-typer --endless yes --tier 0 --bot perfect` with the seat
off is **byte-identical to `main`**: the same level, the same product, the same
four chat lines, valuation 1829, twenty-one pieces, six levels. So is
`pnpm test:play vibe-typer --tier 0 --bot typist:40`. Every old bar in
`band.test.ts` holds unchanged.

One bar was added, `describe('endless with a seat')`: for each of the three
seeds, a perfect typist at tier zero with a synthetic feed of gated corpus
snippets lasts **at least as many levels** and ships **at least as many pieces**
as the same seed with no feed, the valuation never falls (`drive` throws if it
does), and no streak drops without a cause. The feed is the corpus itself, put
through the same code gate a model's answer goes through and fed the same way —
G11's swap, with the seat replaced by the authored ground.

The sim's own determinism is unchanged and newly re-asserted: an empty buffer
gives a state that stringifies identically to a run that was never fed, and the
same feed twice gives a deep-equal final state.

## Decisions

Numbered, with the reason, for everything the brief did not settle.

1. **`bandRange` takes the stack.** The brief wrote
   `bandRange(corpus, set, bandMin, bandMax)`. Scoped corpus-wide the range spans
   a shell one-liner to a Java class and gates nothing; scoped to the stack it is
   a real bound. The stack is already in the gate's context, so the parameter
   costs nothing.
2. **The gate returns the product beside the snippet.** `Snippet` has no product
   field and should not grow one — a product belongs to a level, not to a piece
   of code. `gateCode` returns `{ ok: true, snippet, product? }` and the caller
   passes the product to `feedRequests` as its third argument.
3. **`feedRequests(state, items, product?)`.** The brief's two-argument shape is
   kept and the product is an optional third, so the sibling branches see an
   additive change. The first product offered for a buffer wins and the planner
   drops it once a level has taken its requests.
4. **A snippet id is a hash, not a counter.** `seat-<hash of the code, base
thirty-six>` rather than `seat-<n>`, because a counter is state and the same
   candidate must gate to the same verdict every time. A caller may still pass
   its own `id`.
5. **The tab reason fires.** The brief's order puts the ASCII check before the
   tab check, which would make `tab` dead code, since a tab is not printable
   ASCII. The ASCII class excludes the tab and the carriage return so the more
   specific reason wins. Same verdicts, better words.
6. **A trailing carriage return is normalized, not refused.** The shape step
   trims trailing whitespace per line, which takes a CRLF ending with it, so a
   model on a Windows host is not punished for its file endings. A carriage
   return **inside** a line is still refused.
7. **`BARRED_IN_CODE` is the barred list minus the digit branch.** Stated in the
   brief; recorded here with its cost: a seat may not write python's `pass`, a
   variable named `score`, or `FAIL` in a shell script.
8. **The ask may carry `{product}` and nothing else in braces.** Measured on a
   live seat: a model told it "may use a placeholder in braces" wrote the product
   itself in braces — `make the {dashboard for weekends} show a moon` — and the
   braces would have landed on the field, because `fill` only replaces the exact
   hole. The prompt now names `{product}` literally and the gate refuses any
   other brace as `bad-ask (stray brace)`.
9. **Every text field must be plain ASCII too.** Measured on a live seat: a note
   came back with a non-breaking hyphen, which `lineFault` has no opinion about
   and the editor cannot render. The ask, the title, each note and the product
   are all checked, each under its own reason.
10. **The prompt says digits belong in the code.** Measured: told to spell every
    number out, a seat wrote `for (int i = one; i <= three; i++)` and
    `head -n six`. The rule now reads: the ask spells numbers out, the code uses
    ordinary digits.
11. **`num_predict` is seven hundred, not four hundred.** Measured: four hundred
    cut a full answer off in the middle of the code field, and a truncated object
    parses to nothing. The prompt bounds the code to twelve lines and eighty
    columns, and seven hundred is the room that bound needs once JSON escaping is
    paid for.
12. **`chatJson` keeps `chatTools`' low-think retry.** Measured:
    `gpt-oss:120b-cloud` asked with `think: false` spends its whole budget
    thinking and answers with nothing at all — twenty-four asks, zero requests.
    With the same one-retry-and-remember shape `chatTools` already has, the same
    model accepts seven of twenty. The retry is the difference between that seat
    working and not existing.
13. **A call with no tools sends no `tools` key.** An empty array is not the same
    request to every daemon, and the endless seat pulls no lever. Ghost's path
    always passes at least one tool, so nothing there moves.
14. **`product` is required in the schema and may be empty.** A strict Claude tool
    schema wants every property in `required`; an empty string is how a seat says
    it has no new product, and the parser drops it.
15. **`ServeOpts.endlessModule` is optional and falls back to `sayModule`.** It is
    the same bundle in the shipped package. Optional keeps the launcher's `cli.ts`
    and the existing route tests untouched, and named separately lets a caller
    light one seat without the other.
16. **`endlessPeek` rather than replaying the planner in the shell.** The shell
    needs the next level's stack, band and product one level early. Reaching into
    the seeded stream from the shell would rot the moment `endlessDef` changes;
    `endlessPeek` lives beside `endlessDef` in `level.ts` and cannot drift.
    `endlessBandAt` is exported too, as the brief names it, and is the formula
    `endlessDef` itself now uses.
17. **The prefetch bound is the next level's request count.** The brief wrote
    `planOf(state).requests`. In endless the two are the same number, and the
    next level's is the one that is actually being filled.
18. **A creep is still drawn for a seated request.** The creep is a mechanic, not
    a property of the corpus, and a seat-fed level that could never scope-creep
    would play differently from a corpus one for no reason. The creep line still
    comes from the corpus.
19. **The seat is shown the asks already in its buffer.** Measured: filling four
    slots for one level, a seat wrote the same request twice, because the asks it
    had just written were nowhere in `state.chat` for `recent` to find.
    `suppliedAsks(state)` puts them in front of the chat's own.
20. **`data-vibe-seat` is the marker-gate needle, not `/cabinet/endless`.**
    Measured both builds; see "The marker gate" above.
21. **`debug()` on `VibeMount`.** The mount exposes nothing else, and the test
    needs to see that a gated answer reached the buffer and a refused one did
    not. It returns four numbers and no text, so nothing about it can reach a
    player.
22. **Refusals are counted, never shown.** The counts live in the mount for the
    test and for a future standup line; the field and the chat never learn that
    an answer was refused. G25: nothing yells, and a silent fallback is the
    quietest thing there is.
23. **The seat's checkbox is only built in endless.** A listed level ignores the
    buffer entirely, so a box that does nothing would be a lie. In a listed level
    the controls row carries no `data-vibe-seat` and the shell makes no call.
24. **The status line may print the model's tag; the standup may not.** The
    controls row is outside the field, as Ghost's is, and a player who turned the
    seat on is owed the name of what is sitting in it. The standup is the field's
    end card and says `the user was a model` instead (G17).
25. **`--cabinet` is read before `parseArgv`.** The typing cabinet's flags are not
    Ghost's, and Ghost's parser halts on a flag it does not know. Reading and
    stripping `--cabinet` first keeps Ghost's path byte-identical, which is the
    thing that must not move.
26. **`seatFeed` and `seatFiller` live in `test/helpers.ts`.** Both the sim test
    and the band bar need the same gated corpus feed, and the band's `drive` loop
    is where the `supply` hook has to be. One copy, one place.

## Irreversible actions

None in this sub-slice. Nothing is published, tagged, released, or written
outside the repo; `scripts/sit-vibe.mjs` writes only into `film/`, which is
ignored. The one irreversible act is pushing the branch, and its compensator is
`git push origin --delete cabinet/vibe-typer-s3c`.

## What this sub-slice did not do, on purpose

- The seat's **nags and reactions**. A sibling adds the nag pools, the per-snippet
  `ask` on corpus snippets, the `story` and pinned `snippets` on levels, and the
  sim's nag event; the seat writing nags is a later pass, and nothing here
  touches `stepRun`, `sendLine`, `ship` or `enterRequest`.
- The **container tools** `product`, `ask` and `react`. That is slice four; the
  MCP contract (`catalog/tools.json`, `contract.ts`, `server.ts`) is untouched.
- American English, the settings row and the beat words — sub-slice A.
- Any art, any level, any translation.
