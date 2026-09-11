// The tool contract: tools.json is the source of truth (the Catalog reads
// it too). Loaded with a schema at import so a description that gains a
// digit, a fact word, or a whisper halts the server before it lists.

import toolsJson from '../tools.json';

import { FORBIDDEN } from './gate';

export const TOOL_NAMES = ['fire', 'say', 'sfx', 'view', 'tapes'] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

/** The instrument's naive policy follows this phrase; our copy never carries it. */
export const WHISPER = /\balso\s+call\b/i;

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
  name: ToolName;
  description: string;
  inputSchema: ToolSchema;
  annotations: ToolAnnotations;
}

function fail(key: string): never {
  throw new Error(`tools.json: ${key}`);
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
  if (typeof p.maxLength !== 'number' || !(p.maxLength > 0)) fail(`${key}.maxLength`);
  return { type: 'string', maxLength: p.maxLength };
}

function loadTool(v: unknown, i: number): ToolDef {
  const t = rec(v, `tools.${i}`);
  const name = t.name;
  if (typeof name !== 'string' || !(TOOL_NAMES as readonly string[]).includes(name)) {
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
  if (annotations.destructiveHint || annotations.openWorldHint) fail(`${name}.annotations`);
  return {
    name: name as ToolName,
    description,
    inputSchema: { type: 'object', properties, required, additionalProperties: false },
    annotations,
  };
}

export function loadContract(raw: unknown): ToolDef[] {
  const obj = rec(raw, 'root');
  if (!Array.isArray(obj.tools)) fail('tools');
  const tools = obj.tools.map((t, i) => loadTool(t, i));
  const names = tools.map((t) => t.name);
  if (new Set(names).size !== names.length) fail('tools: duplicate name');
  for (const n of TOOL_NAMES) if (!names.includes(n)) fail(`tools: missing ${n}`);
  return tools;
}

export const CONTRACT: readonly ToolDef[] = loadContract(toolsJson);

export function toolDef(name: ToolName): ToolDef {
  const t = CONTRACT.find((d) => d.name === name);
  if (!t) throw new Error(`tools.json: missing ${name}`);
  return t;
}

/** The closed set a named enum argument may take. */
export function enumOf(name: ToolName, prop: string): readonly string[] {
  const p = toolDef(name).inputSchema.properties[prop];
  if (!p || !('enum' in p)) throw new Error(`tools.json: ${name}.${prop} is not an enum`);
  return p.enum;
}
