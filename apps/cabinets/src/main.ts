// The browser shell. Pick a tape; Ghost on the Menu takes the page.

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
  app.append(h, p);

  const pickTape = document.createElement('select');
  for (const t of TAPES) {
    const o = document.createElement('option');
    o.value = t.name;
    o.textContent = t.name;
    pickTape.append(o);
  }
  pickTape.value = 'naive-ndjson';
  const row = document.createElement('div');
  row.className = 'row';
  const play = document.createElement('button');
  play.textContent = 'Play';
  play.className = 'commit';
  row.append(pickTape, play);
  app.append(row);

  play.addEventListener('click', () => {
    const t = TAPES.find((x) => x.name === pickTape.value) ?? TAPES[0]!;
    mountGhost(app, t.name, t.tape, menu);
  });
}

menu();
