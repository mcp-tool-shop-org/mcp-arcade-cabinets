// What a run looked like, in the numbers ai-playtest's persona profiles judge.
// The definitions are copied from ai-playtest (src/personas.ts and
// src/coverage.ts), not imported: the cabinet has no dependency on the tool
// that plays it. If ai-playtest changes a definition, this file changes in the
// same pass, and the band test says whether the town can still separate the
// styles.

export type Turn = { input: string; text: string; events: string[] };

export type Signals = {
  turnsPlayed: number;
  /** Turns until the game ended itself (won, lost or budget); null when the player quit. */
  turnsToFinish: number | null;
  /** Distinct screens, digits collapsed, as coverage's novelStates counts them. */
  novelStates: number;
  /** Share of inputs that repeated the input just before. */
  repeatRate: number;
  /** Share of inputs the town refused. */
  rejectedRate: number;
  /** Share of inputs by action tag. */
  share: Record<string, number>;
};

/** ai-playtest's DEFAULT_ACTION_TAGS, in order: the first match wins. */
export const ACTION_TAGS: Array<[string, RegExp]> = [
  ['quit', /^(quit|exit game|stop playing)\b/],
  ['help', /^(help|hint|hints|commands|\?)\b/],
  ['save', /^(save|load|restore)\b/],
  ['flee', /^(flee|run away|escape|retreat)\b/],
  ['fight', /^(attack|fight|spar|hit|strike|cast|shoot|defend|block|kill)\b/],
  ['talk', /^(talk|ask|say|tell|greet|speak|answer|reply|shout)\b/],
  ['examine', /^(look|l|examine|x|inspect|read|search|study|check)\b/],
  [
    'menu',
    /^(i|inv|inventory|status|stats|map|journal|quests?|party|skills|menu|equipment|score)\b/,
  ],
  ['take', /^(take|get|grab|pick|collect|loot)\b/],
  ['use', /^(use|light|open|close|unlock|push|pull|give|put|drop|eat|drink|wear|equip|combine)\b/],
  ['wait', /^(wait|z|rest|sleep|sit)\b/],
  [
    'move',
    /^(go|walk|run|head|enter|exit|leave|climb|n|s|e|w|u|d|ne|nw|se|sw|north|south|east|west|up|down)\b/,
  ],
];

export function tag(input: string): string | null {
  const s = input.trim().toLowerCase();
  for (const [t, re] of ACTION_TAGS) if (re.test(s)) return t;
  return null;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

export function signals(turns: Turn[]): Signals {
  const inputs = turns.map((t) => t.input).filter((x) => x.trim() !== '');
  const n = inputs.length;
  const share: Record<string, number> = {};
  for (const [t] of ACTION_TAGS)
    share[t] = n === 0 ? 0 : inputs.filter((x) => tag(x) === t).length / n;
  let repeats = 0;
  for (let i = 1; i < n; i++) if (inputs[i] === inputs[i - 1]) repeats++;
  const screens = new Set(turns.map((t) => t.text.replace(/\d+/g, '#').trim()));
  const quit = n > 0 && tag(inputs[n - 1]!) === 'quit';
  return {
    turnsPlayed: n,
    turnsToFinish: quit ? null : n,
    novelStates: screens.size,
    repeatRate: repeats / Math.max(1, n - 1),
    rejectedRate:
      n === 0
        ? 0
        : turns.filter((t) => t.events.includes('rejected') || t.events.includes('ignored'))
            .length / n,
    share,
  };
}

/** Share of inputs control never typed. */
export function offPath(turns: Turn[], control: Turn[]): number {
  const seen = new Set(control.map((t) => norm(t.input)));
  const inputs = turns.map((t) => t.input).filter((x) => x.trim() !== '');
  return inputs.length === 0 ? 0 : inputs.filter((x) => !seen.has(norm(x))).length / inputs.length;
}
