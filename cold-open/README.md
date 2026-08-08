# Cold Open

An impromptu-speech practice site. Draw a random topic from a bank spanning
dozens of fields, take 15 minutes to think it through, then speak for 60
seconds with no notes and no second take.

No warm-up. Just talk.

## Run it

No build step — it's plain HTML/CSS/JS.

- Double-click `index.html` to open it directly in a browser, **or**
- Serve the folder with any static server, e.g. `npx serve cold-open`

## Deploy it

Because it's fully static, it can be published as-is to GitHub Pages,
Netlify, Vercel, Cloudflare Pages, or any static host — just point the host
at this folder.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure — the draw / preparing / speaking / done screens |
| `styles.css` | The Spotlight visual theme (dark stage, warm spotlight glow) |
| `app.js` | State machine, the countdown engine, and the alerting (sound / vibration / notifications) |
| `topics.js` | The topic bank — a plain array, safe to hand-edit |
| `fonts/` | Self-hosted Bebas Neue + Manrope (OFL-licensed, free to redistribute) |

## The topic bank

`topics.js` currently ships with **225 topics** across 15 categories
(Technology & AI, Business & Work, Science & Nature, Health & Wellness, Arts
& Culture, Philosophy & Ethics, Society & Policy, History, Education,
Everyday Life, Entertainment & Pop Culture, Sports & Games, Environment,
Psychology & Relationships, and Just for Fun) — a solid seed set, not yet
the "thousands" the product is meant to grow into. Add more any time by
appending objects to the array:

```js
{ category: "Technology & AI", text: "Your new topic, phrased as a question or a prompt." }
```

Topics are drawn from a shuffle bag, so nothing repeats until every topic in
the bank has come up once.

## On the timer and backgrounded tabs

The countdown is timestamp-based (it recomputes from a fixed end time on
every tick) rather than counting down tick-by-tick, so it can't drift even
if the browser throttles a backgrounded tab for minutes at a time — the
moment it's checked again, it shows the true remaining time. Switching to
another tab or app is fine. A fully **closed** tab, however, stops running
JavaScript entirely (true of any web page, not specific to this one) — if
that needs to survive, it's a job for push notifications from a server or a
native app, not a browser tab.

With alerts turned on (top-right), a system notification, a chime, and a
vibration (on supported devices) fire when either timer ends, even if the
tab isn't the one currently focused.
