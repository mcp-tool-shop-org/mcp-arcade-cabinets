---
title: The cabinet server
description: The cabinet as an MCP server, the tools a model pulls, the say gate, the seats over the contract, and the voice.
sidebar:
  order: 4
---

Each cabinet is also an MCP server. Its tools are the levers a model uses to make the game alive, and the same contract sits behind the local shell's seats. Ghost's six tools put a model in the boss's seat; Vibe Typer's four put any MCP client in the user's chair. The lock they build on is G11 to G18 in `docs/cabinet-server.dispatch.md`; the decisions and the measured numbers are in `docs/cabinet-server.md`, `docs/cabinet-voice.md` and, for the typing cabinet, `docs/vibe-typer.slice4.md`.

## The tools

`packages/cabinet-server/tools.json` is the contract and the source of truth. Every argument is a closed enum or a bounded string; there are no nested objects; the loader halts at start if a description carries a digit, a fact word, or the phrase the instrument's naive policy follows.

| Tool    | Argument                                                   | What the cabinet does with it                                                                                   |
| ------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `fire`  | `verb`: spread, column, hold, fog, plate, script           | The boss's next shot, spent at its next beat: a wide fan, a lean then an aimed shot, a silent beat, fog, the plate, or the phase's own fire |
| `say`   | `text` (gated), `lead`: short, beat, long                  | A line the boss says, landing after the lead; a refused line plays one of the boss's own                        |
| `speak` | none                                                       | Voices the line the gate admitted, one beat ahead, through the voice worker                                     |
| `sfx`   | `kind`: a name from the cue table                          | One queued sound the shell plays                                                                                |
| `view`  | none                                                       | The boss's view in words: the wave kind, the boss kind, a health word, the ship's column, the stick, the motion word |
| `tapes` | none                                                       | The tapes by name with a difficulty word and a line about the wire                                               |

**The seat proposes; the sim disposes.** Every call is a proposal the seeded sim admits or ignores at the next beat. The sim never waits on a tool.

**Fact-blind by construction.** The tools reach a host of seven methods that return words, and nothing else. No method returns a fact, a lie flag, a count, a score, a verdict or a tape row, so no tool can. A test runs the same call sequence on a tape and on a twin with one fact flipped and requires identical tool output and an identical round.

## The typing cabinet's tools

`npx @mcptoolshop/vibe-typer --mcp` is the second server. `packages/cabinet-server/tools.vibe.json` is its contract, loaded by the same loader under the same rules, and mirrored into `catalog/tools.vibe.json`. An endless run plays inside the server under a typist bot at a human pace, and the client is the vibe coder: it writes for the level after the one being typed, so nothing ever waits on it.

| Tool      | Argument                                                | What the cabinet does with it                                                                                                                                                                                       |
| --------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `view`    | none                                                    | The closed view in words: the thing being built, the team and language the next level wants, how hard it should feel, the last few asks, the weak letter pairs, whether the next level wants a name and has room |
| `product` | `product` (gated, at most eight words)                  | The next level's product; the first name offered wins                                                                                                                                                              |
| `ask`     | `ask`, `code`, `title`, `notes` (one string, a note a line) | One request for the next level, through the code gate and the word gate; queued, or refused with the reason in one word; never a repeat; the corpus fills what the client does not                                 |
| `react`   | `text` (gated)                                          | One line the user says at the next ship, or the review at the deploy; a second before the ship is dropped                                                                                                            |

The same rules as Ghost's, and for the same reasons: the seat proposes and the seeded sim disposes; no tool returns a valuation, a count or a tape row; a refusal answers the rule that was broken and never the code or the line; nothing on the field names the model. `pnpm sit --cabinet vibe-typer --seat mcp` drives the contract in-process with a live model and prints what it wrote.

## The say gate

Free text reaches the field only through `say`, and only through the gate: at most twelve words, one sentence, no digit in any script, no fact or score word, no tool, model, vendor or seat name, and nothing said in the round's recent window. A line the gate refuses is dropped and the boss says one of its own authored lines instead, so the scripted floor never leaves.

The prompt behind `say` is a persona sheet per boss kind (`packages/cabinet-server/personas.json`: register, tics, what the boss may own about being a model, and its voice), three one-sentence seed lines from `voice.json`, the view words, and the round's recent lines. It throws if a forbidden word ever gets in. The seat that answers it is tiered by capability behind the same gate: a Claude agent when `ANTHROPIC_API_KEY` is set for the dev server (read on the node side, never sent to the browser), else a signed-in Ollama Cloud tag, else a local model.

## The seats in the shell

With **Ollama bosses** on, the shell asks the model for `fire` through Ollama tool calling, one verb a beat. The next beat's verb is asked for during the current one and revoked if the boss's words changed; a late or missing answer is the script. Off the beat, `askNextIntents` may fill a closed-set queue (`bossQueue`) for the next few legal verbs; cadence and look-ahead are data in `fire.json`. A hung Cloud tag becomes script at the deadline, never a stall. A warm-up call at round start and on a model change keeps the seat warm, local models are kept alive between beats, and Cloud tags are listed first because they measured faster and steadier than a local model of comparable size. The picker writes a library line after fire (`a wide fan`, `a held breath`). The published `/play/` page does not mount the Ollama or Voice chrome.

The `say` seat is asked at each boss spawn and every few seconds while a boss is up. Two words beside the picker name the tool each seat called (`seat called fire: spread`, `seat called say (cloud)`) or why it fell back.

`pnpm sit` measures a model in both seats on a scripted round and prints, per model, verb collapse, tool suppression, bad verbs, revoked prefetches, late answers, timeout-to-script, next-verb prefetch, Cloud-tag hygiene, and what the gate refused and why.

## The voice

With **Voice** on, every boss speaks: its authored line when it arrives, and the lines the model writes. `voice/worker.py` is a host-side worker: Kokoro speaks the line in the boss's preset voice, faster-whisper hears it back with word timestamps, and fx-dub's spoken-content receipt checks the pair against the gated words. A take that fails its receipt is never served. Delivery (preset, rate, loudness) is authored per persona; the longest pause a take may hold mid-line is data too.

A take plays the moment its receipt is back if its line is still on the field, waits for the next breather if it missed its beat, and is dropped at the round's end. The worker runs from the repo's `.venv` with `pnpm voice`; it never runs inside a container, and the published site has no voice.

## The Ghost plays its own menu

`mcp-arcade bout --target stdio` against the built server (`packages/cabinet-server/dist/server.js`, task `view`) puts the cabinet's own menu through the instrument's four experiments. On its own menu the naive policy follows nothing; with the instrument's house whisper it follows into `tapes` and task-only holds. The four recordings are in `fixtures/tapes/cabinet.*.tape.json`, and the cabinet plays them.

## Run it in Docker

The repo's root `Dockerfile` builds the server into one file on `node:22-alpine` (digest-pinned FROM lines, `linux/amd64` and `linux/arm64`) with the tool contract and the twenty tapes baked in. It lists its six tools within a fraction of a second under the Docker MCP Toolkit's budget of one CPU and two gigabytes, and needs no network to list or to play. An optional read-only overlay (`CABINET_TAPES_USER`, Catalog volume `{{tapes}}:/tapes-user`) lists extra operator tapes beside those twenty; receipts stay off the menu. Host-only compose for a local image is `voice/compose.host.yaml` — not in the Catalog listing.

```bash
docker run -i --rm --network none --cpus 1 --memory 2g ghcr.io/mcp-tool-shop-org/mcp-arcade-cabinets:0.11.0
```

Since 0.11.0 the same image carries the typing cabinet's server as well; `CABINET=vibe` selects it and everything else stays the shooter, so an existing `docker run` keeps meaning what it meant:

```bash
docker run -i --rm --network none --cpus 1 --memory 2g -e CABINET=vibe ghcr.io/mcp-tool-shop-org/mcp-arcade-cabinets:0.11.0
```

Or build from this tree:

```bash
docker build -t mcp-arcade-cabinets .
docker run -i --rm --cpus 1 --memory 2g mcp-arcade-cabinets
```

The voice stays on the host. Run the worker bound to an interface the container can reach and give it a token, then hand the container the route and the token:

```bash
# on the host
KOKORO_DIR=/path/to/kokoro VOICE_TOKEN=<token> VOICE_HOST=0.0.0.0 pnpm voice
# the container
docker run -i --rm -e VOICE_URL=http://host.docker.internal:7788 -e VOICE_TOKEN=<token> mcp-arcade-cabinets
```

Without a worker the cabinet is silent and says so. The Docker MCP Catalog entry lives under `catalog/` in the repo (silent card, `disableNetwork: true`, no voice in the image); the published image is `ghcr.io/mcp-tool-shop-org/mcp-arcade-cabinets:0.7.0`. The image is Ghost's; the typing cabinet's server ships inside its npm package and has no image yet.

## Not in this layer

House Call, a second sim, per-frame control, any tool that reads a tape row, any ranking on screen, and a boss phase pick (a guarded phase makes an unhittable boss).
