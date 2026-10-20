# Operations runbook

What to look at, what to do and what to say when something goes wrong. Everything below is tied to behaviour that
exists in the code and is covered by a test, except where a line says **proposal** (a suggestion nobody has built) or
**not in place**. Read it with `docs/DEPLOYMENT.md` and `docs/SECURITY.md`.

## What exists, and what does not

**Signals the application gives you**

| Signal | Where | Meaning |
| --- | --- | --- |
| `GET /api/health` | HTTP 200 | The process is up. Reports `release`, `ai_configured`, `ai_requires_login`. Does not touch the database. |
| `GET /api/ready` | HTTP 200 or `503 database_unavailable` | The database answers a trivial query. |
| `X-Request-ID` header and `request_id` in every error body | each response | The id a person can quote. |
| Operational log | process stderr, one JSON line per event | Written only for server errors (5xx), rate-limit refusals (429) and unhandled exceptions. |
| `python scripts/smoke.py <url>` | command line | Fifteen public checks; `--with-account` adds a throw-away account that is deleted again. |

An operational log line has only these fields: `event` (`server_error`, `rate_limited`, `unhandled_exception`),
`request_id`, `method`, `route` (the route template, such as `/api/entries/{entry_id}/delete`, never the real path),
`status`, `duration_ms`, `error_code`, `exc_type` (the exception *class*, never its message). It never contains a body,
cookie, header, query string, address, user name, user id or any text a person wrote; `tests/test_operations_log.py`
checks that. Ordinary successful requests and ordinary refusals (401, 404, 422) are not logged.

**Error codes you will meet**

| Code | Status | Usually means |
| --- | --- | --- |
| `database_unavailable` | 503 (`/api/ready`) | Cannot reach the database. |
| `storage_unavailable` | 503 | A database error while handling a request. |
| `ai_not_configured` | 503 | No `GROQ_API_KEY`/model set. Also what a deliberate "AI off" looks like. |
| `provider_auth_error` | 502 | Groq rejected the key or the model. |
| `provider_rate_limit` | 429 | Groq is limiting you. |
| `provider_timeout` | 504 | Groq did not answer in 25 s. |
| `provider_unavailable`, `provider_invalid_response` | 502 | Groq failed or returned something unusable. |
| `ai_quota` | 429 | One account used its daily AI replies (`AI_DAILY_QUOTA`). Normal. |
| `busy` | 429 | Two AI requests already running. Normal under load. |
| `rate_limit`, `auth_rate_limit` | 429 | Per-address limits; `auth_rate_limit` is also the per-name sign-in lockout. |
| `origin_not_allowed`, `client_header_required`, `csrf_required` | 403 | A request that did not come from the app's own page. |
| `internal_error` | 500 | An unhandled exception; the log line has the class. |

**Not in place** (each needs a decision or an account from you): any uptime monitor or alerting, any place logs are
shipped to or kept (whatever your host keeps of stderr is what you have, and its retention is not verified here), error
tracking such as Sentry, metrics or dashboards, a second instance (limits and quotas live in one process's memory, so
`docs/DEPLOYMENT.md` requires exactly one), an on-call person, and a restore drill for the database.

## Severity

| Level | Examples | Response (proposal; nobody is on call, so these are intentions) |
| --- | --- | --- |
| **SEV1** | The site does not load or `/api/ready` keeps failing; sign-in is broken for everyone; private data may have been exposed | Drop other work, same day. Say so publicly, within the hour if you can. |
| **SEV2** | AI chat fails but everything else works; one feature errors repeatedly; many 429s for ordinary visitors | Same day. Tell people only if they are likely to notice. |
| **SEV3** | A single odd error, a cosmetic fault, one unhandled exception | Next working session. |

Crisis help is deliberately independent of the AI provider: a message that matches the explicit self-harm patterns gets
the fixed help text and never calls Groq, and an indirect-distress message falls back to the support note when AI is
unavailable. So an AI outage is SEV2 at most, **unless the fixed help text itself is wrong or missing, which is SEV1.**

**Alert thresholds, proposal only** (there is nothing to attach them to yet): `/api/ready` failing on two checks one
minute apart is SEV1; five `server_error` lines on one route within five minutes is SEV2; any `unhandled_exception`
is a SEV3 to read the next day; more than 20 `rate_limited` lines a minute with no matching traffic spike suggests the
proxy setting below.

## Database failure

*Signs:* `/api/ready` returns 503; log lines with `error_code: storage_unavailable`; the page loads but saving fails
with "storage unavailable" messages. Local SQLite waits up to 15 s on a lock before failing; PostgreSQL uses a pool of 5
plus 5 overflow with a 10 s wait.

1. `python scripts/smoke.py <url>`: confirm it is the database (the `ready` line fails, the page still loads).
2. Check the database host's own status page and whether `DATABASE_URL` changed recently.
3. Do not restart the app repeatedly; each start also runs migrations.
4. Restore from the provider's backup only if data is actually lost. **No restore drill has been run against a real production database** (`python scripts/restore_drill.py` rehearses the SQLite path only; PostgreSQL needs pg_dump/pg_restore), so treat
   the first real restore as unrehearsed and keep the damaged database until the restored one is verified.
5. Never run `docker compose down -v`: it deletes the database volume.
6. Afterwards run the smoke script, then check that a signed-in person's planner and records still load.

*Tell people:* "MindBridge cannot save right now. Anything you wrote in this page is still on your screen, so copy it
somewhere before you close the tab. We are working on it." (Journal text stays in the open page until a save succeeds, and a failed save of a task keeps what was typed in the form.)

## AI outage

*Signs:* `provider_*` codes, `ai_not_configured` where AI should be on, or `ai_quota` for many people.

1. Look at the log: which `error_code`? `provider_auth_error` means the key or model is wrong or revoked.
2. `provider_rate_limit`/`provider_timeout`/`provider_unavailable`: check Groq's status; nothing to fix here.
3. To switch AI off on purpose: set `AI_ENABLED=0` and restart (turn it back on by removing it or setting `1`). AI replies
   then stop with the code `ai_disabled`, the chat shows its normal "unavailable" message, `/api/health` reports
   `ai_enabled:false`, and **safety replies for crisis wording still work** (they never use the provider), as does every other
   feature. The key stays in place. Unsetting `GROQ_API_KEY` also works and gives the older `ai_not_configured` code.
4. To contain cost or abuse: lower `AI_DAILY_QUOTA` (it caps one account, in one process's memory) and set a spending limit at
   the provider, which the application cannot do for you.
5. If a key was exposed anywhere, rotate it at the provider first, then update the host's environment (see `docs/SECURITY.md`).

*Tell people:* "The AI chat is unavailable at the moment. The rest of MindBridge works. If you need to talk to someone
now, the help page lists where to find support."

## Broken authentication

*Signs:* people cannot sign in or register; many `auth_rate_limit`; `origin_not_allowed`; cookies not kept.

Check in this order, each is a real cause this code can produce:

1. **Everyone gets `auth_rate_limit` or `rate_limit`:** behind a proxy without `TRUST_PROXY_HOPS=1`, all visitors share the
   proxy's address and one noisy person throttles everyone (`docs/DEPLOYMENT.md`).
2. **`origin_not_allowed` (403) on sign-in:** `PUBLIC_ORIGIN` does not match the address in the browser exactly, or the proxy
   changes the host. Other 400s on every request: the trusted-host list (the host name in `PUBLIC_ORIGIN`).
3. **Signs in but is signed out on the next request:** secure cookies over plain HTTP, or a different host name than the one
   that set the cookie (`localhost` and `127.0.0.1` are different sites).
4. **One name keeps being refused with `auth_rate_limit`:** the per-name lockout (`LOGIN_FAILURE_LIMIT`, 15 minutes). It can
   be triggered on purpose against a name; waiting it out is the remedy.
5. **Suspected stolen sessions:** the person can use "sign out everywhere" (`POST /api/auth/logout-all`, password required).
   The emergency lever for everyone is deleting the sessions table (`DELETE FROM login_sessions;`). Nobody loses data, and
   everybody has to sign in again. There is no administration screen.

*Tell people:* "Signing in is not working for some people. Your saved entries are safe. Please try again later."

## Rolling back, and rolling forward

* **The application** rolls back by redeploying the previous image or commit. Assets are versioned by content digest, so a
  rolled-back page never mixes with newer files.
* **The database schema** gained three tables in this release: `recovery_codes` (migration `0003`, hash and date only) and `user_emails` and `email_tokens` (migration `0004`, the optional account email and hashes of single-use links). Back up first. Rolling the application back leaves the table in place; the old code ignores it. `alembic downgrade` for `0003` only drops that table (no account, entry or plan is touched), but it is never needed for a rollback.
* **One real catch, tested:** this release stores a `status` and a `status_at` on each planner step. The *previous*
  server refuses any task that carries them (`extra_forbidden`), so after a rollback people who saved their plan with this
  release could not save it again. Before or right after rolling back, run `python scripts/downgrade_planner.py` (dry run,
  counts only), then `--apply --i-have-a-backup`. It removes only those two fields, keeps `done` and the revision, is safe to
  repeat, and costs you the finer states: started, paused, partly done and set-aside steps come back as ordinary open steps.
* **Prefer rolling forward** when the fault is small: fix, run the tests, redeploy. It avoids the downgrade step.

## After any deployment or recovery

```bash
python scripts/smoke.py https://your-host.example
```

It checks health and a release name, readiness, the page and its security headers, the policy that blocks inline scripts,
immutable caching of assets, an anonymous visitor's view, and that private routes refuse anonymous requests. Add
`--with-account` on staging or a local copy to also create and delete a throw-away account (do not use it on a production
database you do not want touched). It does **not** send a chat message or test planner saving; do those by hand once.

## Feature switches

There is no general feature-flag system, and none was added: the new interface layers share files and are not independently
switchable, so a flag would be decoration. The one switch that was worth having, for the AI provider, is `AI_ENABLED`. What exists:

* Server settings that act as switches: `AI_ENABLED` (AI kill switch, tested in both directions), `GROQ_API_KEY` (AI on/off), `AI_REQUIRE_LOGIN`, `AI_DAILY_QUOTA`,
  `LOGIN_FAILURE_LIMIT`, `TRUST_PROXY_HOPS`.
* Fallbacks that already work without anyone flipping anything: the bridge falls back from WebGL to a 2D canvas, and then to
  plain content; reduced motion shows a static scene; the modules added in the latest releases (reminders, support templates, welcome, calm room, simplify) stop quietly when the element they attach
  to is missing; per person, the **Simplify** control turns decoration and animation off.

## Decisions that are yours

Who is on call and how they are reached; where logs go and for how long; whether to add an uptime monitor and error
tracking (both need accounts); when to rehearse a database restore; and who may rotate keys. Until those exist, this
document describes what to do, not who will do it.

## Exercised, and not

*Tested:* the log's content and privacy, the 500 response, the smoke script against a healthy app, a missing-header app, a
refused connection and a failing database, and the downgrade tool against a model copied from the earlier release.
*Not exercised:* a real deployment, a real database failure, a real Groq outage, a restore, and the rollback procedure as
a whole on a hosted site.
