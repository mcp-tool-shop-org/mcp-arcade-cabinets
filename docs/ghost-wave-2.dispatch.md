# Ghost on the Menu — wave 2 dispatch: make it a game

**Director (2026-09-10):** House Call is not fun and is parked (last state 152f548). All focus on Ghost. "Bare but has a lot of promise, needs a lot of work." Asked for: sound effects, harder enemies, waves, boss battles, a soundtrack, different retro sprites, datasets for enemy patterns, truly challenging without being impossible.

**Synthesizer:** Claude (Fable 5.1). **Design partner and sim owner:** Grok 4.6. **Verifier:** cross-family review each way; prism citation gate on the grounding. **Lock in force:** G1, G7, G8, G9, G10 of `study-swarm.dispatch.md`. G2–G6 belonged to House Call and are dormant with it.

## Standards compliance

| Standard                 | Score | Evidence                                                                                                                                                                                                                                                                    |
| ------------------------ | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PIN_PER_STEP             | 2     | Enemy patterns, fire rhythms, boss scripts and the difficulty ladder are data files under `packages/ghost-on-the-menu/patterns/`, validated by a schema test; a round is a pure function of (tape, pattern set, seed). Citations in signed prism receipts beside this file. |
| ANDON_AUTHORITY          | 2     | The scripted play-through is the andon: it fails the build if any score word or digit appears on screen, if a lie can be told apart before the hit, or if the balance bots fall outside the fairness band (below).                                                          |
| NAMED_COMPENSATORS       | 2     | Nothing here is irreversible except art generation (credits) and a Pages deploy (public). Art: not committed until accepted, rejected sets deleted from the library, owner Claude. Pages: not in this wave; Director's call.                                                |
| DECOMPOSE_BY_SECRETS     | 3     | Sim (Grok) and presentation (Claude) meet at the `RoundState` contract in §4. Patterns are data, so tuning changes no code. Audio is its own module with no sim import.                                                                                                     |
| UNCERTAINTY_GATED_HUMANS | 2     | Two Director checkpoints, framed contrastively: after slice A (the catch + waves) and before art spend.                                                                                                                                                                     |
| EXTERNAL_VERIFIER        | 2     | Grok reviews Claude's presentation lane; Claude reviews Grok's sim lane; the cloud panel checks implementation claims; prism gates the citations.                                                                                                                           |

## 1. What is bare, measured on main @ cfce991

- No threat: nothing fires, nothing dives, no lives, no fail state. It is a gallery.
- The reveal is never seen: a hit sets `revealed` and `alive=false` in the same step; the renderer skips dead sprites. The one moment G7 asks for ("disproportionate feedback") does not exist on screen.
- Fixed 150 s round. `naive-ndjson` has about ten visible beats: a sprite every fifteen seconds.
- Honest and lie hits feel identical. Fog (notifications) does nothing.
- The end is two lines of text.

## 2. Research grounding

Three Opus research agents (shooter feel, hit feedback, log-to-level), 2026-09-10. Citations in `ghost-wave-2.citations.json`, prism receipt in `ghost-wave-2.citations.verify.txt`. Findings are load-bearing only where the receipt says grounded; the gate result is recorded at the end of this section. Postmortems and interviews are advisory (A-numbers) and were not sent through the gate.

**Hit feedback**

1. **Juice has a sweet spot.** Kao 2020, _Entertainment Computing_, doi 10.1016/j.entcom.2020.100359. Four builds of one action RPG: none and extreme juice both reduced play time, motivation and performance; medium and high won. → Effects are tuned to medium, with an intensity control (W1).
2. **Feedback contingent on success motivates; blanket amplification demotivates.** Kao, Ballou, Gerling, Breitsohl, Deterding, CHI 2024, doi 10.1145/3613904.3642656. → The catch is the loud event; honest pops stay small (W2).
3. **Juice buys appeal, not clarity.** Hicks et al., CHI PLAY 2019, doi 10.1145/3311350.3347171. → Nothing about a lie may depend on juice to be legible; the tell is structural (W3).
4. **Hit stop, sound coherence and camera control dominate impact feel.** Lin, Duan, Wen, Cai, IEEE GEM 2022, arXiv:2208.06155. → Hitstop plus a coherent catch sound before particles (W5).
5. **Hit-feedback preferences vary about six-fold; random settings read as excessive nearly half the time; shake time tracks hit stop.** CHI 2026 EA, doi 10.1145/3772363.3798911. → Default below the midpoint, three presets, shake scaled to hitstop (W4).
6. **Audio raises satisfaction without a performance gain.** Nesbitt & Hoskens, AUIC 2008, CRPIT vol. 76. No resolvable DOI, so it did not go through the gate; advisory (A4). → Sound is the cheapest feel on rectangles.
7. **Distinctiveness against a homogeneous background, not salience, is what memory rewards.** Hunt 1995, doi 10.3758/BF03214414. → The catch is categorically different (new sound family, hitstop, the sprite stays), not a louder pop (W7).
8. **Juicing communicates the importance of events; proportionality is its function.** Pichlmair & Johansen 2020, arXiv:2011.09201 (with Swink 2009 on sub-100 ms response). → One reveal per lie, proportionate to its rarity (W8).

**Shooter feel**

9. **Speed change and direction change read as alive.** Tremoulet & Feldman 2000, _Perception_, doi 10.1068/p3101. → Every formation enters on a curved, accelerating path; constant drift reads as scenery. Because motion is a tell only if it is selective, all classes share the pools (W9, G7).
10. **Removing the uncertain outcome costs more than any other single feature.** Malone 1981, doi 10.1207/s15516709cog0504_2. → A round the player cannot lose is the fastest way to lose them (W10).
11. **Enjoyment of the challenge, not objective difficulty, predicts enjoyment.** Corcos 2018, doi 10.1080/20009011.2018.1474668. → The fairness band exists so threat stays inside competence (W11).

- A1 Nishikado interview (shmuplations): invader speed-up was an artifact kept because escalating pressure is the feel. → Pressure ramps within a wave as ranks thin.
- A2 Yokoyama, Galaga 30th anniversary interview: the fly-in is a scored threat window, and the challenging stage is a breather that works only between threats. → Entries are killable in transit; one no-fire flyby per round, framed by threat.
- A3 Retrogame Deconstruction Zone, Galaxian to Galaga: event density, not enemy count, sets tempo. → Fix dead air by density, not by more sprites.

**Log to level**

12. **Rhythm groups first, geometry second.** Smith, Treanor, Whitehead, Mateas 2011, doi 10.1109/TCIAIG.2010.2095855. → The prepass charts rhythm groups with authored rests, then places sprites (W12).
13. **Placement conditioned on difficulty; rests are the majority class.** Donahue, Lipton, McAuley 2017, arXiv:1703.06891. → Density curve per tier; silence is designed (W13).
14. **Per-event generation fails patterning.** Halina & Guzdial 2021, arXiv:2107.12506. → Lies recur as one congruent figure (the sequence tells), never a per-event flag (W14).
15. **Expressive range analysis exposes generator holes.** Smith & Whitehead 2010, doi 10.1145/1814256.1814260. → A test plots every fixture tape's round on density and threat; identical rounds from different tapes fail (W15).
16. **In social deduction, the honest signal of a lie was timing, not surface.** Zhang, McGettigan, Belyk 2022, doi 10.1371/journal.pone.0263852. → The tell lives in cadence and order, which the tape supplies (W16).
17. **Unstructured lie detection is near chance.** Bond & DePaulo 2006, doi 10.1207/s15327957pspr1003_2. → The cue must be engineered to be learnable, or the loop is a coin flip (W17).
18. **Expertise is chunking of recurring configurations.** Chase & Simon 1973, doi 10.1016/0010-0285(73)90004-2. → The three tells keep the same shape on every tape (W18).
19. **Perceptual learning transfers to novel instances.** Kellman & Garrigan 2009, doi 10.1016/j.plrev.2008.12.001. → Reading rounds should transfer to reading tapes; that is the point of the cabinet (W19).
20. **Suspense comes from controlling how and when information is uncovered.** Cheung & Huang, CHI 2011, doi 10.1145/1978942.1979053. → The reveal moment is the game's; nothing leaks it early (W20).

**Gate result (prism 1.6.0, receipts `ghost-wave-2.citations.verify.txt` and `.retry.verify.txt`):** all nineteen gated citations exist (W3, W4, W11, W12 after identifier corrections, recorded in the retry receipt). **Grounded through the source abstract, load-bearing:** W5 (hit stop, sound coherence, camera), W9 (animacy from speed and direction change), W14 (patterning, not per-event placement), W17 (unstructured lie detection near chance). **Existence-only, surfaced for the Director:** W1, W2, W3, W4, W7, W8, W10, W11, W12, W13, W15, W16, W18, W19, W20; the retrieval oracle had no abstract to ground them against, the same Crossref limit as the first swarm. Implications above that rest only on an existence-only finding are advisory until the Director reinstates them or a full-text check lands. The design below stands on the lock, the four grounded findings, and the Director's word.

## 3. Design, inside the lock

Grok's pushback (design session, 2026-09-10) is taken on three points and overridden on one by the Director's word.

**Taken.**

- **No motion tell.** Any movement only lies perform is a pre-label (G7). Entry swoops, dives and fire belong to every formation of a class or to none.
- **Fog is `notifications/message` only.** `notifications/initialized` is handshake. Fog is the tape's speech, present whether or not a leak follows.
- **No moral at the end.** The scene names the tape, the server, the policy (G10). Lamps dark and unrevealed sprites still in their paint say the rest.

**Overridden.** Grok proposed threat could wait. The Director asked for challenge. Threat is in wave 2, from sources that never separate lies from honest sprites.

### The tells are in the sequence

- An extra grid formation **after** the task formation in the same atom is the followed whisper.
- A **second** menu tablet in the same atom is the rug.
- A **singleton** grid sprite right after its menu (one member, never a collapsed burst) is the ghost probe.

The player learns to read the wire by reading the round. No sprite changes look, motion or timing because it is a lie.

### The catch (the one mechanic, first)

On a lie hit: hitstop 120 ms, screen shake, the sprite does not die. It bursts into the amber reveal sprite, rises to the parking line and stays there as a trophy for the rest of the round. A one-line caption of the wire fact for 1.5 s, worded from the tape, never a grade. Honest hit: small pop, small sound, gone.

### Threat, waves, bosses

- **Waves per atom.** One wave per atom on the tape, a two-second breather between. Round length about four seconds per visible beat, clamped 45–120 s.
- **Entry paths from data.** Every formation enters on a path from the pattern set, chosen by event class and tier. Honest and lie formations of one class draw from the same pool.
- **Fire from data.** Formations fire on rhythms from the pattern set; at tier 0 only the boss fires. Shooting an honest echo for survival is allowed and costs nothing but time.
- **Fog.** A fog bank drifts down; reaching the player's line veils the lower third for a beat.
- **Lamps.** Three lamps on the bezel. A hit on the player puts one out. All out ends the round early, with the same scene.
- **Bosses, one per atom kind.** The boss is the atom, not the lie. It spawns for every atom of its kind whether or not the lie happened (a held poison wave still gets its Whisperer), its phases never branch on the fact, and killing it reveals nothing; the lie is still a spawn in the same paint. Boss scripts are phase lists in the pattern set.
  - **Whisperer** (poison wave): a wide pulsing hulk that drops a fog bank on a timer; grid rows emit from its underside on the phase cue, the same whether the extra row is the whisper or not.
  - **Menu** (rug wave): a tablet that squash-flips, width to slit to width, each phase and drifts to a new column; the second tablet in the wave is the rug, same class, same look.
  - **Doorman** (unlisted wave): a tall figure that flicks out a nameless plate and either eats it or knocks it back, the same loop every round; the answered probe is the singleton grid beside it, never a special pose.
- **Difficulty ladder.** Tier from tape header (fixture control 0, seat 1, live 2) plus a per-round ramp. Ladder rungs are data.

### Sound

- **Effects.** WebAudio, no assets: fire, pop, catch chord, fog hum, lamp out, boss phase.
- **Soundtrack.** Procedural chiptune from a pattern file (a scale, a tempo, a bass loop, a lead motif per wave), so it is data like the rest. A generated track through Comfy Cloud only if the Director wants one, spend-gated.

### Retro sprites

Art brief 1 stands and grows: three boss sprites (Whisperer, Menu, Doorman) and a player ship, 16-bit, same palette, no glyphs. Generation is spend-gated; nothing has run.

### Challenging, not impossible: the fairness band

Three scripted bots play every fixture tape in CI:

| Bot     | Behaviour                                  | Must                                                    |
| ------- | ------------------------------------------ | ------------------------------------------------------- |
| idle    | never fires, never moves                   | lose all three lamps on tier ≥ 1 before the round ends  |
| sweeper | today's bot: nearest target, always firing | survive tier 0; reveal at least half the lies on tier 0 |
| reader  | fires only at sequence tells               | reveal every lie on tier 0 and 1                        |

The band is a floor and a ceiling: idle must be hittable at the default spawn, the sweeper is the dumb player, the reader is the ceiling that knows the tells. The reader is not the sweeper filtered to lies, or the band only measures exposure time. A pattern change that makes tier 0 kill the sweeper or lets idle survive tier 1 fails the build. First knob to tune: the tier-1 fire period (shot speed times period), the one number that kills idle on tier 1 without deleting the sweeper on tier 0. Tuning stays in data.

## 4. Sim contract (Grok's, accepted)

```ts
type EnemyMode = 'enter' | 'hover' | 'dive' | 'caught' | 'dying';

interface Enemy {
  // existing fields, plus:
  mode: EnemyMode;
  pathT: number; // 0..1 along the entry path
  path: { x: number; y: number }[]; // every formation, honest or not
  caughtY: number; // parking line for trophies
  fireAt: number; // next shot time, from the pattern
}

interface FogBank {
  x: number;
  y: number;
  w: number;
  h: number;
  vy: number;
  alive: boolean;
}

interface Boss {
  kind: 'whisperer' | 'menu' | 'doorman';
  x: number;
  y: number;
  w: number;
  h: number;
  phase: number;
  hp: number;
  alive: boolean;
}

interface RoundState {
  // existing, plus:
  hitstop: number; // seconds remaining; dt applied after
  shake: number; // 0..1, render offset only
  lives: number; // 0..3, drawn as bezel lamps, never a digit
  fog: FogBank | null;
  blind: number; // seconds of lower-field veil
  wave: number; // atom index
  boss: Boss | null;
  enemyShots: Shot[];
  caption: { text: string; t: number } | null; // wire fact, ≤ 1.5 s
  ended: 'time' | 'lamps' | null;
}
```

## 5. Pattern dataset

`packages/ghost-on-the-menu/patterns/` — JSON, validated by `test/patterns.test.ts` against a schema in `src/patterns.ts`.

| File              | Holds                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| `paths.json`      | Named entry paths as normalized control points (0..1 field units), tagged by class and tier           |
| `formations.json` | Member layouts for a burst of n members                                                               |
| `fire.json`       | Rhythms: period, burst count, spread, speed, by tier                                                  |
| `bosses.json`     | Per boss kind: phases with duration, motion, fire rhythm, spawn cue                                   |
| `ladder.json`     | Tier → which pools, fire on/off, speeds, fog speed, lamp rules                                        |
| `waves.json`      | Breathers and density curve per tier: gap seconds, beats per rhythm group, rests (W12, W13)           |
| `player.json`     | Speed, cooldown, hitbox, so the fairness band tunes without a code change                             |
| `music.json`      | Scale, tempo, bass loop, one lead motif per wave kind. Presentation only; not an input to the prepass |

A round is `prepass(tape, patterns, seed)`, a pure function; the seed is stored on the `Round` beside `tapeId`, `duration`, `beats` and `waveBounds`. The sim is `step(state, input, dt)` and nothing else. Caption text comes from the beat's `source.note`, never from a file.

## 6. Lanes and order

1. **Slice A, Grok (sim + prepass), in this order:** (a) the catch: `types.ts` gains `EnemyMode`, `caughtY`, `hitstop`, `shake`, `caption`; `revealOnHit` keeps a lie alive in `caught`, honest goes `dying` then dead; sim tests. (b) `prepass.ts`: four seconds per beat clamped 45–120, wave per atom, `notifications/initialized` is handshake, fog is `notifications/message`, seed on the Round. (c) `patterns.ts` loader and schema, the JSON files, `test/patterns.test.ts`. (d) sim: shared entry paths, `enemyShots`, fog, lamps, bosses with phase scripts that ignore the fact. `botInput` stays green throughout.
2. **Slice B, Claude (presentation + shell):** renderer for caught/dying/fog/blind/shake/lamps/boss/caption, WebAudio effects and the procedural soundtrack, end scene, the three bots and the fairness band in the play-through, browser shell.
3. **Checkpoint, Director:** play it. Contrastive framing in the packet.
4. **Slice C, art:** brief 1 plus bosses and ship, spend-gated.
5. Cross-review each way, cloud panel, commit.
