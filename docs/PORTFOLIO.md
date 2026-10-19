# Presenting MindBridge in a portfolio

## CV entry

**MindBridge — Student Focus & Reflection Web App**  
Python, FastAPI, JavaScript, SQLAlchemy, SQLite, Alembic; optional Groq integration.

- Developed an AI-assisted full-stack portfolio project with account-scoped journals, cookie authentication, CSRF protection and retry-safe record imports.
- Connected focus-session goals and self-reported outcomes to an optional journal-draft workflow.
- Added automated API/storage and JavaScript behavior tests, database migration support, and prepared PostgreSQL/browser CI checks.

Use these statements only after reviewing and understanding the implementation. Do not claim independently writing all code, verified PostgreSQL support, passing browser tests or a live deployment until you have the corresponding evidence.

## Three-minute demonstration

1. Explain the user's task: decide one achievable study goal, complete a session, reflect on the result.
2. Show goal + first step, then pause/resume. Explain why timer completion does not imply task completion.
3. Show a guest journal, register, and explicitly import guest records.
4. Save a new record, reload, export, and explain account ownership checks.
5. Demonstrate fixed demo chat; explain when real AI sends data and how the key stays on the server.
6. Open tests and migration code. Explain one failure case and the test covering it.

## Questions you should answer without AI

- Why use a hashed session token rather than store the raw cookie token in the database?
- What does CSRF protect against, and why is SameSite alone not the entire design?
- What prevents Alice from deleting Bob's record?
- How does an import retry avoid duplicates?
- What happens if batch three fails after batches one and two have committed?
- Why use a monotonic deadline instead of subtracting one second on every timer callback?
- Which data is local, on the server, or sent to Groq?
- Why does the production configuration require one process today?
- How is a legacy database adopted without losing records?
- What tests have actually run, and which have only been prepared?

Add a real repository link, verified live demo link and screenshots once those exist. Do not use placeholder badges indicating tests are passing on GitHub.
