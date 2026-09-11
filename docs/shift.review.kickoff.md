# Kickoff — Grok reviews slice 7, the shift

Paste the block under **Prompt** to start the session. Repo: `E:/AI/mcp-arcade-cabinets` (`mcp-tool-shop-org`). Written 2026-09-11 after the shift landed on `main`. Headless is fine: `--permission-mode acceptEdits --allow "Write" --allow "Edit" --allow "Bash(pnpm*)" --allow "Bash(git*)"`. Review the diff; the report often does not arrive.

---

## Prompt

```
You are Grok, the sim owner and design partner on Ghost on the Menu. Slice 7, the shift, landed on main today on the Director's decisions (lamps refill at every call, the climb is a crucial lever, four calls, a replay code). It is yours to review. You do not rebuild it, you do not re-derive the lock, and you do not tag.

Repo: E:/AI/mcp-arcade-cabinets. cd there first. C:\WINDOWS\system32 is not a project.

Read before the diff, in order: HANDOFF.md, docs/shift.dispatch.md (the research grounding, the lock G19–G22, what was built, measured and refused), then the band test packages/ghost-on-the-menu/test/band.test.ts (the shift climb block) and packages/ghost-on-the-menu/test/shift.test.ts.

The lock, not negotiable: G1, G7–G10, G11–G18, and now G19–G22. G21 is the one in your lane: the climb is data, measured on its own bar, never a relaxation of the tape-alone bars.

The diff (git log 1cc76dc..main):
- packages/ghost-on-the-menu/patterns/parallelism.json gains copiesShift and intensityShift per tier (seat and live 5 and 2.0, hardcore 6 and 2.6, recorded unchanged at 1 and 1); patterns.ts validates each at least its Later; copiesAt and intensityAt take a climb (0..1): the wave schedule's start is lifted toward Later and its end toward Shift, so the last call starts where the tape alone ended.
- patterns/shift.json: length 4, climb [0, 0.35, 0.7, 1], two word lists of sixty-four nouns (even positions one syllable, odd positions two); loader in patterns.ts.
- types.ts: Round.climb (optional, absent is 0); PrepassOpts.climb; prepass.ts clamps and sets it; sim.ts reads meta.round.climb in fireScale and spawnDecoys and nowhere else.
- src/shift.ts (new): drawShift (mulberry32 off a clock seed, six candidates scored for freshness against the last two shifts), encodeShift/decodeShift (rank of the ordered draw × difficulty × a four-bit roster check, twenty-four bits in four words), climbAt, shiftCard (server, policy, the atoms' task_tool names, digits kept off), ordinal words.
- play.ts: playTape({ climb }); scripts/sweep.mjs --climb <0..1>.
- apps/cabinets: main.ts (Shift button, difficulty select, code box, the call card, the closing scene, localStorage of the last two draws), ghost.ts (MountExtra: climb, fixed difficulty, furniture lines, next label, hint).
- Measured (docs/shift.dispatch.md): at climb 1 the live mover dies on nine of twenty (five alone), lamps lost 2.25 (1.55), lies seventeen of twenty-one; the live reader four (one); seat barely moves. The first reach tried (4 and 1.55 at live) moved the mover by one death and was refused as not felt.

Questions you answer, each with a file:line and a verdict (hold / change / halt):

1. G1 and G12 on the climb: does copiesAt / intensityAt with climb, or anything in shift.ts, key motion, look or timing on a fact, a lie flag, a count or a tape row? The rug-flipped twin test in shift.test.ts runs at climb 1; say whether it covers spawnDecoys and fireScale or only one of them.
2. The shift bar in band.test.ts: is "half the roster survives with half the lies found" the right bar for the last call at live, beside the tape-alone three quarters? Is the "felt" test (total lamps lost climbed > alone) the right shape, or should it be a per-tape or a mean-lamps bar? Is anything in the block a relaxation of the existing bars in disguise?
3. The reach numbers: is 5 and 2.0 at live the right stop, and is the climb list [0, 0.35, 0.7, 1] the right shape, or does Booth's trough (a lower third call) belong in the data now? Say what you would put to the Director.
4. The seat tier at climb 1 barely moves (sixteen mover deaths against seventeen alone). Is that the burst window saturating, or is the lever not reaching seat? Trace burstActive against copiesAt for tier 1.
5. The word lists in shift.json: any near-homophone pair, any word the say gate's FORBIDDEN or the screen's SCREEN_FORBIDDEN would catch, any word that names the game's own furniture (lamp, ghost, boss, tape) or a tool, model or vendor. Say which to swap.
6. The code: is a four-bit roster check enough, or does a transposed pair of words on the same parity slip through as a different valid shift too often? Compute the odds from the encoding and say whether it matters for a hand-me-a-code use.
7. Anything in the diff that changed a tape, the instrument, or the cabinet server. Expect nothing; confirm it.

What you may change: your lane only (packages/ghost-on-the-menu/src, its tests, packages/tape-core, the pattern JSON), and only to fix a halt you found. Every change keeps pnpm verify green and the band in its bars; a pattern change needs pnpm sweep and pnpm sweep --climb 1, both quoted in the report. Do not touch the shell, the server, voice/, catalog/ or the docs; write those findings up for Claude instead.

Gate before any push: pnpm verify; pnpm sweep and pnpm sweep --climb 1 if a pattern changed; python %USERPROFILE%\.grok\bin\identity-scan.py . from the repo cwd. Never git add . Git author is the org noreply. Do not tag or bump the version. Do not start slice 5.

Report, as docs/shift.review.md, committed and pushed: the seven verdicts with file:line, what you changed (with the commit), what you want Claude to change, and the paragraph for the Director on the reach and the climb's shape. Numbers only where they change a verdict.
```
