/*
 * Cold Open — capture layer.
 *
 * Runs three things at once while the speaker talks:
 *   1. MediaRecorder     -> an audio blob they can play back
 *   2. Web Audio RMS     -> silence/pause detection (works in every browser)
 *   3. SpeechRecognition -> a live transcript (Chrome/Edge/Safari only)
 *
 * Only (1) and (2) are load-bearing. Transcription is a bonus: browsers
 * that lack it — and browser transcribers routinely swallow the very
 * "um"s we care about — fall back to the speaker typing or pasting the
 * transcript in the review screen, which recounts everything from text.
 */
window.ColdOpenRecorder = (function () {
  "use strict";

  // A pause worth flagging. Natural beats between sentences run
  // ~0.3-0.8s; 1.5s is where an audience starts to feel the gap.
  var PAUSE_MS = 1500;
  var SAMPLE_MS = 50;
  var FLOOR_RMS = 0.015;

  function pickMimeType() {
    if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return "";
    var candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
    for (var i = 0; i < candidates.length; i++) {
      if (MediaRecorder.isTypeSupported(candidates[i])) return candidates[i];
    }
    return "";
  }

  function create() {
    var stream = null;
    var mediaRecorder = null;
    var chunks = [];
    var audioCtx = null;
    var analyser = null;
    var sampleTimer = null;
    var recognition = null;

    var startedAt = 0;
    var peakRms = 0;
    var heardSpeechYet = false;
    var silenceRunStart = null;
    var pauses = [];          // [{ atMs, durationMs }]
    var finalTranscript = "";
    var interimTranscript = "";
    var recognitionSupported = false;
    var onTranscriptUpdate = null;

    function isSilent(rms) {
      return rms < Math.max(FLOOR_RMS, peakRms * 0.08);
    }

    function sampleLevel() {
      if (!analyser) return;
      var buf = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(buf);
      var sum = 0;
      for (var i = 0; i < buf.length; i++) {
        var v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      var rms = Math.sqrt(sum / buf.length);
      if (rms > peakRms) peakRms = rms;

      var now = Date.now();
      if (isSilent(rms)) {
        if (heardSpeechYet && silenceRunStart === null) silenceRunStart = now;
      } else {
        heardSpeechYet = true;
        if (silenceRunStart !== null) {
          var dur = now - silenceRunStart;
          if (dur >= PAUSE_MS) pauses.push({ atMs: silenceRunStart - startedAt, durationMs: dur });
          silenceRunStart = null;
        }
      }
    }

    function startRecognition() {
      var Impl = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Impl) return;
      recognitionSupported = true;
      try {
        recognition = new Impl();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = document.documentElement.lang || "en-US";
        recognition.onresult = function (event) {
          var interim = "";
          for (var i = event.resultIndex; i < event.results.length; i++) {
            var text = event.results[i][0].transcript;
            if (event.results[i].isFinal) finalTranscript += text + " ";
            else interim += text;
          }
          interimTranscript = interim;
          if (onTranscriptUpdate) onTranscriptUpdate(getTranscript());
        };
        recognition.onerror = function () { /* keep recording audio regardless */ };
        recognition.onend = function () {
          // Chrome ends the session on its own schedule; restart while we're still live.
          if (mediaRecorder && mediaRecorder.state === "recording") {
            try { recognition.start(); } catch (e) { /* already restarting */ }
          }
        };
        recognition.start();
      } catch (e) {
        recognition = null;
      }
    }

    function getTranscript() {
      return (finalTranscript + " " + interimTranscript).replace(/\s+/g, " ").trim();
    }

    // Resolves { ok: true } once capture is live, or { ok:false, reason }
    // if the mic is unavailable — the speech itself must never be blocked
    // by a recording failure, so callers just carry on.
    function start(handlers) {
      onTranscriptUpdate = handlers && handlers.onTranscriptUpdate;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return Promise.resolve({ ok: false, reason: "unsupported" });
      }
      return navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true }
      }).then(function (s) {
        stream = s;
        startedAt = Date.now();
        chunks = [];
        pauses = [];
        peakRms = 0;
        heardSpeechYet = false;
        silenceRunStart = null;
        finalTranscript = "";
        interimTranscript = "";

        var mimeType = pickMimeType();
        try {
          mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType: mimeType }) : new MediaRecorder(stream);
        } catch (e) {
          mediaRecorder = new MediaRecorder(stream);
        }
        mediaRecorder.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
        mediaRecorder.start();

        var Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) {
          audioCtx = new Ctx();
          analyser = audioCtx.createAnalyser();
          analyser.fftSize = 2048;
          audioCtx.createMediaStreamSource(stream).connect(analyser);
          sampleTimer = setInterval(sampleLevel, SAMPLE_MS);
        }

        startRecognition();
        return { ok: true };
      }).catch(function (err) {
        var reason = (err && (err.name === "NotAllowedError" || err.name === "SecurityError")) ? "denied" : "unavailable";
        return { ok: false, reason: reason };
      });
    }

    // Resolves the captured result; safe to call even if start() failed.
    function stop() {
      return new Promise(function (resolve) {
        if (sampleTimer) { clearInterval(sampleTimer); sampleTimer = null; }

        // Close out a pause still in progress when time ran out.
        if (silenceRunStart !== null) {
          var dur = Date.now() - silenceRunStart;
          if (dur >= PAUSE_MS) pauses.push({ atMs: silenceRunStart - startedAt, durationMs: dur });
          silenceRunStart = null;
        }

        if (recognition) {
          try { recognition.onend = null; recognition.stop(); } catch (e) { /* already stopped */ }
        }

        var durationMs = startedAt ? Date.now() - startedAt : 0;

        function finish(blob) {
          if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
          if (audioCtx && audioCtx.state !== "closed") audioCtx.close().catch(function () {});
          resolve({
            audioBlob: blob,
            durationMs: durationMs,
            pauses: pauses.slice(),
            transcript: getTranscript(),
            recognitionSupported: recognitionSupported
          });
        }

        if (mediaRecorder && mediaRecorder.state !== "inactive") {
          mediaRecorder.onstop = function () {
            finish(chunks.length ? new Blob(chunks, { type: chunks[0].type || "audio/webm" }) : null);
          };
          try { mediaRecorder.stop(); } catch (e) { finish(null); }
        } else {
          finish(null);
        }
      });
    }

    return { start: start, stop: stop };
  }

  return { create: create, PAUSE_MS: PAUSE_MS };
})();
