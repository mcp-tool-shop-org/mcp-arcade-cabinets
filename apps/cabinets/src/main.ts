// The Pages shell. Pick a cabinet and a tape; the cabinet takes the page.
// The shell holds no history across runs yet: the director's campaign
// sequencing waits on persistence.

import { mountGhost } from './ghost';
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

  const pick = document.createElement('select');
  for (const t of TAPES) {
    const o = document.createElement('option');
    o.value = t.name;
    o.textContent = t.name;
    pick.append(o);
  }
  pick.value = 'naive-ndjson';
  const row = document.createElement('div');
  row.className = 'row';
  const house = document.createElement('button');
  house.textContent = 'House Call';
  house.className = 'commit';
  const ghost = document.createElement('button');
  ghost.textContent = 'Ghost on the Menu';
  ghost.className = 'commit';
  row.append(pick, house, ghost);
  app.append(row);

  const chosen = () => TAPES.find((t) => t.name === pick.value) ?? TAPES[0]!;
  house.addEventListener('click', () => {
    const t = chosen();
    mountHouseCall(app, t.name, t.tape, menu);
  });
  ghost.addEventListener('click', () => {
    const t = chosen();
    mountGhost(app, t.name, t.tape, menu);
  });
}

menu();
