# Review — Vibe Typer slice 3, sub-slice D batch one (the logo, the five device frames, the preview's asset layer)

**Reviewer:** Kimi K2.6 (`kimi-k2.6:cloud` through the local Ollama daemon), packet only: the lock G23–G30, the slice-3 kickoff, and the diff of `cabinet/vibe-typer-s3d1` against its base with the images and the lockfile omitted. **Date:** 2026-09-15. **Coordinator's note:** no halt. Applied on the branch before the merge: the five image listeners fire once and detach, and the logo note in the receipt and the slice doc now says plainly that the image misses the brief's one glowing key and is kept pending the Director's read. Not applied: the spelling edits inside the prompts, because those strings are the record of what was sent to the model and a receipt is not corrected after the fact; the spelling test covers the levers, the corpus and the shell, not receipts. Line numbers cite the diff, not the merged files.

## 1. The asset layer in drawPreview (five Image loads at mount, the Map, load and error, the rectangles as fallback, nothing waits on a load, frameBox untouched, unmount and leaked handlers)

`apps/cabinets/src/vibe-typer.ts:519` declares `const frames = new Map<DeviceKind, HTMLImageElement>()`.  
`:522-526` creates five `Image` elements, attaches anonymous `load` and `error` listeners, and sets `src`.  
`:747-751` draws the loaded image when present and falls back to `drawFrame(c, kind, box)` when the Map has no entry, so the first frames render immediately on rectangles.  
`:744` calls `const box = frameBox(kind)` and uses `box` for packing in both branches; the packing area is untouched.  
`:521` guards the whole block with `typeof Image !== 'undefined'`, keeping jsdom on the rectangle path.  
No cleanup is wired for unmount; the anonymous arrow listeners at `:523-524` cannot be removed and will fire after teardown if a request completes later, writing into the captured `frames` Map.

**change** — Add `{ once: true }` to both `addEventListener` calls at `:523-524` so the handlers detach after they fire; if an unmount hook exists in the mount return, also null `img.src` for any pending loads.

## 2. The receipts (the schema, the licence block reused, every generation logged including the rejected one, the spend against the approved twelve)

`docs/art/receipts.json:420` appends `vibe_typer_batch_1` as a new property on the top-level object, matching the existing schema.  
`:433` reuses Ghost's existing licence block by reference instead of restating terms.  
`:453` logs the rejected logo (job `c2da867f`, seed `7301`) with its full prompt, status, and reason.  
`:467` and following log the six accepted images.  
`:447` records the spend as "7 of 12". Every image carries model, seed, prompt, job id, and file path.

**hold**

## 3. The fit step the builder added on this side (flood-fill and uniform scale onto the ground: deterministic, recorded per image, and whether it belongs in the receipt as a transform)

The fit is described at `:442` and recorded per image in `"fit"` objects (`:480`, `:493`, `:506`, `:519`, `:532`): flood-fill from the picture centre, uniform scale until the dark interior covers `frameBox()` at 2×, concentric translation onto a `#101018` ground. It is deterministic and idempotent. It belongs in the receipt because it is a geometric transform applied to the generated output before install and determines the final pixel layout; omitting it would break reproducibility.

**hold**

## 4. The glyph check and the acceptance rule

The glyph check scores are below the 0.02 threshold (`:467` 0.000022794, `:480` 0.0001, etc.).  
The accepted logo at `:467` has two adjacent caps glowing, not one key as the brief requires; the acceptance note rationalizes the deviation ("read as a single lit spot at README width") rather than labeling it a brief non-compliance retained by Director waiver.  
British spellings appear in reader-visible surfaces, bypassing the American English gate: "colours" and "centred" / "centre-cropped" in `docs/art/receipts.json` prompts (`:455`, `:470`, `:482`, `:495`, `:508`, `:521`, `:534`) and in `docs/vibe-typer.slice3.md` (`:325`, `:335`, `:339`, `:340`).

**change** — In `docs/art/receipts.json` and `docs/vibe-typer.slice3.md`, replace every "colours" with "colors", "centred" with "centered", and "centre-cropped" with "center-cropped". Rewrite the accepted-logo note at `:467` to state explicitly that the image does not meet the brief's "one glowing key" requirement and was retained only by Director waiver.

## 5. Pages and the launcher (public/vibe copied, the bundle size, a missing folder still plays)

The five frames live under `apps/cabinets/public/vibe/frames/` and are copied whole by Vite; the slice doc notes they land in `site/public/play/vibe/frames/`.  
The added PNG weight is ~473 KB in total (`:480` 123 KB, `:493` 63 KB, `:506` 70 KB, `:519` 174 KB, `:532` 43 KB).  
If the folder is absent, the error handler at `apps/cabinets/src/vibe-typer.ts:524` deletes the kind from the Map and `:750` falls back to rectangles, so a Pages build without the assets still plays.

**hold**

## 6. Tone: the logo and the frames against the brief (amber on navy, no text, one glowing key)

The frames are dark, empty, face-on, and carry one amber accent each, matching the brief's device list (`:482-534` prompts).  
The logo is amber on navy with no text.  
It deviates on "one glowing key": the accepted logo has two adjacent caps glowing (`:467` note). The non-compliance is disclosed in the receipt and the slice doc, and the Director approved the spend.

**hold**

## 7. What the next art batches should know

Use American English in all prompts and docs ("colors", "centered") to avoid bypassing the spelling gate.  
Tighten the logo prompt to "exactly one keycap" and "no adjacent glow" to hit the brief on the first roll.  
Use `{ once: true }` for image listeners or wire unmount cleanup.  
Keep recording per-image fit transforms.  
Check that accent nodes stay outside `frameBox()` so they do not raise `box_max_luma` inside the packing area (the wires frame at `:532` has an amber node inside the left edge).

**hold**

## Summary

- Add `{ once: true }` to the five Image listeners in `vibe-typer.ts` to prevent leaked handlers after unmount.
- Fix British spellings ("colours", "centred", "centre-cropped") in `receipts.json` and `slice3.md`.
- Rewrite the accepted-logo note to state the "one glowing key" brief miss explicitly as a Director waiver.
- No halts.
