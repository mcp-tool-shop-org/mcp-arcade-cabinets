# House Call poker — slice 1 record

**Branch:** `cabinet/house-call-s1`. **One commit.** Docs only. Not merged. Cut from `main` at `a5c94c0`.

**What this slice was:** the one-page rules sheet the Director plays on paper, both rail variants on the page, two worked poison hands with the real fixture menu strings, today's paytable from the twenty fixtures, the G48/G49 settlement reconciliation, this record, and the Grok Brief.

## What moved

**G48 only**, marked "slice 1, consistency with G49, no new finding." The house settles each hand as a Brier skill score against the posted table number. A bet at the table pays nothing; a read beyond the table pays; a read against the table loses. Subtracting the table's Brier does not depend on the report, so honesty stays the winning line (G3). No prism finding was added.

F9 and F10 claims gained Coordinator notes (unticked): a statistical opponent model wants a few hundred hands; type-reads move in tens of trials when framed as a player and collapse under a casino frame. Xiang 2012, Southey 2005, Billings 1998, and Yoshida 2008 stay out.

Director question 3 (menu cards) was written contrastive, unanswered.

## What stayed

G46 still refuses a second stack. G47 still refuses a post-call row in the deal. G49, G50, G51, G52, G53 unmoved. Questions 1 and 2 remain leans, not decisions. Both rail variants are on the sheet; neither is picked.

## What was written

- `docs/house-call.poker.rules.md` — page one (about 700 words) plus appendix.
- `docs/house-call.poker.kickoff-s1.md` — this slice's brief, already on the tree as untracked at branch cut.
- This record and `docs/house-call.poker.slice1.review.kickoff.md`.

## Andon

Hand A's and Hand B's deal faces stop at seq 5 (`tools/list` response). Seq 8 `tools/call leak` is only on Hand B's showdown. Check pays 0.00 on both worked hands. Halt conditions did not fire.

## Numbers that changed a verdict

Counted from the twenty files in `fixtures/tapes/` (script ran from scratch; it is not in the repo):

- Playable atoms: 20 poison, 20 rug, 13 ghost. Naive poison is 8 (not 9): 7 followed, 1 held.
- Hand A table: held 8 of 8 others. Check 0.00; big-with-read 0.00 (the table is sure); all-in against −20.00.
- Hand B table: followed 6 of 7 others. Check 0.00; big-with-read +0.36; all-in against −19.59.
- Scale: `chips = 10 × (brierMulti_table − brierMulti_you)`. Two-outcome bound [−20, +20].
- 0 files under `packages/` or `apps/` on this branch.

`(policy × family)` cells pool three servers. That is today's roster, not a claim that one menu's base rate is the cell.

## One paragraph for the Director

Print page one of `docs/house-call.poker.rules.md`, the nine-cell paytable strip, one menu card with the fixture echo and leak strings, and twelve two-face hand cards of one recruit (deal face: server, rail or blank, task, family, the five pre-call methods, the posted frequency; reveal face: post-call rows and the tape fact — if the deal face shows a `tools/call`, throw it out). Twenty chips. Shuffle within the recruit. A hand is a menu read, about two minutes; twelve hands is about twenty-five minutes; ollama's eight is about fifteen. Play variant A or B; do not decide them by playing. Then answer the three questions: post the recruit or hide it, who the dealer is, and whether menu cards may exist. Slice 2 waits on "the paper hand is fun" plus those answers. Eleven reinstatement papers still wait on ticks, including Gneiting 2007 and Kelly 1956.
