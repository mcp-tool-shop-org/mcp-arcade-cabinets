# HANDOFF — the arcade at v0.11.1: Vibe Typer whole, read by the Director, and one image for both cabinets

**Pick up here (2026-09-17, `main` at `1d43c8b`, pushed, unreleased; every push since `18e7fa5` is the same day's work and is listed below in order).** Three things landed in one line after Stage A, all verified together (1092 tests) and identity-scanned: **Stage B** of the dogfood swarm (wave 5, seven domains, `docs/dogfood-swarm.md`); **the answer to the Director's play notes** (`docs/ghost-attack.grok-consult.md`, the consult brief and what shipped from it: three line defects in the sim behind "only the boss attacks", the ship's shots capped per rung, four optional fire levers, the reader bot with a gun and a memory, the seat reader bar split, the play flowing into the next tape after the scene has held `NEXT_TAPE_S`); and **the music pass** (`docs/music.md`: fifteen beds rebuilt to about two minutes from their own stems and mastered, the loader settling on headers, the opening bed drawn by seed, a boss bed at once, and then, after his fourth listen, the Director chose a playlist for the music: the recorded beds are a playlist: a piece runs from its first bar to its last, the next is drawn without repeats until the set is spent, and no event on the field replaces a piece; a boss no longer brings its own music, and the scene between two tapes does not stop the piece; the whisperer and the doorman were rebuilt loop-first with no thin sections and mastered above the set; the menu piece is out of the pool on his decision, seven beds ship, and more beds are the next dogfood swarm's). The boss now waits for its wave's grid to be downed, or half the wave, before it takes the field (`BOSS_ENTRY_AT` in the sim), the Whisperer excepted. The tune that shipped is the Director's own heat, played and approved the same day (every class fires at every rung above the recorded one, on the way in, the first shot early, the ship capped; hardcore fast and wide on its one lamp; `docs/ghost-attack.grok-consult.md` records the consult's gentler recipe and why his read stood over it), and the fairness band's bars follow the tune, never the reverse. The built bundle is served from the music worktree on port 7791. The same evening the Director asked for the formation to reach the edges and for something to catch, and both shipped as levers (the formation's block drift per rung and its aimed fire; three fire drops, spread, rapid and pierce, by seeded draw; the caps up to four and three; the band's bot-survival bars retired with the reason, since no scripted bot lives under this heat and the human bar is his), and the endless slice E1 landed (`docs/ghost-endless.e1.md`; the sim, the levers and the band; E2 the call tool and the seat picker, E3 the shell and E4 the voice and film are next). **Standing on every update of this repo, the Director's rule: the lead adds and edits the agent's lines in `packages/ghost-on-the-menu/patterns/voice.json` (`docs/ghost-lines.md`: the voice, the gates, the pool sizes) until the pools feel diverse; every pool is a bag drawn without repeats.** The reactions authoring run landed (`docs/vibe-typer.reactions.md`: a `reaction` beside every one of the two hundred and forty-nine asks, Mistral writing, another family reading, twenty-nine rewritten by the lead after reading three levels as a player; the ghost pools grew by thirty-four in the same commit). **Stage C (humanization) landed** as waves 6 and 7 of the swarm (`docs/dogfood-swarm.md`): a hundred and seven fixes across the shell, both sims, the cabinet server and the launchers, verified together (1284 tests); the on-screen pass of the keyboard and screen-reader changes on the built bundle is owed to the browser pane, and the shell's jsdom tests pin them meanwhile. Owed next, in order: Stage D, the feature pass, the final test and the treatment to 0.12.0 (translations before the tag, both tarballs scanned, the image rebuilt and smoked). Motif is the music slice after that. Every outside review to date is dispositioned in the run record (`docs/dogfood-swarm.md`).

**The dogfood swarm, Stage A, on `main` at `9ac53c6` (2026-09-17, unreleased; CI on that push is the next thing to read).** The Director played 0.11.1, said the reviews and the briefs had let nonsense through, and set the swarm running with one rule on every wave and every merge: **the player's pass** (the coordinator plays the built bundle and reads every line on the field before anything is collected or merged; a second family reads the transcript, not the diff). The pass on `main` found the mechanism behind the nonsense (reactions keyed to the code construct, not the ask; endless drawing asks written for another product) and the Director's own finding (the beds cut off at a flat 36 s under 40 s files). Seven auditors, 106 findings re-rated by three non-Claude families, 81 fixed by seven builders in worktrees, one commit, 823 → 993 tests: the record is `docs/dogfood-swarm.md`, the changelog's Unreleased entry has every fix, `docs/vibe-typer.proofread.review.md` pays the owed review of `9aef9a4`. `pnpm transcript` prints a whole run for the pass. **Three things wait on the Director's word:** (1) an authoring run of per-request reactions (the by-topic pool is off behind `user.reactionsByTopicEnabled`; the tier pools are pinned as a ratchet, 70 of 108 lines name a piece); (2) the music pass on branch `cabinet/music-m1` (worktree `.swarm/worktrees/music-m1`, rebased on `main`): fifteen beds rebuilt to about two minutes from their own stems and mastered, fresh ACE-Step pieces auditionable at `/mcp-arcade-cabinets/audition/` on the local server, the encoding (28.8 MB at 128k MP3 versus 21.6 MB at 96k Opus) and the no-words gate's definition (Whisper captions silence on the beds shipping today too), `docs/music.kickoff.md` and the builder's `docs/music.md`; evidence copied to `docs/art/originals-ghost-beds/` and `docs/art/originals-vibe-beds-2min/`; (3) Ghost's endless mode as a seated mode with the model as the boss and a score, designed with a study-swarm in `docs/ghost-endless.dispatch.md` (lock G31–G35), not yet a yes. **Owed after Stage A:** Stages B, C, D of the health pass, the feature pass, the final test, the treatment to 0.12.0; the cross-domain follow-ups named in the record (the `react` tool passing its request id; the worker's tests wired into CI; the catalog pin's CI check; `play.mjs`'s `whyFailed` ceil); Kimi's shell read, which returned empty twice; the standing list below (the npm deprecate, the nag tool, the Docker MCP Catalog entry, the pull-path recent-asks ordering, the sandwich-ledger cliff, the reaction heard cold). Swarm run `swarm-1789612954-a456`; save point `swarm-save-0.11.1`. The worktrees under `.claude/worktrees/` and the v0.7.0 swarm's leftovers under `.swarm/worktrees/` are deleted.

**v0.11.1 (2026-09-16, published on the Director's word the same evening).** A patch on the Director's read of 0.11.0: the agent's face on the editor pane, the proofread of the pools that are drawn blind (the record is the last section of `docs/vibe-typer.slice4.md`; the lesson is in memory and below), and the Docker image carrying both cabinets (`CABINET=vibe`), at `ghcr.io/mcp-tool-shop-org/mcp-arcade-cabinets:0.11.1` (manifest list `sha256:f8c9d22e…`, amd64 and arm64, pulled back and smoked: both cabinets list their tools with the network off). Tag `v0.11.1` at `f54f936`. [GitHub release](https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/releases/tag/v0.11.1). `release.yml` published both with provenance in one run: `@mcptoolshop/ghost-on-the-menu@0.11.1` (63 files, 5.88 MB packed, registry time 2026-09-16T21:37:40Z) and `@mcptoolshop/vibe-typer@0.11.1` (142 files, 6.54 MB packed, 21:39:17Z); both re-fetched tarballs scan CLEAN, both bins say 0.11.1, Ghost's `--mcp` lists six tools and Vibe's four, and the shipped Vibe bundle no longer carries the cut lines. The registry took about four minutes to resolve both this time. **What the Director said stands over this pick-up:** the Kimi reviews and the coordinator's briefs let nonsense through to a published game; a dogfood swarm of this repo is his next step, and every gate here should be read as necessary, not sufficient.

**v0.11.0 (2026-09-16, released on the Director's word; both packages published).** Tag `v0.11.0` at `e454d9e`. [GitHub release](https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/releases/tag/v0.11.0). `release.yml` published both with provenance in one run: `@mcptoolshop/ghost-on-the-menu@0.11.0` (63 files, 5.89 MB packed, registry time 2026-09-16T20:52:24Z) and `@mcptoolshop/vibe-typer@0.11.0` (142 files, 6.55 MB packed, 20:52:30Z). Both re-fetched tarballs scan CLEAN; both bins say 0.11.0; Ghost's `--mcp` lists its six tools, Vibe's lists `ask, product, react, view`. Pages serves 0.11.0 with the tiles, the avatars, the cards and the beds. **The first release run failed and published nothing**: an apostrophe in a comment inside the tarball step's single-quoted node script ended the string on the runner (a bash syntax error after the version gate and the build had passed). The tag and the release were deleted and recreated on the fix commit; `packages/launcher/test/release-workflow.test.ts` now refuses any apostrophe inside those blocks. The registry answered 404 for about ninety seconds after the publish, as the v0.8.0 note predicts. **After the tag, on `main`:** the agent's face moved from the chat header to the editor's header beside the beat word, on the Director's read of the published page (`627b8da`, in the changelog's Unreleased); and the lead's proofread of the pools that are drawn blind, after the Director read nonsense on the field (a reply promising a greeting under a sandwich ledger, a hinge asking a door to creak): six pools cut by hand to the lines that make sense against any request, twelve generic reviews rewritten, a test that refuses a piece noun in those pools, the rule in both voice sheets, the integration stack's asks written from the tool the code calls, floors set to what a level's draw needs, and `sandwich-ledger`'s hardcore drain moved off its cliff (the record is the last section of `docs/vibe-typer.slice4.md`). Both are on Pages and ship with the next npm release. **And the image:** `ghcr.io/mcp-tool-shop-org/mcp-arcade-cabinets:0.11.0` (amd64 and arm64, manifest list `sha256:312068b2…`) carries both cabinets' stdio servers, `CABINET=vibe` selecting the typing cabinet, the first image since `:0.7.0`; both tool lists smoked with the network off and the app layer scanned clean before the push (`docs/cabinet-container.md`). A Vibe entry in the Docker MCP Catalog is a separate registry PR, the Director's. **The lesson that outranks the rest of this pick-up:** a content slice is read as a player by the lead before it is released; form gates, editor passes and diff reviews all passed lines that made no sense. Slice 4 of Vibe Typer shipped in full through the full treatment's Phases 6 and 7 as run for 0.10.0: **A** (the container tools `view`, `product`, `ask`, `react` in `packages/cabinet-server/tools.vibe.json` and `catalog/tools.vibe.json`, a second stdio entry `server-vibe.ts`, `@mcptoolshop/vibe-typer --mcp` real, `pnpm sit --cabinet vibe-typer --seat mcp`; the `ask` tool refuses a repeat), **B** (the rest of the look through Comfy Cloud, one yes per batch: fifty-six piece tiles cut from seven contact sheets, the two avatars, the three milestone cards drawn over the preview and the deploy ribbon; the backdrop was generated once and **dropped** on the Director's read because it was briefed as a mood and belonged to nobody in the fiction, its spend on record in `docs/art/receipts.json → vibe_typer_batch_5` and the branch archived as `archive/vibe-typer-s4b4-backdrop`), **C** (the voice on the user's lines through the worker: the ask, the creep, the check-in, the reaction, the review, preset `am_echo` in `cabinet.json → voice` and named in the sheet, two takes in hand at a request boundary so the reaction is heard cold, the Vibe launcher lights `/voice`), **D** (seven ACE-Step beds behind `music: on`, through Comfy Cloud at no credit cost, the pack and the release check requiring all seven by name; the editor pass on `mistral-large-3:675b-cloud` over Kimi's pools with the same-family gate in the tool, 83 drops, floors held, no lever moved). **The user is a man with an overgrown beard and messy hair**, set by the Director on 2026-09-16, in the avatar, the voice and the voice sheet. Every merge had a Kimi K2.6 review from a packet (`docs/vibe-typer.slice4*.review.md`, packets cut from the merge base after one review read a moved `main` as removals); status, numbers and one hundred decisions are in `docs/vibe-typer.slice4.md`. Tests 664 → 823. Tarballs at the tag: Ghost 63 files, 5.89 MB packed, unchanged in content; Vibe 142 files, 6.55 MB packed. **Owed after v0.11.0:** the Director's `npm deprecate @mcptoolshop/vibe-typer@0.0.0 "placeholder"`; the `nag` tool; the shell's pull-path recent-asks ordering (slice 4 decision 22); the hardcore cliff on the `sandwich-ledger` level (two ten-thousandths of drain decide it, a design look, not a re-tune); the two record pools the editor could not read reliably (`user.reactionsByTopic`, `user.reviewsByProduct`); the reaction heard cold six times in eleven (the two-take cap; options in the doc); the pronoun sweep of the authored pools for the character if any line implies otherwise; Ghost's older leftovers below. **Three things slice 4 taught, now in memory:** an art or voice brief must decide the story (who the character is, whose room it is, where it is shown and at what size) with the Director before it names pixels; a builder worktree's ignored outputs must be copied out before the worktree is removed; a review packet is cut from the merge base, never against a moved `main`.

**v0.9.0 (2026-09-15, full treatment, published on the Director's decision to treat and then publish)** Tag `v0.9.0` at `5636d53`. [GitHub release](https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/releases/tag/v0.9.0). npm `@mcptoolshop/ghost-on-the-menu@0.9.0` published by `release.yml` at 2026-09-15T21:35:58Z (103 files, 6.4 MB packed, provenance attested); the re-fetched tarball scans CLEAN, carries both cabinets and the five keyboard sets, `--version` says 0.9.0, `--mcp` lists the six tools as 0.9.0. That package now serves **both** cabinets on `npx` (`--mcp` is still Ghost's server). The registry showed a 404 for two minutes after the publish, as the v0.8.0 note predicts; the timestamp was the proof. Pages serves both at `/play/`; the landing page is the arcade (cabinets, Inside Vibe Typer, Inside Ghost, play cards); the handbook has a Vibe Typer page and its index, getting-started, reference, architecture and security pages describe two cabinets. README translations regenerated from the entrance README before the tag. The dated-jokes switch was removed on the Director's word (menu, prefs, sim option, lever pool, tests). Shipcheck: every A–D line checked or SKIP, E complete except Vibe Typer's own logo. Repo-knowledge: thesis, architecture, v0.9.0 release summary, next step and the Vibe Typer lock convention refreshed. Identity scan CLEAN on the tracked tree and on the packed tarball.

**v0.10.0 (2026-09-16, released on the Director's word; both packages published).** Tag `v0.10.0` at `f75cc08`. [GitHub release](https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/releases/tag/v0.10.0). `release.yml` published both packages with provenance in one run: `@mcptoolshop/ghost-on-the-menu@0.10.0` (Ghost only again: 63 files, 6.04 MB packed, registry time 2026-09-16T12:14:54Z) and `@mcptoolshop/vibe-typer@0.10.0` (72 files, 1.07 MB packed, 2026-09-16T12:14:57Z). Both re-fetched tarballs scan CLEAN; both bins say 0.10.0; Vibe Typer's `--mcp` exits 2 naming slice 4; Ghost's `--mcp` lists its six tools at 0.10.0. Pages serves 0.10.0 with both cabinets and the device frames. Slice 3 shipped in full: A (American English with a test, the settings row and `--vibe-font`, beat words in `cabinet.json`), A2 (the music setting, soft by default), B1 (`author.mjs` and the three-model sample), B2 (per-snippet asks, story levels, reactions by topic, reviews by product, the nag mechanic), B3 (the full authoring run on `kimi-k2.6:cloud`, sixteen levels, the sweep), B4 and B5 (the coherence pass: two voice sheets under `patterns/voice/`, forty items a call with memory, the editor pass; then the sync chatter and the premises on the right sheets and Sprocket's image tic pruned), C (the code gate, `feedRequests`, `/cabinet/endless`, the seat in the shell, `pnpm sit --cabinet vibe-typer`), D1 (the logo and five frames, seven of twelve generations), E (the menu by stack, the seat named on the endless entry), F (one npm package per cabinet). Every merge had a Kimi K2.6 review from a packet (`docs/vibe-typer.slice3*.review.md`); status, decisions and what the next pass should know are in `docs/vibe-typer.slice3.md`. The agent's default name is Sprocket. **Owed after v0.10.0:** the Director's `npm deprecate @mcptoolshop/vibe-typer@0.0.0 "placeholder"`; the remaining art batches (piece tiles, avatars, milestone cards, the backdrop) on a yes each; slice 4 (the container tools `product`, `ask`, `react`, after which `--mcp` on the Vibe package means something); a different-family editor for the next authoring pass; the voice on the user's lines; ACE-Step beds per stack; the GHCR image; Ghost's older leftovers below.

**Next session: `docs/vibe-typer.kickoff-s4.md`** (slice 4: the container tools, the rest of the look, the voice on the user, beds per stack). **History:** `docs/vibe-typer.kickoff-s3.md` was the slice-3 brief, consumed by v0.10.0. The Director played v0.9.0 and set the next slice: the dialogue and the jobs are load-bearing and were thin (per-snippet asks, level stories, nags like "status?" and "are you done yet?", reactions that know what shipped, authored offline by a writing model over OpenRouter or Ollama Cloud with the Director picking from a sample); endless becomes model-based and really endless (the model writes the code too, behind a code gate; G28 amended); American English everywhere with a test; a font-size setting; visual work through the `comfy-mcp` skill (logo, device frames, piece art, avatars, milestone cards, a backdrop); sixteen or more levels. Opus builders only, no Fable subagents. Next release `0.10.0`.

**Owed after v0.9.0:** slice 3 (the endless user seat through the say gate, the voice on the user's lines), slice 4 (container tools `product`, `ask`, `react`), art for the preview pieces and a Vibe Typer logo, ACE-Step beds per stack, the GHCR `0.9.x` image, plus Ghost's older leftovers below.

---

# History — the day Vibe Typer landed (2026-09-15, before the tag)

Read this, then `CLAUDE.md`, then `docs/vibe-typer.dispatch.md` (the Director's brief, the research, the lock G23–G30, the levers, the four slices), then `docs/vibe-typer.slice1.md` (what slice 1 built, the band numbers, twenty decisions, and the exact `index.ts` surface the shell consumes), then `docs/vibe-typer.kickoff.md` (the slice-1 brief, kept as the pattern for slice 2's). The Ghost pickup below is unchanged and still `0.8.2`; nothing in Ghost, `tape-core`, `cabinet-server` or the launcher moved.

## Where it is (2026-09-15)

- **Vibe Typer** is a second cabinet, headless only, in `packages/vibe-typer` (private). Named by the Director; tagline "You're absolutely right."; the multiplier's field word is **vibes**; the agent's default name was Claudette until 2026-09-15, when the Director asked for a neutral name and it became Sprocket. `pnpm verify` runs its play-through (`pnpm test:play vibe-typer --tier 0 --bot typist:40`) beside Ghost's. Ninety-five tests, sixteen band bars, three seeds, eight levels, four tiers. The corpus is dev-op-typer's 249 snippets plus an integration stack from the tapes. The Kimi review of the slice-1 diff is `docs/vibe-typer.slice1.review.md`.
- **The README is the arcade's entrance** (cabinet table, the shared chassis, layout, adding a cabinet). Ghost's page is `packages/ghost-on-the-menu/README.md`. Logo: the cabinet render in the brand repo (`readme.png`; the ghost icon is `ghost-readme.png`). Repo description and topics updated by `gh repo edit`. The seven translated READMEs still describe Ghost; **translations run before the next tag, not before** (GPU; the watchdog was down this session).
- The v0.7.0 dogfood swarm's eighty local branches are merged; their worktrees still sit under `.swarm/worktrees/` with 33 dirty diffs archived as patches in `.swarm/archive/`. Removing them was blocked by the permission classifier; the Director runs the one-liner in the session record if wanted. `.claude/` is git- and prettier-ignored now (builder worktrees live there).

## Slice 2, the shell, landed the same day (Opus, `docs/vibe-typer.kickoff-s2.md` → `docs/vibe-typer.slice2.md`, Kimi review `docs/vibe-typer.slice2.review.md`)

The cabinet plays in the browser: `pnpm -F @mcp-arcade-cabinets/cabinets dev`, pick **Vibe Typer** on the switch, pick a product, **Play**. The coordinator played level one end to end with synthetic keystrokes: reply, code, a creep, four pieces in the terminal frame, the deploy ribbon, the standup at valuation 126 with the `seed` milestone and the run's seed. Pages builds both cabinets into `/play/` (`pnpm build:play`); the launcher packs the same bundle, so `npx @mcptoolshop/ghost-on-the-menu` would serve both after the next release — the Director's call whether that is wanted before Vibe Typer has art. The Director has not played it yet; that is the next thing that matters.

## Next: slice 3, the seat and the retro's history (one Opus brief, from `docs/vibe-typer.dispatch.md` § Build plan)

The endless user seat as a lever fill through the say gate, pull path (the launcher's tiered seat: Claude by API key, else an Ollama cloud tag, else local), prefetch, authored fallback; the voice worker on the user's lines; README section and a handbook page; translations before the tag. Then slice 4, the container tools `product`, `ask`, `react`. Art for the preview pieces and ACE-Step beds wait on the Director's word after he plays it on rectangles.

## What slice 2 was briefed as (kept for the record)

`apps/cabinets/src/vibe-typer.ts` with the same mount shape as `mountGhost`; a two-card picker in `main.ts` with Ghost as the default; DOM chat and editor, canvas preview that grows by `state.built`, the scoreboard words from `cabinet.json`; the keystroke audio (LoKey-Typer's `TypewriterAudio` shape with dev-op-typer's five keyboard sample sets under `E:/AI/prototypes/packages/dev-op-typer/DevOpTyper/Assets/Sounds`), a cue table off `state.events`, the procedural bed with tempo on hype; quick sync; Pages. The launcher rides along only after the shell exists (it packs `apps/cabinets/dist`), and the npm package name stays Ghost's. Slice 3 is the endless user seat (pull path) and the retro; slice 4 the container tools `product`, `ask`, `react`.

## Decisions the Director made this session, so nobody re-litigates them

Tone gleeful and absurd, the user comically absurd and the agent sycophantic and lovable; a real scoreboard with combos and multipliers whose points correlate with what is built; the payoff is that something is built; levels with an endless option; a context timer that is joyful in levels and painful only in hardcore; the endless user may be a model as a lever fill (G28); the name Vibe Typer. Two earlier drafts were refused: Ghost-with-a-keyboard, and a nagging-user design.

---

# HANDOFF — Ghost on the Menu, v0.8.2

Read this, then `CLAUDE.md`, then `docs/npm-launcher.md`, then `docs/npm-launcher.review.md` (Grok, 2026-09-14, no halt; the three changes applied), then `docs/shift.dispatch.md` (G19–G22), `docs/cabinet-container.md`, `docs/cabinet-server.md`, `docs/cabinet-voice.md`, `docs/ollama-content.md`. Lock: G1, G7–G10, G11–G18, G19–G22. Still `0.x`. **One package is on npm** — `@mcptoolshop/ghost-on-the-menu@0.8.2` is the one to install. `0.8.1` play mode is the Pages chrome; `0.8.0` handshook as `0.7.0`.

## Shipped in v0.8.2 (Grok, 2026-09-14, launcher seats, published on the Director's word)

Tag `v0.8.2` at this commit. GitHub release; npm follows from `release.yml`. Do not retag `v0.8.0` or `v0.8.1`.

The three changes from `docs/npm-launcher.review.md`:

- **Play mode lights the local seats.** `VITE_LOCAL_SEATS=true` at pack time. Pages still omits them. The pack andons if the play bundle is missing `data-local-seats`, `/ollama/api/tags`, `/ollama/api/generate`, or `Ollama bosses`. Measured: launcher bundle has all four; a plain `vite build` has none of the first three.
- **Archivist sits the say seat.** `BOSS_KINDS` in `packages/launcher/src/serve.ts` and `apps/cabinets/vite.config.ts` is four kinds, in step with the sim.
- **Next-verb is `POST /api/generate`** on both allowlists. Pull/delete/create still 404 before a socket opens. Fire stays on `/api/chat`.

`--mcp` is unchanged and still the path that already worked.

### Two things the Director still owns

1. **Flip "Require 2FA and disallow tokens"** on the package access page.
2. **`npm deprecate @mcptoolshop/ghost-on-the-menu@0.0.0 "placeholder"`** — and, if wanted, deprecate `0.8.0` for the wrong handshake. `0.8.1` play mode is the Pages chrome; say so if you deprecate that too.

### Still open

- **Bump the GHCR tag** in both READMEs once an `0.8.x` image is pushed; they correctly still say `0.7.0`. GHCR has `:0.5.0`, `:0.6.0`, `:0.7.0` only.
- Still deferred from v0.7.0: Comfy Cloud polish of `probe.png`, `shelf.png`, `ledger.png`, `boss-archivist*.png`; `archivist.mp3` then `TRACK_KEYS`; `feel: loud` as a real mix preset; silent `takeEl.play()`; mix-overlap unasserted; `pnpm film` never captures the end scene; Catalog `source.commit` trails HEAD.
- **Still parked:** House Call; slice 5 stingers/backdrops; no MCP shift/climb tool; no next-verb MCP tools.

## Pickup after v0.8.1 (Grok, 2026-09-14, the launcher review) — history

Tag `v0.8.1` at `8ac309f`. [GitHub release](https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/releases/tag/v0.8.1). npm `0.8.1` published 2026-09-15T00:46:17Z. Grok reviewed the launcher (`docs/npm-launcher.review.md`). No halt in the sim lane. Tracked-tree identity scan **CLEAN**. The three changes landed as v0.8.2 above.

## Shipped in v0.8.1 (Claude, 2026-09-14, handshake fix + npm hero)

Tag `v0.8.1` at `8ac309f`. The MCP seat announces `0.8.1`. The release gate now reads `SERVER_VERSION` out of the source and halts on a mismatch (negative-tested). Hero art on the npm-only README (absolute raw URL). Repo README translations were not owed.

## Shipped in v0.8.0 (Claude, 2026-09-14, the npm launcher, published on the Director's word)

Tag `v0.8.0` at `d0b17b7`. [GitHub release](https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/releases/tag/v0.8.0), Pages, and **npm**: [`@mcptoolshop/ghost-on-the-menu@0.8.0`](https://www.npmjs.com/package/@mcptoolshop/ghost-on-the-menu) — published by CI over OIDC with provenance (`_npmUser: "GitHub Actions"`, sigstore log index 2837055244, 63 files, 6.0 MB packed). Translations shipped **with** the tag this time, all eight languages.

`packages/launcher` is the only package that publishes; the other four stay `"private": true`. It declares no runtime dependencies — esbuild collapses the workspace — which is what keeps this to one package. `npx @mcptoolshop/ghost-on-the-menu` serves the shell on loopback; `--mcp` is the stdio cabinet server. Play-mode local seats landed as v0.8.2. `--mcp` was smoke-tested from the registry after the 0.8.0 publish.

**Cutting a GitHub release now publishes to npm.** After 72 hours an npm version can only be deprecated, never unpublished. Compensators in `docs/npm-launcher.md`.

### What this release taught, kept because it will recur

A registry 404 is **not** proof a name is unpublished. `registry.npmjs.org` lags npmjs.com by roughly two minutes after a publish, and npm says so in its own output. A session read a 404 that arrived 115 seconds after the placeholder publish, concluded npm allows Trusted Publishing on a non-existent name, and rewrote the canonical playbook twice on that basis before the timestamps settled it. `npm view <pkg> time --json` is authoritative. The full account is in `docs/npm-launcher.md` and the `npm-placeholder-bootstrap` playbook.

---

# History — pickup after v0.7.0

**Pickup after v0.7.0 (Grok, 2026-09-14, dogfood swarm + full treatment, published on the Director's word).** Tag `v0.7.0` at `34433f5`. GitHub release, Pages, GHCR `:0.7.0` (`linux/amd64`+`linux/arm64`, digest `sha256:162480aa60565d6c629b82ef58dc158151f9490d3a669c5f579b53a7af16314d`). Catalog PR docker/mcp-registry#5061 still sealed (network off, no voice), awaiting Docker. The player is the agent; a shift is four flavored calls.

## What shipped in v0.7.0

- Shift flavors (pressure / area-deny / trough / peak) on climb `[0, 0.35, 0.7, 1]`. Card telegraph in words. Field rooms follow the named bed.
- Cast: probe, shelf, ledger. Archivist closes inspect on a shift. Picker-alone inspect has no Archivist (band).
- Named beds, ducked mix, 36s hold (one loop) before a switch.
- Offline gated aside bag (24 per room, no replacement). Not an Ollama seat.
- Ollama `askNextIntents` / `bossQueue`. Timeout is script. Pages omits local seats.
- Catalog user-tape overlay, multi-arch CI, host compose at `voice/compose.host.yaml`.

## Next (cover in a few days)

1. **Translations.** GPU was busy; this tag shipped English-only. `v0.7.0` is immutable — do not retag. On a follow-up commit: `node E:/AI/polyglot-mcp/scripts/translate-all.mjs E:/AI/mcp-arcade-cabinets/README.md` then `git add README.md README.*.md`.
2. **Comfy Cloud polish** of `probe.png`, `shelf.png`, `ledger.png`, `boss-archivist.png`, `boss-archivist-open.png` (graphic hulls shipped).
3. **`archivist.mp3`** then add `archivist` to `TRACK_KEYS` so Pages fail-closes.
4. **Health leftovers:** `feel: loud` as a real mix preset; silent `takeEl.play()`; mix-overlap unasserted; `pnpm film` default never captures the end scene; Catalog `source.commit` often trails HEAD (rebuild lever).
5. **Still parked:** House Call; slice 5 stingers/backdrops; no MCP shift/climb tool; no next-verb MCP tools.
6. **Director play** of asides + 36s beds when eyes allow.

---

# History — pickup after v0.6.0

Read this as history, then `CLAUDE.md`, then `docs/shift.dispatch.md` (slice 7, the shift: the research, the lock G19–G22, the numbers), `docs/cabinet-container.md` (slice 6), `docs/cabinet-server.md` (slices 1–3) and `docs/cabinet-voice.md` (slice 4), then `docs/ollama-content.md` (the v0.4.0 seats). The lock is G1, G7–G10 in `docs/study-swarm.dispatch.md`, G11–G18 in `docs/cabinet-server.dispatch.md`, and G19–G22 in `docs/shift.dispatch.md`. `docs/cabinet-server.kickoff.md` is history (slices 1–3 landed on `main`, untagged); `docs/ollama-content.kickoff.md` and `docs/ghost-wave-3.kickoff.md` are older history.

**This is a pickup after v0.6.0 (Claude, 2026-09-11, full treatment, published on the Director's word): the shift (slice 7, `docs/shift.dispatch.md`), the music rework, the container (slice 6), and Grok's reviews of both applied.** The direction is set: the player is the agent and the rig hands them the calls; a shift is the play. Tag `v0.6.0`, GitHub release, Pages, the image on GHCR (`:0.6.0`, digest `sha256:3b6c80ea…85b95b`; the package is public since 2026-09-11). The Docker MCP Catalog PR is open as docker/mcp-registry#5061 (sealed entry, network off), awaiting Docker's review. Still `0.x`, still not npm. The v0.5.0 pickup below stands as history.

**The v0.5.0 pickup (Claude, 2026-09-11): slices 1–4 of `docs/cabinet-server.dispatch.md`, the music rework and the tuning, reviewed by Grok (`docs/cabinet-server.review.md`, `docs/cabinet-voice.review.md`).** Tag `v0.5.0`, GitHub release, Pages. The tuning diff (`git log fe47dae..b4c5a33`: `patterns.ts`, `sim.ts`, the pattern files) shipped before Grok's review of it; that review is still owed.

## What landed after v0.4.0 (untagged, on `main`)

- **`packages/cabinet-server`**: the cabinet as a stdio MCP server (official SDK). Tools `fire`, `say`, `sfx`, `view`, `tapes` from `tools.json`; fact-blind at the boundary (`CabinetHost` of words; fact-flip test per tool); the say gate and `personas.json`; the say seat tiered by capability (Claude agent by `ANTHROPIC_API_KEY` on the node side, else Cloud tag, else local). `pnpm test:play ghost --seat mcp`. New sim lever `state.bossSay` (a gate-passed line lands as an aside).
- **The shell's seats moved behind the contract** (`apps/cabinets/src/ghost.ts`): the fire seat through Ollama tool calling with prefetch, revoke on the boss's words, warm-up, `keep_alive`; the say seat through the dev server's `/cabinet/say`. Two status words beside the picker name the tool each seat called. The schema path is off in the shell (measured: it silences local models).
- **`pnpm sit`** reports per model: verb collapse, tool suppression, bad verbs, revoked, late, and what the gate refused. `--constrain on|off`, `--say on|off`, `--seat mcp|prompt`.
- **The Ghost's own tapes**: `fixtures/tapes/cabinet.*.tape.json` from `mcp-arcade bout --target stdio` against the server (naive and task-only, wrap off and on). On its own menu the naive policy followed nothing. The band's roster is derived from disk now (twenty tapes).
- **The panel**: `docs/cabinet-server.panel.md`, every G12 and G14 claim confirmed by two family-different jurors. Grok's review (`docs/cabinet-server.review.md`): no halt; the gate now refuses any digit glyph; only one-sentence lines seed the say prompt (the Director's word).
- **The voice (slice 4, G15)**: `voice/worker.py` (Kokoro + faster-whisper + fx-dub's spoken-content receipt), the `speak` tool, voice sheets in `personas.json`, the voicer in the shell (a **Voice** checkbox, on only when `pnpm voice` is up), `pnpm sit --voice`. Numbers and decisions in `docs/cabinet-voice.md`.

## Next

1. **The Director plays the seat on the local shell**: `pnpm voice` in one terminal, `pnpm -F @mcp-arcade-cabinets/cabinets dev` in another, the **Ollama bosses** and **Voice** checkboxes, a Cloud tag. Hears the lines. Set `ANTHROPIC_API_KEY` in the dev server's environment to sit the Claude tier; it was built, not measured live.
2. **The voice pass on `voice.json`** is the Director's: the seed pools are thin (whisperer three, menu five, doorman two one-sentence lines of eight each), and the three preset voices (`bf_emma`, `am_michael`, `bm_george`) are a first cast. A clone per boss kind waits on a consented recording; `personas.json → boss.<kind>.voice.clone` is the slot.
3. **Grok's slice-4 review is in** (`docs/cabinet-voice.review.md`, no halt): the three changes it asked for are applied (the shell's audio url behind the proxy, the worker's audio route receipt-gated, the voicer never plays over a catch and drops a held take on a newer line). Its slice-6 list stands: bind for the container, a secret on the hook, a cache cap, no rig path default. Its paragraph on the budget is for the Director: start at one second.
4. **The music** was reworked on the Director's play notes (a bed holds two minutes, then crossfades into the playing wave's bed; bursts as an overlay; a fade at the scene). With **Voice** on every boss speaks its authored spawn line, so the voice is audible without a seat. **Tuning on the same notes:** rounds fifteen percent longer with every clock slowed to match, bursts of four to nine seconds that climb by wave (`copiesLater`, `intensityLater` in `parallelism.json`). The band admits it with the live sweeper exactly on the bar; a third longer did not (nine deaths against five). Longer waves than this mean a fourth lamp on the long tiers or a relaxed band, the Director's call. Grok reviews the pattern and loader diff (`patterns.ts` gains `copiesAt`, `intensityAt`, `waveProgress`; `sim.ts` reads them in `fireScale` and `spawnDecoys`). The Director hears it again; the `poison`, `rug`, `unlisted` and `breather` beds are no longer picked by the shell (the boss beds carry their waves) and are the Director's to reassign or retire.
5. **Slice 6, the container, landed after v0.5.0** (`docs/cabinet-container.md`): the `Dockerfile`, the image on GHCR (`ghcr.io/mcp-tool-shop-org/mcp-arcade-cabinets:0.5.0`, digest `sha256:743a9eda…3bca75`, pushed by the Director; the `gh` token now carries `write:packages`), the worker hardened for the container route (bearer token, cache cap, no rig path default), and the Catalog entry drafted under `catalog/`. **The Director opens the PR to `docker/mcp-registry`** (copy `catalog/server.yaml` and `catalog/tools.json` into `servers/mcp-arcade-cabinets/`; the pinned `source.commit` is the one that carries the Dockerfile). Grok reviewed slice 6 (`docs/cabinet-container.review.md`, no halt; both changes applied). **Slice 5** (stingers and backdrops) waits on the Director's word.
6. **Slice 7, the shift, landed the same day on the Director's decisions** (lamps refill at every call; the climb is the lever; four calls; a replay code): `docs/shift.dispatch.md` is the research, the lock G19–G22, what was built, measured and refused. New: `packages/ghost-on-the-menu/src/shift.ts`, `patterns/shift.json`, `copiesShift` / `intensityShift` in `parallelism.json`, `Round.climb`, the shift bar in `band.test.ts`, `pnpm sweep --climb 1`, and the shell's **Shift** button, call card, code box and closing scene. Grok reviewed it (`docs/shift.review.md`, no halt; `ribbon` swapped off the word list; a mixed-word check on the code is a later lever). The music was reworked the same day on the Director's notes: seeded openings from the five wave beds, rotation at each hold, music carried through a shift, the burst track gone and the bed sped up instead. **The Director plays a shift** and says whether the climb list wants a trough on the third call and whether four is the length; both are data (`shift.json`). Untagged; translations before the next tag.
7. Translations before any later tag, not before.

---

## The v0.4.0 pickup as it was written

Read this, then `CLAUDE.md`, then `docs/ollama-content.md` (the decisions from the Ollama session). `docs/study-swarm.dispatch.md` is G1, G7, G8, G9, G10 only. `docs/ollama-content.kickoff.md` and `docs/ghost-wave-3.kickoff.md` are history — the seats shipped as v0.4.0; wave 3 shipped as v0.3.0.

**This is a pickup after v0.4.0 (Claude, 2026-09-10, the Ollama seats, full treatment, published on the Director's word).** Tag `v0.4.0`, GitHub release, Pages. Still `0.x`, still not npm. The next thing that matters is the Director's own play of the seat on the local shell.

## What shipped in v0.4.0

- **The Cloud boss now sits.** `gpt-oss` on Ollama Cloud ignores `think: false`; v0.3.0's default seat was the scripted boss every beat. `pilot.ts` retries with `think: 'low'` and remembers. Measured ~550 ms a beat, no fallbacks (`pnpm sit`).
- **The seat is felt.** `spread` is a wide fan, `column` leans the boss over the ship then aims, `hold` is a silent still beat. New lever `fire.json → tiers.N.boss.pilot { fan, spread, lean }` with schema and fact-flip tests. The view carries the stick and the phase motion word; health is against the real max.
- **The voice seat.** Each boss picks which of its own `voice.json` lines it says at spawn (a letter reply; `state.bossLine`). Drafts unchanged.
- **Seat status** beside the picker (words only; never on the field). Retired Cloud tags say so instead of silently scripting.
- **`pnpm sit`** (`scripts/sit.mjs`): the headless sit that measured all of this.
- Refused with reasons in `docs/ollama-content.md`: parallelism toggle (seed's fairness), path pick and phase pick (not this session, written up), asides.

## Next (Director, 2026-09-10): the cabinet server

The Director authorised a study-swarm for the next layer: the cabinet as an MCP server in a Docker container, listed in the Docker MCP Catalog, whose tools are the levers a model uses (fire, say, sfx, stinger, voice, backdrop). The dispatch is `docs/cabinet-server.dispatch.md`: 24 verified findings, the lock extended G11–G18, the tool list as levers, a six-slice build plan. The paste-ready brief for slices 1–3 is `docs/cabinet-server.kickoff.md`.

1. Next session: paste `docs/cabinet-server.kickoff.md` (server, seat over tools, self-bout). Not voice, stingers, backdrops or the container yet.
2. Still open from v0.4.0: play the seat locally and react to the voice drafts; Grok reviews the Ollama-session diff (`git log 6e1b95f..v0.4.0`).
3. Everything below this line is the v0.3.0 pickup as it was written, kept for the layout, lanes, lock and gate. Where it says `v0.3.0` / `23b5d87`, read `v0.4.0` and the tag.

---

## Where it is (verified 2026-09-10)

| What         | Value                                                                        |
| ------------ | ---------------------------------------------------------------------------- |
| Repo         | `E:/AI/mcp-arcade-cabinets` (`mcp-tool-shop-org/mcp-arcade-cabinets`)        |
| Commit / tag | `23b5d87` / `v0.3.0`                                                         |
| Release      | https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/releases/tag/v0.3.0 |
| Landing      | https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/                     |
| Game         | https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/                |
| Handbook     | https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/            |

Landing header **Play**, hero **Play Ghost on the Menu**, and the usage card all go to `/play/`. Live `/play/` serves the class sprites (`answer.png`) and ACE-Step beds (`parallelism.mp3`). Pagefind is up.

All workspace packages are `"private": true`. The release is the git tag, the GitHub release, and Pages. **Not npm. Not 1.0.0.** Identity scan was CLEAN on the tracked tree, the tag archive, and the re-fetched GitHub tarball.

## The Ollama session as it was briefed (done; kept for the record)

**Focus: the Ollama boss feature, then other Ollama content behind the proper levers.** The whole session. Do not start leftover slice-3 classes, sprite-fit, or a new wave unless this work is done and the Director says so.

### 1. The boss seat that already exists

Local only: `pnpm -F @mcp-arcade-cabinets/cabinets dev`. Checkbox **Ollama bosses**, model picker next to it. Vite proxies `/ollama` → `127.0.0.1:11434`. Cloud tags first; default `gpt-oss:120b-cloud` when pulled. Pages cannot reach the daemon.

| Piece                                                | Where                                     |
| ---------------------------------------------------- | ----------------------------------------- |
| Frozen prompt, parse, Cloud tag match                | `packages/ghost-on-the-menu/src/pilot.ts` |
| Shell checkbox, picker, `/api/tags`, `/api/generate` | `apps/cabinets/src/ghost.ts`              |
| Proxy                                                | `apps/cabinets/vite.config.ts`            |

The prompt is frozen and fact-blind (G7). `think: false` plus a short `num_predict`. Parse the **last** matching verb (`spread` / `column` / `hold` / `fog` / `plate` / `script`), not the first word. If the call fails, the sim keeps the scripted phase fire. A fact in the prompt is a halt.

Play it on the machine with the daemon. Make the seat actually change the fight in a way a player can feel, without ever seeing a lie.

### 2. Other ways Ollama can add content (levers first)

The cabinet already has data levers under `packages/ghost-on-the-menu/patterns/` (paths, formations, fire, bosses, ladder, waves, player, drops, voice, parallelism). Ollama may **fill those levers**, not invent a second sim.

Allowed shape: the model proposes or picks from a closed set the JSON already names (a voice line from `voice.json`, a path from a class pool, a boss phase already in `bosses.json`, a parallelism burst on/off as the file allows). Same G7 envelope as the boss seat: no fact, no lie flag, no digit, no score word. Seed still owns fairness. The band still andons a gallery or a wall.

Not in scope this session: a second generate path, writing new sprites, talking to an MCP server, Docker MCP Toolkit, or anything Pages would have to call.

If a new lever is needed, add it as JSON first, with a load-time schema and a fact-flip test, then let Ollama sit in it. Do not let the model key motion, look, or timing on a lie.

## What to do

1. Sit the local Ollama boss (Cloud tag if pulled). Feel it. Fix what is thin.
2. List other content seats that fit the lever rule above. Build the ones that stay inside G7.
3. Do not invent wave 4. Do not unpark House Call. Do not add a Docker MCP Toolkit server unless they ask — that is a later, separate slice (tools for an agent, not the generate path, not a Pages-to-localhost hop).
4. Voice drafts in `patterns/voice.json` still wait on a play reaction. They are not this session's job unless a lever-seat writes from that file without changing the copy.

## What shipped in 0.3.0

Wave 3 from the kickoff, plus spend-approved art and sound, plus the Cloud boss picker:

- **Drops** (`patterns/drops.json`): boss lamp, formation spread, fall **straight down** (drift 0). Never keyed on a lie. The kickoff said "drift toward the ship"; the Director's later play and the shipped sim are straight down. Move under them.
- **Voice** (`patterns/voice.json`): four-or-more dry lines per wave kind, boss kind, and the end, picked by the round seed. Drafts. They name the experiment and the creature, never a fact, never a digit.
- **Tape labels** (`src/label.ts`): fixture / seat / live plus an **i** why from header and wire shape. Fact-flip test. Hardcore is not a label; it is a selector override.
- **Hardcore**: ladder rung 3, selector only, never from `deriveTier`. One lamp, rage from the first shot, boss hazards (echo, band, plate).
- **Longer seat rounds**: duration clamps recorded 45–90, seat 90–180, live 50–130, hardcore 80–220.
- **More classes**: `init`, `ready`, `menu`, `grid`, `answer`, `fog`, `obstacle`, `stall`, `error`, plus three bosses. Handshake ack (`ready`) and error responses are their own classes.
- **Parallelism** (`patterns/parallelism.json`): seed-placed bursts of extra **honest** copies and a hotter track. Off on the recorded rung. Extra copies are never lies. Hardcore decoys fire; other rungs' extras do not unless `decoysFire`.
- **Art**: class sprites at 128 px under `apps/cabinets/public/sprites/` (answer, ready, error, drop-lamp, drop-spread, hazard-echo/band/plate, plus the v0.2.0 set). Receipts in `docs/art/receipts.json`. Flux 2 Max via Comfy Cloud. Licence: customer-owned, commercial ok, **must not train / distil / fine-tune**, do not strip credentials, do not add to a style dataset.
- **Sound**: recorded ACE-Step MP3s in `apps/cabinets/public/tracks/` (inspect, poison, rug, unlisted, whisperer, menu, doorman, breather, parallelism). Chiptune remains the fallback.
- **Ollama Cloud bosses**: `src/pilot.ts`. `isCloudModel` matches `:cloud$` or `-cloud$`. Default `gpt-oss:120b-cloud` when pulled. `think: false` and a short `num_predict` so a thinking 120B still returns one verb. Parse the last matching verb, not the first word.

## What is still open (not this session unless asked)

- **Voice approval.** Drafts in `patterns/voice.json`. Wait for the Director's play notes.
- **Slice 3 leftover:** the kickoff asked to map _every_ distinct wire shape in the sixteen tapes (`resources/list`, `prompts/list`, pings, long payloads, …). Not every shape has its own class yet. Classes today are the nine in `SpriteClass`. New sprites are a spend ask: count first, wait for the yes.
- **Sprite fit:** grid members draw in a member-width box; bosses stretch to the sim rect (the Menu squash is the point). If the Director wants boss art unstretched, that is an aspect-fit in `render.ts`, not a sim change. Claude's lane.
- **House Call** parked at `152f548` until a design that plays exists. `tape-core` still holds the scoring rules for that day.
- **Docker MCP Toolkit** later, separate.

## The lock

From `docs/study-swarm.dispatch.md`. Not negotiable:

- **G1.** Cabinets are read-only consumers of tape JSON (`mcp-arcade.tape/v1`). They never load a receipt. The reveal is the tape's wire-derived fact, never a game-computed verdict.
- **G7.** The cabinet arranges the tape; it does not transcribe it. Lies are shootable but not pre-labelled: they reveal on the hit. The round ends with a scene, not a count.
- **G8.** No shared-guess surface.
- **G9.** No "you beat" claim except against the instrument's pinned fact.
- **G10.** Every end screen names the tape, the server and the policy, and nothing more. No score, count, or digit on screen, ever.

Nothing about a lie may differ before the hit: look, motion, timing, sprite key, drop, label, boss pose, voice line, parallelism copy. Extra parallelism copies that clone a lie's class are still honest.

## Lanes

| Lane   | Owns                                                                                            |
| ------ | ----------------------------------------------------------------------------------------------- |
| Grok   | `tape-core`, `prepass`, `sim`, `patterns/*`, `label`, `pilot` (the frozen prompt and the parse) |
| Claude | `render`, `cues`, `audio`, `apps/cabinets` shell, bots, fairness band, docs, Pages copy         |

The Ollama session crossed lanes on the Director's brief: Claude edited `sim.ts` (the seat's verbs, the lean, the hold, the line pick), `pilot.ts`, `patterns.ts` and `fire.json`. Grok should review that diff (`git log 6e1b95f..main`).

Each reviews the other's diff. Cloud panel on G7 claims. Neither partner tags; the Director's word cuts a version.

## Layout

| Path                                  | What                                                                                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/cabinet-server`             | The cabinet as a stdio MCP server: `tools.json`, `personas.json`, the gate, the boundary, the seat machine, the say tiers, the voicer |
| `voice/`                              | The host-side voice worker (Kokoro, faster-whisper, fx-dub). `pnpm voice`. Runs from `.venv`, never in the container                  |
| `Dockerfile`, `catalog/`              | The cabinet server as a container for the Docker MCP Catalog; the drafted registry entry                                              |
| `packages/tape-core`                  | Load a tape, refuse forbidden keys at any depth, slice by atom                                                                        |
| `packages/ghost-on-the-menu/src`      | `prepass`, `sim`, `patterns`, `render`, `cues`, `audio`, `play`, `label`, `pilot`                                                     |
| `packages/ghost-on-the-menu/patterns` | Ten JSON files: paths, formations, fire, bosses, ladder, waves, player, drops, voice, parallelism                                     |
| `apps/cabinets`                       | Vite shell. `pnpm build:play` writes gitignored `site/public/play/` for Pages                                                         |
| `fixtures/tapes`                      | Twenty tapes (sixteen from the instrument, four the cabinet recorded of itself). The only input the game gets                         |
| `site/`                               | site-theme landing + Starlight handbook. `secondaryCta` stays `{ href: 'handbook/', label: 'Read the Handbook' }`                     |
| `scripts`                             | `play.mjs`, `film.mjs`, `sweep.mjs`, `sit.mjs`                                                                                        |

Tuning is data. Change a lever, `pnpm sweep`, then `pnpm test` (the band is the andon). A change that makes a gallery or a wall fails the build.

## The gate, every time before a push

```bash
cd E:/AI/mcp-arcade-cabinets
pnpm verify
python %USERPROFILE%\.grok\bin\identity-scan.py .
```

`pnpm verify` is lint, typecheck, test, build, and `test:play ghost --fixture naive-ndjson`. When a pattern changed, also `pnpm sweep`. Identity scan from the **repo** cwd, never from `C:\WINDOWS\system32`. Stage explicit paths; never `git add .`. Do not add `site/public/play` or `site/dist`. Git author is the org noreply. Pages deploy is a public surface — scan before push even when npm is held.

## Hard stops

- Stays `0.x`. A publish is not a promotion to 1.0.0.
- No npm. Packages stay private.
- No score, count, digit, pass/fail, NRP, integrity or utility on screen. The play-through greps screen text for any digit.
- Tapes only. No receipt, no `docs/proof`, no instrument code in this repo.
- Identity never ships (home path, personal mailbox, Tailscale, token paths, legal name, scanner needles). Needles stay in `~/.grok/secrets/identity-needles.txt`.
- House Call stays parked.
- Art spend only on the Flux 2 Max / Comfy Cloud route, with receipts. Re-check licence before any public deploy of new images.

## How we got here (short)

v0.2.0 published 2026-09-10 (playable cabinet, fairness band, first sprite set). Director play at tier 0: TV frame cheap, field too small, no full screen, "no logic." Frame gone, field full width, F for full screen, then wave cards, protocol order, answers, dives, boss fights, aimed fire. Wave 3 kickoff: drops, voice, more enemies, longer rounds, hardcore, labels. Grok built the sim/data; spend-approved sprites and ACE-Step beds landed; Cloud boss picker landed still at 0.2.0; full treatment published **v0.3.0** the same day. Git history from `7534b30` through `23b5d87` is the diary. Older "next slice: wave card and field reset" in prior handoffs **already landed**.
