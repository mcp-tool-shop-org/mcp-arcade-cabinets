# Kickoff — Vibe Typer, slice 4: the container tools, the rest of the look, the voice on the user

The next session's brief. Read `HANDOFF.md` (the v0.10.0 pick-up at the top), then `CLAUDE.md`, then `docs/vibe-typer.dispatch.md` (the brief, the research, the lock G23–G30), then `docs/vibe-typer.kickoff-s3.md` (slice 3's decisions and its amendment of G28), then `docs/vibe-typer.slice3.md` (what slice 3 built, its decisions, and § "What the next pass should know"), then this file. Version is `0.10.0` on npm for both packages; the next release is `0.11.0`. The cabinet plays and reads as one voice; this slice makes it an MCP cabinet, gives it its art, and lets the user speak.

## What v0.10.0 left owed, so nobody rediscovers it

- `@mcptoolshop/vibe-typer --mcp` exits 2 naming this slice. There is no Vibe Typer tool contract yet.
- The look has its logo and its five device frames; the pieces are still flat blocks, the chat has no avatars, the milestones toast a word with no card, the field has no backdrop.
- The user's lines are unvoiced. The voice worker speaks Ghost's bosses only.
- The editor pass of the authoring pipeline reads Kimi's lines with Kimi (same family).
- The Director owes `npm deprecate @mcptoolshop/vibe-typer@0.0.0 "placeholder"`; nothing here depends on it.
- Older: ACE-Step beds per stack; the GHCR image (`:0.7.0` is the last pushed); Ghost's leftovers in `HANDOFF.md`.

## Decisions carried from slice 3 that bind here

Written as decisions with their reasons, not as anyone's words.

- **A seated model writes the code the player types, behind the code gate (G28 amended).** The push path in this slice mirrors the pull path exactly: the same `{ product, ask, code, title, notes }` shape, the same `gateCode` and `lineFault`, the same silent fallback to the corpus.
- **One package per cabinet, no bundle.** The Vibe Typer container tools ship in the Vibe package's `--mcp`; the Ghost package's `--mcp` stays Ghost's six tools. Nothing new publishes without the Director's word; `0.11.0` is cut through the full treatment's Phases 6 and 7 as run for `0.10.0` (both tarballs re-fetched and scanned).
- **The bed is not a clock.** Any new audio (beds per stack, the voice) keeps `music: soft` calm and never ties tempo or level to the context bar.
- **Every spend batch is a yes.** Art through the `comfy-mcp` skill, one batch per Director approval, every generation logged in `docs/art/receipts.json` under a new key, the licence block reused, `ai-eyes` glyph checks on every image, rectangles and words as the fallback when a file is missing.
- **Bulk authoring is briefed with a chunk size, a voice sheet per character in every call, memory of the kept lines, an editor pass on a different family, and a budget in hours.** If this slice authors any lines (it should not need to), that is the shape.
- **Nothing yells (G25); nothing on the field names a model (G17); American English on every surface (a test enforces it).**

## Standing frame

The lead writes every public surface personally (README, package pages, handbook, landing, changelog, metadata). Builders write code, tests, levers and the slice doc (`docs/vibe-typer.slice4.md`, one section per sub-slice). One branch per sub-slice from `main`, one commit each, a Kimi K2.6 review from a packet before merge (the script shape is in the `prism-verify-on-this-rig` memory; a packet is the lock, the brief and the diff with levers' lines, receipts, images and the lockfile omitted), `pnpm verify` and `pnpm build:play` green, `pnpm build:launcher` green for both packages when packaging moves, identity scan clean before every push and on both packed tarballs before a tag. Translations run after the entrance README is final and before the tag. Builders are Opus subagents in worktrees; no Fable subagents; pass the model explicitly on every agent. Never quote the Director in a file; write the decision and the reason. The VRAM watchdog must be up before any GPU work (`pwsh -NoProfile -File E:\AI\training\_watchdog_start.ps1`); translations and the local lens use the GPU, Comfy Cloud does not.

Two practical notes from slice 3: another session's dev server may hold port 5173, so a second launch config on 5174 (`.claude/launch.json`, git-ignored) is the way to smoke the shell; and the Browser pane's `type` action does not reach the shell's window keydown listener, while a `javascript_tool` loop dispatching `KeyboardEvent('keydown', {key})` about 22 ms apart does.

## Standards compliance (this slice)

| Standard                 | Score | Evidence                                                                                                                                                                        |
| ------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PIN_PER_STEP             | 2     | The tool contract is JSON in `catalog/`, versioned with the package; art is receipted per image (model, seed, prompt); the sim stays seeded; voice takes carry fx-dub receipts. |
| ANDON_AUTHORITY          | 2     | One fact-blind test per tool; the code gate and the word gate refuse before anything reaches the field; the glyph check rejects an image; the band fails the build.             |
| NAMED_COMPENSATORS       | 2     | Branch pushes: delete the branch. Art: delete the files and the receipt rows before commit; revert after. npm and the release: `docs/npm-launcher.md`, both packages. No skip.  |
| DECOMPOSE_BY_SECRETS     | 2     | The container adapter (cabinet-server + the Vibe launcher), the art (shell + assets), the voice (shell + worker) and the beds are separate sub-slices with their own commits.   |
| UNCERTAINTY_GATED_HUMANS | 2     | Every art batch is a yes; the Director reads ten seated asks from the push path before it ships; feel numbers stay `// Director` constants or JSON levers.                      |
| EXTERNAL_VERIFIER        | 2     | Each diff is reviewed by a different family from a packet; the gates are mechanical; the voice's receipts come from fx-dub, not the model that wrote the line.                  |

## Sub-slice A — the container tools (the load-bearing one)

The push path of the seat: any MCP client plays the user in endless. In `packages/cabinet-server`, a Vibe Typer tool set beside Ghost's six, selected by cabinet (`--cabinet vibe` on the stdio entry, or a second entry the Vibe launcher bundles; the builder chooses and says why), mirrored into `catalog/tools.json` under its own cabinet key, one fact-blind test per tool, the same closed enums and the same gate discipline Ghost's contract has (`docs/cabinet-server.dispatch.md`, G11–G18).

- `product` — the client names the next endless product (at most eight words, through `lineFault` and the spelling list). The sim's next level takes it the way the pull path's `feedRequests` product override does.
- `ask` — the client sends one request: `{ ask, code, title, notes }` for the level in hand, through `gateCode` with the level's stack and band. Accepted, it is fed as the pull path feeds; refused, the tool answers with the gate's reason word and nothing else, and the corpus plays. A client may also ask for the closed view first (`view`: the product, the stack, the band words, the last three asks, the weak pairs, exactly what `/cabinet/endless` sends out) so it writes in band.
- `react` — the client writes the user's reaction to the piece that just shipped or the review at the deploy, through `lineFault`; a refused line falls back to the authored pool.
- The nags stay authored in this slice; a `nag` tool is a later pass once the three above are measured.
- `pnpm sit --cabinet vibe-typer --seat mcp` drives the contract in-process as Ghost's sit does, prints the same numbers as the pull path (asks, accepted, refusals per reason, latency) and ten sampled asks with their code for the Director's read.
- `@mcptoolshop/vibe-typer --mcp` now hands stdio to that server; the exit-2 line goes; the pack carries the bundle (the Vibe tarball grows by it; measure and record); the release smoke lists the Vibe tools by name; `catalog/` and the Docker image (if the image is rebuilt this slice) carry both cabinets' tools.
- The handbook's cabinet-server and Vibe Typer pages and the Vibe npm page are the lead's.

## Sub-slice B — the rest of the look (Comfy MCP, one yes per batch)

In the kickoff-s3 order, each batch its own approval, its own receipt key, its own commit:

1. **Piece tiles**: eight per stack (a function, a table, a button, a route, a loop, a file, a message, a chart, in the stack's palette), 128×128, limited palette, no glyphs or digits; the packer draws a tile scaled into each block's rectangle when one is loaded, the flat block otherwise. Reference-chain from the device frames so the set stays on one palette.
2. **Avatars**: the user (a person at a laptop, warm, a little chaotic) and Sprocket (a friendly terminal face), 128×128, in the chat header beside the names; text fallback.
3. **Milestone cards** for seed, series A and unicorn, and a deploy ribbon; shown for the toast's duration; the word stays as fallback.
4. **A backdrop** for the field, 1280×720, an office at night with the glow of one screen, drawn behind the panes at low alpha so the chat and the editor stay readable; off in reduced-motion and on narrow screens.

Every image through `ai-eyes image_contains` for text, letters, digits and symbols; the originals kept beside the downscales in a git-ignored folder; the `vite` public split copies `vibe/` into the Vibe package and nothing into Ghost's; the marker gates hold. Twelve generations per batch at most (one re-roll each), and a miss is stated as a miss in the receipt, never rationalized.

## Sub-slice C — the voice on the user's lines

The host-side voice worker (`voice/`, `docs/cabinet-voice.md`) speaks the user's lines in Vibe Typer as it speaks Ghost's bosses: the ask, the creep, the check-in, the reaction, the review; never the agent's lines (the player types those) and not the sync chatter (it would bury the ask). One preset voice for the user, chosen from the worker's catalog and named in `patterns/voice/user.md` beside the sheet; every take heard back and receipted by fx-dub before it plays; a take that misses its beat waits for the next request boundary; the shell's controls row shows the voice status in words as Ghost's does. The Vibe launcher gains the `/voice` proxy only if this lands (it was left out at `0.10.0` on purpose); the allowlists stay in step between the dev server and both launchers. `pnpm voice` unchanged.

## Sub-slice D — beds per stack, and the editor on another family

- **ACE-Step beds per stack** (six short loops, one per corpus stack, plus one for integration), generated through the studio's ACE-Step route on the local GPU with the watchdog up, receipted, sized like Ghost's tracks, fail-closed through the same `TRACK_KEYS` discipline; the `music: on` setting plays the stack's bed with the tempo rule as today, `soft` keeps the procedural hat, `off` stays off. A yes before the batch.
- **The editor on another family.** `author.mjs edit --model <spec>` accepts a different model from the writer (an OpenRouter frontier model or `mistral-large-3:675b-cloud`); run it once over every pool with the voice sheets, drops recorded, floors held; the receipt names both families. No re-authoring in this slice.

## Deliverables

Sub-slices A–D on `main`, each its own commit and review; `docs/vibe-typer.slice4.md` with the tool contract, the sit numbers from the push path, the art receipts per batch, the voice's receipt counts, the editor's drops, and decisions where this brief was silent; the public surfaces updated by the lead (the Vibe npm page's `--mcp` line, the handbook's cabinet-server and Vibe Typer pages, the landing page's cards, the changelog, translations before the tag); release `0.11.0` on the Director's word through the full treatment's Phases 6 and 7 as run for `0.10.0`, both packages.

## What slice 3 taught, so nobody repeats it

Bulk authoring without a chunk size and a voice sheet produced 189 strangers and a 3.4-hour run; the coherence pass fixed the voice, not the clock, because Kimi's output is mostly thinking tokens. A pool written by two concurrent calls can dedupe itself under its floor; run those serially. A re-voice needs a per-pool sheet, or the meeting chatter comes out as the user's tics. An image allowance in a voice sheet sends the model to the pantry; say what an image may be about. Every one of these is now a rule in the authoring script, a test, or a memory.
