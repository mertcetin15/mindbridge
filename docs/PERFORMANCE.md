# Performance baseline

Measured on 18 October 2026 on one Windows 11 laptop, in the Claude desktop app's built-in Chromium pane, against a
local server on `127.0.0.1`. The pane was not in the foreground, so it did not paint: **first and largest contentful
paint were not reported and are not claimed.** Nothing here is a Lighthouse or Core Web Vitals score, and nothing here
describes a phone or a real network.

Two builds were compared: the project exactly as received (`12121212.zip`, built with its own `build_frontend.py` on
Windows) and this release. Both ran the same way, one on port 8000 and one on 8001.

## First visit (cold), from the browser's own resource entries

| | Received | This release | Change |
| --- | --- | --- | --- |
| Requests | 66 | 76 | +10 |
| Scripts / stylesheets | 36 / 26 | 45 / 27 | +9 / +1 |
| Transferred, compressed | 256 KB | 291 KB | +35 KB (+14%) |
| Decoded (what the browser parses) | 730 KB | 814 KB | +84 KB (+11.5%) |
| Largest file, compressed | `translations.js` 30 KB | `translations.js` 30 KB | none |
| Layout shift (CLS) | 0 | 0 | none |
| Long tasks (> 50 ms) | 0 | 0 | none |
| JS heap after load | 4.1 MB | 3.4 MB | not meaningful (single sample) |

The extra files are the features added in this release (state layer and tokens, save state, simplify, welcome,
reminders, support templates, icons, the delegated click handler, calm room). They are small, but every one is a
separate request. Nothing is bundled or lazy-loaded yet; that is the obvious next saving if the first visit on a slow
connection matters, and it has not been measured.

## Repeat visit (warm), 6 loads each

| | Received (built on Windows) | This release |
| --- | --- | --- |
| DOMContentLoaded, median (range) | ~143 ms (130–168) | ~70 ms (59–90) |
| Assets served from the browser cache | 2 of 62 | 72 of 72 |
| Assets re-validated with the server (304) | 60 of 62, about 18 KB of headers | 0 |
| Cache header on an asset | `max-age=0, must-revalidate` | `max-age=31536000, immutable` |

**Why the repeat visit is faster, and where that does not apply.** The received build wrote asset files with
Windows line endings *after* hashing the text with Unix endings, so the version in the page (`a3e8b77a4ef8`) never
matched the file actually served (`ac33609db678`). The server only marks an asset immutable when the digest matches,
so every repeat visit re-checked every file. `build_frontend.py` now writes UTF-8 with Unix endings, and
`tests/test_performance_budget.py` fails if any digest stops matching. **This gain exists only for builds made on
Windows.** A Docker or Linux build (the Render deployment path in `docs/DEPLOYMENT.md`) never had the bug, so on that
path the received build would have cached correctly and this comparison would show no repeat-visit improvement.

## Budget enforced by the tests

`tests/test_performance_budget.py` computes, from the built files, with the server's gzip level: scripts ≤ 52 (raised from 50 for the path strip, calm options and account recovery: five small files; bundling would remove the cost but loses error isolation between scripts and could not be verified end to end here),
stylesheets ≤ 30, requests ≤ 84, compressed ≤ 330 KB, decoded ≤ 900 KB, document ≤ 40 KB, any one file ≤ 40 KB
compressed. Current values: 45, 27, 76, 288 KB, 814 KB, 32 KB, 30 KB. The limits are about 10% above reality on
purpose; a second test fails if they ever sit far above it. They are size limits, not timings.

## How to measure again

1. `python build_frontend.py`, start the server, open the page in a fresh tab and let it settle for a few seconds.
2. In the console, read `performance.getEntriesByType('navigation')[0]` for `domContentLoadedEventEnd` and
   `loadEventEnd`, and `performance.getEntriesByType('resource')` for `encodedBodySize`, `decodedBodySize` and
   `transferSize` (0 means it came from the cache; a small non-zero value means a 304).
3. Observe `layout-shift` and `longtask` with `PerformanceObserver({type, buffered: true})`.
4. Repeat at least five times and report the median and range. Keep the tab in the foreground if you need paint metrics.

## Not measured

Paint metrics (pane not foregrounded), any phone, any throttled network, HTTP/2 or HTTP/3 behaviour behind the real
host, memory over repeated navigation, scroll smoothness and frame rate of the bridge scene (its frame budget is
described in the README and was tested with a simulated slow device only), and the cost of each individual script.
