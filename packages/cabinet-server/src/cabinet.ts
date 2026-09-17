// The capability boundary (G12). A cabinet is the six tools over a
// `CabinetHost`, and the host is the only thing the tools can reach: words
// about the field, a place to put a verb, a line, or a sound, and the tape
// list by name and label. There is no method on the host that returns a
// fact, a lie flag, a count, a score, a verdict, or a tape row, so no tool
// can, by construction. The sim disposes: every call is a proposal (G11).

import type { PilotIntent, SfxName, WaveKind } from '@mcp-arcade-cabinets/ghost-on-the-menu';

import { enumOf, toolDef, TOOL_NAMES, type ToolName } from './contract';
import { gateLine, type GateReason } from './gate';
// `guardStep` is right to keep the server listed, but a round that faults on
// every tick is frozen, and the tools went on promising beats that would
// never come. The words live in that leaf so both cabinets say them alike.
import { STUCK_ANSWER, STUCK_VIEW_LINE } from './step-guard';
import { NO_LEVER } from './tool-names';
import type { BossKind, Lead } from './personas';

/** Whether a line is waiting for `speak`. A word, like everything else here. */
export type LineWord = 'waiting' | 'none';

/**
 * The rows a view may carry beyond the field itself. All optional, so a view
 * built by hand (a test, a prompt fixture) need not carry any of them, and
 * both shapes of the view carry the same ones.
 */
export interface ViewNotes {
  /**
   * The round is at its end scene.
   *
   * The view and the levers used to disagree here. `view` reported a boss
   * whenever one was alive and never looked at the scene, while `propose`,
   * `say` and `speak` all refuse through it — so a client read a boss, its
   * next three calls were all turned away as though the field were empty,
   * and not one of the six answers named what it was waiting on. Silence was
   * ambiguous, and the ambiguity was two tools contradicting each other.
   */
  scene?: boolean;
  /**
   * Whether a line is waiting to be spoken. A client that means to `speak`
   * had to call it and read 'no line' to find out, which is the shooter's
   * half of the gap the typing cabinet has on its reaction slot: the two
   * cabinets gain the shape together, so a client can do the same thing on
   * both.
   */
  line?: LineWord;
  /**
   * The round was replaced under the client since it last read the view.
   * Fresh once and then gone, the way the typing cabinet's own line is.
   */
  rolled?: boolean;
}

/** The boss's view: the same fact-blind words the shell sends, plus the wave kind. */
export interface SeatView extends ViewNotes {
  kind: BossKind;
  hp: 'high' | 'mid' | 'low';
  column: 'left' | 'center' | 'right';
  stick: 'still' | 'left' | 'right';
  motion: string;
  wave: WaveKind;
}

/** The field with no boss on it, and the same notes a full view may carry. */
export type FieldView = SeatView | ({ kind: null; wave: WaveKind } & ViewNotes);

/** Where a card on the menu came from: the baked menu, or the operator's own. */
export type TapeSource = 'baked' | 'operator';

export interface TapeCard {
  name: string;
  label: string;
  why: string;
  /**
   * Where this card came from. The overlay is the one thing the Catalog
   * listing invites an operator to configure, and nothing a client or an
   * operator could read said whether it had landed: an unreadable mount and
   * a mount holding no tapes both merge as nothing and leave exactly the
   * baked menu. Optional, so a card built by hand need not carry it.
   */
  from?: TapeSource;
  /**
   * Whether this is the card the round is playing. The fixture is resolved
   * where the menu is built, and a client was shown a menu it could not find
   * its own position in.
   */
  playing?: boolean;
}

export interface CabinetHost {
  /** Words only. Null kind when no boss is on the field. */
  view(): FieldView;
  /** Leave a verb for the sim to spend at the boss's next beat. */
  propose(verb: PilotIntent): 'proposed' | 'no boss' | 'scene';
  /** Land a gate-passed line, or the seed's own line when `line` is null. */
  say(line: string | null, lead: Lead): 'said' | 'fallback' | 'no boss' | 'scene';
  /** Queue one sound for the shell to play. */
  sfx(kind: SfxName): 'queued' | 'dropped';
  /**
   * Voice the pending line (G15). The host hands it to the voicer, which
   * speaks it one beat ahead and receipts it; `silent` when no voice is on,
   * `no worker` when one is configured but does not answer, `refused` when
   * one answers and turns this cabinet away, `checking` when a probe is in
   * flight on a bit that was live (G18: silent, and says so, without waiting
   * on the beat).
   *
   * `refused` is its own answer because 'no worker' was a false sentence for
   * it: the operator set the token, the worker is running and answering, and
   * being told nothing is there sends them to look for a process that is up.
   */
  speak(): 'queued' | 'no line' | 'scene' | 'silent' | 'no worker' | 'refused' | 'checking';
  tapes(): TapeCard[];
  /** The round's recent lines, for the no-repeat window. */
  recent(): readonly string[];
  /** Words the gate may cap below its own twelve. */
  maxWords(): number;
  /**
   * Whether the round has stopped moving under the step guard. Optional: a
   * host with no sim behind it (a test, the shell) never stalls.
   */
  stuck?(): boolean;
}

export interface ToolResult {
  [key: string]: unknown;
  content: { type: 'text'; text: string }[];
  isError?: boolean;
}

export interface CallRecord {
  /** `no such lever` for a name off the closed list; the raw name is never kept. */
  name: ToolName | typeof NO_LEVER;
  ok: boolean;
  /** For `say`: why the gate refused, or 'ok'. */
  gate?: GateReason | 'ok' | typeof NO_LEVER;
}

export interface Cabinet {
  call(name: string, args: unknown): ToolResult;
  /** Every call made, in order. Words only. */
  readonly log: readonly CallRecord[];
}

function text(t: string, isError = false): ToolResult {
  return isError
    ? { content: [{ type: 'text', text: t }], isError: true }
    : { content: [{ type: 'text', text: t }] };
}

/**
 * MCP words for a gate drop. Names the rule, never the raw token or the
 * matched word.
 *
 * `forbidden` used to read 'the line used a closed word', and nothing a
 * client can read said which words were closed or what they had in common.
 * The contract cannot say either: `loadTool` refuses any description
 * carrying one of those words, so listing the class in `say`'s own
 * description is structurally impossible. That leaves this refusal as the
 * only surface the rule can travel on, and 'closed' was a label rather than
 * a rule — a seat writing in register met it, learned nothing, retried the
 * same shape and fell to the scripted line every time. It now names the
 * class and the shape to write instead, and still leaks no needle.
 *
 * `overlong` used to read 'too long', which a client could not tell from the
 * twelve-word bound; it names its own bound now.
 */
export const GATE_FIX: Record<GateReason, string> = {
  empty: 'empty line',
  long: 'more than twelve words',
  overlong: 'longer than one line of text',
  sentences: 'more than one sentence',
  digit: 'a digit is not allowed',
  character: 'a character off this keyboard',
  forbidden: 'the line said something about how the game is going; say it in character instead',
  name: 'that names a tool, model, or seat',
  repeat: 'that line was just said',
};

function argOf(args: unknown, key: string): unknown {
  if (typeof args !== 'object' || args === null) return undefined;
  return (args as Record<string, unknown>)[key];
}

/** The `view` line for a round at its end scene. Word-only, like every other line. */
export const SCENE_VIEW_LINE = 'round the round is at its end; a new one starts in a moment';

/** What every lever answers at the end scene. Names what the client is waiting on. */
export const SCENE_ANSWERS = {
  fire: 'the round is at its end scene; nothing to spend',
  say: 'the round is at its end scene; nothing said',
  speak: 'the round is at its end scene; the line waits',
} as const;

/**
 * What the view says about the line waiting for `speak`. The typing cabinet
 * says whether its own write levers have room in the same `key value`
 * grammar, beside its other ordinary rows; this is the shooter's twin, and
 * it sits with the ordinary rows for the same reason.
 */
export const LINE_VIEW_LINES = {
  waiting: 'line a line is waiting to be spoken',
  none: 'line no line is waiting',
} as const;

/**
 * The `view` line for a round that was replaced under the client.
 *
 * The typing cabinet's is `run a new run just started; anything you sent
 * before is gone`, and this says the same event in the same words in the
 * same place, because the whole value of the parity is that a client can do
 * the same thing on both.
 */
export const ROLLED_VIEW_LINE = 'round a new round just started; anything you sent before is gone';

/** Render the view as the same lines the pilot prompt carries. Never a digit. */
export function viewLines(v: FieldView): string {
  // The exceptional rows last, where the typing cabinet puts its own, so a
  // client that reads positionally can do the same thing on both.
  const last = [
    ...(v.scene === true ? [SCENE_VIEW_LINE] : []),
    ...(v.rolled === true ? [ROLLED_VIEW_LINE] : []),
  ];
  const line = v.line === undefined ? [] : [LINE_VIEW_LINES[v.line]];
  if (v.kind === null) {
    return [`wave ${v.wave}`, 'no boss on the field', ...line, ...last].join('\n');
  }
  return [
    `wave ${v.wave}`,
    `kind ${v.kind}`,
    `health ${v.hp}`,
    `ship ${v.column}`,
    `stick ${v.stick}`,
    `motion ${v.motion}`,
    ...line,
    ...last,
  ].join('\n');
}

/**
 * The two marks a card may carry, as words. Never a count and never a path:
 * a client reads which cards the operator added and which card the round is
 * playing, and nothing about where either of them lives.
 */
export const TAPE_MARKS = {
  baked: 'Baked into the cabinet.',
  operator: 'Added by the operator.',
  playing: 'This is the tape the round is playing.',
} as const;

/** One card, as the `tapes` answer prints it. */
export function tapeLine(card: TapeCard): string {
  const marks = [
    ...(card.from === undefined ? [] : [TAPE_MARKS[card.from]]),
    ...(card.playing === true ? [TAPE_MARKS.playing] : []),
  ];
  return [`${card.name}: ${card.label}. ${card.why}`, ...marks].join(' ');
}

export function createCabinet(host: CabinetHost): Cabinet {
  const log: CallRecord[] = [];
  const stuck = () => host.stuck?.() === true;
  const verbs = enumOf('fire', 'verb');
  const leads = enumOf('say', 'lead');
  const sounds = enumOf('sfx', 'kind');
  const maxText = toolDef('say').inputSchema.properties.text;
  const textCap = maxText && 'maxLength' in maxText ? maxText.maxLength : 160;

  function fire(args: unknown): ToolResult {
    const verb = argOf(args, 'verb');
    if (typeof verb !== 'string' || !verbs.includes(verb)) {
      log.push({ name: 'fire', ok: false });
      return text(`verb must be one of ${verbs.join(', ')}`, true);
    }
    if (stuck()) {
      log.push({ name: 'fire', ok: false });
      return text(STUCK_ANSWER);
    }
    const r = host.propose(verb as PilotIntent);
    log.push({ name: 'fire', ok: r === 'proposed' });
    return text(
      r === 'proposed'
        ? `the boss will ${verb} at its next beat`
        : r === 'scene'
          ? SCENE_ANSWERS.fire
          : 'no boss on the field; nothing to spend',
    );
  }

  function say(args: unknown): ToolResult {
    const lead = argOf(args, 'lead');
    if (typeof lead !== 'string' || !leads.includes(lead)) {
      log.push({ name: 'say', ok: false });
      return text(`lead must be one of ${leads.join(', ')}`, true);
    }
    if (stuck()) {
      log.push({ name: 'say', ok: false });
      return text(STUCK_ANSWER);
    }
    const raw = argOf(args, 'text');
    // The bound refuses; it never clips. A line shortened to fit and then
    // admitted would have the boss say something the caller did not write,
    // and the caller would read it as accepted. The stdio transport's zod
    // shape catches an over-long field for an MCP client, so what this
    // catches is an in-process caller: `pnpm sit`, a test, the shell.
    const gate = gateLine(raw, {
      recent: host.recent(),
      maxWords: host.maxWords(),
      maxChars: textCap,
    });
    const r = host.say(gate.ok ? gate.line : null, lead as Lead);
    if (r === 'scene') {
      log.push({ name: 'say', ok: false, gate: gate.ok ? 'ok' : gate.reason });
      return text(
        gate.ok
          ? SCENE_ANSWERS.say
          : `${SCENE_ANSWERS.say}, and the gate would have refused it (${GATE_FIX[gate.reason]}) anyway`,
      );
    }
    if (r === 'no boss') {
      log.push({ name: 'say', ok: false, gate: gate.ok ? 'ok' : gate.reason });
      // Both facts about the call, not one. The gate verdict is already
      // computed and already logged; a client told only about the timing
      // sends the same refused line at the next boss and is refused again,
      // spending a whole round to learn what the cabinet knew on the first
      // call.
      return text(
        gate.ok
          ? 'no boss on the field; nothing said'
          : `no boss on the field; nothing said, and the gate would have refused it (${GATE_FIX[gate.reason]}) anyway`,
      );
    }
    log.push({ name: 'say', ok: true, gate: gate.ok ? 'ok' : gate.reason });
    return text(
      gate.ok
        ? 'the boss will say it'
        : `the gate refused it (${GATE_FIX[gate.reason]}); the boss says one of its own instead`,
    );
  }

  function sfx(args: unknown): ToolResult {
    const kind = argOf(args, 'kind');
    if (typeof kind !== 'string' || !sounds.includes(kind)) {
      log.push({ name: 'sfx', ok: false });
      return text(`kind must be one of ${sounds.join(', ')}`, true);
    }
    if (stuck()) {
      log.push({ name: 'sfx', ok: false });
      return text(STUCK_ANSWER);
    }
    const r = host.sfx(kind as SfxName);
    log.push({ name: 'sfx', ok: r === 'queued' });
    return text(r === 'queued' ? `${kind} queued` : 'a sound is already queued; dropped');
  }

  function speak(): ToolResult {
    if (stuck()) {
      log.push({ name: 'speak', ok: false });
      return text(STUCK_ANSWER);
    }
    const r = host.speak();
    log.push({ name: 'speak', ok: r === 'queued' });
    return text(
      r === 'queued'
        ? 'the boss will speak its line'
        : r === 'scene'
          ? SCENE_ANSWERS.speak
          : r === 'no line'
            ? 'no line to speak; give the boss one first'
            : r === 'no worker'
              ? 'the voice is silent: no worker answers'
              : r === 'refused'
                ? 'the voice worker refused this cabinet; the boss stays quiet'
                : r === 'checking'
                  ? 'the voice is silent until the next beat; call speak again'
                  : 'the voice is silent on this cabinet',
    );
  }

  function view(): ToolResult {
    log.push({ name: 'view', ok: true });
    const lines = viewLines(host.view());
    return text(stuck() ? `${lines}\n${STUCK_VIEW_LINE}` : lines);
  }

  function tapes(): ToolResult {
    log.push({ name: 'tapes', ok: true });
    const cards = host.tapes();
    if (cards.length === 0) return text('no tapes on this cabinet');
    return text(cards.map(tapeLine).join('\n'));
  }

  // One closed list: a tools.json name with no handler here fails at
  // create time. Adding a lever needs tools.json and a handler; a name
  // only in tools.json already fails loadContract (not in TOOL_NAMES).
  const handlers: Record<ToolName, (args: unknown) => ToolResult> = {
    fire,
    say,
    speak: () => speak(),
    sfx,
    view: () => view(),
    tapes: () => tapes(),
  };
  for (const n of TOOL_NAMES) {
    if (typeof handlers[n] !== 'function') throw new Error(`tools.json: no dispatch for ${n}`);
  }

  return {
    log,
    call(name: string, args: unknown): ToolResult {
      if (!(TOOL_NAMES as readonly string[]).includes(name)) {
        // A refusal, not a throw. Every other refusal on this boundary is a
        // structured result a client can read, and this path is reachable
        // from in-process callers (the shell, `pnpm sit`, a test) that build
        // the name from a string. The create-time handler check above stays
        // the real andon for a name in the contract with no dispatch.
        log.push({ name: NO_LEVER, ok: false, gate: NO_LEVER });
        return text('no such lever on this cabinet', true);
      }
      return handlers[name as ToolName](args);
    },
  };
}
