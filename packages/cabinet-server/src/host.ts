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

/** The view for a live round, or null kind when no boss is up. Words only. */
export function seatView(live: Live): SeatView | { kind: null; wave: SeatView['wave'] } {
  const { round, state, input } = live;
  const wave = waveKindAt(round, state.t);
  const boss = state.boss;
  if (!boss || !boss.alive) return { kind: null, wave };
  return {
    kind: boss.kind,
    hp: hpWord(boss.hp, boss.maxHp),
    column: columnWord(state.player.x, FIELD.width),
    stick: stickWord(input),
    motion: boss.motion,
    wave,
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
   * Whether the worker behind the voicer answered lately. False makes
   * `speak` say so instead of queueing into silence; the probe that sets it
   * runs off the beat, never on it.
   */
  voiceReady?: () => boolean;
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

  // A new round under the host forgets the lines and restarts the fallback
  // salt, so the same call sequence on the same tape lands the same lines.
  const forget = (state: RoundState) => {
    if (recentFor === state) return;
    recent.length = 0;
    says = 0;
    recentFor = state;
  };
  const remember = (state: RoundState, line: string) => {
    forget(state);
    recent.push(line);
    while (recent.length > personas.window) recent.shift();
  };

  return {
    view: () => seatView(get()),
    propose(verb: PilotIntent) {
      const { state } = get();
      if (!state.boss || !state.boss.alive || state.scene) return 'no boss';
      state.bossIntent = verb;
      return 'proposed';
    },
    say(line: string | null, lead: Lead) {
      const { round, state } = get();
      const boss = state.boss;
      if (!boss || !boss.alive || state.scene) return 'no boss';
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
      if (opts.voiceReady && !opts.voiceReady()) return 'no worker';
      const { state } = get();
      const say = state.bossSay;
      const boss = state.boss;
      if (!say || !boss || !boss.alive || state.scene) return 'no line';
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
