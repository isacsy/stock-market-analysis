/*
 * Cold Open — app logic.
 * Plain script (no bundler) so index.html works opened directly from disk
 * or from any static host.
 */
(function () {
  "use strict";

  var PREP_MS = 15 * 60 * 1000;
  var SPEAK_MS = 60 * 1000;
  var SESSION_KEY = "coldopen:session";
  var SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

  // ---------------------------------------------------------------
  // Timer engine
  //
  // Backgrounded / inactive tabs throttle or fully suspend
  // setInterval — sometimes to once a second, sometimes to nothing
  // until the tab is focused again. A counter that just subtracts
  // "1 second" per tick drifts badly under that throttling.
  //
  // Instead every tick recomputes remaining time from a fixed end
  // timestamp (Date.now()). Whenever the interval *does* get to run
  // — even minutes late — it reports the true remaining time, not
  // an accumulated guess. A visibilitychange listener also forces
  // an immediate recompute the moment the tab becomes visible again,
  // so the display never sits stale.
  // ---------------------------------------------------------------
  function createCountdown(durationMs, onTick, onDone) {
    var endAt = null;
    var intervalId = null;
    var done = true;

    function computeAndReport() {
      var remaining = endAt === null ? durationMs : Math.max(0, endAt - Date.now());
      onTick(remaining);
      if (remaining <= 0 && !done) {
        done = true;
        stop();
        onDone();
      }
      return remaining;
    }

    // `explicitEndAt` resumes a session restored from storage rather than
    // starting a fresh full-duration run.
    function start(explicitEndAt) {
      endAt = explicitEndAt || (Date.now() + durationMs);
      done = false;
      stop();
      computeAndReport();
      if (!done) intervalId = setInterval(computeAndReport, 250);
      return endAt;
    }

    function stop() {
      if (intervalId) { clearInterval(intervalId); intervalId = null; }
    }

    function isRunning() { return !done; }

    return {
      start: start,
      stop: stop,
      isRunning: isRunning,
      recompute: computeAndReport
    };
  }

  var activeCountdowns = [];
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
      activeCountdowns.forEach(function (c) { if (c.isRunning()) c.recompute(); });
    }
  });

  // ---------------------------------------------------------------
  // Session persistence.
  //
  // The countdown lives on a wall-clock end timestamp, so storing that
  // timestamp is enough to rebuild an in-progress run exactly after an
  // accidental refresh, a crash, or a phone killing the tab to reclaim
  // memory. Storage failures (private mode, disabled cookies) are
  // non-fatal — the app just loses restore, never its timing.
  // ---------------------------------------------------------------
  function saveSession(session) {
    try {
      session.savedAt = Date.now();
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (e) { /* storage unavailable — restore is a bonus, not a requirement */ }
  }
  function loadSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || !s.topic || !s.topic.text || !s.phase || !s.endAt) return null;
      if (Date.now() - (s.savedAt || 0) > SESSION_MAX_AGE_MS) return null;
      return s;
    } catch (e) { return null; }
  }
  function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* nothing to clean up */ }
  }
  function patchSession(patch) {
    var s = loadSession();
    if (!s) return;
    Object.keys(patch).forEach(function (k) { s[k] = patch[k]; });
    saveSession(s);
  }

  // ---------------------------------------------------------------
  // Alerts: sound (WebAudio, no asset files), vibration, browser
  // notification (opt-in), and a flashing tab title as a fallback
  // that needs no permission at all.
  // ---------------------------------------------------------------
  var audioCtx = null;
  function unlockAudio() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  }
  function beep(freq, startAt, durationSec) {
    if (!audioCtx) return;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.frequency.value = freq;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.22, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(startAt);
    osc.stop(startAt + durationSec + 0.05);
  }
  function playChime(kind) {
    if (!audioCtx) return;
    var t = audioCtx.currentTime;
    if (kind === "prepDone") {
      beep(660, t, 0.16);
      beep(880, t + 0.18, 0.22);
    } else if (kind === "speakDone") {
      beep(523, t, 0.14);
      beep(523, t + 0.18, 0.14);
      beep(392, t + 0.36, 0.32);
    }
  }

  function vibrate(pattern) {
    if (navigator.vibrate) navigator.vibrate(pattern);
  }

  var notifyEnabled = false;
  function sendNotification(title, body) {
    if (!notifyEnabled || !("Notification" in window) || Notification.permission !== "granted") return;
    try {
      var n = new Notification(title, { body: body, tag: "cold-open", requireInteraction: false });
      n.onclick = function () { window.focus(); n.close(); };
    } catch (e) { /* some browsers reject Notification() outside a service worker on mobile */ }
  }

  var titleFlashTimer = null;
  var baseTitle = document.title;
  function flashTitle(message) {
    if (document.visibilityState === "visible") return;
    var on = false;
    stopTitleFlash();
    titleFlashTimer = setInterval(function () {
      document.title = on ? baseTitle : message;
      on = !on;
    }, 1000);
    document.addEventListener("visibilitychange", stopTitleFlashOnceVisible);
  }
  function stopTitleFlashOnceVisible() {
    if (document.visibilityState === "visible") {
      stopTitleFlash();
      document.title = baseTitle;
      document.removeEventListener("visibilitychange", stopTitleFlashOnceVisible);
    }
  }
  function stopTitleFlash() {
    if (titleFlashTimer) { clearInterval(titleFlashTimer); titleFlashTimer = null; }
  }

  var wakeLock = null;
  function requestWakeLock() {
    if (!("wakeLock" in navigator)) return;
    navigator.wakeLock.request("screen").then(function (lock) {
      wakeLock = lock;
    }).catch(function () { /* ignore — not fatal, timer stays correct regardless */ });
  }
  function releaseWakeLock() {
    if (wakeLock) { wakeLock.release().catch(function () {}); wakeLock = null; }
  }
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && currentState !== "draw" && currentState !== "done") {
      requestWakeLock();
    }
  });

  // ---------------------------------------------------------------
  // Topic picker — shuffle-bag so the same topic can't repeat until
  // every other topic in the bank has been drawn once.
  // ---------------------------------------------------------------
  var bag = [];
  function refillBag(excludeText) {
    bag = COLD_OPEN_TOPICS.slice();
    for (var i = bag.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = bag[i]; bag[i] = bag[j]; bag[j] = tmp;
    }
    if (excludeText && bag.length > 1 && bag[0].text === excludeText) {
      bag.push(bag.shift());
    }
  }
  function drawTopic() {
    if (bag.length === 0) refillBag(lastTopic && lastTopic.text);
    var topic = bag.pop();
    lastTopic = topic;
    return topic;
  }
  var lastTopic = null;

  // ---------------------------------------------------------------
  // UI wiring
  // ---------------------------------------------------------------
  var els = {
    screens: {
      draw: document.getElementById("screen-draw"),
      prep: document.getElementById("screen-prep"),
      speak: document.getElementById("screen-speak"),
      done: document.getElementById("screen-done")
    },
    drawBtn: document.getElementById("draw-btn"),
    drawAnotherBtn: document.getElementById("draw-another-btn"),
    readyBtn: document.getElementById("ready-btn"),
    skipBtn: document.getElementById("skip-btn"),
    prepCategory: document.getElementById("prep-category"),
    prepTopic: document.getElementById("prep-topic"),
    prepNum: document.getElementById("prep-num"),
    prepStatus: document.getElementById("prep-status"),
    notes: document.getElementById("notes"),
    speakTopic: document.getElementById("speak-topic"),
    speakNum: document.getElementById("speak-num"),
    speakGlow: document.getElementById("speak-glow"),
    doneMessage: document.getElementById("done-message"),
    alertToggle: document.getElementById("alert-toggle"),
    alertLabel: document.getElementById("alert-label"),
    recordToggle: document.getElementById("record-toggle"),
    recordLabel: document.getElementById("record-label"),
    recIndicator: document.getElementById("rec-indicator"),
    review: document.getElementById("review"),
    scoreValue: document.getElementById("score-value"),
    playback: document.getElementById("playback"),
    metrics: document.getElementById("metrics"),
    breakdown: document.getElementById("breakdown"),
    deductions: document.getElementById("deductions"),
    transcript: document.getElementById("transcript"),
    transcriptHint: document.getElementById("transcript-hint"),
    exportBtn: document.getElementById("export-btn"),
    exportAudioBtn: document.getElementById("export-audio-btn"),
    recordNote: document.getElementById("record-note")
  };

  var currentState = "draw";
  var prepCountdown = null;
  var speakCountdown = null;

  // Screen readers get the topic and the phase changes spoken; the dial
  // itself is decorative and would be noise if announced every tick.
  var liveRegion = document.getElementById("live-region");
  function announce(message) {
    if (liveRegion) liveRegion.textContent = message;
  }

  var recordEnabled = true;
  var activeRecorder = null;
  var lastCapture = null;
  var lastAnalysis = null;
  var lastNotes = "";
  var playbackUrl = null;
  var recordNoteText = "";

  function fmt(ms) {
    var total = Math.ceil(ms / 1000);
    var m = Math.floor(total / 60);
    var s = total % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function setState(next) {
    currentState = next;
    Object.keys(els.screens).forEach(function (key) {
      els.screens[key].hidden = key !== next;
    });
    if (next === "prep" || next === "speak") {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
  }

  var prepDial = els.prepNum.closest(".dial");
  var speakDial = els.speakNum.closest(".dial");

  function markPrepTimeUp() {
    els.prepStatus.textContent = "Time's up — start whenever you're ready.";
    els.prepStatus.classList.add("is-urgent");
    if (prepDial) prepDial.classList.add("is-urgent");
  }

  // `resumeEndAt` / `restoredNotes` are only passed when rebuilding a
  // session after a reload; a normal draw starts a clean 15:00.
  function startPrep(topic, resumeEndAt, restoredNotes) {
    lastTopic = topic;
    clearReview();
    els.prepCategory.textContent = topic.category;
    els.prepTopic.textContent = topic.text;
    els.prepStatus.textContent = "";
    els.prepStatus.classList.remove("is-urgent");
    if (prepDial) prepDial.classList.remove("is-urgent");
    // Notes belong to the topic they were written for — a new topic starts blank.
    els.notes.value = restoredNotes || "";
    setState("prep");

    if (prepCountdown) { prepCountdown.stop(); activeCountdowns = activeCountdowns.filter(function (c) { return c !== prepCountdown; }); }
    prepCountdown = createCountdown(PREP_MS, function (remaining) {
      els.prepNum.textContent = fmt(remaining);
      if (prepDial) prepDial.style.setProperty("--p", (remaining / PREP_MS) * 360 + "deg");
    }, function () {
      markPrepTimeUp();
      playChime("prepDone");
      vibrate([120, 60, 120]);
      sendNotification("Cold Open", "Prep time's up. Start speaking whenever you're ready.");
      flashTitle("⏰ Prep time's up!");
      announce("Prep time is up. Start whenever you're ready.");
    });
    activeCountdowns.push(prepCountdown);
    var endAt = prepCountdown.start(resumeEndAt);

    saveSession({ topic: topic, phase: "prep", endAt: endAt, notes: els.notes.value });
    announce(topic.category + ". " + topic.text + ". Fifteen minutes to prepare.");
  }

  function startSpeaking(resumeEndAt) {
    if (prepCountdown) prepCountdown.stop();
    var topic = lastTopic;
    els.speakTopic.textContent = topic.text;
    setState("speak");
    els.speakGlow.classList.add("is-tight");
    els.speakNum.classList.remove("is-urgent");
    if (speakDial) speakDial.classList.remove("is-urgent");

    if (speakCountdown) { speakCountdown.stop(); activeCountdowns = activeCountdowns.filter(function (c) { return c !== speakCountdown; }); }
    speakCountdown = createCountdown(SPEAK_MS, function (remaining) {
      els.speakNum.textContent = fmt(remaining);
      if (speakDial) {
        speakDial.style.setProperty("--p", (remaining / SPEAK_MS) * 360 + "deg");
        if (remaining <= 10000) speakDial.classList.add("is-urgent");
      }
      if (remaining <= 10000) els.speakNum.classList.add("is-urgent");
    }, function () {
      playChime("speakDone");
      vibrate([160, 80, 160, 80, 260]);
      sendNotification("Cold Open", "Time's up!");
      flashTitle("⏰ Time's up!");
      showDone(topic);
    });
    activeCountdowns.push(speakCountdown);
    var endAt = speakCountdown.start(resumeEndAt);

    saveSession({ topic: topic, phase: "speak", endAt: endAt });
    announce("You're up. One minute starting now.");
  }

  function clearReview() {
    els.review.hidden = true;
    els.recordNote.hidden = true;
    els.playback.hidden = true;
    els.exportAudioBtn.hidden = true;
    if (playbackUrl) { URL.revokeObjectURL(playbackUrl); playbackUrl = null; }
    els.playback.removeAttribute("src");
    lastCapture = null;
    lastAnalysis = null;
  }

  function showDone(topic) {
    els.doneMessage.textContent = "Time's up on “" + topic.text + "”.";
    els.speakGlow.classList.remove("is-tight");
    els.recIndicator.hidden = true;
    clearSession();
    setState("done");
    announce("Time's up.");

    if (!activeRecorder) { clearReview(); showRecordNote(recordNoteText); return; }

    var recorder = activeRecorder;
    activeRecorder = null;
    recorder.stop().then(function (capture) {
      lastCapture = capture;
      lastCapture.topic = topic;
      lastCapture.notes = lastNotes;
      renderReview(capture, topic);
    });
  }

  // ---------------------------------------------------------------
  // Review: score the delivery, offer playback, and build the export.
  // ---------------------------------------------------------------
  function renderReview(capture, topic) {
    els.transcript.value = capture.transcript || "";
    els.transcriptHint.textContent = capture.transcript
      ? "— auto-transcribed, edit anything it got wrong"
      : (capture.recognitionSupported
          ? "— nothing was picked up; type what you said"
          : "— your browser can't transcribe; type what you said (Chrome or Safari can do it for you)");

    if (capture.audioBlob && capture.audioBlob.size) {
      if (playbackUrl) URL.revokeObjectURL(playbackUrl);
      playbackUrl = URL.createObjectURL(capture.audioBlob);
      els.playback.src = playbackUrl;
      els.playback.hidden = false;
      els.exportAudioBtn.hidden = false;
    } else {
      els.playback.hidden = true;
      els.exportAudioBtn.hidden = true;
    }

    els.review.hidden = false;
    recomputeScore(capture, topic);
  }

  function recomputeScore(capture, topic) {
    var analysis = ColdOpenReport.analyze({
      transcript: els.transcript.value,
      durationMs: capture.durationMs,
      pauses: capture.pauses
    });
    lastAnalysis = analysis;

    els.scoreValue.textContent = analysis.score;

    var pauseCount = analysis.pauses.length;
    var cells = [
      { value: analysis.hardCount, label: "um / uh / er", flag: analysis.hardCount > 2 },
      { value: analysis.softCount, label: "like / you know", flag: analysis.softCount > 3 },
      { value: pauseCount, label: "pauses over 1.5s", flag: pauseCount > 1 },
      { value: analysis.wpm || "—", label: "words per minute", flag: analysis.wpm > 0 && (analysis.wpm < 110 || analysis.wpm > 170) }
    ];
    els.metrics.innerHTML = "";
    cells.forEach(function (c) {
      var li = document.createElement("li");
      if (c.flag) li.className = "is-flag";
      var b = document.createElement("b");
      b.textContent = c.value;
      var span = document.createElement("span");
      span.textContent = c.label;
      li.appendChild(b);
      li.appendChild(span);
      els.metrics.appendChild(li);
    });

    els.deductions.innerHTML = "";
    if (analysis.deductions.length) {
      els.breakdown.hidden = false;
      analysis.deductions.forEach(function (d) {
        var li = document.createElement("li");
        li.textContent = "−" + d.points + " — " + d.label;
        els.deductions.appendChild(li);
      });
    } else {
      els.breakdown.hidden = true;
    }
  }

  function showRecordNote(text) {
    if (!text) { els.recordNote.hidden = true; return; }
    els.recordNote.textContent = text;
    els.recordNote.hidden = false;
  }

  function resetToDraw() {
    if (prepCountdown) prepCountdown.stop();
    if (speakCountdown) speakCountdown.stop();
    els.speakGlow.classList.remove("is-tight");
    clearSession();
    setState("draw");
  }

  els.drawBtn.addEventListener("click", function () {
    unlockAudio();
    startPrep(drawTopic());
  });
  els.drawAnotherBtn.addEventListener("click", function () {
    unlockAudio();
    startPrep(drawTopic());
  });
  els.readyBtn.addEventListener("click", function () {
    unlockAudio();
    lastNotes = els.notes.value;
    recordNoteText = "";

    if (!recordEnabled) { startSpeaking(); return; }

    // Acquire the mic *before* the clock starts — otherwise the
    // permission dialog eats the opening seconds of their minute.
    els.readyBtn.disabled = true;
    els.readyBtn.textContent = "Getting the mic ready…";
    var recorder = ColdOpenRecorder.create();
    recorder.start({}).then(function (result) {
      els.readyBtn.disabled = false;
      els.readyBtn.textContent = "I'm Ready — Lights Up";
      if (result.ok) {
        activeRecorder = recorder;
        els.recIndicator.hidden = false;
      } else {
        activeRecorder = null;
        els.recIndicator.hidden = true;
        recordNoteText = result.reason === "denied"
          ? "Microphone access was blocked, so this run wasn't recorded or scored. Allow the mic in your browser's address bar to get playback and a report."
          : "This browser couldn't open the microphone, so this run wasn't recorded or scored. The timer works either way.";
      }
      startSpeaking();
    });
  });
  els.skipBtn.addEventListener("click", function () {
    unlockAudio();
    startPrep(drawTopic());
  });

  els.notes.addEventListener("input", function () {
    patchSession({ notes: els.notes.value });
  });

  // Editing the transcript re-scores immediately — the counts should
  // always match the words actually on screen.
  els.transcript.addEventListener("input", function () {
    if (lastCapture) recomputeScore(lastCapture, lastCapture.topic);
  });

  els.recordToggle.addEventListener("click", function () {
    recordEnabled = !recordEnabled;
    els.recordToggle.setAttribute("aria-pressed", String(recordEnabled));
    els.recordLabel.textContent = recordEnabled ? "Record & score" : "Recording off";
  });

  els.exportBtn.addEventListener("click", function () {
    if (!lastAnalysis || !lastCapture) return;
    var topic = lastCapture.topic || {};
    var markdown = ColdOpenReport.buildMarkdown({
      analysis: lastAnalysis,
      topic: topic,
      notes: lastCapture.notes
    });
    var name = "cold-open-" + new Date().toISOString().slice(0, 10) + "-" + ColdOpenReport.slugify(topic.text) + ".md";
    ColdOpenReport.download(name, markdown);
    announce("Report downloaded.");
  });

  els.exportAudioBtn.addEventListener("click", function () {
    if (!lastCapture || !lastCapture.audioBlob) return;
    var topic = lastCapture.topic || {};
    var ext = (lastCapture.audioBlob.type || "").indexOf("mp4") > -1 ? "m4a" : "webm";
    var name = "cold-open-" + new Date().toISOString().slice(0, 10) + "-" + ColdOpenReport.slugify(topic.text) + "." + ext;
    ColdOpenReport.download(name, lastCapture.audioBlob);
  });

  els.alertToggle.addEventListener("click", function () {
    unlockAudio();
    if (!("Notification" in window)) {
      els.alertLabel.textContent = "Notifications unsupported here";
      return;
    }
    if (Notification.permission === "granted") {
      notifyEnabled = !notifyEnabled;
      els.alertToggle.setAttribute("aria-pressed", String(notifyEnabled));
      els.alertLabel.textContent = notifyEnabled ? "Alerts on" : "Alerts off";
      return;
    }
    Notification.requestPermission().then(function (perm) {
      notifyEnabled = perm === "granted";
      els.alertToggle.setAttribute("aria-pressed", String(notifyEnabled));
      els.alertLabel.textContent = notifyEnabled ? "Alerts on" : (perm === "denied" ? "Blocked — check browser settings" : "Alerts off");
    });
  });

  var topicCountEl = document.getElementById("topic-count");
  if (topicCountEl) topicCountEl.textContent = COLD_OPEN_TOPICS.length;

  // ---------------------------------------------------------------
  // Boot: rebuild an interrupted run if one was in flight, otherwise
  // start at the draw screen.
  // ---------------------------------------------------------------
  (function boot() {
    var saved = loadSession();
    if (!saved) { setState("draw"); return; }

    var expired = saved.endAt <= Date.now();

    if (saved.phase === "prep") {
      startPrep(saved.topic, saved.endAt, saved.notes);
      if (expired) markPrepTimeUp();
      return;
    }

    if (saved.phase === "speak") {
      lastTopic = saved.topic;
      // A minute that ran out while the tab was gone is simply over —
      // resuming it would hand back time the speaker never had.
      if (expired) { showDone(saved.topic); return; }
      startSpeaking(saved.endAt);
      return;
    }

    setState("draw");
  })();
})();
