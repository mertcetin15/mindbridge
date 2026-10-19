> **Update:** the suggested-path strip described below was removed at the owner's request (it took space and added little). Browser Back/Forward and page addresses remain. Mentions of the strip below describe what was built and tested before its removal.

# Navigation and the suggested path (UX-03)

## The path

How am I feeling? → What do I need? → One manageable step, then a gentle look back.

| Step | Page | Address |
|---|---|---|
| How am I feeling? | Self-check | `#/quiz` |
| What do I need? | Library | `#/library` |
| One small step, then a look back | Tools (Begin, Focus, Journal, Plan) | `#/tools` |

The three pages show a small strip with the order, where you are, and Back/Next buttons (`frontend/journey.js`, rules in `frontend/journey-core.js`). It is a suggestion: the menu still opens every page (Home, Stories, Chat, Contact too) and no tool was removed. The strip only changes which page is shown; it does not clear, save or send anything.

## Routes and Back

- Every page change adds one browser-history entry (`#/page`). Browser Back and Forward move between the site's pages. Before this release Back left the site, and there were no addresses.
- A page opens from its address. An unknown address is ignored and the site opens Home. No content, account or answer is ever put in the address.
- If the history API is blocked (for example some `file://` setups), navigation still works, only without addresses.

**First-time visitor:** Home (welcome card, optional) → Self-check or Tools, or the menu. Back returns to Home, then leaves the site.
**Returning signed-in user:** Home shows the resume line for the last planner step; the strip and menu work the same. Signing in does not change the route.

## Context between pages

Pages are hidden and shown, not rebuilt, so what was typed in the Journal, timer, planner or chat stays where it is when you leave and come back. The one exception is the Tools tab, which pauses focus and sound when you leave (stated on the page). This is by design and covered by reading the code, not by a new test of every field.

## Tested and not tested

`tests/test_journey.cjs` (9 checks): address parsing rejects anything unknown; one history entry per change, none for the same page; Back, Forward and load-from-address; blocked history API; strip only on the three pages, current step marked, Back/Next; four languages; the module touches no storage or network. In the in-app Chromium: Back/Forward across Self-check → Library → Tools, 0 horizontal overflow at 320px, the strip does not cover the headings.

**Navigation from other states (checked in the real browser, 320px):**
- *Unauthenticated:* every check in this document ran signed out; the strip and addresses do not ask who you are.
- *Offline / backend unavailable:* `window.fetch` was replaced with a function that always rejects, then Chat, Contact and Tools were opened and Back was pressed: each page opened, the address followed, and Back returned to the previous page. The module itself contains no network, storage or account code (a test asserts it).
- *Loading:* opening `/#/library` directly at load opens Library (test), and a first paint of Home is replaced in history rather than added.
- *Error:* an unknown address (`#/evil`) opens Home and is replaced (test); a blocked history API leaves navigation working (test).
- *Empty:* Library with no match keeps the strip and the menu (the strip is outside the result list).

**Also found:** Chromium caps `history.length` at 50 entries, so after many page changes the oldest entries drop; Back still works for the recent ones.

**Not tested:** real phones; screen-reader announcement of the strip. An earlier bug, found only in the browser: `<nav>` inherits the site's fixed 76px header rules, so the strip overlapped the heading; it is a `div role="navigation"` now.
