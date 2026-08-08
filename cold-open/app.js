/*
 * Cold Open — app logic.
 * Plain script (no bundler) so index.html works opened directly from disk
 * or from any static host.
 */
(function () {
  "use strict";

  var PREP_MS = 15 * 60 * 1000;
  var SPEAK_MS = 60 * 1000;
  var NOTES_KEY = "coldopen:notes";

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

    function start() {
      endAt = Date.now() + durationMs;
      done = false;
      computeAndReport();
      intervalId = setInterval(computeAndReport, 250);
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
    alertLabel: document.getElementById("alert-label")
  };

  var currentState = "draw";
  var prepCountdown = null;
  var speakCountdown = null;

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

  function startPrep(topic) {
    els.prepCategory.textContent = topic.category;
    els.prepTopic.textContent = topic.text;
    els.prepStatus.textContent = "";
    els.prepStatus.classList.remove("is-urgent");
    els.notes.value = localStorage.getItem(NOTES_KEY) || "";
    setState("prep");

    if (prepCountdown) { prepCountdown.stop(); activeCountdowns = activeCountdowns.filter(function (c) { return c !== prepCountdown; }); }
    prepCountdown = createCountdown(PREP_MS, function (remaining) {
      els.prepNum.textContent = fmt(remaining);
      var dial = els.prepNum.closest(".dial");
      if (dial) dial.style.setProperty("--p", (remaining / PREP_MS) * 360 + "deg");
    }, function () {
      els.prepStatus.textContent = "Time's up — start whenever you're ready.";
      els.prepStatus.classList.add("is-urgent");
      var prepDial = els.prepNum.closest(".dial");
      if (prepDial) prepDial.classList.add("is-urgent");
      playChime("prepDone");
      vibrate([120, 60, 120]);
      sendNotification("Cold Open", "Prep time's up. Start speaking whenever you're ready.");
      flashTitle("⏰ Prep time's up!");
    });
    activeCountdowns.push(prepCountdown);
    prepCountdown.start();
  }

  function startSpeaking() {
    if (prepCountdown) prepCountdown.stop();
    var topic = lastTopic;
    els.speakTopic.textContent = topic.text;
    setState("speak");
    els.speakGlow.classList.add("is-tight");
    els.speakNum.classList.remove("is-urgent");

    if (speakCountdown) { speakCountdown.stop(); activeCountdowns = activeCountdowns.filter(function (c) { return c !== speakCountdown; }); }
    speakCountdown = createCountdown(SPEAK_MS, function (remaining) {
      els.speakNum.textContent = fmt(remaining);
      var dial = els.speakNum.closest(".dial");
      if (dial) {
        dial.style.setProperty("--p", (remaining / SPEAK_MS) * 360 + "deg");
        if (remaining <= 10000) dial.classList.add("is-urgent");
      }
      if (remaining <= 10000) els.speakNum.classList.add("is-urgent");
    }, function () {
      playChime("speakDone");
      vibrate([160, 80, 160, 80, 260]);
      sendNotification("Cold Open", "Time's up!");
      flashTitle("⏰ Time's up!");
      els.doneMessage.textContent = "Time's up on “" + topic.text + "”.";
      setState("done");
    });
    activeCountdowns.push(speakCountdown);
    speakCountdown.start();
  }

  function resetToDraw() {
    if (prepCountdown) prepCountdown.stop();
    if (speakCountdown) speakCountdown.stop();
    els.speakGlow.classList.remove("is-tight");
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
    startSpeaking();
  });
  els.skipBtn.addEventListener("click", function () {
    unlockAudio();
    startPrep(drawTopic());
  });

  els.notes.addEventListener("input", function () {
    localStorage.setItem(NOTES_KEY, els.notes.value);
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

  setState("draw");
})();
