// The browser shell. Pick a tape; Ghost on the Menu takes the page.

import { labelTape } from '@mcp-arcade-cabinets/ghost-on-the-menu';

import { mountGhost } from './ghost';
import { TAPES } from './tapes';

const app = document.getElementById('app')!;

function menu() {
  app.replaceChildren();
  const h = document.createElement('h1');
  h.textContent = 'Ghost on the Menu';
  const p = document.createElement('p');
  p.className = 'muted';
  p.textContent =
    'A replay shooter on an mcp-arcade tape. The lies the instrument caught look like everything else until you hit one.';
  const how = document.createElement('p');
  how.className = 'muted';
  how.textContent =
    'Every wave is one experiment the instrument ran against the server: a word names it, then the handshake, the menu, the calls, and the answers coming back, with the wave’s own boss standing over it. Somewhere in there are the calls the agent should not have made. Hit one and it is yours for the rest of the round. Three lamps; a boss shot or a diving formation puts one out.';
  app.append(h, p, how);

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
    const name = document.createElement('button');
    name.type = 'button';
    name.className = 'tape-name';
    name.textContent = t.name;
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
  const play = document.createElement('button');
  play.textContent = 'Play';
  play.className = 'commit';
  row.append(play);
  app.append(list, row);

  play.addEventListener('click', () => {
    playAt(picked);
  });
}

/** Mount the tape at index i; the end scene's Next tape walks the list in order. */
function playAt(i: number, fromClick = false) {
  const t = TAPES[i % TAPES.length]!;
  mountGhost(app, t.name, t.tape, menu, () => playAt(i + 1, true), fromClick);
}

menu();
