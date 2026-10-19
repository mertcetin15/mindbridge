import json
import re
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from backend.app import create_app, Settings

ROOT = Path(__file__).resolve().parents[1]
BASELINE = json.loads((ROOT / 'docs' / 'visual-baseline.json').read_text(encoding='utf-8'))
TEMPLATE = (ROOT / 'frontend' / 'gallery.template.html').read_text(encoding='utf-8')
SAMPLES = re.findall(r'data-sample="([^"]+)"', TEMPLATE)
KEYS = {t + '@' + b for t in ('light', 'dark') for b in ('phone', 'tablet', 'desktop')}


def test_sample_ids_are_unique_and_every_baseline_key_covers_them():
    assert len(SAMPLES) == len(set(SAMPLES))
    assert set(BASELINE['hashes']) == KEYS
    for key, record in BASELINE['hashes'].items():
        assert set(record['samples']) == set(SAMPLES), key
        assert re.fullmatch(r'[0-9a-f]{8}', record['tokens']), key
        assert all(re.fullmatch(r'[0-9a-f]{8}', h) for h in record['samples'].values()), key


def test_the_two_themes_are_really_different_and_widths_only_change_what_depends_on_width():
    h = BASELINE['hashes']
    assert h['light@desktop']['tokens'] != h['dark@desktop']['tokens']
    for bucket in ('phone', 'tablet', 'desktop'):
        assert h['light@' + bucket]['tokens'] == h['light@desktop']['tokens']
    light, dark = h['light@desktop']['samples'], h['dark@desktop']['samples']
    assert all(light[s] != dark[s] for s in SAMPLES if not s.startswith('icon-camera')), 'each sample is drawn differently in dark'
    changed = [s for s in SAMPLES if h['light@phone']['samples'][s] != light[s]]
    assert set(changed) <= {'simplify-off', 'simplify-on', 'save-saved', 'welcome-card', 'card-guide'}, changed


def test_save_states_are_told_apart_by_the_fingerprint():
    # The first baseline ignored the left border and could not tell saved from saving. This pins the fix.
    s = BASELINE['hashes']['light@desktop']['samples']
    assert len({s['save-unsaved'], s['save-saving'], s['save-saved'], s['save-failed']}) == 4
    assert 'borderLeftColor' in (ROOT / 'frontend' / 'gallery.js').read_text(encoding='utf-8')


def test_gallery_page_is_generated_with_real_stylesheets_and_one_script():
    page = (ROOT / 'frontend' / 'gallery.html').read_text(encoding='utf-8')
    assert page.count('data-sample="') == len(SAMPLES)
    assert '{{' not in page
    assert len(re.findall(r'<script\b', page)) == 1 and 'src="/assets/gallery.js' in page


def test_gallery_route_exists_locally_with_the_strict_policy_and_not_in_production():
    with TestClient(create_app(Settings()), base_url='http://localhost') as c:
        r = c.get('/__gallery')
        assert r.status_code == 200 and 'component gallery' in r.text
        assert "script-src 'self'" in r.headers['content-security-policy']
        assert 'noindex' in r.text
    prod = Settings(production=True, public_origin='https://example.com', secure_cookies=True, require_ai_login=True, database_url='postgresql+psycopg://user:pass@localhost/mindbridge')
    # No `with`: the lifespan would try to reach the (fake) PostgreSQL server; routing alone is under test.
    assert TestClient(create_app(prod), base_url='https://example.com').get('/__gallery').status_code == 404
