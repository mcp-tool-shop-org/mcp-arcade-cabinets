// Every recorded bed both cabinets ship is a piece, not a loop you hear once.
//
// The Director played v0.11.1 and said the songs do not play long enough to
// get into. The answer was to rebuild each bed into 110 to 130 seconds from
// its own material, and this file is the gate on that: it reads the installed
// mp3s and fails if any of them drifts back out of the window, whether by an
// arrangement that lands short or by a file replaced with an old loop.
//
// The duration is read from the mp3's own frame headers rather than from a
// manifest beside the files. A manifest can be stale and still look right; the
// frames are the file. There is no decoder in this dependency tree and none is
// wanted for a test — walking the headers is exact for these files, which are
// constant bitrate, and it is checked against the header count either way.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { TRACK_KEYS } from '@mcp-arcade-cabinets/ghost-on-the-menu';
import { describe, expect, it } from 'vitest';

import { VIBE_TRACK_KEYS } from '../src/typer-audio';

/** The window the music pass installs into, in seconds. */
const MIN_SECONDS = 110;
const MAX_SECONDS = 130;

/**
 * The most a single bed may weigh. Eight Ghost beds and seven Vibe beds at
 * MP3 128k come in just under two megabytes each; the old ceiling was 700 KB,
 * which was right for a 38 second loop and is not right for a two minute
 * piece. The number is here so the tarball cannot grow without a test saying
 * so. // Director: two minutes a bed, 2026-09-16
 */
const MAX_BYTES = 2.1 * 1024 * 1024;

const BITRATES_V1_L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
const RATES_V1 = [44100, 48000, 32000, 0];

/** Seconds of audio in an MPEG-1 Layer III file, by walking its frames. */
function mp3Seconds(file: string): { seconds: number; frames: number } {
  const buf = readFileSync(file);
  let at = 0;
  // Skip an ID3v2 tag if the encoder wrote one.
  if (buf.length > 10 && buf.toString('latin1', 0, 3) === 'ID3') {
    const size =
      ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f);
    at = 10 + size;
  }
  let frames = 0;
  let seconds = 0;
  while (at + 4 <= buf.length) {
    if (buf[at] !== 0xff || (buf[at + 1] & 0xe0) !== 0xe0) {
      at += 1;
      continue;
    }
    const versionBits = (buf[at + 1] >> 3) & 0x03;
    const layerBits = (buf[at + 1] >> 1) & 0x03;
    const bitrateIndex = (buf[at + 2] >> 4) & 0x0f;
    const rateIndex = (buf[at + 2] >> 2) & 0x03;
    const padding = (buf[at + 2] >> 1) & 0x01;
    // MPEG-1 (3), Layer III (1), and a bitrate and sample rate that exist.
    if (
      versionBits !== 3 ||
      layerBits !== 1 ||
      bitrateIndex === 0 ||
      bitrateIndex === 15 ||
      rateIndex === 3
    ) {
      at += 1;
      continue;
    }
    const kbps = BITRATES_V1_L3[bitrateIndex];
    const rate = RATES_V1[rateIndex];
    const length = Math.floor((144 * kbps * 1000) / rate) + padding;
    if (length <= 0) {
      at += 1;
      continue;
    }
    frames += 1;
    seconds += 1152 / rate;
    at += length;
  }
  return { seconds, frames };
}

const here = path.dirname(fileURLToPath(import.meta.url));
const CABINETS: Array<{ cabinet: string; dir: string; keys: readonly string[] }> = [
  {
    cabinet: 'Ghost on the Menu',
    dir: path.join(here, '..', 'public', 'tracks'),
    keys: TRACK_KEYS,
  },
  {
    cabinet: 'Vibe Typer',
    dir: path.join(here, '..', 'public', 'vibe', 'tracks'),
    keys: VIBE_TRACK_KEYS,
  },
];

describe('the recorded beds are two-minute pieces', () => {
  for (const { cabinet, dir, keys } of CABINETS) {
    it(`${cabinet}: every bed plays for 110 to 130 seconds`, () => {
      for (const key of keys) {
        const file = path.join(dir, `${key}.mp3`);
        const { seconds, frames } = mp3Seconds(file);
        expect(frames, `${key}: no mp3 frames found`).toBeGreaterThan(0);
        expect(seconds, `${key} is ${seconds.toFixed(2)}s`).toBeGreaterThanOrEqual(MIN_SECONDS);
        expect(seconds, `${key} is ${seconds.toFixed(2)}s`).toBeLessThanOrEqual(MAX_SECONDS);
      }
    });

    it(`${cabinet}: every bed is present and inside the weight a package can carry`, () => {
      for (const key of keys) {
        const size = statSync(path.join(dir, `${key}.mp3`)).size;
        expect(size, key).toBeGreaterThan(0);
        expect(size, key).toBeLessThan(MAX_BYTES);
      }
    });
  }

  it('carries the beds the code names and no stray file', () => {
    for (const { cabinet, dir, keys } of CABINETS) {
      const found = readdirSync(dir)
        .filter((name) => name.endsWith('.mp3'))
        .sort();
      // `parallelism.mp3` was a bed until v0.7.0, when a burst became the
      // playing bed faster; it is not in the tree and must not come back as
      // one. Anything here that the code does not name is weight in the
      // tarball that nothing ever plays.
      expect(found, cabinet).toEqual([...keys].sort().map((key) => `${key}.mp3`));
    }
  });
});
