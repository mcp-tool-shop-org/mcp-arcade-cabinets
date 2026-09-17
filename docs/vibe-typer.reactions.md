# Vibe Typer — the reactions, one line per request

**Date:** 2026-09-17. **Builder:** Opus, in a worktree. **Record:** the lead's, from the builder's report, with the lead's read and rewrite at the end.
**Brief:** the reactions authoring run owed at the top of `HANDOFF.md` since wave 5 of Stage B.
**Shape it fills:** `reaction` beside `ask` on a corpus snippet — `src/corpus.ts` (`loadStack`),
`src/lines.ts` (`LinePicker.reaction`), `src/types.ts`, `test/corpus.test.ts`.

Until this run the user's reaction to a shipped piece came from the generic reviews: the pool the
lead rewrote after 0.11.0 to hold lines that are true of **any** request, because the per-topic pool
was keyed to the snippet's code construct and the tier pools named pieces the request had never
asked for (seventy of a hundred and eight of them). That was the right answer to nonsense on the
field and the wrong answer to the game: a level says four things back and all four were true of
anything. This run writes the other pool — **a line per request**, held to that request by a gate.

## Standards compliance

| Standard                 | Score | Evidence                                                                                                                                                                                                                                                                                                                                       |
| ------------------------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PIN_PER_STEP             | 3     | Every call's model, temperature and the sha256 of its exact prompt text are in the receipt under `authoring/`, writer and editor alike, and the voice sheet's own hash beside them. The candidates file carries every line the gate saw, kept and dropped, so the run reads back without the models.                                           |
| ANDON_AUTHORITY          | 3     | Three gates halt rather than mend: the script's per-snippet gate drops a candidate and never edits it; the corpus loader refuses a `reaction` that fails `lineFault`, carries `{title}` or leans on a story with no `for`, at import, before a cabinet starts; and `test/corpus.test.ts` refuses the whole corpus on a stray piece or a twin.  |
| NAMED_COMPENSATORS       | 3     | The run performs no irreversible call. It writes six JSON files in the worktree and files under `authoring/`; the compensator is `git checkout -- packages/vibe-typer/patterns/corpus`, owner the builder. Nothing publishes, tags, releases or leaves the machine — both models are local daemon calls to Ollama.                             |
| DECOMPOSE_BY_SECRETS     | 2     | The reaction lives beside its own ask in the same row of the same file and shares its `for` binding, so the two lines that change together are stored together and a level's premise is named once. The slot reuses the script's transport, receipt and gate code rather than copying it. The editor prose is its own, because it reads pairs. |
| UNCERTAINTY_GATED_HUMANS | 2     | Twenty lines are tabled below with their asks so the lead reads the voice without opening a JSON file, and the ids the builder is least sure of are named. The lead plays a transcript before merge, per the rule 0.11.0 taught. No checkpoint blocks the run itself, which writes nothing a `git checkout` does not undo.                     |
| EXTERNAL_VERIFIER        | 3     | The lines are read back by a family that wrote none of them, and the script refuses to seat an editor of the writer's family at all — the run halts before the first read. The editor never rewrites: it names rows and reasons, the writer answers the reason once, and a line that falls twice is left empty.                                |

## The gates a line passed

In order, and every one of them drops rather than mends:

1. **`lineFault`**, the package's own, bundled in process by the script so it cannot drift from the
   game's: no digit, no barred word, nothing outside plain keyboard characters, no exclamation, no
   word in capitals, one sentence at most and twelve words at most.
2. **American English**, `britishHit` from the same bundle.
3. **A floor of four words.** The ceiling is `lineFault`'s twelve; the sheet's own register is five
   to ten.
4. **`{product}` is the one hole**, at most once. Any other brace is a drop, `{title}` included —
   the row the corpus loader refuses.
5. **The piece rule, against the line's own ask.** A word in `PIECES` may appear in the reaction
   only when the ask already says it, plural-aware both ways. This is the rule the run exists for:
   the allowance is the request's own words and nothing wider, so a player who reads the ask and
   then the line finds the line true of the ask.
6. **The story binding.** A reaction that names a story noun — duck, sandwich, sock, cat, opinion,
   stroke, toy — must sit on a snippet that says which level it is for, through the same `for` the
   ask uses. The corpus loader holds this one again at import.
7. **No line twice**: not across the corpus, and not against any line already in
   `patterns/user.json` — the generic reviews, the check-ins, the tier pools. `lineKey` normalizes
   to letters, so a line that differs only in its period is the same line.

One preference sits on top of the gate and is not part of it: where more than one candidate passed,
the plain one is taken over the mannered one — no comparison, not ending on "now", and none of the
three frames the passes below name. Choosing among lines that all passed is not editing one into
passing.

## What the script gained

`scripts/author.mjs` grew one target, `run --only snippet-reactions`, beside the `reactions` target
that writes the by-topic pool. It reads each stack's snippets, sends the ask, the code, the level's
product and situation where the snippet is bound, and the piece words the ask contains; it carries
the voice sheet in the system prompt of every call and the lines it has already kept in the body;
it holds each candidate to that snippet's own gate; and it writes candidates and a report under
`authoring/` before `--apply` writes anything into the corpus. `--editor <spec>` seats the second
family in the same invocation, so one receipt covers the writing, the reading and the re-ask.

Three things in it are worth keeping for the next run:

- **`askSlot` takes a gate the key chooses.** Every other slot passes one function; this one passes
  `{ forKey }`, because the allowance is different for every id.
- **The holes are asked again.** A chunk of thirty-six came back with keys for about two thirds of
  it — no truncation, no parse error, the writer simply decided it had written enough. Naming the
  count and the last id in the prompt closed most of that; a smaller chunk closed more; neither
  closes it every time. Two further rounds over what is left, each at a smaller chunk than the last,
  and the receipt says what never landed.
- **Serial, by construction.** Two hundred and forty-nine lines are one pool for the purpose of not
  repeating themselves, and two calls in flight are two writers who cannot hear each other. This is
  the shape the check-in slot learned the hard way in slice 3. The editor's read has no memory to
  share, so it is the one stage `--concurrency` still widens.
- **A top-up, not a rewrite.** A request that already carries a line keeps it and is not written
  again; `--revoice` writes all of them fresh. That is what makes the pass resumable, and resumable
  is not a nicety here — see the abandoned invocation below.

## The receipt

Writer **`mistral-large-3:675b-cloud`**, family mistral. Editor **`glm-5.3-flash:cloud`**, family
zhipu — a family that wrote none of these lines, and the script halts before the first read if the
two families match. Both through the local daemon at `127.0.0.1:11434`, `/api/chat`, streaming,
`keep_alive: 0`; nothing left the machine. Writer temperature 0.9, editor 0.3. Chunk 25, three
candidates per request. Writer calls serial throughout.

| pass             | what it did                                         | writer calls | editor calls | wall    | applied |
| ---------------- | --------------------------------------------------- | ------------ | ------------ | ------- | ------- |
| pilot, chunk 40  | 143 of 249 came back clean                          | 7            | —            | 2m 33s  | no      |
| pilot, chunk 25  | 204 of 249                                          | 10           | —            | 2m 38s  | no      |
| one invocation   | abandoned, nothing on disk (below)                  | ~14          | some         | ~19m    | no      |
| the writing      | 249 of 249 over three rounds                        | 14           | —            | 3m 19s  | yes     |
| the read         | 14 dropped, 14 re-asked, 14 refilled, 0 left empty  | 1            | 10           | 5m 52s  | yes     |
| the closing tic  | 54 stripped and written again; 16 dropped, 16 back  | 4            | 10           | 12m 19s | yes     |
| the three frames | 113 stripped and written again; 21 dropped, 21 back | 9            | 10           | 33m 16s | yes     |

Seventy-five calls, **79 minutes of wall clock** including the abandoned invocation, inside the
ninety the brief allowed. The cloud was slow all morning — a one-word prompt to the editor's tag
timed at 53 s and to the fallback tag at 35 s — and that, not the work, is where the clock went.

**Lines written 249. Dropped by the editor and not recovered: none. Left empty: none.** Every one of
the 249 requests carries a line; 249 of them are distinct; the shortest is five words, the longest
eleven, the mean 7.5. No request was left unwritten and none had to be abandoned.

The gate's own drops, per applied pass, are in the receipts. They are dominated by one reason in
every pass — a candidate naming a piece the request did not ask for (a fridge, a yogurt, a list, a
countdown) — which is the rule working: those are the lines that shipped on 0.11.0 and the Director
read them.

**What was abandoned, and why it is in the table.** The first attempt ran the writing, the read and
the re-ask as one invocation with `--apply`, and `--apply` only fires when the slot returns. Nineteen
minutes in, with the writer long finished and the editor queueing behind a slow cloud, there was
still nothing on disk and no way to see how far it had got. It was killed, the slot was given the
top-up rule and a line of progress per call, and the same work then ran as writing-then-reading, each
its own invocation and its own receipt. Nothing was lost but the time.

## The tics, and why the pass ran four times

The first pass wrote a pool, not a voice. Each time, one frame took a fifth of the lines — and the
model was not repeating a line, it was repeating a sentence with the nouns swapped, which the
duplicate gate cannot see and the editor, reading each row against its own ask, has no reason to
name. Each was found by **counting the pool after it landed**, written into the rules as a "do not",
added to the preference that chooses among passing candidates, and the lines carrying it were
stripped and asked again.

| the frame                                                | lines it held | what was done                                          |
| -------------------------------------------------------- | ------------- | ------------------------------------------------------ |
| "like a firefly", "like a polaroid", "like a cereal box" | about 1 in 3  | rule, preference; the whole pass rewritten             |
| the line ending on "now"                                 | 54 of 249     | rule, preference; those 54 stripped and written again  |
| "without a fuss", "little", "knows its own"              | 113 of 249    | rule, preference; those 113 stripped and written again |

Where they ended: comparisons 0, lines ending on "now" 0, "little" 0, "knows its own" 1, "without
a ..." 3. Two smaller ones survive, are counted here rather than chased, and are the first thing a
next pass should take: **"sits there waiting" and its forms, 19 of 249**, and **"they line up", 12**
(seven of those are "just how i wanted"). They were left because a fourth strip costs another full
editor read — half an hour at the morning's cloud speed — for a frame that holds one line in
thirteen rather than one in five, and because a pool with no recurring turn of phrase at all is not
a voice either. That was the builder's judgment, and the lead reversed half of it (below). The opener is
the other shape a reader will notice: 136 of 249 lines begin with "the", which is what the plainest
English does when it names the thing the request named.

The lesson for the next bulk-authoring run, and it is the same shape slice 3 learned about chunk size
and memory: **count the pool when it lands.** A form gate, a duplicate gate and a per-line editor all
pass a pool that says the same thing two hundred times; only a count over the whole pool sees it. The
preference costs nothing — the lines were already written and already through the gate.

## Twenty of them, beside the request they answer

The sheet for the lead. Four levels' worth, in the order the level plays them.

| id                 | the request                                               | the line                                          |
| ------------------ | --------------------------------------------------------- | ------------------------------------------------- |
| cal-sh-d1-001      | have {product} say hello to visitors                      | my cousin asked for this exact hello              |
| cal-sh-d1-002      | use her name in the greeting                              | the greeting now knows her name by heart.         |
| sh-for-loop        | show every toy she has reviewed                           | she can see them all at once.                     |
| cal-sh-d1-005      | make a live folder then delete it                         | {product} made a folder and let it go.            |
| cal-py-d1-003      | give every duck driver a first and last name              | every driver sits there with a name               |
| cal-py-d2-002      | make {product} greet every duck by name                   | the duck now hears her name back.                 |
| cal-py-d2-001      | find the total and the average duck fare                  | the duck fares know their own total.              |
| cal-py-d1-004      | split one bill among five ducks                           | five ducks now share the bill without squabbling  |
| cal-sq-d3-004      | make a table for every plant and its spot                 | the table holds every plant and its favorite spot |
| cal-sq-d3-005      | spot the plants that got water or new soil                | it finds the thirsty ones before i even check     |
| cal-sq-d3-003      | label every plant by size along with its type             | the labels sit there waiting for the garden club  |
| cal-sq-d3-002      | find the plants that need more water than their roommates | the thirsty ones now stand out.                   |
| cal-jv-d2-004      | list every lost sock by color                             | the list shouts every color back at me            |
| cal-jv-d3-001      | keep only the socks with no partner                       | the lonely socks now stand out proud              |
| cal-jv-d3-003      | pair every sock with its current location                 | the pairs march in perfect order                  |
| cal-jv-d2-003      | count down until {product} goes live                      | it builds the drama just right                    |
| cal-js-d5-002      | merge two worn opinions into one slightly used opinion    | the opinions now hold hands and become one        |
| cal-cs-d2-004      | count down from five until {product} is live              | five seconds until the whole room cheers          |
| cal-py-d5-003      | grab every app page at once                               | every page now arrives before i finish my thought |
| java-try-resources | load the regulars from the member file                    | it loads them while i stretch my legs             |

## What the editor caught, in its own words

Twenty-one rows in the last pass, fifty-one across the three. It is worth reading a few, because they
are the failure the gate cannot see — a line that passes every mechanical rule and still answers a
request that was not made:

- `cal-sh-d6-003`, "{product} saves the old ones and forgets the rest." — _"not true of the request:
  it says the old ones are saved and the rest forgotten, the reverse of backing up the data and
  erasing the ancient ones"_
- `java-optional`, "the sock now knows its own little owner" — _"names something the request never
  asked for — the sock having an owner, when the request is the no-owner fallback"_
- `cal-jv-d4-002`, "every member has their usual spot now." — _"not true of the request, which pairs
  each member with their usual order, not a usual spot"_
- `js-class`, "the trip now knows how long it took." — _"answers the trip-timing request, not this
  one"_

Every one of the fifty-one went back to the writer once with that clause in front of it, and every
one came back clean. None was left empty, so the generic-review fallback — which is still there and
is still right for the integration stack, whose snippets are minted at play time and proofread by
nobody — was never needed here.

## The lead's read, and what it changed

Three levels as a player through `pnpm transcript vibe-typer`: duck rides at tier zero, the sandwich
ledger at hardcore, the lost socks at tier one. Every line answered the request two lines above it.
The level's last ship says the product's review, not a reaction, which is the sim's design and reads
right: the review closes the product. What did not read right was the frame the builder counted
and left. "Sits there waiting for me" is true of anything, which is the blind pool's defect in a new
coat, and "just how i wanted" says nothing about the piece. Twenty-nine lines were rewritten by hand
in the user's voice, each held to its own ask by the same gate (the lead's patch ports `lineFault`,
the piece rule, the story binding and the twin rule, and refused one line for naming a drawer its
ask had not), and the corpus tests and the transcripts were read again. The lines that name the
thing ("every driver sits there with a name", "the team sits there with their raise") stayed.

After the rewrite: "sits there" four, "line up" six, "just how i wanted" none. The rule
this run confirms is the one 0.11.0 taught: the lead reads content as a player before it ships, and
a count over the whole pool is part of that read.

## What to read for, next run

The transcript, as a player, per the rule 0.11.0 taught. Three things worth watching:

1. **Does the line answer the ask that is two lines above it on the field?** That is the whole claim
   of this run, and it is the one thing no test can check.
2. **Four lines in a row.** The gate is per line; a level is four. The shapes are varied now, but the
   lead is the first reader who sees four of them stacked.
3. **The hardcore tier.** The reaction is the same line at every tier — a snippet's own line does not
   climb — so a level that reads warm at tier zero reads the same warm at tier three.
