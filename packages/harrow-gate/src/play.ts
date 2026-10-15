// Play Harrow Gate in a terminal, or let ai-playtest play it over stdio.
//
//   node dist/play.js --preset baseline [--seed 1] [--knobs '{"worldMoves":false}']
//
// Each turn writes one JSON line to STDERR, in the shape ai-playtest's
// calibration answer key reads: a first line naming the preset and switches,
// then {"cal":1, t, in, room, ev, ...} per turn. The stdio driver keeps stderr
// out of every model's sight and saves it beside the transcript.

import { createInterface } from 'node:readline';
import { DEFAULT_PATTERNS } from './patterns';
import { intro, newGame, step, switchesFor } from './sim';
import type { Switches } from './types';

export type PlayArgs = { preset: string; seed: number; knobs: Partial<Switches> };

export function parseArgs(argv: string[]): PlayArgs {
  const at = (name: string) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const seed = Number(at('seed') ?? '1');
  if (!Number.isInteger(seed) || seed < 0)
    throw new Error(`--seed must be a whole number, got "${at('seed')}"`);
  const knobs = at('knobs');
  return {
    preset: at('preset') ?? 'baseline',
    seed,
    knobs: knobs ? (JSON.parse(knobs) as Partial<Switches>) : {},
  };
}

export type Session = { send(input: string): { text: string; over: boolean } };

/** A whole game behind one function, writing its truth log through `log`. */
export function openSession(
  args: PlayArgs,
  log: (o: Record<string, unknown>) => void,
): { first: string; session: Session } {
  const p = DEFAULT_PATTERNS;
  const sw = switchesFor(p, args.preset, args.knobs);
  log({ variant: args.preset, knobs: sw, seed: args.seed });
  const opened = intro(p, sw, newGame(p, args.seed));
  let state = opened.state;
  return {
    first: opened.text,
    session: {
      send(input: string) {
        const r = step(p, sw, state, input);
        state = r.state;
        log({
          t: state.turn,
          in: input.trim().toLowerCase(),
          room: state.place,
          ev: r.events,
          hour: state.hour,
          oil: state.oil,
          hp: state.hp,
          coin: state.coin,
        });
        return { text: r.text, over: state.over };
      },
    },
  };
}

function main(): void {
  let args: PlayArgs;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n`);
    process.exit(2);
  }
  const log = (o: Record<string, unknown>) =>
    process.stderr.write(`${JSON.stringify({ cal: 1, ...o })}\n`);
  let opened: ReturnType<typeof openSession>;
  try {
    opened = openSession(args, log);
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n`);
    process.exit(2);
  }
  process.stdout.write(opened.first);
  const rl = createInterface({ input: process.stdin, terminal: false });
  rl.on('line', (input) => {
    const r = opened.session.send(input);
    process.stdout.write(`\n${r.text}`);
    if (r.over) {
      process.stdout.write('\n');
      rl.close();
      process.exit(0);
    }
  });
}

if (process.argv[1] && /play\.(js|ts|mjs)$/.test(process.argv[1])) main();
