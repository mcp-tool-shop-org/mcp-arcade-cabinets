# Review — cabinet server slices 1–3, and the v0.4.0 seats

Grok, sim owner. Read against G1, G7–G10, G11–G18. Diffs: `v0.4.0..main` (`2f78b4a`, `dc8cdb3`, `66d3fb7`) and `6e1b95f..v0.4.0` (`d9db3c2`). The lock is not re-derived. Nothing is tagged.

No halt in this lane. The sim, its tests, and `tape-core` are unchanged. This file is the report.

---

## 1. G7 and G12 in the sim — **hold**

`landSay` (`packages/ghost-on-the-menu/src/sim.ts:758`) reads `state.bossSay`, the clock, and `caption.kind`. `stepBoss` (`sim.ts:769`) clears `bossSay` when the boss is dead or absent. `BossSay` (`types.ts:144`) is `{ text, at }`. None of them read a fact, a lie flag, a tape row, or anything that differs between a tape and its rug-flipped twin before a hit.

A catch caption is set only after a hit (`sim.ts:1183`). `landSay` waits while `caption.kind !== 'aside'` (`sim.ts:763`), so a say line waits behind a catch. That wait cannot happen before a hit: there is no catch yet. After a hit the twins are allowed to diverge (caught lie parks, honest sprite dies). Hitstop (`sim.ts:1017`) freezes the round on a catch, so `landSay` does not even run until the reveal has already happened. No pre-hit path.

The fact-flip in `packages/cabinet-server/test/cabinet.test.ts:73` drives an unarmed mover (`fire: false` at `:78`). That is the right invariant: nothing is revealed, so nothing may differ. It is complete for the pre-hit claim it makes (tool words, call log, boss/shots/fog/caption/say/intent over 5400 frames, rug flipped). It is not a post-hit test, and it does not need to be. Grid G7 stays with the sim's own tests.

## 2. The boundary — **hold**

`host.ts` is the only file that touches `Round` and `RoundState`. `cabinet.ts:30` sees a `CabinetHost` of seven methods. There is no path through that surface to a fact, a lie flag, a score, a verdict, or a tape row.

- `view` (`host.ts:33`, rendered at `cabinet.ts:76`): wave kind, boss kind, health word, ship column, stick, motion word. Between waves: `wave …` / `no boss on the field`. `waveKindAt` (`cues.ts:12`) is atom kind from `waveBounds`, never a fact.
- `tapes` (`host.ts:48` via `labelTape` at `label.ts:64`): name, fixture/seat/live, a why of header and wire shape. `label.ts` already fact-flips every fact on the tape. The stdio server loads full tapes to build those cards (`server.ts:38`) and never returns a row.
- `propose` / `say` / `sfx` write a verb, a line, or a sound. Their replies are status words. `recent` and `maxWords` feed the gate, not the guest.

A tool call cannot learn a fact through this surface.

## 3. G11 and G13, revocation — **hold**

`sameView` (`packages/cabinet-server/src/client.ts:262`) keys on kind, health, motion, and wave. Column and stick do not revoke. The sim reads aim live at the beat (`sim.ts:816` lean, `sim.ts:880` column shot). A verb chosen on a stale column or stick is not a fairness problem: `spread` is a fan, `hold` is a still beat, `column` still tracks the ship now. The band never sets an intent (G11). The dispatch's "revoked if the view changed" is the boss's words, not the stick. The narrowing holds. Do not read it literally as the whole `SeatView`.

## 4. G14, the gate and the fallback — **change**

`gateLine` (`packages/cabinet-server/src/gate.ts:50`) holds on the cases it was asked: `Fireproof` and `viewer` pass (the `NAMES` boundaries at `:19` are word boundaries, as they should be); `mcp-arcade` is refused; hyphenated `fact-blind` / `score-keeper` / `pass-through` are refused; the letters-only repeat key (`gate.ts:37`) matches punctuation variants.

It does not hold on digits. `/\d/` at `gate.ts:59` is ASCII `[0-9]`. Fullwidth `３`, Arabic `٣`, and Devanagari `३` (`\p{Nd}`) pass and would land on the field. Superscript `³` and circled `③` (`\p{No}`) pass too. A homoglyph `lіe` (Cyrillic i) and a zero-width space inside `lie` also pass. Those are Claude's gate. Close `\p{Nd}` (and `\p{No}` if the bound is "looks like a digit"). Do not loosen `NAMES` to catch `Fireproof`.

The fallback salt (`host.ts:99`, `61 + says`) is safe for twins: same seed, same call sequence, same line. `pickLine` does not read a fact. `says` is not reset when the round under the host restarts (`server.ts:90`); that is not a twin leak, but the salt should reset with `recent` so a fresh round with the same seed plays the same authored line.

## 5. The band — **hold**

The live bars are the same fractions: three quarters and half (`band.test.ts:157`, `:164`), `Math.ceil(ROSTER * 0.75)` and `Math.ceil(ROSTER * 0.5)`, replacing 12 of 16 and 8 of 16. No bar moved.

The four cabinet tapes are stdio and derive to tier 2. They join the live roster. Naive on the cabinet's own menu followed nothing, so those four are a quieter live than the instrument's sixteen. "Live is survivable" still means the same fraction of whatever is on disk; the disk now includes the self-bouts. That is the slice-3 admission, not a silent easing of the bar. Hardcore still takes sixteen tapes (`band.test.ts:175`); because `readdir` is alphabetical, that slice now starts with the four cabinet tapes. The assertion did not move. Leave the band alone.

## 6. The v0.4.0 seats — **hold**

Nothing in `d9db3c2` keys motion, look, or timing on a fact.

- The pilot lever (`patterns/fire.json`, loaded at `patterns.ts:308`) is tier data: `fan` / `spread` / `lean`. Recorded rung stays `1 / 0 / 0`.
- Lean (`sim.ts:816`) and hold (`sim.ts:894`) read the seat's verb and the player's rect, never a fact.
- `spawnBoss` (`sim.ts:548`) consumes `bossLine` only when wave and kind match and the index is in range; otherwise the seed's pick. The copy is `voice.json`.
- Think-low (`pilot.ts:162`) is a per-model retry on an empty response. The prompt is still `pilotPrompt` / `voicePrompt`, both of which throw on a forbidden word.

The seated fact-flip in `sim.test.ts` holds the boss rects, shots, fog, and lines across a rug flip.

## 7. The say bound — for the Director

Keep one sentence. Seed one-sentence lines only. The bound is doing the job the evidence asked for: short, never a conversation, a failed gate falls back to the authored floor. The two-beat deadpan in the drafts is timing, and `lead` already owns timing. Fourteen of the twenty-four boss lines failing their own gate is a seed problem, not a bound problem. The register still works in one sentence ("The Whisperer does not raise its voice." / "The Menu would like you to pick nothing." / "A closed door is still a Doorman."). Loosening to two short sentences would make the gate's dominant refusal vanish and teach the model to punch with a period. Rewrite the seeds. Do not move the bound to match drafts written before it existed.

---

## What I changed

Nothing in `packages/ghost-on-the-menu` or `packages/tape-core`. No halt in this lane. This file is the commit.

## What Claude should change

In `packages/cabinet-server` (not done here):

1. `gate.ts`: refuse `\p{Nd}` (and `\p{No}` if a circled or superscript digit is still a digit on the field). Add those cases next to the ASCII `3` test. Optional: strip format characters before `FORBIDDEN` so a zero-width space cannot hide `lie`.
2. `host.ts`: reset `says` when `recentFor` changes, same moment `recent` clears, so a restarted round with the same seed plays the same fallback.

Do not reverse the revocation narrowing. Do not touch the band. Do not start slice 4 from this review.
