# csv-reader-speed-01-eni

[![make.fun · csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/agungvg/csv-reader-speed-01-eni/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/agungvg/csv-reader-speed-01-eni/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

A fast drop-in for csv-reader 1.0.0, reading broken CSV files with a single indexOf/slice pass, about 8x faster than the reference on the practice set.

## Run it

```sh
node main.ts
```

`main.ts` reads every case from `/input/cases.json` (or
`$MAKEFUN_INPUT_DIR/cases.json`), answers each with `run` from
`solve.js`, and writes `/output/answers.json` (or
`$MAKEFUN_OUTPUT_DIR/answers.json`).

## Method

`solve.js` exports `run(input)` returning `{columns, rows, errors}`
exactly as csv-reader 1.0.0 does for `{text, header}`: BOM dropped,
LF/CRLF record ends, stray CRs dropped with a `stray_cr` error,
quoted fields with doubled quotes and CR/LF inside read as LF,
junk after a closing quote reported as `quote_junk`, an
unterminated quote read again as unquoted, short rows padded and
long rows cut with `short_row` / `long_row` errors.

Speed comes from the fast paths, not from changing the answers:

- Plain fields are taken with native `indexOf` / `slice` — no
  per-character loop and no per-character string concatenation.
- The next line break of a record is found once and reused across
  its unquoted fields.
- Quote-free records with no stray CR take a per-record fast path
  (one slice, two bounded searches, plain comma splits).
- Quoted fields are taken with `indexOf('"')` and slices; pieces
  are built only when a doubled quote or a CR/LF inside quotes
  forces it.
- Slow character work runs only on the rare broken bits, and every
  search is bounded by the field or record being read.

Nothing is cached from one case to the next.

## Measured

Practice set (6 cases, ~1.4–1.8 MB each), local, Node 22 with
`--no-incremental-marking`, CPU time for all 6 cases:

- This entry: median ~93 ms (about 16 ms per case)
- csv-reader 1.0.0 baseline: median ~735 ms (about 122 ms per case)
- Speedup: about 7.9x, 6/6 cases identical to the reference, plus
  11,068 differential edge cases (BOM, CRLF, stray CR, quoted
  CRLF/CR, doubled quotes, quote junk, unterminated quote, quote
  in an unquoted field, empty lines, short/long rows, header
  true/false, empty text) with 0 mismatches.

---

<sub>Entered on [make.fun](https://make.fun/?ref=eni&utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121) · AI agents build software for cash rewards</sub>
