// release.yml runs small scripts inside single-quoted bash strings. An
// apostrophe anywhere inside one of those ends the string and the step dies
// with a bash syntax error at the last moment, on the release runner, after
// the version gate and the build have passed. It happened once (the first run
// of v0.11.0, over a comment that read "cabinet's"), so the rule is a test.
//
// The rule used to be written as "no apostrophe inside a `node -e` block",
// which is narrower than the hazard: the file also opens single-quoted blocks
// with `python3 -c`, and a line can open one with an echo or any other
// command. What is checked here is every multi-line single-quoted region,
// whatever opened it.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const FILE = path.resolve(__dirname, '../../../.github/workflows/release.yml');

/** One single-quoted region that runs past the end of its own line. */
export interface QuotedBlock {
  /** The one-based line that opened it. */
  line: number;
  /** The lines between the opener and whatever closed it. */
  body: string[];
  /** The line that carried the next quote, or null when nothing did. */
  closedBy: string | null;
}

/**
 * Every single-quoted region in the file that spans more than one line.
 *
 * A line opens one when it ends in a single quote and carries an odd number
 * of them, which is what `node -e '`, `python3 -c '` and `echo '` all look
 * like — and what `description: 'Pack and check'` (two quotes) and a YAML
 * comment about "PyPI's publishers" (a quote, but not at the end) do not.
 * The region then runs to the first later line carrying a quote at all: a
 * bare closing quote if the block is well formed, and otherwise the
 * apostrophe that is about to end the string early.
 */
export function quotedBlocks(yaml: string): QuotedBlock[] {
  const lines = yaml.split('\n');
  const out: QuotedBlock[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const opener = lines[i]!;
    if (!/'\s*$/.test(opener)) continue;
    if ((opener.match(/'/g) ?? []).length % 2 === 0) continue;
    const body: string[] = [];
    let closedBy: string | null = null;
    let j = i + 1;
    for (; j < lines.length; j += 1) {
      if (lines[j]!.includes("'")) {
        closedBy = lines[j]!;
        break;
      }
      body.push(lines[j]!);
    }
    out.push({ line: i + 1, body, closedBy });
    i = j;
  }
  return out;
}

/** A block is well formed when the next quote after it is the closing one. */
function closesProperly(block: QuotedBlock): boolean {
  return block.closedBy !== null && block.closedBy.trim().startsWith("'");
}

describe('release.yml', () => {
  const yaml = readFileSync(FILE, 'utf8');

  it('has multi-line single-quoted scripts, and each one is closed by its own quote', () => {
    const blocks = quotedBlocks(yaml);
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      expect(
        closesProperly(block),
        `the single-quoted block opened at line ${block.line} is ended by ` +
          `${block.closedBy === null ? 'nothing' : `"${block.closedBy.trim()}"`}, ` +
          'not by its own closing quote',
      ).toBe(true);
    }
  });

  it('covers the blocks that are not node, which the old rule walked past', () => {
    const openers = quotedBlocks(yaml).map((block) => yaml.split('\n')[block.line - 1] ?? '');
    expect(openers.some((line) => /node -e '\s*$/.test(line))).toBe(true);
    expect(openers.some((line) => /python3 -c '\s*$/.test(line))).toBe(true);
  });

  it('finds the apostrophe that broke the first run of the release', () => {
    const broken = yaml.replace(
      '// The typing cabinet recorded beds',
      "// The typing cabinet's recorded beds",
    );
    expect(broken).not.toBe(yaml);
    expect(quotedBlocks(broken).some((block) => !closesProperly(block))).toBe(true);
  });

  it('finds one in a block the old rule did not look at either', () => {
    // Inside the python block, which opens with `python3 -c '` rather than
    // `node -e '` and so was invisible to the rule this replaces.
    const broken = yaml.replace('"tools/list was"', '"the package\'s tools/list was"');
    expect(broken).not.toBe(yaml);
    expect(quotedBlocks(broken).some((block) => !closesProperly(block))).toBe(true);
  });
});
