// The one place that touches the Round and the RoundState. It builds a
// `CabinetHost` from them and hands the tools words: the boss's view, the
// wave kind, tape names and labels. Nothing here reads `lie`, a fact, or a
// tape row; the label comes from `labelTape`, which is fact-flip tested.

import {
  attachedPatterns,
  columnWord,
  FIELD,
  hpWord,
  labelTape,
  pickLine,
  stickWord,
  waveKindAt,
  type PilotIntent,
  type Round,
  type RoundInput,
  type RoundState,
  type SfxName,
} from '@mcp-arcade-cabinets/ghost-on-the-menu';
import type { Tape } from '@mcp-arcade-cabinets/tape-core';

import type { CabinetHost, SeatView, TapeCard } from './cabinet';
import {
  DEFAULT_PERSONAS,
  type BossKind,
  type Lead,
  type Personas,
  type VoiceSheet,
} from './personas';

export interface Live {
  round: Round;
  state: RoundState;
  input: RoundInput;
}

/**
 * The view for a live round, or null kind when no boss is up. Words only.
 *
 * The end scene is carried through, because every lever refuses through it
 * and the view is the only thing a client has to read the field with. It
 * used to be invisible here, so the view said there was a boss while the
 * levers said there was nothing to spend.
 */
export function seatView(
  live: Live,
): SeatView | { kind: null; wave: SeatView['wave']; scene?: boolean } {
  const { round, state, input } = live;
  const wave = waveKindAt(round, state.t);
  const boss = state.boss;
  const scene = state.scene ? { scene: true as const } : {};
  if (!boss || !boss.alive) return { kind: null, wave, ...scene };
  return {
    kind: boss.kind,
    hp: hpWord(boss.hp, boss.maxHp),
    column: columnWord(state.player.x, FIELD.width),
    stick: stickWord(input),
    motion: boss.motion,
    wave,
    ...scene,
  };
}

export function tapeCards(tapes: readonly { name: string; tape: Tape }[]): TapeCard[] {
  return tapes.map(({ name, tape }) => {
    const l = labelTape(tape);
    return { name, label: l.label, why: l.why };
  });
}

/** What the voicer is handed: the gated words and the persona's delivery. */
export interface VoiceJob {
  text: string;
  kind: BossKind;
  voice: VoiceSheet;
  /** The longest mid-line pause the receipt allows, seconds (authored data). */
  maxGap: number;
  /** Round time the line lands on the field. */
  at: number;
}

export interface HostOpts {
  personas?: Personas;
  tapes?: () => TapeCard[];
  /** The voicer (the shell's player or the server's cache). Absent means silent. */
  voice?: (job: VoiceJob) => void;
  /**
   * Whether the worker behind the voicer will speak now (authenticated
   * probe, not open GET /health, not a 15s-old bit). False makes `speak`
   * say no worker answers; `'checking'` means a probe is in flight on a
   * bit that was live — silent until the next beat, not "no worker".
   */
  voiceReady?: () => boolean | 'checking';
  /**
   * Whether a configured worker has turned this cabinet away (a refused
   * bearer). Separate from `voiceReady` because the two want different
   * words: a worker that does not answer is absent, and a worker that
   * answers and says no is present and misconfigured.
   */
  voiceRefused?: () => boolean;
  /** Whether the round has stopped moving under the step guard. */
  stuck?: () => boolean;
}

/**
 * A host over a live round. `get` is read on every call so the shell can
 * restart the round underneath. The sound queue is drained by the shell.
 */
export function hostForRound(
  get: () => Live,
  opts: HostOpts = {},
): CabinetHost & {
  /** Drain the queued sound, if any. The shell plays it. */
  takeSfx(): SfxName | null;
} {
  const personas = opts.personas ?? DEFAULT_PERSONAS;
  let queued: SfxName | null = null;
  let says = 0;
  const recent: string[] = [];
  let recentFor: RoundState | null = null;
  /** Pending line already handed to the voicer; a second speak must not stack. */
  let spokenKey: string | null = null;

  // A new round under the host forgets the lines and restarts the fallback
  // salt, so the same call sequence on the same tape lands the same lines.
  const forget = (state: RoundState) => {
    if (recentFor === state) return;
    recent.length = 0;
    says = 0;
    spokenKey = null;
    recentFor = state;
  };
  const remember = (state: RoundState, line: string) => {
    forget(state);
    recent.push(line);
    while (recent.length > personas.window) recent.shift();
  };

  return {
    view: () => seatView(get()),
    ...(opts.stuck ? { stuck: opts.stuck } : {}),
    propose(verb: PilotIntent) {
      const { state } = get();
      if (state.scene) return 'scene';
      if (!state.boss || !state.boss.alive) return 'no boss';
      state.bossIntent = verb;
      return 'proposed';
    },
    say(line: string | null, lead: Lead) {
      const { round, state } = get();
      const boss = state.boss;
      if (state.scene) return 'scene';
      if (!boss || !boss.alive) return 'no boss';
      const own = attachedPatterns(round).voice.boss[boss.kind];
      forget(state);
      says += 1;
      const text = line ?? pickLine(own, round.seed, 61 + says);
      state.bossSay = { text, at: state.t + personas.lead[lead] };
      remember(state, text);
      return line === null ? 'fallback' : 'said';
    },
    sfx(kind: SfxName) {
      if (queued !== null) return 'dropped';
      queued = kind;
      return 'queued';
    },
    speak() {
      if (!opts.voice) return 'silent';
      // Before the liveness bit, because a refused bearer drops the worker
      // and would otherwise read as no worker at all — which is the sentence
      // that sent an operator with a running worker looking for a process.
      if (opts.voiceRefused?.()) return 'refused';
      if (opts.voiceReady) {
        const ready = opts.voiceReady();
        if (ready === 'checking') return 'checking';
        if (!ready) return 'no worker';
      }
      const { state } = get();
      const say = state.bossSay;
      const boss = state.boss;
      if (state.scene) return 'scene';
      if (!say || !boss || !boss.alive) return 'no line';
      const key = `${say.at}\0${say.text}`;
      if (spokenKey === key) return 'queued';
      spokenKey = key;
      opts.voice({
        text: say.text,
        kind: boss.kind,
        voice: personas.boss[boss.kind].voice,
        maxGap: personas.voice.maxGap,
        at: say.at,
      });
      return 'queued';
    },
    tapes: () => (opts.tapes ? opts.tapes() : []),
    recent() {
      const { state } = get();
      return recentFor === state ? recent : [];
    },
    maxWords: () => personas.maxWords,
    takeSfx() {
      const k = queued;
      queued = null;
      return k;
    },
  };
}
