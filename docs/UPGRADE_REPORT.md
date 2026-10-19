# MindBridge upgrade: final report

Base: the project as supplied in `12121212.zip`. Work folder: `mindbridge-main` (the zip and the earlier local folder were not modified). Environment: Windows 11, Python 3.14, Node 24, the in-app Chromium. Figures below were measured in this environment on 18-19 October 2026 (final pass on 19 October) and are stated with what they cover. Nothing here comes from a hosted site, a real Groq request, PostgreSQL, Docker or GitHub Actions: none of those could be run (section 4).

## 1. Project audit

**Already in place and kept** (verified by reading the code and running it): Argon2id passwords; cookie sessions with CSRF; per-IP rate limiting; ownership checks on entries, planner and export; crisis wording handled without the provider; the AI key held only on the server; Alembic migrations; a build that produces `frontend/index.html`, `frontend/assets/` and a portable `MindBridge.html`; four-language copy with a parity test; 25-minute timer default; a reduced-motion rule in CSS.

**Defects found in the actual code and fixed** (each was observed, not assumed):

| Observed defect | Evidence | Fix |
|---|---|---|
| Server wrote no log; error responses carried a `request_id` that no log line mentioned | Read of `backend/app.py`; no logging call | Privacy-safe event log (`log_event`), generic 500 body, runbook |
| One baseline Python test failed on Windows (asset digests differed from file bytes because of CRLF) | 112 passed, 1 failed before any change | Explicit UTF-8 and LF writes in `build_frontend.py` |
| Tests opened the developer's real `data/` database | A test run created `data/` | `test_api.py` uses explicit in-memory settings |
| Browser Back left the site; no page had an address | Read of `app.js`; confirmed in the browser | `journey.js` (history entries, `#/page` addresses) |
| Inline `onclick` everywhere blocked a strict CSP | Read of `page.html` | `events.js` delegated, allow-listed handlers; CSP `script-src 'self'` |
| Timer completion showed only "Session complete."; the focus review used graded wording | Read of `tools.js`, `focus.js` | Three self-reported outcomes, hints, continue-on-click |
| Chat consent checkbox 13px, others 18px | Measured in the browser | 24px inside a 44px label |
| Stories sideways scroll of 18px at 768px (hover wash) | Measured | `overflow-x:clip` at every width |
| Stories numerals 2.08:1 at 34px | Computed | opacity .78 (3.46:1) |
| Four script smooth-scrolls ignored reduced motion | Read of source | Conditional on the setting; a test fails otherwise |
| The `<nav>` element I first used for the path strip inherited the site's fixed 76px header rules | Seen in a screenshot | `div role="navigation"` |
| Grounding and Take a break cards unreachable | Measured in the browser | Not a defect to fix here: retired by the interface on purpose; options only offer what can be reached |
| Visual fingerprint ignored the left border (saved = saving) | Compared two hashes | Property added, baseline recaptured, test pins it |
| No account recovery: a forgotten password meant a lost account | Read of `backend/accounts.py`; no route | Optional one-time recovery code (no email needed), migration `0003` |
| No type scale; unstyled text field outside page scopes; Chat, Contact and Self-check controls 6px against 5px | Gallery and measurement | Tokens and zero-specificity rules; one radius rule |

**Suggested in the brief but not applicable or deliberately not done:** email verification and a reset link (the product stores no email address and has no mail sender; the recovery code replaces the reset link); a general feature-flag system (one switch added, `AI_ENABLED`; the interface layers share files, so more flags would be decoration); application-level encryption at rest (not added: it needs a key held somewhere the database host cannot read, which is a hosting decision; see `docs/SECURITY.md`); script bundling (not done: it would remove error isolation between scripts and could not be verified end to end here).

## 2. Implemented improvements

**Technical architecture and security.** Crisis tiers (`imminent`, `uncertain`) in `backend/safety.py` with JS-compatible patterns shared with the client; per-account login failure limiter, `POST /api/auth/logout-all`, per-account daily AI quota, `AI_ENABLED` kill switch; CSP, COOP and CORP headers; operational log with request ids and no content; `scripts/smoke.py`, `scripts/downgrade_planner.py`, `scripts/restore_drill.py`; `docs/SECURITY.md`, `DEPLOYMENT.md`, `DATA_INVENTORY.md`, `RUNBOOK.md`, `PERFORMANCE.md`; planner step states with a downgrade path; a build-in-sync test; account recovery by one-time code.

**UX and behavioural design.** Welcome and "right now" with reversible Simplify; five-minute default; planner step states, week description, optional reminders; support-request templates; journal prompt styles and save-state indicator; Library search with "why it matched" and empty states; calm entry (Dark Room); suggested path and working Back/Forward; calm options on a heavy day; plain passed-day line; gentle session completion.

**Visual design and polish.** One token set (`paper.css`, loaded last) for light and dark; state vocabulary (disabled, pending, error, pressed); printed-dial timer with a linear fallback; icon family; editorial labels; grain and selection treatment; a dev-only component gallery with a computed-style baseline across theme and width; frame budget for the 3D bridge.

## 3. Modified files

Compared byte-for-byte (line endings normalised) with the zip before the final pass: **56 added, 39 modified, 0 removed**; the final pass then added `backend/recovery.py`, `migrations/versions/0003_recovery_codes.py`, `frontend/recovery-ui.js`, `docs/UPGRADE_REPORT.md`, `docs/evidence/` and the tests `test_recovery.py`, `test_recovery_ui.cjs`, and modified `backend/accounts.py`, `backend/migrate.py`, `frontend/field-library.js`, `frontend/paper.css`, `tests/test_release.py` and `tests/test_performance_budget.py`. (generated `frontend/assets/*` excluded.)

*Modified:* `backend/accounts.py` (login lockout, logout-all, error codes), `backend/app.py` (CSP and headers, quota, kill switch, log, gallery route), `backend/database.py` (logout-all), `backend/limits.py` (peek, remaining, reset), `backend/planner.py` (step states), `backend/safety.py` (tiers, resources), `build_frontend.py` (LF writes, gallery), `frontend/page.html` (delegated events, new modules), `frontend/app.js`, `chat.js`, `checkin.js`, `campus-desk.js`, `field-library.js`, `focus.js`, `modern-ui.js`, `planner.js`, `planner-core.js`, `tools.js`, `zen-studio.js`, `garden-world.js`, `cinematic-renderer.js`, `dark-room.css`, `next-step.css` (copy, states, scroll, timer, budget), `package.json` (test list), `README.md`, `docs/DEPLOYMENT.md`, `docs/QA.md`, `docs/SECURITY.md`, `e2e/app.spec.cjs`, generated `frontend/index.html` and `MindBridge.html`, and the tests `test_api.py`, `test_campus_desk.cjs`, `test_chat_frontend.cjs`, `test_edition.cjs`, `test_focus_frontend.cjs`, `test_planner.py`, `test_planner_frontend.cjs`, `test_timer_integration.cjs`.

*Added (code):* `frontend/` `ask-help.js`, `calm-options-core.js`, `calm-options.js`, `calm-room.js`, `events.js`, `field-search-core.js`, `gallery.js`, `gallery.template.html`, `gallery.html` (generated), `icons.js`, `journey-core.js`, `journey.js`, `paper.css`, `reminders-core.js`, `reminders.js`, `save-state.js`, `simplify.js`, `welcome.js`; `scripts/` `downgrade_planner.py`, `restore_drill.py`, `smoke.py`; `Start-MindBridge.bat`, `Start-MindBridge-Local.bat`.

*Added (docs and data):* `docs/DATA_INVENTORY.md`, `JOURNEY.md`, `PERFORMANCE.md`, `RUNBOOK.md`, `VISUAL_QA.md`, `visual-baseline.json`, this report.

*Added (tests, 27 files):* `tests/` `test_ask_help`, `test_calm_options`, `test_calm_room`, `test_cinema_budget`, `test_copy_audit`, `test_dark_room`, `test_events`, `test_field_search_core`, `test_icons`, `test_journey`, `test_localization`, `test_reminders`, `test_reminders_core`, `test_save_state`, `test_simplify`, `test_states`, `test_task_states`, `test_welcome` (all `.cjs`); `test_build_in_sync`, `test_downgrade_planner`, `test_gallery`, `test_hardening`, `test_operations_log`, `test_performance_budget`, `test_restore_drill`, `test_safety`, `test_smoke` (all `.py`).

## 4. Validation results

**Run, and the result.** `python -m pytest -q`: **240 passed, 2 skipped** (the two skipped need a real PostgreSQL). `npm test`: **35 test files, 0 failures**. Baseline before any change: 112 passed, 1 failed (the CRLF digest test, fixed). Real Chromium (in-app): computed styles, real Tab-key focus, overflow at 320/768/1024/1280px on seven pages, Back/Forward, calm options, planner passed-day line (with a local test account), a focus session run to its real end, gallery in light and dark at three widths. `scripts/smoke.py` (15 public checks, 19 with an account) is exercised by `tests/test_smoke.py`; it was not run against a hosted site.

**Not run, and why.** PostgreSQL integration (no server); Docker build and Compose (no Docker); GitHub Actions (not pushed); Playwright e2e (not run here); the hosted Render site; a real Groq request (no key used); real-device phones; a screen reader; background-tab throttling and disconnect during a focus session; real `prefers-reduced-motion` emulation (the tool cannot set it); the browser's own zoom control (a 640px-wide viewport, equal to 200% of 1280px, was measured instead); multi-tab conflict behaviour beyond the planner revision tests.

**Unverified behaviour.** Everything in the "Not run" list. In addition: the passed-day line was checked once, in English, at desktop width.

**Remaining risks.**
- The AI quota and rate limiter live in one process's memory. Several workers or restarts give each their own counters.
- The old server rejects planner tasks that carry `status`; a rollback needs `scripts/downgrade_planner.py` first. The new `recovery_codes` table is ignored by the old code.
- A recovery code is the only way back if the password is forgotten. A person who creates none and forgets the password loses the account; the interface says so.
- Crisis resources have no human review date (`reviewed: None`): a person must check the hotline list before production.
- The home hero text sits over a canvas, so the contrast scan could not judge it.
- No external monitoring or alerting exists; the log is read by hand.
- Baseline captured in one engine only.

## 5. Deployment notes

New optional environment variables (all have safe defaults): `LOGIN_FAILURE_LIMIT` (default 10, range 3-100), `AI_DAILY_QUOTA` (default 200, 0 disables), `AI_ENABLED` (default on; `0`, `false`, `off`, `no` turn AI replies off). Existing: `APP_ENV`, `PUBLIC_ORIGIN`, `DATABASE_URL`, `GROQ_API_KEY`, `GROQ_MODEL`, `AI_REQUIRE_LOGIN`, `COOKIE_SECURE`, `TRUST_PROXY_HOPS`. No new service. **One new Alembic revision, `0003` (table `recovery_codes`), must be applied** (`python -m backend.migrate`, which `serve.py` also runs at start). Planner step states are stored inside the existing planner data (older clients send only `done`; the state is derived). The `/__gallery` page exists only when `APP_ENV` is not `production`. Back up the database before upgrading. Nothing was deployed from this work.

## 6. Remaining work

| Priority | Item |
|---|---|
| High | Run the PostgreSQL tests, the Docker build and the e2e suite in CI; read the first real CI result. |
| High | Have a person review the crisis resource list and set its review date. |
| Medium | Decide whether to add an email address for password reset in addition to the recovery code (a product and privacy decision). |
| Medium | Shared rate-limit and quota storage if more than one process will run. |
| Medium | Decide whether Grounding and Take a break return; the calm options only offer reachable tools. |
| Medium | Real-device, screen-reader and 200%-zoom passes. |
| Low | Script bundling (about 51 script requests; the budget test now allows 52; measured against the zip: +10 requests and +35 KB, +14%, before the final pass). |

## 7. Evidence-based change ledger

Status key: **Done** = implemented and checked as stated; **Partial** = implemented in part, with the gap named; **Not done**. "Observed" marks a defect seen in the code or browser; the rest are enhancements the brief asked for.

| ID | Changed behaviour | Main files | Status | Evidence / blocker |
|---|---|---|---|---|
| TECH-01 | Imminent crisis wording returns the crisis text; uncertain wording adds a support note | `safety.py`, `app.py`, `chat.js` | Done | `test_safety.py`, `test_api.py`; chat tiers in the browser. Blocker: no human review of resources |
| TECH-02 | Data inventory; log carries no content; export and delete exist; cross-account tests | `DATA_INVENTORY.md`, `app.py`, `test_hardening.py` | Partial | No application-level encryption; GDPR compliance not claimed or verified |
| TECH-03 | Per-name lockout, logout-all, session fixation and cookie tests; one-time recovery code with no email | `accounts.py`, `database.py`, `recovery.py`, `0003`, `recovery-ui.js`, `test_hardening.py`, `test_recovery.py` | Done, with one gap by design | 19 hardening + 10 recovery + 8 interface tests; real-browser recovery run end to end; failure timing 20.9-21.5 ms. Not provided: email verification and a reset link (no email exists), recovery code at sign-up (offered afterwards) |
| TECH-04 | Visible save state; failed writes keep the text | `save-state.js`, `checkin.js` | Partial | `test_save_state.cjs`, browser check. Multi-tab conflict only for the planner |
| TECH-05 | Restore drill for SQLite; PostgreSQL procedure documented | `restore_drill.py`, `RUNBOOK.md` | Partial | 3 tests. Never run on a real or production database |
| TECH-06 | CSP, COOP, CORP, quota, generic 500 | `app.py` | Done | `test_hardening.py`, `test_operations_log.py` |
| TECH-07 | Many new suites; CI file unchanged | `tests/`, `ci.yml` | Partial | 230 + 396; CI never run here |
| TECH-08 | Opt-in browser reminders, step states, weekly description | `reminders*.js`, `planner*.js`, `planner.py` | Done | `test_reminders*.cjs`, `test_task_states.cjs`, `test_planner.py` |
| TECH-09 | Delegated events; frame budget; performance budget test | `events.js`, `cinematic-renderer.js`, `test_performance_budget.py` | Partial | Budget test passes; bundling not done |
| TECH-10 | Operational log, runbook, smoke script | `app.py`, `RUNBOOK.md`, `smoke.py` | Done | `test_operations_log.py`, `test_smoke.py`. No external alerting |
| TECH-11 | Strict CSP with no third-party host; dependency audit notes | `app.py`, `SECURITY.md` | Partial | Audit read at the time; not re-run in CI |
| TECH-12 | Field-by-field data inventory | `DATA_INVENTORY.md` | Partial | Document only; retention is described, not enforced by a job |
| TECH-13 | `AI_ENABLED` switch; downgrade script; smoke | `app.py`, `downgrade_planner.py` | Partial | Both directions tested; no general flag system |
| UX-01 | "Right now" suggestions with reasons; reversible Simplify | `welcome.js`, `simplify.js` | Done | `test_welcome.cjs`, `test_simplify.cjs`, browser check |
| UX-02 | Five-minute default, remembered length | `tools.js` | Done | Timer suites |
| UX-03 | Back/Forward, addresses, suggested path | `journey*.js` | Done | 9 checks; browser: Back/Forward, 0 overflow, offline (fetch rejecting), signed out, unknown address, blocked history API (`docs/JOURNEY.md`). Phones and screen reader not tested |
| UX-04 | State vocabulary, reduced-motion coverage | `paper.css`, `test_states.cjs` | Partial | Static and computed checks; real reduced-motion emulation not possible |
| UX-05 | Journal prompt styles | `campus-desk.js` | Done | `test_campus_desk.cjs`, browser |
| UX-06 | Equal-weight options on a heavy day; limits stated | `calm-options*.js`, `checkin.js` | Partial | 11 checks and browser. Grounding and Take a break are retired in the interface (observed) |
| UX-07 | Step states, week description, passed-day line, copy audit | `planner*.js`, `test_copy_audit.cjs` | Partial | Browser (EN, desktop). Audit is a word list, not tone |
| UX-08 | Three outcomes, hints, continue on click | `focus.js` | Partial | Real 1-minute session run; throttling not exercised |
| UX-09 | Transparent saving and privacy text | `save-state.js` | Done | Suite and browser |
| UX-10 | Support-request templates | `ask-help.js` | Done | `test_ask_help.cjs`, browser |
| UX-11 | Non-blocking welcome | `welcome.js` | Done | `test_welcome.cjs` |
| UX-12 | Parity of four languages; scripted a11y audit | `test_localization.cjs` | Partial | Audit on 7 pages at 1280px; no screen reader |
| UX-13 | Library search with reasons, empty states, related guides from the editorial category | `field-search-core.js`, `field-library.js` | Done | Tests and browser; keyboard-only and screen-reader walkthrough not done |
| VIS-01 | One token set for both themes; type scale; one control radius | `paper.css` | Done | Gallery baseline recaptured and cross-checked for six theme/width keys; radius 5px measured on five pages. `btn-sm` equals the secondary button and fields are a little taller than buttons, both on purpose (`docs/VISUAL_QA.md`) |
| VIS-02 | Subtle grain | `paper.css` | Done | Computed style; no measured cost on a weak device |
| VIS-03 | Restrained palette; meaning colours | `paper.css` | Done | Contrast measured from tokens |
| VIS-04 | Dark theme tokens | `paper.css`, `dark-room.css` | Done | Tokens 5:1 or better; page-wide scan (one real finding fixed) |
| VIS-05 | Editorial labels; type scale tokens (12-32px) | `paper.css` | Done | Test; zero-specificity rules so styled elements keep their own sizes |
| VIS-06 | Buttons, cards, focus; fields and radius unified | `paper.css` | Done | Real Tab key: 2px ring; radius and field height measured on real pages |
| VIS-07 | Printed-dial timer, linear fallback | `tools.js`, `paper.css` | Done | Timer suite; visual check at desktop only |
| VIS-08 | Icons, bridge frame budget, motion cleanup | `icons.js`, `cinematic-renderer.js`, `zen-studio.js` | Partial | `test_icons.cjs`, `test_cinema_budget.cjs`; budget not measured on a weak device |
| VIS-09 | Selection and drag behaviour | `paper.css` | Done | Computed `user-select` in the browser |
| VIS-10 | Responsive composition | several | Done in this environment | Overflow 0 on seven pages at 320, 768, 1024 and 1440px, light and dark, and at 640x400 (equal to 200% zoom of 1280x800); real phones and the browser's own zoom control not used |
| VIS-11 | Zen Studio and garden | `zen-studio.js`, `garden-world.js` | Done | Suites; not tuned on real devices |
| VIS-12 | Gallery and visual baseline | `gallery*`, `visual-baseline.json` | Done | 5 tests; computed styles only, one engine |

## 8. Before/after UX and design evidence

Twelve screenshots are in `docs/evidence/` (see its `README.md`): the zip as supplied run on one port and this work on another, in the same browser, one after the other: Home, Tools, Library and Self-check at 1280x800, and Tools on a 375x812 phone in light and dark. They show a paper-like look that already existed, plus the path strip, the Simplify button, cobalt for the primary action and the serif headings on a phone. They do not show motion, sound, the Bridge's frame rate, forms with data, or any contrast figure, and I do not claim more from them than that. The phone view now spends about 160px at the top of Tools on the path strip.

Measured values:

- Cold start against the zip: +10 requests, +35 KB (+14%) before the final pass; the final pass added five small scripts. Warm repeat visits were faster only because the zip's Windows build broke asset digests; that does not apply to a Linux or Docker build.
- Computed values after the work: primary button `rgb(48,75,152)`, 5px radius, 44px tall; keyboard focus ring 2px solid; checkboxes 24px; no sideways scroll on seven pages at 320, 768, 1024 and 1440px.
- Behaviour that changed: Back/Forward move between pages; Self-check, Library and Tools show a suggested path; a heavy Self-check offers options and starts nothing; a focus session ends with three outcomes and a continue button; a forgotten password can be recovered with a code.

## 9. Deployment and rollback checklist

Steps that need a human decision are marked **(human)**.

1. **(human)** Choose the window and tell users; take a database backup (the release adds one table, `recovery_codes`, through migration `0003`) (`pg_dump` for PostgreSQL; for SQLite `python scripts/restore_drill.py`, which also proves a copy restores).
2. Set configuration: `APP_ENV=production`, `PUBLIC_ORIGIN`, `DATABASE_URL`, `GROQ_API_KEY`, `GROQ_MODEL`, and optionally `LOGIN_FAILURE_LIMIT`, `AI_DAILY_QUOTA`, `AI_ENABLED`.
3. `python build_frontend.py`, `python -m pytest -q`, `npm test`; confirm `tests/test_build_in_sync.py` passes (served files match the sources).
4. Deploy. After start: `python scripts/smoke.py https://your-host` (15 public checks) and, with a test account, `--with-account` (19).
5. Look at `/api/health` (`ai_configured`, `ai_enabled`) and the log for `server_error` events.
6. **Rollback:** redeploy the previous release. If people saved planner steps with this release first run `python scripts/downgrade_planner.py` (dry run) then, with a backup, `--apply --i-have-a-backup`; the old server rejects `status` fields otherwise. The database schema did not change, so no migration is reversed.
7. **Forward fix for AI trouble:** set `AI_ENABLED=0` and restart; safety replies and the rest of the site keep working.
8. **(human)** Review the crisis resource list and record its date before the first public use.

## 10. Final quality assessment

| Area | Assessment | Evidence and limits |
|---|---|---|
| Security | Good for a single-process deployment | Strong password hashing, CSRF, strict CSP, lockout, isolation, fixation and recovery tests. Limiter is per process; recovery depends on the person keeping a code; no encryption at rest beyond the database. |
| Reliability | Reasonable, partly untested | Save failures keep text; restore drill on SQLite only; PostgreSQL, throttling and multi-tab behaviour not exercised. |
| UX clarity | Improved, verified in English on desktop | Path, options, completion and passed-day wording checked in the browser; other languages checked by parity tests, not by reading. |
| Visual consistency | Good | Tokens, a type scale, one radius and a verified baseline; two differences are kept on purpose and written down. |
| Responsiveness | Good at 320, 640, 768, 1024, 1440 | Overflow 0 after fixes; 200% zoom and real phones not tested. |
| Performance | Not worse than needed, not great | +14% cold start; frame budget implemented but not measured on a weak device; no Lighthouse run (not invented). |
| Maintainability | Improved | A build-sync test, a gallery, many small test files, runbook and QA record; but `paper.css` outranks older sheets with specificity helpers, which is a debt. |
| Production readiness | **Not ready to call ready** | Needs CI results, PostgreSQL and Docker runs and a human review of crisis resources first. |
