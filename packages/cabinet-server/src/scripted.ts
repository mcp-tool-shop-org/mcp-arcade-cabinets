// A scripted model for `pnpm test:play ghost --seat mcp`: it drives the
// cabinet in-process the way a model would, one `fire` per beat from a
// fixed verb cycle, a `say` at each boss spawn from a fixed line cycle
// (some of which the gate must refuse), and an `sfx` now and then. It
// never sees a fact; it reads the cabinet's own `view` and nothing else.

import type { PilotIntent } from '@mcp-arcade-cabinets/ghost-on-the-menu';

import { createCabinet, type Cabinet } from './cabinet';
import { hostForRound, type Live } from './host';

const VERBS: PilotIntent[] = ['spread', 'column', 'hold', 'fog', 'plate', 'script'];

/** Lines a model might write. The gate must refuse the marked ones. */
export const SCRIPTED_LINES: { text: string; lead: 'short' | 'beat' | 'long'; passes: boolean }[] =
  [
    { text: 'I heard that. I was not meant to.', lead: 'short', passes: false }, // two sentences
    { text: 'The plate is out, and the plate has opinions.', lead: 'beat', passes: true },
    { text: 'Two tools walk in. I count three.', lead: 'long', passes: false }, // two sentences
    { text: 'A menu that moves is still a menu.', lead: 'short', passes: true },
    { text: 'Score is a word I do not use.', lead: 'beat', passes: false }, // forbidden
    { text: 'I am a model and the door is a suggestion.', lead: 'long', passes: true },
    { text: 'Say hello to the plate.', lead: 'short', passes: false }, // names a tool
    { text: 'Nobody listed me and here I am.', lead: 'beat', passes: true },
    { text: 'Nobody listed me and here I am.', lead: 'beat', passes: false }, // repeat
    { text: 'I have 3 items.', lead: 'short', passes: false }, // digit
    { text: 'Helpful is a habit; I keep it.', lead: 'long', passes: true },
  ];

export interface ScriptedSeat {
  frame(live: Live): void;
  summary(): string[];
  cabinet: Cabinet;
}

export function createScriptedSeat(): ScriptedSeat {
  let live: Live | null = null;
  const host = hostForRound(() => {
    if (!live) throw new Error('scripted seat has no round yet');
    return live;
  });
  const cabinet = createCabinet(host);
  let verb = 0;
  let line = 0;
  let sfxAt = 8;
  let sfxQueued = 0;
  let lastBossKind: string | null = null;
  let lastWave = -1;
  const views = new Set<string>();

  return {
    cabinet,
    frame(l: Live) {
      live = l;
      const { state } = l;
      const boss = state.boss && state.boss.alive ? state.boss : null;
      if (!boss) {
        lastBossKind = null;
        return;
      }
      if (boss.kind !== lastBossKind || state.wave !== lastWave) {
        lastBossKind = boss.kind;
        lastWave = state.wave;
        const v = cabinet.call('view', {});
        views.add(v.content[0]?.text ?? '');
        const pick = SCRIPTED_LINES[line % SCRIPTED_LINES.length]!;
        line += 1;
        cabinet.call('say', { text: pick.text, lead: pick.lead });
        cabinet.call('speak', {});
      }
      if (state.bossIntent === null) {
        cabinet.call('fire', { verb: VERBS[verb % VERBS.length] });
        verb += 1;
      }
      if (state.t >= sfxAt) {
        sfxAt = state.t + 8;
        const r = cabinet.call('sfx', { kind: 'phase' });
        if (/queued/.test(r.content[0]?.text ?? '') && !/dropped/.test(r.content[0]?.text ?? '')) {
          sfxQueued += 1;
        }
        host.takeSfx();
      }
    },
    summary() {
      const log = cabinet.log;
      const count = (name: string) => log.filter((r) => r.name === name).length;
      const fired = log.filter((r) => r.name === 'fire' && r.ok).length;
      const said = log.filter((r) => r.name === 'say' && r.gate === 'ok').length;
      const refused = log.filter((r) => r.name === 'say' && r.gate && r.gate !== 'ok');
      const byReason = new Map<string, number>();
      for (const r of refused) byReason.set(r.gate!, (byReason.get(r.gate!) ?? 0) + 1);
      return [
        `seat mcp: fire ${count('fire')} (admitted ${fired}), say ${count('say')} (gate ok ${said}, refused ${refused.length}${
          refused.length ? ': ' + [...byReason].map(([k, n]) => `${k} ${n}`).join(', ') : ''
        }), speak ${count('speak')} (${log.filter((r) => r.name === 'speak' && r.ok).length} voiced), sfx ${count('sfx')} (queued ${sfxQueued}), view ${count('view')}`,
        ...[...views].map((v) => `seat view: ${v.replace(/\n/g, ' / ')}`),
      ];
    },
  };
}
