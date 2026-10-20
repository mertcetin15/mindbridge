"""Static performance budget for the first page load, plus the cache-digest invariant.

These are size and count limits computed from the built files, not timings: timings depend on the machine.
The numbers in docs/PERFORMANCE.md are the measured baseline; the limits here leave about 10% headroom so a
real regression (a new library, an unminified dump, a dozen new files) fails loudly and ordinary work does not.
"""
import gzip
import hashlib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / 'frontend'
PAGE = (FRONTEND / 'index.html').read_text(encoding='utf-8')
REFS = re.findall(r'(?:src|href)="/assets/([^"?]+)\?v=([0-9a-f]{12})"', PAGE)

LIMITS = {'scripts': 53, 'styles': 30, 'requests': 88, 'compressed_kb': 330, 'decoded_kb': 900, 'document_kb': 40, 'one_file_compressed_kb': 40}


def sizes():
    scripts = [n for n, _ in REFS if n.endswith('.js')]
    styles = [n for n, _ in REFS if n.endswith('.css')]
    raw = {n: (FRONTEND / 'assets' / n).read_bytes() for n, _ in REFS}
    gz = {n: len(gzip.compress(b, 5)) for n, b in raw.items()}   # the server compresses at level 5
    doc = PAGE.encode('utf-8')
    return {'scripts': len(scripts), 'styles': len(styles), 'requests': len(REFS) + 1 + 3,   # + the page and three non-asset requests seen in the browser
            'compressed_kb': (sum(gz.values()) + len(gzip.compress(doc, 5))) / 1024, 'decoded_kb': (sum(len(b) for b in raw.values()) + len(doc)) / 1024,
            'document_kb': len(doc) / 1024, 'one_file_compressed_kb': max(gz.values()) / 1024, 'largest': max(gz, key=gz.get)}


def test_the_first_load_stays_inside_its_budget():
    measured = sizes()
    over = {k: (round(measured[k], 1), limit) for k, limit in LIMITS.items() if measured[k] > limit}
    assert not over, f'over budget (measured, limit): {over}; largest file: {measured["largest"]}'


def test_the_budget_is_not_so_loose_that_it_means_nothing():
    measured = sizes()
    # If the page ever shrinks a lot, tighten LIMITS: a budget far above reality catches nothing.
    for key, limit in LIMITS.items():
        assert measured[key] > limit * 0.6, f'{key} is {measured[key]:.0f}, under 60% of its limit {limit}: tighten the budget'


def test_every_served_asset_digest_matches_the_bytes_on_disk():
    """The cache key in the page must be the digest of the file that is actually served.

    On Windows an earlier build wrote CRLF line endings after hashing LF text, so no digest matched,
    the server could never mark assets immutable, and every repeat visit revalidated every file.
    """
    assert len(REFS) >= 60, 'the page should reference its assets'
    bad = [n for n, version in REFS if hashlib.sha256((FRONTEND / 'assets' / n).read_bytes()).hexdigest()[:12] != version]
    assert not bad, f'digest does not match the served bytes for: {bad[:5]}'


def test_assets_are_stored_with_unix_line_endings_and_utf8():
    crlf = [n for n, _ in REFS if b'\r\n' in (FRONTEND / 'assets' / n).read_bytes()]
    assert not crlf, f'CRLF found in: {crlf[:5]}'
    for n, _ in REFS:
        (FRONTEND / 'assets' / n).read_bytes().decode('utf-8')


def test_no_asset_is_referenced_twice_and_none_is_missing():
    names = [n for n, _ in REFS]
    assert len(names) == len(set(names)), 'a file is loaded twice'
    assert all((FRONTEND / 'assets' / n).is_file() for n in names)
