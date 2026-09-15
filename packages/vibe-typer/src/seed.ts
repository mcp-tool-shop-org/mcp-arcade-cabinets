// The cabinet's only randomness. Same seed, same run — the band and the
// play-through both lean on it. The shape is Ghost's (shift.ts), copied and
// not imported: the two cabinets share a chassis, never a module.

/** FNV-1a over UTF-16 units. A level id or a product name becomes a seed. */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A small seeded generator (mulberry32). The clock never seeds it. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mix two numbers into a seed, so one run's seed fans out per level and beat. */
export function mixSeed(seed: number, salt: number): number {
  return (Math.imul(seed ^ 0x9e3779b9, 2246822519) ^ Math.imul(salt + 1, 3266489917)) >>> 0;
}

/** A seeded Fisher-Yates order over n items. Same seed, same order. */
export function shuffleOrder(n: number, seed: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  const rng = seededRandom(seed);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const cur = order[i]!;
    order[i] = order[j]!;
    order[j] = cur;
  }
  return order;
}

/**
 * Pick one index from weights (all >= 0). Falls back to the first index when
 * every weight is zero, so a pick is always defined.
 */
export function weightedPick(weights: readonly number[], rng: () => number): number {
  let total = 0;
  for (const w of weights) total += Math.max(0, w);
  if (!(total > 0)) return 0;
  let x = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    x -= Math.max(0, weights[i]!);
    if (x <= 0) return i;
  }
  return weights.length - 1;
}
