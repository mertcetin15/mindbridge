"""Conservative keyword tiers, NOT a validated clinical risk classifier.

Decision matrix (see docs/SECURITY.md):
  imminent  - explicit self-harm / suicide language -> fixed human-help text, provider never called.
  uncertain - indirect distress (hopeless, burden, cannot go on) -> normal reply plus a support note;
              if the provider, consent or login is unavailable the support note is the whole reply.
  routine   - everything else.
Patterns can miss phrases and can match idioms. They are a floor, not an assessment, and are
never presented to users as detection.
"""
import re
import unicodedata

# Browser and server share this regex source: keep it JavaScript-compatible (flags 'iu').
PATTERN = (
    r"\b(suicid\w*|kill(?:ing)? myself|end(?:ing)? my life|self[- ]?harm|hurt(?:ing)? myself|tak(?:e|ing) my own life|end it all|better off dead"
    r"|want to die|wanna die|wish i (?:was|were) dead|no reason to live|don['’]?t want to (?:live|be alive|be here anymore)"
    r"|intihar|kendimi öldür|kendime zarar|yaşamak istemiyorum|ölmek istiyorum|canıma kıy\w*|hayatıma son"
    r"|selbstmord|suizid\w*|mich umbringen|nicht mehr leben|(?:will|möchte|wollte) sterben|sterben (?:will|möchte)|mir das leben nehmen"
    r"|matarme|hacerme daño|quiero morir|no quiero vivir|quitarme la vida|acabar con mi vida)"
)

SOFT_PATTERN = (
    r"\b(hopeless|can['’]?t go on|no point (?:in|to)|give up on (?:everything|life)|can['’]?t take (?:it|this) anymore"
    r"|everything is too much|nobody would (?:miss|care)|i['’]?m a burden"
    r"|umutsuz|dayanamıyorum|hiçbir anlamı yok|hayattan yoruldum"
    r"|hoffnungslos|kann nicht mehr|keinen sinn|bin eine last"
    r"|sin esperanza|no puedo más|sin sentido|soy una carga)"
)

# Region data lives here, not in the text. 'reviewed' stays None until a maintainer checks the
# numbers against the official source; docs/SECURITY.md lists them as unverified.
RESOURCES = {'DE': {'emergency': '112', 'helpline': '116 123', 'helpline_note': 'TelefonSeelsorge', 'reviewed': None, 'source_check': '2026-10-20: 116 123 confirmed on telefonseelsorge.de (automated lookup, not a human review); 112 is the EU emergency number'}}

CRISIS = {
    'en': 'If you may act on thoughts of harming yourself, seek immediate human help. In Germany, call 112 for immediate danger; TelefonSeelsorge: 116 123 (German-language support). If possible, contact someone you trust and ask them to stay with you. Outside Germany, use your local emergency service. This chat cannot provide emergency care.',
    'tr': 'Kendine zarar verme düşüncesiyle harekete geçebileceksen hemen bir insandan yardım al. Almanya’da acil tehlikede 112; TelefonSeelsorge: 116 123 (Almanca destek). Mümkünse güvendiğin birine ulaş ve yanında kalmasını iste. Almanya dışındaysan yerel acil yardım hattını kullan. Bu sohbet acil müdahale sağlayamaz.',
    'de': 'Wenn du Gedanken, dir etwas anzutun, umsetzen könntest, suche sofort menschliche Hilfe. In Deutschland: 112 bei unmittelbarer Gefahr; TelefonSeelsorge: 116 123. Kontaktiere wenn möglich eine vertraute Person und bitte sie, bei dir zu bleiben. Außerhalb Deutschlands nutze den örtlichen Notruf. Dieser Chat kann keine Notfallversorgung leisten.',
    'es': 'Si puedes actuar sobre pensamientos de hacerte daño, busca ayuda humana inmediata. En Alemania: 112 ante peligro inmediato; TelefonSeelsorge: 116 123 (atención en alemán). Si puedes, contacta a alguien de confianza y pídele que se quede contigo. Fuera de Alemania usa el servicio de emergencias local. Este chat no ofrece atención de emergencia.',
}

# Shown for uncertain risk. Deliberately gentle: no diagnosis, no claim that anyone was alerted.
SUPPORT = {
    'en': 'That sounds heavy, and you do not have to carry it alone. Consider telling someone you trust or a counsellor. If you ever feel you might act on thoughts of harming yourself, use your local emergency number (Germany: 112) or TelefonSeelsorge 116 123. This chat is not a professional service.',
    'tr': 'Bu ağır geliyor olabilir ve bunu tek başına taşımak zorunda değilsin. Güvendiğin biriyle ya da bir danışmanla konuşmayı düşünebilirsin. Kendine zarar verme düşüncesiyle harekete geçebileceğini hissedersen yerel acil numaranı (Almanya: 112) ya da TelefonSeelsorge 116 123’ü ara. Bu sohbet profesyonel bir hizmet değildir.',
    'de': 'Das klingt schwer, und du musst es nicht allein tragen. Sprich vielleicht mit einer vertrauten Person oder einer Beratungsstelle. Wenn du merkst, dass du Gedanken, dir etwas anzutun, umsetzen könntest, nutze den örtlichen Notruf (Deutschland: 112) oder die TelefonSeelsorge 116 123. Dieser Chat ist kein professioneller Dienst.',
    'es': 'Suena pesado y no tienes que cargarlo solo. Considera hablar con alguien de confianza o con un orientador. Si sientes que podrías actuar sobre pensamientos de hacerte daño, usa el número de emergencias local (Alemania: 112) o TelefonSeelsorge 116 123. Este chat no es un servicio profesional.',
}

_INVISIBLE = dict.fromkeys(map(ord, '​‌‍⁠﻿­'))
_IMMINENT = re.compile(PATTERN)
_UNCERTAIN = re.compile(SOFT_PATTERN)


def normalize(text: str) -> str:
    """Make trivial evasions (zero-width characters, odd spacing, full-width letters) match."""
    text = unicodedata.normalize('NFKC', text).translate(_INVISIBLE)
    text = text.replace('’', "'").replace('‘', "'")
    # Turkish dotted capital I casefolds to 'i' + combining dot; drop the combining mark.
    text = text.casefold().replace('i̇', 'i')
    return re.sub(r'\s+', ' ', text)


def assess_risk(text: str) -> str:
    """Return 'imminent', 'uncertain' or 'routine'. Never raises; unknown input is routine."""
    try:
        clean = normalize(text)
    except Exception:
        return 'routine'
    if _IMMINENT.search(clean):
        return 'imminent'
    if _UNCERTAIN.search(clean):
        return 'uncertain'
    return 'routine'


def crisis_match(text: str) -> bool:
    return assess_risk(text) == 'imminent'
