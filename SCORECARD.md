# Scorecard

**Repo:** mcp-arcade-cabinets
**Date:** 2026-09-10
**Type tags:** [all] (a browser game and its terminal tools; no published package)

## Pre-Remediation Assessment

| Category            | Score     | Notes                                                                                |
| ------------------- | --------- | ------------------------------------------------------------------------------------ |
| A. Security         | 5/10      | No SECURITY.md; no threat-model section; nothing to leak, but nothing said either    |
| B. Error Handling   | 8/10      | Loaders throw plain messages naming file and key; play runner exits by cause         |
| C. Operator Docs    | 6/10      | README described the wave-1 state; no CHANGELOG; HANDOFF.md carried the real picture |
| D. Shipping Hygiene | 5/10      | Version 0.0.0, no verify script, no dependency scan in CI, no tag                    |
| E. Identity (soft)  | 0/10      | No logo, no translations, no landing page, default metadata                          |
| **Overall**         | **24/50** |                                                                                      |

## Key Gaps

1. No SECURITY.md and no threat-model paragraph in the README.
2. No CHANGELOG, version stuck at 0.0.0, no `verify` script.
3. No dependency scanning in CI and Dependabot alerts off.
4. No logo, landing page, handbook, translations or repo metadata.

## Remediation Priority

| Priority | Item                                                                         | Estimated effort |
| -------- | ---------------------------------------------------------------------------- | ---------------- |
| 1        | SECURITY.md, README threat model, CHANGELOG, 0.2.0, verify                   | one pass         |
| 2        | pnpm audit in CI, Dependabot alerts                                          | minutes          |
| 3        | Logo, landing page with the game at /play/, handbook, translations, metadata | the treatment    |

## Post-Remediation

| Category            | Before | After                                                                  |
| ------------------- | ------ | ---------------------------------------------------------------------- |
| A. Security         | 5/10   | 9/10                                                                   |
| B. Error Handling   | 8/10   | 8/10                                                                   |
| C. Operator Docs    | 6/10   | 9/10                                                                   |
| D. Shipping Hygiene | 5/10   | 9/10                                                                   |
| E. Identity (soft)  | 0/10   | 10/10 (logo, 7 translations, landing page, handbook, /play/, metadata) |
| **Overall**         | 24/50  | 45/50                                                                  |

v0.3.0 (2026-09-10) re-ran the full treatment on the same score: shipcheck A–D pass, landing header **Play** into `/play/`, translations refreshed, GitHub metadata already set, no npm (all packages private).
