# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

Nothing yet.

## [0.11.0] - 2026-09-16

Slice 4 of Vibe Typer: the container tools, the rest of the look, the voice on the user's lines, beds per stack, and the editor on another family. Builds, numbers and the outside reviews in `docs/vibe-typer.slice4.md` and the `docs/vibe-typer.slice4*.review.md` files beside it. The backdrop was generated and dropped before the merge; its spend is on record. The user of Vibe Typer is a man with an overgrown beard and messy hair, in the avatar, the voice and the voice sheet.

### Added

- **Vibe Typer as an MCP server.** `npx @mcptoolshop/vibe-typer --mcp` now speaks MCP on stdio: an endless run plays inside it under a typist at a human pace, and any MCP client sits in the user's chair through four tools, `view`, `product`, `ask` and `react`, all answered in words. The contract is `packages/cabinet-server/tools.vibe.json`, mirrored into `catalog/tools.vibe.json`, with its own stdio entry beside Ghost's. `ask` goes through the same code gate the local seat does and refuses a repeat; `react` holds one line for the next ship; a refusal answers the rule in one word and never the code. One fact-blind test per tool. `pnpm sit --cabinet vibe-typer --seat mcp` measures a live model through the contract and prints ten sampled asks. The Vibe tarball grows by the bundled server (73 files, 1.49 MB packed).
- **Piece tiles.** Fifty-six painted tiles, eight kinds a stack (a function, a table, a button, a route, a loop, a file, a message, a chart) in each stack's palette, generated through Comfy Cloud as one contact sheet a stack and sliced on this side by a committed script; the preview draws a tile over each block when one is loaded and the flat block until it is; a piece's kind comes from its snippet's topics, with a stable hash for the rest. Receipts in `docs/art/receipts.json`; the python sheet missed its palette twice and the paler re-roll ships, stated as a miss.
- **Avatars.** The user (a man with an overgrown beard and messy hair at a laptop, as the Director set the character) and Sprocket (a friendly terminal face) in the chat header beside the names, sized with the type setting, the plain text as the fallback when an image is missing. Nine generations through Comfy Cloud, two installed; the takes that missed or were superseded are in the receipts with the reason in words.
- **The voice on the user's lines.** With the local voice worker running (`pnpm voice`) and the Voice box on, the user speaks his asks, his one-more-things, his check-ins, his reactions and his reviews in a preset voice from the worker's catalog (`patterns/cabinet.json → voice`, named in the voice sheet too), every take heard back and receipted by fx-dub before it plays; never the agent's lines, never the meeting chatter. A take that misses its beat waits for the next ask; at a request boundary the reaction is heard before the ask. The bed ducks under a take; the keystrokes do not. `npx @mcptoolshop/vibe-typer` now proxies `/voice` to the worker with the same allowlist Ghost's launcher uses (`VOICE_URL`, `VOICE_TOKEN`). `pnpm sit --cabinet vibe-typer --voice on` measures it.
- **Milestone cards and the deploy ribbon.** A painted card for seed, series A and unicorn, drawn over the preview for the toast's duration with the milestone word as text on its empty half, and a ribbon at the deploy with `deployed` written on it by the shell; the plain word and the flat bar stay as the fallbacks. Thirteen generations through Comfy Cloud, four installed; the amber came out orange and the three navies differ slightly, stated as misses. Found on the way: the Flux node honors explicit width and height, so banners are asked for at their own aspect.
- **Beds per stack.** Seven instrumental loops from ACE-Step 1.5 through Comfy Cloud, one per corpus stack and one for the wires, 38 seconds each at the procedural bed's tempo in one key, cut so the loop is continuous in the source and checked to carry no words. `music: on` plays the level's stack bed with the tempo rule as before and crossfades on a stack change; `soft` keeps the procedural hat; `off` stays off; a bed that fails to load falls back to the procedural bed silently. The pack and the release check require all seven by name. Receipts in `docs/art/receipts.json`; the Vibe tarball grows by them to 6.55 MB packed.
- **The editor on another family.** `author.mjs edit` now refuses an editor of the same family as a pool's writer (or a writer it cannot read) unless told otherwise with a reason, names both families in its receipt, protects the voice sheets' own exemplar lines from being dropped, scopes a repeat to its own bracket, and runs at a judgment temperature. Mistral Large 3 read Kimi's pools once: 83 lines dropped, 275 drops refused at a floor, one kept as the sheet's own, no lever moved. The agent's replies are excluded by rule, because their length is the hardcore clock; two record pools were skipped on measured unreliability and are named in the slice doc. Receipts under `packages/vibe-typer/authoring/`.

### Changed

- `release.yml` smokes both `--mcp` tool lists (six and four) and requires the stdio bundle in both tarballs.
- The Ghost package and its server are unchanged; the Docker image still carries Ghost's six tools only.

## [0.10.0] - 2026-09-16

Slice 3 of Vibe Typer, and one package per cabinet. Builds and reviews in `docs/vibe-typer.slice3.md` and the `docs/vibe-typer.slice3*.review.md` files beside it.

### Added

- **Sixteen story levels.** Each level is one product, four pieces of real code pinned in order (the setup, two escalations, the deploy with a twist) and a premise the standup shows; two per corpus stack, a third for python and javascript, two on the integration stack. The menu is grouped by stack with a difficulty word. Every snippet in the corpus carries its own ask, so the request describes the job the code does.
- **Check-ins.** During the code the user asks "is it live yet" at a seeded interval; the agent answers once the line in hand is out. No context cost, no streak change, no value; the band proves it with a run compared byte for byte against the same run with check-ins off.
- **Reactions that know what shipped, reviews that name the product**, and every pool three times its slice-1 size, written by `kimi-k2.6:cloud` from two voice sheets (`packages/vibe-typer/patterns/voice/`) through the word gate and an editor pass, by `packages/vibe-typer/scripts/author.mjs` with receipts under `authoring/`. A forty-line sample from three models sits in `docs/vibe-typer.author-sample.md`.
- **Endless on a model (G28 amended).** With a local daemon, a seated model writes the product, the asks and the code the player types, behind a mechanical code gate (`packages/vibe-typer/src/codegate.ts`) and the word gate; `/cabinet/endless` on the dev server and the launcher; the shell prefetches and falls back to the corpus silently; the seat is named on the menu's endless entry and in the controls row, never on the field. `pnpm sit --cabinet vibe-typer` measures a seat live.
- **American English with a test** over every lever, the corpus titles and notes, and the shell; the gate also refuses non-ASCII characters and the inflected forms of the barred words.
- **A settings row**: type size (large by default, applied through one CSS variable, no mid-token wraps), keyboard, sound, a music setting (soft by default: no kick under the draining bar; on and off), and the agent's name, which defaults to Sprocket.
- **Art through Comfy Cloud**: the Vibe Typer logo and five device frames (terminal, phone, notebook, ledger, wires) with the rectangles as fallback; receipts in `docs/art/receipts.json`.
- **`@mcptoolshop/vibe-typer`** from `packages/launcher-vibe-typer`: each cabinet is its own npm package; `VITE_CABINET` builds one cabinet's shell; the pack script is shared and split by cabinet; `release.yml` publishes both under one version gate with an idempotent loop.

### Changed

- `@mcptoolshop/ghost-on-the-menu` is Ghost only again; the arcade with both cabinets on one switch is the Pages build.
- The beat words moved into `cabinet.json`; the bed's `on` mode is the v0.9.0 bed.

## [0.9.0] - 2026-09-15

The second cabinet. Vibe Typer is playable in the browser and rides inside the npm package beside Ghost. Design and lock G23–G30 in `docs/vibe-typer.dispatch.md`; each slice's build and its outside review beside it.

### Added

- **Vibe Typer, slice 1: the package** (`packages/vibe-typer`, private). A second cabinet, headless only: a seeded sim (`createRun` / `stepRun`), the corpus ported from dev-op-typer (249 snippets, six stacks, seven bands, with teaching notes) plus an integration stack built from tape headers and rows, a deterministic difficulty formula (surprisal, bigram travel, length, punctuation, identifier and bracket weight), the scoreboard (valuation, vibes, streak, milestones, Copilot), the context timer (compaction in levels, the end in endless and hardcore), authored user and agent lines behind the same word gate as `voice.json`, three bots and a band of sixteen bars, and `pnpm test:play vibe-typer` in `verify`. Design, research and the lock G23–G30 in `docs/vibe-typer.dispatch.md`; the build in `docs/vibe-typer.slice1.md`. No shell yet; that is slice 2.
- **Vibe Typer, slice 2: the shell** (`apps/cabinets`). The menu opens on a two-card switch with Ghost selected; Vibe Typer's own menu lists the eight products, Endless, the four tier words, five keyboards, dated jokes, the agent's name and a seed box. The field: the chat in blue and page colour, the editor with ghost text and a caret, the canvas preview that grows by exactly what the score counts, the scoreboard (valuation, vibes, streak dots, the context bar), the standup with the seed and the opt-in retro. Sound: five keyboard sample sets from dev-op-typer with round-robin, detune, a polyphony cap and the streak's semitone climb; an exhaustive cue table; a procedural bed with tempo on vibes, held through a level's last request. Quick sync, the one sim change: a meeting of three short lines between two requests, the bar not draining. Twenty-five shell tests including a jsdom mount test. Build in `docs/vibe-typer.slice2.md`.
- **The README is the arcade's entrance.** Ghost on the Menu's page moved to `packages/ghost-on-the-menu/README.md`; the repo logo is the cabinet render; repo description and topics follow.

### Changed

- Every package is on `0.9.0`; `SERVER_VERSION` matches. The launcher now serves both cabinets; `--mcp` is still Ghost's server.
- The landing page is the arcade: a cabinets section with both games, an "Inside Vibe Typer" section, an "Inside Ghost on the Menu" section, and the play cards. The handbook gains a Vibe Typer page and its index, getting-started, reference, architecture and security pages describe two cabinets.
- The dated-jokes switch was removed on the Director's word; the user's lines anchor to durable developer experience only.

## [0.8.2] - 2026-09-14

The npm play path lights the local seats. Grok's review of v0.8.0/v0.8.1 (`docs/npm-launcher.review.md`) found that `npx` served the Pages chrome: `import.meta.env.PROD` stripped the Ollama / Voice / model picker, so the proxies sat unused. `--mcp` was already fine.

### Fixed

- **Launcher play mode mounts the local seats.** `VITE_LOCAL_SEATS=true` at pack time. Pages still omits them (cannot reach a daemon). The pack andons if the play bundle is missing `data-local-seats`, `/ollama/api/tags`, `/ollama/api/generate`, or `Ollama bosses`.
- **Archivist can sit the say seat.** `BOSS_KINDS` in the launcher and the Vite say route includes the fourth boss, in step with the sim.
- **Next-verb reaches the daemon.** `POST /api/generate` is on both allowlists (the fire seat stays on `/api/chat`). Pull, delete and create still 404 before a socket opens.

### Changed

- Every package is on `0.8.2`. `SERVER_VERSION` matches.
- Allowlist is seven calls, not six. Keep the two copies in step (`allow.ts` and `vite.config.ts`).

## [0.8.1] - 2026-09-14

A patch for the one defect `v0.8.0` shipped, plus the art the npm page was missing.

### Fixed

- **The MCP seat announces its real version.** `v0.8.0` handshook as `0.7.0`: `SERVER_VERSION` is a hand-written constant in `cabinet-server`, and the release gate compared only `package.json` against the tag even though `SHIP_GATE.md` names the constant explicitly. The gate now reads it out of the source and halts on a mismatch, naming the file and the value to set. Negative-tested by reverting the constant.

### Added

- **Hero art on the npm README.** The package page had no image at all. The art is the spread — the player craft firing a fan of amber tracers through teal shockwave rings — selected from six Flux 2 Pro concepts. It lives in the brand repo beside `icon.png` and `readme.png`, quantized to 256 colours (233 kB), referenced by absolute raw URL because npm does not resolve relative image paths. The repo README and its eight translations are untouched.

## [0.8.0] - 2026-09-14

The cabinet goes on npm. One package publishes — `@mcptoolshop/ghost-on-the-menu` — and the other four stay private. Published by CI over OIDC with provenance (`_npmUser: "GitHub Actions"`, sigstore log index 2837055244). Translations shipped with the tag, all eight languages. Still `0.x`; the cabinet lock is unchanged.

### Added

- **The npm launcher.** `packages/launcher` publishes as `@mcptoolshop/ghost-on-the-menu`. `npx @mcptoolshop/ghost-on-the-menu` serves the built shell on `127.0.0.1` and opens it; `--mcp` hands stdio to the cabinet server, so `npx` joins the Docker image as an install path for the MCP seat. `--port`, `--no-open`, `--help`, `--version`. No runtime dependencies: esbuild collapses the workspace, which is what keeps this to one package instead of four.
- **The local seats, without a clone.** The launcher carries the two allowlisted proxies and the say route that `apps/cabinets/vite.config.ts` gives a developer, minus Vite, so a player who only ran `npx` gets the Ollama bosses and the voice. This is the difference from the published page, which structurally cannot reach a daemon. The proxy allowlist is six calls and nothing else; the server binds loopback only.
- **`release.yml`** on `release: published` and a dry-running `workflow_dispatch`. Trusted Publishing (OIDC) with provenance; no `NPM_TOKEN` in this repo. Five gates halt before the irreversible step: version-matches-tag, `pnpm verify`, the build, a bin smoke that runs a real `tools/list` over stdio, and a tarball contract (required files present, no sources leaked, twenty tapes). The job declares no environment, because the trusted publisher names none and the OIDC subject claim would not match if it did.
- **`pnpm build:launcher`** at the root, and `docs/npm-launcher.md` — the numbers, the refusals, the standards scoring, the compensators, and the registry-propagation trap that cost this release two wrong turns.

### Changed

- Every package is on `0.8.0`.
- **Cutting a GitHub release now publishes to npm.** It used to be an undoable act; after 72 hours an npm version can only be deprecated, never unpublished.
- `tape-core`, `ghost-on-the-menu`, `cabinet-server` and `cabinets` stay `"private": true`.

## [0.7.0] - 2026-09-14

Dogfood swarm after v0.6.0: health A–D, a visual/audio pass, then feature slices A–D (shift flavors and a new inspect-wave cast; Ollama next-verb; sealed Catalog volume). Still `0.x`. English README, landing, and handbook are current. Translations skipped for this tag (GPU in use). No npm.

### Added

- **Shift flavors (A).** Four authored landmarks on climb `[0, 0.35, 0.7, 1]`: pressure, area-deny, a rest-shaped trough on the third call, and a peak. The card between calls names the next fight in words (biome, motif, silhouette), no digits. The field room follows the named bed. Climb stays data; lamps still refill; the four-word code is unchanged.
- **Inspect-wave cast (B).** Unique hulls **probe** (a dart), **shelf** (a ledge across the lane), **ledger** (a stacked elite). **Archivist** is the inspect closer on a shift (idle catalog / open drawer). Picker-alone inspect keeps the old empty hover so the tape-alone fairness band holds. Lies still share honest sprites until hit.
- **Ollama next-verb (C).** `askNextIntents` fills a closed-set `bossQueue` off the beat. Cadence and look-ahead are data in `fire.json`. A hung or missing answer is script, never a stall. The picker writes a library line after fire (`a wide fan`, `a held breath`). Pages omits the local Ollama/Voice chrome.
- **Catalog volume (D).** Optional `CABINET_TAPES_USER` overlay beside the baked twenty. Catalog card stays silent; `disableNetwork: true`. Dockerfile FROM lines digest-pinned; CI builds `linux/amd64` and `linux/arm64` and refuses `:latest`. Host compose lives at `voice/compose.host.yaml`, not in the listing.
- **Aside pool.** Offline gated mutters (24 per room) drawn from a seed bag without replacement. Not an Ollama seat.

### Changed

- Named wave and boss beds play as themselves. A song holds 36s (one loop) before the wanted bed comes in. Recorded beds come in ducked so shots and the catch still read.
- Play-row difficulty drives the intro copy (hardcore: one lamp and falling plates).
- Pages `play_index` derives the uploaded sprite and track roster from `SPRITE_KEYS` / `TRACK_KEYS`.

## [0.6.0] - 2026-09-11

The game's direction, solidified: you are the agent, and the rig hands you the calls. The shift (slice 7) makes a play a run of four recorded bouts as one agent session, with a climb in data and a name of four words; the music was reworked to follow the seed and carry through a shift; the cabinet server ships as a Docker image with the Catalog entry drafted; Grok's reviews of slices 6 and 7 are applied (`docs/cabinet-container.review.md`, `docs/shift.review.md`). Still `0.x`: the seats and the voice need the local shell; Pages serves the game with the shift and the music.

### Changed

- **The music, on the Director's play notes (2026-09-11).** A round opens on a bed its seed picks from the five wave beds (inspect, breather, poison, rug, unlisted; four of them had become unreachable after the boss beds took their waves), holds it for the two minutes, then rotates to the next; a boss wave still brings its boss's bed once the hold is up. The player now lives as long as the page, so a shift carries the music through its cards and a restart carries the hold; nothing restarts from zero. The parallelism track is gone (too frantic): a burst speeds the playing bed up by fifteen percent, pitch kept, over a short ramp, and lets it back down; without beds the chiptune plays its own pattern faster.

### Added

- **The shift (slice 7, G19–G22, `docs/shift.dispatch.md`).** Beside the picker, **Shift** draws four tapes from the roster without replacement, seeded from the clock and never from a fact, scored for freshness against the last two shifts this browser took, and plays them back to back as one agent session: a card between calls names the next server, the policy and the tools the agent was asked to run (header words only); the lamps refill at every call (the Director's decision); the difficulty is fixed to the shift's; the closing scene lists the calls and a **code of four words** that replays the same shift or hands it to someone. The code is two alternating lists of sixty-four concrete nouns in `patterns/shift.json` (the rank of the draw, the difficulty, a check of the roster), no digit anywhere; a code from another roster says so. **The climb is data**: `copiesShift` and `intensityShift` per tier in `parallelism.json` are the reach the last call ends on, and `shift.json` says how far up the climb each call sits; the sim reads one number, `round.climb`, in the burst schedule and nowhere else. Measured on the band's new shift bar: as the last call at live the mover dies on nine tapes of twenty against five alone and still survives half the roster with half the lies found; the tape-alone bars are unchanged. `pnpm sweep --climb 1`. Two hundred and nineteen tests.

- **The container (slice 6, G18).** A root `Dockerfile` builds the cabinet server into one file on `node:22-alpine` with `tools.json` and the twenty tapes baked in, running as `node` over stdio; `.dockerignore` keeps everything else out. Measured under the Toolkit's budget (one CPU, two gigabytes, no network): connect in about half a second, `tools/list` in eight milliseconds, every tool in words, a bad enum and an unlisted name refused; the instrument's four experiments pass against the image with its digest pinned. Published as `ghcr.io/mcp-tool-shop-org/mcp-arcade-cabinets:0.5.0` (digest `sha256:743a9eda…3bca75`); the published filesystem, re-fetched by digest, scans clean. The Docker MCP Catalog entry is drafted under `catalog/` (`server.yaml`, `tools.json`); the PR to `docker/mcp-registry` is the Director's to open.
- **The voice worker, hardened for the container route** (Grok's slice-4 list): `VOICE_TOKEN` makes `/speak` and `/audio` require a bearer (the stdio server and the dev proxy send it on the node side; the browser never holds it), the worker refuses to bind beyond loopback without one, the cache is capped (`--cache-takes`, oldest first), and the weights come from `KOKORO_DIR` or `--model` with a clear exit when missing. Measured: a container reached the token-guarded worker at `host.docker.internal` and spoke one receipted take; without the bearer, 401. On Grok's slice-6 review: `speak` says the voice is silent when no worker answers (a short-abort liveness probe off the beat), and the worker's `/health` is a liveness word, with the details moved to `/stats` behind the bearer.

## [0.5.0] - 2026-09-11

The cabinet server and the voice: slices one to four of `docs/cabinet-server.dispatch.md`. The cabinet is an MCP server whose tools are the levers a model pulls; the shell's seats sit behind that contract; the boss writes its lines through a gate and speaks them through a receipted voice; the Ghost's own menu went through the instrument. Reviewed by Grok (`docs/cabinet-server.review.md`, `docs/cabinet-voice.review.md`). The seats and the voice need the local shell, a daemon and the voice worker; Pages serves the game unchanged, with the music and the tuning below.

### Added

- **The voice (slice 4, G15).** `voice/worker.py` is a host-side worker: Kokoro (`kokoro-onnx`, the ONNX weights under the models folder) speaks a gate-passed line in the boss's preset voice, faster-whisper hears it back with word timestamps, and fx-dub's spoken-content receipt (`fxdub-dialogue`) checks the pair: the words spoken are the gated words, no invented speech, no hole mid-line. A take whose receipt fails is never served. Every line is cached by voice and text, so the authored fallback lines are synthesised once. `pnpm voice` runs it from the repo's venv; `pnpm voice --check` speaks one authored line per boss and prints the receipts. Never inside the Catalog container: it is reached at `host.docker.internal` and the cabinet is silent without it.
- **`speak`**, the sixth tool: no arguments, voices the line the gate admitted. `personas.json` gains a voice sheet per boss kind (`preset`, `rate`, `loudness`, `clone`) with a schema, delivery authored per persona; `clone` is null until the Director supplies a consented recording.
- **The voicer in the shell**: a **Voice** checkbox, enabled only when the worker answers, and a third status word. A take plays the moment its receipt is back if its line is still on the field, waits for the next breather if it missed its beat, and is dropped at the scene. Mute silences the take, not the receipt. `pnpm sit --voice auto|on|off` measures it per take.
- **`packages/cabinet-server`**, a stdio MCP server over the headless sim (official TypeScript SDK). Six tools from `tools.json`: `fire` (verb), `say` (gated text and a lead), `speak`, `sfx` (a cue name), and the read-only `view` and `tapes`.: `fire` (verb), `say` (gated text and a lead), `sfx` (a cue name), and the read-only `view` and `tapes`. Closed enums, no nested objects, no whisper, no digit, no fact word; the loader halts on any of those. Fact-blind at the boundary by construction (G12): the tools reach a host of words, never the Round or the RoundState. The seat proposes; the sim disposes (G11). `pnpm test:play ghost --seat mcp` drives it in-process.
- **The say gate (G14)**: at most twelve words, one sentence, no digit, no fact or score word, no tool, model or seat name, a no-repeat window. A refused line plays one of the boss's own lines from `voice.json`. `personas.json`: one sheet per boss kind (register, tics, what it may own about being a model) with a load-time schema. The say seat is a persona-shaped agent tiered by capability behind the one gate: a Claude agent when `ANTHROPIC_API_KEY` is set for the dev server (read on the node side, never sent to the browser), else a signed-in Ollama Cloud tag, else a local model.
- **A new sim lever, `bossSay`**: a gate-passed line lands as an aside at its lead time, gives way to a wave card or a catch, and is dropped with the boss. Fact-flip tested with every tool.
- **The seat over tools (G13)**: the shell asks the cabinet's `fire` through Ollama tool calling, prefetches the next beat's verb during the current one, revokes it when the boss's words change, and takes a late or missing answer as the script. A warm-up call at round start; `keep_alive` on local models; Cloud tags first in the picker as before. Two status words beside the picker name the tool each seat called.
- **`pnpm sit` reports per model** verb collapse, tool suppression, bad verbs, revoked prefetches, late answers, and what the say gate refused and why, with tool calling and the schema path enabled together (`--constrain off` for the contrast; `--seat prompt` keeps the v0.4.0 path).
- **The Ghost's own tapes.** `mcp-arcade bout --target stdio` against the cabinet server, naive and task-only, with and without the house wrap: `fixtures/tapes/cabinet.*.tape.json`. On the server's own menu naive followed nothing; with the wrap naive followed into `tapes` and task-only held. The cabinet plays them.
- `docs/cabinet-server.panel.md`: every G12 and G14 claim through two family-different jurors, all confirmed.

### Tuned (the Director's play, 2026-09-11)

- **A bed holds two minutes** before it may give way (`BED_MIN_S`).
- **Rounds are about fifteen percent longer** at every tier (`waves.json` min and max), with formation fire, dives and the boss beat slowed by the same factor (`fire.json`), so the heat per minute is unchanged and the climb comes from the bursts. Measured on the band: a third longer killed the bots at live even with every clock slowed (nine sweeper deaths of twenty against the band's five); fifteen percent sits exactly on the bar (five). Longer than that is a change to the band or to the lamps, the Director's call.
- **Bursts you can see, and that climb.** `parallelism.json`: bursts of four to nine seconds at seat and live (were under four), seven to eighteen on hardcore, and two new levers with a schema, `copiesLater` and `intensityLater`: the honest copies and the fire intensity climb wave by wave from their first-wave value to their last-wave value (seat: two to three copies, intensity one point one five to one point four). The bed overlays the burst track for the burst.

### Fixed

- **The music.** The Director's play (2026-09-11): sporadic, never one song for long, cut off for no reason. Measured: twenty bed switches in a ninety-second round, every one a hard restart from zero (the wave bed at the card, the boss bed at spawn, the wave bed again at the kill, the burst bed for each two-second burst, the breather bed for each three-second breather). Now a bed plays for at least a minute before it may give way (the Director's word), then crossfades into the bed of the wave that is playing; a boss wave's bed is its boss's; the bed stays through breathers and the tail; a burst overlays the burst bed on the wave's bed and ducks it; a returning bed resumes where it left off; the round's end fades the music out. Tested with fake beds.
- **The voice never reached the speakers.** The shell played takes at the worker's own path instead of behind the dev proxy, so every take was a missing file (Grok's slice-4 review). The worker's audio route also serves a take only when its receipt exists and passed; a take never plays over a catch or another line's card; a newer line drops a take held for the breather. With **Voice** on, every boss now speaks its authored spawn line (synthesised once and cached), so the voice is heard with or without a seat; the box re-probes for the worker every few seconds and says `voice: no worker (pnpm voice)` until it answers.

### Changed

- The fairness band derives its roster from the tapes on disk (twenty now) and keeps the live thresholds as the same fractions of it.
- The shell's `dev` script builds the cabinet server first; the dev server gains `/cabinet/say`.

## [0.4.0] - 2026-09-10

The Ollama seats. Locally, a model sits in the boss and is felt; it picks the boss's own line; it never sees a lie. Play the published cut at [/play/](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/); the seats need the local shell and a daemon.

### Added

- **A felt boss seat.** New lever `patterns/fire.json → tiers.N.boss.pilot { fan, spread, lean }` with a load-time schema. A seat's `spread` is a wide straight fan; `column` slides the boss up to `lean` toward the ship before an aimed shot, then eases home; `hold` is a silent beat that keeps the boss still. Thin on the recorded rung. Fact-flip tests on the seated beat sequence.
- **The voice seat.** With the seat on, each boss picks which of its own `patterns/voice.json` lines it says at spawn (a letter reply; matched on wave and kind, else the seed's pick). The drafts are unchanged; the seat can only choose, never write.
- **Seat status** beside the model picker: waiting, thinking, the verb it said, or why it fell back to the script. Words only, never on the field. Retired Cloud tags say so.
- **`pnpm sit`** (`scripts/sit.mjs`): sits a model in both seats on a scripted round in wall-clock time and prints each beat's verb, what the sim made of it, each boss's line, latency and fallbacks.
- `docs/ollama-content.md`: the session's decisions and the seats refused (parallelism toggle, path pick, phase pick, asides) with reasons.

### Fixed

- **The Cloud boss was not sitting.** `gpt-oss` on Ollama Cloud ignores `think: false` and spent every token thinking, so the v0.3.0 default seat fell back to the script on every beat. The seat now retries with a low thinking budget and remembers which models need it. Measured: no fallbacks, about half a second a beat.
- The seat's view carried a constant motion word and named health against the wrong maximum. It now carries the phase's motion word from `bosses.json`, the stick, and health against the boss's real max. The frozen system sentence is unchanged; a digit or a fact word in a prompt still throws.
- `spread` and `column` were the same aimed shot on tiers 1 to 3. They are distinct now.

### Changed

- The shell asks for a verb once the last one is spent, not on a clock, so a fast tag sits every beat and a slow one is never asked twice for one beat.
- `Boss` carries `maxHp` and `motion`.

## [0.3.0] - 2026-09-10

The cabinet grows a fight: more classes, recorded beds, parallelism, a Cloud boss seat. Play it at [the landing page](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/) or straight at [/play/](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/).

### Added

- **Drops.** A downed boss drops a lamp; a cleared formation drops a spread. Both fall **straight down**. Catching a lamp relights one; catching a spread fans the ship's fire for a few seconds. Data in `patterns/drops.json`. Drops never key on a lie.
- **Voice.** A dry line per wave open and per boss enter, and a closing line on the end scene. Data in `patterns/voice.json`, four drafts per key, picked by the round seed. They name the experiment and the creature, never a fact, never a digit.
- **Tape labels.** The picker is a list. Each tape carries a difficulty word (fixture, seat, or live) and an **i** whose hover text explains the header and the wire shape. A test flips every fact and requires the identical label and why.
- **Hardcore.** Selector-only fourth rung: one lamp, rage from the first shot, boss hazards (echo, band, plate).
- **Parallelism.** Data in `patterns/parallelism.json`. Seed-placed bursts of extra honest copies and a hotter track. Off on the recorded rung. Extra copies are never lies.
- **Class sprites** for `answer`, `ready`, `error`, drops, and hardcore hazards, plus recorded ACE-Step beds per wave, boss, breather and burst. Chiptune remains the fallback.
- **Ollama Cloud bosses.** The local daemon can sit a Cloud tag (`gpt-oss:120b-cloud` when pulled). The prompt never carries a fact. Pages cannot reach the daemon.

### Changed

- README and landing page rewritten for players. The fairness band, layout, bots, and threat model stay in the handbook and this file.
- Difficulty ramps with the wave index. Seat rounds run longer.
- Handshake ack (`ready`) and error responses are their own classes.
- The landing page header links **Play** into `/play/`.

## [0.2.0] - 2026-09-10

The first release. Ghost on the Menu is playable in a browser and from a terminal.

### Added

- **Ghost on the Menu**, a replay shooter over `mcp-arcade.tape/v1` tapes. Every atom the instrument ran is a wave, opened by a card naming its kind and staged as the wire ran: handshake, menu, calls, answers, and the atom's boss. Lies reveal on the hit, never before, and stay parked as trophies. The end scene names the tape, the server and the policy, and nothing more.
- **Bosses**, one per atom kind (the Whisperer, the Menu, the Doorman), with phase scripts as data, guard phases, rage below half health, aimed fire at seat and live, and a burst when they go down.
- **Threat as data**: entry paths, formations, fire rhythms, dives that aim then commit, fog banks, three lamps with a grace period, and a difficulty ladder (as recorded, seat, live) under `packages/ghost-on-the-menu/patterns/`.
- **Sound**: synthesized effects and a procedural chiptune soundtrack with a motif per wave kind; mute, three feel presets and a shake-off toggle.
- **Retro sprites** generated on Flux 2 Max, glyph-checked and signed off against the lock; provenance and licence in `docs/art/receipts.json`.
- **The fairness band**: three scripted bots (idle, sweeper, reader) play every fixture tape at every tier in CI, with bars for a floor, a ceiling and a difficulty curve.
- **Tools**: `pnpm test:play` (the acceptance play-through), `pnpm film` (frames of a round to PNG), `pnpm sweep` (the balance table).
- `tape-core`: the tape loader that refuses forbidden keys at any depth, slicing by atom, and the calibration rules kept for a future cabinet.

### Changed

- House Call, the turn-based calibration cabinet, is parked (last state 152f548) until a design that plays exists.

[Unreleased]: https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/compare/v0.7.0...HEAD
[0.7.0]: https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/compare/v0.6.0...v0.7.0
[0.3.0]: https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/releases/tag/v0.3.0
[0.2.0]: https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/releases/tag/v0.2.0
