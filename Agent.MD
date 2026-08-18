# Rolodex — Agent.MD

YARN ONLY on this project. Never npm.
Production build: `yarn build:prod` (chains the static-block fix). Deploy: `deploy.sh` on the droplet.

---

## ROLODEX NORTHSTAR (2026-08-16)

### The post that IS the North Star — inspirational first, for seed investors, and our design direction
> "One of the biggest consumer AI opportunities is helping people close the
> tiny loops they keep avoiding.
>
> Think about the 47 little things sitting on your list that you keep not
> doing. Emailing back the person you owe a reply, disputing the wrong
> charge, rescheduling the appointment, things like that.
>
> Each one is small, but each one requires digging up context, making a
> decision, and sending a slightly uncomfortable message. So they just kinda
> sit there.
>
> The opportunity is an agent that does the hard 90% of each loop, finds the
> context, makes the call, drafts the message, so all you do is hit send.
>
> The wedge is going after one loop first and nailing it."

Rolodex's wedge is the **owed-reply loop** — the person you keep meaning to
write back. That is a relationship loop: the birthday, the anniversary, the
"how did it go?", the follow-up you owe, the thank-you. It is the most
universal tiny loop there is, and it never closes on its own.

Rolodex is the agent that does the hard 90% of the relationship loop:
it digs up the context (who, when, why — the rolodex record), makes the call
(the occasion, the timing), drafts the message (in your own voice, via your
preset guides), so all you do is **hit send**.

### Design direction — the loop, not the app
- Every feature answers one question: does it close a tiny loop the user
  keeps avoiding? Reminders close the forgot-loop. Follow-ups close the
  owe-a-reply loop. The confidante closes the "I don't know what to say"
  loop. Pods close the "keep the group moving" loop. The card is where the
  send happens.
- Adjacent loops (the roadmap after the wedge): rescheduling the
  appointment; the annual "switch providers" loop; the family/kid-logistics
  loop — each one folds into the same engine: context + decision + draft +
  send.
- The North Star measurement (Zyppar's lesson, borrowed as the yardstick,
  NOT the inspiration): a retention curve that flattens — the % of users
  still active on day N stops decaying. Tiny loops are the engine that
  flattens it: every closed loop is a reason to come back tomorrow.

### The plans laid out for this pivot
1. **The card is the surface.** Flip to a contact and EVERYTHING is there:
   chat (text, then video), reminders, follow-ups, the confidante's
   proffered message. The card is where "hit send" lives.
2. **The confidante / confidential secretary.** The AI does the hard 90% —
   finds the context, makes the call, drafts the message; the user hits Send.
   Per-contact and per-group preset guides, STRICT mode (deliver as-is),
   guided mode (interpolate {name}/{occasion}), no preset (compose from
   context).
3. **The follow-up engine is the loop scheduler.** contactFrequency +
   priority auto-schedule the recurring check-in — the daily reason to
   return.
4. **Pods, not chatrooms.** Group threads derived from contact groups —
   shared schedule, shared reminders — grown INTO Rolodex, never back into
   Zyppar.
5. **Provenance.** Rolodex was extracted from Zyppar (2026-07-01); the
   Rolodex component, pagemanager/RolodexView, contact-card and the socket
   service still live inside Zyppar today. The direction of travel is
   forward — every rail grows into Rolodex.
6. **Live proof.** The demo room + socket chat: a message sent on one device
   appears on another immediately — the product communicates, right now.

### Pricing — Rolodex × RolodexAI
**Basic — $1/month.** Rolodex the contact manager: cards, groups, reminders,
follow-ups, birthday engine, cloud/Rolodex-server sync, pods, in-app chat
(text), device contacts.
**RolodexAI — $5/month.** Everything in Basic PLUS the AI layer: the
confidante (the hard 90% — context, call, draft; the user hits Send), AI
drafting from context, preset guides + STRICT mode, AI-suggested follow-ups
and outreach timing, in-card video chat (future), the network layer
(agent-to-agent comms).

The $1 tier is the habit; the $5 tier is the loop-closer — the confidante.

### Investor access
The About page carries a padlocked Investors section. Password (default):
`northstar`. Change it in `src/app/components/about-rolodex/about-rolodex.component.ts`.
Behind it: this North Star document, the roadmap, the pricing model, the
tiny-loops thesis.


## 2026-08-18 THE SHAREAPP DISTRIBUTION MECHANIC (fresh-thread work)

The 'casual' send: the counterparty receives a CRAFTED, moment-aware share
message (chat / birthday / milestone / congratulations / appointment) that
carries the RolodexAI logo + the invite deeplink, and arrives at THEIR card
ready with the pre-join comms. The OG-tagged landing makes the link preview
itself the branded card. The honest-send options sheet (already built) is
the doorway; the 7-day Confidante trial is the conversion. Full design:
D:/Tools/Grok/Conversations/rolodex-shareapp-distribution-2026-08-18.md
