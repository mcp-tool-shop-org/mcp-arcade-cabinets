# Vibe Typer

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/mcp-arcade-cabinets/vibe-typer-readme.png" alt="Vibe Typer" width="240" />
</p>

The cabinet's own page. The repo entrance is the [root README](../../README.md); the manual is the [handbook](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/vibe-typer/); the npm page is [`packages/launcher-vibe-typer/README.md`](../launcher-vibe-typer/README.md).

<p align="center">
  <strong>You're absolutely right.</strong>
</p>

**Vibe Typer** is a typing arcade game. You are a coding agent, hard-working, sycophantic and lovable. Your user is a vibe coder with ideas: a website for their cat, a rideshare for ducks, a blockchain for the office fridge, a marketplace for slightly used opinions. Each request lands in blue and asks for the thing the code actually does. You type the reply, then you type the code, line by line, and the thing gets built in the preview beside you, inside a device drawn for the stack. Ship the last line and the product deploys, the confetti falls, and the valuation rolls up.

Nothing yells. A mistyped character waits for a backspace. A line sent wrong gets "hmm, that's not it" and a retry. While you type, the user checks in ("is it live yet", "my cousin is asking") and the agent answers when the line is out; a check-in costs nothing and changes nothing but the mood. The only clock is your context window, and in the listed levels it is joyful: run it dry and the agent compacts, sums up in one line, and carries on.

```bash
npx @mcptoolshop/vibe-typer
```

## How it plays

- **A level is a story about one product.** Sixteen are listed, grouped by stack on the menu with a difficulty word: two each on shell, tables, java and sharp, three each on python and script, and two on the integration stack built from real tool names. Each level pins four pieces of code in order: the first request sets the product up, the middle two escalate, the fourth is the deploy with a twist. The premise shows on the standup.
- **The scoreboard is the game's number.** Valuation, **vibes** (the multiplier, which climbs with your streak of clean lines) and the streak itself sit on the field at all times. Words per minute and accuracy never do. Points are the request's difficulty value times your vibes, and the preview grows by exactly what the score counts.
- **The context bar is the pace.** It drains as the conversation goes on. Each request costs a slice; shipping one compacts and refills a share. Milestones on valuation, seed, series A and unicorn, are stingers, not rules.
- **Scope creep.** Now and then the user adds "oh also can it…" and one more line joins the request. It is shown and voiced before it is typeable.
- **Quick sync.** A meeting interrupts a level: three short lines, "sounds good", "will do", and the bar does not drain. A breather.
- **Copilot.** Hold a streak and the editor offers the rest of the line for a few seconds. Tab takes it, for a smaller payout.
- **Endless** climbs until the bar empties. With a local Ollama daemon running, a model sits as the user and writes the product, the asks and the code you type, behind a code gate (plain ASCII, twelve lines, eighty columns, balanced brackets and quotes, the stack's own language, no barred word, a value inside the band) and the same word gate as every authored line; the menu's endless entry says which seat will sit, and a late or refused answer is the authored pool, silently. On the published page there is no daemon, so endless plays from the corpus.
- **Hardcore**, from the selector only, drains faster, burns context on every mistyped character, has no Copilot, and ends the level on empty.
- **The standup** ends a run: the product as you built it, its premise, the user's closing line, the valuation, the milestones reached, and the run's seed. Type the seed into the menu to replay the same run. The **retro** is opt-in: the key pairs that caught you, then how steady your hands were, in words, against this browser's own past and nothing else.

## What you learn

The code is real. Two hundred and forty-nine snippets across bash, C#, Java, JavaScript, Python and SQL, banded from a bare `echo` to a nested class, with teaching notes on each and an ask written for each one, plus an integration stack built from the real tool names on the tapes in this repo, so a request can name a thing you actually run. The difficulty of a snippet is a formula over its text: character surprisal, the travel between adjacent keys, length, punctuation density, long identifiers and closing brackets. The pairs you miss are remembered in your browser and seeded into your next level's real lines, never drilled bare.

## Sound and settings

Five keyboard sample sets to pick from. Every clean line climbs the keystroke pitch a semitone, up to an octave, and a miss resets it: the streak is something you hear. Every event on the field has one sound with a transient and a tail; the deploy ducks the bed and rings a chord. The bed has three settings: **soft** (the default, no pulse that could read as a clock), **on** (the kick and the hat, tempo on your vibes) and **off**. The menu's settings row also holds the type size (large by default; a typing game is read at arm's length), the keyboard, the sound, and the agent's name (Sprocket unless you say otherwise).

## Controls

Type what you see. Enter sends a line. Backspace fixes. Tab takes the rest of a line when the ghost offers it. Hold Escape to leave. Sound starts on the first key or click; mute sits under the field.

## Where the words and the numbers live

Every lever is JSON under `packages/vibe-typer/patterns/`, validated at load: `levels.json` (the sixteen stories with their pinned pieces, the drain, the endless ladder, the check-in interval, the creep and sync shares), `score.json` (vibes steps, Copilot, milestones, hardcore), `context.json` (drain and refill per tier), `difficulty.json` (the key map and the formula weights), `user.json` and `agent.json` (every line the user and the agent say: asks, check-ins and the answers to them, reactions that name what shipped, reviews that name the product, replies, hmm lines, compactions, ship lines), `products.json` (the endless nouns) and `corpus/<stack>.json` (the snippets, each with its ask). The lines were written by a model from two voice sheets under `patterns/voice/`, one for the user and one for the agent, through a word gate (no digit, no barred word, no tool or model name, one sentence, twelve words at most, nothing shouted, American English, tested) and an editor pass; the script, the prompts, the model and every receipt are in the repo.

Design, research grounding and the lock G23–G30 are in [`docs/vibe-typer.dispatch.md`](../../docs/vibe-typer.dispatch.md); what each slice built is in `docs/vibe-typer.slice1.md`, `slice2.md` and `slice3.md`, each with its outside reviews beside it.
