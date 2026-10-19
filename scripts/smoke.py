"""Smoke checks for a running MindBridge, to run right after a deployment.

    python scripts/smoke.py https://your-host.example
    python scripts/smoke.py http://127.0.0.1:8000 --with-account

By default it only reads public things: it creates no account, sends no chat message and touches no user data.
`--with-account` registers one throw-away account, signs in, checks the session and deletes the account again;
use it on staging or a local copy, not on a production database you do not want to touch. The password is generated
in memory and never printed. Exit status is 0 when every check passes and 1 otherwise.
"""
import re
import secrets
import sys
from urllib.parse import urlsplit

Result = tuple[str, bool, str]


def run(client, base='', with_account=False) -> list[Result]:
    results: list[Result] = []

    def check(name, ok, detail=''):
        results.append((name, bool(ok), detail))
        return ok

    def get(path, **kw):
        try:
            return client.get(base + path, **kw)
        except Exception as exc:                                   # connection refused, timeout, TLS...
            check('reach ' + path, False, type(exc).__name__)
            return None

    health = get('/api/health')
    if health is None:
        return results                                             # nothing else can work
    body = health.json() if health.headers.get('content-type', '').startswith('application/json') else {}
    check('health answers 200 with status ok', health.status_code == 200 and body.get('status') == 'ok', f'status {health.status_code}')
    check('health names a release', bool(body.get('release')), str(body.get('release')))
    check('health has a request id', bool(health.headers.get('x-request-id')))

    ready = get('/api/ready')
    check('ready: the database answers', ready is not None and ready.status_code == 200 and ready.json().get('status') == 'ready',
          'unavailable' if ready is not None and ready.status_code == 503 else '')

    home = get('/')
    page = home.text if home is not None else ''
    check('home page is served as HTML', home is not None and home.status_code == 200 and 'text/html' in home.headers.get('content-type', '') and 'MindBridge' in page)
    csp = (home.headers.get('content-security-policy', '') if home is not None else '')
    script_src = next((d.strip() for d in csp.split(';') if d.strip().startswith('script-src')), '')
    check("CSP: script-src is 'self' only", script_src == "script-src 'self'", script_src or 'missing')
    check('CSP: frames and objects are refused', "frame-ancestors 'none'" in csp and "object-src 'none'" in csp)
    check('security headers present', home is not None and all(h in home.headers for h in ('x-content-type-options', 'referrer-policy', 'x-frame-options', 'cross-origin-opener-policy')))
    check('home is revalidated, never stored stale', home is not None and home.headers.get('cache-control') == 'no-cache')

    if urlsplit(base).scheme == 'https':
        hsts = health.headers.get('strict-transport-security', '')
        check('HTTPS site sends HSTS', 'max-age=' in hsts, hsts or 'missing')

    assets = re.findall(r'(?:src|href)="(/assets/[^"]+\?v=[0-9a-f]{12})"', page)
    check('page references its assets', len(assets) >= 20, f'{len(assets)} found')
    if assets:
        sample = get(assets[0])
        check('a versioned asset is cached as immutable', sample is not None and sample.status_code == 200 and 'immutable' in sample.headers.get('cache-control', ''),
              sample.headers.get('cache-control', '') if sample is not None else '')
        fetched = [(a, get(a)) for a in assets[:: max(1, len(assets) // 8)]]
        missing = [a for a, r in fetched if r is None or r.status_code != 200]
        check('sampled assets all load', not missing, ', '.join(missing[:3]))

    me = get('/api/auth/me')
    check('signed-out visitors get an empty session, not an error', me is not None and me.status_code == 200 and me.json().get('user') is None)
    entries = get('/api/entries')
    check('private records refuse an anonymous request', entries is not None and entries.status_code == 401)
    check('private routes do not echo data in errors', entries is not None and set(entries.json()) <= {'error', 'request_id'})

    if with_account:
        origin = '{0.scheme}://{0.netloc}'.format(urlsplit(base)) if base else 'http://localhost'
        headers = {'X-MindBridge-Client': 'v5', 'Origin': origin}
        name, password = 'smoke' + secrets.token_hex(4), 'smoke-' + secrets.token_urlsafe(18)
        reg = client.post(base + '/api/auth/register', json={'username': name, 'password': password}, headers=headers)
        if check('throw-away account can be created', reg.status_code == 200, f'status {reg.status_code}'):
            session = client.get(base + '/api/auth/me').json()
            check('the new session is recognised', (session.get('user') or {}).get('username') == name)
            csrf = session.get('csrf') or ''
            deleted = client.post(base + '/api/auth/delete', json={'password': password}, headers={**headers, 'X-CSRF-Token': csrf})
            check('the throw-away account is deleted again', deleted.status_code == 200, f'status {deleted.status_code}')
            check('and its session no longer works', client.get(base + '/api/auth/me').json().get('user') is None)
    return results


def main(argv=None) -> int:
    import httpx
    args = list(sys.argv[1:] if argv is None else argv)
    with_account = '--with-account' in args
    urls = [a for a in args if not a.startswith('--')]
    if len(urls) != 1:
        print(__doc__)
        return 2
    with httpx.Client(timeout=15, follow_redirects=False) as client:
        results = run(client, urls[0].rstrip('/'), with_account)
    for name, ok, detail in results:
        print(('PASS  ' if ok else 'FAIL  ') + name + (f'  [{detail}]' if detail and not ok else ''))
    failed = [r for r in results if not r[1]]
    print(f'\n{len(results) - len(failed)} passed, {len(failed)} failed')
    return 1 if failed else 0


if __name__ == '__main__':
    raise SystemExit(main())
