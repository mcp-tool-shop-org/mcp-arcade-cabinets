<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/mcp-arcade-cabinets/vibe-typer-readme.png" alt="Vibe Typer" width="240" />
</p>

# Vibe Typer

**You're absolutely right.**

A typing arcade game. You are a coding agent, hard-working, sycophantic and lovable. Your user is a vibe coder with ideas.

```bash
npx @mcptoolshop/vibe-typer
```

That serves the cabinet on `127.0.0.1` and opens it. Nothing to install, nothing to configure, no account. Node 22 or newer.

This is one cabinet of the [arcade](https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets). The other one, **Ghost on the Menu**, a replay shooter, is `npx @mcptoolshop/ghost-on-the-menu`. The whole arcade also plays [in the browser](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/).

---

## How it plays

Your user wants a website for their cat, Uber but for ducks, a blockchain for the office fridge. Each request lands in blue. You type the agent's reply, then the code, line by line, and the product assembles in the preview beside you. Ship the last line and it deploys: the confetti falls, the valuation rolls up.

- **The scoreboard is the game's number.** Valuation, **vibes** (the multiplier your streak of clean lines earns) and the streak sit on the field at all times. Words per minute and accuracy never do.
- **Points are what you built.** Every request has a value computed from its code; shipping pays that value times your vibes and adds a piece of the same size to the preview.
- **The context bar is the clock.** It drains as the conversation runs; each request costs a slice; shipping refills a share. In a level, an empty bar is a compaction: the agent sums up in one line and carries on. Nothing yells.
- **A wrong line is a retry.** A mistyped character waits for a backspace; a line sent wrong gets "hmm, that's not it" and the line resets. No lives, no loss.
- **Levels, endless, hardcore.** Listed products on one stack each; an endless ladder that climbs until the bar empties; a hardcore tier from the selector that drains faster, burns context on every miss, and ends the level on empty.
- **The standup and the retro.** A run ends with the product as built, the user's closing line, the valuation and the run's seed, which replays the run when typed into the menu. The retro is opt-in: the key pairs that caught you and a word for how steady your hands were, against your own past in this browser only.

## What you learn

The code is real: two hundred and forty-nine snippets across bash, C#, Java, JavaScript, Python and SQL, banded from a bare `echo` to a nested class, each with teaching notes, plus tool calls named after the servers on the bundled tapes. The pairs you miss are seeded into your next level's real lines.

## Sound

Five keyboard sample sets. Every clean line raises the keystroke pitch a semitone, up to an octave; a miss resets it. The bed's tempo follows your vibes. Every event on the field has one sound; the deploy rings a chord.

## Controls

Type what you see. Enter sends a line. Backspace fixes. Tab takes the rest of a line when the ghost offers it. Hold Escape to leave. Sound starts on the first key or click.

## What it needs and what it will not do

Node 22 or newer, and nothing else. The server binds `127.0.0.1` and only `127.0.0.1`. No telemetry, no analytics, no network call of its own. Your choices and the key pairs you missed stay in your browser's storage and never leave it.

In endless mode a local model can play the user through a word gate, writing the requests, the check-ins and the code behind a code gate; it needs an [Ollama](https://ollama.com) daemon on `127.0.0.1:11434`, reached through a fixed allowlist. Without one, endless draws from the authored pool. `--mcp` is reserved for the cabinet's own MCP tools and says so until they ship.

## Options

```
--port <n>        port to listen on (default 7778; takes the next free one)
--no-open         start the server but do not open a browser
-h, --help        the usage
-v, --version     the version
```

| Environment  |                                                                        |
| ------------ | ---------------------------------------------------------------------- |
| `OLLAMA_URL` | the daemon the endless user sits at (default `http://127.0.0.1:11434`) |

## Where this comes from

The tapes that name real servers are recorded by [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade), the instrument that talks to the server and keeps the tape. The design, the research it rests on and the lock are in the repo's `docs/vibe-typer.dispatch.md`.

- [Play in the browser, no install](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/)
- [Vibe Typer in the handbook](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/vibe-typer/)
- [The arcade's other cabinet, Ghost on the Menu](https://www.npmjs.com/package/@mcptoolshop/ghost-on-the-menu)
- [Source](https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets)

MIT. Still `0.x`, and the version says what it means.
