"""Build served assets and a portable HTML from the same ordered source modules."""
import json
import hashlib
import re
from pathlib import Path
from backend.safety import PATTERN, SOFT_PATTERN, CRISIS, SUPPORT

ROOT = Path(__file__).resolve().parent
FRONTEND = ROOT / 'frontend'

def build():
    template = (FRONTEND / 'page.html').read_text(encoding='utf-8')
    assets = FRONTEND / 'assets'
    assets.mkdir(exist_ok=True)
    safety = json.dumps({'pattern': PATTERN, 'soft_pattern': SOFT_PATTERN, 'crisis': CRISIS, 'support': SUPPORT}, ensure_ascii=False)
    def source(name):
        if not re.fullmatch(r'[a-zA-Z0-9-]+\.(js|css)', name):
            raise ValueError('Invalid asset name')
        value = (FRONTEND / name).read_text(encoding='utf-8').replace('__SAFETY_DATA__', safety)
        # Explicit UTF-8 and LF: the asset digest must match the bytes on disk on every OS.
        (assets / name).write_text(value, encoding='utf-8', newline='\n')
        return value
    def render(inline, page=template):
        def style(match):
            name = match[1]
            text = source(name)
            return '<style>' + text + '</style>' if inline else f'<link rel="stylesheet" href="/assets/{name}?v={hashlib.sha256(text.encode()).hexdigest()[:12]}">'
        def script(match):
            name, identifier = match[1], match[2]
            text = source(name)
            return f'<script id="{identifier}">\n{text}\n</script>' if inline else f'<script id="{identifier}" src="/assets/{name}?v={hashlib.sha256(text.encode()).hexdigest()[:12]}" defer></script>'
        result = re.sub(r'\{\{STYLE:([^}]+)\}\}', style, page)
        result = re.sub(r'\{\{SCRIPT:([^:}]+):([^}]+)\}\}', script, result)
        if '{{SCRIPT:' in result or '{{STYLE:' in result:
            raise ValueError('Unresolved build token')
        return result
    (FRONTEND / 'index.html').write_text(render(False), encoding='utf-8', newline='\n')
    (ROOT / 'MindBridge.html').write_text(render(True), encoding='utf-8', newline='\n')
    # Component gallery: the real stylesheets, in the page's own order, around hand-written samples.
    # Served only outside production (see backend/app.py). Not part of the shipped page or its budget.
    styles = ''.join('{{STYLE:%s}}\n' % name for name in re.findall(r'\{\{STYLE:([^}]+)\}\}', template))
    gallery = (FRONTEND / 'gallery.template.html').read_text(encoding='utf-8').replace('{{ALL_STYLES}}', styles)
    (FRONTEND / 'gallery.html').write_text(render(False, gallery), encoding='utf-8', newline='\n')

if __name__ == '__main__':
    build()
    print('Built frontend/index.html, gallery.html, assets and MindBridge.html.')
