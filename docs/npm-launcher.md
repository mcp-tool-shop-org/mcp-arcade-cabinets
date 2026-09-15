# The npm launcher

`@mcptoolshop/ghost-on-the-menu` — the cabinet as one published package, two ways to run.

**The Director lifted the never-npm rule for this package on 2026-09-14, and for this package only.** `tape-core`, `ghost-on-the-menu`, `cabinet-server` and `cabinets` stay `"private": true` and are not on any registry. What changed is narrow and is written into `CLAUDE.md`: one launcher publishes, the rest do not.

## Why a launcher and not the game

The obvious package is the game library. It is also the useless one: nobody consumes a sim engine for a single game, and publishing it would drag `tape-core` and `cabinet-server` onto the registry behind it.

The launcher inverts that. `esbuild --bundle` already collapses the workspace graph into one self-contained file — that is how the Docker image works — so a package that carries the bundles and the built shell needs **no runtime dependencies at all**. `packages/launcher/package.json` has an empty dependency set on purpose. One package ships; four stay private; the `@mcp-arcade-cabinets/*` scope never touches npm.

## What it does

`npx @mcptoolshop/ghost-on-the-menu` serves the built shell on loopback and opens it. `--mcp` hands stdio to the cabinet server instead.

The play mode is not a second copy of the Pages build, and the difference is the whole argument for it. Pages serves the game and structurally cannot reach a daemon on the player's machine, so it omits the local seats. The launcher carries what `apps/cabinets/vite.config.ts` gives a developer — the two allowlisted proxies and the say route — minus Vite. A player who has only ever run `npx` gets the Ollama bosses and the voice.

The boundary is ported, not re-invented, and `packages/launcher/src/allow.ts` says so at the top. **Keep the two in step:** a path added to the dev server's allowlist and not to the launcher's is a path that works in dev and 404s for a player.

## What was measured (2026-09-14, this rig)

| Check              | Result                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| Tarball            | 6.0 MB packed, 8.3 MB unpacked, 62 files, no `.ts`, no `.map`, no `src/`, no `test/`            |
| Of which the shell | 5.7 MB — 5.0 MB of ACE-Step beds, 504 kB sprites, 213 kB js                                     |
| Bundles            | `cabinet-stdio.js` 1.5 MB, `cabinet-server.js` 767 kB, `cli.js` 17 kB                           |
| Tapes              | twenty, 180 kB, resolved from the package through `CABINET_TAPES`                               |
| `--mcp` over stdio | `initialize` + `tools/list` → `fire,say,sfx,speak,tapes,view`, exit 0                           |
| Play mode          | `/` 200 `text/html`, `/sprites/answer.png` 200 `image/png`, `/tracks/menu.mp3` 200 `audio/mpeg` |
| `/ollama/api/pull` | 404, and the stand-in daemon recorded no socket                                                 |
| Tests              | 38 across four files, including six traversal attempts over a raw socket                        |

The traversal tests are worth a line. They were written with `fetch` first and passed for the wrong reason: `fetch` resolves `/../x` against the origin before it opens a socket, so it cannot ask the question. They now write the request line by hand over `node:net`, and the secret they try to read sits outside the served directory rather than inside it.

## Standards compliance (the six)

**PIN_PER_STEP — 2.** The publish gates run off pinned action SHAs, the lockfile pins every build tool, and `npm publish --provenance` attests the workflow, the commit and the runner. Not 3: the tarball is not yet byte-reproducible across runners, because the Vite build is not pinned to a fixed asset hash.

**ANDON_AUTHORITY — 3.** Five gates halt before the irreversible step and each names the local command that reproduces it: version-matches-tag, `pnpm verify`, the build, the bin smoke (`--version` and a real `tools/list`), and the tarball contract (required files present, no sources leaked, twenty tapes). `scripts/build.mjs` halts on a missing input and re-checks the layout after the copy. Nothing is published unless all of them pass.

**NAMED_COMPENSATORS — 3.** Table below. No skip is available here and none is taken.

**DECOMPOSE_BY_SECRETS — 3.** The reason this is one package and not four. What changes together (the shell, the server bundle, the tapes) is copied together at build time; what changes on its own clock stays a separate private package. The published surface is a CLI and a tool contract, neither of which leaks the workspace layout.

**UNCERTAINTY_GATED_HUMANS — 2.** The human checkpoint is the release itself, and it gates on the thing actually in doubt: whether this version should exist in public forever. `workflow_dispatch` dry-runs by default so the rails can be exercised without that decision. Not 3: the dispatch prompt is a checkbox, not a contrastive framing of what is about to become permanent.

**EXTERNAL_VERIFIER — 1.** The CI smoke runs the built artifact in a different process on a different machine than the one that wrote it, which catches a broken bundle. It is not a different model family and nothing adversarial reads the published README. **Remediation:** Grok reviews this diff before the tag, as it reviewed slices 4, 6 and 7. Owner: the Director. Target: the session that cuts `v0.8.0`.

## Compensators

Every irreversible call, its undo, and what the undo leaves behind.

| Action                                                      | Undo                                                                                                   | State afterwards                                                                            | Owner    |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | -------- |
| `npm publish` (within 72 h)                                 | `npm unpublish @mcptoolshop/ghost-on-the-menu@<v>`                                                     | Version gone; **that exact version string can never be republished**                        | Director |
| `npm publish` (after 72 h)                                  | `npm deprecate @mcptoolshop/ghost-on-the-menu@<v> "<why>"`                                             | Version stays on the registry forever; installs print the reason                            | Director |
| The `0.0.0` placeholder publish, which **creates the name** | `npm deprecate …@0.0.0 "placeholder"`, or `npm unpublish` within 72 h                                  | The name is held for good either way. `npm owner add/rm` transfers it; it is never released | Director |
| Trusted Publishing set up on npmjs.com                      | Remove the trusted publisher in the npm package settings                                               | CI can no longer publish; nothing already published changes                                 | Director |
| `gh release create` — **now also publishes to npm**         | `gh release delete <tag>` deletes the release, **not the npm version**; use the npm rows above as well | The tag survives a release delete; the npm version survives both                            | Director |
| `git push --tags`                                           | `git push --delete origin <tag>`                                                                       | Anyone who fetched the tag keeps it                                                         | Director |

**The fifth row is the change to an existing ritual and the one to read twice.** Cutting a GitHub release used to be undoable — delete the release, retag, move on. It now triggers an npm publish that is not undoable after 72 hours. A release is a heavier act in this repo than it was yesterday.

## What was refused

- **Publishing the game library.** No consumer, and it would pull three private packages onto the registry behind it.
- **A `dependencies` block.** Bundling is what keeps this to one package. A single runtime dependency would put the `@mcp-arcade-cabinets/*` scope on npm.
- **Binding anything but `127.0.0.1`.** The launcher hands a browser a path to the player's own daemon; a bind on another interface hands it to their network. Not an option, not a flag.
- **A general proxy.** The allowlist is six calls. Convenient as `/ollama/*` would be, it is a remote-control for a daemon that can pull and delete models.
- **Fetching the beds on first run** to cut the tarball below 6 MB. It would trade a fixed 5 MB for a network dependency and a fail-open path, against the fail-closed `TRACK_KEYS` discipline the shell already keeps.
- **`NPM_TOKEN`.** Trusted Publishing or nothing. There is no long-lived registry credential in this repo.
- **1.0.0.** npm takes `0.x` and `0.x` is true. The cabinet lock is unchanged.

## Trusted Publishing, and the 404 that fooled a session

**Shipped 2026-09-14.** `@mcptoolshop/ghost-on-the-menu@0.8.0`, published by CI over OIDC — `_npmUser: "GitHub Actions"`, provenance attested, sigstore log index 2837055244, 63 files, 6.0 MB packed. TP is configured against repo `mcp-tool-shop-org/mcp-arcade-cabinets`, workflow `release.yml`, **no environment**.

**The placeholder was required, and this doc claimed twice that it was not.** The record, because the failure mode is reusable:

| Event                                                                       | Time (UTC)    |
| --------------------------------------------------------------------------- | ------------- |
| Placeholder `0.0.0` published by the Director                               | **00:09:22Z** |
| `curl registry.npmjs.org/...` → **404**, read as "the name has no versions" | 00:11:17Z     |
| Concluded from that 404 that npm allows TP on an unpublished name           | —             |
| `v0.8.0` published by CI via OIDC                                           | 00:22:23Z     |

The 404 arrived **115 seconds after** the placeholder publish. `registry.npmjs.org` lags npmjs.com by a couple of minutes, and npm's own publish output says so — _"Your package is being processed and may take a few minutes to become available."_ The package existed the entire time.

So the order is: **publish a placeholder, then configure TP.** npm has no equivalent of PyPI's pending publishers; `npm trust` states the requirement outright and [npm/cli#8544](https://github.com/npm/cli/issues/8544) is open.

Three rules came out of it, and they are in the canonical `npm-placeholder-bootstrap` playbook now:

- A registry 404 is not proof a name is unpublished. `npm view <pkg> time --json` is authoritative; a 404 is not.
- The website, the registry API and the CLI are three surfaces with three consistency guarantees. Do not reason from one to another.
- If the workflow job declares an `environment:`, npm's trusted publisher must name the same one — GitHub's OIDC subject claim gains an `:environment:<name>` segment. This workflow originally declared `environment: npm` against a TP config naming none; the key was removed rather than guessed at. Caught before the release.

**The filename is pinned twice.** `release.yml` is the org convention and npm ties the trust to it. Renaming it breaks publishing until the trust is re-pointed.

**Still owed:** flip "Require 2FA and disallow tokens" on the access page now that a CI publish has succeeded, and `npm deprecate @mcptoolshop/ghost-on-the-menu@0.0.0 "placeholder"`.
