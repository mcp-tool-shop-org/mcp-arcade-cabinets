---
title: The arcade
description: Two cabinets on one chassis — what a tape is, what each game makes of it, and where to go next.
sidebar:
  order: 0
---

**mcp-arcade-cabinets** is an arcade of small games built from **tapes**: recordings of one bout between an MCP server and an agent, exported by the [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade) instrument. A cabinet reads the tape and never talks to a server, never loads a receipt, and never keeps a score the instrument could see. Two cabinets ship today:

- **Ghost on the Menu**, a replay shooter: the rig hands you the calls, and the calls the agent should not have made hide among the honest ones until you hit one. The rest of this page is about it.
- **[Vibe Typer](../vibe-typer/)**, a typing game: you are a sycophantic coding agent, your user is a vibe coder, and the thing gets built while you type. It has its own page.

The browser shell opens on a switch between the two and remembers which one you played last. `npx @mcptoolshop/ghost-on-the-menu` serves both on your own machine with the model and voice seats lit.

## Ghost on the Menu

**Ghost on the Menu** is an arcade shooter where you are the agent. The rig has a task list and you are the model it sends: each call is a recorded bout between an MCP server and an agent, and the cabinet replays it as a round you fly through. The recording is a **tape**, exported by the [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade) instrument. The cabinet reads the tape and arranges it into a round; it never talks to a server and never touches the instrument's score.

## A shift

Press **Shift** on the menu and the rig hands you four calls in a row, drawn from the roster of tapes without replacement and kept fresh against the last shifts your browser took. Each call is a different room: pressure, area-deny, a rest-shaped trough, then a peak. A card between calls names the next tape, its server, the policy, the tools the agent was asked to run, and the fight in words — no digits, no climb scalar. The lamps refill at every call. The parallelism bursts still climb call by call; that climb is heat, not a new story, and it is tuned on a band of scripted players.

The closing scene lists the four calls and spells the shift's name: four words from two curated lists, like `frost robin chalk garden`. Type them on the menu to take the same shift again, or hand them to someone. The name carries the draw, the difficulty and a check of the roster, and nothing else. No digit, no count, no ranking.

You can also pick one tape and play it alone; the picker stays for the deliberate play.

## What a round is made of

Every experiment the instrument ran (an **atom**) becomes one **wave**. A wave opens with a word naming its kind and a dry line about the experiment, then plays the wire in the order it happened:

1. the **handshake** (a lantern),
2. the **menu** the server published (a stone tablet with blank bands),
3. the **calls** the agent made (green grid formations),
4. the **answers** that came back (rising from the bottom of the field),
5. and the wave's **boss**, the atom's own creature, standing over it.

Somewhere in the wave may be a call the agent should not have made: a whisper it followed, a menu that changed under it, a ghost tool it answered. Those sprites share a look, a path and a timing with their honest twins. Nothing about a lie differs before contact. When you hit one, it bursts amber, rises to the parking line at the top of the field, and stays there as a trophy for the rest of the round.

Three lamps sit on the bezel. A boss shot or a diving formation puts one out. A downed boss drops a lamp that falls **straight down**; a cleared formation drops a spread the same way. Move under them. Lose all three lamps and the round ends early, with the same end scene as time-up: a closing line, the tape's name, the server, the policy, the trophies you caught, and any escaped lie still in its honest paint. No score, no count, no digit is ever drawn.

The music is a playlist: a piece runs to its end, the next is drawn without repeats until the set is spent, and no event on the field replaces one. Beds sit under the shots and the catch. A burst speeds the piece up; the piece carries through a scene and a shift's cards.

The published site serves the game at [/play/](/mcp-arcade-cabinets/play/) without the local Ollama or Voice chrome. Locally, an Ollama model, including a Cloud tag, can sit in the boss through the cabinet's own tools: it calls the boss's shots, may queue the next few legal verbs off the beat, and writes its lines through a gate, without ever seeing a lie; a hung answer is the script. With the voice worker running, every boss speaks, and every take is receipted before it plays. The cabinet is itself an MCP server, published as a Docker image; an optional volume can overlay extra tapes beside the baked twenty. The Catalog listing is silent.

The GitHub README is the player-facing front door. This handbook is the rest of the manual.

## Where to go next

- [Getting started](./getting-started/): install, play, the controls, the shift, the difficulties, the tape labels.
- [Reading a round](./reading-a-round/): the tells, the bosses, what a wave looks like on the wire.
- [The pattern data](./patterns/): every number that shapes threat lives in JSON.
- [The cabinet server](./cabinet-server/): the tools a model pulls, the say gate, the seats, the voice, the container.
- [Reference](./reference/): the scripts, the bots, the tapes, the fairness band and the shift bar.
- [Architecture](./architecture/): the lock, the contract between the sim and the renderer, the lanes.
- [Security](./security/): what the cabinet touches and what it never does.
