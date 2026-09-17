// The `--mcp` levers, in one place, because there are two help texts and two
// READMEs and they had drifted into three different orders.
//
// Neither cabinet reads all six: the shooter plays its own bot and the typing
// cabinet has no tape menu. Both help texts still list all six, because an
// operator running both packages reads the two blocks side by side and a lever
// that is silently absent from one of them reads as a lever that does not
// exist. Which cabinet reads which is in the row's own words.

/**
 * The six `CABINET_*` variables, in the order every surface lists them. Both
 * packages' `--help` tests loop this list against the printed text, so a
 * seventh lever is one edit here and two help texts held to it.
 */
export const CABINET_VARS = [
  'CABINET_TAPES',
  'CABINET_SEED',
  'CABINET_TIER',
  'CABINET_BOT',
  'CABINET_TAPES_USER',
  'CABINET_FIXTURE',
] as const;
