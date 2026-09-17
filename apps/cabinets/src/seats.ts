// Who may sit a chair on this machine, read once, for whoever asks.
//
// `LOCAL_SEATS` was written out twice from the identical expression — once
// privately in `ghost.ts` and once exported from `vibe-typer.ts` — with
// nothing holding the two in step, and the tag probe lived only in the
// typing cabinet's module, which imports the whole typing package plus
// `typer-cues`, `typer-cards`, `typer-tiles` and `typer-audio` at its top.
// So the menu could not ask whether a seat exists without pulling the typing
// cabinet into a Ghost-only bundle's graph, which is the one thing the
// HAS_GHOST / HAS_VIBE split and the pack gate's marker grep exist to
// prevent. Neither cabinet's mount imports this file; both read from it.

import { listPilotModels } from '@mcp-arcade-cabinets/ghost-on-the-menu';

/**
 * Pages cannot reach a daemon, so the production Pages build omits the seat
 * chrome and the fetches that go with it. The launcher is a production build
 * that *can* reach one: `VITE_LOCAL_SEATS=true` at pack time. Dev (`pnpm …
 * dev`) is never PROD, so the seats stay on there either way.
 *
 * One definition, three readers: both mounts and the menu.
 */
export const LOCAL_SEATS = import.meta.env.VITE_LOCAL_SEATS === 'true' || !import.meta.env.PROD;

/** How long the menu's single look may take before it says the authored user. */
export const SEAT_PROBE_TIMEOUT_MS = 5000;

/** A tag list entry, as far as anything here trusts it. */
function namesOf(body: unknown): string[] {
  if (typeof body !== 'object' || body === null) return [];
  const listed = (body as { models?: unknown }).models;
  if (!Array.isArray(listed)) return [];
  const names: string[] = [];
  for (const entry of listed) {
    if (typeof entry !== 'object' || entry === null) continue;
    const name = (entry as { name?: unknown }).name;
    // The one field the shell renders out of this answer — it reaches the
    // endless row as 'the user is <tag>' and the controls row beside it — so
    // it is checked rather than asserted. A daemon that answers with a shape
    // nobody expected is the same answer as no daemon: no seat.
    if (typeof name === 'string' && name !== '') names.push(name);
  }
  return names;
}

/**
 * The models a seat may sit, cloud first, as `listPilotModels` orders them.
 * Empty when the build cannot reach a daemon at all (Pages), when none is
 * listening, or when nothing it lists may be seated. This never throws: a
 * daemon that is not there, an answer that is not JSON, a look that timed out
 * and a look that was abandoned are all the same answer (G11).
 */
export async function probeSeatModels(o: {
  signal?: AbortSignal;
  timeoutMs: number;
}): Promise<string[]> {
  if (!LOCAL_SEATS) return [];
  const signals: AbortSignal[] = [AbortSignal.timeout(o.timeoutMs)];
  if (o.signal) signals.push(o.signal);
  try {
    const r = await fetch('/ollama/api/tags', { signal: AbortSignal.any(signals) });
    if (!r.ok) return [];
    return listPilotModels(namesOf(await r.json()));
  } catch {
    return [];
  }
}

/**
 * The one tag the endless seat will sit, for the menu to name before the run
 * starts, or `null` for the authored user. The menu is outside the field, so
 * a tag may be read there (G17); nothing on the field ever names it.
 *
 * The seat the route actually takes is the same order this reads: an Ollama
 * cloud tag first, then a local one. A launcher started with an API key seats
 * Claude instead, which no tag list can show — the controls row corrects the
 * name once the first answer lands.
 */
export async function probeSeatName(signal?: AbortSignal): Promise<string | null> {
  const listed = await probeSeatModels(
    signal ? { signal, timeoutMs: SEAT_PROBE_TIMEOUT_MS } : { timeoutMs: SEAT_PROBE_TIMEOUT_MS },
  );
  return listed[0] ?? null;
}
