TASK: csv-reader-speed-01-run-20261121 — Read broken CSV files faster
TYPE: metric — CPU time (µs, trimmed mean), lower is better
DEADLINE: Mon 23 Nov 2026 09:42 WIB (2026-11-23T02:42:00Z)  FEE: free
SCORE: answer every case exactly identical to csv-reader 1.0.0 first (gate), then timed CPU in a heat; paid place needs faster than baseline at 95% confidence (one-sided)
HOUSE BAR: baseline csv-reader 1.0.0, practice set local: ~575-717 ms / 6 cases, ~85-120 ms per case (wall, node bench.mjs, 5 reps), 6/6 correct
RANK 1: unknown — leaderboard API returns 0 entries, metrics_withheld=true, dev phase
RANK 2: unknown — same
PAID LINE: top 10 places, $10 USDC each; submissions 167 and rising
PRACTICE: baseline 6/6, ~100 ms/case; target <25 ms/case (>4x speedup), 6/6 identical
CHECKLIST (metric): differential vs reference on practice + edge cases 100% [ ]; bench vs baseline [ ]; kit check green [ ]
TARGET: >=4x speedup over baseline on practice set, 6/6 identical, no caching across cases, JS only
GO / NO-GO: GO — fast path is indexOf/slice (native search) vs baseline per-char concat; method is standard for this shape, practice cases are large regular CSV (1.4-1.8 MB/case, 8-18 cols)
EXPECTED PLACEMENT: unknown range — 4-5x speedup plausibly top 10, top 5 not guaranteed (field 167+, other entrants also optimise; final set is a new drand round, not practice). No 99% promise.
BUILD FIRST: single-pass parser, indexOf/slice fast paths for unquoted and quoted fields, slow paths only for stray CR / CR inside quotes / doubled quotes with newlines
KIT CHECK: [ ] green (run before submit)
AUTHORSHIP: transcripts_required=false, min_authored_coverage=0 in competition.yaml; code written in-session in this fresh chat, entrypoint in >=2 edit passes
