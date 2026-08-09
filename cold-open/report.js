/*
 * Cold Open — scoring and the exportable coaching report.
 *
 * Split of responsibilities, on purpose:
 *   - here, in the browser: only what is objectively countable from the
 *     recording — filler words, pauses, pace, how much of the minute was
 *     used. Cheap, instant, no judgment calls.
 *   - in the exported file: a prompt that hands the transcript to an AI
 *     for everything that needs actual comprehension — structure, logic,
 *     persuasiveness, whether the point ever landed.
 */
window.ColdOpenReport = (function () {
  "use strict";

  // "hard" fillers are almost never meaningful words. "soft" ones are
  // real words that often act as verbal padding, so they cost less and
  // are flagged for the AI to judge in context rather than assumed bad.
  var FILLERS = [
    { label: "um",        re: /\b(?:u+m+|m+h+m+)\b/gi,        hard: true },
    { label: "uh",        re: /\b(?:u+h+)\b/gi,               hard: true },
    { label: "er / erm",  re: /\b(?:e+r+m*)\b/gi,             hard: true },
    { label: "ah",        re: /\b(?:a+h+)\b/gi,               hard: true },
    { label: "hmm",       re: /\b(?:h+m+)\b/gi,               hard: true },
    { label: "you know",  re: /\byou know\b/gi,               hard: false },
    { label: "I mean",    re: /\bi mean\b/gi,                 hard: false },
    { label: "sort of",   re: /\bsort of\b/gi,                hard: false },
    { label: "kind of",   re: /\bkind of\b/gi,                hard: false },
    { label: "basically", re: /\bbasically\b/gi,              hard: false },
    { label: "literally", re: /\bliterally\b/gi,              hard: false },
    { label: "like",      re: /\blike\b/gi,                   hard: false }
  ];

  var IDEAL_WPM_LOW = 120;
  var IDEAL_WPM_HIGH = 160;

  function countWords(text) {
    var t = (text || "").trim();
    if (!t) return 0;
    return t.split(/\s+/).length;
  }

  function analyze(input) {
    var transcript = input.transcript || "";
    var durationMs = input.durationMs || 0;
    var pauses = input.pauses || [];

    var words = countWords(transcript);
    var minutes = durationMs / 60000;
    var wpm = minutes > 0.05 ? Math.round(words / minutes) : 0;

    var fillerHits = [];
    var hardCount = 0;
    var softCount = 0;
    FILLERS.forEach(function (f) {
      var matches = transcript.match(f.re);
      var n = matches ? matches.length : 0;
      if (!n) return;
      fillerHits.push({ label: f.label, count: n, hard: f.hard });
      if (f.hard) hardCount += n; else softCount += n;
    });
    fillerHits.sort(function (a, b) { return b.count - a.count; });

    var longestPauseMs = pauses.reduce(function (m, p) { return Math.max(m, p.durationMs); }, 0);
    var totalPauseMs = pauses.reduce(function (s, p) { return s + p.durationMs; }, 0);

    // --- deductions, each capped so one weak dimension can't zero the score
    var deductions = [];
    function deduct(points, label) {
      if (points > 0) deductions.push({ label: label, points: Math.round(points) });
    }

    deduct(Math.min(hardCount * 3, 24), hardCount + " filler word" + (hardCount === 1 ? "" : "s") + " (um / uh / er)");
    deduct(Math.min(softCount * 1.5, 12), softCount + " padding phrase" + (softCount === 1 ? "" : "s") + " (like / you know / basically)");
    deduct(Math.min(pauses.length * 4, 20), pauses.length + " long pause" + (pauses.length === 1 ? "" : "s") + " over 1.5s");

    if (wpm > 0) {
      if (wpm < IDEAL_WPM_LOW) deduct(Math.min((IDEAL_WPM_LOW - wpm) / 5, 12), "Pace a little slow (" + wpm + " wpm)");
      else if (wpm > IDEAL_WPM_HIGH) deduct(Math.min((wpm - IDEAL_WPM_HIGH) / 5, 12), "Pace a little fast (" + wpm + " wpm)");
    }

    // Stopping well short of the minute usually means the point ran out
    // before the time did — worth flagging, but gently.
    var usedRatio = durationMs > 0 ? Math.min(1, durationMs / 60000) : 0;
    if (durationMs > 0 && durationMs < 35000) {
      deduct(Math.min((35000 - durationMs) / 2000, 10), "Used only " + Math.round(usedRatio * 100) + "% of the minute");
    }

    var totalDeducted = deductions.reduce(function (s, d) { return s + d.points; }, 0);
    var score = Math.max(0, Math.min(100, 100 - totalDeducted));

    return {
      score: score,
      deductions: deductions,
      words: words,
      wpm: wpm,
      durationMs: durationMs,
      fillerHits: fillerHits,
      hardCount: hardCount,
      softCount: softCount,
      pauses: pauses,
      longestPauseMs: longestPauseMs,
      totalPauseMs: totalPauseMs,
      transcript: transcript
    };
  }

  function secs(ms) { return (ms / 1000).toFixed(1) + "s"; }

  // The prompt is deliberately opinionated: most models default to
  // flattery, which is useless for practice, so it asks for the blunt
  // version and for a rewritten model answer they can compare against.
  function buildMarkdown(opts) {
    var a = opts.analysis;
    var topic = opts.topic || {};
    var when = new Date();
    var stamp = when.toISOString().slice(0, 16).replace("T", " ") + " UTC";

    var lines = [];
    lines.push("# Cold Open — 1-minute impromptu speech, for coaching");
    lines.push("");
    lines.push("## 👋 If you are an AI reading this file, this section is your instructions");
    lines.push("");
    lines.push("You are an experienced speech and communication coach. Below is a transcript of a");
    lines.push("**one-minute impromptu speech**: the speaker saw the topic for the first time 15");
    lines.push("minutes earlier, prepared alone with no help, and delivered it in one take with no");
    lines.push("script and no second attempt. Judge it by that standard — impromptu, not a keynote.");
    lines.push("");
    lines.push("Give them the honest version, not the encouraging version. Flattery wastes their");
    lines.push("practice. Be specific and quote their actual words back to them. Then answer these,");
    lines.push("using these headings:");
    lines.push("");
    lines.push("1. **Verdict in three sentences** — what worked, what didn't, and the single biggest thing costing them.");
    lines.push("2. **Structure** — was there a clear opening, a middle that went somewhere, and a real ending? Or did it trail off? Map what they actually did.");
    lines.push("3. **Substance** — is there a real argument here, or confident-sounding filler? Where were they vague when they could have been concrete? Did they use an example, and did it land?");
    lines.push("4. **Language & delivery** — hedging, run-on sentences, repeated crutch words, weak openings like \"so, basically…\". Use the counted metrics below, but trust the transcript over the numbers.");
    lines.push("5. **Top 3 fixes, ranked** — concrete and actionable. Not \"be more confident\"; something they can do on the very next attempt.");
    lines.push("6. **Model answer** — rewrite the same speech as roughly 150 words (about one minute spoken), on the same topic, at the level they could realistically reach next month. This is the most useful part: they need to hear what \"better\" sounds like.");
    lines.push("7. **One drill** — a single specific exercise to do before their next attempt.");
    lines.push("8. **Score /10** with one line of justification.");
    lines.push("");
    lines.push("Note on the metrics below: they were counted automatically in the browser.");
    lines.push("Speech-to-text often *drops* filler words entirely, so the real \"um\" count may be");
    lines.push("higher than reported — and words like \"like\" and \"actually\" are counted");
    lines.push("mechanically and may be perfectly legitimate here. Read the transcript and use your");
    lines.push("own judgment where the two disagree.");
    lines.push("");
    lines.push("---");
    lines.push("");
    lines.push("## The topic they were given");
    lines.push("");
    lines.push("> **" + (topic.text || "(not recorded)") + "**");
    lines.push("");
    if (topic.category) lines.push("Category: " + topic.category + "  ");
    lines.push("Format: 15 minutes to prepare · 60 seconds to speak · no notes, one take  ");
    lines.push("Recorded: " + stamp);
    lines.push("");

    if (opts.notes && opts.notes.trim()) {
      lines.push("### What they planned during prep");
      lines.push("");
      lines.push("```");
      lines.push(opts.notes.trim());
      lines.push("```");
      lines.push("");
      lines.push("*(Worth comparing against the transcript: did the plan survive contact with the clock?)*");
      lines.push("");
    }

    lines.push("## Transcript");
    lines.push("");
    if (a.transcript && a.transcript.trim()) {
      lines.push(a.transcript.trim());
    } else {
      lines.push("*(No transcript was captured. If an audio file was attached alongside this one,");
      lines.push("transcribe it first, then continue with the review.)*");
    }
    lines.push("");
    lines.push("## Measured delivery");
    lines.push("");
    lines.push("| Metric | Value |");
    lines.push("| --- | --- |");
    lines.push("| Delivery score (automatic, delivery only) | **" + a.score + " / 100** |");
    lines.push("| Spoke for | " + secs(a.durationMs) + " of the 60s |");
    lines.push("| Words | " + a.words + " |");
    lines.push("| Pace | " + (a.wpm || "—") + " wpm (comfortable range is " + IDEAL_WPM_LOW + "–" + IDEAL_WPM_HIGH + ") |");
    lines.push("| Filler words (um / uh / er) | " + a.hardCount + " |");
    lines.push("| Padding phrases (like / you know / basically) | " + a.softCount + " |");
    lines.push("| Pauses over 1.5s | " + a.pauses.length + (a.longestPauseMs ? " (longest " + secs(a.longestPauseMs) + ")" : "") + " |");
    lines.push("");

    if (a.fillerHits.length) {
      lines.push("**Filler breakdown:** " + a.fillerHits.map(function (f) {
        return f.label + " ×" + f.count;
      }).join(" · "));
      lines.push("");
    }

    if (a.pauses.length) {
      lines.push("**Where the long pauses fell:** " + a.pauses.map(function (p) {
        return secs(p.durationMs) + " at " + secs(p.atMs);
      }).join(" · "));
      lines.push("");
    }

    if (a.deductions.length) {
      lines.push("**How the delivery score broke down** (from 100):");
      lines.push("");
      a.deductions.forEach(function (d) { lines.push("- −" + d.points + " — " + d.label); });
      lines.push("");
    } else {
      lines.push("No automatic deductions — clean delivery. The content review below is where the real feedback is.");
      lines.push("");
    }

    lines.push("---");
    lines.push("");
    lines.push("*Generated by Cold Open — impromptu speech practice.*");
    lines.push("");
    return lines.join("\n");
  }

  function slugify(text) {
    return (text || "speech").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  }

  function download(filename, content, type) {
    var blob = content instanceof Blob ? content : new Blob([content], { type: type || "text/markdown;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  return {
    analyze: analyze,
    buildMarkdown: buildMarkdown,
    slugify: slugify,
    download: download,
    countWords: countWords
  };
})();
