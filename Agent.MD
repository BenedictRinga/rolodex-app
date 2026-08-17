# Rolodex — Agent.MD

YARN ONLY on this project. Never npm.
Production build: `yarn build:prod` (chains the static-block fix). Deploy: `deploy.sh` on the droplet.

---

## ROLODEX NORTHSTAR (2026-08-16)

### The thesis that started the pivot — the X post
> "Graph the percentage of monthly active users on the y-axis versus the number
> of days from acquisition on the x-axis. If you end up with a retention curve
> that asymptotes to a line parallel to the x-axis, you have a viable business,
> and you have product/market fit for some subset of market." — Alex Schultz

Rolodex's NorthStar is a **retention curve that flattens** — the % of users
still active on day N stops decaying and holds. Everything we build is judged
against that single chart: does it bring a user back on day 30, day 90,
day 365?

### The plans laid out for this pivot
1. **The card is the surface.** No chatroom lists, no feed — flip to a
   contact and EVERYTHING is there: chat (text, then video), reminders,
   follow-ups, the confidante's proffered message. The card is where "hit
   send" lives.
2. **The confidante / confidential secretary.** The AI proffers the message;
   the user hits Send. Birthdays, anniversaries, milestones, congratulations,
   overdue follow-ups — composed in the user's own voice (per-contact and
   per-group preset guides, STRICT mode = deliver as-is, guided mode =
   interpolate {name}/{occasion}, no preset = compose from context).
3. **The follow-up engine is the loop scheduler.** contactFrequency +
   priority auto-schedule the recurring check-in — the engine that creates
   the daily reason to return.
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
confidante (proffered messages in the user's own voice), AI drafting from
context, preset guides + STRICT mode, AI-suggested follow-ups and outreach
timing, in-card video chat (future), the network layer (agent-to-agent
comms).

The $1 tier is the hook (contact management is the habit); the $5 tier is
the confidante (the relationship engine).

### Investor access
The About page carries a padlocked Investors section. Password (default):
`northstar`. Change it in `src/app/components/about-rolodex/about-rolodex.component.ts`.
Behind it: this NorthStar document, the roadmap, the pricing model, the
retention thesis.
