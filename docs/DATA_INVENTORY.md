# Personal-data inventory

Built from the code at release 20, not from intent. Each row names where the data is, why it exists, who else touches it, how long it lives and how it leaves. "Not verified" marks anything this document cannot prove from the repository (hosting, backups, provider retention).

| Data | Collected for | Stored where | Other processor | Retention | Deletion path | Access control |
| --- | --- | --- | --- | --- | --- | --- |
| Username (lower-cased) | Sign-in | `users.username` (SQLite locally, PostgreSQL in production) | Hosting provider (not verified which) | Until the account is deleted | `POST /api/auth/delete` (password required), cascades | Own session only; unique per account |
| Password | Sign-in | `users.password_hash`: Argon2id, salted. The plain password is never stored or logged | None | Until changed or deleted | Same as above | Never returned by any endpoint |
| Session token | Keeping the person signed in | Browser cookie `mb_session` (HttpOnly, SameSite=Strict, Secure in production). Server stores only a SHA-256 digest in `login_sessions` | None | 12 hours, at most 10 live sessions per account; expired rows purged every 30 minutes | Logout, logout-all, password change, account deletion | Digest alone is not a valid token (tested) |
| CSRF value | Request authenticity | Derived from the session token; held in page memory only | None | Lifetime of the session | n/a | n/a |
| Journal, gratitude, mood entries | The person's own records, only after pressing Save | `entries` table (plaintext), up to 2000 per account | Hosting provider (not verified) | Until deleted by the person or with the account | `POST /api/entries/{id}/delete`, account deletion | Every query filters by the session's user (two-account tests) |
| Guest records (not signed in) | Same | Browser `localStorage`, plaintext | None | Until the person clears browser data | Delete buttons, browser settings | Anyone using that browser profile |
| Email address (optional) | Reset a forgotten password by a single-use link; used for nothing else | `user_emails` (address, confirmed time) and `email_tokens` (SHA-256 of each link token, purpose, expiry); sent through the operator's SMTP provider | The operator's mail provider (not verified) | Kept until the person removes it or deletes the account; link tokens last 24 h (confirm) or 30 min (reset) and are deleted on use | Remove email (needs the password) or account deletion (cascade) | Owner adds it with the current password; a reset needs control of the confirmed inbox |
| Recovery code (optional) | Let a person who forgot their password choose a new one, since no email exists | `recovery_codes` table: only an Argon2id hash and a creation time, one row per account | Hosting provider (not verified) | Valid 365 days; replaced when a new code is made; deleted when used | Account deletion (cascade) | Owner creates it with the current password; recovery needs the username and the code |
| Planner tasks | The person's own plan | `planners` table (plaintext JSON, ≤100 tasks, revision-checked) or guest `localStorage` | Hosting provider (not verified) | Same as entries | Account deletion; guest: browser data | Owner only |
| Focus plan, Begin plan, Self-check answers, Library reading list, chat transcript, drafts | In-page working state | Page memory only; Begin offers explicit opt-in `localStorage` and JSON export | None; chat text goes to the AI provider only when sent | Cleared on reload, page exit or account change | Reload | n/a |
| Chat messages sent to AI | A reply | Not stored by the server. Forwarded to Groq with the person's consent when AI is enabled | **Groq** (Chat Completions). Provider retention is outside this application and not verified | None here | Not applicable here; see the provider's terms | Consent checkbox per page load; sign-in required in production |
| Timer length, Simplify choice, theme | Convenience | Browser `localStorage` (`mindbridge.timer.minutes`, `mindbridge.simplify`, theme) | None | Until cleared | Browser settings | Same browser profile |
| IP address | Rate limiting | In process memory only, as a counter key; not written to the database or to an access log (`access_log=False`) | Hosting provider's own logs (not verified) | Until the window ends or the process restarts | Restart | None |
| Request ID | Support and debugging | Response header and error body only | None | Not stored | n/a | n/a |
| Operational log line | Finding a failed request | Process stderr, only for 5xx, 429 and unhandled exceptions: event, request ID, method, route template, status, duration, error code, exception class. Never bodies, cookies, headers, query strings, addresses, names, ids or exception messages (tested) | Whatever collects the host's stderr (not verified) | Set by the host, not by the app | Host's log controls | Whoever can read the host's logs |

## Not collected
No email address, name, phone number, location, contacts, device identifiers, analytics or advertising identifiers. No third-party analytics scripts. GSAP and fonts are fetched from public CDNs, which see ordinary asset requests (see SECURITY.md).

## Controls and how to check them
- Authorisation: `tests/test_accounts.py::test_ownership` and `tests/test_hardening.py::test_two_accounts_cannot_reach_each_others_records_planner_or_exports` (two accounts; read, delete by guessed ID, per-account client IDs, bulk import, planner, export).
- Export: `GET /api/account/export` returns the signed-in account's entries and planner only.
- Revocation: `POST /api/auth/logout-all` (password required) ends every session.

## Gaps that need a human decision
- Journal text is plaintext at rest; there is no application-level encryption.
- Retention for backups and for the hosting provider's logs is undefined here.
- No data-processing agreement, region statement or legal review exists for the AI provider. Treat any GDPR claim as unverified and flag it for legal review before public launch.
- There is no separate revocable "AI processing" setting beyond the per-page consent checkbox.
