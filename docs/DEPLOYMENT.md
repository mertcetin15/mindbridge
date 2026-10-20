# Deployment runbook

This repository includes deployment configuration; no hosted URL is claimed. Sites hosting runs Workers and cannot directly run this Python/FastAPI process. Use a Python/container host with PostgreSQL and HTTPS, or perform a separate backend migration.

## Local Docker + PostgreSQL

Install Docker, set a URL-safe random `POSTGRES_PASSWORD` in your shell, then run:

```bash
docker compose up --build
```

The app is bound to localhost:8000. PostgreSQL has no host port exposed. The named database volume survives container replacement; `docker compose down -v` destroys it. Do not use that command to update the app.

Docker builds and Compose startup were not executed in the authoring environment. The configuration must pass the release gate below before public use.

## Hosted environment

Configure secrets through the hosting dashboard, never in source:

| Variable | Value |
| --- | --- |
| `APP_ENV` | `production` |
| `PUBLIC_ORIGIN` | Exact HTTPS origin, e.g. `https://your-domain.example`, without trailing slash |
| `DATABASE_URL` | `postgresql+psycopg://...` with URL-encoded credentials and the host's required TLS options |
| `PORT` | Host's assigned port, default 8000 |
| `GROQ_API_KEY` | Leave unset for the initial hosted demo |
| `SMTP_HOST`, `SMTP_PORT` (587), `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `SMTP_STARTTLS` (1) | Optional. Set `SMTP_HOST` and `SMTP_FROM` to turn on account email (confirm an address, reset a password by link). Leave them unset and the email features stay hidden. Keep `SMTP_PASSWORD` in the host's secret store. Use a provider that signs mail for your domain (SPF and DKIM), or messages may land in spam; that is not tested here. |
| `GROQ_MODEL` | Optional model ID available to your account |
| `TRUST_PROXY_HOPS` | `1` behind a single reverse proxy such as the host's load balancer, otherwise `0`. **Without it every visitor shares the proxy's address, so the per-address rate limits throttle everyone together.** Set it only when the proxy really appends the client address to `X-Forwarded-For`; this was not verified on any live host |
| `LOGIN_FAILURE_LIMIT` | Failed sign-ins per account name per 15 minutes before that name waits (default 10, allowed 3–100). Someone can deliberately trigger it for a name they do not own; that is the accepted trade-off |
| `AI_DAILY_QUOTA` | AI replies per signed-in account per rolling 24 hours (default 200, `0` disables). Counted in process memory, so it resets on restart and assumes the single instance this guide requires. It limits one account; it is not a provider spending cap, which must still be set at the provider |

Build the included Dockerfile and run its default command. `serve.py` applies migrations before starting one Uvicorn process. Deploy only one instance; migration locking and shared rate limiting are not provided. The proxy must preserve the public Host header. Origin validation uses PUBLIC_ORIGIN and does not trust arbitrary forwarded headers. HTTPS terminates at the hosting proxy; cookies and HSTS are enabled by production settings.

For the first live version, leave AI disabled, test accounts with disposable records, then enable AI only after configuring provider spending limits and suitable access restrictions. Do not promise free unlimited AI.

## Release gate

1. Run CI with PostgreSQL, Chromium, WebKit and mobile viewport checks. Investigate every failure; do not treat test discovery as execution.
2. Manually test actual Safari/iPhone, sound playback, keyboard navigation and a screen reader. Capture screenshots only from a synthetic demo account.
3. Back up the database. Run `python -m backend.migrate` using the deployment environment and verify startup.
4. Confirm `/api/health` on the hosted origin, then register, save, reload, export and delete a disposable account. Verify another account cannot see its records.
5. Verify invalid Host/Origin rejection and Secure cookies over HTTPS. Confirm HTTP redirects to HTTPS at the host.
6. Restore a backup to an isolated database and compare record counts before declaring backup readiness. For SQLite, `python scripts/restore_drill.py` does this and checks integrity (counts only). For PostgreSQL use pg_dump/pg_restore into an isolated database and compare the same per-table counts; that path is not automated.

## GitHub publication

Create a repository named `mindbridge` in your account, initially private. Upload the project directory contents, including `.github/workflows/ci.yml`, rather than uploading only the ZIP. Do not upload `data`, `.env`, `.venv`, `node_modules`, test reports or personal exports. The workflow runs automatically on push. Set repository visibility to public only when its contents and test results are ready for portfolio review.

The connected account returned no accessible repositories during this work. No repository was created or uploaded by this release.

## References

- https://fastapi.tiangolo.com/deployment/docker/
- https://alembic.sqlalchemy.org/en/latest/tutorial.html
- https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers
- https://playwright.dev/docs/test-projects
- https://playwright.dev/docs/test-webserver
