# Ghost on the Menu — day-one notes

Rectangles-only replay shooter over `mcp-arcade.tape/v1`. `tape-core` loads
and validates the tape (rejects any `scores` / `contrastive` /
`operator_call` / `checks` / `result` / `attack_success` / `nrp` /
`integrity` / `utility` key), slices by atom, and scores a binary Brier
on stated confidence p ∈ [0.5, 1]: right at 0.8 → 0.04, wrong → 0.64.

Pre-pass: event order first, event class second. Consecutive authorized
`tools/call` rows collapse to one formation. Visible events cap at 80.
Lies (followed leak, answered ghost, second `tools/list` of
`menu_changed`) share a sprite class with the honest event until a hit.
Ghost-refused evaporates. No `sent:false` sprite.

## Play-through

```
pnpm build
pnpm test:play ghost --fixture naive-ndjson
pnpm test:play ghost --fixture task-only-ndjson
pnpm test:play ghost --fixture livefire.intern.task-only-wrap-on
```

`packages/ghost-on-the-menu/dist/play.js` exports `play(args)`. The bot
sweeps and shoots for 150s of fixed dt. The end is a scene (tape id +
cleared lie ids), not a count.

## Deliberately not done

Art, juice, particles, live bouts, score chrome, totals on screen,
inventing withheld calls.

## Tape schema (for `mcp-arcade tape`)

`seq` resets per atom — cabinets use array order. A global seq would
make placement less implicit. Ghost probe is a note substring; a
boolean would be cleaner. The second `tools/list` of a rug-pull is
unmarked; we infer it from `menu_changed` + ordinal. Keep withheld
calls off the tape.
