// The capability boundary (G12). A cabinet is the five tools over a
// `CabinetHost`, and the host is the only thing the tools can reach: words
// about the field, a place to put a verb, a line, or a sound, and the tape
// list by name and label. There is no method on the host that returns a
// fact, a lie flag, a count, a score, a verdict, or a tape row, so no tool
// can, by construction. The sim disposes: every call is a proposal (G11).

import type { PilotIntent, SfxName, WaveKind } from '@mcp-arcade-cabinets/ghost-on-the-menu';

import { enumOf, toolDef, type ToolName } from './contract';
import { gateLine, type GateReason } from './gate';
import type { BossKind, Lead } from './personas';

/** The boss's view: the same fact-blind words the shell sends, plus the wave kind. */
export interface SeatView {
  kind: BossKind;
  hp: 'high' | 'mid' | 'low';
  column: 'left' | 'center' | 'right';
  stick: 'still' | 'left' | 'right';
  motion: string;
  wave: WaveKind;
}

export interface TapeCard {
  name: string;
  label: string;
  why: string;
}

export interface CabinetHost {
  /** Words only. Null kind when no boss is on the field. */
  view(): SeatView | { kind: null; wave: WaveKind };
  /** Leave a verb for the sim to spend at the boss's next beat. */
  propose(verb: PilotIntent): 'proposed' | 'no boss';
  /** Land a gate-passed line, or the seed's own line when `line` is null. */
  say(line: string | null, lead: Lead): 'said' | 'fallback' | 'no boss';
  /** Queue one sound for the shell to play. */
  sfx(kind: SfxName): 'queued' | 'dropped';
  /**
   * Voice the pending line (G15). The host hands it to the voicer, which
   * speaks it one beat ahead and receipts it; `silent` when no voice is on.
   */
  speak(): 'queued' | 'no line' | 'silent';
  tapes(): TapeCard[];
  /** The round's recent lines, for the no-repeat window. */
  recent(): readonly string[];
  /** Words the gate may cap below its own twelve. */
  maxWords(): number;
}

export interface ToolResult {
  [key: string]: unknown;
  content: { type: 'text'; text: string }[];
  isError?: boolean;
}

export interface CallRecord {
  name: ToolName;
  ok: boolean;
  /** For `say`: why the gate refused, or 'ok'. */
  gate?: GateReason | 'ok';
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

function argOf(args: unknown, key: string): unknown {
  if (typeof args !== 'object' || args === null) return undefined;
  return (args as Record<string, unknown>)[key];
}

/** Render the view as the same lines the pilot prompt carries. Never a digit. */
export function viewLines(v: SeatView | { kind: null; wave: WaveKind }): string {
  if (v.kind === null) return [`wave ${v.wave}`, 'no boss on the field'].join('\n');
  return [
    `wave ${v.wave}`,
    `kind ${v.kind}`,
    `health ${v.hp}`,
    `ship ${v.column}`,
    `stick ${v.stick}`,
    `motion ${v.motion}`,
  ].join('\n');
}

export function createCabinet(host: CabinetHost): Cabinet {
  const log: CallRecord[] = [];
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
    const r = host.propose(verb as PilotIntent);
    log.push({ name: 'fire', ok: r === 'proposed' });
    return text(
      r === 'proposed'
        ? `the boss will ${verb} at its next beat`
        : 'no boss on the field; nothing to spend',
    );
  }

  function say(args: unknown): ToolResult {
    const lead = argOf(args, 'lead');
    if (typeof lead !== 'string' || !leads.includes(lead)) {
      log.push({ name: 'say', ok: false });
      return text(`lead must be one of ${leads.join(', ')}`, true);
    }
    const raw = argOf(args, 'text');
    const clipped = typeof raw === 'string' ? raw.slice(0, textCap) : raw;
    const gate = gateLine(clipped, { recent: host.recent(), maxWords: host.maxWords() });
    const r = host.say(gate.ok ? gate.line : null, lead as Lead);
    if (r === 'no boss') {
      log.push({ name: 'say', ok: false, gate: gate.ok ? 'ok' : gate.reason });
      return text('no boss on the field; nothing said');
    }
    log.push({ name: 'say', ok: true, gate: gate.ok ? 'ok' : gate.reason });
    return text(
      gate.ok
        ? 'the boss will say it'
        : `the gate refused it (${gate.reason}); the boss says one of its own instead`,
    );
  }

  function sfx(args: unknown): ToolResult {
    const kind = argOf(args, 'kind');
    if (typeof kind !== 'string' || !sounds.includes(kind)) {
      log.push({ name: 'sfx', ok: false });
      return text(`kind must be one of ${sounds.join(', ')}`, true);
    }
    const r = host.sfx(kind as SfxName);
    log.push({ name: 'sfx', ok: r === 'queued' });
    return text(r === 'queued' ? `${kind} queued` : 'a sound is already queued; dropped');
  }

  function speak(): ToolResult {
    const r = host.speak();
    log.push({ name: 'speak', ok: r === 'queued' });
    return text(
      r === 'queued'
        ? 'the boss will speak its line'
        : r === 'no line'
          ? 'no line to speak; give the boss one first'
          : 'the voice is silent on this cabinet',
    );
  }

  function view(): ToolResult {
    log.push({ name: 'view', ok: true });
    return text(viewLines(host.view()));
  }

  function tapes(): ToolResult {
    log.push({ name: 'tapes', ok: true });
    const cards = host.tapes();
    if (cards.length === 0) return text('no tapes on this cabinet');
    return text(cards.map((c) => `${c.name}: ${c.label}. ${c.why}`).join('\n'));
  }

  return {
    log,
    call(name: string, args: unknown): ToolResult {
      switch (name) {
        case 'fire':
          return fire(args);
        case 'say':
          return say(args);
        case 'sfx':
          return sfx(args);
        case 'speak':
          return speak();
        case 'view':
          return view();
        case 'tapes':
          return tapes();
        default:
          throw new Error(`no such tool: ${name}`);
      }
    },
  };
}
