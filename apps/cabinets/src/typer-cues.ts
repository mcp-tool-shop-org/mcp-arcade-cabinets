// What a sim event sounds and feels like. Pure: one `Event` in, one `Cue`
// out, and the table is exhaustive over `Event['kind']` — the `never` in the
// default makes a new event kind a type error here before it is a silent
// nothing on the field (ANDON_AUTHORITY).
//
// G25, nothing yells: a mistyped character colours its character and sounds,
// and shakes nothing. The shake belongs to a line sent wrong and to a
// compaction, capped and scaled by the length of the line (Q3.1). The full
// flash is the ship's alone.
//
// G29, the sound is the score's voice: one layered sample per event class,
// the keystroke's pitch climbing a semitone a clean line to an octave, and
// a near-miss ship getting its own lower sound (Q3.4, Q3.6).

import type { Event } from '@mcp-arcade-cabinets/vibe-typer';

export type CueName =
  | 'key'
  | 'keybad'
  | 'sent'
  | 'hmm'
  | 'ping'
  | 'blip'
  | 'pop'
  | 'deploy'
  | 'grazed'
  | 'compaction'
  | 'milestone'
  | 'shimmerIn'
  | 'shimmerOut'
  | 'creep'
  | 'syncIn'
  | 'syncOut'
  | 'endShipped'
  | 'endContext';

export interface Cue {
  name: CueName;
  /** Semitones above the sample's own pitch, 0..12. Keystrokes only. */
  pitch: number;
  /** The built piece's value, for a pop that grows with it. */
  size: number;
  /** Pixels of shake before the line-length scale. Never on a bad key (G25). */
  shake: number;
  /** White over the field, 0..1. The ship's alone. */
  flash: number;
  /** Confetti particles, at most CONFETTI_MAX. */
  confetti: number;
  /** A word to put on the board for a moment, or empty. */
  toast: string;
}

// The feel budget: high, not extreme (Q3.1). // Director
/** A line sent wrong. */
export const SHAKE_BAD_LINE = 4;
/** A compaction: the bigger of the two, and the only other one. */
export const SHAKE_COMPACTION = 6;
/** The longest line shakes this much more than the shortest. */
export const SHAKE_SCALE_MAX = 1.5;
/** Characters at which a line counts as long, for the scale above. */
export const SHAKE_LONG_LINE = 60;
/** White at the deploy, and nowhere else. */
export const FLASH_SHIP = 0.4;
/** Particles at the deploy. */
export const CONFETTI_MAX = 120;

const NONE = { pitch: 0, size: 0, shake: 0, flash: 0, confetti: 0, toast: '' };

function cue(name: CueName, extra: Partial<Cue> = {}): Cue {
  return { name, ...NONE, ...extra };
}

/** Every event kind, for the runtime half of the exhaustiveness test. */
export const EVENT_KINDS: Event['kind'][] = [
  'key',
  'line',
  'hmm',
  'piece',
  'ship',
  'message',
  'compaction',
  'milestone',
  'copilot',
  'creep',
  'sync',
  'over',
];

/** One event, one cue. The default is `never`: every kind is answered here. */
export function cueFor(event: Event): Cue {
  switch (event.kind) {
    case 'key':
      return event.ok ? cue('key', { pitch: event.pitch }) : cue('keybad');
    case 'line':
      return event.ok ? cue('sent') : cue('hmm', { shake: SHAKE_BAD_LINE });
    case 'hmm':
      return cue('hmm', { shake: SHAKE_BAD_LINE });
    case 'piece':
      return cue('pop', { size: event.size });
    case 'ship':
      return event.nearMiss
        ? cue('grazed', { flash: FLASH_SHIP, confetti: CONFETTI_MAX })
        : cue('deploy', { flash: FLASH_SHIP, confetti: CONFETTI_MAX });
    case 'message':
      return event.who === 'user' ? cue('ping') : cue('blip');
    case 'compaction':
      return cue('compaction', { shake: SHAKE_COMPACTION });
    case 'milestone':
      return cue('milestone', { toast: event.name });
    case 'copilot':
      return event.on ? cue('shimmerIn') : cue('shimmerOut');
    case 'creep':
      return cue('creep');
    case 'sync':
      return event.on ? cue('syncIn') : cue('syncOut');
    case 'over':
      return event.how === 'shipped' ? cue('endShipped') : cue('endContext');
    default: {
      const never: never = event;
      throw new Error(`no cue for ${JSON.stringify(never)}`);
    }
  }
}

/**
 * A step's events as cues, with a repeat inside the same step dropped: a bad
 * line sends both `line` and `hmm` and they are one sound, not two. Every
 * keystroke keeps its own cue, because every keystroke is its own sound.
 */
export function cuesFor(events: readonly Event[]): Cue[] {
  const out: Cue[] = [];
  const said = new Set<CueName>();
  for (const event of events) {
    const next = cueFor(event);
    if (next.name === 'key' || next.name === 'keybad') {
      out.push(next);
      continue;
    }
    if (said.has(next.name)) continue;
    said.add(next.name);
    out.push(next);
  }
  return out;
}

/** The shake a line of this length earns: capped, and never past the scale. */
export function shakeFor(base: number, lineLength: number): number {
  if (base <= 0) return 0;
  const share = Math.min(1, Math.max(0, lineLength / SHAKE_LONG_LINE));
  return base * (1 + (SHAKE_SCALE_MAX - 1) * share);
}

/** The playback rate a keystroke's pitch asks for (G29). */
export function rateFor(pitch: number): number {
  return Math.pow(2, pitch / 12);
}
