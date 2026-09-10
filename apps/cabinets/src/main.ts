// The Pages shell. Pick a cabinet and a tape, or let the director pick the
// tape; the cabinet takes the page. History lives in this browser only.

import { nextTape } from '@mcp-arcade-cabinets/house-call';

import { mountGhost } from './ghost';
import { forgetHistory, loadHistory } from './history';
import { mountHouseCall } from './house-call';
import { TAPES } from './tapes';

const app = document.getElementById('app')!;

function menu() {
  app.replaceChildren();
  const h = document.createElement('h1');
  h.textContent = 'mcp-arcade cabinets';
  const p = document.createElement('p');
  p.className = 'muted';
  p.textContent =
    'Two games on the tape. House Call: place your call, then the wire shows. Ghost on the Menu: the lies look like everything else until you hit one.';
  app.append(h, p);

  // The director's pick: sequenced by measured calibration and uncovered
  // cells (G6). The menu says which tape, never why in numbers.
  const history = loadHistory();
  const pick = nextTape(TAPES, history);
  const director = document.createElement('div');
  director.className = 'row';
  const directorBtn = document.createElement('button');
  directorBtn.className = 'commit';
  if (pick) {
    directorBtn.textContent = `House Call, the director's pick: ${pick.name}`;
    directorBtn.addEventListener('click', () => mountHouseCall(app, pick.name, pick.tape, menu));
  } else {
    directorBtn.textContent = history.played.size
      ? 'The director has nothing new unlocked for you yet. Play on; calibration opens doors.'
      : 'The director has no pick.';
    directorBtn.disabled = true;
  }
  director.append(directorBtn);
  app.append(director);

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
  const house = document.createElement('button');
  house.textContent = 'House Call';
  const ghost = document.createElement('button');
  ghost.textContent = 'Ghost on the Menu';
  row.append(pickTape, house, ghost);
  app.append(row);

  const chosen = () => TAPES.find((t) => t.name === pickTape.value) ?? TAPES[0]!;
  house.addEventListener('click', () => {
    const t = chosen();
    mountHouseCall(app, t.name, t.tape, menu);
  });
  ghost.addEventListener('click', () => {
    const t = chosen();
    mountGhost(app, t.name, t.tape, menu);
  });

  if (history.played.size) {
    const forget = document.createElement('button');
    forget.textContent = 'Forget my history in this browser';
    forget.className = 'muted';
    forget.addEventListener('click', () => {
      forgetHistory();
      menu();
    });
    app.append(forget);
  }
}

menu();
