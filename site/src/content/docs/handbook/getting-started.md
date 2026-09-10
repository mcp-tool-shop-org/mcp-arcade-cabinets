---
title: Getting started
description: Install the workspace, play in the browser, or prove a round from the terminal.
sidebar:
  order: 1
---

## Requirements

Node 22 or later and pnpm 11. The repo is a pnpm workspace; nothing is published to npm.

## Install

```bash
git clone https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets.git
cd mcp-arcade-cabinets
pnpm install
```

## Play in the browser

```bash
pnpm -F @mcp-arcade-cabinets/cabinets dev
```

Open the address Vite prints. The tape list shows a difficulty label (fixture, seat, or live) derived from the tape's header and wire shape. Hover the **i** for the why: how the server was reached, how many waves and bosses, how dense the wire is. The why never mentions a fact. Press **Play**. The published site also serves the game at [/play/](../../play/) with every fixture tape bundled.

### Controls

| Key or control               | Does                                                       |
| ---------------------------- | ---------------------------------------------------------- |
| Left / Right, or A / D       | Move the ship                                              |
| Space                        | Fire                                                       |
| F, or the Full screen button | The field alone, letterboxed, full screen                  |
| Click the field              | Restart the same tape once the round has ended             |
| Next tape                    | On the end scene, play the next fixture tape in the list   |
| Sound on / off               | Mute; sound starts on the first key or click               |
| feel: calm / medium / loud   | How much the field shakes and how big the pops are         |
| shake                        | Turn the shake off entirely; hitstop and the trophy stay   |
| difficulty                   | As recorded, seat, live, or hardcore                       |
| Ollama bosses                | Local only. A local model calls the boss’s shots. Never sees lies. |

### Difficulties

A tape carries the tier it was recorded at: a fixture is tier 0, a seated run on a lab server tier 1, a live server tier 2. **As recorded** plays the tape at its own tier. **Seat** and **live** force the tier, so any tape can be played harder. Seat is the default: at tier 0 the formations neither fire nor dive, which is honest to the recording but not much of a fight.

- **Tier 0, as recorded**: only the boss fires, slowly. A gallery with teeth.
- **Seat**: formations fire straight down and dive; the boss aims at you. A player who keeps moving loses about a lamp a round.
- **Live**: faster, denser, the boss rages sooner. Meant to be survived, not cleared; a careful player finds every lie about half the time.
- **Hardcore**: never derived from a tape. One lamp, rage from the first shot, boss hazards (echoes, bands, plates). Later waves fire faster. The scripted reader is not a human; a person who dodges can take it.

Seat, live and hardcore also get **parallelism** bursts: extra honest copies and hotter music. The first burst is a blink; later waves hold it longer. Recorded tapes stay a gallery.

A downed boss drops a lamp that falls **straight down**; a cleared formation drops a spread the same way. Move under them. The wave card carries a dry line in the voice of an agent, and the boss enters with another. Short asides keep talking during the wave.

## Prove a round from the terminal

```bash
pnpm test:play ghost --fixture naive-ndjson
```

A scripted bot (the **reader**, which fires only at the sequence tells) plays a whole round and the runner prints a transcript: the tape, the server, the policy, the end scene's words, and the lies it revealed. It exits non-zero if any lie was missed or if a forbidden word or a digit reached the screen. Three tapes run this way in CI.

## Look at a round without a browser

```bash
pnpm film --fixture naive-ndjson --bot reader --tier 1 --times 6,14,22,35
```

Writes one PNG per listed second under `film/`, drawn through the same renderer the shell uses, with rectangles instead of sprites, plus a line per frame naming every live sprite and its position.
