# Grok Brief — House Call poker, slice 0

**Standing rule:** every slice writes this file so the Coordinator (Claude) reviews the receipt without re-deriving it. Grok built this slice; Grok does not review Grok.

A slice without this file is not ready for review.

---

## Header

- **Slice:** 0
- **Branch:** `cabinet/house-call-s0`
- **Merge base:** `c90b64f` (`main` at branch cut)
- **Commit to review:** the single commit on this branch
- **Packet:** `git diff c90b64f HEAD -- docs/house-call.poker.dispatch.md docs/house-call.poker.kickoff-s0.md docs/house-call.poker.slice0.md docs/house-call.poker.slice0.review.kickoff.md docs/house-call.poker.citations.json docs/house-call.poker.citations.verify.txt docs/house-call.poker.citations.retry.json docs/house-call.poker.citations.retry.verify.txt docs/house-call.poker.citations.retry-f8.json docs/house-call.poker.citations.retry-f8.verify.txt`
- **Lock in force:** G1, G3, G8, G9, G10 of `docs/study-swarm.dispatch.md` and G46–G53 of `docs/house-call.poker.dispatch.md`
- **Playable?** not this slice
- **Identity scan:** clean (`python %USERPROFILE%\.grok\bin\identity-scan.py .` from the repo cwd, RESULT CLEAN)

---

## Prompt (paste this block to start the Coordinator review)

```
You are the Coordinator (Claude) reviewing Grok's House Call poker slice 0. You review this slice. You do not rebuild it, you do not re-derive the lock, you do not start slice 1, and you do not tag.

Repo: E:/AI/mcp-arcade-cabinets. cd there first.

Read before the diff, in order:
- docs/house-call.poker.dispatch.md (G46–G53, the reinstatement table, the two Director questions)
- docs/house-call.poker.kickoff-s0.md (this slice's brief)
- docs/house-call.poker.slice0.md (the builder's record)
- this brief
- the prism receipts named in the packet

The lock, not negotiable: G1, G3, G8, G9, G10, G46–G53. Docs only. No package. Beside Trace, not instead of it.

Diff: git diff c90b64f HEAD -- docs/house-call.poker.dispatch.md docs/house-call.poker.kickoff-s0.md docs/house-call.poker.slice0.md docs/house-call.poker.slice0.review.kickoff.md docs/house-call.poker.citations.json docs/house-call.poker.citations.verify.txt docs/house-call.poker.citations.retry.json docs/house-call.poker.citations.retry.verify.txt docs/house-call.poker.citations.retry-f8.json docs/house-call.poker.citations.retry-f8.verify.txt

Questions you answer, each with a file:line and a verdict (hold / change / halt):

1. Did any lock line move without a prism-accepted finding number?
2. Did any reinstatement-table paper (no Crossref abstract) carry architecture?
3. Did G46 still refuse a second stack in the pot, and did G47 still refuse a post-call row in the deal?
4. Did the two Director questions stay unanswered (evidence lean only, no decision)?
5. Anything in this diff that changed Ghost, Vibe Typer, tape-core, a tape, packages/, or apps/. Expect nothing; confirm it.
6. Anything this cabinet took that the dispatch says it does not take (Ghost grammar, Vibe grammar, real money, bluffing, Hold 'em chrome that withholds a river, the instrument's contrastive recap). Expect nothing; confirm it.

What you may change: docs on this branch only, and only to fix a halt you found. Do not start slice 1. Do not merge until the Director has seen the reinstatement table.

Report, as a review note to the Director: the verdicts with file:line, what you want Grok to change if anything, and one paragraph. Numbers only where they change a verdict.
```

---

## Packet

```
git diff c90b64f HEAD -- docs/house-call.poker.dispatch.md docs/house-call.poker.kickoff-s0.md docs/house-call.poker.slice0.md docs/house-call.poker.slice0.review.kickoff.md docs/house-call.poker.citations.json docs/house-call.poker.citations.verify.txt docs/house-call.poker.citations.retry.json docs/house-call.poker.citations.retry.verify.txt docs/house-call.poker.citations.retry-f8.json docs/house-call.poker.citations.retry-f8.verify.txt
```

Do not point the Coordinator at a moved `main`. Do not point the Coordinator at the whole repo.

---

## Questions

Each question is answerable with a file:line and hold / change / halt. At least one is a lock check. At least one is "what this cabinet does not take."

1. Did any lock line in `docs/house-call.poker.dispatch.md` move without a prism-accepted finding (F3, F7, F8, F12, F15)?
2. Did any paper in the reinstatement table carry a lock line?
3. Did G46 still refuse a second stack, and did G47 still refuse a post-call street?
4. Are the two Director questions still contrastive leans, not decisions?
5. Anything in this diff that changed Ghost, Vibe Typer, tape-core, a tape, `packages/`, or `apps/`?
6. Anything this cabinet took that the dispatch says it does not take?

---

## Measured

- `prism verify --type citations` on 16 identifiers: existence 16/16, overall verdict `escalate` (eleven no-abstract). Receipt `docs/house-call.poker.citations.verify.txt`.
- Retry on five abstracts with `gpt-oss:120b-cloud`: F3, F7, F12, F15 accept; F8 first claim escalate. Receipt `docs/house-call.poker.citations.retry.verify.txt`.
- Tightened F8: accept. Receipt `docs/house-call.poker.citations.retry-f8.verify.txt`.
- Local `mistral-small:24b` was attempted first; Ollama was down and the circuit opened. That is why groundedness moved to the Cloud seat.
- `pnpm verify` was not run. This slice does not touch a package.
- Identity scan: RESULT CLEAN, from the repo cwd.

---

## Out of scope

- `packages/` and `apps/`, including `packages/house-call` and `tape-core`
- The rules sheet, the hand set, the prototype (slices 1 to 3)
- Seating Ollama, art, voice, music, ACE-Step
- Trace's slice 0
- Ghost, Vibe Typer, `cabinet-server`, launchers, `release.yml`, the README cabinet table, HANDOFF's owed-next list
- Publish, tag, version bump, a third npm name
