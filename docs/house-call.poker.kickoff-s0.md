# Build Brief — House Call poker, slice 0: study-swarm, then stop

Paste-ready for Cursor Grok. Read `docs/house-call.poker.dispatch.md` first (the read, G46–G53 provisional, what this cabinet does not take), then `CLAUDE.md`, then this file. **Docs only. Nothing under `packages/` or `apps/` changes in this slice.**

## Prompt (paste this block to start the Grok session)

```
You are Grok, the builder on the House Call poker unpark in mcp-arcade-cabinets. The Coordinator (Claude) writes the briefs; you execute this one and stop. You do not start slice 1, you do not touch packages/ or apps/, and you do not tag.

Repo: E:/AI/mcp-arcade-cabinets. cd there first.

Read in order: docs/house-call.poker.dispatch.md, CLAUDE.md, docs/house-call.poker.kickoff-s0.md (this brief), then docs/study-swarm.dispatch.md for the form of a research-grounding section and docs/trace.kickoff.md for how slice 0 was run on Trace.

The lock in force: G1, G3, G8, G9, G10 of docs/study-swarm.dispatch.md and G46–G53 (provisional) of the poker dispatch. Branch: cabinet/house-call-s0. One commit at the end. Do not merge.

Run the four research questions in the brief as one parallel wave if you can run agents, otherwise one after another. Retrieve, do not recall: a paper you remember but cannot fetch does not enter the dispatch. Then prism, then amend the lock in place, then the reinstatement table, then the slice record, then the Grok Brief. Gate: identity scan clean. Report as docs/house-call.poker.slice0.md, committed and pushed on the branch.
```

## Standing frame

- The lock in the dispatch is **provisional**. This slice makes each line load-bearing or amends it in place. The Director's decisions (poker shape, house pays, chips on the felt, paper before code, beside Trace and not instead of it) are not up for reversal.
- Version stays `0.x`. No package, no shell, no npm, no art, no voice, no music, no ACE-Step, no branch that touches `packages/` or `apps/`.
- Work on `docs/` only. One commit at the end (`docs: House Call poker slice 0 — study-swarm and prism`), pushed to `cabinet/house-call-s0`. The Coordinator merges after the Director has seen the reinstatement table.
- Gate: identity scan clean on the tracked tree (`python %USERPROFILE%\.grok\bin\identity-scan.py .` from the repo cwd). Prism receipt committed beside the dispatch. Never `git add .`. Git author is the org noreply.

## The four questions

One agent each. 500–600 words each. Every finding carries paper title, authors, year, DOI or arXiv id or URL, and a one-sentence finding in your own words. Six to eight well-sourced findings beat twenty gestures. The "start by retrieving" lists are starting points, not answers: fetch them, and drop any that do not say what the brief expects.

1. **Wagering as honest elicitation.** When does a house-paid bet with posted odds and a small set of discrete stake sizes keep honest belief as the winning line, and where does log-growth (Kelly) stop being the right model on a short run of about twenty hands with a bankroll that can bust? Start by retrieving: Kelly 1956; Lambert et al. 2008 on self-financed wagering mechanisms (ACM EC); Chen, Devanur, Pennock and Vaughan 2014 on removing arbitrage from wagering mechanisms; Gneiting and Raftery 2007 (F1 in the old reinstatement table; ground it this time). Evidence changes G48 and G49.
2. **Single-player poker against the house: what retains, what harms.** Casino poker (Ultimate Texas Hold 'em, Let It Ride) and video poker: which pace, payout and reveal designs keep players in a session, and which are gambling-harm patterns to bar (near-miss, losses disguised as wins, speed of play). Start by retrieving: Clark et al. 2009 on near-misses; Dixon et al. 2010 on losses disguised as wins; Harrigan and Dixon on speed of play and structural characteristics. Evidence changes G51 and the pace of a hand in slice 1.
3. **Reading a hidden agent across repeated hands.** Is inferring a hidden opponent type from a short sequence of observed actions learnable and engaging for players, and what does opponent modeling in poker say about how many hands a read takes? Start by retrieving: Billings et al. 2002 on the challenge of poker (Artificial Intelligence); Devaine et al. 2014 on theory of mind in repeated games (PLOS Computational Biology); any human study of opponent-type inference in card games. Evidence decides the Director's question 1 (hidden recruit) and whether G2's "party member visible" line moves.
4. **Posted base rates: aid or anchor.** Does showing the per-cell base rate (the paytable) improve calibration, or does it anchor the player so the read is replaced by the table? Start by retrieving: Kahneman and Tversky 1973 on base-rate neglect; Mellers, Tetlock and colleagues on base rates in forecasting training (Chang et al. 2016 is already grounded as finding 1 of the old dispatch); any study of posted odds changing bettors' stated probabilities. Evidence decides whether the paytable sits on the felt or is on demand, which is G49's second sentence.

## What you do

1. Run the four questions. Retrieval is mandatory for existence; a finding without a fetched source is advisory at most and is marked so.
2. Fill the "Research grounding" section of `docs/house-call.poker.dispatch.md`, in the form used by `docs/study-swarm.dispatch.md`: `N. **<finding>.** <Authors> <year> (<DOI/arXiv>). <what it changes in G46–G53>.`
3. `prism verify --type citations` with a family-different lens and the retrieval oracle (this rig: signing key in `~/.prism`, 30000 ms cap, local 24B lens on the GPU; the existing receipts `docs/study-swarm.citations.json` and `docs/study-swarm.citations.verify.txt` show the shape). Write `docs/house-call.poker.citations.json` and its `.verify.txt`. **HALT** on fabricated or misattributed. **HALT and escalate** to the Director if prism or the oracle is down; absence is never "citations fine."
4. Reinstatement table: every identifier that exists but could not be grounded, for the Director to tick.
5. Amend G46–G53 **in place** only where a verified finding changes the architecture; mark each amended line with the finding number. Do not add a lock line the evidence did not ask for. Do not decide the Director's two questions; gather what decides them and state which way the evidence leans, contrastively ("you probably expect X; the evidence leans Y because…").
6. Write `docs/house-call.poker.slice0.md`: what moved, what stayed, what was barred, numbers only where they changed a verdict, and one paragraph for the Director.
7. Write `docs/house-call.poker.slice0.review.kickoff.md` from `docs/trace.grok-brief.template.md` (header, packet, at least five questions, measured, out of scope) so the Coordinator reviews the receipt without re-deriving it. Then stop.

## What you do not do

- Do not create or edit anything under `packages/` or `apps/`, including `packages/house-call` and `tape-core`.
- Do not write the rules sheet, the hand set, or a prototype; those are slices 1 to 3 and each waits on the Director's word.
- Do not seat Ollama, run a play-through, generate art, voice or music, or start Trace's slice 0 from this brief.
- Do not edit Ghost, Vibe Typer, `cabinet-server`, launchers, `release.yml`, the README cabinet table, or HANDOFF's owed-next list.
- Do not publish, tag, bump the version, or reserve any npm name.

## Standards (this slice)

| Standard                 | Score | Evidence |
| ------------------------ | ----- | -------- |
| PIN_PER_STEP             | 2     | Signed prism receipt beside the dispatch; amended lock lines cite finding numbers; one branch, one commit. |
| ANDON_AUTHORITY          | 2     | Ungrounded findings barred; halt if prism cannot run; halt if any finding would put a second stack in the pot or a post-call row in the deal. |
| NAMED_COMPENSATORS       | 2     | Docs-only: delete `cabinet/house-call-s0`. Nothing irreversible in this slice. |
| DECOMPOSE_BY_SECRETS     | 2     | Docs only; no package, no sibling cabinet, no instrument. |
| UNCERTAINTY_GATED_HUMANS | 2     | Reinstatement table and the two contrastive questions are the Director's checkpoint; slice 1 waits on his word. |
| EXTERNAL_VERIFIER        | 2     | Prism with a family-different lens; then the Coordinator (Claude) reviews from the Grok Brief. Grok does not review Grok. |

## Done when

- `docs/house-call.poker.dispatch.md` has a filled "Research grounding" section and a verifier line with a real receipt path.
- G46–G53 are each confirmed or amended with finding numbers.
- The two Director questions each have an evidence lean stated contrastively, not a decision.
- `docs/house-call.poker.slice0.md` and `docs/house-call.poker.slice0.review.kickoff.md` exist.
- `docs/house-call.poker.citations.json` and `.verify.txt` are committed.
- Nothing under `packages/` or `apps/` changed on the branch.
