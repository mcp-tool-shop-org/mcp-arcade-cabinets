# Ship Gate

> No repo is "done" until every applicable line is checked.
> Copy this into your repo root. Check items off per-release.

**Tags:** `[all]` every repo · `[npm]` `[pypi]` `[vsix]` `[desktop]` `[container]` published artifacts · `[mcp]` MCP servers · `[cli]` CLI tools

---

## A. Security Baseline

- [x] `[all]` SECURITY.md exists — 2026-09-10 (report email, supported versions, response timeline) — executed by `npx @mcptoolshop/shipcheck security-docs` (A1: present + reporting contact, not an empty stub)
- [x] `[all]` README includes threat model paragraph — 2026-09-10, "Trust and threat model" (data touched, data NOT touched, permissions required) — executed by `npx @mcptoolshop/shipcheck security-docs` (A2: trust/threat-model section present + non-empty; _quality_ is not machine-checkable)
- [x] `[all]` No secrets, tokens, or credentials — 2026-09-14: **one publishable package now** (`@mcptoolshop/ghost-on-the-menu`, the launcher). Gate I PASSED against its real tarball — 28 files scanned, no credentials in the published surface — and Gate L PASSED (OIDC + `--provenance`, no `NPM_TOKEN` in this repo; `docs/npm-launcher.md`). The tracked-tree identity scan was run on this rig on 2026-09-15 before every push of the Vibe Typer slices and the treatment (RESULT CLEAN each time); the launcher tarball is scanned again before the v0.9.0 tag. What was run instead on the new surface: a targeted grep of `packages/launcher`, `docs/npm-launcher.md` and `release.yml` for the operator's identity and rig paths — no hits. The repo holds tapes, code and art only in source or diagnostics output — executed by `npx @mcptoolshop/shipcheck secrets` (scans every publishable tarball; matches redacted; not a manual attestation)
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

- [x] `[all]` README is current — 2026-09-15: the root README is the arcade's entrance (two cabinets, the shared chassis, layout, play, adding a cabinet); Ghost's page in packages/ghost-on-the-menu/README.md, Vibe Typer's in packages/vibe-typer/README.md, the npm page in packages/launcher/README.md covers both; Node 22+: what it does, install, usage, supported platforms + runtime versions
- [x] `[all]` CHANGELOG.md (Keep a Changelog format) — 2026-09-15: 0.9.0 (Vibe Typer slices 1–2, the entrance README, the landing page) after 0.8.2
- [x] `[all]` LICENSE file present — 2026-09-10: MIT; support status in SECURITY.md (0.3.x) and repo states support status
- [x] `[cli]` `--help` output accurate — 2026-09-10: scripts/play.mjs prints usage on a missing cabinet; film and sweep document their flags in their headers for all commands and flags
- [ ] `[cli|mcp|desktop]` SKIP: the tools print a transcript or a table; nothing logs secrets because nothing holds any — Logging levels defined: silent / normal / verbose / debug — secrets redacted at all levels
- [x] `[mcp]` 2026-09-11: `packages/cabinet-server/tools.json` carries every tool's description, schema and annotations; the handbook page "The cabinet server" documents them — All tools documented with description + parameters
- [ ] `[complex]` SKIP: the handbook is the Starlight site (Phase 3); HANDOFF.md is the operator pick-up — HANDBOOK.md: daily ops, warn/critical response, recovery procedures

## D. Shipping Hygiene

- [x] `[all]` `verify` script exists — 2026-09-10: pnpm verify = lint, typecheck, test, build, play-through (test + build + smoke in one command)
- [x] `[all]` Version in manifest matches git tag — 2026-09-15: 0.9.0 in every package.json (seven) and SERVER_VERSION; tag v0.9.0; release.yml refuses a mismatch — executed by `npx @mcptoolshop/shipcheck manifest`
- [x] `[all]` Dependency scanning runs in CI — 2026-09-10: pnpm audit --audit-level=high in ci.yml (shipcheck ci: passed) (ecosystem-appropriate) — executed by `npx @mcptoolshop/shipcheck ci` (D3: a recognized scanner is _configured_ in CI, or dependabot is present)
- [x] `[all]` No known high/critical vulnerabilities — 2026-09-10: pnpm audit reports 0 high/critical (2 moderate, dev-only); Dependabot alerts enabled via API. shipcheck deps cannot parse a pnpm tree (it runs npm audit), so this line is attested from pnpm audit in any dependency tree, and Dependabot alerts are enabled — executed by `npx @mcptoolshop/shipcheck deps` (the OUTCOME: audits **every** tree incl. subtrees, not just the root; `ci` only proves a scanner is configured)
- [ ] `[all]` SKIP: org rule: no dependabot.yml unless asked; alerts are on — Automated dependency **update** mechanism exists <!-- soft/optional: the org rule restricts the auto-PR bot (CI minutes), NOT alerts. The security outcome is enforced by `shipcheck deps`; the update bot is optional. -->
- [x] `[npm]` 2026-09-14: Gate L PASSED — `release.yml` publishes with OIDC + `--provenance`, no `NPM_TOKEN` in the repo. **Not yet confirmed on the registry**: nothing is published, so the attestation itself is unverified until the first release (`shipcheck ci --registry` after it) — Published via OIDC trusted publishing with `--provenance` — executed by `npx @mcptoolshop/shipcheck ci` (config/intent; `--registry <pkg>` also confirms the attestation on npm)
- [x] `[npm]` 2026-09-14: Gate H PASSED — 1 publishable package (`@mcptoolshop/ghost-on-the-menu`); its tarball ships README + LICENSE and every `files[]` entry resolves — **Every publishable package** passes `npx @mcptoolshop/shipcheck pack` — `npm pack --dry-run` on each workspace package includes README.md + LICENSE and all `files[]` entries resolve (executed check, not a manual attestation; in a monorepo it verifies all packages, not just the root)
- [x] `[npm]` 2026-09-14: Gate J PASSED — the launcher declares `engines.node >=22`; the other four stay private — `engines.node` set · `[pypi]` `python_requires` set — executed by `npx @mcptoolshop/shipcheck manifest` (D6, checked per publishable package)
- [x] `[npm]` 2026-09-14: Gate J PASSED — `pnpm-lock.yaml` committed; no pypi — Lockfile committed · `[pypi]` Clean wheel + sdist build — lockfile executed by `npx @mcptoolshop/shipcheck manifest` (D7); the pypi wheel/sdist build is not yet executed
- [ ] `[vsix]` SKIP: not an extension — `vsce package` produces clean .vsix with correct metadata
- [ ] `[desktop]` SKIP: not a desktop app — Installer/package builds and runs on stated platforms
- [x] `[container]` 2026-09-11: `docker build` from the root Dockerfile produces `ghcr.io/mcp-tool-shop-org/mcp-arcade-cabinets:0.5.0` (node:22-alpine, one bundled file, the tapes and tools.json baked in, runs as `node`); driven over stdio under one CPU, two gigabytes and no network it lists six tools in eight milliseconds and answers every call; `mcp-arcade bout --target docker` passes all four experiments against it — Container image builds and runs under the target runtime's limits

## E. Identity (soft gate — does not block ship)

- [x] `[all]` Logo in README header (brand/logos/mcp-arcade-cabinets/readme.png) — 2026-09-15: the arcade cabinet render; the ghost icon lives on as ghost-readme.png on Ghost's page; Vibe Typer's own logo is owed
- [x] `[all]` Translations (polyglot-mcp, 8 languages) — ja, zh, es, fr, hi, it, pt-BR on TranslateGemma 27B, 2026-09-15, regenerated from the arcade-entrance README before the v0.9.0 tag
- [x] `[org]` Landing page (@mcptoolshop/site-theme) — 2026-09-15: site/ is the arcade (a cabinets section with both games, Inside Vibe Typer, Inside Ghost, play cards), the Starlight handbook with a Vibe Typer page, both cabinets at /play/, Pages via pages.yml
- [x] `[all]` GitHub repo metadata: description, homepage, topics — 2026-09-15: description names both cabinets; topics gained typing-game, games, monorepo

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
