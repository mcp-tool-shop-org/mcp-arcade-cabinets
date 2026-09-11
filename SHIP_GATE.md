# Ship Gate

> No repo is "done" until every applicable line is checked.
> Copy this into your repo root. Check items off per-release.

**Tags:** `[all]` every repo · `[npm]` `[pypi]` `[vsix]` `[desktop]` `[container]` published artifacts · `[mcp]` MCP servers · `[cli]` CLI tools

---

## A. Security Baseline

- [x] `[all]` SECURITY.md exists — 2026-09-10 (report email, supported versions, response timeline) — executed by `npx @mcptoolshop/shipcheck security-docs` (A1: present + reporting contact, not an empty stub)
- [x] `[all]` README includes threat model paragraph — 2026-09-10, "Trust and threat model" (data touched, data NOT touched, permissions required) — executed by `npx @mcptoolshop/shipcheck security-docs` (A2: trust/threat-model section present + non-empty; _quality_ is not machine-checkable)
- [x] `[all]` No secrets, tokens, or credentials — 2026-09-10: no publishable package; identity-scan RESULT CLEAN on the tracked tree; the repo holds tapes, code and art only in source or diagnostics output — executed by `npx @mcptoolshop/shipcheck secrets` (scans every publishable tarball; matches redacted; not a manual attestation)
- [x] `[all]` No telemetry by default — 2026-09-10: none, stated in README and SECURITY.md — state it explicitly even if obvious

### Default safety posture

- [x] `[cli|mcp|desktop]` 2026-09-11: no tool of the cabinet server and no terminal tool performs a destructive action; the six tools propose a verb, a line, a sound, or read words; the voice worker writes only under film/ — Dangerous actions (kill, delete, restart) require explicit `--allow-*` flag
- [x] `[cli|mcp|desktop]` 2026-09-11: reads fixtures/tapes and the pattern files; the dev tools and the voice worker write only under film/ — File operations constrained to known directories
- [x] `[mcp]` 2026-09-11: the stdio server's only egress is the voice worker on the host (`VOICE_URL`, off with an empty value); the published shell is static files with no egress — Network egress off by default
- [x] `[mcp]` 2026-09-11: a bad enum answers `isError` with a words-only message; an unknown tool is the SDK's protocol error; the server never writes a stack to the transport — Stack traces never exposed — structured error results only

## B. Error Handling

- [x] `[all]` Errors follow the Structured Error Shape — 2026-09-10: the pattern loader throws a plain Error whose message names file and key (patterns/<file>: <key>); tape-core throws TapeError with a message; play exits 1/2/3 by cause: `code`, `message`, `hint`, `cause?`, `retryable?`
- [x] `[cli]` Exit codes — 2026-09-10: scripts/play.mjs exits 0 ok, 1 transcript failed, 2 usage, 3 no build: 0 ok · 1 user error · 2 runtime error · 3 partial success
- [x] `[cli]` No raw stack traces — 2026-09-10: the play runner prints the transcript, not a stack; the loaders throw plain messages without `--debug`
- [x] `[mcp]` 2026-09-11: the stdio test calls every tool, a bad enum and an unlisted name and lists again after — Tool errors return structured results — server never crashes on bad input
- [x] `[mcp]` 2026-09-11: a tape that does not load is left off the menu; a missing voice worker is silence; a corrupt pattern or persona file is a load error by design, before the transport connects — State/config corruption degrades gracefully (stale data over crash)
- [ ] `[desktop]` SKIP: browser shell; no error surfaces beyond the console — Errors shown as user-friendly messages — no raw exceptions in UI
- [ ] `[vscode]` SKIP: not a VS Code extension — Errors surface via VS Code notification API — no silent failures

## C. Operator Docs

- [x] `[all]` README is current — 2026-09-10: what, play, terminal tools, Node 22+: what it does, install, usage, supported platforms + runtime versions
- [x] `[all]` CHANGELOG.md (Keep a Changelog format) — 2026-09-10: 0.3.0 entry
- [x] `[all]` LICENSE file present — 2026-09-10: MIT; support status in SECURITY.md (0.3.x) and repo states support status
- [x] `[cli]` `--help` output accurate — 2026-09-10: scripts/play.mjs prints usage on a missing cabinet; film and sweep document their flags in their headers for all commands and flags
- [ ] `[cli|mcp|desktop]` SKIP: the tools print a transcript or a table; nothing logs secrets because nothing holds any — Logging levels defined: silent / normal / verbose / debug — secrets redacted at all levels
- [x] `[mcp]` 2026-09-11: `packages/cabinet-server/tools.json` carries every tool's description, schema and annotations; the handbook page "The cabinet server" documents them — All tools documented with description + parameters
- [ ] `[complex]` SKIP: the handbook is the Starlight site (Phase 3); HANDOFF.md is the operator pick-up — HANDBOOK.md: daily ops, warn/critical response, recovery procedures

## D. Shipping Hygiene

- [x] `[all]` `verify` script exists — 2026-09-10: pnpm verify = lint, typecheck, test, build, play-through (test + build + smoke in one command)
- [x] `[all]` Version in manifest matches git tag — 2026-09-10: 0.3.0 in every package.json; tag v0.3.0 cut at release — executed by `npx @mcptoolshop/shipcheck manifest` (D2: manifest version not behind the newest released tag; `--expect <ver>` for a strict release-time match)
- [x] `[all]` Dependency scanning runs in CI — 2026-09-10: pnpm audit --audit-level=high in ci.yml (shipcheck ci: passed) (ecosystem-appropriate) — executed by `npx @mcptoolshop/shipcheck ci` (D3: a recognized scanner is _configured_ in CI, or dependabot is present)
- [x] `[all]` No known high/critical vulnerabilities — 2026-09-10: pnpm audit reports 0 high/critical (2 moderate, dev-only); Dependabot alerts enabled via API. shipcheck deps cannot parse a pnpm tree (it runs npm audit), so this line is attested from pnpm audit in any dependency tree, and Dependabot alerts are enabled — executed by `npx @mcptoolshop/shipcheck deps` (the OUTCOME: audits **every** tree incl. subtrees, not just the root; `ci` only proves a scanner is configured)
- [ ] `[all]` SKIP: org rule: no dependabot.yml unless asked; alerts are on — Automated dependency **update** mechanism exists <!-- soft/optional: the org rule restricts the auto-PR bot (CI minutes), NOT alerts. The security outcome is enforced by `shipcheck deps`; the update bot is optional. -->
- [ ] `[npm]` SKIP: nothing is published to npm; the release is a git tag, a GitHub release and the Pages site — Published via OIDC trusted publishing with `--provenance` — executed by `npx @mcptoolshop/shipcheck ci` (config/intent; `--registry <pkg>` also confirms the attestation on npm)
- [ ] `[npm]` SKIP: no publishable package (all private) — **Every publishable package** passes `npx @mcptoolshop/shipcheck pack` — `npm pack --dry-run` on each workspace package includes README.md + LICENSE and all `files[]` entries resolve (executed check, not a manual attestation; in a monorepo it verifies all packages, not just the root)
- [ ] `[npm]` SKIP: private packages; engines.node >=22 is set at the root — `engines.node` set · `[pypi]` `python_requires` set — executed by `npx @mcptoolshop/shipcheck manifest` (D6, checked per publishable package)
- [ ] `[npm]` SKIP: pnpm-lock.yaml is committed (shipcheck manifest: passed); no pypi — Lockfile committed · `[pypi]` Clean wheel + sdist build — lockfile executed by `npx @mcptoolshop/shipcheck manifest` (D7); the pypi wheel/sdist build is not yet executed
- [ ] `[vsix]` SKIP: not an extension — `vsce package` produces clean .vsix with correct metadata
- [ ] `[desktop]` SKIP: not a desktop app — Installer/package builds and runs on stated platforms

## E. Identity (soft gate — does not block ship)

- [x] `[all]` Logo in README header (brand/logos/mcp-arcade-cabinets/readme.png)
- [x] `[all]` Translations (polyglot-mcp, 8 languages) — ja, zh, es, fr, hi, it, pt-BR on TranslateGemma 27B, 2026-09-10
- [x] `[org]` Landing page (@mcptoolshop/site-theme) — site/ with the Starlight handbook and the game at /play/, Pages via pages.yml
- [x] `[all]` GitHub repo metadata: description, homepage, topics

---

## Gate Rules

**Hard gate (A–D):** Must pass before any version is tagged or published.
If a section doesn't apply, mark `SKIP:` with justification — don't leave it unchecked.

**Soft gate (E):** Should be done. Product ships without it, but isn't "whole."

**Executed vs attested.** `shipcheck audit` only _counts these checkboxes_ — it does not read your repo, so a box can be green while the fact is false. The lines that say **"executed by `npx @mcptoolshop/shipcheck <gate>`"** are backed by a command that reads the real artifact and exits 1 on the real defect. Run those gates (they are wired into shipcheck's own `verify`); don't just tick their boxes. Executed today: **A1/A2** (`security-docs`), **A3** (`secrets`), **D2/D6/D7** (`manifest`), **D3-config + OIDC/provenance** (`ci`), **real vulnerabilities + alerting** (`deps`), **D5** (`pack`), plus front-door (`front-door`) and dogfood freshness (`dogfood`). Every other line is still an attestation you are vouching for. Note the two dependency layers: `ci` proves a scanner is _configured_; `deps` proves there are _no known vulnerabilities_ — a repo can pass the first while failing the second.

**Checking off:**

```
- [x] `[all]` SECURITY.md exists (2026-02-27)
```

**Skipping:**

```
- [ ] `[pypi]` SKIP: not a Python project
```
