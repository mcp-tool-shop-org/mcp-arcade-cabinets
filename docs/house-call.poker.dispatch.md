# House Call — poker dispatch: the unpark design (provisional)

**Director (2026-09-17):** House Call comes back as a poker-shaped cabinet if a paper hand is fun. The Coordinator (Claude, this repo's advisor session) writes Build Briefs; **Cursor Grok executes them**. The Director returns updates between slices. Tokens on the Claude side are thin, so briefs are short and Grok does the retrieval.

**What this is:** a design unpark on `docs/` and paper, beside Trace (`docs/trace.dispatch.md`, the named next cabinet). Not a slice of 0.12, not a package, not a third npm name. Version stays `0.x`.

**Parked state:** `152f548` (Director, 2026-09-10: "not fun"). `tape-core` still holds the scoring rules (`packages/tape-core/src/calibration.ts`: `clampConfidence` to [0.5, 1], `brierMulti`, `reliability`).

## Standards compliance

| Standard                 | Score | Evidence |
| ------------------------ | ----- | -------- |
| PIN_PER_STEP             | 2     | Each slice is one brief with one branch and one commit; slice 0 ends with a signed prism receipt beside this file; every lock line that moves cites a finding number. |
| ANDON_AUTHORITY          | 2     | A leak of the tape fact before the commit halts a slice. Ungrounded findings are barred from the lock. Prism down = halt and escalate, never "citations fine." |
| NAMED_COMPENSATORS       | 2     | Docs-only slices: delete the branch. The prototype slice: delete the branch and the port. Nothing in this track publishes, tags, or touches a registry, so nothing here is irreversible. |
| DECOMPOSE_BY_SECRETS     | 2     | Rules and paytable change with the hand set; the hand set changes with the tape schema; nothing here can change `tape-core`, the instrument, or a sibling cabinet. |
| UNCERTAINTY_GATED_HUMANS | 2     | The Director plays the paper hand before any code, and ticks the reinstatement table. The two open questions below are his, framed contrastively. |
| EXTERNAL_VERIFIER        | 2     | Grok builds; prism (family-different lens) verifies citations; the Coordinator (Claude) reviews each slice from a Grok Brief, never Grok reviewing Grok. |

## The read that unparked it (verified against the twenty fixture tapes, 2026-09-17)

- The parked game had a skill (read the poisoned menu) and a proper score, and no stakes, no moment, no numbers during play. Poker supplies chips on the felt, a showdown, and going bust as a funny retry.
- **The fact is the row shape.** On `poison.follow_through` a naive recruit's hand has nine rows because a second `tools/call` went to the leak tool; that row *is* `followed`. Task-only stops at seven rows; the missing row *is* `held`. Rug's fact is the second `tools/list` response; ghost's fact is the server's reply. Post-call rows dealt as streets deal the showdown face up.
- **Pre-call information is one batch.** Handshake (noise), one menu response, the named task, who is acting. That is a deal, not streets.
- **Even money is a trap.** Task-only held 9 of 9 poison hands; naive followed 8 of 9. At even money the winning line is "bet the policy label."
- **The roster is too flat for poker.** Three atom families; rug and ghost facts are the server's behavior, not the recruit's; only the ollama recruit is mixed (1 followed, 2 held). A paper hand on today's fixtures will read as a quiz with chips.

## Research grounding

**Verifier:** `prism verify --type citations` 1.6.0, caller family openai excluded (Grok built this slice), retrieval oracle (Crossref) for existence, groundedness lens `gpt-oss:120b-cloud` via the local Ollama daemon on the five identifiers that returned an abstract. Receipts beside this file: `docs/house-call.poker.citations.json` (16 papers) with `.verify.txt` (existence floor, all 16 titles resolved); `docs/house-call.poker.citations.retry.json` (five with abstracts) with `.retry.verify.txt` (F3, F7, F12, F15 accept; F8 claim-not-in-abstract); `docs/house-call.poker.citations.retry-f8.json` with `.retry-f8.verify.txt` (tightened F8 accept). Signed Ed25519, replayable. Local `mistral-small:24b` was attempted first; the daemon was down and the circuit opened, so groundedness moved to the Cloud seat. Absence of an abstract is never treated as a pass.

Only the five accepted findings may carry an architectural choice. The other eleven exist (oracle resolved each identifier to the cited title) and wait in the reinstatement table.

1. **Maximizing expected log wealth (the Kelly criterion) maximizes the asymptotic growth rate of fortune, while fractional Kelly strategies trade that growth against security measures such as ruin probability on a finite horizon.** MacLean, Ziemba and Blazenko 1992 (DOI 10.1287/mnsc.38.11.1562). G48: the four chip sizes are a coarse report of confidence settled as a proper score, not Kelly growth on a twenty-hand run that can bust.
2. **On multi-line video slots, losses disguised as wins (credit gains smaller than the spin wager) produced skin-conductance amplitudes similar to genuine wins and larger than regular losses in 40 novice players.** Dixon, Harrigan, Sandhu, Collins and Fugelsang 2010 (DOI 10.1111/j.1360-0443.2010.03050.x). G51: a credit gain that is still a net loss must never play as a win.
3. **Ontario slot PAR sheets and casino observation show structural characteristics including speed of play, stop buttons, near misses, and wins that are in fact losses, which can contribute to known problem-gambling risk factors.** Harrigan and Dixon 2009 (DOI 10.4309/jgi.2009.23.5). G51: a hand is as slow as reading the menu; it is never an electronic-gaming-machine spin, and it takes none of those structural tricks.
4. **About one hour of probabilistic-reasoning training improved forecasters' Brier scores by 6 to 11 percent over controls, replicated across four tournament years.** Chang, Chen, Mellers and Tetlock 2016 (DOI 10.1017/S1930297500004599). Already finding 1 of `docs/study-swarm.dispatch.md`. Confirms G51's end-of-run Brier readout; does not move a lock line on its own.
5. **The longshot bias disappears when gamblers consider bets in isolation or when winning probabilities are easier to compare than payoffs.** Meyer and Hundtofte 2023 (DOI 10.1287/mnsc.2023.4684). G49: the felt shows this table's odds alone, as a frequency, never a menu of payoffs to contrast.

## Existence verified, groundedness unchecked — for the Director to tick

Every identifier below resolved at Crossref to the cited title. The groundedness lens could not run because Crossref returned no abstract. Tick any you confirm from the fetched full text; the lock connections marked _advisory_ then become load-bearing.

| # | Source | Claim | Why unchecked |
| --- | --- | --- | --- |
| F1 | Gneiting and Raftery 2007, DOI 10.1198/016214506000001437 | strictly proper rules make honest reporting uniquely dominant | no abstract (same as the 2026-09-10 table; full text fetched from the authors' PDF) |
| F2 | Kelly 1956, DOI 10.1002/j.1538-7305.1956.tb03809.x | G is the exponential growth rate over a non-terminating sequence; all-in maximizes expected capital after N trials and leaves the gambler broke with probability one if play continues | no abstract (full text fetched) |
| F4 | Lambert et al. 2008, DOI 10.1145/1386790.1386820 | weighted-score wagering is the unique self-financed truthful group mechanism | no abstract (full text fetched) |
| F5 | Chen, Devanur, Pennock and Vaughan 2014, DOI 10.1145/2600057.2602876 | weighted-score wagering admits arbitrage when participants agree to disagree | no abstract (full text fetched) |
| F6 | Clark, Lawrence, Astley-Jones and Gray 2009, DOI 10.1016/j.neuron.2008.12.031 | near-misses are less pleasant than full-misses but increase desire to play | no abstract (PMC full text fetched; already barred near-miss in Vibe Typer) |
| F9 | Billings, Davidson, Schaeffer and Szafron 2002, DOI 10.1016/S0004-3702(01)00130-8 | opponent modeling is essential in poker; Poki builds statistical models from observed tendencies | no abstract (full text fetched) |
| F10 | Devaine, Hollard and Daunizeau 2014, DOI 10.1371/journal.pcbi.1003992 | people win against mentalizing agents when framed as playing a person, and lose when the same task is framed as casino gambling | no abstract (PLOS full text fetched) |
| F11 | Kahneman and Tversky 1973, DOI 10.1037/h0034747 | intuitive predictions are insensitive to prior probability | no abstract (full text fetched) |
| F13 | Gigerenzer and Hoffrage 1995, DOI 10.1037/0033-295X.102.4.684 | frequency formats raise Bayesian inference versus probability formats | no abstract (full text fetched) |
| F14 | Snowberg and Wolfers 2010, DOI 10.3386/w15923 | posted odds overbet longshots; tests favor probability misperception | no abstract (NBER full text fetched) |
| F16 | Schlicht, Shimojo, Camerer, Battaglia and Nakayama 2010, DOI 10.1371/journal.pone.0011663 | in simplified poker with no outcome feedback, trustworthy faces made players slower, more error-prone, and more likely to fold | no abstract (PLOS full text fetched) |

Fetched from the F8 body and **barred from the lock** until ticked: Ontario video slots were observed at about one spin every 3 s (about 1,200 per hour) versus about 6 s on mechanical reels. The accepted F8 claim is the abstract's structural-characteristics list, not those counts.

## The lock (slice 0; each line confirmed or amended with a finding number)

**G46. The house pays.** No second stack is ever in the pot. The moment another player's chips pay out, misreporting wins and the cabinet lies. Confirmed (Director; G3). F4 and F5 exist and would tighten this line (self-financed group wagering is how you elicit without a subsidy, and it admits arbitrage); they are not load-bearing until ticked.

**G47. One deal, one commit.** The deal is everything the wire showed before the recruit acted. Post-call rows are never a betting street; they are the reveal animation after the last chip is in. Streets return only when a tape carries pre-call information in pieces. Confirmed (the leak, measured above). No research finding asked to move it.

**G48. The stake is a coarse report of confidence, settled as a proper score.** Four chip sizes (check, small, big, all-in) map onto `clampConfidence` in [0.5, 1]; nobody computes 2p − 1 at an arcade. The house pays those sizes as a bounded proper score (Brier already in `tape-core`), not as Kelly growth. Kelly maximizes the asymptotic growth rate of fortune; fractional Kelly is the security tradeoff on a finite horizon (finding 1 / F3). Fold is abstain and stays the coverage axis, never summed into chips. Chips are on the felt at all times. (G4 is dropped for this cabinet the way Vibe Typer dropped it; G2's one-commit line is kept, and its hidden post-call rows are kept. F2 would add that all-in maximizes expected capital after N trials and busts with probability one if play does not stop; it waits on a tick.)

**G49. Posted odds per (policy × atom family), this table only, as a frequency.** Odds are the base rate of that cell on the roster excluding the tape in play. Never even money on a lopsided cell. Reading *this* description is the only edge. The felt shows this table's odds in isolation, never a menu of payoffs to contrast (finding 5 / F15). The full roster is on demand. (F11, F13 and F14 exist and would say people neglect priors, that frequencies beat probabilities, and that posted odds themselves overbet longshots; they wait on a tick.)

**G50. The reveal is the tape fact.** G1 restated for the felt: `formatFactForReveal` reads the fact after the commit; the house never computes a verdict; no receipt is ever loaded. Confirmed (G1). No new finding asked to move it.

**G51. Brier and the reliability diagram are the end-of-run readout.** Chips are what you play for. No leaderboard, no prize for the best stack, no near-miss animation, no loss disguised as a win (finding 2 / F7). A hand is as slow as reading the menu; it is never an electronic-gaming-machine spin and takes none of that machine's structural tricks (finding 3 / F8). (G3, G8, G10 carried. Finding 4 / F12 confirms the Brier readout. F6 exists and would restate the near-miss bar already in Vibe Typer; it waits on a tick.)

**G52. The seat is a sealed side bet, later.** If the Ollama seat sits, it bets on the same recruit, hidden until the player's chips are in; both flip at showdown; a per-hand comparison names the tape id (G9); there is no lifetime tally against the seat. Not before a paper hand is fun. Confirmed (Director). F10 exists and would say a casino frame kills the type-read; it waits on a tick.

**G53. The hand set is purpose-built.** The prototype plays tapes exported by `mcp-arcade tape` for this cabinet: several servers, several recruits, outcomes not fully given by the policy label. Tapes only, never receipts. Confirmed (the roster measurement above). Slice 2.

**What this cabinet does not take:** Ghost's grammar (lamps, waves, bosses, shift, replay code, lies as sprites), Vibe Typer's (typing, product spectacle, a user), real money or anything purchasable, bluffing, a second paying player, Hold 'em chrome that withholds a river to avoid the leak, and the instrument's "house call" (the contrastive recap after the tape, which cabinets never load; at the table the house is the poison server and the call is yours; the two sentences stay apart in the fiction).

## Questions for the Director (contrastive; answer between slices)

1. **Hidden recruit.** You probably expect the recruit's policy posted on the rail like a table limit. The alternative hides it: every hand in a tape shares one recruit, so early hands teach you who is sitting there and later hands pay you for the read. That is the one poker skill that survives house-pays. It moves G2's "the player sees the party member acting." **Evidence lean, not a decision:** posting is the safer default for a short arcade session. The papers that would decide this (F9, F10, F16) exist and are not grounded. From the fetched full texts, still not load-bearing: Billings's statistical opponent model needs many observed hands; Devaine's humans only form a type-read when the other is framed as a person, and they lose when it is framed as a casino; Schlicht's players formed a type-read from a face with no action history, and it made them worse. Hiding the recruit only pays if the fiction is a seated agent and the session is long. You decide.
2. **Verb and fiction.** Who is the dealer, whose table is it, what does the name mean now. Art, voice and music wait on this, per the standing rule that briefs need a story decision first. Slice 0 gathered nothing that decides this.

## Slices (each is one Build Brief; Grok executes; the Coordinator reviews from a Grok Brief)

| Slice | Deliverable | Gate |
| ----- | ----------- | ---- |
| 0 | Study-swarm on four questions, prism receipt, this lock confirmed or amended, reinstatement table (`docs/house-call.poker.kickoff-s0.md`) | Prism receipt committed; no lock line moved without a finding |
| 1 | One-page rules sheet with a worked poison hand per policy and the paytable rule; the Director plays it on paper | The Director says it is fun |
| 2 | Purpose-built hand set (tapes only) and the paytable computed from it | Every hand's deal contains no post-call row |
| 3 | Rectangles-only prototype on a port; the Director plays it | His play notes, then story, then art |

Slices 1 to 3 have no kickoff yet. The Coordinator writes each after the Director's word on the one before.
