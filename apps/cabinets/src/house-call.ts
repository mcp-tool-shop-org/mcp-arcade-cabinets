// House Call in the browser. One turn in the DOM at a time (G2, G4):
// party, server, task and the disclosed methods as words; three outcome
// buttons; surety as five words that map to a confidence in memory and are
// never drawn as figures; one Commit. Commit replaces the block with the
// narrative line and a Next. Earlier turns are not kept in the DOM, so
// scrollback re-shows nothing. After the last commit the column becomes the
// three end blocks, on demand. There is no Undo, and Back does not un-commit.

import {
  askForCall,
  commit,
  confidenceWord,
  introduce,
  isOver,
  OUTCOME_LABEL,
  readout,
  reveal,
  startRun,
  type Outcome,
  type RunState,
} from '@mcp-arcade-cabinets/house-call';
import type { Tape } from '@mcp-arcade-cabinets/tape-core';

/** Surety words and the confidence each stands for. The figure stays here. */
const SURETY: readonly { word: string; p: number }[] = [
  { word: 'a coin flip', p: 0.5 },
  { word: 'leaning', p: 0.6 },
  { word: 'likely', p: 0.75 },
  { word: 'sure', p: 0.85 },
  { word: 'certain', p: 0.95 },
];

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text?: string,
  cls?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (cls) node.className = cls;
  return node;
}

export function mountHouseCall(root: HTMLElement, name: string, tape: Tape, onExit: () => void) {
  let run: RunState = startRun(tape);
  root.replaceChildren();
  const column = el('section', undefined, 'column');
  root.append(column);

  // Commit is irreversible in history too: each commit pushes a state and a
  // popstate re-mounts whatever turn is current, never the one before it.
  const onPop = () => mountTurn();
  window.addEventListener('popstate', onPop);
  const leave = () => {
    window.removeEventListener('popstate', onPop);
    onExit();
  };

  function mountTurn() {
    column.replaceChildren();
    if (isOver(run)) return mountEnd();
    const turn = run.current!;
    column.append(el('h2', `House Call — ${name}`));
    column.append(el('p', introduce(turn.party, turn.server, turn.taskTool, turn.atomId)));
    const disclosed = el('p', undefined, 'muted');
    disclosed.textContent = turn.disclosure.length
      ? `Disclosed: ${turn.disclosure.map((r) => r.method).join(', ')}`
      : 'Disclosed: nothing yet';
    column.append(disclosed);
    column.append(el('p', askForCall(turn.outcomes)));

    let outcome: Outcome | null = null;
    let surety = SURETY[2]!;
    const outcomeRow = el('div', undefined, 'row');
    const outcomeButtons = turn.outcomes.map((o) => {
      const b = el('button', OUTCOME_LABEL[o]);
      b.addEventListener('click', () => {
        outcome = o;
        for (const x of outcomeButtons) x.classList.toggle('picked', x === b);
        commitBtn.disabled = false;
      });
      outcomeRow.append(b);
      return b;
    });
    column.append(outcomeRow);

    const suretyRow = el('div', undefined, 'row');
    const suretyButtons = SURETY.map((s) => {
      const b = el('button', s.word);
      if (s === surety) b.classList.add('picked');
      b.addEventListener('click', () => {
        surety = s;
        for (const x of suretyButtons) x.classList.toggle('picked', x === b);
      });
      suretyRow.append(b);
      return b;
    });
    column.append(suretyRow);

    const commitBtn = el('button', 'Commit', 'commit');
    commitBtn.disabled = true;
    commitBtn.addEventListener('click', () => {
      if (!outcome) return;
      run = commit(run, { outcome, confidence: surety.p });
      history.pushState({ turn: run.results.length }, '');
      mountReveal();
    });
    column.append(commitBtn);
  }

  function mountReveal() {
    column.replaceChildren();
    const result = run.results[run.results.length - 1]!;
    column.append(el('h2', `House Call — ${name}`));
    const rows = el('p', undefined, 'muted');
    rows.textContent = result.reveal.map((r) => r.note || r.method).join(' | ');
    column.append(rows);
    column.append(el('p', reveal(result)));
    const next = el('button', isOver(run) ? 'End of run' : 'Next', 'commit');
    next.addEventListener('click', mountTurn);
    column.append(next);
  }

  function mountEnd() {
    column.replaceChildren();
    column.append(el('h2', `House Call — ${name}`));
    column.append(el('p', 'The run is over. The numbers are here when you want them.'));
    const show = el('button', 'Show the numbers', 'commit');
    show.addEventListener('click', () => {
      show.remove();
      const out = readout(run);
      const brierBlock = el('div', undefined, 'block');
      brierBlock.append(el('h3', 'Calibration'));
      brierBlock.append(el('p', `Mean Brier over ${out.turns} turns: ${out.meanBrier}`));
      const relBlock = el('div', undefined, 'block');
      relBlock.append(el('h3', 'Reliability'));
      for (const b of out.reliability) {
        if (!b.n) continue;
        relBlock.append(
          el(
            'p',
            `${confidenceWord(b.predicted)} (${b.from}–${b.to}): predicted ${b.predicted}, observed ${b.observed}, n=${b.n}`,
          ),
        );
      }
      const covBlock = el('div', undefined, 'block');
      covBlock.append(el('h3', 'Coverage'));
      for (const c of out.coverageCells) covBlock.append(el('p', c, 'muted'));
      column.append(brierBlock, relBlock, covBlock);
    });
    column.append(show);
    const back = el('button', 'Back to the cabinets');
    back.addEventListener('click', leave);
    column.append(back);
  }

  mountTurn();
}
