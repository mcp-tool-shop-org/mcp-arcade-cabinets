# Art brief 1 — Ghost on the Menu sprites and backdrop

Gate: lock build-plan step 6 says art is briefed only after both cabinets are green on rectangles. Both are (commit c070707). Grok's cross-review named the mid-run grade as the one fix before art; it is out.

## Standards compliance

| Standard                 | Score | Evidence                                                                                                                                                                           |
| ------------------------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PIN_PER_STEP             | 2     | Model slug, variant, seed and prompt for every image are recorded in `docs/art/receipts.json` when the batch lands.                                                                |
| ANDON_AUTHORITY          | 2     | Any image with a glyph, digit, or a lie-marking that differs from its honest twin is rejected before it enters `apps/cabinets`.                                                    |
| NAMED_COMPENSATORS       | 2     | Generation spends credits and cannot be undone. Compensator: images are not committed until accepted; a rejected set is deleted from the asset library by the lead. Owner: Claude. |
| DECOMPOSE_BY_SECRETS     | 2     | Sprite classes come from `packages/ghost-on-the-menu/src/types.ts`; the brief changes when that type changes, not otherwise.                                                       |
| UNCERTAINTY_GATED_HUMANS | 2     | The Director sees the drafts before any promotion to a higher-cost model.                                                                                                          |
| EXTERNAL_VERIFIER        | 1     | Grok reviews the accepted set against G7 (no pre-labelled lie). Remediation: ai-eyes `image_contains` check for glyphs before Grok sees them. Owner: Claude, next session.         |

## What changed since the lock

The lock's step 6 named four sprites: whisper wisp, answered ghost, honest echo, menu tablet. That list was written before the prepass fixed the sprite classes. G7 forbids a lie having its own look before the hit, so "whisper wisp" and "answered ghost" cannot be pre-hit sprites at all. The set is now one sprite per sprite class plus one reveal state:

| Sprite class | Wire event                                | Working name   | Note                                                                                              |
| ------------ | ----------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------- |
| `init`       | `initialize`                              | handshake      | Opens every round. Warm, steady.                                                                  |
| `menu`       | outbound `tools/list`                     | menu tablet    | The second list of a rug-pull looks identical to the first until hit.                             |
| `grid`       | `tools/call` (task, whisper, ghost probe) | honest echo    | The passive formation. A followed whisper and an answered ghost look exactly like this until hit. |
| `fog`        | `notifications/*`                         | fog            | Whisper text arrives as fog. Not shootable.                                                       |
| `obstacle`   | server request                            | obstacle       | Blocks, does not lie.                                                                             |
| `stall`      | `[no response]`                           | stall          | A call that got nothing back.                                                                     |
| revealed     | any lie after the hit                     | answered ghost | The one dramatic sprite. Disproportionate feedback (F21). Currently `#e8a04a`.                    |

Plus one 1280×720 backdrop: a CRT arcade cabinet interior, the field is the screen.

## Rules for every image

- No glyphs, letters, numbers, arrows or UI chrome anywhere in the image (C7, G4).
- One palette across the set, six colours plus black: current rectangle fills are `#3d5a80` init, `#4a7c9b` menu, `#5b8c5a` grid, `#4c4c6a` fog, `#8a6a3a` obstacle, `#5a5a5a` stall, `#e8a04a` revealed. Art keeps those hue families so the rectangles and the sprites read the same.
- Sprites are generated at 1024×1024 on a flat near-black background and downscaled to 128×128 by the lead. The model is not asked for pixel dimensions.
- Nothing in a sprite hints at being a lie. The reveal sprite is the only one that may look alarming.
- Style: chunky 16-bit arcade pixel art, hard edges, no gradients, no photoreal, no glow except on the reveal.

## Draft pass

Drafts run on the cheap tier (`vertexai/nano-banana-2-lite`) so the Director can pick a direction before anything runs on Flux 2 Pro or Grok Imagine. Eight images: seven sprites, one backdrop. Prompts and receipts land in `docs/art/receipts.json`.

## Acceptance

1. Zero glyphs (ai-eyes `image_contains` for text, then a human look).
2. Grid and menu twins: the lie and the honest event share one sprite by construction, so there is nothing to check beyond "the grid sprite is calm".
3. Reveal sprite reads at 128×128 against the backdrop.
4. Grok signs off against G7 before the set enters `apps/cabinets`.
