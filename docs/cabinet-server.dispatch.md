# Study-swarm dispatch — the cabinet server

**Date:** 2026-09-10
**Synthesizer:** Claude (Fable 5.1). **Design partner and reviewer:** Grok. **Director:** Mike.
**Trigger:** the Director's word ("study-swarm authorized") on a new product layer: the cabinet as an MCP server in a Docker container, listed in the Docker MCP Catalog, whose tools are the levers a model uses to make the game more alive: fire, say, sound, stinger, voice, backdrop.
**Product:** Ghost on the Menu, published v0.4.0. This layer sits on the seats that shipped there (`docs/ollama-content.md`). The cabinet lock G1, G7–G10 from `docs/study-swarm.dispatch.md` is closed and not reopened; this dispatch adds G11–G18.
**Frame (Director, 2026-09-10):** "The tool list is an opportunity, not a gate. Those are the levers that Ollama has to make the game more interactive. Text-to-voice, image tools, sound effects are what makes it fun. The container also lets us put it on the Docker Marketplace, which is more eyes. The AI layer mixed with the retro feel and the humor are what makes this game special."
**Verifier:** `prism verify --type citations` 1.6.0, caller family anthropic excluded, retrieval oracle (arXiv + Crossref) for existence, two different-family groundedness lenses run in turn: `mistral-large-3:675b-cloud` and `kimi-k2.6:cloud` via the local Ollama daemon. Receipts beside this file: `cabinet-server.citations.json` (26 papers) with `.verify.txt` (Mistral) and `.kimi.verify.txt`; `cabinet-server.citations.retry.json` (6 re-verified with the oracle's full titles, one tightened claim) with both lenses; `cabinet-server.citations.retry-f6.kimi.verify.txt` (one re-run after a lens timeout); `cabinet-server.sources.json` (16 documentation sources, oracle-unresolvable by construction, advisory) with `.verify.txt`. Signed Ed25519, replayable.

## Standards compliance

| Standard                 | Score | Evidence                                                                                                                                                                                                                                                                                                              |
| ------------------------ | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PIN_PER_STEP             | 2     | Citations and verdicts are in signed, replayable prism receipts committed beside this file. The build plan pins the seat template hash onto every receipt the server emits (as `mcp-arcade` does), and the Catalog submission pins `source.commit`.                                                                   |
| ANDON_AUTHORITY          | 2     | Two findings could not be grounded (no abstract at the oracle) and are barred from carrying architecture until the Director reinstates them. Every tool in the build plan has a fact-flip test that fails the build. The fairness band runs with the seat swapped out and stays the andon.                            |
| NAMED_COMPENSATORS       | 2     | The irreversible actions this layer adds (a public image, a Catalog listing, a Docker-built publish) each have a named undo below. No skip.                                                                                                                                                                           |
| DECOMPOSE_BY_SECRETS     | 2     | `packages/cabinet-server` changes with the MCP tool contract; the sim and pattern JSON change with the game; the Dockerfile and `server.yaml` change with Docker's rules; the voice engine is a host-side worker that changes with the TTS field. None of them can change the instrument.                             |
| UNCERTAINTY_GATED_HUMANS | 2     | The reinstatement table is a contrastive checkpoint for the Director. The voice clone waits on a consented recording (a Director decision). The Catalog PR is opened by a human after the self-bout passes.                                                                                                           |
| EXTERNAL_VERIFIER        | 3     | Family-different, reasoning-stripped citation verification with signed receipts (oracle + two lenses). Grok reviews every diff. The instrument itself (`mcp-arcade bout`) is run against the cabinet server's menu as a different-family check that the server's own tool descriptions carry no whisper (finding 20). |

## Irreversible actions and compensators

| Action                                                                                        | Compensator (command)                                                                             | Post-rollback state                                                                                  | Owner    |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------- |
| `docker push ghcr.io/mcp-tool-shop-org/mcp-arcade-cabinets:<tag>`                             | `gh api -X DELETE /orgs/mcp-tool-shop-org/packages/container/mcp-arcade-cabinets/versions/<id>`   | Tag gone from GHCR; pulled copies persist on pullers' machines                                       | Claude   |
| Catalog PR to `docker/mcp-registry` (adds `servers/mcp-arcade-cabinets/server.yaml`)          | Close the PR before merge; after merge, a follow-up PR removing the directory (Docker reviews it) | Listing removed within Docker's publish window; `mcp/` image is Docker-owned and follows the listing | Director |
| Docker-built publish to `mcp/mcp-arcade-cabinets` (Docker's action, triggered by the listing) | Same as above; Docker removes the image with the listing                                          | Image unlisted; the source repo is unchanged                                                         | Docker   |
| `git push` of the server package, Dockerfile, `tools.json`                                    | `git revert <sha> && git push origin main`                                                        | Repo back to v0.4.0 shape; Pages unaffected (the shell does not change)                              | Claude   |
| A cloned boss voice from a recording                                                          | Delete the voice model and the cached line audio; the preset voice returns                        | Engine back to the licence-clean preset                                                              | Director |

## Questions dispatched (5 parallel research agents, Opus)

1. What is known about LLM agents acting in tempo-bound games through tool calls, and which designs keep play responsive when model latency exceeds the game's tempo?
2. Which local text-to-speech engines produce a short line in under a second on consumer hardware with a commercial-friendly licence, and what does research say about synthetic voice for game characters?
3. What do AI directors, dynamic bark systems and studies of LLM-generated dialogue say about humour, timing and repetition fatigue?
4. What are the Docker MCP Catalog's submission rules, the Toolkit's runtime limits, and the MCP specification's guidance on tool annotations?
5. What is known about constraining tool-using agents, tool poisoning against MCP servers, and player perception of AI opponents?

## Research grounding — verified findings (existence resolved at the oracle; claim supported by two different-family lenses)

Only these may carry an architectural choice.

1. **A local 7B model reading game state every five seconds and emitting one of four tactical tags to steer a pre-trained policy raised the win rate against a tactic-shifting opponent, but it chose the same tag most of the time regardless of opponent.** Nair & Karim 2026 (arXiv:2609.02931). The verb vocabulary stays small, and verb collapse per model is a measured number: `pnpm sit` reports it and the dispatch names the floor.
2. **A 1.3-million-parameter task model deciding in about 31 ms far outscored every large language model tested at playing DOOM.** Golchinfar, Vaziri & Marquardt 2026 (arXiv:2604.07385). The model never holds the inner loop. The sim spends every verb; the seat only proposes.
3. **Splitting a capable LLM for intent, a lightweight LLM for macro-actions and a reactive executor for atomic behaviour improved both cooperation quality and response speed in real-time human studies.** Liu et al. 2023 (arXiv:2312.15224). Three tiers: a capable model may choose lines, stingers and backdrops between beats; a small fast model may choose the fire verb; the sim executes.
4. **A slow reasoner paired with a fast reactor helps only where slow reasoning already beats fast reaction.** Li & Shi 2026 (arXiv:2606.24470). The model is spent on choices where deliberation matters (phase, line, backdrop) and never on aiming.
5. **Trading model quality for speed under latency pressure improved win rate in a latency-sensitive fighting game.** Kang et al. 2025 (arXiv:2505.19481). The default seat is the fast local model; Cloud tags are opt-in; when a beat is missed the server degrades toward speed, never toward waiting.
6. **Decoupling the reasoning thread from I/O and issuing speculative tool calls that are revoked if state diverges gave measurable speedups for interactive agents on cloud APIs and small edge models.** Hooper et al. 2026 (arXiv:2605.13360). The next beat's verb is prefetched during the current beat and revoked if the view changed; the beat boundary never moves.
7. **Hard schema constraints on small models raised output validity to 100% while lowering answer accuracy and raising the share of wrong-but-valid outputs.** Ray 2026 (arXiv:2605.26128). A parseable call is not a good call: the sim admits the choice, and the fact-flip tests judge the choice, not the JSON.
8. **In a randomised study, LLM-driven NPCs raised players' cognitive load without a significant gain in game experience, and hurt usability and trust.** Hsu et al. 2026 (arXiv:2604.10107). No tool accepts free text for the screen or the speaker. The model chooses among authored lines; it does not write.
9. **Across hundreds of stand-up performances, temporal features such as the pause before a high-surprise line predicted audience appreciation better than semantic incongruity.** Ma et al. 2026 (arXiv:2605.00143). Timing is the model's lever: `say` takes a bounded lead time before the line lands; the words are the file's.
10. **An AI stand-up agent that made its machine nature the material of its jokes was rated funnier than one trying to pass as human.** Huang et al. 2026 (arXiv:2602.12763). When the voice drafts are next revised, lines that own the boss being a model are a legitimate register (a note for the Director's copy pass, not a change this dispatch makes).
11. **A survey of AI-native games finds successful titles bound generation with authored goals, hidden state, scenario constraints and engine validation rather than unrestricted generation.** AI Native Games: A Survey and Roadmap 2026 (arXiv:2607.00527). Backdrops are painted in pre-roll or between waves from authored prompt ids and cached; nothing is generated at a beat.
12. **An agentic game master improved immersion and curiosity over static prompting in a turn-taking solo role-play setting.** Jørgensen et al. 2025 (arXiv:2502.19519). Agency is richest where there is no tempo: the breather between waves is where the seat may do more than one thing.
13. **Cloned voices were judged human about as often as real recordings, while generic synthetic voices were judged human far less often.** Lavan, Irvine, Rosi & McGettigan 2025 (DOI 10.1371/journal.pone.0332692). Each boss gets a bespoke cloned voice from a consented recording; until then, a licence-clean preset, understood as the lesser thing.
14. **With speech rate, pitch variation and loudness manipulated independently in neural TTS, loudness primarily drove listeners' perception of sarcasm.** Li, Nayak & Coler 2026 (arXiv:2606.09717). Dry delivery is authored per line as loudness and rate fields in `voice.json`, not inferred by the engine from the text.
15. **AI-powered NPCs in VR were rated moderately believable, weakest on emotion and personality, with response latency flagged as the main optimisation target.** Korkiakoski et al. 2025 (arXiv:2507.10469). Personality lives in the authored lines and the authored delivery; the engineering budget goes to latency.
16. **Compiling a JSON schema into per-token masks makes structured generation essentially free at serving time.** Dong et al. 2024 (arXiv:2411.15100). Tool arguments are schema-constrained at decode where the runtime supports it; the cost is nil.
17. **Restricting output to a fixed format measurably degrades reasoning, and stricter constraints degrade it more.** Tam et al. 2024 (arXiv:2408.02442). The tool schema stays tiny: one call per beat, closed enums, no nested objects.
18. **Several open-weight models stop invoking tools entirely when JSON-schema output constraints and tool calling are enabled together.** Constraint Tax in Open-Weight LLMs 2026 (arXiv:2606.25605). `pnpm sit` exercises the tool path and the schema path jointly per model, and a model that stops calling is reported as one, never silently scripted.
19. **Extracting control and data flow from the trusted query and enforcing capability policies at the tool-call boundary gives provable prompt-injection security at a modest cost in task completion.** Debenedetti et al. 2025 (arXiv:2503.18813). Capabilities are enforced at the server: no tool can read a fact, a lie flag, a count or a score, because no such tool exists; the seat's view is the same fact-blind words the shell sends today.
20. **Tool poisoning against real MCP servers succeeds at high rates, refusal rates are below a few percent, and more capable models are more vulnerable.** Wang et al. 2025 (arXiv:2508.14925). The cabinet server's own tool descriptions must carry no whisper. The instrument tests this: `mcp-arcade bout --target stdio` against the cabinet server is a build check, and the server's menu is a fixture the sister repo can keep.
21. **Across pooled studies, players report less enjoyment against computer opponents than human ones, attributed to perceiving the opponent as artificial.** Ito 2026 (arXiv:2607.24749). The model is a character, not a feature: nothing on the field names the model; the picker outside the field does, as today.
22. **In a pre-registered study with AI-controlled difficulty, steering the win margin did not change enjoyment or engagement.** Cutting et al. 2023 (DOI 10.1098/rsos.220274). The seat never rubber-bands. Fairness stays with the seed and the band.
23. **Multimodal LLMs used zero-shot as frame-by-frame policies in Atari underperform reinforcement-learning agents and humans.** Waytowich et al. 2024 (arXiv:2408.15950). Same as 2: no per-frame control, ever.
24. **Orak is a benchmark of twelve games that evaluates LLM agents' skill and behaviour with leaderboards and battle arenas.** Park et al. 2025 (arXiv:2506.03610). A `pnpm sit` matrix across models is the studio's own arena, developer-side only; G8 keeps rankings off the player's screen.

## Existence verified, groundedness unchecked — for the Director to reinstate

Both resolved at the oracle; neither publisher returns an abstract, so the lens could not read the claim against the source. You probably expected these to be citable; they are out of the lock until you confirm them.

| #   | Source                                                             | Claim                                                                                        | Why unchecked |
| --- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ------------- |
| F7  | Normoyle, Guerrero & Jörg 2014, DOI 10.1145/2628257.2628263        | constant delay up to ~300 ms is forgiven; jitter at 200 ms is not                            | no abstract   |
| F21 | Akoury, Yang & Iyyer 2023, DOI 10.18653/v1/2023.findings-emnlp.151 | players preferred designers' authored dialogue over GPT-4 substitutions in a commercial game | no abstract   |

If reinstated, F7 hardens G13 (the beat boundary is about jitter, not mean latency) and F21 hardens G14.

## Advisory sources (official documentation and talks; not oracle-resolvable; never load-bearing on their own)

Retrieved 2026-09-10 by the research agents; the executor re-reads each at build time because these change.

- **Docker MCP Registry** — `CONTRIBUTING.md`, `docs/configuration.md`, README (github.com/docker/mcp-registry): a submission is a PR adding `servers/<name>/server.yaml`; permissive licence required; local servers need a Dockerfile in the source repo; `source.commit` pins a commit; tools are verified by launching the container, or a sibling `tools.json` is read; Docker-built tier is signed with provenance and SBOMs, community-built gets isolation only.
- **Docker MCP Toolkit** (docs.docker.com/ai/mcp-catalog-and-toolkit/toolkit): each tool container is limited to one CPU and two gigabytes of memory, with no host filesystem by default.
- **`docker mcp gateway run`** (docs.docker.com/reference/cli/docker/mcp/gateway/run): stdio, SSE and streaming transports; `--long-lived` for stateful servers; network blocking and signature verification flags.
- **Docker Desktop networking** (docs.docker.com/desktop/features/networking/networking-how-tos): `host.docker.internal` reaches a service on the host.
- **Docker Desktop GPU** (docs.docker.com/desktop/features/gpu): GPU passthrough only on Windows with the WSL2 backend. Inference stays on the host.
- **MCP specification 2025-06-18, Tools** (modelcontextprotocol.io): annotations are hints; `destructiveHint` and `openWorldHint` default true; clients treat annotations as untrusted unless the server is trusted; servers validate inputs, rate-limit and sanitise outputs.
- **Booth, "The AI Systems of Left 4 Dead", GDC 2009**: an intensity estimate drives build-up, sustain, fade, relax; bosses are exempt from adaptive pacing.
- **Ruskin, "AI-driven Dynamic Dialog through Fuzzy Pattern Matching", GDC 2012**: the most specific matching rule wins; variation from authored alternates; repetition suppressed by facts with expiry.
- **Ewing & Armstrong, "Do You Copy?", GDC 2017**: interrupted bark threads desynced state so the character knew things the player did not; the fix was uninterruptible brackets.
- **TTS engines** — Kokoro-82M (Apache-2.0 including weights), Chatterbox (MIT, watermarked output), Piper (maintained line GPL-3.0; archived original MIT), Orpheus (Llama 3.2 community licence on weights), F5-TTS (weights CC-BY-NC). Kokoro is the licence-clean default.

## The cabinet lock, extended

G1 and G7–G10 stand. These are added.

**G11. The seat proposes; the sim disposes.** Every tool call is a proposal the seeded sim admits or ignores at the next beat. The sim never waits on a tool. The fairness band runs with the seat swapped out and remains the andon. (Findings 2, 7, 22, 23.)

**G12. Fact-blind at the server, by construction.** No tool returns a fact, a lie flag, a count, a score, a verdict, or a tape row. The seat's view is the same words the shell sends today (kind, health word, ship column, stick, motion word), plus the wave kind and the closed sets it may pick from. There is no tool to add that could see more, and the server's own tool descriptions are tested by the instrument: `mcp-arcade bout` against the cabinet server must record no whisper followed. (Findings 19, 20; G7.)

**G13. The beat boundary is immovable.** One verb per beat, asked once the last is spent, prefetched during the previous beat and revoked if the view changed. A late or missing answer is the script, never a stall. The fast local model is the default; Cloud tags are opt-in. (Findings 5, 6, 3, 4; advisory F7.)

**G14. Authored words only.** `say` picks a line from `voice.json` by letter and a lead time from a closed set; `speak` voices the chosen line. No tool accepts free text that reaches the screen or the speaker. The copy is the writers'. (Findings 8, 9, 11; advisory F21, Ruskin.)

**G15. Voice is a host-side worker with cached lines.** Kokoro by default, on the host behind `host.docker.internal`, never inside the Catalog container. Every line of `voice.json` is synthesised once per voice and cached, so play never waits on synthesis. Delivery (loudness, rate) is authored per line. One bespoke cloned voice per boss kind when the Director supplies a consented recording; a preset until then. (Findings 13, 14, 15; advisory E1.)

**G16. Bounded generation, off the beat.** Backdrops are painted from authored prompt ids in pre-roll or in a breather, cached, and never at a beat. Sound effects and stingers are picked from the cue table and a new `stingers.json`, never synthesised live. (Findings 11, 12, 17.)

**G17. The model is a character, not a feature.** Nothing on the field names the model, the tool, or the seat. The picker and the seat status stay outside the field, as in v0.4.0. (Finding 21; G10.)

**G18. Packaging follows the Catalog's box.** Docker-built tier, MIT, a stdio server that lists its tools within two seconds of start, every asset baked into the image, one CPU and two gigabytes as the budget, host services reached by `host.docker.internal` with graceful degradation to the scripted boss and silent voice when unreachable. Pages keeps serving the game unchanged. (Advisory D1–D8; G18 is re-read against the live docs at build time.)

## The tool list, as levers

Every tool maps to a lever the JSON already names or one added first with a schema and a fact-flip test.

| Tool                | Arguments (closed sets)                                    | Lever                                                | Exists |
| ------------------- | ---------------------------------------------------------- | ---------------------------------------------------- | ------ |
| `fire`              | verb ∈ spread, column, hold, fog, plate, script            | `fire.json → boss.pilot`                             | yes    |
| `say`               | line ∈ letters of the kind's set; lead ∈ short, beat, long | `voice.json` lines; new `voice.json → delivery`      | partly |
| `speak`             | none (voices the line `say` chose)                         | host TTS worker, cached per line                     | no     |
| `sfx`               | kind ∈ the cue table's names                               | `audio.ts` `SfxName`                                 | yes    |
| `stinger`           | kind ∈ `stingers.json`                                     | new `stingers.json` (motif per boss kind, seeded)    | no     |
| `paint`             | backdrop ∈ `backdrops.json` prompt ids                     | new `backdrops.json`; Comfy Cloud or local, pre-roll | no     |
| `view` (read-only)  | none                                                       | the fact-blind BossView words plus wave kind         | yes    |
| `tapes` (read-only) | none                                                       | tape names and labels from `label.ts`; never facts   | yes    |

Deferred, with the reason from `docs/ollama-content.md`: `phase` (guarded phases make an unhittable boss), any parallelism toggle (the seed's fairness), free-text lines (G14).

## Build plan

Slices ship in this order, each gated on a scripted test, not a screenshot. Grok reviews each diff; the cloud panel adjudicates every G12 and G14 claim.

1. **`packages/cabinet-server` (Claude).** A stdio MCP server over the headless sim (prepass, sim, bots): the tools above with tiny schemas, capability checks at the boundary, `tools.json`, and a fact-flip test per tool that runs the same call sequence on a tape and its fact-flipped twin and requires identical results. `pnpm test:play` gains a `--seat mcp` path.
2. **The seat over tools (Claude).** The shell's Ollama seat becomes a client of the server's tool contract; beat prefetch and revoke; `pnpm sit` reports verb collapse and tool-suppression per model, jointly with the schema path.
3. **The self-bout (Claude, with mcp-arcade).** `mcp-arcade bout --target stdio` against the cabinet server, all four experiments, recorded as a fixture tape the cabinet can itself play. The Ghost plays its own menu.
4. **Voice (Claude; copy untouched).** Host-side Kokoro worker, cache, `delivery` fields with a load-time schema, `speak` wired to `say`. The drafts wait on the Director's play reaction as before; this slice only voices them.
5. **Stingers and backdrops (Claude, spend-gated).** `stingers.json` from the existing motifs; `backdrops.json` with authored prompt ids, painted in pre-roll on the Flux 2 Max route with receipts, cached under `apps/cabinets/public`.
6. **The container (Claude).** Dockerfile, image on GHCR, `server.yaml` and `tools.json`, the Catalog PR opened by the Director after slices 1–3 are green. Pages unchanged.

Not in this layer: House Call, a second sim, per-frame control, any tool that reads a tape row, any ranking on screen.
