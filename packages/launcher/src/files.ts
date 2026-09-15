// Resolving a browser path to a file in the shipped shell.
//
// The launcher serves a directory inside its own npm package, so the only
// way out of it is a crafted path. `resolveUnder` is the one place that
// turn happens, and it answers null rather than a path whenever the result
// would leave the root — including through `..`, an absolute path, a
// backslash on Windows, or a percent-encoded form of any of those.

import path from 'node:path';

/** Content types for what the shell actually ships. */
const TYPES = new Map<string, string>([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.ico', 'image/x-icon'],
  ['.mp3', 'audio/mpeg'],
  ['.ogg', 'audio/ogg'],
  ['.wav', 'audio/wav'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
]);

/** The type for a file, or an octet-stream when we do not ship that kind. */
export function typeFor(file: string): string {
  return TYPES.get(path.extname(file).toLowerCase()) ?? 'application/octet-stream';
}

/**
 * The absolute path a request names inside `root`, or null when it names
 * anything else. `/` and any directory resolve to `index.html` under it.
 *
 * Decoding happens first, so `%2e%2e%2f` is judged as `../`. A path that
 * will not decode is refused rather than passed through raw.
 */
export function resolveUnder(root: string, urlPath: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  // A NUL truncates the name at the syscall; never let one reach it.
  if (decoded.includes('\0')) return null;
  // Vite writes forward slashes; a backslash here is only ever an attempt
  // to escape the root on Windows, where path.resolve treats it as one.
  if (decoded.includes('\\')) return null;
  const rel = decoded.replace(/^\/+/, '');
  const base = path.resolve(root);
  const target = path.resolve(base, rel === '' ? 'index.html' : rel);
  const inside = target === base || target.startsWith(base + path.sep);
  if (!inside) return null;
  return target;
}
