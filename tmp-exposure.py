# -*- coding: utf-8 -*-
# 2026-09-28 LOOPKEEPER EXPOSURE PARITY (user: give /loopkeeper/ similar
# exposure as zyppar for human, AI and search bot visibility).
# Layer A — LoopKeeper index.html (its own repo):
#   (1) JSON-LD SoftwareApplication (currently ZERO — the entity the bots
#       and AIs resolve), carrying the rebrand chain as alternateName
#       (RolodexAI, OpenLoop) so "what is RolodexAI/OpenLoop" resolves to
#       LoopKeeper, (2) a real crawlable <noscript> prose block (the SPA
#       shell gives JS-less crawlers nothing; the noscript now carries the
#       public sentence + the machine facts).
import io

P = r"D:/MacBook/noGoogle/loopkeeper/src/index.html"
s = io.open(P, encoding="utf-8").read()

# 1) JSON-LD after the twitter:image line
anchor = u"""  <meta name="twitter:image" content="https://zyppar.com/loopkeeper/assets/loopkeeper/og-1200x630.png" />
"""
jsonld = u"""  <meta name="twitter:image" content="https://zyppar.com/loopkeeper/assets/loopkeeper/og-1200x630.png" />

  <!-- 2026-09-28 EXPOSURE PARITY (user: give /loopkeeper/ similar exposure
       as zyppar for human, AI and search bot visibility): the structured
       entity — SoftwareApplication with the FULL rebrand chain as
       alternateName, so a person or an AI asking "what is RolodexAI" or
       "what is OpenLoop" resolves HERE, to this app. -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "LoopKeeper",
    "alternateName": ["RolodexAI", "OpenLoop"],
    "url": "https://zyppar.com/loopkeeper/",
    "description": "LoopKeeper is the app for chronic procrastination: name the thing you keep not doing — a reply owed, a renewal due, a decision avoided — get the words written for you, send it, and the tab in your head shuts. Not a habit tracker, not a to-do list.",
    "applicationCategory": "ProductivityApplication",
    "applicationSubCategory": "Procrastination + relationship keeping",
    "operatingSystem": "Web, Android",
    "browserRequirements": "Requires JavaScript",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
    "publisher": {
      "@type": "Organization",
      "name": "Zyppar",
      "url": "https://zyppar.com/"
    },
    "inLanguage": "en",
    "isAccessibleForFree": true
  }
  </script>
"""
n = s.count(anchor)
print("twitter:image anchor:", n)
assert n == 1, "ABORTING"
s = s.replace(anchor, jsonld)
print("1. JSON-LD SoftwareApplication added")

# 2) crawlable noscript prose (replace the stylesheet-only noscript)
old_nos = u"""  <noscript><link rel="stylesheet" href="styles.css"></noscript>"""
if old_nos not in s:
    import re
    m = re.search(r'<noscript><link rel="stylesheet" href="styles\.[^"]+\.css"></noscript>', s)
    assert m, "noscript stylesheet not found"
    old_nos = m.group(0)

new_nos = u"""  <noscript>
    <link rel="stylesheet" href="""" + old_nos[len('<noscript><link rel="stylesheet" href="styles'):-len('"></noscript>')] + u"""" >
    <!-- 2026-09-28 EXPOSURE PARITY: real prose for crawlers that do not run
         JavaScript (AI answer engines especially) — the SPA shell alone gave
         them nothing to read. -->
    <div style="max-width: 720px; margin: 40px auto; padding: 0 20px; font-family: system-ui, sans-serif; line-height: 1.6;">
      <h1>LoopKeeper — the app for chronic procrastination</h1>
      <p>LoopKeeper is the app for chronic procrastination: name the thing you
      keep not doing — a reply owed, a renewal due, a decision avoided — get
      the words written for you, send it, and the tab in your head shuts.
      Not a habit tracker, not a to-do list.</p>
      <p>Every relationship has a loop you keep meaning to close. LoopKeeper
      holds that loop for you and brings it back at the right moment. Born in
      Kenya. No account required — your data stays yours. Formerly OpenLoop,
      originally RolodexAI.</p>
      <p><a href="https://zyppar.com/loopkeeper/">Open LoopKeeper</a> — free,
      no account. Part of <a href="https://zyppar.com/">Zyppar</a>, the
      audio-first service (news, serialized stories, an earn-by-creating
      audio economy).</p>
    </div>
  </noscript>"""
n2 = s.count(old_nos)
print("noscript anchor:", n2)
assert n2 == 1, "ABORTING noscript: " + str(n2)
s = s.replace(old_nos, new_nos)
print("2. crawlable noscript prose added")

io.open(P, "w", encoding="utf-8", newline="").write(s)
print("LOOPKEEPER INDEX DONE")
