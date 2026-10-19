"""The built files that are served must match what the sources build to. A stale build was the cause of
"I edited it but the site did not change" more than once; this makes it a failing test instead."""
import shutil
from pathlib import Path

import build_frontend

ROOT = Path(__file__).resolve().parents[1]


def test_served_files_are_exactly_what_the_sources_build(tmp_path, monkeypatch):
    work = tmp_path / 'copy'
    shutil.copytree(ROOT / 'frontend', work / 'frontend', ignore=shutil.ignore_patterns('assets', 'index.html', 'gallery.html'))
    monkeypatch.setattr(build_frontend, 'ROOT', work)
    monkeypatch.setattr(build_frontend, 'FRONTEND', work / 'frontend')
    build_frontend.build()
    stale = []
    for built, shipped in [(work / 'MindBridge.html', ROOT / 'MindBridge.html'), (work / 'frontend' / 'index.html', ROOT / 'frontend' / 'index.html'), (work / 'frontend' / 'gallery.html', ROOT / 'frontend' / 'gallery.html')]:
        if built.read_bytes() != shipped.read_bytes():
            stale.append(shipped.name)
    for built in sorted((work / 'frontend' / 'assets').iterdir()):
        shipped = ROOT / 'frontend' / 'assets' / built.name
        if not shipped.is_file() or shipped.read_bytes() != built.read_bytes():
            stale.append('assets/' + built.name)
    assert stale == [], 'run `python build_frontend.py`; out of date: ' + ', '.join(stale)
