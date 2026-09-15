# Kickoff — Vibe Typer, slice 2: the shell

Paste-ready brief for one Opus builder. Read `docs/vibe-typer.dispatch.md` first (the brief, the lock G23–G30, the levers, the build plan), then `docs/vibe-typer.slice1.md` (what the package is and the exact `index.ts` surface you consume; read its **Decisions**), then `docs/vibe-typer.slice1.review.md`, then `CLAUDE.md`, then this file. The worked example for the shell's **shape** is `apps/cabinets/src/ghost.ts` (`mountGhost`, the RAF loop, prefs, the audio start gate) and `apps/cabinets/src/main.ts` (the menu, `playAt`); copy the shape, never the game. The package you mount is `packages/vibe-typer` and you do not change its rules except where this brief says (quick sync).

## Standing frame

- The lock is G23–G30 plus inherited G8, G12, G14, G17. The Director's brief in the dispatch is the taste: gleeful and absurd, nothing yells, the payoff is that something is built, a real scoreboard, sound is crucial.
- Branch `cabinet/vibe-typer-s2` from `origin/main`. One commit at the end (`feat: Vibe Typer, slice 2 — the shell`), pushed. Do not merge.
- Files you may touch: `apps/cabinets/**` (new `src/vibe-typer.ts`, `src/typer-audio.ts`, `src/typer-cues.ts`, `src/typer-keys.ts`, `test/**`, `public/keys/**`, `index.html` for CSS and the second card, `package.json` for the workspace dependency, `main.ts` for the cabinet switch), `packages/vibe-typer/**` only for quick sync (below), the root `package.json` only to add a dev dependency for the mount test, `docs/vibe-typer.slice2.md`. Nothing in `packages/ghost-on-the-menu`, `packages/tape-core`, `packages/cabinet-server`, `packages/launcher`, `catalog/`, `.github/workflows/`, `site/`, `voice/`.
- Ghost must play exactly as before. Its menu, its shift, its seats, its `data-local-seats` markers and the four strings the launcher's pack greps for (`data-local-seats`, `/ollama/api/tags`, `/ollama/api/generate`, `Ollama bosses`) stay in the bundle. `pnpm test:play ghost --fixture naive-ndjson` stays green.
- Gate before push: `pnpm verify` green from the root, `pnpm build:play` green and `site/public/play/index.html` produced, the mount test green, and the identity scan clean from the repo root (PowerShell: `python "$env:USERPROFILE\.grok\bin\identity-scan.py" .`). Any hit outside `node_modules` halts the push.
- No spend: no image, music or cloud model calls. Keyboard samples come from the prototype (below). Everything else is procedural.
- Version stays `0.8.2` everywhere; no tag, no npm, no release.

## Standards compliance (this slice)

| Standard                 | Score | Evidence                                                                                                                                       |
| ------------------------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| PIN_PER_STEP             | 2     | The shell runs the seeded sim at a fixed step; a run's seed is shown on the end scene and typeable on the menu, so a run replays.              |
| ANDON_AUTHORITY          | 2     | `pnpm verify` and `pnpm build:play` gate the push; the mount test fails `pnpm test`; the cue table is exhaustive over `Event['kind']` by type. |
| NAMED_COMPENSATORS       | 2     | Only `git push` of a branch; compensator `git push origin --delete cabinet/vibe-typer-s2`. No skip.                                            |
| DECOMPOSE_BY_SECRETS     | 2     | Keys, cues, audio and the mount are four modules; the sim is untouched by the shell; the shell reads `state` and drains `state.events`.        |
| UNCERTAINTY_GATED_HUMANS | 2     | Feel numbers (shake, tempo, detune, polyphony) are constants at the top of `typer-audio.ts` and `vibe-typer.ts` with a `// Director` note.     |
| EXTERNAL_VERIFIER        | 2     | A different family reviews the diff from a packet before merge; the builder never reviews its own work.                                        |

## Layout

```
apps/cabinets/src/
  vibe-typer.ts     mountVibeTyper(root, opts): the menu-less field; the RAF loop; the panes; prefs
  typer-keys.ts     keydown → RunInput (pure): printable → key, Backspace, Enter, Tab, Escape; modifiers and IME ignored
  typer-cues.ts     Event → Cue (pure): the exhaustive table; also the shake and flash amounts
  typer-audio.ts    the keystroke engine (sample sets, round-robin, detune, polyphony, pitch), the sfx synths, the bed
apps/cabinets/public/keys/<theme>/…   the five keyboard sample sets
apps/cabinets/test/
  typer-keys.test.ts  typer-cues.test.ts  typer-mount.test.ts
```

`apps/cabinets/package.json` gains `"@mcp-arcade-cabinets/vibe-typer": "workspace:*"`. Import only from the package barrel (`@mcp-arcade-cabinets/vibe-typer`); never from its `play`.

## The menu (main.ts)

The shell opens on a **cabinet switch**: two cards at the top of the existing menu, Ghost on the Menu first and selected by default, Vibe Typer second, each with its display name and one line from its `cabinet.json` (Vibe Typer's tagline is "You're absolutely right."). Selecting Ghost shows the existing Ghost menu below unchanged. Selecting Vibe Typer shows Vibe Typer's own menu: a level list from `DEFAULT_PATTERNS.levels.levels` (product name, stack word, a band word: `easy`/`warm`/`hot` are the tier words in `context.json`; do not print band digits), an **Endless** entry, a difficulty select (the four tier words; hardcore is a tier like Ghost's, from the selector only), an agent-name field (default from `cabinet.json`; persisted in `localStorage` under a `vibe.` prefix; the user addresses the agent by this name where a line carries `{agent}` — if `user.json` lines do not carry it, do not add it; the name is shown in the chat header), a **dated jokes** checkbox (off), a keyboard theme select (the five sets), and a seed box (blank = a fresh seed from `nextSeed`; a typed seed replays). The last choices persist like Ghost's prefs. The selected cabinet persists too, so a returning player lands on their game.

## The field (vibe-typer.ts)

`mountVibeTyper(root: HTMLElement, opts: { tier: Tier; endless: boolean; levelIndex?: number; seed: number; agentName: string; dated: boolean; theme: string; integration: Snippet[]; onExit: () => void; startAudio: boolean })` replaces `root`'s children, returns `{ unmount(): void }`, and never touches the URL or the document title.

Three panes and a bar, DOM except the preview:

- **Chat** (left): the user's lines in blue (`.vibe-user`), the agent's in the page colour, newest at the bottom, auto-scrolled, each line typed in from `state.chat` as it lands (a `message` event). The chat header shows the product name and the agent's name. Never a digit in a chat line (the sim guarantees it; the shell adds none).
- **Editor** (centre): the current `state.target` as ghost text with the typed overlay: one `span` per character, classes `pending` / `ok` / `bad`, a caret after the typed length. Above it, the beat word from `cabinet.json → words` (never the enum string): the reply beat reads as the agent typing a reply, the code beat shows the request's lines with the current one highlighted (`codeOf(state)`), a creep landing shows the appended line arriving (Q4.1: shown before it is typeable, which the sim's `creep` beat already guarantees for one step; the shell holds it visibly for at least 600 ms by delaying the next step while `beat === 'creep'`). Copilot on: the rest of the line shimmers and a small "Tab" hint appears; off: gone. A bad key colours the character and nothing else flashes (Q1.3). A bad Enter: the editor shakes by the capped amount and the agent's "hmm" lands in chat.
- **Preview** (right, canvas, 480×360 at 2× DPR): the product assembling. Draw a device frame (a phone for javascript and csharp levels, a terminal for bash, a notebook for python, a ledger for sql, a wire diagram for integration; pick by `planOf(state).stack`) and, for each entry of `state.built`, a block whose area is proportional to `size`, placed by a seeded packer (mulberry32 on the run seed, so the same run draws the same product), in the level's palette. A new piece pops in (scale from 1.3 to 1 over 240 ms) on the `piece` event. The ship event: a flash capped at 40% white for 120 ms, confetti (at most 120 particles, seeded), and a "deployed" ribbon in words. The preview is what the player built, and it grows by exactly what the score counted (G24).
- **Scoreboard** (top): four words from `cabinet.json → words` with their values: valuation (rolls up over 400 ms with an easing, never down), vibes as `×N`, streak as a row of dots capped at the octave, and the context bar (a horizontal bar that drains; turns warm below 25%, the near-miss threshold in `context.ts`). A milestone event shows the milestone word as a toast for two seconds. No words-per-minute, no accuracy, no error count anywhere on the field (G23).

Input: one `keydown` listener on `window` while mounted (removed on unmount). `typer-keys.ts` maps: a single printable character (`event.key.length === 1`, no Ctrl/Meta/Alt) → `{ key }`; `Backspace` → `{ backspace: true }`; `Enter` → `{ enter: true }`; `Tab` → `{ tab: true }` (prevent default); `Escape` → exit to the menu (after a confirm-less 300 ms hold so a stray tap does nothing); everything else ignored; `isComposing` events ignored. Keystrokes queue; the loop feeds **one per step**.

Loop: `requestAnimationFrame`, accumulate real time, step the sim at a fixed `dt = 1/60` (cap the catch-up at 8 steps per frame), feeding one queued keystroke per step, then drain `state.events` through `typer-cues.ts` into the audio and the effects, then render. When `state.over`, stop stepping and show the **standup** (below). The loop never uses `Date.now()` for the sim; only for the frame clock.

The standup (end scene): the product name, the pieces as the finished preview, the user's closing line, the valuation and the milestone words reached, the seed (so the run can be replayed by typing it on the menu), and the reason in words (shipped / context) — in endless, the number of levels is a word count only if it stays under thirteen; otherwise "many". A **Retro** button, opt-in (G27), opens a panel: the weak bigrams from `state.weakBigrams` as a small key map (the top eight pairs, heat by count), then, below, this run's consistency word (steady / uneven, from the variance of clean-line durations the shell measured) and only then speed as a word (brisk / steady / slow), never a number. The retro is offered on every third standup and otherwise sits behind a smaller link (faded feedback, Q1.1). Persist per-browser weak bigrams under `vibe.weak` (merge counts, decay by half each run) and pass them to the next `createRun` so the planner seeds them into real lines (G27).

## Keys and sound (typer-audio.ts)

Copy the five keyboard sample sets from `E:/AI/prototypes/packages/dev-op-typer/DevOpTyper/Assets/Sounds/Sfx/{AlpsCream,Mechanical,Membrane,SoftTouch,Topre}/` into `apps/cabinets/public/keys/<theme>/` (lower-case theme names), keeping the WAV filenames; list what each set contains in the slice doc. Studio-authored, no licence text needed. Do not copy the ambient sets.

The engine follows LoKey-Typer's `E:/AI/prototypes/packages/LoKey-Typer/src/lib/audio.ts` in shape (read it; do not import it): Web Audio, samples decoded once, round-robin across a set's key variants, ±3% random detune from a seeded RNG, a polyphony cap of six with oldest-steal, a master gain, and a **procedural fallback** (a short noise click and a decaying sine) when a sample is missing so the game is never silent. The streak pitch (G29): a `key` event with `ok` plays at `playbackRate = 2 ** (pitch / 12)` where `pitch` is the event's value (0..12); a bad key plays the set's error sample at 0.6 gain and a fixed low rate. Sound starts on the first key or click, like Ghost; mute persists with Ghost's key.

The cue table (`typer-cues.ts`) is exhaustive over `Event['kind']` (a `switch` with `never` in the default): `key` → key sample at pitch, or error; `line ok` → a sent whoosh (synth sweep); `line bad` and `hmm` → a soft two-note "hmm"; `message user` → a ping; `message agent` → a low blip; `piece` → a pop scaled by size; `ship` → the deploy chime plus the flash and confetti, and a lower "grazed" variant when `nearMiss`; `compaction` → a downward sweep and the summary card; `milestone` → a stinger per milestone name; `copilot on/off` → a shimmer in and out; `creep` → the ping with a rising second note; `over` → an end chord (shipped) or a soft fade (context). Every sound has a transient and a tail (Q3.3); none is longer than 700 ms except the end chord.

The bed: a procedural loop in the same spirit as Ghost's `audio.ts` (read it for the AudioContext plumbing; write your own pattern), one bar of four beats, base tempo from a constant (`BED_BPM = 96`), scaled by `1 + 0.06 * (hype - 1)`, and **held** while the last request of a level is in play (Q3.7). A kick on each `message user` if it lands on a beat boundary; otherwise the ping alone. The bed ducks by 6 dB under the ship chime.

Feel constants (`// Director`): shake 4 px on a bad Enter, 6 px on compaction, scaled by line length up to 1.5×, never on a bad key; flash 40% for 120 ms on ship only; confetti 120 max; piece pop 240 ms; roll-up 400 ms. High, not extreme (Q3.1).

## Quick sync (the one sim change)

A meeting interrupts a level. In `packages/vibe-typer`: `user.json` gains `syncs: string[]` (at least twelve short chat lines the player types, "sounds good", "will do", "can you share your screen", "let me find the link", each under six words, gate-clean); `levels.json` gains `syncShare` (default `0.25`; the seeded fraction of levels that get one sync, placed between two requests never the first or the last); a new beat `'sync'` in which the target is a sync line and Enter sends it like a reply line (clean or "hmm"), three lines per sync, no context cost, no value, streak unchanged by a sync line (it is a breather, Q3 tempo hold), and the bed drops to base tempo during it. Add `sync` to the `Beat` union, a `{ kind: 'sync'; on: boolean }` event, tests in `sim.test.ts` and `lines.test.ts`, and keep every band bar holding (re-tune only `syncShare` if a bar moves; write it down). Update `docs/vibe-typer.slice1.md`'s surface section with the new beat, event and lever in a short "Amended in slice 2" note rather than rewriting it.

## Tests

- `typer-keys.test.ts`: every mapping above, including ignored modifiers and `isComposing`.
- `typer-cues.test.ts`: every event kind yields a cue; pitch maps to the right rate; near-miss picks the grazed variant; the table is exhaustive (a type-level `never` check plus a runtime loop over a list of all kinds).
- `typer-mount.test.ts` under jsdom (add `jsdom` as a root dev dependency and set the test's environment with a `// @vitest-environment jsdom` pragma; stub `HTMLCanvasElement.prototype.getContext` and `AudioContext` in the test): mount with seed 1, tier 0, level 0; dispatch `keydown` events for the first reply line character by character then Enter; step the loop by calling the exported `tick(dt)` the mount returns for tests; assert the chat gained the agent's reply, the editor moved to the code beat, no digit appears in the chat pane's text, and unmount removes the listener.
- The existing Ghost tests stay untouched and green.

## Deliverables

1. The shell, green under `pnpm verify` and `pnpm build:play` from the root; `site/public/play/` contains both cabinets; the Ghost markers survive in the built play bundle.
2. `docs/vibe-typer.slice2.md`: what was built, the sample sets copied, the cue table, the feel constants, quick sync's numbers, every decision where this brief was silent, and what slice 3 (the endless seat and the voice) needs from the shell (where a seat would hook in, which events the voice should speak).
3. One commit on `cabinet/vibe-typer-s2`, pushed, identity scan clean, not merged.

Do not add art files, music files or a voice. Do not touch Ghost. Do not publish anything.
