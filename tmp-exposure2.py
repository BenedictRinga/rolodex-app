# -*- coding: utf-8 -*-
# 2026-09-28 LOOPKEEPER EXPOSURE PARITY — v2 (clean string handling).
import io, re

P = r"D:/MacBook/noGoogle/loopkeeper/src/index.html"
s = io.open(P, encoding="utf-8").read()

# 1) JSON-LD after the twitter:image line
anchor = '  <meta name="twitter:image" content="https://zyppar.com/loopkeeper/assets/loopkeeper/og-1200x630.png" />\n'
jsonld = anchor + (
    '\n'
    '  <!-- 2026-09-28 EXPOSURE PARITY (user: give /loopkeeper/ similar exposure\n'
    '       as zyppar for human, AI and search bot visibility): the structured\n'
    '       entity - SoftwareApplication with the FULL rebrand chain as\n'
    '       alternateName, so a person or an AI asking "what is RolodexAI" or\n'
    '       "what is OpenLoop" resolves HERE, to this app. -->\n'
    '  <script type="application/ld+json">\n'
    '  {\n'
    '    "@context": "https://schema.org",\n'
    '    "@type": "SoftwareApplication",\n'
    '    "name": "LoopKeeper",\n'
    '    "alternateName": ["RolodexAI", "OpenLoop"],\n'
    '    "url": "https://zyppar.com/loopkeeper/",\n'
    '    "description": "LoopKeeper is the app for chronic procrastination: name the thing you keep not doing - a reply owed, a renewal due, a decision avoided - get the words written for you, send it, and the tab in your head shuts. Not a habit tracker, not a to-do list.",\n'
    '    "applicationCategory": "ProductivityApplication",\n'
    '    "operatingSystem": "Web, Android",\n'
    '    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },\n'
    '    "publisher": { "@type": "Organization", "name": "Zyppar", "url": "https://zyppar.com/" },\n'
    '    "inLanguage": "en",\n'
    '    "isAccessibleForFree": true\n'
    '  }\n'
    '  </script>\n'
)
n = s.count(anchor)
print("twitter:image anchor:", n)
assert n == 1, "ABORTING"
s = s.replace(anchor, jsonld)
print("1. JSON-LD added")

# 2) crawlable noscript prose (keep the stylesheet link, add prose)
m = re.search(r'(<noscript><link rel="stylesheet" href="styles\.[^"]+\.css"></noscript>)', s)
assert m, "noscript not found"
old_nos = m.group(1)
href_m = re.search(r'href="([^"]+)"', old_nos)
href = href_m.group(1)
new_nos = (
    '<noscript>\n'
    '    <link rel="stylesheet" href="' + href + '">\n'
    '    <!-- 2026-09-28 EXPOSURE PARITY: real prose for crawlers that do not\n'
    '         run JavaScript (AI answer engines especially) - the SPA shell\n'
    '         alone gave them nothing to read. -->\n'
    '    <div style="max-width: 720px; margin: 40px auto; padding: 0 20px; font-family: system-ui, sans-serif; line-height: 1.6;">\n'
    '      <h1>LoopKeeper - the app for chronic procrastination</h1>\n'
    '      <p>LoopKeeper is the app for chronic procrastination: name the thing you\n'
    '      keep not doing - a reply owed, a renewal due, a decision avoided - get\n'
    '      the words written for you, send it, and the tab in your head shuts.\n'
    '      Not a habit tracker, not a to-do list.</p>\n'
    '      <p>Every relationship has a loop you keep meaning to close. LoopKeeper\n'
    '      holds that loop for you and brings it back at the right moment. Born in\n'
    '      Kenya. No account required - your data stays yours. Formerly OpenLoop,\n'
    '      originally RolodexAI.</p>\n'
    '      <p><a href="https://zyppar.com/loopkeeper/">Open LoopKeeper</a> - free,\n'
    '      no account. Part of <a href="https://zyppar.com/">Zyppar</a>, the\n'
    '      audio-first service (news, serialized stories, an earn-by-creating\n'
    '      audio economy).</p>\n'
    '    </div>\n'
    '  </noscript>'
)
n2 = s.count(old_nos)
print("noscript anchor:", n2)
assert n2 == 1, "ABORTING noscript"
s = s.replace(old_nos, new_nos)
print("2. crawlable noscript prose added")

io.open(P, "w", encoding="utf-8", newline="").write(s)
print("LOOPKEEPER INDEX DONE")
