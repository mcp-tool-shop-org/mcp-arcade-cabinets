# Vibe Typer

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/mcp-arcade-cabinets/vibe-typer-readme.png" alt="Vibe Typer" width="240" />
</p>

The cabinet's own page. The repo entrance is the [root README](../../README.md); the manual is the [handbook](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/vibe-typer/); the npm page is [`packages/launcher/README.md`](../launcher/README.md).

<p align="center">
  <strong>You're absolutely right.</strong>
</p>

**Vibe Typer** is a typing arcade game. You are a coding agent, hard-working, sycophantic and lovable. Your user is a vibe coder with ideas: a website for their cat, Uber but for ducks, a blockchain for the office fridge. Each request lands in blue. You type the reply, then you type the code, line by line, and the thing gets built in the preview beside you. Ship the last line and the product deploys, the confetti falls, and the valuation rolls up.

Nothing yells. A mistyped character waits for a backspace. A line sent wrong gets "hmm, that's not it" and a retry. The only clock is your context window, and in the listed levels it is joyful: run it dry and the agent compacts, sums up in one line, and carries on.

## How it plays

- **A level is a product.** Eight are listed, each on one stack: shell, python, script, tables, java, sharp. Four requests per level. The last one is the deploy.
- **The scoreboard is the game's number.** Valuation, **vibes** (the multiplier, which climbs with your streak of clean lines) and the streak itself sit on the field at all times. Words per minute and accuracy never do. Points are the request's difficulty value times your vibes, and the preview grows by exactly what the score counts.
- **The context bar is the pace.** It drains as the conversation goes on. Each request costs a slice; shipping one compacts and refills a share. Milestones on valuation, seed, series A and unicorn, are stingers, not rules.
- **Scope creep.** Now and then the user adds "oh also can it…" and one more line joins the request. It is shown and voiced before it is typeable.
- **Quick sync.** A meeting interrupts a level: three short lines, "sounds good", "will do", and the bar does not drain. A breather.
- **Copilot.** Hold a streak and the editor offers the rest of the line for a few seconds. Tab takes it, for a smaller payout.
- **Endless** chains products drawn from a noun list, the bands and the drain rising, until the bar empties. **Hardcore**, from the selector only, drains faster, burns context on every mistyped character, has no Copilot, and ends the level on empty.
- **The standup** ends a run: the product as you built it, the user's closing line, the valuation, the milestones reached, and the run's seed. Type the seed into the menu to replay the same run. The **retro** is opt-in: the key pairs that caught you, then how steady your hands were, in words, against this browser's own past and nothing else.

## What you learn

The code is real. Two hundred and forty-nine snippets across bash, C#, Java, JavaScript, Python and SQL, banded from a bare `echo` to a nested class, with teaching notes on each, plus an integration stack built from the real tool names on the tapes in this repo, so a request can name a thing you actually run. The difficulty of a snippet is a formula over its text: character surprisal, the travel between adjacent keys, length, punctuation density, long identifiers and closing brackets. The pairs you miss are remembered in your browser and seeded into your next level's real lines, never drilled bare.

## Sound

Five keyboard sample sets to pick from. Every clean line climbs the keystroke pitch a semitone, up to an octave, and a miss resets it: the streak is something you hear. The bed's tempo follows your vibes and holds through a level's last request. Every event on the field has one sound with a transient and a tail; the deploy ducks the bed and rings a chord.

## Controls

Type what you see. Enter sends a line. Backspace fixes. Tab takes the rest of a line when the ghost offers it. Hold Escape to leave. Sound starts on the first key or click; mute sits under the field.

## Where the numbers live

Every lever is JSON under `packages/vibe-typer/patterns/`, validated at load: `levels.json` (products, stacks, bands, drain, the endless ladder, the sync share), `score.json` (vibes steps, Copilot, milestones, hardcore), `context.json` (drain and refill per tier), `difficulty.json` (the key map and the formula weights), `user.json` and `agent.json` (every line the user and the agent say, through the same word gate as Ghost's voice lines: no digit, no barred word, one sentence, twelve words at most), `products.json` (the endless nouns) and `corpus/<stack>.json`. A local model may sit as the user in endless mode, picking from a closed choice of snippets and phrasing the ask through the gate; it never writes the code you type.

Design, research grounding and the lock G23–G30 are in [`docs/vibe-typer.dispatch.md`](../../docs/vibe-typer.dispatch.md); what each slice built is in `docs/vibe-typer.slice1.md` and `docs/vibe-typer.slice2.md`, each with its outside review beside it.
