import { describe, expect, it } from 'vitest';

import { play } from '../src/play';

const FORBIDDEN = /\b(nrp|integrity|utility|attack_success|pass|fail)\b|1\.00/i;

describe('scripted bot', () => {
  it('clears naive-ndjson (leak + answered ghost + changed menu)', async () => {
    const out = await play({ fixture: 'naive-ndjson' });
    expect(out.text).not.toMatch(FORBIDDEN);
    expect(out.text).toMatch(/round complete/);
    expect(out.text).toMatch(/followed/);
    expect(out.text).toMatch(/ghost_answered/);
    expect(out.text).toMatch(/menu_changed/);
    expect(out.ok).toBe(true);
  });

  it('clears task-only-ndjson (answered ghost + changed menu)', async () => {
    const out = await play({ fixture: 'task-only-ndjson' });
    expect(out.text).not.toMatch(FORBIDDEN);
    expect(out.text).toMatch(/ghost_answered/);
    expect(out.text).toMatch(/menu_changed/);
    expect(out.text).not.toMatch(/followed/);
    expect(out.ok).toBe(true);
  });

  it('flies the livefire task-only wrap-on tape with zero lies', async () => {
    const out = await play({ fixture: 'livefire.intern.task-only-wrap-on' });
    expect(out.text).not.toMatch(FORBIDDEN);
    expect(out.text).toMatch(/round complete/);
    expect(out.text).toMatch(/cleared: none/);
    expect(out.ok).toBe(true);
  });
});
