// The typing cabinet's voice: which of the user's lines are spoken, and when
// a take is allowed to play. G15 in the typing cabinet's words.
//
// The client of the worker is shared — `speakLine` and `voiceHealth` in
// `voice.ts` are the same functions the shooter uses, against the same
// worker, with the same receipt. What is not shared is the timing rule, and
// this file exists because `createVoicer` cannot be made to give it without
// the adapter carrying the rule instead:
//
//   * Ghost decides a take is still in hand by matching the caption's text
//     against the job's, or by a clear field inside a caption window. The
//     typing cabinet has no caption and no window: a line is in hand while
//     the beat it belongs to is still the beat in hand, and a beat is not a
//     clock reading.
//   * Ghost holds a missed take for the next breather, which is a level the
//     round is either in or not. Here a held take waits for the next request
//     boundary, which is an edge — the step the sim enters `request` on. A
//     level test would play a held take on the same boundary it was held at.
//   * A newer user line here replaces a take that is still pending and drops
//     one already held, and leaves a take that is receipted and waiting for
//     this frame's decision alone. Ghost drops that one too, because a boss
//     saying the newer thing over the older one is the shooter's grammar.
//
// Three rules is not an adapter, it is the rule. So the rule is written
// here, the client is not rewritten, and `createVoicer` is untouched.
//
// Nothing in this file reads a score, a valuation or a level. It reads the
// beat, who spoke and whether the ship frame was in the step — and the words
// themselves, which have already been through `lineFault`.

import type { SpeakAnswer, SpeakJob } from './voice';
import { noWorkerWords, receiptWords, refusedWords, VOICE_WORDS } from './voice-words';

/** The beats the typing cabinet's sim moves through. Copied, not imported. */
export type VibeBeat = 'request' | 'reply' | 'code' | 'ship' | 'compaction' | 'creep' | 'sync';

/**
 * Which of the user's lines this is. The classes are decided from the beat
 * and the step's events, never from the text: a rule that read the words
 * would be a rule that changed when the pools were re-authored.
 */
export type VibeLine = 'ask' | 'creep' | 'nag' | 'reaction' | 'review';

/** What the drain knows about one `message` event when it decides. */
export interface VibeLineFacts {
  who: 'user' | 'agent';
  /** The check-in flag the sim puts on the event. */
  nag: boolean;
  /** The beat in hand when the step returned. */
  beat: VibeBeat;
  /** Whether this step also carried the `ship` event: the level's last piece. */
  shipped: boolean;
}

/**
 * The line rule. Null means this line is not spoken.
 *
 * The agent's lines are never spoken: the player types those, and the
 * keystroke is the score's voice (G29). A line in the meeting is not spoken
 * either — the sync is three short lines back to back and a voice over them
 * would bury the ask that follows.
 */
export function vibeVoiceLine(facts: VibeLineFacts): VibeLine | null {
  if (facts.who !== 'user') return null;
  if (facts.beat === 'sync') return null;
  if (facts.nag) return facts.beat === 'code' ? 'nag' : null;
  if (facts.beat === 'request') return 'ask';
  if (facts.beat === 'creep') return 'creep';
  if (facts.beat === 'ship') return facts.shipped ? 'review' : 'reaction';
  return null;
}

/**
 * Where a take of each class may still play. The ask is said on the single
 * `request` frame and the player answers it through the `reply` beat, so
 * that is its beat in hand. The creep is said on the `creep` frame and the
 * appended line is typed on the `code` beat after it. The check-in belongs
 * to the code beat it landed on. A reaction and a review are said on the
 * `ship` frame; the run leaves that frame for the next request one step
 * later, so their window carries into the next request's reply — the frames
 * between are one step each and no take is back inside one.
 */
const IN_HAND: Record<VibeLine, readonly VibeBeat[]> = {
  ask: ['request', 'reply'],
  creep: ['creep', 'code'],
  nag: ['code'],
  reaction: ['ship', 'request', 'reply'],
  review: ['ship', 'request', 'reply'],
};

/** The job the worker is handed for one of the user's lines. */
export interface VibeVoiceJob extends SpeakJob {
  /** Always the user: the agent is never spoken. */
  kind: 'user';
  /** Which line this is, for the timing rule. */
  line: VibeLine;
  /** The nth user line of this run. The stats read it; nothing draws it. */
  seq: number;
}

export interface VibeVoicerStats {
  asked: number;
  voiced: number;
  /** Played while the beat it belongs to was still in hand. */
  playedOnBeat: number;
  /** Played at the next request boundary, having missed its beat. */
  playedAtBoundary: number;
  /** Held past its boundary, or still in hand when the run ended. */
  dropped: number;
  /** Still at the worker when a newer user line landed. */
  replaced: number;
  receiptFailed: number;
  refused: number;
  noWorker: number;
  cached: number;
  msSum: number;
}

export interface VibeVoicer {
  /** The drain's hook: hand one voiced-class user line in. */
  job(job: VibeVoiceJob): void;
  /** Every frame: the beat in hand, and whether the run is over. */
  tick(beat: VibeBeat, ended: boolean): void;
  stats(): VibeVoicerStats;
  status(): string;
}

export interface VibeVoicerOpts {
  speak: (job: VibeVoiceJob) => Promise<SpeakAnswer>;
  /**
   * Play a take whose receipt passed, by the url the receipt named. Call
   * `done` when the audio has finished, so the next take can follow it; a
   * caller with no element of its own (`pnpm sit` plays nothing) may ignore
   * it, and the receipt's own measured length is used instead.
   */
  play: (url: string, job: VibeVoiceJob, done: () => void) => void;
  onStatus?: (status: string) => void;
  /** The wall clock, in milliseconds. A test hands in its own. */
  now?: () => number;
}

/** A take the queue is holding, and what it is doing. */
type SlotStatus = 'pending' | 'ready' | 'held' | 'playing';

interface Slot {
  job: VibeVoiceJob;
  token: number;
  status: SlotStatus;
  url?: string;
  /** The receipt's measured length, seconds. */
  duration?: number;
  /** When a playing take is over by the clock, if `done` never comes. */
  endsAt?: number;
  /** Set by the play hook's `done`. */
  finished?: boolean;
}

/** How long a take is assumed to run when its receipt gave no length. */
const NO_LENGTH_S = 3;

/**
 * Which line may wait behind which. The reaction or the review of the request
 * that just shipped, and then the ask of the request that follows it: the
 * only pair the cabinet produces a step apart, and the one pair a player
 * needs both halves of. Nothing else queues; everything else replaces.
 */
function follows(held: VibeLine, next: VibeLine): boolean {
  return (held === 'reaction' || held === 'review') && next === 'ask';
}

/**
 * The timing rule.
 *
 * The line is spoken the moment it lands: the sim says it, the chat shows it
 * and nothing waits on the worker. The take plays the moment its receipt is
 * back if the beat it belongs to is still in hand. A take that missed its
 * beat waits for the next request boundary and plays there. A failed receipt
 * is never played, and neither is a take the run has already ended on.
 *
 * The queue holds **two** takes at most, in the order they were said, and it
 * holds two only for the one pair the cabinet says a step apart: the reaction
 * or the review of the request that just shipped, and then the ask of the
 * request that follows it. That pair is why the cap is not one. The reaction
 * is the user's comedic line and on a cold cache the worker takes about a
 * second to receipt it, by which time the next ask has landed — with one slot
 * the reaction was replaced every time and was only ever heard warm. So the
 * ask waits behind it: the reaction plays as soon as its receipt is back (the
 * next request's reply beat is still in hand for it, because the chat still
 * shows it above the ask), and the ask plays when its own receipt is back and
 * the reaction's audio has finished — or at once, if the reaction's receipt
 * failed or it was dropped.
 *
 * Everything else replaces, as before. A creep or a check-in arriving while
 * two are in hand drops the older of the two, and never the one playing; the
 * cap is two so nothing stacks, the sim never waits for any of it, and the
 * field never learns that any of it happened.
 */
export function createVibeVoicer(opts: VibeVoicerOpts): VibeVoicer {
  const stats: VibeVoicerStats = {
    asked: 0,
    voiced: 0,
    playedOnBeat: 0,
    playedAtBoundary: 0,
    dropped: 0,
    replaced: 0,
    receiptFailed: 0,
    refused: 0,
    noWorker: 0,
    cached: 0,
    msSum: 0,
  };
  const now = opts.now ?? (() => Date.now());
  /** At most two, oldest first. */
  const line: Slot[] = [];
  let token = 0;
  let last = 'voice waiting';
  let wasRequest = false;
  let over = false;
  const say = (s: string) => {
    last = s;
    opts.onStatus?.(s);
  };

  /** Take one out of the queue and count it. A pending one was replaced. */
  const drop = (at: number) => {
    const slot = line[at];
    if (!slot) return;
    if (slot.status === 'pending') stats.replaced += 1;
    else stats.dropped += 1;
    // The token moves so a receipt still on its way lands on nothing.
    slot.token = -1;
    line.splice(at, 1);
  };

  /** Room for one more, by the rule above. */
  const makeRoom = (next: VibeVoiceJob) => {
    if (line.length >= 2) {
      // Two in hand: the older goes, unless the older is the one playing.
      drop(line[0]!.status === 'playing' ? 1 : 0);
      return;
    }
    const held = line[0];
    if (!held) return;
    // A take with audio in the air is never cut off; the new one waits.
    if (held.status === 'playing') return;
    if (follows(held.job.line, next.line)) return;
    drop(0);
  };

  const start = (slot: Slot, how: 'beat' | 'boundary') => {
    slot.status = 'playing';
    slot.finished = false;
    slot.endsAt = now() + Math.max(1, slot.duration ?? NO_LENGTH_S) * 1000;
    if (how === 'beat') {
      stats.playedOnBeat += 1;
      say('voice: spoke on the beat');
    } else {
      stats.playedAtBoundary += 1;
      say('voice: spoke at the next ask');
    }
    opts.play(slot.url!, slot.job, () => {
      slot.finished = true;
    });
  };

  return {
    job(job) {
      if (over) return;
      makeRoom(job);
      const mine = ++token;
      const slot: Slot = { job, token: mine, status: 'pending' };
      line.push(slot);
      stats.asked += 1;
      say(VOICE_WORDS.asked);
      const chain = opts.speak(job).then((a) => {
        if (slot.token !== mine || !line.includes(slot)) return;
        stats.msSum += a.ms;
        if (a.status === 'voiced' && a.receipt?.url) {
          stats.voiced += 1;
          if (a.receipt.cached) stats.cached += 1;
          slot.status = 'ready';
          slot.url = a.receipt.url;
          slot.duration = a.receipt.duration_s;
          say(VOICE_WORDS.receipt);
          return;
        }
        // Nothing to play: the slot leaves rather than blocking the one
        // behind it, which is how the ask plays at once when the reaction's
        // receipt failed.
        line.splice(line.indexOf(slot), 1);
        if (a.status === 'receipt failed') {
          stats.receiptFailed += 1;
          // The shooter told an unreadable body apart from any other failed
          // receipt and this cabinet collapsed the two, so one worker
          // behavior read as two different events depending on which cabinet
          // was up. The distinction is in the shared table now.
          say(receiptWords(a.error));
          return;
        }
        if (a.status === 'speak failed') {
          say(VOICE_WORDS.speakFailed);
          return;
        }
        if (a.status === 'no worker') {
          stats.noWorker += 1;
          say(noWorkerWords(a.why));
          return;
        }
        stats.refused += 1;
        // One static word per class. `SpeakAnswer.error` carries the worker's
        // own sentence and is deliberately not printed: dropping digits and
        // path separators from it does not stop an engine, a model or a
        // vendor name reaching the controls row, and nothing dynamic from the
        // worker is printed anywhere in this cabinet (G17).
        say(refusedWords(a.refused));
      });
      // `speakLine` catches its own transport errors, so a rejection here is
      // something thrown above it — a hook that threw, a body that got past
      // its guards. Without this the slot would sit pending for the rest of
      // the run, block the one behind it, and leave the numbers saying the
      // take was still on its way. It is counted as a worker that did not
      // answer, because that is what it is from the field's side.
      void chain.catch(() => {
        if (slot.token !== mine) return;
        const at = line.indexOf(slot);
        if (at !== -1) line.splice(at, 1);
        stats.noWorker += 1;
        say(VOICE_WORDS.noAnswer);
      });
    },
    tick(beat, ended) {
      // The boundary is the edge, not the level: the sim sits on `request`
      // for one step, and a held take must wait for the NEXT one rather than
      // play on the one it was held at.
      const boundary = beat === 'request' && !wasRequest;
      wasRequest = beat === 'request';
      if (ended) {
        if (!over) {
          over = true;
          token += 1;
          while (line.length > 0) drop(0);
        }
        return;
      }
      // A take whose audio is over leaves, and the one behind it moves up.
      // `done` from the play hook is the real answer; the receipt's own
      // length is the fallback for a caller that plays nothing.
      const playing = line[0];
      if (playing?.status === 'playing') {
        if (playing.finished === true || now() >= (playing.endsAt ?? 0)) line.shift();
        else return;
      }
      const slot = line[0];
      if (!slot) return;
      if (slot.status === 'held') {
        if (boundary) start(slot, 'boundary');
        return;
      }
      if (slot.status !== 'ready') return;
      if (IN_HAND[slot.job.line].includes(beat)) {
        start(slot, 'beat');
        return;
      }
      slot.status = 'held';
      say('voice: held for the next ask');
    },
    stats: () => stats,
    status: () => last,
  };
}
