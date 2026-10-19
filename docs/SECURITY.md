# Security and privacy boundaries

Implemented controls: Argon2id password hashes, random cookie sessions with hashed tokens in storage, HttpOnly/SameSite=Strict cookies, CSRF checks, exact Origin checks when supplied, trusted hosts, owner-filtered access, input/body limits, generic errors and request IDs. Production config requires secure cookies, HTTPS public origin, PostgreSQL and authenticated AI.

Headers prevent embedding and MIME sniffing, restrict permissions and apply a Content Security Policy (`CSP` in `backend/app.py`): `script-src 'self'`, `font-src 'self'`, `img-src 'self' data:`, `connect-src 'self'`, no `unsafe-eval`, no third-party host anywhere. **Scripts:** the page contains no inline event-handler attributes and no inline script bodies. Click actions are written as `data-mb-click="name(args)"` and run by `frontend/events.js`, which parses that text itself (no `eval`) and only accepts names on an allow-list, so injected markup cannot name `eval`, `location.assign` or any other function. **Styles:** `style-src` still includes `'unsafe-inline'` because markup and scripts set style attributes; that is a weaker guarantee than a nonce-based style policy, and it is the remaining reason the CSP is not fully strict. The page loads nothing from a CDN: earlier versions of this file described GSAP and web fonts fetched from third parties, which is no longer true, and the unused CDN, Google Fonts and Unsplash allowances were removed from the policy. Verified in a real browser on localhost: zero `securitypolicyviolation` events and zero script errors across all 39 distinct click actions and a real-mouse language switch and navigation. Not verified: Safari/WebKit and any hosted deployment.

Journal text is plaintext in the database or browser storage. Account authorization is not disk encryption. Do not use this portfolio demo for sensitive health information. Chat data goes to Groq only when AI mode is used with consent; provider retention is not controlled by this application.

Rate limits are in-memory and per client address (`backend/limits.py`; forwarded headers are trusted only when `TRUST_PROXY_HOPS` is set): 20 chat requests/minute, 15 account authentication actions/minute, and a shared cap of two concurrent provider requests. They reset on restart and are not shared between server processes. This paragraph previously described a single global queue; the code no longer does. Authenticated AI does not by itself prevent provider cost abuse because registration is open. Keep hosted AI disabled until provider-level spending limits and appropriate access restrictions are configured. No distributed limiter, password recovery, two-factor authentication, email verification or independent security audit is included.

Keyword-based human-help routing is a limited product safeguard, not a risk assessment. It can miss phrases and produce false positives. The quiz is not clinically validated.

## Account hardening added in v20

- **Per-account sign-in lockout.** After `LOGIN_FAILURE_LIMIT` failed attempts for one name within 15 minutes, further attempts for that name (even with the right password) receive `429 auth_rate_limit` until the window passes. Unknown names are counted the same way, so the response does not reveal whether an account exists. A successful sign-in clears the count. Trade-off: a third party can lock a name they do not own for up to 15 minutes. The per-address limiter remains.
- **Sign out everywhere.** `POST /api/auth/logout-all` needs a session, a CSRF token and the current password, then deletes every session for the account. There is no button for it in the interface yet.
- **AI budget per account.** When AI requires sign-in, each account may receive `AI_DAILY_QUOTA` replies per rolling 24 hours. A refused request returns `429 ai_quota` with `Retry-After` and never reaches the provider; successful replies include `ai_quota: {limit, remaining}`. Crisis help is never blocked by the quota, and indirect-distress messages fall back to the support note. Configuration errors and a busy provider do not spend the budget. State is in process memory and resets on restart.
- **Isolation headers.** `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Resource-Policy: same-origin` on every response.
- **Known remaining gaps:** no email verification or password reset (the app holds no email address), no two-factor authentication, no shared rate-limit store, registration reveals whether a username is taken, the CSP still allows inline scripts, and journal text is plaintext at rest. See `docs/DATA_INVENTORY.md`.

## Account recovery without email (v21)

MindBridge keeps no email address, so no reset link can exist. A signed-in person may create a **recovery code** (100 random bits, `XXXXX-XXXXX-XXXXX-XXXXX`). It is shown once; only an Argon2id hash is stored (`recovery_codes`). `POST /api/auth/recover` takes the username, the code and a new password.

* Creating a code needs the current password and the CSRF token; the response is `no-store`. A new code replaces the old one.
* Single use: a successful recovery deletes the code, revokes every session, sets the new password hash and starts one fresh session.
* Expires after 365 days.
* An unknown name, an account with no code, an expired code, a malformed code and a wrong code all return `401 invalid_recovery`, and the same Argon2 verification runs in every case, so neither the response nor the time reveals which was true. Measured locally (15 requests each, in-process test client): median 21.5 ms for an unknown name, 21.5 ms for an account with no code, 21.5 ms for a wrong code and 20.9 ms for a malformed one (max/min 1.03). A network adds its own noise; this shows the server does not add a difference.
* Attempts are limited per address (the auth limiter) and per name (the failure limiter, key `r:<name>`): after `LOGIN_FAILURE_LIMIT` failures the name waits 15 minutes, even for the right code. This allows someone to lock a name's recovery for the window, as for sign-in.
* Losing both the password and the code means the account cannot be recovered. The interface says so. There is no administrator back door.

Tests: `tests/test_recovery.py` (10) and `tests/test_recovery_ui.cjs` (8). Still not present: email verification and a reset link (there is no email), and a recovery code created at sign-up (it is offered afterwards, by choice).

## Operational logging

The server writes one JSON line for each 5xx response, 429 refusal and unhandled exception, and nothing for ordinary traffic. The fields are an allow-list (event, 
equest_id, method, 
oute template, status, duration_ms, error_code, exc_type); request and response bodies, cookies, headers, query strings, client addresses, user names and ids, and exception messages are never written, and 	ests/test_operations_log.py fails if one appears. An unhandled exception returns a generic internal_error with the request ID instead of a stack trace. Where these lines go, and for how long, is decided by the host and is not verified here. See docs/RUNBOOK.md.

## AI safety decision matrix (`backend/safety.py`)

| Tier | Trigger (text is NFKC-normalised, case-folded, zero-width characters removed) | Behaviour |
| --- | --- | --- |
| imminent | Explicit self-harm or suicide phrases in EN/TR/DE/ES | Fixed human-help text; the provider is never called; consent and login are not required |
| uncertain | Indirect distress phrases (hopeless, cannot go on, burden, …) | Normal reply plus a support note. If consent, login or the provider is unavailable, the support note is the entire reply instead of an error |
| routine | Anything else, including any input the classifier cannot process | Normal flow with honest errors (consent required, AI not configured, …) |

Only the latest user message is classified. Prompt-injection text cannot downgrade a tier because classification is deterministic code that runs before, and independently of, the model. Known limits: paraphrases, other languages, sarcasm and idioms are missed or mis-tiered; topical use of a trigger word (for example a sociology reading about suicide) is treated as imminent, the safe direction for a keyword floor. Tests: `tests/test_safety.py`.

Emergency numbers (112, TelefonSeelsorge 116 123) are defined once in `RESOURCES`. They have **not been independently re-verified in this release** (`reviewed` is `None`) and are Germany-specific; users elsewhere are told to use their local service. A maintainer must check them against the official source before any public deployment. The application does not infer location and never states that anyone was contacted.

Backups contain private records. Store them with restricted access, test restoration to a separate database and define a retention policy before any public deployment. Account deletion removes current database rows, not previously exported files or external backups.

Never put API keys, production database URLs, exported records or SQLite files into Git. Rotate any key previously pasted into a chat. This release contains no user key or user database.

Planner task titles and next-step notes are plaintext too. Guest and account plans do not merge automatically. Account export includes tasks; account deletion removes the associated planner row. Concurrent account edits are protected by revision checks, not an automatic merge.
