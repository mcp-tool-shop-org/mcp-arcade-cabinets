// The launcher's proxy allowlists.
//
// `npx ghost-on-the-menu` puts a server on loopback, and the browser can
// reach every path it serves. The daemon behind `/ollama` and the worker
// behind `/voice` are not the browser's to command: only the paths the
// shell actually uses pass, and everything else is a 404 before any socket
// is opened. This is the same boundary the dev server draws in
// `apps/cabinets/vite.config.ts` (`devAllowlists`) — ported here because
// the published package has no Vite. Keep the two in step: a path added
// there and not here is a path that works in dev and 404s for a player.
//
// Pure on purpose. Every rule below is a test in `test/allow.test.ts`, and
// a proxy rule that cannot be unit-tested is a proxy rule nobody re-reads.

/** A proxied upstream, named by the prefix the browser sees. */
export type Upstream = 'ollama' | 'voice';

/** Prefixes the launcher proxies. Anything else is served from disk. */
export const PREFIXES: Record<Upstream, string> = {
  ollama: '/ollama',
  voice: '/voice',
};

/** The say seat's node-side route. Not a proxy: it runs in this process. */
export const SAY_PATH = '/cabinet/say';

/**
 * The endless seat's node-side route (G28 as slice 3 amends it). Not a
 * proxy either: the typing cabinet posts the level it is about to play and
 * this process asks the seated model for the request the player will type.
 */
export const ENDLESS_PATH = '/cabinet/endless';

/** Strip the query. Routing never reads it; the upstream still gets it. */
export function pathOnly(url: string | undefined): string {
  return (url ?? '/').split('?')[0] ?? '/';
}

/** The path as the upstream should see it, with the prefix removed. */
export function restAfter(prefix: string, url: string | undefined): string {
  const p = pathOnly(url);
  if (p === prefix) return '/';
  if (p.startsWith(`${prefix}/`)) {
    const rest = p.slice(prefix.length);
    return rest.startsWith('/') ? rest : `/${rest}`;
  }
  return p.startsWith('/') ? p : `/${p}`;
}

/** Which upstream a path belongs to, or null when it is a file request. */
export function upstreamFor(url: string | undefined): Upstream | null {
  const p = pathOnly(url);
  for (const [name, prefix] of Object.entries(PREFIXES) as [Upstream, string][]) {
    if (p === prefix || p.startsWith(`${prefix}/`)) return name;
  }
  return null;
}

/** A cached take, named by the hash the worker gave it. */
const AUDIO_RE = /^\/audio\/[a-f0-9]{8,64}\.wav$/i;

/**
 * Does this method and path reach the upstream? The listed pairs are the
 * ones the shell calls and no others: no pull, no delete, no create on
 * the daemon; generate is the next-verb seat. No arbitrary file read on
 * the worker. Keep in step with apps/cabinets/vite.config.ts.
 */
export function allowed(up: Upstream, method: string, rest: string): boolean {
  if (up === 'ollama') {
    if (method === 'GET' && rest === '/api/tags') return true;
    if (method === 'POST' && rest === '/api/chat') return true;
    if (method === 'POST' && rest === '/api/generate') return true;
    return false;
  }
  if (method === 'GET' && (rest === '/health' || rest === '/stats')) return true;
  if (method === 'POST' && rest === '/speak') return true;
  if (method === 'GET' && AUDIO_RE.test(rest)) return true;
  return false;
}
