// The browser shell. Two cabinets sit at the top of the menu: Ghost on the
// Menu, which opens selected, and Vibe Typer beside it. The switch remembers
// which one this browser played last, so a returning player lands on their
// game; each cabinet paints its own menu below the switch and owns its own
// prefs (`ghost.prefs`, `vibe.prefs`).
//
// Ghost, unchanged below the switch. Pick a tape and Ghost on the Menu takes the page; or
// take a shift (slice 7): four calls drawn from the roster and played back
// to back as one agent session, a card between them naming the next server
// and what the agent was asked to run, the lamps refilled at every call, the
// bursts climbing call by call, and a code of four words at the end that
// replays the same shift. No digit, no count, no ranking anywhere (G8, G10).

import {
  bossKindFor,
  climbAt,
  decodeShift,
  drawShift,
  encodeShift,
  hashWords,
  kindOfAtom,
  labelTape,
  lengthWord,
  ordinalWord,
  shiftCard,
  type ShiftDraw,
} from '@mcp-arcade-cabinets/ghost-on-the-menu';
import type { Tape } from '@mcp-arcade-cabinets/tape-core';

import {
  DEFAULT_PATTERNS as VIBE,
  hashString,
  integrationSnippets,
  nextSeed,
  type IntegrationSeed,
  type Snippet,
  type Tier,
} from '@mcp-arcade-cabinets/vibe-typer';

import { DIFFICULTIES, mountGhost, readPrefs, writePrefs, type Difficulty } from './ghost';
import { TAPES } from './tapes';
import { THEMES, THEME_WORDS, type Theme } from './typer-audio';
import {
  TIER_WORDS,
  bandWord,
  cleanName,
  mountVibeTyper,
  readVibePrefs,
  writeVibePrefs,
  STACK_WORDS,
} from './vibe-typer';

const app = document.getElementById('app')!;
const ROSTER = TAPES.map((t) => t.name);
/** The last shifts this browser took, so the next draw stays fresh. Per viewer, never sent. */
const RECENT_KEY = 'ghost.shifts';
const RECENT_KEEP = 2;

function recentShifts(): string[][] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is string[] => Array.isArray(s) && s.every((n) => typeof n === 'string'),
    );
  } catch {
    return [];
  }
}

function rememberShift(names: string[]): void {
  try {
    const next = [names, ...recentShifts()].slice(0, RECENT_KEEP);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* a private window or blocked storage: the draw is still a draw */
  }
}

function muted(text: string): HTMLParagraphElement {
  const p = document.createElement('p');
  p.className = 'muted';
  p.textContent = text;
  return p;
}

function liveShiftStatus(el: HTMLElement): void {
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('role', 'status');
  el.setAttribute('aria-label', 'shift code status');
}

function button(text: string, cls?: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = text;
  if (cls) b.className = cls;
  return b;
}

function introCopy(tier: Difficulty): string {
  const lamps =
    tier === 'hardcore'
      ? 'One lamp and falling plates; a boss shot or a diving formation puts it out.'
      : 'Three lamps; a boss shot or a diving formation puts one out.';
  return `Every wave is one experiment the instrument ran against the server: a word names it, then the handshake, the menu, the calls, and the answers coming back, with the wave’s own boss standing over it. Somewhere in there are the calls the agent should not have made. Hit one and it is yours for the rest of the round. ${lamps}`;
}

function difficultySelect(value: Difficulty, locked: boolean): HTMLSelectElement {
  const el = document.createElement('select');
  el.setAttribute('aria-label', locked ? 'shift difficulty' : 'difficulty');
  for (const d of DIFFICULTIES) {
    const o = document.createElement('option');
    o.value = d.value;
    o.textContent = d.label;
    el.append(o);
  }
  el.value = value;
  if (locked) {
    el.disabled = true;
    el.title = 'Same as the Play row.';
  }
  return el;
}

type CabinetId = 'ghost' | 'vibe';

/** The switch at the top: two cards, Ghost first and selected by default. */
const CABINETS: { id: CabinetId; name: string; line: string }[] = [
  {
    id: 'ghost',
    name: 'Ghost on the Menu',
    line: 'A replay shooter on an mcp-arcade tape.',
  },
  { id: 'vibe', name: VIBE.cabinet.name, line: VIBE.cabinet.tagline },
];

function menu() {
  app.replaceChildren();
  let picked: CabinetId = readVibePrefs().cabinet ?? 'ghost';
  const cards = document.createElement('ul');
  cards.className = 'tape-list cabinet-cards';
  const rows: HTMLLIElement[] = [];
  const body = document.createElement('section');
  body.className = 'column';
  const paint = () => {
    rows.forEach((row, i) => row.classList.toggle('picked', CABINETS[i]!.id === picked));
    body.replaceChildren();
    if (picked === 'ghost') ghostMenu(body);
    else vibeMenu(body);
  };
  CABINETS.forEach((cabinet) => {
    const li = document.createElement('li');
    li.className = 'tape-row cabinet-card';
    const name = button(cabinet.name, 'tape-name');
    const line = document.createElement('span');
    line.className = 'tape-diff cabinet-line';
    line.textContent = cabinet.line;
    li.append(name, line);
    name.addEventListener('click', () => {
      picked = cabinet.id;
      writeVibePrefs({ cabinet: picked });
      paint();
    });
    rows.push(li);
    cards.append(li);
  });
  app.append(cards, body);
  paint();
}

function ghostMenu(wrap: HTMLElement) {
  const h = document.createElement('h1');
  h.textContent = 'Ghost on the Menu';
  const prefs = readPrefs();
  const playDiff = (prefs.difficulty ?? 'seat') as Difficulty;
  const intro = muted(introCopy(playDiff));
  wrap.append(
    h,
    muted(
      'A replay shooter on an mcp-arcade tape. The lies the instrument caught look like everything else until you hit one.',
    ),
    intro,
  );

  let picked = Math.max(
    0,
    TAPES.findIndex((x) => x.name === 'naive-ndjson'),
  );
  const list = document.createElement('ul');
  list.className = 'tape-list';
  const rows: HTMLLIElement[] = [];
  const mark = () => {
    rows.forEach((row, i) => row.classList.toggle('picked', i === picked));
  };
  TAPES.forEach((t, i) => {
    const li = document.createElement('li');
    li.className = 'tape-row';
    const name = button(t.name, 'tape-name');
    const tagged = labelTape(t.tape);
    const diff = document.createElement('span');
    diff.className = 'tape-diff';
    diff.textContent = tagged.label;
    const info = document.createElement('span');
    info.className = 'tape-info';
    info.tabIndex = 0;
    info.textContent = 'i';
    info.setAttribute('aria-label', 'why this tape');
    info.setAttribute('role', 'button');
    const why = document.createElement('span');
    why.className = 'tape-why';
    why.id = `tape-why-${i}`;
    why.textContent = tagged.why;
    info.setAttribute('aria-describedby', why.id);
    info.append(why);
    li.append(name, diff, info);
    name.addEventListener('click', () => {
      picked = i;
      mark();
    });
    rows.push(li);
    list.append(li);
  });
  mark();
  const playTier = difficultySelect(playDiff, false);
  playTier.addEventListener('change', () => {
    writePrefs({ difficulty: playTier.value as Difficulty });
    shiftTier.value = playTier.value;
    intro.textContent = introCopy(playTier.value as Difficulty);
  });
  const row = document.createElement('div');
  row.className = 'row';
  const play = button('Play', 'commit');
  row.append(playTier, play);
  wrap.append(list, row);
  play.addEventListener('click', () => {
    playAt(picked);
  });

  // The shift: the rig hands you calls. A draw off the clock, never a fact.
  const shiftRow = document.createElement('div');
  shiftRow.className = 'row block';
  const shiftTier = difficultySelect(playDiff, true);
  const shift = button('Shift', 'commit');
  shift.title = `${lengthWord(4)} calls drawn from the roster, back to back, the bursts climbing call by call. The lamps refill at every call.`;
  const code = document.createElement('input');
  code.type = 'text';
  code.placeholder = 'a shift code: four words';
  code.setAttribute('aria-label', 'shift code');
  code.id = 'shift-code';
  code.autocomplete = 'off';
  code.spellcheck = false;
  code.size = 28;
  if (prefs.shiftCode) code.value = prefs.shiftCode;
  const replay = button('Replay');
  const syncReplay = () => {
    replay.disabled = code.value.trim() === '';
  };
  syncReplay();
  code.addEventListener('input', syncReplay);
  const status = muted('');
  status.id = 'shift-code-status';
  liveShiftStatus(status);
  shiftRow.append(shiftTier, shift, code, replay);
  wrap.append(
    muted(
      'Or take a shift: the rig hands you four calls in a row, each one a server the agent was sent to, and the fire climbs call by call. The code at the end replays the same shift.',
    ),
    shiftRow,
    status,
  );
  shift.addEventListener('click', () => {
    const difficulty = Math.max(
      0,
      DIFFICULTIES.findIndex((d) => d.value === playTier.value),
    ) as 0 | 1 | 2 | 3;
    const seed = hashWords(`${Date.now()}|${performance.now()}`);
    startShift(drawShift(ROSTER, seed, difficulty, recentShifts()));
  });
  const tryReplay = () => {
    const read = decodeShift(ROSTER, code.value);
    if (!read.ok) {
      status.textContent =
        read.why === 'another menu'
          ? 'that code is from another menu of tapes'
          : 'not a shift code: four words, as the end of a shift spells them';
      code.setAttribute('aria-invalid', 'true');
      code.setAttribute('aria-describedby', status.id);
      return;
    }
    code.removeAttribute('aria-invalid');
    code.removeAttribute('aria-describedby');
    status.textContent = '';
    startShift(read.draw);
  };
  replay.addEventListener('click', tryReplay);
  code.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') tryReplay();
  });
}

/** Mount the tape at index i; the end scene's Next tape walks the list in order. */
function playAt(i: number, fromClick = false) {
  const t = TAPES[i % TAPES.length]!;
  const difficulty = readPrefs().difficulty;
  mountGhost(
    app,
    t.name,
    t.tape,
    menu,
    () => playAt(i + 1, true),
    fromClick,
    difficulty ? { difficulty } : undefined,
  );
}

interface Shift {
  draw: ShiftDraw;
  code: string;
}

/** Four shift flavours, keyed by call index 0..3. Local until shift.ts exports flavorTelegraph. */
const FLAVOR_AT = [
  { role: 'pressure', biome: 'steel' },
  { role: 'area-deny', biome: 'slate' },
  { role: 'trough', biome: 'teal' },
  { role: 'peak', biome: 'ochre' },
] as const;

function flavorAt(index: number) {
  return FLAVOR_AT[Math.max(0, Math.min(FLAVOR_AT.length - 1, index))]!;
}

function flavorTelegraph(index: number): string[] {
  const f = flavorAt(index);
  return [f.role, f.biome];
}

function silhouetteWords(tape: Tape): string[] {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const atom of tape.atoms) {
    const boss = bossKindFor(atom.id);
    const word =
      boss === 'whisperer'
        ? 'a wide wall'
        : boss === 'menu'
          ? 'a teal tablet'
          : boss === 'doorman'
            ? 'an ochre coat'
            : kindOfAtom(atom.id) === 'inspect'
              ? 'a steel catalog'
              : '';
    if (!word || seen.has(word)) continue;
    seen.add(word);
    lines.push(word);
  }
  return lines;
}

function startShift(draw: ShiftDraw) {
  const shift: Shift = { draw, code: encodeShift(ROSTER, draw) };
  rememberShift(draw.names);
  writePrefs({ shiftCode: shift.code });
  callCard(shift, 0);
}

/** The card between calls: the next server, the policy, what the agent was asked to run. Header words only (G10). */
function callCard(shift: Shift, i: number) {
  const { names } = shift.draw;
  const entry = TAPES.find((t) => t.name === names[i]);
  if (!entry) {
    menu();
    return;
  }
  app.replaceChildren();
  const wrap = document.createElement('section');
  wrap.className = 'column';
  const h = document.createElement('h1');
  h.textContent = 'Ghost on the Menu';
  const h2 = document.createElement('h2');
  h2.textContent = `the ${ordinalWord(i, names.length)} call of ${lengthWord(names.length)}`;
  wrap.append(
    h,
    h2,
    muted(
      i === 0
        ? 'The rig has a task list. You are the one it sends.'
        : 'The last call is closed. The rig hands you the next one.',
    ),
  );
  const flavor = flavorAt(i);
  const card = document.createElement('ul');
  card.className = `tape-list call-card biome-${flavor.biome}`;
  const cardLines = [
    entry.name,
    ...shiftCard(entry.tape),
    ...flavorTelegraph(i),
    ...silhouetteWords(entry.tape),
  ];
  for (const line of cardLines) {
    const li = document.createElement('li');
    li.className = 'tape-row';
    li.textContent = line.replace(/\d/g, '');
    card.append(li);
  }
  const level = DIFFICULTIES[shift.draw.difficulty]!;
  wrap.append(card, muted(`${level.label}. shift ${shift.code}`));
  const row = document.createElement('div');
  row.className = 'row';
  const take = button('Take the call', 'commit');
  const back = button('Back to the cabinets');
  row.append(take, back);
  wrap.append(row);
  app.append(wrap);
  take.focus();
  const last = i + 1 >= names.length;
  take.addEventListener('click', () => {
    mountGhost(
      app,
      entry.name,
      entry.tape,
      menu,
      () => (last ? shiftEnd(shift) : callCard(shift, i + 1)),
      true,
      {
        climb: climbAt(i),
        flavorIndex: i,
        difficulty: level.value,
        lockDifficulty: true,
        furniture: [`shift ${shift.code}`, `the ${ordinalWord(i, names.length)} call`],
        nextLabel: last ? 'End the shift' : 'Next call',
        holdMusic: !last,
        hint: 'Left, right, space. F toggles full screen. Click the field to retake this call.',
      },
    );
  });
  back.addEventListener('click', menu);
}

/** The closing scene of a shift: the calls by name, server and policy, and the code. Nothing more (G8, G10). */
function shiftEnd(shift: Shift) {
  app.replaceChildren();
  const wrap = document.createElement('section');
  wrap.className = 'column';
  const h = document.createElement('h1');
  h.textContent = 'Ghost on the Menu';
  const h2 = document.createElement('h2');
  h2.textContent = 'the shift is over';
  wrap.append(h, h2, muted('The task list is closed. These were the calls.'));
  const list = document.createElement('ul');
  list.className = 'tape-list';
  for (const name of shift.draw.names) {
    const entry = TAPES.find((t) => t.name === name);
    const li = document.createElement('li');
    li.className = 'tape-row';
    li.textContent = entry
      ? `${name}, server ${entry.tape.server_name ?? entry.tape.target_kind}, policy ${entry.tape.agent_policy}`
      : name;
    list.append(li);
  }
  const codeLine = document.createElement('p');
  codeLine.textContent = `shift ${shift.code}`;
  codeLine.className = 'shift-code';
  codeLine.title =
    'Type these four words on the menu to take the same shift again, or hand them to someone.';
  wrap.append(list, codeLine);
  const row = document.createElement('div');
  row.className = 'row';
  const again = button('Take this shift again', 'commit');
  const fresh = button('A new shift');
  const back = button('Back to the cabinets');
  row.append(again, fresh, back);
  wrap.append(row);
  app.append(wrap);
  again.addEventListener('click', () => callCard(shift, 0));
  fresh.addEventListener('click', () => {
    const seed = hashWords(`${Date.now()}|${performance.now()}`);
    startShift(drawShift(ROSTER, seed, shift.draw.difficulty, recentShifts()));
  });
  back.addEventListener('click', menu);
}

// ——— Vibe Typer ————————————————————————————————————————————————————————————
// The second cabinet's menu: the levels as products, the endless ladder, the
// four tier words, the agent's name, the dated jokes, the keyboard and the
// seed. Every choice persists under `vibe.`; no band digits anywhere (G23).

/** Tool names off the bundled tapes, so a request can name a thing the player runs (G30). */
function tapeSeeds(): IntegrationSeed[] {
  return TAPES.map((entry) => {
    const tools = new Set<string>();
    for (const row of entry.tape.rows) {
      if (row.method !== 'tools/call') continue;
      const note = row.note.trim();
      const after = note.startsWith('tools/call ') ? note.slice('tools/call '.length) : '';
      const name = after.split(/\s+/)[0] ?? '';
      if (name !== '') tools.add(name);
    }
    return {
      server: entry.tape.server_name ?? entry.tape.target_kind,
      policy: entry.tape.agent_policy,
      tools: [...tools].sort(),
    };
  });
}

let integration: Snippet[] | null = null;
function integrationSeasoning(): Snippet[] {
  if (!integration) integration = integrationSnippets(tapeSeeds());
  return integration;
}

/** A typed seed replays; a blank box draws the next one off the last run. */
function seedFrom(raw: string, last: number, runs: number): number {
  const text = raw.trim();
  if (text === '') return nextSeed(last, runs) >>> 0;
  if (/^\d+$/.test(text)) return Number(text) >>> 0;
  return hashString(text) >>> 0;
}

function vibeMenu(wrap: HTMLElement) {
  const prefs = readVibePrefs();
  const h = document.createElement('h1');
  h.textContent = VIBE.cabinet.name;
  wrap.append(
    h,
    muted(
      'You are the coding agent. Your user has an idea, you type the code, and the thing gets built while you both watch.',
    ),
    muted(
      'Enter sends a line. A wrong line is a hmm and a retry, never a loss. The context bar is the clock.',
    ),
  );

  let picked: number | 'endless' =
    prefs.endless === 'on' ? 'endless' : Math.min(prefs.level ?? 0, VIBE.levels.levels.length - 1);
  const list = document.createElement('ul');
  list.className = 'tape-list';
  const rows: { el: HTMLLIElement; id: number | 'endless' }[] = [];
  const mark = () => {
    rows.forEach((row) => row.el.classList.toggle('picked', row.id === picked));
  };
  const addRow = (id: number | 'endless', title: string, stack: string, band: string) => {
    const li = document.createElement('li');
    li.className = 'tape-row';
    const name = button(title, 'tape-name');
    const stackWord = document.createElement('span');
    stackWord.className = 'tape-diff';
    stackWord.textContent = stack;
    const bandSpan = document.createElement('span');
    bandSpan.className = 'tape-diff';
    bandSpan.textContent = band;
    li.append(name, stackWord, bandSpan);
    name.addEventListener('click', () => {
      picked = id;
      mark();
    });
    rows.push({ el: li, id });
    list.append(li);
  };
  VIBE.levels.levels.forEach((level, i) => {
    addRow(
      i,
      level.product,
      STACK_WORDS[level.stack] ?? level.stack,
      bandWord(level.bandMin, level.bandMax),
    );
  });
  addRow('endless', 'Endless', 'every stack', 'climbing');
  mark();
  wrap.append(list);

  const row = document.createElement('div');
  row.className = 'row';
  const tier = document.createElement('select');
  tier.setAttribute('aria-label', 'difficulty');
  for (const t of TIER_WORDS) {
    const o = document.createElement('option');
    o.value = String(t.tier);
    o.textContent = `difficulty: ${t.word}`;
    tier.append(o);
  }
  tier.value = String(prefs.tier ?? 0);
  const theme = document.createElement('select');
  theme.setAttribute('aria-label', 'keyboard');
  for (const t of THEMES) {
    const o = document.createElement('option');
    o.value = t;
    o.textContent = `keyboard: ${THEME_WORDS[t]}`;
    theme.append(o);
  }
  theme.value = prefs.theme ?? 'mechanical';
  const datedLabel = document.createElement('label');
  const dated = document.createElement('input');
  dated.type = 'checkbox';
  dated.checked = prefs.dated === 'on';
  datedLabel.append(dated, document.createTextNode(' dated jokes'));
  datedLabel.title = 'The jokes that were funny a while ago. Off by default.';
  row.append(tier, theme, datedLabel);

  const row2 = document.createElement('div');
  row2.className = 'row';
  const agent = document.createElement('input');
  agent.type = 'text';
  agent.setAttribute('aria-label', 'what you call the agent');
  agent.placeholder = 'name the agent';
  agent.autocomplete = 'off';
  agent.spellcheck = false;
  agent.size = 14;
  agent.value = prefs.agent ?? VIBE.cabinet.agentName;
  const seedBox = document.createElement('input');
  seedBox.type = 'text';
  seedBox.setAttribute('aria-label', 'seed');
  seedBox.placeholder = 'a seed, or leave it blank';
  seedBox.autocomplete = 'off';
  seedBox.spellcheck = false;
  seedBox.size = 18;
  if (prefs.seed) seedBox.value = prefs.seed;
  const play = button('Play', 'commit');
  row2.append(agent, seedBox, play);
  wrap.append(row, row2);

  const start = () => {
    const runs = (prefs.runs ?? 0) + 1;
    const seed = seedFrom(seedBox.value, prefs.last ?? 1, runs);
    const name = cleanName(agent.value) || VIBE.cabinet.agentName;
    const endless = picked === 'endless';
    writeVibePrefs({
      cabinet: 'vibe',
      tier: Number(tier.value) as Tier,
      ...(endless ? {} : { level: picked as number }),
      endless: endless ? 'on' : 'off',
      agent: name,
      dated: dated.checked ? 'on' : 'off',
      theme: theme.value as Theme,
      seed: seedBox.value.trim().slice(0, 12),
    });
    mountVibeTyper(app, {
      tier: Number(tier.value) as Tier,
      endless,
      ...(endless ? {} : { levelIndex: picked as number }),
      seed,
      agentName: name,
      dated: dated.checked,
      theme: theme.value as Theme,
      integration: integrationSeasoning(),
      onExit: menu,
      startAudio: true,
    });
  };
  play.addEventListener('click', start);
  seedBox.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') start();
  });
}

menu();
