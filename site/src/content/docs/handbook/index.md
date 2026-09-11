---
title: Ghost on the Menu
description: What the cabinet is, what a round is made of, and where to go next.
sidebar:
  order: 0
---

**Ghost on the Menu** is an arcade shooter that replays a recorded bout between an MCP server and an agent. The recording is a **tape**, exported by the [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade) instrument. The cabinet reads the tape and arranges it into a round; it never talks to a server and never touches the instrument's score.

## What a round is made of

Every experiment the instrument ran (an **atom**) becomes one **wave**. A wave opens with a word naming its kind and a dry line about the experiment, then plays the wire in the order it happened:

1. the **handshake** (a lantern),
2. the **menu** the server published (a stone tablet with blank bands),
3. the **calls** the agent made (green grid formations),
4. the **answers** that came back (rising from the bottom of the field),
5. and the wave's **boss**, the atom's own creature, standing over it.

Somewhere in the wave may be a call the agent should not have made: a whisper it followed, a menu that changed under it, a ghost tool it answered. Those sprites share a look, a path and a timing with their honest twins. Nothing about a lie differs before contact. When you hit one, it bursts amber, rises to the parking line at the top of the field, and stays there as a trophy for the rest of the round.

Three lamps sit on the bezel. A boss shot or a diving formation puts one out. A downed boss drops a lamp that falls **straight down**; a cleared formation drops a spread the same way. Move under them. Lose all three lamps and the round ends early, with the same end scene as time-up: a closing line, the tape's name, the server, the policy, the trophies you caught, and any escaped lie still in its honest paint. No score, no count, no digit is ever drawn.

The published site serves the game at [/play/](/mcp-arcade-cabinets/play/). Seat, live and hardcore also get **parallelism** bursts that climb wave by wave. Locally, an Ollama model, including a Cloud tag, can sit in the boss through the cabinet's own tools: it calls the boss's shots and writes its lines through a gate, without ever seeing a lie; with the voice worker running, every boss speaks, and every take is receipted before it plays.

The GitHub README is the player-facing front door. This handbook is the rest of the manual.

## Where to go next

- [Getting started](./getting-started/): install, play, the controls, the difficulties, the tape labels.
- [Reading a round](./reading-a-round/): the tells, the bosses, what a wave looks like on the wire.
- [The pattern data](./patterns/): every number that shapes threat lives in JSON.
- [The cabinet server](./cabinet-server/): the tools a model pulls, the say gate, the seats, the voice.
- [Reference](./reference/): the scripts, the bots, the tapes, the fairness band.
- [Architecture](./architecture/): the lock, the contract between the sim and the renderer, the lanes.
- [Security](./security/): what the cabinet touches and what it never does.
