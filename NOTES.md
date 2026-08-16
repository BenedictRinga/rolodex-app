# Rolodex — Design Notes (2026-08-16)

## THE CONFIDANTE (original concept, restored 2026-08-16)
The AI is not just a reminder engine — it is the user's **confidante / confidential
secretary**: it PROFfers the message, so the user only hits Send. That includes
birthdays, anniversaries, milestones, congratulations, and overdue follow-ups.
- **Per-contact / per-group preset guides** (the bot-directive pattern): the user
  writes their own voice once, the agent follows it.
- **STRICT mode**: "deliver this as-is for me" — the preset goes out untouched.
- **Guided mode**: the preset is the agent's directive; the draft interpolates
  `{name}` / `{occasion}`.
- **No preset**: the confidante composes from the contact's own context (name,
  birthday proximity, role, notes).
- **Network layer (future)**: the Rolodex AI agent of one user's comms to that of
  another or a group — grows from this per-card engine.
- **v0 (built 2026-08-16)**: deterministic template engine — the same surface
  later calls a real model for open-ended composition. Incomplete-but-real.

## The question: is the design away from traditional user-user chatrooms, replaced by in-contact-card chat?

**NO — not yet.** Audit result below.

## What the contact card HAS today (flip to a card)
- Actions: Call, Email, Map, Edit, Remove (device deep-links)
- Details: phone, email, address
- Follow-Up display (`rolodex.followUp` — set by the follow-up engine)
- Topic (`rolodex.topic`) and Note (free text)
- Reminders: stored in the model (`reminders[]` note+date) AND rendered on the card
- Birthday reminder button + add-to-calendar
- Flip animation, search, alphabetical grouping

## What is MISSING (the gap — the vision is unbuilt)
1. **In-card TEXT chat: absent.** There is no chat UI anywhere in the app —
   not a chatroom list (traditional model), and NOT a card-centric composer either.
   The `chatbubble-outline` icon on the card is only a label for the **Topic** field,
   not a chat entry point. The design-away-from-chatrooms was NOT replaced by
   card-centric chat — the slot is empty.
2. **In-card VIDEO chat: absent.** No camera/video/WebRTC capability in the
   dependency set at all.
3. **The stripped rails** (originally carried out of Zyppar, then removed):
   ZypparPods-analog, in-app chat, shared-recommended-providers — verified gone
   (only cloud-sync providers remain: Dropbox/Drive/OneDrive).

## Growth direction (user directive 2026-08-16)
- The chat/pods/comm rails grow INTO Rolodex — NOT back into Zyppar.
- The card is the surface: flip to a contact → chat (text + video) + reminders
  + follow-up right there, in-card. No separate chatroom list.
- The follow-up engine is the loop scheduler; AI drafting (DeepSeek/Grok/Qwen
  stack) is the "hard 90%" layer; the card is where "hit send" lives.
