<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/mcp-arcade-cabinets/hero.png" alt="Ghost on the Menu" width="760" />
</p>

# Ghost on the Menu

**You are the agent. The rig hands you the calls.**

A short retro shooter made from what MCP servers actually said on the wire. And since `0.9.0`, a second cabinet rides in the same package: **Vibe Typer**, a typing game where you are a sycophantic coding agent and the thing gets built while you type.

```bash
npx @mcptoolshop/ghost-on-the-menu
```

That serves both cabinets on `127.0.0.1` and opens them on a switch. Nothing to install, nothing to configure, no account.

---

## What you are shooting at

Every round is a **tape**: one recorded bout between an MCP server and an agent. It plays out above your ship as waves — the handshake, the menu, the calls, the answers coming back — and a boss that is the experiment itself. Twenty recordings ship inside this package.

Somewhere in there are the calls the agent should not have made. They look like everything else until you hit one.

The game only ever reads tapes. It does not talk to a server, does not keep a score, and does not tell you who won.

## The other cabinet: Vibe Typer

Your user is a vibe coder: a website for their cat, Uber but for ducks, a blockchain for the office fridge. Each request lands in blue. You type the agent's reply, then the code, line by line, and the product assembles beside you. Ship the last line and it deploys; the valuation rolls up with your **vibes**, the multiplier your streak of clean lines earns. The clock is your context window, and in the listed levels it is kind: run it dry and the agent compacts, sums up in one line, and carries on. Nothing yells. A mistyped character waits for a backspace; a bad line gets "hmm, that's not it" and a retry.

The code is real: two hundred and forty-nine snippets across bash, C#, Java, JavaScript, Python and SQL with teaching notes, plus tool calls named after the servers on the bundled tapes. Five keyboard sample sets; every clean line raises the keystroke pitch a semitone. Levels, an endless ladder, and a hardcore tier from the selector. Words per minute never appear; the retro at the end is opt-in and speaks in words, against your own past in this browser only.

Pick it on the switch when the page opens. Type what you see, Enter sends a line, Tab takes the rest when the ghost offers it, hold Escape to leave.

## Two ways to run it

### Play it

```bash
npx @mcptoolshop/ghost-on-the-menu
```

Ghost: left and right to move, space to fire, F for full screen. Press **Shift** for a run of four calls with a four-word replay code at the end. Vibe Typer: type.

This is the same game as [the published page](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/), with one difference that is the whole reason this package exists: run locally, the cabinet can reach **your own Ollama daemon and voice worker**. A published web page cannot. With a model behind the bosses, they fly themselves and speak their own lines.

### Run it as an MCP server

```bash
npx @mcptoolshop/ghost-on-the-menu --mcp
```

A headless round runs inside the server and the tools are the levers on it, so an agent can play the cabinet instead of a person. In Claude Desktop, Claude Code, or any MCP client:

```json
{
  "mcpServers": {
    "ghost-on-the-menu": {
      "command": "npx",
      "args": ["-y", "@mcptoolshop/ghost-on-the-menu", "--mcp"]
    }
  }
}
```

Six tools: `fire` (one verb a beat — a fan, a lean and an aimed shot, a held breath, fog, the plate), `say` (a line of the boss's own, through a gate), `speak`, `sfx`, and read-only `view` and `tapes`.

The seat is **fact-blind**: it is handed words, never the state. It never sees which sprites are lies. It proposes; the game decides.

## What it needs

Node 22 or newer. That is the whole requirement.

Two things are optional and neither is bundled — the cabinet is complete without them:

|                                                   | What it adds                                    | How                                  |
| ------------------------------------------------- | ----------------------------------------------- | ------------------------------------ |
| [Ollama](https://ollama.com) on `127.0.0.1:11434` | A model flies the bosses and writes their lines | Tick **Ollama bosses**, pick a model |
| A voice worker                                    | Every boss speaks aloud                         | `VOICE_URL`, see the repo            |

Without a daemon the bosses fly their scripted phases, which is the game as designed. A model that hangs or fails is the script too, never a stall.

## What it will not do

The server binds `127.0.0.1` and only `127.0.0.1` — the game is not put on your network.

Your daemon is reached through a fixed allowlist, not a general proxy. Seven calls pass and no others: the model list, chat and generate on Ollama; health, stats, speak and cached takes on the voice worker. Everything else is a 404 before a socket is opened — no pull, no delete, no create. `VOICE_TOKEN` and `ANTHROPIC_API_KEY` are used on the node side and never reach the page.

No telemetry, no analytics, no network call of its own. The `--mcp` server needs no network at all.

## Options

```
--mcp             speak MCP on stdio instead of opening the game
--port <n>        port to listen on (default 7777; takes the next free one)
--no-open         start the server but do not open a browser
-h, --help        the usage
-v, --version     the version
```

| Environment         |                                                                 |
| ------------------- | --------------------------------------------------------------- |
| `OLLAMA_URL`        | the daemon the bosses sit at (default `http://127.0.0.1:11434`) |
| `VOICE_URL`         | the voice worker, when you run one                              |
| `VOICE_TOKEN`       | the worker's bearer; added server-side                          |
| `ANTHROPIC_API_KEY` | sits the Claude tier of the say seat                            |
| `CABINET_TAPES`     | a directory of tapes to play instead of the bundled twenty      |

## Where this comes from

The tapes are recorded by [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade), the instrument that talks to the server and keeps the tape. The cabinet reads them and writes nothing the instrument ever sees.

There is also a Docker image of the MCP server, if you would rather not have Node. The [packages page](https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/pkgs/container/mcp-arcade-cabinets) lists the tags:

```bash
docker run -i --rm ghcr.io/mcp-tool-shop-org/mcp-arcade-cabinets:0.7.0
```

- [Play in the browser, no install](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/)
- [How to read a round](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/reading-a-round/)
- [Vibe Typer in the handbook](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/vibe-typer/)
- [Source](https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets)

MIT. Still `0.x`, and the version says what it means.
