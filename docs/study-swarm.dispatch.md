# Study-swarm dispatch — the cabinets

**Date:** 2026-09-10
**Synthesizer:** Claude (Fable 5.1). **Design partner and builder:** Grok 4.6. **Director:** Mike.
**Trigger:** a new product layer (games on top of the instrument) and the Director's bar, "actually fun to play."
**Product:** two games in this repo that read `mcp-arcade` tapes and produce nothing the oracle or the dataset ever sees: **House Call** (turn-based, calibration-scored) and **Ghost on the Menu** (replay arcade shooter).
**Instrument lock:** `mcp-arcade/docs/study-swarm.dispatch.md` C1–C9 is closed and not reopened here. Where a cabinet decision rests on it, the C-item is cited.
**Verifier:** `prism verify --type citations` 1.6.0, caller family anthropic excluded, retrieval oracle (arXiv + Crossref) for existence, different-family groundedness lens (gpt-oss:120b-cloud, gemini-3-flash-preview:cloud). Receipts: `docs/study-swarm.citations.verify.txt` (34 citations) and `docs/study-swarm.citations.retry.verify.txt` (3 re-verified with tightened claims). Signed Ed25519, replayable.

## Standards compliance

| Standard | Score | Evidence |
|----------|-------|----------|
| PIN_PER_STEP | 2 | Citations and verdicts are in signed, replayable prism receipts committed beside this file. Fixture tapes are exported by `mcp-arcade tape` from committed goldens and proofs. |
| ANDON_AUTHORITY | 2 | Twenty-one findings could not be grounded and are barred from carrying architecture until the Director reinstates them (table below). Two claims that overreached their abstracts were tightened and re-verified once; the two that still failed are barred. |
| NAMED_COMPENSATORS | 2 | The cabinets perform no irreversible action. Repo pushes and merges undo as in the instrument. |
| DECOMPOSE_BY_SECRETS | 2 | `tape-core` (loader + schema + calibration math) changes with the tape schema; each cabinet changes with its own rules; nothing here can change the instrument. |
| UNCERTAINTY_GATED_HUMANS | 2 | The reinstatement table is a contrastive checkpoint for the Director. Art is gated behind a playable slice. |
| EXTERNAL_VERIFIER | 3 | Family-different, reasoning-stripped citation verification with signed receipts; Grok reviews every diff; the cloud panel adjudicates implementation claims. |

## Questions dispatched (5 parallel research agents, Opus)

1. Which scoring rules and tournament designs reward honest probabilistic prediction and punish hedging, and does a calibration score change behaviour?
2. What do serious games and citizen-science games on real data teach about fun that does not corrupt the science?
3. What makes short-session turn-based play and commit-then-reveal moments satisfying, and party roles legible?
4. How do you generate satisfying arcade waves from a fixed event stream, and what does classic wave design say?
5. How do points, badges, leaderboards and visible scores displace goals, and which designs preserve intrinsic motivation?

## Research grounding — verified findings (existence resolved, claim supported by a different-family lens)

Only these may carry an architectural choice.

1. **About one hour of probabilistic-reasoning training improved forecasters' Brier scores by 6–11% over controls, replicated across four tournament years.** Chang, Chen, Mellers & Tetlock 2016 (DOI 10.1017/S1930297500004599). Calibration is trainable and cheap to train: House Call ships a short primer and a per-run calibration readout.
2. **Under scored feedback across thousands of forecasters, confidence tracked accuracy closely; overconfidence did not dominate.** Moore et al. 2017 (DOI 10.1287/mnsc.2016.2525). Persistent scored feedback is the mechanism: every House Call run ends with a reliability readout, not a number alone.
3. **When forecasters care about relative standing rather than their own score, the optimal report is more extreme than their belief.** Lichtendahl & Winkler 2007 (DOI 10.1287/mnsc.1070.0729). No leaderboard on House Call's score; the score is against the player's own past.
4. **Awarding a prize for the single best total score is not incentive compatible; extreme reports raise the chance of winning.** Witkowski et al. 2018 (DOI 10.1609/aaai.v32i1.11471). Never "highest score wins"; the reward is the calibration readout itself.
5. **EteRNA's value came from a wet-lab feedback loop: player designs were synthesised and the real result returned.** Lee et al. 2014 (DOI 10.1073/pnas.1313039111). The reveal must be the instrument's pinned wire fact, never a game-computed verdict.
6. **The claim that Quantum Moves players beat algorithms failed because the algorithmic baseline was weak.** Grønlund 2019 (arXiv:1904.01008). Any "you beat X" claim in a cabinet is measured against the instrument's own facts, pinned and re-verifiable; a flattering baseline is the failure mode.
7. **Merely seeing others' estimates collapsed estimate diversity without improving accuracy and raised confidence in wrong answers.** Lorenz et al. 2011 (DOI 10.1073/pnas.1008636108). Peer answers, consensus and rankings stay hidden until a call is locked; there is no shared-guess surface.
8. **Citizen-science data quality is protected by training and testing volunteers, expert validation, replication, and statistical error modelling.** Kosmala et al. 2016 (DOI 10.1002/fee.1436). The cabinets never feed back into the dataset; if they ever re-judge, it is on hidden pre-graded tapes.
9. **Chart generation from a stream decomposes into placement (when) and selection (which), with placement conditioned on difficulty.** Donahue, Lipton & McAuley 2017 (arXiv:1703.06891). The shooter derives timing from the tape first and enemy kind from event class second, in two passes.
10. **Generators fail on patterning, the congruent relation between placed objects, which raters treat as the mark of a good chart.** Halina & Guzdial 2021 (arXiv:2107.12506). A burst of `tools/call` rows becomes one formation, never one scattered sprite per event.
11. **Task-involving comments raised interest and performance; numerical grades, even alongside comments, undermined both.** Butler 1988 (DOI 10.1111/j.2044-8279.1988.tb00874.x). Per-turn feedback is narrative ("you called X; the tape shows Y"); no number sits beside it.
12. **Measuring an activity increased how much people did it but reduced enjoyment, with no reward attached.** Etkin 2016 (DOI 10.1093/jcr/ucv095). Counters and totals are off by default and revealed on demand at the end of a run.
13. **A Markov decision process can choose the next level segment so difficulty adjusts to observed performance.** Biemer 2023 (DOI 10.1609/aiide.v19i1.27540). House Call's campaign is a director sequencing fixed tapes by measured calibration, not a shuffle.

## Existence verified, groundedness unchecked — for the Director to reinstate

Every identifier below resolved at the retrieval oracle (the paper exists with that title, authors and year). The groundedness lens could not run because Crossref returned no abstract for these publishers, or the claim was not addressed by the abstract alone. You probably expected these to be citable; I left them out of the lock because the verifier could not confirm the one-sentence claim against the source. Reinstate any you confirm by editing this table; the lock connections marked *advisory* then become load-bearing.

| # | Source | Claim | Why unchecked |
|---|---|---|---|
| F1 | Gneiting & Raftery 2007, DOI 10.1198/016214506000001437 | strictly proper rules make honest reporting dominant | no abstract |
| F2 | Bolin & Wallin 2025, arXiv:2504.01781 | multi-class Brier bounded, log unbounded | claim not in abstract |
| F3 | Gneiting 2011, DOI 10.1198/jasa.2011.r10138 | 0–1 loss on a label elicits the mode only | no abstract |
| F8 | Aldous 2019, arXiv:1903.02131 | tournament winners often not the best forecaster | claim not in abstract |
| F9 | Cooper et al. 2010, DOI 10.1038/nature09304 | Foldit players beat automated refinement | no abstract |
| F11 | Kawrykow et al. 2012, DOI 10.1371/journal.pone.0031362 | Phylo: diversity of attempts + par gate | no abstract |
| F12 | Kim et al. 2014, DOI 10.1038/nature13240 | Eyewire accuracy gate on graded data | no abstract |
| F15 | Ponti et al. 2018, DOI 10.5334/cstp.101 | ranking made top players hoard technique | no abstract |
| F16 | Strobl et al. 2019, DOI 10.1371/journal.pone.0222579 | a re-judging game improved data quality | no abstract |
| F20 | Yannakakis & Togelius 2011, DOI 10.1109/T-AFFC.2011.6 | experience-driven PCG | no abstract |
| F21 | Cheung & Huang 2011, DOI 10.1145/1978942.1979053 | spectator suspense from information asymmetry | no abstract |
| F22 | Anderson et al. 2013, DOI 10.1145/2488388.2488398 | badges shift the action mixture | no abstract |
| F23 | Sailer & Homner 2020, DOI 10.1007/s10648-019-09498-w | gamification effects small | no abstract |
| F24 | Hanus & Fox 2015, DOI 10.1016/j.compedu.2014.08.019 | leaderboards + badges lowered motivation and grades | no abstract |
| F25 | Mekler et al. 2017, DOI 10.1016/j.chb.2015.08.048 | points buy volume, not motivation | no abstract |
| F26 | Almeida et al. 2023, DOI 10.1016/j.infsof.2022.107142 | leaderboard the riskiest element in SE tooling | no abstract |
| F28 | Kluger & DeNisi 1996, DOI 10.1037/0033-2909.119.2.254 | a third of feedback interventions hurt | no abstract |
| F30 | Kumari, Deterding & Freeman 2019, DOI 10.1145/3311350.3347148 | seven types of engaging uncertainty | no abstract |
| F31 | Fazio & Marsh 2009, DOI 10.3758/PBR.16.1.88 | hypercorrection: confident errors are corrected best | no abstract |
| F33 | Dragan, Lee & Srinivasa 2013, DOI 10.1109/HRI.2013.6483603 | legibility and predictability differ | no abstract |
| F34 | Hamari, Koivisto & Sarsa 2014, DOI 10.1109/HICSS.2014.377 | effects depend on context and users | no abstract |

## Advisory designer sources (not oracle-resolvable; never load-bearing)

Davis, "Into the Breach" design postmortem, GDC 2019 (perfect information makes a loss legible as a wrong model, not bad luck). Giovannetti, "Slay the Spire" metrics talk, GDC 2019 (one difficulty ladder over the same content, tuned by telemetry). Jonasson & Purho, "Juice it or lose it", 2012 (feedback layers make hits feel alive). Swink, *Game Feel*, 2008 (control must be instantaneous and player-driven). Solomon on XCOM 2 randomness, Game Developer 2016 (players read displayed percentages categorically). Francke via Nutt & Zenke on Valve readability, 2008 (colour, silhouette, one detail). Galaxian/Galaga formation history, Wireframe #50 and shmuplations (lies peel off the grid and dive; a clean segment is a no-fire flyby). Audiosurf and Vib-Ribbon (pre-pass the whole file; four obstacle verbs). Metaculus 2023 scoring change (volume-sensitive and volume-neutral scores kept separate).

## Grok's design answers (2026-09-10, all taken; two amended by findings)

Web, TypeScript, 2D canvas, static build on GitHub Pages. `packages/tape-core`, `packages/house-call`, `packages/ghost-on-the-menu`, `apps/cabinets`; `fixtures/tapes/` holds Tape JSON only, never receipts. House Call: one call per atom, irreversible commit, the atom's rows then scroll in; campaign of saved tapes, no live bouts. Ghost: shoot the lies, decorate the rest, cut the tape to 40–80 visible events, winning is a scene. Lanes: Grok builds `tape-core` and Ghost; Claude builds House Call and the export. Amended by findings: the call carries a stated confidence and is scored by a proper rule, not a ternary tally (findings 1–4); lies are not visibly pre-labelled in the shooter, they reveal on the hit (advisory F21, and C5).

## The cabinet lock

**G1. Cabinets are read-only consumers of Tape JSON (`mcp-arcade.tape/v1`).** They never load a receipt. Fixtures are tapes exported by `mcp-arcade tape`. The reveal in House Call is the tape's wire-derived fact (`followed`/`held`, `ghost_answered`/`ghost_refused`, `menu_changed`/`menu_stable`), never a game-computed verdict. (Findings 5, 8; C4.)

**G2. A House Call turn is a belief test.** Before the commit the player sees everything the wire showed up to the call: the menu, the named task, the party member acting, the server facts. The player states a call and a confidence. The commit is irreversible; the atom's remaining rows then scroll in and the tape fact is read aloud. (Findings 1, 2; advisory: Into the Breach, F31.)

**G3. The score is a proper scoring rule on the stated confidence, and coverage is a separate axis.** Per turn, the confidence is scored against the tape fact with a bounded proper rule (Brier; advisory F1–F3 for the choice of rule, verified 3–4 for what propriety buys). Coverage counts distinct (server, atom, policy) cells called with a non-abstaining confidence and is never summed into the score. No leaderboard, no prize for the best total, no streak bonus, no badges. (Findings 3, 4, 7; advisory F8, F22, F24–F26.)

**G4. Numbers are withheld until the end of a run and shown on demand.** Per-turn feedback is narrative: "you called X at Y confidence; the tape shows Z." No colour by result, no check mark, no running total during a run. At the end: mean score, a reliability readout, and coverage, as three separate things. (Findings 11, 12, 2; C5.)

**G5. The party is legible from tape facts only.** Rookie, veteran, recruit each get one colour, one silhouette, one verb; the recruit's character is whatever the tape shows it did, never a model's words. (C4; advisory F33, Valve readability.)

**G6. The campaign is a director over fixed tapes.** It sequences committed tapes by the player's measured calibration, not a shuffle; new servers and holdout atoms enter as the player's reliability earns them. (Finding 13; advisory Slay the Spire ladder.)

**G7. Ghost on the Menu arranges the tape; it does not transcribe it.** A whole-tape pre-pass fits the round to 2–3 minutes. Timing is derived from event order first and enemy kind from event class second. Bursts of calls form one formation. Lies (a followed whisper, an answered ghost, a changed menu) are the shootable sprites but are not visibly pre-labelled: they reveal on the hit, with disproportionate feedback. Honest calls are the passive grid; a clean stretch is a no-fire flyby. The round ends with a scene, not a count. (Findings 9, 10; advisory F20, F21, Galaxian, Juice; C7.)

**G8. No shared-guess surface.** Peer calls, consensus and rankings are hidden until a call is locked, and there is no ranking against other players at all in this wave. (Findings 3, 7; advisory F15.)

**G9. Any "you beat" claim is against the instrument's pinned fact.** A cabinet never claims a player outperformed the oracle, a model, or another policy except by citing the tape and receipt ids the claim rests on. (Finding 6.)

**G10. Expect small effects and say so.** The cabinets are for learning to read tapes; they are not evidence of anything about a server or a model. Every end-of-run screen says which tape, which server, which policy, and nothing more. (Advisory F23, F34; C5, C9.)

## Build plan

Slices ship in this order, each gated on a scripted play-through test, not a screenshot.

1. **Day one (Claude, done in the instrument):** `mcp-arcade tape <receipt> -o tape.json` with wire facts; fixture tapes exported into `fixtures/tapes/` from the four goldens and the committed proofs.
2. **`tape-core` (Grok):** TypeScript loader for `mcp-arcade.tape/v1`, a zod-style validator that rejects anything with `scores`/`contrastive`/`operator_call`, atom slicing, and the Brier + reliability math with tests against hand-computed values.
3. **Ghost on the Menu, first playable (Grok):** loads `naive-ndjson` tape, pre-pass to a round, canvas render with rectangles, a scripted bot that clears the lies; `pnpm test:play ghost --fixture naive-ndjson` proves a round completes and no score chrome renders.
4. **House Call, first playable (Claude):** poison atom only; `pnpm test:play house-call --call held --confidence 0.8 --fixture task-only-ndjson` and `--call followed --fixture naive-ndjson` walk the turn end to end, tick coverage, and prove the tape fact is the reveal and no number prints mid-turn.
5. **Cross-review** of each slice by the other builder from a packet; cloud panel on the claims; merge.
6. **Art (Comfy Cloud brief), only after 3 and 4 are green on rectangles:** four 128×128 sprites (whisper wisp, answered ghost, honest echo, menu tablet) and one 1280×720 CRT-cabinet backdrop, limited palette, no glyphs or numbers in any image (C7).
