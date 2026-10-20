## Version 20 — one palette, safer support, smaller first step

- **One visual system.** `frontend/paper.css` loads last and re-asserts the editorial paper + cobalt tokens (light `#F6F3E9`, dark `#171D1C`). Before this, `minimal-ui.css` (green) and a scoped "warm stone and brass" block in `refined-ui.css` silently overrode them, so Tools and Library looked like a different product. Tools/Library/workspace now share the 5px radius and serif headings; the Begin card no longer inherits the site-wide dark page-footer rule.
- **One focus ring** (2px, 3px offset, brand colour), a brand `::selection`, opt-in `user-select: none` on controls and decoration only (Journal, chat, articles and fields stay selectable), non-draggable decorative images, and a static ~3.5% paper grain (disabled for high-contrast, forced-colors and print).
- **Focus timer defaults to 5 minutes.** A length the user types or steps to is remembered in the browser; durations set by the planner or Focus session are not.
- **Three-tier safety** (imminent / uncertain / routine) with normalisation against trivial evasion, a support-note fallback when AI is unavailable, and 46 new adversarial tests. See `docs/SECURITY.md`.
- **Honest Journal save state** (`frontend/save-state.js`). Typing shows "Not saved yet" with a symbol and words; "Saved" appears only after the existing save code clears the field, which happens only after a successful write; a failed write keeps the text and says so. Leaving the page with unsaved text asks the browser to confirm. Record messages are now announced by screen readers (`role=status`). Nothing is stored before the user presses Save.
- **Journal prompt style** (Home card): Any / Low effort / Reflective / Positive plus an explicit **No prompt** mode. Changing style or turning prompts off never alters the draft.
- **Simplify** (`frontend/simplify.js`, navigation button): a reversible, user-chosen view that hides decoration and collapses animation durations. No tool or page is hidden; nothing is inferred about the person. Preference is kept in this browser when storage allows.
- **Ask someone for support** (`frontend/ask-help.js`, Contact page): editable templates for a friend, mentor, university service or professional in three tones and four languages. Copy always; Share only where the device offers it and only on a press. Nothing is sent, stored or uploaded; it is not advice and does not contact anyone.
- **Printed-dial timer:** hairline track, 3px cobalt arc, twelve static ticks, no shadow, no colour change at zero, tabular figures where the font has them. On screens ≤360px, with reduced motion, or with Simplify, it becomes a linear bar driven by the same progress value (`--p`).
- **Numbered editorial labels** (`02 / Stories`, `03 / Tools`, `05 / Chat`, `06 / Contact`, `07 / Self-check`) in small monospace, in navigation order. They are English-only, like the existing `01 / MINDBRIDGE`; the Library keeps its own heading label.
- **320px fixes:** the story hover highlight no longer forces a horizontal scrollbar, and the Simplify control collapses to a 44px symbol so the menu button stays on screen.
- **Library search** (`frontend/field-search-core.js`). The search used to be one exact substring over the whole guide, so two words only matched if they sat next to each other, "kampus" could not find "kampüs", and Turkish dotted/dotless i were not folded. Now every typed word must appear somewhere in the guide, in any order; case and accents are ignored on both sides (Turkish İ/ı, German ß included); anything that is not a letter or digit separates words, so punctuation behaves the same everywhere. Each result says why it is shown (`Matches in: title, steps`, in four languages), and an empty result names the search, counts active filters and offers a reset; what is typed is shown as plain text. It remains exact on spelling: a typo finds nothing, and no result is a guess or a recommendation. The search text is never stored or sent (checked by a test) and is cleared on page exit and account change. Related-tool links still come from the guides' own editorial metadata. Not done: highlighting the matched words, typo tolerance, ranking.
- **Operations** (`docs/RUNBOOK.md`). Before this release the server logged nothing: error responses carried a `request_id` that no log line ever mentioned. It now writes one privacy-safe JSON line per 5xx, 429 and unhandled exception (route template, status, timing, error code, exception class; never any text a person wrote), and an unhandled exception returns a generic `internal_error` with the request ID. `scripts/smoke.py` runs fifteen public checks after a deployment (nineteen with `--with-account`, which creates and deletes a throw-away account). The runbook covers severity levels, a database failure, an AI outage and broken sign-in, each tied to real error codes and settings. **Rollback caveat, tested:** the previous server rejects planner tasks saved with this release's `status` fields, so `scripts/downgrade_planner.py` (dry run by default, backup flag required to apply) exists. Not in place: any monitor or alert, error tracking, log shipping, a restore drill, an on-call person, or a feature-flag system (see the runbook for why).
- **Performance baseline and budget** (`docs/PERFORMANCE.md`, `tests/test_performance_budget.py`). Measured against the project as received: this release makes 10 more requests and sends 35 KB (+14%) more on a first visit, with no layout shift and no long tasks in either. On repeat visits it served 72 of 72 assets from cache versus 2 of 62 for the received build, because that build's asset digests did not match its files when built on Windows; this gain applies only to Windows builds. A static budget (scripts, stylesheets, requests, compressed and decoded size, per-file size) and a digest-matches-bytes check now run with the tests. Paint metrics and any phone or slow network were not measured.
- **Localization checks** (`tests/test_localization.cjs`). The main table has the same 163 keys and array lengths in English, Turkish, German and Spanish, and no English sentence left in the other three (source links are identical on purpose). 31 per-module language blocks are compared for missing keys, array lengths and placeholders; the scanner fails if it finds fewer than 31, so it cannot silently stop looking. Two unused garden sound strings that existed only in English and Turkish were removed. Planner days are stored as `YYYY-MM-DD` and shown through `Intl` in the reader's language, pinned to UTC so no time zone can move a date. Measured in a real browser at 320px in German, Spanish and Turkish: no horizontal overflow and no clipped text on any page or Tools tab (the only clipped box is the intentionally cropped 3D scene frame). Not covered: wording quality and idioms (no native-speaker review), number and plural formatting beyond what `Intl` already does, 200% text zoom, and the numbered editorial labels (`03 / Tools`), which are English-only by design like the existing `01 / MINDBRIDGE`.
- **One vocabulary for interaction states** (end of `frontend/paper.css`): idle, hover, focus-visible, pressed, pending, success, empty, error, disabled. Signals beyond colour are shapes: *disabled* is a dashed outline with muted ink and a not-allowed cursor (not opacity alone, and not applied inside a busy container, so saves do not flash); *pending* is a dotted edge and a progress cursor, driven by `aria-busy` that the planner and chat now set; *error* is a 2px border plus an icon, or a 4px double border on short number fields; *pressed* is an inset edge and never changes size. Meaning has tokens, not just hues: `--success`, `--caution`, `--danger`, `--info` (= the action colour), each ≥5:1 on paper, panel and wash in both themes. The old fixed destructive red was 2.6:1 on the dark page and is now `--danger`. Because earlier sheets scope `!important` rules under `#page-tools`, the state selectors carry `:not(#mb-boost-a):not(#mb-boost-b)` to outrank them; no element uses those ids. `caution` is defined but not yet applied anywhere, and the *success* and *empty* states have tokens and existing copy but no new shared component.
- **Icons and the bridge's frame budget.** `frontend/icons.js` is one small icon family (24-unit grid, 1.75 stroke, round caps, colour from the text, `aria-hidden`, built with the DOM). The theme button, and the two contact cards, now use it instead of emoji that looked different on every platform. The mood scale keeps its emoji on purpose: they are stored values the backend validates. Plant glyphs used by the garden code in `app.js` and the sound labels in `tools.js` are unchanged. The bridge already paused on hidden tabs, off-screen and under reduced motion, and fell back from WebGL to a 2D canvas (including after a lost context); it now also has a **frame budget**: if drawing averages more than 20 ms over at least 12 frames, the rest of that visit renders at 1x instead of up to 1.75x. The budget only ever goes down and sets `data-quality="reduced"` on the canvas. Not done: perspective, lighting and camera refinements of the scene itself.
- **Calm scenes as one family.** *Dark Room:* it could not be opened at all, because its only button sat in a card the tools page removes. A labelled **Quiet dark screen** button now lives in the Pause tool (`frontend/calm-room.js`); the room itself is a warm near-black (`#0f1413`, not pure black), the message and the exit button now meet 4.5:1, the exit outline 3:1 and a 44px target, hover/focus raise contrast instead of lowering it, and the 1-second fade is removed for reduced motion. It plays no sound and runs no animation of its own; Escape or the button leaves and focus returns to the opener. *Zen Studio:* with `prefers-reduced-motion` poured sand settles at once instead of visibly falling (read live, so a system change applies at the next pour); undo, redo, clear and PNG export, stopping on release, blur, tab hide and page change already existed. *Garden and living details:* already pause for reduced motion, hidden tabs and page exit (code review only; not re-run here).
- **Welcome and “right now”** (`frontend/welcome.js`, home page). A non-modal orientation card points to Begin, Journal, the timer and help; it asks nothing about the person, can be skipped for now or hidden for good (`mindbridge.welcome.hidden`). A separate, optional “Need it simpler right now?” offers four sentences (no energy / do not know where to start / feels too big / want it perfect). Each gives one explained suggestion (“Suggested because you chose …”). Low energy turns on the simpler view for the moment and sets the timer to 2 minutes without starting it; wanting it perfect sets 5 minutes. **Nothing is saved**: the simpler view and timer length use session-only setters (`mbSimplify.setForNow`, `mbSetTimerMinutes`), a view the person already chose is never touched, one button restores everything, and an account change undoes it.
- **Step states** in the planner: planned, started, paused, partly done, completed, set aside. Only the moves in the table in `frontend/planner-core.js` exist (for example planned → partly done is not offered); nothing changes state on its own except pressing **Start**, which moves a step to started. Finished and set-aside steps can always return to planned. Every state is shown as a symbol plus words. Tasks saved before this release keep working: their state is derived from `done`. `POST /api/planner` now also accepts and returns `status` and `status_at`, and rejects a `status` that contradicts `done`; if you have your own client, expect those two extra fields.
- **Weekly description** (planner, collapsible): counts of steps whose status changed in the last seven days, by their current status. No score, percentage or comparison.
- **Optional reminders** (`frontend/reminders.js`, in the Planner tab): off until you add one; per step, exact local time and time zone shown; snooze 10 minutes or 1 hour, dismiss, remove. They work **only while the page is open**: there is no background service, nothing is sent anywhere, nothing repeats, and a browser notification needs a separate checkbox plus the browser's permission. Stored in this browser only and cleared on account change.
- **Strict script policy:** all 56 inline `onclick`/`oninput`/`onmouseover` attributes are gone. Clicks go through `frontend/events.js` (allow-listed, no `eval`), the footer hover is plain CSS, and the CSP is now `script-src 'self'` with no third-party hosts. New actions must be added to the allow-list in `events.js`; `tests/test_events.cjs` fails if markup names an action that is not listed or if an inline handler reappears.
- **Account hardening:** per-account sign-in lockout, `POST /api/auth/logout-all` (password + CSRF), a per-account daily AI quota with honest four-language feedback, isolation headers, and a field-by-field personal-data inventory (`docs/DATA_INVENTORY.md`). New settings `LOGIN_FAILURE_LIMIT`, `AI_DAILY_QUOTA` and, behind a proxy, `TRUST_PROXY_HOPS`: see `docs/DEPLOYMENT.md`.
- **Windows build fix.** `build_frontend.py` now writes UTF-8 with LF line endings; previously asset digests did not match the files on Windows (immutable caching never applied) and reads depended on the system code page.

## Version 19 — Begin and falling sand

- Let’s begin: five task categories, four barriers, editable steps, a smaller-step detour, pause/resume timer, completion reflection and next-step notes. Local templates are suggestions, never presented as generated AI advice.
- Self Check task/focus actions open Begin without transmitting answers. Three overlapping reflection cards move into a collapsible drawer; existing records are retained.
- Begin stays in page memory by default. Optional browser storage and JSON export are explicit. Account changes clear the Begin plan; it is not account/cloud storage. Hidden tabs and navigation pause its timer. Multi-tab conflicts suspend saving.
- Sand uses a fixed 240×135 gravity grid with collisions, slumping, coloured layers, mirror pouring, reversible clear and PNG export. Released grains continue falling until settled; hidden pages stop simulation. Bounded grid and 20 history snapshots limit memory.

## Version 18 — sand studio and sourced stories

- Removed fixed chat replies, pretend live counts, unsent feedback forms, paper planes and duplicate tools.
- AI chat accepts only real provider mode. Missing server configuration is shown honestly; production needs `GROQ_API_KEY` in Render Environment. Never commit keys.
- Zen studio adds seeded sand painting and press-to-pour, with mirror, bounded strokes, undo/redo and local PNG export. Painting stops on pointer release, page exit and tab hiding.
- Ten attributed summaries link to public university student writing in English. The summaries are available in four interface languages; they are not MindBridge testimonials.
- Scroll sculptures now rotate through two turns on desktop, with a smaller mobile range. Existing pause and reduced-motion controls remain in effect.
- Pruned repetitive copy and eight redundant or simulated tool cards. Existing accounts, personal records, planner and focus tools remain operational.

## v17 — Campus field edition

- The rotating ribbon sculpture is now the fixed navigation brand mark. A serif/humanist type system, paper surfaces, indexed tools and a cobalt/clay palette replace the generic rounded-card look. The Instagram navigation link now shares the buttons’ alignment and mobile width.
- Mindful Nourishment has been removed.
- Zen studio: pointer and keyboard drawing, four inks, line width, mirror mode, bounded undo/redo, reversible clear and explicit local PNG export. Drawings clear on account change and page exit; no network or storage.
- Library: 12 original, fully translated campus worksheets with three practical steps and a reflection question each; search, subject/time filters, session reading list, tool links and separate WHO/NHS further-reading links. These are not clinical assessments.
- Self-check: five-question quick view or eight-question fuller view, raw response map, editable priority and 2/5/10-minute action selection. Skipping all questions creates no inferred result. Responses remain in memory and clear on account change/page exit.
- Fixed the skip link’s DOM order after the previous GitHub browser run identified it was not the first tab stop.

Validation: 179 JavaScript behavior checks; new browser scenarios cover Library, Zen and expanded reflection. Browser execution status is recorded in GitHub Actions; no local visual QA was available for this release.

# MindBridge

A full-stack student portfolio project connecting **one study goal → a timed focus session → a personal reflection**. Optional Groq chat is separate from journal storage and requires explicit consent.

**Status:** release candidate. Local API and simulated frontend tests pass. Browser execution, live PostgreSQL verification, hosted deployment and GitHub CI execution remain unverified. See [verification evidence](docs/QA.md).

## New in v16: Instagram focus

The Team page, navigation entry and translated biographies are removed. Navigation, home and contact now point to the existing @mindbridge.eu Instagram profile with clean URLs and safe new-tab links. The generic Discord server card is removed. The home callout uses the campus palette with no embed, tracking script, live-feed claim or extra animation loop. No Instagram publication or account integration is performed; profile availability has not been independently verified.

## New in v15: a quieter desk, a more expressive scroll

- Repeated home quick-start cards and the day-context selector are replaced by one **Pick up where you left off** panel. It shows the current focus plan first, otherwise the planner's current suggested task and next step. Unavailable/conflicted plans expose no old task. Return buttons navigate without starting or resuming timers.
- A journal draft gets a return link with its contents hidden. Drafts and focus sessions still last only while the page stays open; this feature does not introduce draft storage. Account changes retain existing isolation rules.
- Desktop scroll rotation increases from 170° to 420° across a scene; mobile uses 150° and no sideways tilt. The sticky desktop sculpture has a current chapter counter and matching story accent. Motion stays event-driven, visibility-limited, pausable and reduced-motion aware.
- The six journal question cards and explicit quick-focus start remain available. No new dependency or background animation loop was added.

## New in v14: three useful moments on the campus desk

1. **Before class / After class / Evening:** explicitly selected context cards with relevant links to the self-check, journal and planner. Nothing starts automatically; context is not inferred from a profile or time of day.
2. **Six journal question cards:** a short, cancellable flip transition and a transfer button that appends the question to the current journal draft. Existing text is preserved, the 10,000-character limit is checked, duplicate questions are not inserted, and saving remains a separate action.
3. **One-step focus:** enter a small step and choose 5, 10, 15 or 25 minutes. The explicit Start button uses the existing real focus timer. Running/paused sessions and pending reviews are protected by the existing bridge; rejection preserves the new draft and offers a return link. This is an in-page focus session, not a stored planner task.

Visual details include an etched guide around the rotating ribbon, punched-paper note corners, chapter dividers, a warm paper question deck, a dark context panel and consistent keyboard focus states. New transitions honour both the system reduced-motion setting and the main campus pause control. Switching pages or hiding the tab cancels flips. Language changes preserve drafts; account changes and page exit clear the new private quick-focus input.

## New in v13: campus scroll experience

The home page has an original campus-oriented visual direction: editorial typography, peach/lilac/mint vector ribbons, note cards, and a three-part Notice / Write / Begin story. The desktop story has a sticky sculptural visual that rotates with scroll; mobile uses a compact, non-sticky composition and less rotation. Story actions open the actual self-check, journal or planner without starting sessions or sending data.

Motion is event-driven. A burst of scroll events coalesces into one frame for both sculptures; no perpetual animation loop, wheel interception, video sequence, WebGL or external animation library is used. IntersectionObserver limits work to visible sculptures. Leaving Home, hidden tabs and the pause control cancel pending work. System reduced motion disables the control and displays a static layout. All text is present without reveal animations; there is no scroll gate to accessing tools. The original quick-start cards were superseded by the v15 return panel.

Deterministic tests cover controller bounds, reduced mobile rotation, event coalescing, no idle loop, pause, hidden tabs, offscreen scenes, language changes and real journal routing. Real-browser rendering and hardware frame rates remain unverified.

## New in v12: daily self-check and balanced colour

The self-check is now a five-question **non-clinical daily reflection**, covering mental load, focus, energy, sharing and breaks. It no longer sums answers into a mental-health severity label. Back, skip, change-answer review, and explicit clear/restart are available. Changing language or returning to the check preserves the current in-page session. Page exit clears answers; no storage or network request is used.

Results show up to two areas explicitly marked “Quite a bit” or “A lot” (highest selection first, question order for ties), with direct links to the relevant tools. Skipping everything produces no personal inference. Tool links do not start timers, breathing exercises or send messages automatically. All four languages are supported.

Visual changes restore static blue/mint colour fields, coloured card edges, restrained button depth, a question card with visible progress and selection states, and a structured answer review. No ambient animation, large blur layer or whole-page transition was reintroduced. Real-device visual acceptance is still outstanding. A development-only component gallery (`/__gallery`) and a computed-style baseline are described in `docs/VISUAL_QA.md`. Navigation (browser Back/Forward, page addresses, the suggested path) is described in `docs/JOURNEY.md`. The full report of the upgrade is `docs/UPGRADE_REPORT.md`.

## New in v11: lighter interaction and consistent controls

Performance changes: one passive, frame-coalesced scroll controller replaces repeated card geometry scans; task search filters existing rows rather than recreating them; budget changes update only the suggestion; same-day window refocus does not rebuild the planner; timer renders only when its displayed second/state/language changes. General clicks no longer scan the whole page for accessibility updates. Page-wide and per-card entrance animations, continuous decorative gradients and navigation blur are removed. Styles load in the head before content; external scripts are deferred in their original order.

The interface now has consistent primary/secondary/destructive buttons, accessible focus states, larger mobile controls, a clearer planner form, restrained card borders, and Plan / Focus / Tools / Account section shortcuts. Existing forms stay mounted and their drafts are retained when using these shortcuts. First-render task action labels and keyboard access after language changes are fixed.

Measured in deterministic simulated DOM tests: 100 scroll events enqueue one frame; filtering 100 tasks creates zero additional DOM nodes; repeated timer ticks in the same displayed second do not rewrite the clock. These are operation counts, **not an FPS benchmark or real-device visual verification**. Real browser acceptance remains outstanding.

## New in v10: return to your tasks

- Search task titles and next steps locally within the planner. This does not send your task text to AI.
- Copy a task for tomorrow: a new unfinished task with a fresh ID; the original is preserved. This is manual, not an automatic recurring schedule.
- Undo the last successful deletion until the next successful change, refresh, account transition or page reload. Undo uses the same storage/revision checks as ordinary edits; it cannot overwrite a detected conflict.
- Fixed stale edit state after deleting the edited task, cross-tab storage-clear detection, blank-title validation feedback, and validation of account planner responses.

**Easiest local start on macOS:** unzip, open the MindBridge folder and double-click `Start-MindBridge-Local.command`. It installs dependencies into the project virtual environment and starts the app without requesting an API key. Open http://127.0.0.1:8000 after startup. For real Groq chat, use the existing `Start-MindBridge.command` launcher and enter your key privately in Terminal. Stop an older running instance with Control+C first. Keep the old folder/database as a backup; extracting into a new folder does not automatically move account data.

## New in v9: calmer interface, faster access

The interface now uses system typography, restrained blue accents, glass navigation, lighter cards and short native entrance animations. The forced navigation delay, blocking intro, custom mouse loop and remote font/animation dependencies are removed. Reduced-motion mode keeps pages visible. Existing accounts, plans, chat and records remain available.

- **Find a tool:** use the search icon or Ctrl/Command + K. Searches public tool/page names, never your journal or task text. Arrow keys navigate results; Escape closes the dialog.
- **Quick starts:** home cards open the planner, focus plan or breathing exercise directly.
- **Session return:** a floating bar mirrors the existing timer and opens the actual timer card. Leaving Tools still pauses the timer; returning never resumes it automatically.
- **Appearance:** light/dark preference persists locally when browser storage is available.
- **Keyboard and mobile:** earlier menu collapse breakpoint, Escape/outside-click closing, focus restoration and dark-room background isolation.

The animation and responsive design still need a real browser visual review; see QA.md for exactly what ran. Original v8 core/template sources are preserved under `reference/ui-v8/`.

## New: a daily plan you can return to

Open **Tools → What should I start today?**, or use the home-page **Plan your day** card. Add a task, its estimated minutes, an optional planned day, priority and the next small step. Set how much time you have now.

The planner suggests one unfinished task that fits. Among suitable tasks, carried-over work and your important tasks take precedence. Future-day tasks stay out of today's suggestion. If none fits, it offers an explicitly partial work block. This uses transparent rules, not AI.

**Start** opens the existing focus timer with that task. **Move to tomorrow**, **Done**, **Reopen**, **Edit** and **Delete** update the stored plan. Editing the next step lets you leave yourself a practical note for returning later. Timer completion never marks the task done automatically.

Guest plans stay in this browser under a separate planner key. Account plans stay in the app database and are included in account export/deletion. Signing in does not import a guest plan. Up to 100 tasks are stored; there are no push notifications, calendar sync or automatic deadline reminders. Planned dates are scheduling choices, not verified external deadlines.

Revision checks reject stale account updates; a conflict asks you to copy your draft, refresh and reapply it. The app does not silently merge simultaneous edits. Guest storage also checks for changes in other tabs and preserves malformed data instead of overwriting it.

Back up your existing database before upgrading: revision 0002 adds the planner table and revision 0003 adds the recovery-code table and revision 0004 adds the optional account-email tables, without changing account or journal rows. Local startup applies it automatically. Keep the old backup if you need to return to an older release.

## What works

- Focus sessions with a goal, first step, pause/resume and self-reported outcome. Completed time never implies a completed task.
- Optional transfer of the session review into a journal draft; saving remains a separate action.
- Guest records in browser storage; account records in a SQL database. Guest import is explicit and retry-safe.
- Username/password accounts, cookie sessions, account-scoped records, JSON export, password change and account deletion.
- Four interface languages: English, Turkish, German and Spanish.
- Real Web Audio sounds and bounded breathing exercises.
- Server-side Groq chat with explicit consent and no simulated replies. No API key in browser code.

Illustrative stories, the self-reflection quiz and decorative garden are portfolio content. The app is not a clinical service, a validated assessment, or a university service.

## Run locally

Python 3.12 is used in CI; Python 3.11+ is supported by the project code.

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
python3 build_frontend.py
python3 run.py
```

Open **http://127.0.0.1:8000**. Keep the terminal running. To use AI, run `python3 run.py --ai`; the key is entered privately at the terminal. Accounts and focus tools do not need an AI key. Chat requires a configured provider.

On macOS, `Start-MindBridge.command` performs installation, builds the frontend and asks for an AI key. For key-free use, follow the commands above. Use one origin consistently: `localhost` and `127.0.0.1` have separate browser storage.

## Upgrade from V5/V6

1. Stop the old server and back up its `data` directory.
2. Extract the new project into a separate directory. Keep the previous release.
3. Copy your original `data` directory into the new project **before** creating new accounts there.
4. Install requirements and run the new version. The compatible schema is validated and adopted into Alembic migration history; records are preserved.

Unsupported or incomplete legacy schemas are rejected. SQLite backups are private data; never commit them.

## Source map

| Path | Responsibility |
| --- | --- |
| `frontend/page.html` | Page structure and explicit source load order |
| `frontend/translations.js`, `app.js` | Original translated content and shared UI behavior |
| `frontend/records.js`, `tools.js` | Guest storage, timers, audio and breathing |
| `frontend/chat.js`, `accounts.js`, `focus.js` | Chat, account and focus workflows |
| `frontend/planner-core.js`, `planner.js` | Time-based suggestions, task editing and persistent daily planning |
| `backend/planner.py` | Validated, account-owned planner state and revision conflicts |
| `frontend/accessibility.js`, `*.css` | Keyboard behavior, focus, responsive styles |
| `build_frontend.py` | Deterministic served assets and portable `MindBridge.html` |
| `backend/app.py`, `accounts.py` | HTTP API, provider handling, validation and authorization |
| `backend/database.py` | SQLAlchemy models and account-scoped transactions |
| `backend/migrate.py`, `migrations/` | Alembic migration and guarded V5/V6 adoption |
| `tests/`, `e2e/` | API/storage, simulated DOM and prepared browser tests |
| `.github/workflows/ci.yml` | Python, JavaScript, PostgreSQL and browser checks |

Edit source files and rebuild. `frontend/index.html`, `frontend/assets/` and `MindBridge.html` are generated. Historical sources are retained under `reference/`; they are no longer build inputs. The frontend uses ordered classic scripts with shared globals, not fully isolated ES modules. Separating files is an incremental refactor, not a complete framework rewrite.

## Verify

```bash
python3 -m pip install -r requirements-dev.txt
npm ci --ignore-scripts
python3 build_frontend.py
python3 -m pytest -q
npm test
npx playwright install --with-deps chromium webkit
npm run test:e2e
```

Browser projects cover desktop Chromium, WebKit and a mobile WebKit viewport. WebKit automation does not replace testing on an actual iPhone/Safari installation. The test server refuses to reuse an existing server and has live AI disabled.

For PostgreSQL tests, set `TEST_DATABASE_URL` to a dedicated PostgreSQL database whose name ends in `_test`. Without it, two PostgreSQL tests explicitly skip. The CI service creates this test database automatically.

## Architecture and limitations

Read [architecture](docs/ARCHITECTURE.md), [security and data handling](docs/SECURITY.md), [deployment](docs/DEPLOYMENT.md), [QA evidence](docs/QA.md) and [portfolio presentation](docs/PORTFOLIO.md).

The code was developed with AI assistance. Present only contributions and design decisions you can explain and demonstrate. No user adoption, clinical outcomes, production uptime, audit certification or live deployment is claimed.
