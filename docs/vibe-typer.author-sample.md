# Vibe Typer — the authoring sample

**Date:** 2026-09-15. **Level:** `duck-rides` (python, the product written brand-free as "a rideshare for ducks"). **Candidates per line:** 3, of which the script keeps the first that passes the gate.

Three writing models were asked the same four questions about the same ten pieces of code. Nothing below was edited: every line is what the model wrote, and a dash means no candidate for that line passed the gate.

## The seats that did not answer

Asked, retried once, and gone. The receipt keeps the calls; the tables leave the column out so they stay readable.

| model                             | what came back                                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `ollama:deepseek-v3.1:671b-cloud` | ollama deepseek-v3.1:671b-cloud: HTTP 410 — deepseek-v3.1:671b was retired at 2026-07-15 00:00:00 -0700 PDT (twice) |

## The models and the prompts

| model                               | slot      | prompt sha256 (first sixteen) | temperature |
| ----------------------------------- | --------- | ----------------------------- | ----------- |
| `ollama:kimi-k2.6:cloud`            | asks      | `07a941cf282592dd`            | 0.9         |
| `ollama:kimi-k2.6:cloud`            | nags      | `c5b3675adfbc6e0b`            | 0.9         |
| `ollama:kimi-k2.6:cloud`            | reactions | `87de735da4d25565`            | 0.9         |
| `ollama:kimi-k2.6:cloud`            | replies   | `556c5ed571037f2f`            | 0.9         |
| `openrouter:openai/gpt-6-astra`     | asks      | `07a941cf282592dd`            | 0.9         |
| `openrouter:openai/gpt-6-astra`     | nags      | `c5b3675adfbc6e0b`            | 0.9         |
| `openrouter:openai/gpt-6-astra`     | reactions | `87de735da4d25565`            | 0.9         |
| `openrouter:openai/gpt-6-astra`     | replies   | `3a5135827ff34496`            | 0.9         |
| `ollama:mistral-large-3:675b-cloud` | asks      | `07a941cf282592dd`            | 0.9         |
| `ollama:mistral-large-3:675b-cloud` | nags      | `c5b3675adfbc6e0b`            | 0.9         |
| `ollama:mistral-large-3:675b-cloud` | reactions | `87de735da4d25565`            | 0.9         |
| `ollama:mistral-large-3:675b-cloud` | replies   | `729427b635402c9c`            | 0.9         |

The replies slot asks each model to answer its own check-ins, so the two tables read as one exchange; its prompt hash therefore differs per model by design. The other three prompts are byte-for-byte the same for every model.

## The asks

What the user asks for, before the agent writes that piece.

| piece                                                          | ollama:kimi-k2.6:cloud                        | openrouter:openai/gpt-6-astra                               | ollama:mistral-large-3:675b-cloud                        |
| -------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------- |
| `cal-py-d1-001`<br><sub>print hello world</sub>                | make {product} say hello to the user          | have {product} say hello to the world                       | make the screen say hello world for the {product}        |
| `cal-py-d1-002`<br><sub>variable assignment and addition</sub> | add two numbers to show a fare total          | show the total for fares of ten and twenty                  | add two numbers together for the {product} pricing       |
| `cal-py-d1-003`<br><sub>basic string concatenation</sub>       | join first and last name for {product}        | show our duck rider's first and last names together         | combine a first and last name for the {product} profile  |
| `cal-py-d1-004`<br><sub>integer division and modulo</sub>      | work out full cars and spare ducks            | show full groups and leftovers for seventeen ducks in fives | split seventeen into fives and show how many fit         |
| `cal-py-d1-005`<br><sub>boolean comparison</sub>               | check if a duck is old enough                 | show whether our duck rider is at least eighteen            | check if someone is old enough for the {product}         |
| `cal-py-d2-001`<br><sub>simple for loop with accumulator</sub> | add up every fare and find the average        | show the total and average of our ten duck fares            | calculate the total and mean of ten numbers              |
| `cal-py-d2-002`<br><sub>function returning a greeting</sub>    | greet a duck by name with custom words        | greet riders by name, using hello unless i choose otherwise | make a friendly greeting for the {product} users         |
| `cal-py-d2-003`<br><sub>while loop countdown</sub>             | count down from ten until the ducks depart    | count down from ten, then announce liftoff for our ducks    | count down from ten for the {product} launch             |
| `cal-py-d2-004`<br><sub>list slicing and reversal</sub>        | pull out early and late rides and reverse all | show the first three snacks, last two, and reversed menu    | — <sub>too many words 8, forbidden word or digit 2</sub> |
| `cal-py-d2-005`<br><sub>dictionary iteration</sub>             | show each duck rating and the overall average | show each duck student's grade and the class average        | list all names and scores then find the average          |

## The check-ins

What the user sends while the agent is still typing.

| check-in | ollama:kimi-k2.6:cloud | openrouter:openai/gpt-6-astra   | ollama:mistral-large-3:675b-cloud |
| -------- | ---------------------- | ------------------------------- | --------------------------------- |
| `nag-1`  | is it ready yet        | how's our little app?           | how close are we                  |
| `nag-2`  | is it live yet         | is it live yet?                 | did it deploy                     |
| `nag-3`  | did it go up yet       | did it deploy yet?              | my cousin is asking               |
| `nag-4`  | let me see it          | can i peek yet?                 | almost there                      |
| `nag-5`  | my cousin is asking    | my cousin wants an update       | what does it look like            |
| `nag-6`  | does it work yet       | are we nearly a business?       | why is it taking so long          |
| `nag-7`  | how much longer now    | does the button work yet?       | i need this soon                  |
| `nag-8`  | hello are you there    | is now a launch time?           | can you speed up                  |
| `nag-9`  | is it still building   | is the dashboard awake yet?     | is it working yet                 |
| `nag-10` | show me the thing      | ready for one admiring visitor? | i’m excited to see                |

## The reactions

What the user says when that piece is live.

| piece           | ollama:kimi-k2.6:cloud                               | openrouter:openai/gpt-6-astra                                         | ollama:mistral-large-3:675b-cloud                                     |
| --------------- | ---------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `cal-py-d1-001` | the greeting quacks exactly like a welcome should.   | oh good, the greeting makes this pond feel like an airport            | oh wow the greeting just appeared like magic                          |
| `cal-py-d1-002` | the table adds up the bread crumbs perfectly.        | lovely, the total makes our duck fares look wonderfully official      | numbers adding themselves together is my new favorite feature         |
| `cal-py-d1-003` | the greeting now knows every duck by name.           | the full name makes every duck sound like a distinguished commuter    | concatenation is my new favorite way to name ducks                    |
| `cal-py-d1-004` | the table splits seventeen ducks into neat groups.   | perfect, the division leaves exactly enough ducks for a bonus boat    | the remainder is here to remind us that ducks love leftovers          |
| `cal-py-d1-005` | the button confirms our ducks are all grown up.      | lovely, the age check gives our duck drivers grownup responsibilities | twenty five is officially an adult in duck years                      |
| `cal-py-d2-001` | the loop adds up every bread crumb so gracefully.    | that loop adds everything up like a very diligent pond accountant     | the loop just tallied everything and the ducks are clapping           |
| `cal-py-d2-002` | the greeting adapts to each duck so sweetly.         | oh lovely, the greeting knows which duck deserves the little bow      | the greeting function is now saying hello to every duck               |
| `cal-py-d2-003` | the loop counts down to liftoff with perfect drama.  | that countdown loop makes a puddle crossing feel gloriously aerospace | the countdown is running and the ducks are holding their breath       |
| `cal-py-d2-004` | the list shows exactly which fruits come first.      | lovely, the reversed list is our snack cart driving backward          | the list just sliced itself and the ducks are taking notes            |
| `cal-py-d2-005` | the table shows every duck and their bright numbers. | oh lovely, the table gives our duck academy graduation energy         | the dictionary just spilled all its scores and the ducks are cheering |

## The agent's replies

What the agent answers, to that same model's check-in of the same number.

| check-in | ollama:kimi-k2.6:cloud                  | openrouter:openai/gpt-6-astra                                         | ollama:mistral-large-3:675b-cloud   |
| -------- | --------------------------------------- | --------------------------------------------------------------------- | ----------------------------------- |
| `nag-1`  | Nearly there, adding the final sparkle. | Our little app is growing manners while I finish its edges.           | Almost done with the last piece     |
| `nag-2`  | It is practically breathing on its own. | Not quite live, I'm still stitching the welcome mat into place.       | Deploying now in my mind            |
| `nag-3`  | Rising like a very polite balloon.      | I'm finishing deployment, and our little app has packed beautifully.  | Your cousin has great taste         |
| `nag-4`  | You will love this next part.           | Absolutely, you can admire it while I finish sewing its pockets.      | So close I can taste it             |
| `nag-5`  | Tell them the wait is worth it.         | Tell your cousin I'm typing with the entire extended family in mind.  | A shimmering delight of logic       |
| `nag-6`  | It is already humming a tune.           | Nearly a business, I'm just giving the ambition somewhere to sit.     | Good things take the time they take |
| `nag-7`  | Just a few more careful strokes.        | I'm finishing its click, and it already looks wonderfully buttonlike. | I’m on it with all my heart         |
| `nag-8`  | Right here and typing happily away.     | I'm still typing the launch bits, and I love your enthusiasm.         | My fingers are dancing faster       |
| `nag-9`  | Building and blooming as we speak.      | It's stretching while I type the rest of its morning routine.         | It’s waking up right now            |
| `nag-10` | The thing is going to shine.            | I'm finishing the welcome, with plenty of room for their admiration.  | I’m excited for you too             |

## What the gate dropped

**`ollama:kimi-k2.6:cloud`** — kept 40 of the 40 lines.

Nothing was dropped.

**`openrouter:openai/gpt-6-astra`** — kept 40 of the 40 lines.

Nothing was dropped.

**`ollama:mistral-large-3:675b-cloud`** — kept 39 of the 40 lines.

| reason                  | candidates dropped |
| ----------------------- | ------------------ |
| too many words          | 9                  |
| forbidden word or digit | 4                  |

## Latency and cost

| model                               | wall time, four calls | tokens in | tokens out | cost              |
| ----------------------------------- | --------------------- | --------- | ---------- | ----------------- |
| `ollama:kimi-k2.6:cloud`            | 754.7 s               | 3471      | 26345      | no per-token cost |
| `openrouter:openai/gpt-6-astra`     | 97.0 s                | 3459      | 3128       | $0.1972           |
| `ollama:mistral-large-3:675b-cloud` | 24.7 s                | 3574      | 1699       | no per-token cost |

## For the Director

Pick: ____

The pick, the exact model id, the prompt hash and the date go into `docs/vibe-typer.slice3.md` before the full authoring run. The full run is pinned to that pick: the same model and the same prompt hash is the replay.
