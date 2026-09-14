/** Closed MCP tool names. tools.json, dispatch, and the say gate share this list. */
export const TOOL_NAMES = ['fire', 'say', 'speak', 'sfx', 'view', 'tapes'] as const;
export type ToolName = (typeof TOOL_NAMES)[number];
