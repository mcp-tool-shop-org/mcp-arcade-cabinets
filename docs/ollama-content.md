# Ollama content — decisions (2026-09-10)

The session after v0.3.0: the Ollama boss seat, then other content Ollama can add through the pattern levers. Kickoff: `docs/ollama-content.kickoff.md`. Lock: G1, G7, G8, G9, G10 in `docs/study-swarm.dispatch.md`. Version stays 0.3.0 on `main`; nothing here is tagged.

## What was sat

Measured with `pnpm sit` (new, `scripts/sit.mjs`): the real sim, the real `/api/generate`, the sweeper bot as the ship, wall-clock time so Cloud latency counts, lamps kept up so every boss on the tape is met. Tape `naive-ndjson`, tier 1 (seat).

| Model                         | Beats      | Fallbacks | Mean answer | Verbs it reached for                                | Voice seat              |
| ----------------------------- | ---------- | --------- | ----------- | --------------------------------------------------- | ----------------------- |
| `gpt-oss:120b-cloud`          | 8          | 0         | ~550 ms     | spread mostly; column on drift-column; hold on hold | all three bosses picked |
| `kimi-k2.6:cloud`             | 7          | 0         | ~1.5 s      | spread, fog, column, hold                           | all three bosses picked |
| `qwen2.5:7b-instruct` (local) | probe only | 0         | ~40 ms      | hold for every view at temperature 0                | not sat                 |

The Director's own play on the local shell is still the read that matters; the browser pane in this session never painted a frame, so the feel below is by the numbers and the sim tests, not by hand.

## What was found

**The Cloud boss was not sitting.** `gpt-oss` on Ollama Cloud ignores `think: false` on `/api/generate` (and on `/api/chat`): it spends all sixteen tokens thinking, `response` is empty, and the parser fell back to `script` every beat. The v0.3.0 seat with the default model was the scripted boss with a checkbox on. Fix in `pilot.ts`: ask short with `think: false`; if the response is empty and `thinking` is not, ask again with `think: 'low'` and a 96-token budget, and remember the model needs it. Low thinking answers a verb in about half a second. Non-thinking tags never pay the retry.

**The view was thin.** The shell passed `motion 'fight'` for every beat and named health against a max of 8 while bosses have 52–58 hp, so every prompt read `health high`. The view now carries the phase's motion word from `bosses.json`, the stick (`still` / `left` / `right`), and health against the boss's real max. The frozen system sentence did not change. A prompt with a digit or a fact word still throws.

**Two of six verbs were the same shot.** On tiers 1–3 `aim` is on, so `spread` and `column` both became one aimed shot. They are distinct now, through a new lever, and `hold` is felt.

**Three Cloud tags in the picker are retired upstream** (`deepseek-v3.1:671b-cloud`, `gemini-3-flash-preview:cloud`, `qwen3-coder:480b-cloud`): `/api/tags` still lists them, the Cloud answers `error: … was retired`. The seat now surfaces that beside the picker (`seat: model retired`) and the sim keeps the script. `glm-5.3-flash:cloud` reasons in the response body and never lands a verb in sixteen tokens; it parses to `script`.

## What was built

### The boss seat, felt (`pilot.ts`, `sim.ts`, `fire.json`)

One verb per beat, spent by the sim at the boss's next fire beat, asked again once spent (not on a clock), so a fast tag sits every beat and a slow one is never asked twice for one beat.

| Verb     | What the sim makes of it                                                                                                                |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `spread` | A fan of `pilot.fan` shots across `pilot.spread` of the field, straight down. A wall to weave, not a tracked shot.                      |
| `column` | While pending, the boss slides up to `pilot.lean` px toward the ship; the beat is one aimed shot from there. The lean eases home after. |
| `hold`   | A silent beat; the boss keeps its rect until its next beat. Plate back on the Doorman.                                                  |
| `fog`    | A fog bank from the boss.                                                                                                               |
| `plate`  | The Doorman's plate out (and its plate hazard on hardcore). Nothing visible on the other two.                                           |
| `script` | The phase's own fire, unchanged.                                                                                                        |

The lever is `fire.json → tiers.N.boss.pilot { fan, spread, lean }`, loaded with a schema (`fan` an integer ≥ 1, `spread` in 0..1, `lean` ≥ 0), thin on the recorded rung (`1 / 0 / 0`). `Boss` carries `maxHp` and `motion` so the shell's view is data the sim already had.

Fact-flip tests: a scripted sequence of seat verbs on a tape and on the same tape with the rug fact flipped produces identical boss rects, shots, fog and lines. The band bots never set an intent, so the fairness band is untouched by the seat.

### The voice seat (`askOllamaLine`, `voice.json`)

The second lever-gated seat. At round start and at each wave open, the shell asks the model which of the boss's own lines from `voice.json` it will say at spawn: the prompt is the kind and the lines lettered `a)`, `b)`, …; the reply is a letter. The shell sets `state.bossLine = { wave, kind, index }`; `spawnBoss` uses it only when the wave and kind match and the index is in range, then clears it. Anything else keeps the seed's pick. The copy is the file's drafts, unchanged (they still wait on the Director's play reaction). The prompt is FORBIDDEN-checked like the boss prompt, so a draft that ever gains a digit or a fact word halts the seat at the prompt.

### The shell

A status beside the picker, outside the field: `seat off`, `seat waiting`, `seat thinking`, `seat said fog`, `seat: script`, `seat: model retired`, `seat: no answer, script`, `seat: no daemon`. Words only. The field draws nothing about the seat.

### `pnpm sit`

`scripts/sit.mjs`, the dev tool that measured all of this. Same frozen prompts as the shell, same sim, printed beat by beat. Not a test.

## What was refused, and why

Seats considered against the lever rule (closed set the JSON already names; no fact; no lie flag; no digit; seed still owns fairness):

- **Parallelism burst on/off.** No. Burst timing is the seed's, per `parallelism.json`, and it is a fairness lever: extra targets and hotter fire. A network seat toggling it would move threat the band cannot measure, and the band is the andon. The tier-level on/off already in the file is the right lever; it stays data.
- **Path pick from a class pool.** Not this session. Paths are chosen per beat at `createRoundState`, dozens per round, all before the first frame; a seat would need one call per beat before the round starts, or a pre-roll. It also reads as almost nothing to a player (which of three swoops a formation takes). Written up so it is not re-derived: if it ever comes back, it is a `pathIntent` per beat index from the same pool the seed uses, asked in a pre-roll, never per lie.
- **Boss phase pick.** Not this session. Choosing the next phase from `bosses.json` is a real feel, but the Menu's `slit` and the Doorman's `hold` take no damage, so a seat that keeps picking a guarded phase makes an unhittable boss. The guard would have to be "never the same phase twice in a row", which for the two-phase bosses collapses to the script. The fire-verb seat already owns the felt beat, and `hold` now covers the held-breath feel without touching the guard.
- **Aside lines.** Same mechanism as the boss line and would work, but asides are seed-timed fillers and a seat there is more calls for no more feel. Left to the seed.

## Frame checks (G7 panel)

- Nothing about a lie differs before the hit: the seat's view is kind, health word, ship column, stick, motion word; the voice prompt is kind and lines. No `lie`, no fact, no count, no digit reaches a prompt (`pilotPrompt` and `voicePrompt` throw; tests cover every kind × health × column × stick × shipped motion, and all three kinds' lines).
- The lean, the fan, the hold and the line pick read the seat's verb and the player's input, never a fact. Fact-flip tests hold for the seated beat sequence.
- No score, count or digit on screen: the seat status lives beside the picker; the play-through's screen grep is unchanged.
- The seat never grades anything (G8, G9, G10 untouched). When it fails, the scripted boss stays.

## Not done

- The Director's own play on the local shell with `gpt-oss:120b-cloud` and `kimi-k2.6:cloud` (Kimi varies more; gpt-oss is faster).
- Whether to drop retired Cloud tags from the picker after their first `error` (today: status says so, picker keeps them).
- Voice drafts still wait on a play reaction. No copy changed.
