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

import {
  DIFFICULTIES,
  difficultyWord,
  forgetTape,
  mountGhost,
  readPrefs,
  wordsOnly,
  writePrefs,
  type Difficulty,
} from './ghost';
import { coarsePointer } from './pointer';
import { TAPES } from './tapes';
import {
  DEFAULT_MUSIC,
  isMusicMode,
  MUSIC_MODES,
  THEMES,
  THEME_WORDS,
  type Theme,
} from './typer-audio';
import { LOCAL_SEATS, probeSeatName } from './seats';
import {
  DEFAULT_FONT,
  TIER_WORDS,
  VIBE_FONTS,
  bandWord,
  cleanName,
  forgetVibePick,
  isVibeFont,
  menuStackGroups,
  mountVibeTyper,
  readVibePrefs,
  SEED_MAX,
  writeVibePrefs,
  STACK_WORDS,
} from './vibe-typer';

// The page's own root. The bootstrap at the bottom of this file is what the
// page runs; a test that imports the menu alone has no `#app` and runs none
// of it.
const root = document.getElementById('app');
const app = root!;
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

/**
 * What a cabinet asks for on glass, said before the player presses Play.
 *
 * Both cabinets are dressed for a phone and neither said a word about what
 * playing one there is like, so a player found out by pressing Play. The line
 * is gated on a coarse pointer, so a mouse never reads it, and it names the
 * affordance that cabinet grew rather than only warning them off.
 */
function phoneLine(text: string): HTMLParagraphElement {
  const p = muted(text);
  p.classList.add('phone-note');
  return p;
}

function button(text: string, cls?: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = text;
  if (cls) b.className = cls;
  return b;
}

/**
 * What a round is, in two paragraphs rather than one.
 *
 * It was ninety words in one unbroken block, the third `.muted` paragraph in
 * a row above a twenty-row list, at about eighty characters a line — well
 * above a comfortable measure. It breaks where the subject changes: what a
 * wave is and what is hidden in it, then what it costs you. Only the second
 * part moves with the rung, which is why the two are separate functions and
 * the difficulty handler rewrites one node.
 */
const INTRO_COPY =
  'Every wave is one experiment the instrument ran against the server: a word names it, then the handshake, the menu, the calls, and the answers coming back, with the wave’s own boss standing over it. Somewhere in there are the calls the agent should not have made.';

function lampsCopy(tier: Difficulty): string {
  const lamps =
    tier === 'hardcore'
      ? 'One lamp and falling plates; a boss shot or a diving formation puts it out.'
      : 'Three lamps; a boss shot or a diving formation puts one out.';
  return `Hit one and it is yours for the rest of the round. ${lamps}`;
}

function difficultySelect(value: Difficulty): HTMLSelectElement {
  const el = document.createElement('select');
  el.setAttribute('aria-label', 'difficulty');
  for (const d of DIFFICULTIES) {
    const o = document.createElement('option');
    o.value = d.value;
    o.textContent = d.label;
    el.append(o);
  }
  el.value = value;
  return el;
}

/**
 * What the shift plays at, as a line of text. It used to be a second select
 * with `disabled` set and the reason in a `title`: a dead control that Tab
 * skips, that a reader's software passes over, and whose one explanation is
 * delivered to nobody. A shift plays at the rung the Play row chose, so the
 * row says that in words and the only control stays the one that means
 * something.
 */
function shiftTierWords(value: Difficulty): string {
  return `this shift plays at ${difficultyWord(value)}, the same as the Play row`;
}

function shiftTierLine(value: Difficulty): HTMLParagraphElement {
  const p = muted(shiftTierWords(value));
  p.id = 'shift-tier';
  return p;
}

type CabinetId = 'ghost' | 'vibe';

// ——— which cabinets this build carries ———————————————————————————————————
// `VITE_CABINET` is a string literal in every bundle (see the `define` in
// `vite.config.ts`), so these two are `true`/`false` constants by the time
// Rollup reads them and the `menu()` chain below folds to the one branch
// that is live. That is the whole mechanism: in a `ghost` build nothing
// references `vibeMenu`, so `./vibe-typer` and everything it reaches — the
// typing mount, `typer-audio`, `typer-cues`, `typer-keys`, the levers — is
// never in the graph, and the same the other way round. The pack script
// then leaves that cabinet's public files out of the package as well, and
// its marker gate greps for the proof.
const HAS_GHOST = import.meta.env.VITE_CABINET !== 'vibe';
const HAS_VIBE = import.meta.env.VITE_CABINET !== 'ghost';

/**
 * The switch at the top: two cards, Ghost first and selected by default.
 * A function and not a module-level constant so that the only thing naming
 * the typing cabinet's levers on this path is `switchMenu`, which a
 * single-cabinet build folds away.
 */
function cabinetCards(): { id: CabinetId; name: string; line: string; phone: string }[] {
  return [
    {
      id: 'ghost',
      name: 'Ghost on the Menu',
      line: 'A replay shooter on an mcp-arcade tape.',
      phone: 'On glass: hold the left or right of the field to move, the band under it to fire.',
    },
    {
      id: 'vibe',
      name: VIBE.cabinet.name,
      line: VIBE.cabinet.tagline,
      phone: 'On glass: tap the editor to raise your keyboard.',
    },
  ];
}

/**
 * Both cabinets: the switch, and the picked one's menu under it.
 *
 * The two cards are a tab list. Activating one replaces everything below the
 * switch and moved no focus and said nothing, so a reader's software was
 * told nothing at all about a whole new page; as tabs, the selection itself
 * is what is announced, and focus stays on the card the player pressed.
 * Left and Right move between them, which is what a tab list promises.
 */
function switchMenu(body: HTMLElement) {
  const CABINETS = cabinetCards();
  let picked: CabinetId = readVibePrefs().cabinet ?? 'ghost';
  // The page's own name, on the page. The document's first heading used to be
  // a cabinet's, below a tab list that had no visible name at all — only an
  // `aria-label` — and the title in the browser's tab appeared nowhere on
  // screen. The heading names the switch and the switch is labelled by it, so
  // the one statement serves the eye and a reader's software both.
  const title = document.createElement('h1');
  title.id = 'cabinet-switch';
  title.textContent = 'the cabinets';
  const cards = document.createElement('ul');
  cards.className = 'tape-list cabinet-cards';
  cards.setAttribute('role', 'tablist');
  cards.setAttribute('aria-labelledby', title.id);
  body.id = 'cabinet-body';
  body.setAttribute('role', 'tabpanel');
  const rows: HTMLLIElement[] = [];
  const tabs: HTMLButtonElement[] = [];
  const paint = () => {
    // The menu that is being replaced owns a look for a model; it is dropped
    // before the page under the switch is rebuilt.
    dropSeatLook();
    rows.forEach((row, i) => {
      const on = CABINETS[i]!.id === picked;
      row.classList.toggle('picked', on);
      tabs[i]?.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    body.replaceChildren();
    if (picked === 'ghost') ghostMenu(body, 'h2');
    else vibeMenu(body, 'h2');
  };
  CABINETS.forEach((cabinet, i) => {
    const li = document.createElement('li');
    li.className = 'tape-row cabinet-card';
    li.setAttribute('role', 'presentation');
    const name = button(cabinet.name, 'tape-name');
    name.setAttribute('role', 'tab');
    name.setAttribute('aria-controls', body.id);
    name.setAttribute('aria-selected', 'false');
    const line = document.createElement('span');
    line.className = 'tape-diff cabinet-line';
    line.textContent = cabinet.line;
    li.append(name, line);
    // What this cabinet plays like on glass, on the card itself, so nobody
    // presses Play into a game they do not know how to hold.
    if (coarsePointer()) {
      const phone = document.createElement('span');
      phone.className = 'cabinet-line muted phone-note';
      phone.textContent = cabinet.phone;
      li.append(phone);
    }
    name.addEventListener('click', () => {
      picked = cabinet.id;
      writeVibePrefs({ cabinet: picked });
      paint();
    });
    name.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const step = e.key === 'ArrowRight' ? 1 : -1;
      const next = tabs[(i + step + tabs.length) % tabs.length];
      if (!next) return;
      e.preventDefault();
      // Focus follows the arrow to the card it lands on, and that card opens.
      next.focus();
      next.click();
    });
    rows.push(li);
    tabs.push(name);
    cards.append(li);
  });
  app.append(title, cards, body);
  paint();
}

// An if/else chain and no early returns, deliberately: Rollup folds a chain
// on constant conditions down to the live branch, where an `if (…) return`
// would leave the code after it — and its reference to the other cabinet —
// standing. The stored `cabinet` pref is read only inside `switchMenu`, so
// a browser that last played the other cabinet cannot bring the switch back
// in a build that carries one.
/** False until the page has painted once, so the first paint moves no focus. */
let returned = false;

function menu() {
  dropSeatLook();
  app.replaceChildren();
  const body = document.createElement('section');
  body.className = 'column';
  if (HAS_GHOST && HAS_VIBE) {
    switchMenu(body);
  } else if (HAS_GHOST) {
    app.append(body);
    ghostMenu(body);
  } else {
    app.append(body);
    vibeMenu(body);
  }
  // Coming back from a round, the element the player activated has just been
  // destroyed and focus falls to the document: a keyboard player had to Tab
  // from the top of the page again and a reader's software was told nothing
  // about where it now was. The menu's own heading takes focus and is read.
  // Landing on the page for the first time is not a scene change, so it
  // moves nothing.
  if (!returned) {
    returned = true;
    return;
  }
  const head = app.querySelector('h1');
  if (head) {
    head.tabIndex = -1;
    head.focus();
  }
}

// ——— a throw, caught ———————————————————————————————————————————————————————
//
// Nothing in this shell caught one. The menu empties the page and then calls
// a mount directly, for both cabinets, and there was no window error handler
// and no unhandled rejection handler anywhere: so a tape the loader refused,
// an audio context a browser would not build in the state it was in, or a
// lever the bundle expected and did not find left the player looking at an
// empty page — no heading, no text, no way back — because the page was
// emptied before the mount was called. The reload after it landed on the same
// pick, since the pick is what is remembered, so the game stayed stuck until
// they cleared their storage or gave up.
//
// Every other failure in this shell is handled with a word for the player:
// art that does not arrive, music that does not load, a keyboard set that
// hangs, a model that is not there. This is that word for the one path that
// had none. It shows no stack and no error text, the way every other refusal
// here shows none; the detail goes to the console, where a developer is
// already looking.

/** The page's own name, for a throw that belongs to no one cabinet. */
const THE_CABINETS = 'the cabinets';
/** The shooter's, for a throw on its way up. Its menu writes the same words. */
const GHOST_NAME = 'Ghost on the Menu';

/** True while the recovery scene is up, so a second throw cannot repaint over it. */
let recovering = false;

/** Forget what this browser last picked, whichever cabinets this build carries. */
function forgetPicks(): void {
  if (HAS_GHOST) forgetTape();
  if (HAS_VIBE) forgetVibePick();
}

function recover(cabinet: string, detail: unknown): void {
  // Where a developer is already looking, and nowhere the player can read.
  console.error(detail);
  if (recovering) return;
  recovering = true;
  app.replaceChildren();
  const wrap = document.createElement('section');
  wrap.className = 'column';
  const h = document.createElement('h1');
  h.textContent = cabinet;
  wrap.append(h, muted('This cabinet did not open.'));
  const row = document.createElement('div');
  row.className = 'row';
  const back = button('Back to the cabinets', 'commit');
  const forget = button('Forget the last pick');
  row.append(back, forget);
  wrap.append(
    row,
    // The stuck pick is what made this unrecoverable, so the way out of it is
    // offered here rather than left to a player clearing their storage.
    muted('Forgetting the last pick opens the menu somewhere new.'),
  );
  app.append(wrap);
  back.focus();
  back.addEventListener('click', () => {
    recovering = false;
    safeMenu();
  });
  forget.addEventListener('click', () => {
    forgetPicks();
    recovering = false;
    safeMenu();
  });
}

/** Run a paint or a mount; a throw out of it becomes the scene above. */
function guard(cabinet: string, work: () => void): void {
  try {
    work();
  } catch (err) {
    recover(cabinet, err);
  }
}

/** The menu, painted under the guard. Everything that returns here calls this. */
function safeMenu(): void {
  guard(THE_CABINETS, menu);
}

/**
 * A cabinet's own heading. On a single-cabinet build the cabinet IS the page,
 * so its name is the h1. Inside the switch the page is the arcade and the
 * cabinet is a section of it, so the name is demoted and 'the cabinets' takes
 * the h1 — which also gives the tab list above it a visible name, and gives
 * the document a first heading that is not below a list of unlabeled tabs.
 */
export type MenuHeading = 'h1' | 'h2';

function ghostMenu(wrap: HTMLElement, heading: MenuHeading = 'h1') {
  const h = document.createElement(heading);
  h.textContent = 'Ghost on the Menu';
  const prefs = readPrefs();
  const playDiff = (prefs.difficulty ?? 'seat') as Difficulty;
  const lead = muted(
    'A replay shooter on an mcp-arcade tape. The lies the instrument caught look like everything else until you hit one.',
  );
  lead.classList.add('prose');
  const intro = muted(INTRO_COPY);
  intro.classList.add('prose');
  const lamps = muted(lampsCopy(playDiff));
  lamps.classList.add('prose');
  wrap.append(h, lead, intro, lamps);
  if (coarsePointer()) {
    wrap.append(
      phoneLine(
        'On glass: hold the left or right of the field to move, the band under it to fire. A keyboard plays it best.',
      ),
    );
  }

  // Where the player was. Everything else about them survived a visit — the
  // rung, the feel, the shake, the seat, the voice, the last shift code — and
  // the tape did not, so a player who worked their way down the roster came
  // back to the top of it. The stored name is the pick when the roster still
  // has it; the tape this cabinet opens on is the fallback.
  const indexOf = (name: string | undefined): number =>
    name === undefined ? -1 : TAPES.findIndex((x) => x.name === name);
  const opening = indexOf('naive-ndjson');
  const stored = indexOf(prefs.tape);
  let picked = Math.max(0, stored >= 0 ? stored : opening);
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
    // A real button, and the text it opens is its sibling rather than its
    // child. It called itself a button before with no click and no keydown on
    // it: the text was revealed by `:hover` and `:focus` alone, so a reader's
    // software announced a button that did nothing when pressed and a touch
    // player, who has neither hover nor focus, could not reach the text at
    // all. As a child, the text was also the button's own accessible name.
    const infoWrap = document.createElement('span');
    infoWrap.className = 'tape-info-wrap';
    const info = button('i', 'tape-info');
    info.setAttribute('aria-label', `why this tape: ${t.name}`);
    info.setAttribute('aria-expanded', 'false');
    const why = document.createElement('span');
    why.className = 'tape-why';
    why.id = `tape-why-${i}`;
    why.hidden = true;
    why.textContent = tagged.why;
    info.setAttribute('aria-controls', why.id);
    infoWrap.append(info, why);
    li.append(name, diff, infoWrap);
    info.addEventListener('click', () => {
      const open = info.getAttribute('aria-expanded') === 'true';
      info.setAttribute('aria-expanded', open ? 'false' : 'true');
      why.hidden = open;
    });
    name.addEventListener('click', () => {
      picked = i;
      writePrefs({ tape: t.name });
      mark();
    });
    rows.push(li);
    list.append(li);
  });
  mark();
  const playTier = difficultySelect(playDiff);
  playTier.addEventListener('change', () => {
    const chosen = playTier.value as Difficulty;
    writePrefs({ difficulty: chosen });
    shiftTier.textContent = shiftTierWords(chosen);
    lamps.textContent = lampsCopy(chosen);
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
  const shiftTier = shiftTierLine(playDiff);
  const shift = button('Shift', 'commit');
  // A `title` is the hover affordance and nothing more: a touch player has no
  // hover, and a reader's software passes it over as soon as anything else
  // describes the control. The same sentence is in the page, offscreen, tied
  // to the button, so the one statement of what a shift is reaches everybody.
  const shiftWords = `${lengthWord(4)} calls drawn from the roster, back to back, the bursts climbing call by call. The lamps refill at every call.`;
  shift.title = shiftWords;
  const shiftWhat = document.createElement('span');
  shiftWhat.className = 'offscreen';
  shiftWhat.id = 'shift-what';
  shiftWhat.textContent = shiftWords;
  shift.setAttribute('aria-describedby', shiftWhat.id);
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
  shiftRow.append(shiftTier, shift, shiftWhat, code, replay);
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
  // The end scene walks the roster on its own, so this is also where the walk
  // is written down: a player who let it carry them along comes back where it
  // left them, not at the top of the list.
  writePrefs({ tape: t.name });
  const difficulty = readPrefs().difficulty;
  guard(GHOST_NAME, () => {
    mountGhost(
      app,
      t.name,
      t.tape,
      safeMenu,
      () => playAt(i + 1, true),
      fromClick,
      difficulty ? { difficulty } : undefined,
    );
  });
}

interface Shift {
  draw: ShiftDraw;
  code: string;
}

/** Four shift flavors, keyed by call index 0..3. Local until shift.ts exports flavorTelegraph. */
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
    safeMenu();
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
    li.textContent = wordsOnly(line);
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
        flowWord: last ? 'the shift closes on its own' : 'the next call follows on its own',
        holdMusic: !last,
        hintTail: 'Click the field to retake this call.',
      },
    );
  });
  back.addEventListener('click', safeMenu);
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
    // The same strip the call card takes. No shipped tape carries a digit in
    // a server name, a target kind or a policy today — but the closing scene
    // is exactly where the lock says no digit may appear, and the next tape
    // added would have decided it (G8, G10).
    li.textContent = wordsOnly(
      entry
        ? `${name}, server ${entry.tape.server_name ?? entry.tape.target_kind}, policy ${entry.tape.agent_policy}`
        : name,
    );
    list.append(li);
  }
  const codeLine = document.createElement('p');
  codeLine.textContent = `shift ${shift.code}`;
  codeLine.className = 'shift-code';
  // The one instruction for reusing a shift was a `title` on a paragraph: not
  // focusable, so Tab skips it, never announced by a reader's software, and
  // invisible to a touch player, who has no hover. The code was shown with no
  // statement anywhere on screen of what it is for. It is a line now.
  const codeWhy = muted(
    'Type these four words on the menu to take the same shift again, or hand them to someone.',
  );
  codeWhy.classList.add('why');
  wrap.append(list, codeLine, codeWhy);
  const row = document.createElement('div');
  row.className = 'row';
  const again = button('Take this shift again', 'commit');
  const fresh = button('A new shift');
  const back = button('Back to the cabinets');
  row.append(again, fresh, back);
  wrap.append(row);
  app.append(wrap);
  // The scene that has just replaced the round takes focus, the way the call
  // card does: its first control, so a keyboard player carries on from here
  // instead of Tabbing from the top of the document again, and a reader's
  // software is told where it is.
  again.focus();
  again.addEventListener('click', () => callCard(shift, 0));
  fresh.addEventListener('click', () => {
    const seed = hashWords(`${Date.now()}|${performance.now()}`);
    startShift(drawShift(ROSTER, seed, shift.draw.difficulty, recentShifts()));
  });
  back.addEventListener('click', safeMenu);
}

// ——— Vibe Typer ————————————————————————————————————————————————————————————
// The second cabinet's menu: the levels as products under a heading a stack,
// the endless ladder with the seat that will sit it, the four tier words, a
// settings row (the type, the keyboard, the sound, the music), the agent's
// name and the seed. Every choice persists under `vibe.`; no band digits
// anywhere (G23).

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

/**
 * What the endless row says while the menu is still looking for a model.
 * 'a daemon' was a developer's word: nothing in this cabinet's fiction
 * teaches it, and Pages never shows this row at all, so the only people who
 * ever read it are running the local game for the first time.
 */
const SEAT_LOOKING = 'looking for a model on this machine';
/** What it says when nothing will sit: Pages, no model, or the seat turned off. */
const SEAT_AUTHORED = 'a written user';

/**
 * The menu's one look for a model, so whoever replaces the menu can drop it.
 * It was owned by a closure and abandoned rather than aborted: switching
 * cabinets or repainting left a live fetch belonging to a menu that no longer
 * existed.
 */
let seatLook: AbortController | null = null;
function dropSeatLook(): void {
  seatLook?.abort();
  seatLook = null;
}

export function vibeMenu(wrap: HTMLElement, heading: MenuHeading = 'h1') {
  const prefs = readVibePrefs();
  const h = document.createElement(heading);
  h.textContent = VIBE.cabinet.name;
  const first = muted(
    'You are the coding agent. Your user has an idea, you type the code, and the thing gets built while you both watch.',
  );
  first.classList.add('prose');
  const second = muted(
    'Enter sends a line. A wrong line is a hmm and a retry, never a loss. The context bar is the clock.',
  );
  second.classList.add('prose');
  wrap.append(h, first, second);
  if (coarsePointer()) {
    wrap.append(
      phoneLine(
        'On glass: tap the editor to raise your keyboard. A keyboard of your own plays it best.',
      ),
    );
  }

  let picked: number | 'endless' =
    prefs.endless === 'on' ? 'endless' : Math.min(prefs.level ?? 0, VIBE.levels.levels.length - 1);
  const rows: { el: HTMLLIElement; id: number | 'endless' }[] = [];
  const mark = () => {
    rows.forEach((row) => row.el.classList.toggle('picked', row.id === picked));
  };

  // ——— the levels, by stack ————————————————————————————————————————————————
  // One heading a stack, in the corpus order with `integration` last, and
  // under it that stack's levels in the levers' own order. The heading
  // carries the stack word the row used to, so a row is a product and a
  // difficulty word and nothing else; no band digits anywhere (G23). The
  // pick is still an index into `levels.levels`, so the mount is unmoved.
  const groups = document.createElement('div');
  groups.className = 'vibe-levels';
  const groupList = (word: string): HTMLUListElement => {
    const head = document.createElement('h2');
    head.className = 'vibe-group';
    head.textContent = word;
    const list = document.createElement('ul');
    list.className = 'tape-list';
    groups.append(head, list);
    return list;
  };
  const addRow = (
    list: HTMLUListElement,
    id: number | 'endless',
    title: string,
    band: string,
    extra?: HTMLElement,
  ) => {
    const li = document.createElement('li');
    li.className = 'tape-row';
    const name = button(title, 'tape-name');
    const bandSpan = document.createElement('span');
    bandSpan.className = 'tape-diff';
    bandSpan.textContent = band;
    li.append(name, bandSpan);
    if (extra) li.append(extra);
    name.addEventListener('click', () => {
      picked = id;
      mark();
    });
    rows.push({ el: li, id });
    list.append(li);
  };

  // The grouping is the typing cabinet's own, so the menu's order and the end
  // card's next product cannot drift: one walks the groups, the other walks
  // the same flat order.
  //
  // The third column marks what this browser has already built. A player
  // returning to pick by hand could not see where they had been, which is
  // what made the end card's missing next hurt: the menu re-selected the
  // product they had just shipped. A word, never a count (G23).
  const shipped = new Set(prefs.shipped ?? []);
  for (const group of menuStackGroups(VIBE.levels.levels)) {
    const list = groupList(STACK_WORDS[group.stack] ?? group.stack);
    for (const i of group.levels) {
      const level = VIBE.levels.levels[i]!;
      let mark: HTMLSpanElement | undefined;
      if (shipped.has(level.product)) {
        mark = document.createElement('span');
        mark.className = 'tape-diff';
        mark.textContent = 'shipped';
      }
      addRow(list, i, level.product, bandWord(level.bandMin, level.bandMax), mark);
    }
  }

  // The endless entry, under a heading of its own so it does not read as one
  // more level of the last stack. Its third column names the seat that will
  // sit: the menu is outside the field, so a tag may be read here (G17).
  const seatCell = document.createElement('span');
  seatCell.className = 'tape-diff';
  seatCell.setAttribute('aria-live', 'polite');
  // A player who turned the model user off is not kept waiting on a look
  // whose answer is thrown away: the pref was only consulted after the answer
  // came back, so they paid a request and five seconds of 'looking' on every
  // paint of this menu to be told what they had already chosen.
  const willLook = LOCAL_SEATS && prefs.seat !== 'off';
  seatCell.textContent = willLook ? SEAT_LOOKING : SEAT_AUTHORED;
  addRow(groupList('every stack'), 'endless', 'Endless', 'climbing', seatCell);
  mark();
  wrap.append(groups);

  // One look for a daemon, not a loop: the menu is a still page, and the
  // field does its own looking. Play abandons it, five seconds ends it, and
  // a menu that has been replaced is never written to.
  dropSeatLook();
  if (willLook) {
    const look = new AbortController();
    seatLook = look;
    void probeSeatName(look.signal).then((tag) => {
      if (!seatCell.isConnected || look.signal.aborted) return;
      seatCell.textContent = tag ? `the user is ${tag}` : SEAT_AUTHORED;
    });
  }

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
  row.append(tier);

  // ——— the settings row ————————————————————————————————————————————————————
  // The type, the keyboard, the sound and the music. Words only; every one
  // persists under `vibe.`, and the sound reads and writes the same pref as the
  // field's own button, so the two never disagree. Sound off silences the whole
  // cabinet; music only shapes the bed under it, and opens on the calm one.
  const settings = document.createElement('div');
  settings.className = 'row';
  const font = document.createElement('select');
  font.setAttribute('aria-label', 'type size');
  for (const size of VIBE_FONTS) {
    const o = document.createElement('option');
    o.value = size;
    o.textContent = `type: ${size}`;
    font.append(o);
  }
  font.value = isVibeFont(prefs.font) ? prefs.font : DEFAULT_FONT;
  // One rule for the row: a setting is remembered the moment it is chosen.
  // The sound was, and the type, the keyboard and the music were written only
  // inside `start()` — so a player who set the type to huge and then switched
  // cabinets, reloaded or left had lost it, while the setting beside it
  // survived. Same row, two rules, and no sign of which was which.
  font.addEventListener('change', () => {
    writeVibePrefs({ font: isVibeFont(font.value) ? font.value : DEFAULT_FONT });
  });
  const theme = document.createElement('select');
  theme.setAttribute('aria-label', 'keyboard');
  for (const t of THEMES) {
    const o = document.createElement('option');
    o.value = t;
    o.textContent = `keyboard: ${THEME_WORDS[t]}`;
    theme.append(o);
  }
  theme.value = prefs.theme ?? 'mechanical';
  theme.addEventListener('change', () => {
    writeVibePrefs({ theme: theme.value as Theme });
  });
  const sound = document.createElement('select');
  sound.setAttribute('aria-label', 'sound');
  for (const state of ['on', 'off'] as const) {
    const o = document.createElement('option');
    o.value = state;
    o.textContent = `sound: ${state}`;
    sound.append(o);
  }
  sound.value = prefs.muted === 'on' ? 'off' : 'on';
  sound.addEventListener('change', () => {
    writeVibePrefs({ muted: sound.value === 'off' ? 'on' : 'off' });
  });
  const music = document.createElement('select');
  music.setAttribute('aria-label', 'music');
  for (const mode of MUSIC_MODES) {
    const o = document.createElement('option');
    o.value = mode;
    o.textContent = `music: ${mode}`;
    music.append(o);
  }
  music.value = isMusicMode(prefs.music) ? prefs.music : DEFAULT_MUSIC;
  music.addEventListener('change', () => {
    writeVibePrefs({ music: isMusicMode(music.value) ? music.value : DEFAULT_MUSIC });
  });
  settings.append(font, theme, sound, music);

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
  wrap.append(row, settings, row2);

  const start = () => {
    dropSeatLook();
    const runs = (prefs.runs ?? 0) + 1;
    // One truncation, before both uses. The box is played from the full text
    // and stored cut to twelve characters, so a longer seed phrase played one
    // run and came back as a different one: `hash(full text)` is not
    // `hash(first twelve)`. What is played, what is stored and what the box
    // shows are now the same string.
    const raw = seedBox.value.trim().slice(0, SEED_MAX);
    seedBox.value = raw;
    const seed = seedFrom(raw, prefs.last ?? 1, runs);
    const name = cleanName(agent.value) || VIBE.cabinet.agentName;
    const endless = picked === 'endless';
    // The run's own fields, and nothing else: the settings row writes itself
    // the moment it is chosen (see the handlers above), so this no longer
    // decides whether a choice is kept.
    writeVibePrefs({
      cabinet: 'vibe',
      tier: Number(tier.value) as Tier,
      ...(endless ? {} : { level: picked as number }),
      endless: endless ? 'on' : 'off',
      agent: name,
      seed: raw,
    });
    mountVibeTyper(app, {
      tier: Number(tier.value) as Tier,
      endless,
      ...(endless ? {} : { levelIndex: picked as number }),
      seed,
      agentName: name,
      theme: theme.value as Theme,
      font: isVibeFont(font.value) ? font.value : DEFAULT_FONT,
      music: isMusicMode(music.value) ? music.value : DEFAULT_MUSIC,
      integration: integrationSeasoning(),
      onExit: safeMenu,
      startAudio: true,
    });
  };
  play.addEventListener('click', start);
  seedBox.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') start();
  });
}

if (root) {
  // The pair that catches what no call site can: a throw from a later frame,
  // and a promise nobody was waiting on. Both land in the same scene the
  // guarded paints and mounts land in, so the player never meets an empty
  // page whatever went wrong or whenever.
  window.addEventListener('error', (e) => {
    recover(THE_CABINETS, e.error ?? e.message);
  });
  window.addEventListener('unhandledrejection', (e) => {
    recover(THE_CABINETS, e.reason);
  });
  safeMenu();
}
