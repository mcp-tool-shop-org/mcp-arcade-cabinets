// @mcp-arcade-cabinets/tape-core — Grok's lane.
//
// Loader + validator for `mcp-arcade.tape/v1`, atom slicing, and the calibration
// math (Brier on a stated confidence, reliability bins, coverage cells).
// The validator MUST reject any document carrying `scores`, `contrastive`,
// `operator_call`, `checks`, or `result` keys: cabinets never see a verdict.
// See docs/study-swarm.dispatch.md G1, G3.

export const TAPE_SCHEMA_ID = 'mcp-arcade.tape/v1';
