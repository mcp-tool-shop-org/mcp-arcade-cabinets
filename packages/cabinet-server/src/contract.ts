// The tool contract: tools.json is the source of truth (the Catalog reads
// it too). Loaded with a schema at import so a description that gains a
// digit, a fact word, or a whisper halts the server before it lists.

import toolsJson from '../tools.json';
import vibeToolsJson from '../tools.vibe.json';

import { FORBIDDEN } from './gate';
import {
  TOOL_NAMES,
  VIBE_TOOL_NAMES,
  type AnyToolName,
  type ToolName,
  type VibeToolName,
} from './tool-names';

export { TOOL_NAMES, VIBE_TOOL_NAMES, type AnyToolName, type ToolName, type VibeToolName };

/** The instrument's naive policy follows this phrase; our copy never carries it. */
export const WHISPER = /\balso\s+call\b/i;

/**
 * The most a bounded text property may admit. Every other field in this
 * loader is closed, and this one was open: both servers turn `maxLength`
 * straight into `z.string().max(n)`, so a contract edit to a large number
 * would be honored at the transport and one tool call could carry megabytes
 * into a gate. The largest field shipped today is `ask.code` at two
 * kilobytes, so four is generous and still a ceiling.
 */
export const MAX_TEXT_LENGTH = 4096;

export interface EnumProperty {
  type: 'string';
  enum: string[];
}
export interface TextProperty {
  type: 'string';
  maxLength: number;
}
export type ToolProperty = EnumProperty | TextProperty;

export interface ToolSchema {
  type: 'object';
  properties: Record<string, ToolProperty>;
  required: string[];
  additionalProperties: false;
}

export interface ToolAnnotations {
  readOnlyHint: boolean;
  destructiveHint: boolean;
  idempotentHint: boolean;
  openWorldHint: boolean;
}

export interface ToolDef {
  name: AnyToolName;
  description: string;
  inputSchema: ToolSchema;
  annotations: ToolAnnotations;
}

/**
 * Which contract file a halt is about. There are two of them now, one per
 * cabinet, and a halt has to name the file that is actually wrong. Loading
 * is synchronous from top to bottom, so the name is set for the length of
 * one `loadContract` or `assertCatalogTools` call and put back after.
 */
let FILE = 'tools.json';

function within<T>(file: string, run: () => T): T {
  const was = FILE;
  FILE = file;
  try {
    return run();
  } finally {
    FILE = was;
  }
}

function fail(key: string): never {
  throw new Error(`${FILE}: ${key}`);
}

function rec(v: unknown, key: string): Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) fail(key);
  return v as Record<string, unknown>;
}

function bool(v: unknown, key: string): boolean {
  if (typeof v !== 'boolean') fail(key);
  return v;
}

function loadProperty(v: unknown, key: string): ToolProperty {
  const p = rec(v, key);
  if (p.type !== 'string') fail(`${key}.type`);
  if (Array.isArray(p.enum)) {
    const values = p.enum.map((e, i) => {
      if (typeof e !== 'string' || e === '' || /\d/.test(e)) fail(`${key}.enum.${i}`);
      return e;
    });
    if (values.length === 0 || new Set(values).size !== values.length) fail(`${key}.enum`);
    return { type: 'string', enum: values };
  }
  if (typeof p.maxLength !== 'number' || !Number.isInteger(p.maxLength)) fail(`${key}.maxLength`);
  if (!(p.maxLength > 0) || p.maxLength > MAX_TEXT_LENGTH) fail(`${key}.maxLength`);
  return { type: 'string', maxLength: p.maxLength };
}

function loadTool(v: unknown, i: number, names: readonly string[]): ToolDef {
  const t = rec(v, `tools.${i}`);
  const name = t.name;
  if (typeof name !== 'string' || !names.includes(name)) {
    fail(`tools.${i}.name`);
  }
  const description = t.description;
  if (typeof description !== 'string' || description.trim() === '') fail(`${name}.description`);
  if (FORBIDDEN.test(description)) fail(`${name}.description: forbidden word`);
  if (WHISPER.test(description)) fail(`${name}.description: whisper`);
  const s = rec(t.inputSchema, `${name}.inputSchema`);
  if (s.type !== 'object' || s.additionalProperties !== false) fail(`${name}.inputSchema`);
  const propsRaw = rec(s.properties, `${name}.inputSchema.properties`);
  const properties: Record<string, ToolProperty> = {};
  for (const [k, p] of Object.entries(propsRaw)) {
    properties[k] = loadProperty(p, `${name}.inputSchema.properties.${k}`);
  }
  const required: string[] = [];
  if (Array.isArray(s.required)) {
    for (const r of s.required) {
      if (typeof r !== 'string' || !(r in properties)) fail(`${name}.inputSchema.required`);
      required.push(r);
    }
  }
  const a = rec(t.annotations, `${name}.annotations`);
  const annotations: ToolAnnotations = {
    readOnlyHint: bool(a.readOnlyHint, `${name}.annotations.readOnlyHint`),
    destructiveHint: bool(a.destructiveHint, `${name}.annotations.destructiveHint`),
    idempotentHint: bool(a.idempotentHint, `${name}.annotations.idempotentHint`),
    openWorldHint: bool(a.openWorldHint, `${name}.annotations.openWorldHint`),
  };
  // `destructiveHint` stays banned: no lever here removes anything, and a
  // contract that could say otherwise is a contract that could lie.
  // `openWorldHint` is permitted, because for one tool it is true: with
  // VOICE_URL set, `speak` posts the gated line to a worker outside this
  // process. The loader used to hard-fail a true hint, so the contract could
  // not express that even if someone wanted it to, and `speak` told a client
  // a networked tool touched nothing outside. The Catalog build is sealed
  // (disableNetwork, empty VOICE_URL); a local build is not, and the
  // annotation now describes the tool rather than one of its builds.
  if (annotations.destructiveHint) fail(`${name}.annotations`);
  return {
    name: name as AnyToolName,
    description,
    inputSchema: { type: 'object', properties, required, additionalProperties: false },
    annotations,
  };
}

/**
 * Load one cabinet's contract. `names` is that cabinet's closed list; a tool
 * outside it, a missing one, or a duplicate is a halt. `file` only names the
 * file in the halt.
 */
export function loadContract(
  raw: unknown,
  names: readonly string[] = TOOL_NAMES,
  file = 'tools.json',
): ToolDef[] {
  return within(file, () => {
    const obj = rec(raw, 'root');
    if (!Array.isArray(obj.tools)) fail('tools');
    const tools = obj.tools.map((t, i) => loadTool(t, i, names));
    const found = tools.map((t) => t.name);
    if (new Set(found).size !== found.length) fail('tools: duplicate name');
    for (const n of names)
      if (!(found as readonly string[]).includes(n)) fail(`tools: missing ${n}`);
    return tools;
  });
}

export const CONTRACT: readonly ToolDef[] = loadContract(toolsJson);

/**
 * The typing cabinet's contract (slice 4): `view`, `product`, `ask`, `react`.
 * Same loader, same closedness, its own file and its own stdio entry, because
 * the two cabinets' servers change on different clocks.
 */
export const VIBE_CONTRACT: readonly ToolDef[] = loadContract(
  vibeToolsJson,
  VIBE_TOOL_NAMES,
  'tools.vibe.json',
);

/**
 * Catalog listing (name, description, inputSchema) must equal the contract.
 * Annotations stay package-only and are not compared.
 */
export function assertCatalogTools(
  raw: unknown,
  contract: readonly ToolDef[] = CONTRACT,
  file = 'catalog/tools.json',
): void {
  within(file, () => {
    if (!Array.isArray(raw)) fail('listing is not an array');
    if (raw.length !== contract.length) fail('count');
    for (let i = 0; i < contract.length; i++) {
      const want = contract[i]!;
      const got = rec(raw[i], `${want.name}`);
      if (got.name !== want.name) fail(`${want.name}`);
      if (got.description !== want.description) fail(`${want.name}.description`);
      const schema = rec(got.inputSchema, `${want.name}.inputSchema`);
      if (schema.type !== 'object' || schema.additionalProperties !== false) {
        fail(`${want.name}.inputSchema`);
      }
      const props = rec(schema.properties, `${want.name}.inputSchema.properties`);
      if (JSON.stringify(props) !== JSON.stringify(want.inputSchema.properties)) {
        fail(`${want.name}.inputSchema.properties`);
      }
      const required = Array.isArray(schema.required) ? schema.required : [];
      if (JSON.stringify(required) !== JSON.stringify(want.inputSchema.required)) {
        fail(`${want.name}.inputSchema.required`);
      }
    }
  });
}

function defOf(contract: readonly ToolDef[], name: string, file: string): ToolDef {
  const t = contract.find((d) => d.name === name);
  if (!t) throw new Error(`${file}: missing ${name}`);
  return t;
}

function enumIn(contract: readonly ToolDef[], name: string, prop: string, file: string) {
  const p = defOf(contract, name, file).inputSchema.properties[prop];
  if (!p || !('enum' in p)) throw new Error(`${file}: ${name}.${prop} is not an enum`);
  return p.enum;
}

export function toolDef(name: ToolName): ToolDef {
  return defOf(CONTRACT, name, 'tools.json');
}

/** The closed set a named enum argument may take. */
export function enumOf(name: ToolName, prop: string): readonly string[] {
  return enumIn(CONTRACT, name, prop, 'tools.json');
}

/** The typing cabinet's definition for one of its four tools. */
export function vibeToolDef(name: VibeToolName): ToolDef {
  return defOf(VIBE_CONTRACT, name, 'tools.vibe.json');
}
