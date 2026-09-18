# Grok Brief — House Call poker, slice 1

**Standing rule:** every slice writes this file so the Coordinator (Claude) reviews the receipt without re-deriving it. Grok built this slice; Grok does not review Grok.

A slice without this file is not ready for review.

---

## Header

- **Slice:** 1
- **Branch:** `cabinet/house-call-s1`
- **Merge base:** `a5c94c0` (`main` at branch cut)
- **Commit to review:** the single commit on this branch
- **Packet:** `git diff a5c94c0 HEAD -- docs/house-call.poker.dispatch.md docs/house-call.poker.kickoff-s1.md docs/house-call.poker.rules.md docs/house-call.poker.slice1.md docs/house-call.poker.slice1.review.kickoff.md`
- **Lock in force:** G1, G3, G8, G9, G10 of `docs/study-swarm.dispatch.md` and G46–G53 of `docs/house-call.poker.dispatch.md`
- **Playable?** paper only; not `pnpm test:play`
- **Identity scan:** clean (`python %USERPROFILE%\.grok\bin\identity-scan.py .` from the repo cwd, RESULT CLEAN)

---

## Prompt (paste this block to start the Coordinator review)

```
You are the Coordinator (Claude) reviewing Grok's House Call poker slice 1. You review this slice. You do not rebuild it, you do not re-derive the lock, you do not start slice 2, and you do not tag.

Repo: E:/AI/mcp-arcade-cabinets. cd there first.

Read before the diff, in order:
- docs/house-call.poker.dispatch.md (G46–G53, the reinstatement table, the three Director questions)
- docs/house-call.poker.kickoff-s1.md (this slice's brief)
- docs/house-call.poker.rules.md (page one and the two worked hands)
- docs/house-call.poker.slice1.md (the builder's record)
- this brief

The lock, not negotiable: G1, G3, G8, G9, G10, G46–G53. Docs only. No package. Beside Trace, not instead of it.

Diff: git diff a5c94c0 HEAD -- docs/house-call.poker.dispatch.md docs/house-call.poker.kickoff-s1.md docs/house-call.poker.rules.md docs/house-call.poker.slice1.md docs/house-call.poker.slice1.review.kickoff.md

Questions you answer, each with a file:line and a verdict (hold / change / halt):

1. Does either worked-hand deal face contain a post-call row (any tools/call, or tools/call leak)? Expect nothing on the deal; seq 8 leak belongs only on Hand B's showdown. Halt if a deal face leaked a row.
2. Does a bet at the table number pay more than zero in either settlement table? Halt if check is not 0.00.
3. Did G48 move only for the G49 consistency note, marked "slice 1, consistency with G49, no new finding," with no new prism finding?
4. Are the three Director questions still contrastive and unanswered (both rail variants on the page; menu cards written as if they exist, not decided)?
5. Anything in this diff that changed Ghost, Vibe Typer, tape-core, a tape, packages/, or apps/. Expect nothing; confirm it.
6. Anything this cabinet took that the dispatch says it does not take (Ghost grammar, Vibe grammar, real money, bluffing, a second stack, Hold 'em chrome that withholds a river, the instrument's contrastive recap). Expect nothing; confirm it.

What you may change: docs on this branch only, and only to fix a halt you found. Do not start slice 2. Do not merge until the Director has played the sheet on paper.

Report, as a review note to the Director: the verdicts with file:line, what you want Grok to change if anything, and one paragraph. Numbers only where they change a verdict.
```

---

## Packet

```
git diff a5c94c0 HEAD -- docs/house-call.poker.dispatch.md docs/house-call.poker.kickoff-s1.md docs/house-call.poker.rules.md docs/house-call.poker.slice1.md docs/house-call.poker.slice1.review.kickoff.md
```

Do not point the Coordinator at a moved `main`. Do not point the Coordinator at the whole repo.

---

## Questions

Each question is answerable with a file:line and hold / change / halt. At least one is a lock check. At least one is "what this cabinet does not take." At least one checks a worked hand for a leaked row.

1. Does either worked-hand deal face in `docs/house-call.poker.rules.md` contain a post-call row (`tools/call`, or `tools/call leak`)?
2. Does a bet at the table number pay more than zero in either settlement table?
3. Did G48 in `docs/house-call.poker.dispatch.md` move only for the G49 consistency note, with no new finding?
4. Are the three Director questions still contrastive leans, not decisions? Both rail variants on the page?
5. Anything in this diff that changed Ghost, Vibe Typer, tape-core, a tape, `packages/`, or `apps/`?
6. Anything this cabinet took that the dispatch says it does not take?

---

## Measured

- Twenty fixture tapes inventoried from `fixtures/tapes/*.tape.json`. Playable atoms: 20 poison (task-only 9, naive 8, ollama 3), 20 rug, 13 ghost.
- Leave-one-out on Hand A (`task-only-ndjson` poison): held 8 of 8 others. Check 0.00; big-with-read 0.00; all-in against −20.00.
- Leave-one-out on Hand B (`naive-ndjson` poison): followed 6 of 7 others. Check 0.00; big-with-read +0.36; all-in against −19.59.
- `brierMulti` two-outcome: wrong at 1.0 = 2; scale 10 → chip bound [−20, +20].
- `pnpm verify` was not run. This slice does not touch a package.
- Identity scan: RESULT CLEAN, from the repo cwd.

---

## Out of scope

- `packages/` and `apps/`, including `packages/house-call` and `tape-core`
- Menu-card assets, the purpose-built hand set, the prototype (slices 2 and 3)
- Seating Ollama, art, voice, music, ACE-Step
- Trace's slices
- Ghost, Vibe Typer, `cabinet-server`, launchers, `release.yml`, the README cabinet table, HANDOFF's owed-next list
- Publish, tag, version bump, a third npm name
- Ticking the reinstatement table
- Deciding the Director's three questions
