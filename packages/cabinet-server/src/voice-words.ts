// What the two voicers say about a take, in one place.
//
// The two cabinets said the same outcomes in two registers, and the
// shooter's was the jargon one: 'voice: refused (bearer)' beside the typing
// cabinet's 'voice: the worker wants its bearer'. The parenthesized token is
// the same shape two earlier fixes removed from the tool answers on both
// cabinets - a rule named by a label rather than by what to change - and the
// status line was the surface neither fix reached. The divergence ran the
// other way once too: the shooter told an unreadable body apart from any
// other failed receipt and the typing cabinet collapsed the two, so one
// worker behavior read as two different events depending on which cabinet
// was up.
//
// So: the typing cabinet's plain sentences, plus the shooter's
// unreadable-body distinction, written down once. This is a leaf, like
// `step-guard`, for the same reason - it is the file both sides may import
// without dragging the other cabinet's graph into their bundle.

/**
 * The body a worker sent that could not be read as a receipt. It lives here
 * rather than in `voice.ts` so the typing cabinet can tell that case apart
 * without a value import of the shooter's client.
 */
export const BAD_PAYLOAD = 'bad payload';

/**
 * One static phrase per outcome. Nothing dynamic from the worker is printed
 * anywhere on either cabinet (G17): `SpeakAnswer.error` carries the worker's
 * own sentence, and dropping digits and path separators from it does not
 * stop an engine, a model or a vendor name reaching the controls row.
 */
export const VOICE_WORDS = {
  /** Sent, waiting on the worker. */
  asked: 'voice speaking ahead',
  /** Receipted and in hand. */
  receipt: 'voice: receipt ok',
  /** A worker that answered and turned this cabinet away. */
  auth: 'voice: the worker wants its bearer',
  /** A worker that took the request and would not say the line. */
  refused: 'voice: the worker refused the line',
  /** A receipt that did not pass; the take is never played. */
  receiptFailed: 'voice: receipt failed, not played',
  /** A body that could not be read as a receipt at all. */
  unreadable: 'voice: the worker answered with something unreadable',
  /** The worker took the job and could not speak it. */
  speakFailed: 'voice: speak failed',
  /** Nothing answered. */
  noWorker: 'voice: no worker',
  /** Nothing answered inside the abort. */
  timeout: 'voice: the worker did not answer in time',
  /** Something above the client threw, which from the field's side is the same. */
  noAnswer: 'voice: the worker did not answer',
} as const;

/** Which of the two receipt words a failed receipt earns. */
export function receiptWords(error: string | undefined): string {
  return error === BAD_PAYLOAD ? VOICE_WORDS.unreadable : VOICE_WORDS.receiptFailed;
}

/** Which of the two absent-worker words an unanswered take earns. */
export function noWorkerWords(why: string | undefined): string {
  return why === 'timeout' ? VOICE_WORDS.timeout : VOICE_WORDS.noWorker;
}

/** Which of the two refusal words a refusal earns. Never the worker's own sentence. */
export function refusedWords(refused: string | undefined): string {
  return refused === 'auth' ? VOICE_WORDS.auth : VOICE_WORDS.refused;
}
