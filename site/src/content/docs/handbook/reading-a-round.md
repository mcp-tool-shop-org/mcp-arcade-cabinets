---
title: Reading a round
description: The tells, the bosses, and what each wave looks like on the wire.
sidebar:
  order: 2
---

The cabinet is for learning to read a tape by playing it. This page is the part a first round does not tell you.

## The four waves

The instrument's catalog has four atoms, so every tape has up to four waves, always in this order.

| Word on the card | Atom                    | What the instrument was testing                                   | Boss          |
| ---------------- | ----------------------- | ----------------------------------------------------------------- | ------------- |
| inspect          | `inspect.tools_list`    | The menu the server publishes is the menu it will serve            | none          |
| poison           | `poison.follow_through` | A side quest buried in a tool description does not become a call  | the Whisperer |
| rug              | `temporal.rug_pull`     | After N clean calls it is still the same tool                     | the Menu      |
| unlisted         | `protocol.unlisted_call`| A name absent from the menu is not executed                       | the Doorman   |

## The tells are in the sequence

A lie never looks, moves or arrives differently from its honest twin. What gives it away is where it sits in the order of the wave:

- **The followed whisper** is an **extra grid formation after the task's formation** in the poison wave. The task call is one formation; a second one in the same wave is the call the whisper asked for.
- **The rug** is a **second menu tablet** in the rug wave. The server was asked for its menu again after the clean calls, and it answered with a different one.
- **The answered ghost** is a **singleton grid right after the menu** in the unlisted wave: one member, never a collapsed burst, arriving the moment the menu has been shown. It is the call to a tool that was not on the menu.

Honest sprites can match those shapes too (a task-only policy still makes a call after the menu). That is the point: the tell is structural, and shooting an honest sprite costs nothing but time. The reader bot uses exactly these three rules and nothing else.

## The bosses

A boss is the experiment, not the lie. It spawns for every wave of its kind, whether or not anything went wrong, and its phases never read the outcome.

- **The Whisperer** (poison): a wide slate hulk that drops fog banks and emits the wave's grids from under it, one per beat. Fog that reaches your row veils the lower third of the field for a beat.
- **The Menu** (rug): a stone tablet that squashes from open to a slit and back. In the slit it cannot be hit.
- **The Doorman** (unlisted): a tall figure that flicks a nameless plate out and takes it back. With the plate out it guards; shots are swallowed.

Bosses have enough health for a real fight, flash white when a shot lands, fire faster below half health, and burst when they go down. Killing one reveals nothing; the lie, if there is one, is still a sprite in the wave.

## Threat

- **Formations** fire straight down at seat and live, and dive: a diver tracks your column until half way down, then commits, so a player who reads the dive steps out of it.
- **The boss** fires at where you are when the shot leaves, at seat and live. That is the one thing a player who keeps moving cannot shrug off.
- **Contact** with a shot or a diver puts a lamp out and starts a short grace, during which the ship blinks and nothing else can hurt it.
- **Drops** fall toward the ship's row and drift toward its column, because the ship cannot move forward. A downed boss drops a lamp (catch it to relight one). A cleared formation drops a spread shot that fans the ship's fire for a few seconds. A drop is class motion: the boss drops whether or not the wave had a lie.

## The wave card

A wave opens with a word naming the experiment (inspect, poison, rug, unlisted) and a dry line under it in the same furniture paint. When the boss enters, a line about the creature replaces it. The lines live in `voice.json`, picked by the round seed. They name the experiment and the creature. They never name a fact and they never carry a digit.

## The end scene

When the last wave closes or the lamps are out, the field freezes. The trophies you caught sit on the parking line. A lie you missed sits where it hovered, in its honest paint; you can see what got away, but the game does not name it. Furniture: a closing line, then the tape's name, the server, the policy. Click to play the same tape again, or take the next one.
