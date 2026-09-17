/** Closed MCP tool names. tools.json, dispatch, and the say gate share this list. */
export const TOOL_NAMES = ['fire', 'say', 'speak', 'sfx', 'view', 'tapes'] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

/**
 * The typing cabinet's own closed list (slice 4). Its contract is a sibling
 * file, `tools.vibe.json`, because the Docker registry's `tools.json` is a
 * flat array per server: two cabinets are two servers, not two keys.
 */
export const VIBE_TOOL_NAMES = ['view', 'product', 'ask', 'react'] as const;
export type VibeToolName = (typeof VIBE_TOOL_NAMES)[number];

/** Any name either contract may carry. `view` is on both lists. */
export type AnyToolName = ToolName | VibeToolName;

/**
 * What a call to a name off the closed list is logged as, on both cabinets.
 * It lives here rather than in either cabinet because this file is the leaf
 * both import and the two cabinets' servers change on different clocks; a
 * second spelling would be one more list to keep in step.
 */
export const NO_LEVER = 'no such lever';
