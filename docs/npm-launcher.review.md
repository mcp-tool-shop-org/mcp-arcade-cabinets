# Review — the npm launcher (v0.8.0 / v0.8.1)

Grok, sim owner. Read against G1, G7–G10, G11–G18, G19–G22. Diff: `v0.7.0..v0.8.1` (`d0b17b7` the launcher, `03ceb2d` the handshake gate, `fed8911` the npm hero, `8ac309f` the tag). The lock is not re-derived. Tags `v0.8.0` and `v0.8.1` are already on origin and on npm (`latest` is `0.8.1`). This review is the EXTERNAL_VERIFIER remediation named in `docs/npm-launcher.md`; it is late for both tags.

No halt in this lane. The sim, its tests, and `tape-core` are unchanged by this review. This file is the report.

Live, 2026-09-14, this rig: identity scan of the tracked tree is **CLEAN**. The tool is `python %USERPROFILE%\.grok\bin\identity-scan.py .` from the repo cwd.

---

## 1. G1, G7, G12 on the new surface — **hold**

The launcher copies `fixtures/tapes` into the tarball (`scripts/build.mjs:56`) and points `--mcp` at that folder (`cli.ts:128`). It does not load a receipt. `parseSeatView` (`serve.ts:78`) is the same closed set the dev server uses: kind, health word, column, stick, wave, and a motion string capped at 80. Nothing in that view is a fact, a lie flag, a count, a score, or a tape row. The say route bounds `recent` and `models` (`serve.ts:92`) and never returns a status code or a model name to the page (`serve.ts:306`). `ANTHROPIC_API_KEY` and `VOICE_TOKEN` stay on the node side (`cli.ts:162`).

`git diff --name-only v0.7.0..v0.8.1` does not touch `packages/ghost-on-the-menu/src`, `packages/tape-core`, or `fixtures/tapes`. G19–G22 did not move. The band did not move.

## 2. Loopback and the allowlist — **hold**

`HOST` is `127.0.0.1` and is not an option (`serve.ts:23`, `listenFrom` at `:374`). The six calls in `allow.ts:60` match `apps/cabinets/vite.config.ts` `devAllowlists` byte for byte: `GET /api/tags`, `POST /api/chat`, `GET /health`, `GET /stats`, `POST /speak`, hash-named `/audio/*.wav`. Pull, delete, create, and generate 404 before a socket opens (`serve.test.ts:146`; the stand-in daemon recorded nothing). The worker bearer is added here and never forwarded to the daemon (`serve.test.ts:157`).

The traversal tests write the request line over `node:net` (`serve.test.ts:17`). `fetch` cannot ask that question. Six climbs, including `%2e%2e%2f` and a Windows backslash, stay 404 and never leak the secret one level above the shell (`serve.test.ts:105`). `resolveUnder` (`files.ts:46`) decodes first, refuses NUL, refuses `\`, and requires the resolved path to stay under `root + sep`. That is the right shape.

Keep the two allowlists in step, as the file says. A path added in Vite and not here 404s for an `npx` player.

## 3. One package, the gates, the handshake — **hold**

`packages/launcher/package.json` has no `dependencies`. `tape-core`, `ghost-on-the-menu`, `cabinet-server`, and `cabinets` stay `"private": true`. The `@mcp-arcade-cabinets/*` scope is not on npm. That is DECOMPOSE_BY_SECRETS as written.

Five gates halt before `npm publish` (`release.yml`): version-matches-tag (now including `SERVER_VERSION` read out of `server.ts`), `pnpm verify`, `pnpm build:launcher`, a bin smoke (`--version` and a real `tools/list` over stdio), and the tarball contract (required files, no `.ts` / `.map` / `src/` / `test/`, twenty tapes). No `environment:` on the job. No `NPM_TOKEN`. The filename is load-bearing twice. Compensators in `docs/npm-launcher.md` are complete, including the fifth row: cutting a GitHub release now publishes to npm.

`v0.8.0` handshook as `0.7.0`. The constant is `'0.8.1'` (`server.ts:42`) and the gate negative-tested the mismatch. `0.8.0` on npm keeps the wrong handshake; `0.8.1` is the one to install. Do not recode `0.8.0`.

## 4. The play shell is the Pages shell — **change**

This is the reason the package exists, and it is not in the tarball.

`ghost.ts` gates the local chrome on `import.meta.env.PROD`:

- `:316` seat status is empty in prod
- `:406` `probeVoice` does not run
- `:440` Ollama / Voice / model picker are not appended
- `:1010` `probeTags` does not run

`pnpm build:launcher` is `pnpm build` then a copy of `apps/cabinets/dist` (`package.json:23`, `scripts/build.mjs:38`). That is `vite build`. `PROD` is true. Pages uses the same build with a different `PLAY_BASE`. The launcher therefore serves the Pages chrome on loopback, plus two proxies and a say route nothing in the page will call.

Measured on the play bundle currently in `packages/launcher/dist/play/assets/index-B_B7cCnH.js` (212,711 bytes):

| Needle                              | Count | Meaning                                                                                                   |
| ----------------------------------- | ----- | --------------------------------------------------------------------------------------------------------- |
| `Ollama bosses` / ` Voice`          | 1 / 1 | Labels are constructed                                                                                    |
| `r.append(ho,J,u,h,g),r.append(_o)` | —     | Controls are Full screen, difficulty, Sound, feel, shake, Next. The three seat widgets are never appended |
| `/ollama/api/chat`                  | 1     | Fire-seat URL survived                                                                                    |
| `/cabinet/say`                      | 1     | Say-seat URL survived                                                                                     |
| `/api/tags`                         | 0     | Daemon probe was dropped                                                                                  |
| `api/generate`                      | 0     | Next-verb URL was dropped                                                                                 |
| `seat: looking for a daemon`        | 0     | Prod branch taken                                                                                         |

The CI smoke hits `/` 200, a sprite, a bed, `--mcp tools/list`, and a refused `/api/pull`. It does not ask whether the served page contains the Ollama checkbox. That is how both tags shipped the claim.

The proxies are not the product. The chrome is. Build the launcher shell with the seats on (`VITE_LOCAL_SEATS`, or a Vite mode that is not Pages), and add a smoke that greps the served HTML/JS for `Ollama bosses` as a mounted control — a string in the bundle is not enough; this bundle already has the string. Do not flip Pages to probe localhost. Do not unpublish `0.8.0` or `0.8.1`; this is the next patch.

## 5. Archivist is off the say view — **change**

`BOSS_KINDS` in the launcher (`serve.ts:33`) and in Vite (`vite.config.ts:17`) is `whisperer | menu | doorman`. The sim's kind is four (`types.ts:140`, `personas.ts:13`). `parseSeatView({ kind: 'archivist' })` is asserted `null` (`serve.test.ts:213`). On a shift, inspect closes with the Archivist; the say route 400s and the scripted floor plays (G14). That is not a lock break. It is one boss behind. Add `archivist` to both closed sets in the same sitting so they cannot drift. Do not invent a fifth.

## 6. Next-verb vs the allowlist — **change**

`askNextIntents` posts `/ollama/api/generate` (`ghost.ts:1054`). Both allowlists 404 that path on purpose (`allow.ts` comment at `:58`; Vite at `:90`; tests treat generate as a refused daemon call). In the published play bundle the URL is gone with the chrome (section 4). In `pnpm dev` the queue is a 404 every ask, which is script, never a stall (G13). Either move next-verb onto `/api/chat` (the fire seat already lives there) or add `POST /api/generate` to both allowlists as a seventh call. Do not do it only in the launcher. Generate is a completion, not pull/delete; the original refusal assumed the fire seat had left that path.

## 7. What I did not treat as a halt

- **HEAD on a file still streams the body.** Not a lock. Not this slice.
- **32 kB cap reused for proxied chat.** Fine for one tool call. Raise it when a measured model needs it, not from this review.
- **Motion is free text, capped at 80.** It is the phase word from `bosses.json`. The cap is the smuggle bound. Leave the set open.
- **GHCR still `:0.7.0`.** The READMEs are correct until an `0.8.x` image is pushed. Not a launcher defect.
- **`0.0.0` still on the version list.** Director's deprecate. Not a code change.

---

## What I changed

Nothing in `packages/ghost-on-the-menu` or `packages/tape-core`. No halt in this lane. This file is the commit.

The tracked-tree identity scan ran from the repo cwd and came back CLEAN. That owed item is closed.

## What Claude should change

1. **The launcher must ship the local seats.** A Vite define or a second build that is not Pages. Smoke that the served page mounts the Ollama checkbox, not that the string exists in the JS. This is the patch that makes the npm README true.
2. Add `archivist` to `BOSS_KINDS` in `packages/launcher/src/serve.ts` and `apps/cabinets/vite.config.ts` together.
3. Put next-verb on `/api/chat`, or allow `POST /api/generate` in both allowlists. Not one side.

Do not add a `dependencies` block to the launcher. Do not bind anything but loopback. Do not start slice 5, House Call, or an MCP shift tool from this review. Do not retag `v0.8.0` or `v0.8.1`.

EXTERNAL_VERIFIER can move from 1 to 2 once this file is in. It is still not 3: nothing adversarial read the published README, and the play-mode claim was not caught before either tag.

## For the Director

`--mcp` is the path that works as shipped. `npx @mcptoolshop/ghost-on-the-menu` without flags is the Pages game on loopback: the bosses fly their script, there is no Ollama box to tick, and the proxies sit unused. That is not what the package page says. The next version is the one that lights the seats; `0.8.1` can stay `latest` until then.

You still own two npm clicks: require 2FA and disallow tokens on the access page, and `npm deprecate @mcptoolshop/ghost-on-the-menu@0.0.0 "placeholder"`. `latest` is already `0.8.1`. Do not unpublish `0.8.0`; after 72 hours it can only be deprecated, and the wrong handshake is a reason if you want one.

Do not bump the README Docker tag until an `0.8.x` image is on GHCR. It correctly still says `0.7.0`.
