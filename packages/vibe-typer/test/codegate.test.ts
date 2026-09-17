// The code gate, one case per refusal reason plus an acceptance in every
// corpus stack. The gate is the mechanical half of G28 as slice 3 amends
// it: a seated model writes the request, and nothing it writes reaches the
// field without coming through here.

import { describe, expect, it } from 'vitest';

import {
  balanced,
  bandRange,
  BARRED_IN_CODE,
  gateCode,
  LANGUAGE_HINTS,
  MAX_COLS,
  MAX_LINES,
  MAX_TOLERANCE,
  reasonText,
  VALUE_TOLERANCE,
  type CodeGateCtx,
  type CodeGateReason,
} from '../src/codegate';
import { DEFAULT_CORPUS } from '../src/corpus';
import { britishHit } from '../src/spelling';
import { value as valueOf } from '../src/difficulty';
import { CORPUS_STACKS, DEFAULT_PATTERNS, FORM_FORBIDDEN, VOICE_FORBIDDEN } from '../src/patterns';
import type { Band, Stack } from '../src/types';

const SET = DEFAULT_PATTERNS.difficulty;

function ctx(stack: Stack, bandMin: Band, bandMax: Band = bandMin): CodeGateCtx {
  return { stack, bandMin, bandMax, corpus: DEFAULT_CORPUS, set: SET, tolerance: VALUE_TOLERANCE };
}

/** A candidate that is fine everywhere except where the case bends it. */
function candidate(over: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    ask: 'can you make the numbers go up a bit',
    code: 'total = sum(items)\nprint(total)',
    title: 'a running total',
    notes: ['sum walks the list once'],
    ...over,
  };
}

function reasonOf(result: ReturnType<typeof gateCode>): CodeGateReason | 'ok' {
  return result.ok ? 'ok' : result.reason;
}

/** The first corpus snippet of a stack the gate is happy with, and its band. */
function passing(stack: Stack): { code: string; band: Band } {
  for (const snippet of DEFAULT_CORPUS.byStack[stack] ?? []) {
    const r = gateCode(candidate({ code: snippet.code }), ctx(stack, snippet.band));
    if (r.ok) return { code: snippet.code, band: snippet.band };
  }
  throw new Error(`no corpus snippet of ${stack} passes the gate`);
}

describe('the code gate refuses, one reason at a time', () => {
  it('refuses a shape that is not a request', () => {
    expect(reasonOf(gateCode(null, ctx('python', 1)))).toBe('empty');
    expect(reasonOf(gateCode('print(1)', ctx('python', 1)))).toBe('empty');
    expect(reasonOf(gateCode({ ask: 'hi', code: 'x = 1' }, ctx('python', 1)))).toBe('empty');
    expect(reasonOf(gateCode(candidate({ notes: [4] }), ctx('python', 1)))).toBe('empty');
    expect(reasonOf(gateCode(candidate({ code: '   \n  \n' }), ctx('python', 1)))).toBe('empty');
  });

  it('refuses anything outside plain ASCII', () => {
    expect(reasonOf(gateCode(candidate({ code: 'total = sum(itéms)' }), ctx('python', 1)))).toBe(
      'not-ascii',
    );
  });

  it('refuses a tab and a carriage return', () => {
    expect(reasonOf(gateCode(candidate({ code: 'if x:\n\treturn x' }), ctx('python', 1)))).toBe(
      'tab',
    );
    // A carriage return at the end of a line is a CRLF file ending and the
    // trailing-whitespace trim has already taken it; one inside a line is
    // the seat doing something strange, and that is refused.
    expect(reasonOf(gateCode(candidate({ code: 'x = 1\ry = 2' }), ctx('python', 1)))).toBe('tab');
    expect(
      gateCode(candidate({ code: 'total = sum(items)\r\nprint(total)' }), ctx('python', 1)).ok,
    ).toBe(true);
  });

  it('refuses more lines than a request may carry', () => {
    const code = Array.from({ length: MAX_LINES + 1 }, (_, i) => `x${i} = ${i}`).join('\n');
    expect(reasonOf(gateCode(candidate({ code }), ctx('python', 1)))).toBe('too-many-lines');
  });

  it('refuses a line wider than the editor', () => {
    const code = `name = "${'a'.repeat(MAX_COLS)}"`;
    expect(reasonOf(gateCode(candidate({ code }), ctx('python', 1)))).toBe('too-wide');
  });

  it('refuses unbalanced brackets and an unbalanced quote', () => {
    expect(reasonOf(gateCode(candidate({ code: 'print(total' }), ctx('python', 1)))).toBe(
      'unbalanced',
    );
    expect(reasonOf(gateCode(candidate({ code: 'name = "open' }), ctx('python', 1)))).toBe(
      'unbalanced',
    );
    expect(reasonOf(gateCode(candidate({ code: 'x = [1, 2)' }), ctx('python', 1)))).toBe(
      'unbalanced',
    );
  });

  it('refuses the wrong language', () => {
    const r = gateCode(candidate({ code: 'const total = 1;' }), ctx('python', 1));
    expect(reasonOf(r)).toBe('wrong-language');
    const j = gateCode(
      candidate({ code: 'def total(items):\n    return sum(items)' }),
      ctx('java', 1),
    );
    expect(reasonOf(j)).toBe('wrong-language');
  });

  it('refuses a barred word anywhere, comments included', () => {
    const r = gateCode(
      candidate({ code: 'total = sum(items)\n# the ghost of a total' }),
      ctx('python', 1),
    );
    expect(reasonOf(r)).toBe('barred-word');
  });

  it('refuses code that names a model', () => {
    const r = gateCode(
      candidate({ code: 'total = sum(items)\n# written by gemini' }),
      ctx('python', 1),
    );
    expect(reasonOf(r)).toBe('names-a-model');
  });

  it('refuses a value outside the band, either side', () => {
    const range = bandRange(DEFAULT_CORPUS, SET, 'python', 3, 3);
    expect(range).not.toBeNull();
    const under = gateCode(candidate({ code: 'x = 1' }), ctx('python', 3));
    expect(reasonOf(under)).toBe('value-out-of-band');
    const fat = Array.from(
      { length: MAX_LINES },
      (_, i) => `k${i} = {"a": [${i}], "b": (${i},)}`,
    ).join('\n');
    expect(valueOf({ ...unit, code: fat }, DEFAULT_CORPUS.model, SET)).toBeGreaterThan(
      range!.max * (1 + VALUE_TOLERANCE),
    );
    expect(reasonOf(gateCode(candidate({ code: fat }), ctx('python', 3)))).toBe(
      'value-out-of-band',
    );
  });

  it('refuses when the corpus has nothing in the band at all', () => {
    // The integration stack is seasoned in from the tapes at plan time; the
    // shipped corpus has none, so there is no range to measure against and
    // the gate says so rather than guessing a ceiling.
    const r = gateCode(candidate({ code: 'tools/call' }), ctx('integration', 1));
    expect(reasonOf(r)).toBe('value-out-of-band');
  });

  it('refuses an ask that cannot be said', () => {
    expect(reasonOf(gateCode(candidate({ ask: 'make it do 3 things' }), ctx('python', 1)))).toBe(
      'bad-ask',
    );
    expect(reasonOf(gateCode(candidate({ ask: 'do it NOW please' }), ctx('python', 1)))).toBe(
      'bad-ask',
    );
    expect(
      reasonOf(gateCode(candidate({ ask: 'can you rewrite {title} for me' }), ctx('python', 1))),
    ).toBe('bad-ask');
    // A live seat wrote the product itself in braces rather than the hole.
    expect(
      reasonOf(
        gateCode(candidate({ ask: 'make the {diary for plants} do the thing' }), ctx('python', 1)),
      ),
    ).toBe('bad-ask');
  });

  // The corpus loader refuses an authored ask that names a story level's noun
  // without saying which level it is for, and `askFor` drops a bound ask
  // outside its level. This is the other door into the same field, and it was
  // not held to that rule: a seated snippet carries no `for`, so a seat — or
  // any MCP client in the user's chair through the container's `ask` tool —
  // could put a duck into an app for lost socks. The duck belongs beside the
  // brace case, which is where it is.
  it('refuses an ask that leans on a story level the seat is not in', () => {
    expect(
      reasonOf(gateCode(candidate({ ask: 'reverse the line of waiting ducks' }), ctx('python', 1))),
    ).toBe('bad-ask');
    const r = gateCode(candidate({ ask: 'add my first sandwich to {product}' }), ctx('python', 1));
    expect(reasonOf(r)).toBe('bad-ask');
    if (!r.ok) expect(r.detail).toBe('story noun');
    // The hole is read as the product before the rule runs, so a product that
    // is itself a story is not what this catches — only the ask's own words.
    expect(
      reasonOf(
        gateCode(candidate({ ask: 'keep only the ones with no partner' }), ctx('python', 1)),
      ),
    ).toBe('ok');
  });

  // The tolerance is how far outside the band's own corpus range a seated
  // snippet's value may sit. At one or more the low edge is zero or negative,
  // so nothing can ever be refused as under-band; negative inverts the window
  // and refuses almost everything. Either is a caller bug in the one module
  // standing between a model's answer and the field, so it says so.
  it('refuses to run at all on a tolerance that is not a tolerance', () => {
    const wide = { ...ctx('python', 1), tolerance: 1 };
    expect(() => gateCode(candidate(), wide)).toThrow('tolerance');
    expect(() => gateCode(candidate(), { ...ctx('python', 1), tolerance: -0.1 })).toThrow(
      'tolerance',
    );
    expect(() => gateCode(candidate(), { ...ctx('python', 1), tolerance: NaN })).toThrow(
      'tolerance',
    );
    // The edges hold, and the one every caller passes is well inside them.
    expect(() => gateCode(candidate(), { ...ctx('python', 1), tolerance: 0 })).not.toThrow();
    expect(() =>
      gateCode(candidate(), { ...ctx('python', 1), tolerance: MAX_TOLERANCE }),
    ).not.toThrow();
    expect(VALUE_TOLERANCE).toBeLessThanOrEqual(MAX_TOLERANCE);
  });

  it('keeps the product hole in an ask and fills nothing itself', () => {
    const r = gateCode(
      candidate({ ask: 'can {product} do the thing with the list' }),
      ctx('python', 1),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.snippet.ask).toBe('can {product} do the thing with the list');
  });

  it('refuses a line that is not plain ASCII, wherever it is', () => {
    // A live seat sent a note with a non-breaking hyphen in it.
    const dash = 'the output forms a two\u2011column table';
    expect(reasonOf(gateCode(candidate({ notes: [dash] }), ctx('python', 1)))).toBe('bad-notes');
    expect(reasonOf(gateCode(candidate({ ask: `can you ${dash}` }), ctx('python', 1)))).toBe(
      'bad-ask',
    );
    expect(reasonOf(gateCode(candidate({ title: 'two\u2011column' }), ctx('python', 1)))).toBe(
      'bad-title',
    );
    expect(
      reasonOf(gateCode(candidate({ product: 'a caf\u00e9 for gnomes' }), ctx('python', 1))),
    ).toBe('bad-product');
  });

  it('refuses a British spelling in any text field, with the word in the detail', () => {
    // The review's third change: the seat writes in whatever English it was
    // raised on; the field is American.
    const r = gateCode(candidate({ ask: 'can {product} pick a colour' }), ctx('python', 1));
    expect(reasonOf(r)).toBe('bad-ask');
    if (!r.ok) expect(r.detail).toContain('colour');
    expect(reasonOf(gateCode(candidate({ title: 'favourite fare' }), ctx('python', 1)))).toBe(
      'bad-title',
    );
    expect(
      reasonOf(gateCode(candidate({ notes: ['it is organised by name'] }), ctx('python', 1))),
    ).toBe('bad-notes');
    expect(
      reasonOf(gateCode(candidate({ product: 'a loyalty programme for ducks' }), ctx('python', 1))),
    ).toBe('bad-product');
  });

  it('refuses a title that cannot be said', () => {
    expect(reasonOf(gateCode(candidate({ title: 'the 2nd total' }), ctx('python', 1)))).toBe(
      'bad-title',
    );
  });

  it('refuses too many notes, and a note that cannot be said', () => {
    expect(
      reasonOf(gateCode(candidate({ notes: ['one', 'two', 'three', 'four'] }), ctx('python', 1))),
    ).toBe('bad-notes');
    expect(reasonOf(gateCode(candidate({ notes: ['it costs 5 cents'] }), ctx('python', 1)))).toBe(
      'bad-notes',
    );
    expect(
      reasonOf(
        gateCode(
          candidate({ notes: ['a note that runs on and on and on and on and on and on'] }),
          ctx('python', 1),
        ),
      ),
    ).toBe('bad-notes');
  });

  it('refuses a product that cannot be said or runs long', () => {
    expect(reasonOf(gateCode(candidate({ product: 'app for 3 cats' }), ctx('python', 1)))).toBe(
      'bad-product',
    );
    expect(
      reasonOf(
        gateCode(
          candidate({ product: 'a small quiet app about the many moods of a garden fence' }),
          ctx('python', 1),
        ),
      ),
    ).toBe('bad-product');
  });
});

/** A shape for the value helper above; only `code` is read. */
const unit = {
  id: 'unit',
  stack: 'python' as Stack,
  band: 1 as Band,
  title: 'unit',
  code: '',
  notes: [],
  topics: [],
};

describe('the code gate accepts', () => {
  it('takes a real corpus snippet of every stack, re-wrapped as a candidate', () => {
    for (const stack of CORPUS_STACKS) {
      const { code, band } = passing(stack);
      const r = gateCode(candidate({ code }), ctx(stack, band));
      expect(r.ok, stack).toBe(true);
      if (r.ok) {
        expect(r.snippet.stack, stack).toBe(stack);
        expect(r.snippet.band, stack).toBe(band);
        expect(r.snippet.topics, stack).toEqual([]);
        expect(r.snippet.id, stack).toMatch(/^seat-/);
        expect(r.snippet.ask, stack).toBe('can you make the numbers go up a bit');
      }
    }
  });

  it('carries the product through when the seat named one', () => {
    const { code, band } = passing('python');
    const r = gateCode(
      candidate({ code, product: 'a diary for houseplants' }),
      ctx('python', band),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.product).toBe('a diary for houseplants');
  });

  it('takes the id the caller gives it', () => {
    const { code, band } = passing('python');
    const r = gateCode(candidate({ code }), { ...ctx('python', band), id: 'seat-one' });
    expect(r.ok && r.snippet.id).toBe('seat-one');
  });

  it('gives the same verdict for the same candidate every time', () => {
    const { code, band } = passing('sql');
    const a = gateCode(candidate({ code }), ctx('sql', band));
    const b = gateCode(candidate({ code }), ctx('sql', band));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('the parts the gate is built from', () => {
  it('balances brackets over the block and quotes inside a line', () => {
    expect(balanced('def f():\n    return (1, [2])', 'python')).toBe(true);
    expect(balanced('x = {\n  "a": 1,\n}', 'python')).toBe(true);
    expect(balanced("# it's fine in a comment", 'python')).toBe(true);
    expect(balanced('// it is not this line\nconst a = 1;', 'javascript')).toBe(true);
    expect(balanced('const s = "a } b";', 'javascript')).toBe(true);
    expect(balanced('const s = "unclosed;', 'javascript')).toBe(false);
    expect(balanced('def f(:\n    return', 'python')).toBe(false);
  });

  it('is the same barred list as the chat gate, minus the digit branch', () => {
    // VOICE_FORBIDDEN refuses any digit; code has digits and always will.
    // Every other word in that list, and every inflection FORM_FORBIDDEN
    // added, is still refused in code.
    for (const word of [
      'lie',
      'fact',
      'revealed',
      'followed',
      'held',
      'score',
      'pass',
      'fail',
      'nrp',
      'integrity',
      'utility',
      'cleared',
      'ghost',
    ]) {
      expect(BARRED_IN_CODE.test(`a ${word} here`), word).toBe(true);
      expect(VOICE_FORBIDDEN.test(`a ${word} here`), word).toBe(true);
    }
    for (const word of [
      'lies',
      'lied',
      'facts',
      'scores',
      'scored',
      'scoring',
      'passes',
      'passed',
      'fails',
      'failed',
      'failing',
      'ghosts',
    ]) {
      expect(BARRED_IN_CODE.test(`a ${word} here`), word).toBe(true);
      expect(FORM_FORBIDDEN.test(`a ${word} here`), word).toBe(true);
    }
    expect(BARRED_IN_CODE.test('rows = 7')).toBe(false);
    expect(VOICE_FORBIDDEN.test('rows = 7')).toBe(true);
  });

  it('reads every corpus snippet as its own language', () => {
    for (const stack of CORPUS_STACKS) {
      const hints = LANGUAGE_HINTS[stack];
      for (const snippet of DEFAULT_CORPUS.byStack[stack] ?? []) {
        const where = `${stack} ${snippet.id}`;
        expect(
          (hints.needs ?? []).every((re) => re.test(snippet.code)),
          where,
        ).toBe(true);
        expect(
          hints.must.some((re) => re.test(snippet.code)),
          where,
        ).toBe(true);
        expect(
          hints.mustNot.some((re) => re.test(snippet.code)),
          where,
        ).toBe(false);
      }
    }
  });

  it('measures a band range off the corpus and caches it', () => {
    const a = bandRange(DEFAULT_CORPUS, SET, 'python', 1, 2);
    const b = bandRange(DEFAULT_CORPUS, SET, 'python', 1, 2);
    expect(a).toBe(b);
    expect(a!.min).toBeLessThanOrEqual(a!.max);
    expect(bandRange(DEFAULT_CORPUS, SET, 'integration', 1, 7)).toBeNull();
  });
});

// ——— what a refusal says ————————————————————————————————————————————————
//
// The reason was a machine word and the detail was a bare measurement: `13`
// for a block of thirteen lines, `94` for a column count, `under` for a value
// outside the band. A seat, or the operator reading a container refusal,
// cannot correct the next attempt from a number with no limit beside it — and
// this gate is the one mechanical thing standing between a model's answer and
// the field.

describe('the refusal says what it wants', () => {
  it('puts the bound beside the measurement', () => {
    const tall = gateCode(
      candidate({ code: Array.from({ length: MAX_LINES + 1 }, (_, i) => `a${i} = 1`).join('\n') }),
      ctx('python', 1),
    );
    expect(reasonOf(tall)).toBe('too-many-lines');
    if (!tall.ok) expect(tall.detail).toBe(`${MAX_LINES + 1} of ${MAX_LINES}`);

    const wide = gateCode(
      candidate({ code: `total = ${'1 + '.repeat(MAX_COLS).trim()}1` }),
      ctx('python', 1),
    );
    expect(reasonOf(wide)).toBe('too-wide');
    if (!wide.ok) expect(wide.detail).toContain(` of ${MAX_COLS}`);
  });

  it('says which side of the band a value missed, in words', () => {
    const over = gateCode(
      candidate({ code: 'import functools\nq = functools.reduce(lambda a, b: a ^ b, zs, 0)' }),
      ctx('python', 1),
    );
    if (!over.ok && over.reason === 'value-out-of-band') {
      expect(over.detail).toMatch(/floor|ceiling|corpus|number/);
    }
  });

  // One rendering, so the container tool, the sit runner and any future
  // surface all say the same thing instead of each inventing a phrasing.
  it('renders one plain sentence per reason, with the constant named', () => {
    const good = gateCode(candidate(), ctx('python', 1));
    expect(good.ok).toBe(true);
    expect(reasonText(good)).toBe('the request is good');

    const tall = gateCode(
      candidate({ code: Array.from({ length: MAX_LINES + 1 }, (_, i) => `a${i} = 1`).join('\n') }),
      ctx('python', 1),
    );
    const said = reasonText(tall);
    expect(said).toContain(String(MAX_LINES));
    expect(said.trim()).toBe(said);
    expect(said[0]).toBe(said[0]!.toLowerCase());

    // Every reason renders something, and nothing renders empty.
    const reasons: CodeGateReason[] = [
      'empty',
      'not-ascii',
      'tab',
      'too-many-lines',
      'too-wide',
      'unbalanced',
      'wrong-language',
      'barred-word',
      'names-a-model',
      'value-out-of-band',
      'bad-ask',
      'bad-title',
      'bad-notes',
      'bad-product',
    ];
    for (const reason of reasons) {
      const text = reasonText({ ok: false, reason });
      expect(text.length, reason).toBeGreaterThan(8);
      expect(britishHit(text), reason).toBeNull();
    }
  });

  // The one refusal sentence that carries a number used to print the module
  // constant while the gate applied `ctx.tolerance`, so a caller gating at
  // 0.3 told the seat the ceiling was 0.15 and the seat corrected against a
  // bound nobody used.
  it('names the widening it actually applied, not the module default', () => {
    const wider = { ...ctx('python', 3), tolerance: 0.3 };
    const under = gateCode(candidate({ code: 'x = 1' }), wider);
    expect(reasonOf(under)).toBe('value-out-of-band');
    if (under.ok) throw new Error('expected a refusal');
    expect(under.tolerance).toBe(0.3);
    const said = reasonText(under);
    expect(said).toContain('30%');
    expect(said).not.toContain('15%');
    expect(said).not.toContain('0.15');

    // And the default caller still hears its own number.
    const plain = gateCode(candidate({ code: 'x = 1' }), ctx('python', 3));
    if (plain.ok) throw new Error('expected a refusal');
    expect(reasonText(plain)).toContain('15%');
  });

  // The bound goes beside the measurement, the way too-wide and
  // too-many-lines already do it.
  it('puts the value beside the window it missed', () => {
    const under = gateCode(candidate({ code: 'x = 1' }), ctx('python', 3));
    if (under.ok) throw new Error('expected a refusal');
    expect(under.detail).toMatch(/floor: \d+ of \d+\.\.\d+$/);
  });

  // The two value refusals that apply no tolerance claim no number.
  it('claims no widening where none was applied', () => {
    const none = gateCode(candidate({ code: 'tools/call' }), ctx('integration', 1));
    if (none.ok) throw new Error('expected a refusal');
    expect(none.tolerance).toBeUndefined();
    expect(reasonText(none)).not.toMatch(/%/);
  });

  // 80 columns and 12 lines bound a seated ask; the authored corpus ships
  // past both and plays, so the sentences may not say "the field".
  it('says the seat is the thing the width and depth bound', () => {
    const wide = gateCode(candidate({ code: `x = "${'a'.repeat(MAX_COLS)}"` }), ctx('python', 1));
    if (wide.ok) throw new Error('expected a refusal');
    expect(reasonText(wide)).toContain('a seated line may reach');
    const tall = gateCode(
      candidate({ code: Array.from({ length: MAX_LINES + 1 }, (_, i) => `a${i} = 1`).join('\n') }),
      ctx('python', 1),
    );
    if (tall.ok) throw new Error('expected a refusal');
    expect(reasonText(tall)).toContain('a seated request may run to');
    for (const said of [reasonText(wide), reasonText(tall)]) {
      expect(said).not.toContain('the field');
    }
  });

  // The title and the notes are recorded, never rendered, so a refusal over
  // them may not be phrased as a field constraint.
  it('says what the title and the notes are held to, not where they show', () => {
    const badTitle = gateCode(candidate({ title: 'a colour wheel' }), ctx('python', 1));
    expect(reasonOf(badTitle)).toBe('bad-title');
    if (badTitle.ok) throw new Error('expected a refusal');
    expect(reasonText(badTitle)).toContain('the same scan every authored line passes');
    expect(reasonText(badTitle)).not.toContain('said on the field');

    const badNotes = gateCode(candidate({ notes: ['it honours the list'] }), ctx('python', 1));
    expect(reasonOf(badNotes)).toBe('bad-notes');
    if (badNotes.ok) throw new Error('expected a refusal');
    expect(reasonText(badNotes)).toContain('the same scan every authored line passes');
    expect(reasonText(badNotes)).not.toContain('said on the field');
  });
});
