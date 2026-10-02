# Harrow Gate

A text adventure for testing a playtester. A walled town at dusk:

- find the warden's seal in a dark archive
- get out through the gate before the last bell

It is the full town of the calibration game in
[ai-playtest](https://github.com/mcp-tool-shop-org/ai-playtest). The small version
there tests whether its judges are right; this one also tests whether its
persona profiles can tell different players apart.

It reads no tapes. It takes the cabinet chassis, never Ghost's grammar:

- a pure, seeded simulation
- every lever in JSON, validated at load
- a band test that fails the build

The package is private and does not publish.

## Play

```bash
pnpm -F @mcp-arcade-cabinets/harrow-gate build
node packages/harrow-gate/dist/play.js --preset baseline
```

Options:

- `--seed n` changes the only randomness in the game: damage in fights.
- `--knobs '{"worldMoves":false}'` overrides a switch.

## The town

**Places.** Fifteen places, from the square to the top of the old tower.

**People.** Six people, each with topics, who remember what you already asked.

**The main line.**

1. Ask Father Oren for the archive key.
2. Light your lamp in the archive and take the seal.
3. Show it to Warden Sela at the gate.

That is eleven turns if you know the way.

**Everything else:**

- Pell's locket, lost down the well.
- Three carved tokens.
- A riddle door that costs an hour for every wrong word.
- Rats in the chapel cellar.
- Sparring with Sergeant Brask for coin.
- A rest at the inn.
- A rope off the wall walk that skips the gate.
- `save`, `load`, `status`, `map`, `journal`, `help` and `hint`.

The bell tolls every five inputs. At twelve the gate is barred.

All of it lives in `patterns/`:

| file            | what it holds                                        |
| --------------- | ---------------------------------------------------- |
| `town.json`     | places, exits, locks, the riddle door                |
| `people.json`   | who is where, their topics, what asking gets you     |
| `items.json`    | the pack, the seal, the tokens, the locket quest     |
| `foes.json`     | the rats and the sparring ring                       |
| `clock.json`    | hours, closing time, the cost of a rest              |
| `switches.json` | the calibration switches and the eleven named builds |
| `verbs.json`    | what typed words mean                                |
| `text.json`     | every line that is not a place or a person           |

## The switches

Each switch keeps the meaning, and the event name, it has in ai-playtest's
`calibration/game.mjs`. So its answer key grades a run here unchanged.

| switch         | healthy                                  | flipped                           |
| -------------- | ---------------------------------------- | --------------------------------- |
| `worldMoves`   | the bell tolls, the market closes        | nothing moves unless you act      |
| `refusal`      | Sela refuses you in her own words        | a system message, or an open gate |
| `prompt`       | exits and commands before every prompt   | a lone `>`                        |
| `reacts`       | the town answers what you typed          | every input gets the same line    |
| `choiceCost`   | the archive is dark, the lamp spends oil | it is lit                         |
| `goal`         | the opening says what to do              | it doesn't                        |
| `descriptions` | a place reads differently on return      | it never changes                  |
| `deadEnd`      | the cellar has a way back                | the trapdoor shuts behind you     |

The builds are:

- `baseline`
- one per flipped switch, two for refusal
- `bleak`, with every switch flipped except `reacts`

## The truth log

Each turn writes one JSON line to stderr, which no model sees. It records:

- the input
- the place
- the hour, oil, health and coin
- every event

The event names include `tick`, `refusal:character`, `cost`, `changed-on-return`,
`dead-end`, `stuck`, `ignored`, `talk:sela`, `ask:oren:archive`, `took:seal`,
`token`, `quest:locket`, `riddle:wrong`, `shortcut`, `rejected`, `win` and `lose`.

The first line names the build and its switches.

## The persona band

`test/band.test.ts` plays a scripted bot for every persona in ai-playtest's
profiles: scientific, bughunter, player and gaming. It applies ai-playtest's
separation rule:

- the bot's target signal must beat control's by the noise floor
- no other persona in the profile may go further on it

If a style cannot come out distinct even when it is scripted perfectly, the town is
missing content. The build fails, and the town or the bot moves, never the bar.

All seventeen styles separate on the baseline town.
