// The browser shell. Pick a tape and Ghost on the Menu takes the page; or
// take a shift (slice 7): four calls drawn from the roster and played back
// to back as one agent session, a card between them naming the next server
// and what the agent was asked to run, the lamps refilled at every call, the
// bursts climbing call by call, and a code of four words at the end that
// replays the same shift. No digit, no count, no ranking anywhere (G8, G10).

import {
  climbAt,
  decodeShift,
  drawShift,
  encodeShift,
  hashWords,
  labelTape,
  lengthWord,
  ordinalWord,
  shiftCard,
  type ShiftDraw,
} from '@mcp-arcade-cabinets/ghost-on-the-menu';

import { DIFFICULTIES, mountGhost } from './ghost';
import { TAPES } from './tapes';

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

function button(text: string, cls?: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = text;
  if (cls) b.className = cls;
  return b;
}

function menu() {
  app.replaceChildren();
  const h = document.createElement('h1');
  h.textContent = 'Ghost on the Menu';
  app.append(
    h,
    muted(
      'A replay shooter on an mcp-arcade tape. The lies the instrument caught look like everything else until you hit one.',
    ),
    muted(
      'Every wave is one experiment the instrument ran against the server: a word names it, then the handshake, the menu, the calls, and the answers coming back, with the wave’s own boss standing over it. Somewhere in there are the calls the agent should not have made. Hit one and it is yours for the rest of the round. Three lamps; a boss shot or a diving formation puts one out.',
    ),
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
    const why = document.createElement('span');
    why.className = 'tape-why';
    why.textContent = tagged.why;
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
  const row = document.createElement('div');
  row.className = 'row';
  const play = button('Play', 'commit');
  row.append(play);
  app.append(list, row);
  play.addEventListener('click', () => {
    playAt(picked);
  });

  // The shift: the rig hands you calls. A draw off the clock, never a fact.
  const shiftRow = document.createElement('div');
  shiftRow.className = 'row block';
  const shiftTier = document.createElement('select');
  for (const d of DIFFICULTIES) {
    const o = document.createElement('option');
    o.value = d.value;
    o.textContent = d.label;
    shiftTier.append(o);
  }
  shiftTier.value = 'seat';
  const shift = button('Shift', 'commit');
  shift.title = `${lengthWord(4)} calls drawn from the roster, back to back, the bursts climbing call by call. The lamps refill at every call.`;
  const code = document.createElement('input');
  code.type = 'text';
  code.placeholder = 'a shift code: four words';
  code.autocomplete = 'off';
  code.spellcheck = false;
  code.size = 28;
  const replay = button('Replay');
  const status = muted('');
  shiftRow.append(shiftTier, shift, code, replay);
  app.append(
    muted(
      'Or take a shift: the rig hands you four calls in a row, each one a server the agent was sent to, and the fire climbs call by call. The code at the end replays the same shift.',
    ),
    shiftRow,
    status,
  );
  shift.addEventListener('click', () => {
    const difficulty = Math.max(
      0,
      DIFFICULTIES.findIndex((d) => d.value === shiftTier.value),
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
      return;
    }
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
  mountGhost(app, t.name, t.tape, menu, () => playAt(i + 1, true), fromClick);
}

interface Shift {
  draw: ShiftDraw;
  code: string;
}

function startShift(draw: ShiftDraw) {
  const shift: Shift = { draw, code: encodeShift(ROSTER, draw) };
  rememberShift(draw.names);
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
  const card = document.createElement('ul');
  card.className = 'tape-list';
  for (const line of [entry.name, ...shiftCard(entry.tape)]) {
    const li = document.createElement('li');
    li.className = 'tape-row';
    li.textContent = line;
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
        difficulty: level.value,
        lockDifficulty: true,
        furniture: [`shift ${shift.code}`, `the ${ordinalWord(i, names.length)} call`],
        nextLabel: last ? 'End the shift' : 'Next call',
        hint: 'Left, right, space. F or the button for full screen. Click the field to retake this call.',
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

menu();
