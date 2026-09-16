/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set at launcher pack time. Pages leaves this unset so local seats stay off. */
  readonly VITE_LOCAL_SEATS?: string;
  /**
   * Which cabinets this build carries: `all` (Pages, dev and the arcade
   * bundle), `ghost` or `vibe`. Always a literal in the bundle —
   * `vite.config.ts` defines it whether or not the environment sets it — so
   * Rollup folds the branch in `main.ts` and the cabinet that is not in this
   * build never enters the graph: not its mount, not its audio, not its cues.
   */
  readonly VITE_CABINET?: 'all' | 'ghost' | 'vibe';
}
