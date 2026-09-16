// release.yml runs small node scripts inside single-quoted bash strings.
// An apostrophe anywhere inside one of those blocks ends the string and
// the step dies with a bash syntax error at the last moment, on the
// release runner, after the version gate and the build have passed. It
// happened once (the first run of v0.11.0, over a comment that read
// "cabinet's"), so the rule is a test: no apostrophe between a line that
// opens `node -e '` and the line that closes the quote.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const FILE = path.resolve(__dirname, '../../../.github/workflows/release.yml');

/**
 * Every single-quoted `node -e` block, as the lines between the opening
 * line and the first line whose text begins with the closing quote.
 */
export function nodeBlocks(yaml: string): { line: number; body: string[] }[] {
  const lines = yaml.split('\n');
  const out: { line: number; body: string[] }[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!/node -e '\s*$/.test(lines[i]!)) continue;
    const body: string[] = [];
    let j = i + 1;
    for (; j < lines.length; j += 1) {
      if (lines[j]!.trim().startsWith("'")) break;
      body.push(lines[j]!);
    }
    out.push({ line: i + 1, body });
    i = j;
  }
  return out;
}

describe('release.yml', () => {
  const yaml = readFileSync(FILE, 'utf8');

  it('has single-quoted node scripts, and none of them carries an apostrophe', () => {
    const blocks = nodeBlocks(yaml);
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      const bad = block.body.filter((line) => line.includes("'"));
      expect(bad, `an apostrophe inside the node -e block at line ${block.line}`).toEqual([]);
    }
  });

  it('finds the apostrophe that broke the first run of the release', () => {
    const broken = yaml.replace(
      '// The typing cabinet recorded beds',
      "// The typing cabinet's recorded beds",
    );
    const blocks = nodeBlocks(broken);
    expect(blocks.some((b) => b.body.some((line) => line.includes("'")))).toBe(true);
  });
});
