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
| `index.html` | Page structure — the draw / preparing / speaking / review screens |
| `styles.css` | The Spotlight visual theme (dark stage, warm spotlight glow) |
| `app.js` | State machine, the countdown engine, and the alerting (sound / vibration / notifications) |
| `recorder.js` | Microphone capture, pause detection, and live transcription |
| `report.js` | Delivery scoring and the exportable coaching report |
| `topics.js` | The topic bank — a plain array, safe to hand-edit |
| `fonts/` | Self-hosted Bebas Neue + Manrope (OFL-licensed, free to redistribute) |

## Recording, scoring, and the AI report

With **Record & score** on (the default), the minute is captured through the
microphone. Permission is requested *before* the countdown starts, so the
browser's permission dialog never eats the opening seconds. If the mic is
blocked or unavailable, the speech runs exactly as normal — only the scoring
is skipped.

Afterwards the review screen offers playback plus a **delivery score out of
100**, deducting for:

- filler words — *um, uh, er, ah, hmm*
- padding phrases — *like, you know, I mean, basically, literally, sort of*
- pauses longer than 1.5s (detected from the audio itself, so it works in
  every browser regardless of transcription support)
- pace outside a comfortable 120–160 words per minute
- stopping well short of the full minute

The score covers **delivery only** — nothing about it understands whether the
argument was any good. That's what the export is for.

**↓ Download report for AI** produces a Markdown file with the coaching
prompt already written into it, so it can be handed to Claude, ChatGPT, or
Gemini with no accompanying message. The file contains the topic, the prep
notes, the transcript, and every measured metric, and asks the model for a
structured critique — verdict, structure, substance, language, three ranked
fixes, a rewritten model answer, a drill, and a score out of ten. The prompt
explicitly asks for the blunt version, since flattery is useless for practice.

### On transcription accuracy

Live transcription uses the browser's built-in speech recognition (Chrome,
Edge, and Safari — Firefox has none). Two caveats worth knowing:

- Speech recognizers frequently **discard filler words as noise**, so the
  automatic "um" count is a floor, not a ceiling.
- Soft fillers like *like* and *actually* are matched mechanically and are
  often perfectly legitimate words in context.

The transcript is therefore fully editable on the review screen, and the score
recalculates as it's corrected. The exported report tells the AI about both
caveats and instructs it to trust the transcript over the counts.

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

An interrupted run is also restored: the end timestamp is kept in
`localStorage`, so an accidental refresh or a phone killing the tab returns
to the same topic with the countdown resumed at the right moment, prep notes
intact. A speaking minute that expired while away resolves straight to the
review screen rather than handing back time that was never used. The audio
recording is the one thing a refresh cannot recover.

## Browser support

| | Timer & alerts | Recording & pause detection | Live transcription |
| --- | --- | --- | --- |
| Chrome / Edge | ✅ | ✅ | ✅ |
| Safari | ✅ | ✅ | ✅ |
| Firefox | ✅ | ✅ | ❌ — type the transcript in |

Recording needs a secure context, which means `https://` or a local file —
any real deployment qualifies.
