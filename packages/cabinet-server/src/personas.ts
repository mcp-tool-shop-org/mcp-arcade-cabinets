// personas.json: one sheet per boss kind (register, tics, what it may own
// about being a model) plus the say lever's timing data. Loaded with a
// schema at import; every string is FORBIDDEN-checked because every string
// reaches the say prompt. A bad file halts the server at load.

import personasJson from '../personas.json';

import { FORBIDDEN, SAY_MAX_WORDS } from './gate';

export type BossKind = 'whisperer' | 'menu' | 'doorman';
export type Lead = 'short' | 'beat' | 'long';
export const LEADS = ['short', 'beat', 'long'] as const;
const KINDS: readonly BossKind[] = ['whisperer', 'menu', 'doorman'];

export interface Persona {
  register: string;
  tics: string[];
  owns: string[];
}

export interface Personas {
  /** Seconds from the call to the line landing, per lead word. */
  lead: Record<Lead, number>;
  /** Lines remembered for the no-repeat window. */
  window: number;
  /** Word cap; never above the gate's own. */
  maxWords: number;
  /** Seconds between unprompted lines while a boss is up. */
  cadence: number;
  boss: Record<BossKind, Persona>;
}

function fail(key: string): never {
  throw new Error(`personas.json: ${key}`);
}

function rec(v: unknown, key: string): Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) fail(key);
  return v as Record<string, unknown>;
}

function num(v: unknown, key: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(key);
  return v;
}

function line(v: unknown, key: string): string {
  if (typeof v !== 'string' || v.trim() === '' || FORBIDDEN.test(v)) fail(key);
  return v;
}

function lines(v: unknown, key: string): string[] {
  if (!Array.isArray(v) || v.length === 0) fail(key);
  return v.map((x, i) => line(x, `${key}.${i}`));
}

export function loadPersonas(raw: unknown): Personas {
  const obj = rec(raw, 'root');
  const leadRaw = rec(obj.lead, 'lead');
  const lead = {} as Record<Lead, number>;
  for (const k of LEADS) {
    const n = num(leadRaw[k], `lead.${k}`);
    if (!(n > 0)) fail(`lead.${k}`);
    lead[k] = n;
  }
  if (!(lead.short < lead.beat && lead.beat < lead.long)) fail('lead');
  const window = num(obj.window, 'window');
  if (!Number.isInteger(window) || window < 1) fail('window');
  const maxWords = num(obj.maxWords, 'maxWords');
  if (!Number.isInteger(maxWords) || maxWords < 1 || maxWords > SAY_MAX_WORDS) fail('maxWords');
  const cadence = num(obj.cadence, 'cadence');
  if (!(cadence > 0)) fail('cadence');
  const bossRaw = rec(obj.boss, 'boss');
  const boss = {} as Record<BossKind, Persona>;
  for (const kind of KINDS) {
    const p = rec(bossRaw[kind], `boss.${kind}`);
    boss[kind] = {
      register: line(p.register, `boss.${kind}.register`),
      tics: lines(p.tics, `boss.${kind}.tics`),
      owns: lines(p.owns, `boss.${kind}.owns`),
    };
  }
  return { lead, window, maxWords, cadence, boss };
}

export const DEFAULT_PERSONAS: Personas = loadPersonas(personasJson);
