// Register seeds for the say prompt: three of the kind's own lines from
// voice.json, rotated by the say count so the model sees the register, not
// the same three lines every time. Browser-safe.

/** Three register seeds from the kind's own lines, rotated by the say count. */
export function seedLines(own: readonly string[], n: number): string[] {
  if (own.length === 0) return [];
  const out: string[] = [];
  for (let i = 0; i < Math.min(3, own.length); i++) out.push(own[(n + i) % own.length]!);
  return out;
}
