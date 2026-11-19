/* ==========================================================================
   App — UI wiring, persistence, keyboard shortcuts, demo mode.
   화면 로직 / 界面逻辑
   ========================================================================== */
(function (global) {
  "use strict";

  var P = global.BS.Pattern;
  var I = global.BS.i18n;
  var AudioNs = global.BS.Audio;

  var SESSION_KEY = "vivebeat.session.v1";
  var LIBRARY_KEY = "vivebeat.library.v1";
  var MAX_SAVED = 20;

  var state = {
    pattern: null,
    playing: false,
    current: -1,
    muted: {},
    presetId: ""
  };

  var cells = [];
  var rows = [];
  var audio = new AudioNs.Engine();
  var toastTimer = null;
  var sessionTimer = null;

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function storeGet(key) {
    try {
      return global.localStorage.getItem(key);
    } catch (err) {
      return null;
    }
  }

  function storeSet(key, value) {
    try {
      global.localStorage.setItem(key, value);
      return true;
    } catch (err) {
      return false;
    }
  }

  /* --- Persistence ------------------------------------------------------- */

  function loadSession() {
    var raw = storeGet(SESSION_KEY);
    if (!raw) return null;
    try {
      return P.deserialize(JSON.parse(raw));
    } catch (err) {
      return null;
    }
  }

  function scheduleSessionSave() {
    if (sessionTimer) global.clearTimeout(sessionTimer);
    sessionTimer = global.setTimeout(function () {
      storeSet(SESSION_KEY, JSON.stringify(P.serialize(state.pattern)));
    }, 250);
  }

  function readLibrary() {
    var raw = storeGet(LIBRARY_KEY);
    if (!raw) return [];
    try {
      var list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch (err) {
      return [];
    }
  }

  function writeLibrary(list) {
    storeSet(LIBRARY_KEY, JSON.stringify(list));
  }

  /* --- Build UI ---------------------------------------------------------- */

  function buildTones() {
    var select = $("#toneSel");
    var labels = { pluck: "tonePluck", lead: "toneLead", bass: "toneBass" };
    P.TONES.forEach(function (tone) {
      var option = document.createElement("option");
      option.value = tone;
      option.textContent = I.t(labels[tone]);
      select.appendChild(option);
    });
  }

  function buildPresets() {
    var select = $("#presetSel");
    var empty = document.createElement("option");
    empty.value = "";
    empty.textContent = I.t("presetEmpty");
    select.appendChild(empty);
    P.PRESETS.forEach(function (preset) {
      var option = document.createElement("option");
      option.value = preset.id;
      option.textContent = I.t(preset.labelKey);
      select.appendChild(option);
    });
  }

  function buildRuler() {
    var ruler = $("#ruler");
    ruler.innerHTML = "";
    for (var s = 0; s < P.STEPS; s++) {
      var node = document.createElement("span");
      node.textContent = String(s + 1);
      if (s % 4 === 0) node.className = "beat";
      ruler.appendChild(node);
    }
  }

  function buildGrid() {
    var grid = $("#grid");
    grid.innerHTML = "";
    cells = [];
    rows = [];

    P.TRACKS.forEach(function (track, trackIndex) {
      var row = document.createElement("div");
      row.className = "row";
      row.style.setProperty("--c", track.color);
      row.dataset.track = track.id;

      var head = document.createElement("div");
      head.className = "row-head";

      var dot = document.createElement("span");
      dot.className = "row-dot";
      dot.setAttribute("aria-hidden", "true");

      var nameBtn = document.createElement("button");
      nameBtn.type = "button";
      nameBtn.className = "row-name";
      nameBtn.setAttribute(
        "aria-label",
        track.ko + " / " + track.zh + " · " + I.t("preview")
      );
      nameBtn.innerHTML =
        '<span class="ko">' + track.ko + "</span>" +
        '<span class="zh">' +
        track.zh +
        (track.noteName ? " · " + track.noteName : "") +
        "</span>";
      nameBtn.addEventListener("click", function () {
        audio.preview(track);
        nameBtn.classList.add("is-hit");
        global.setTimeout(function () {
          nameBtn.classList.remove("is-hit");
        }, 260);
      });

      var muteBtn = document.createElement("button");
      muteBtn.type = "button";
      muteBtn.className = "row-mute";
      muteBtn.setAttribute("aria-pressed", "false");
      muteBtn.setAttribute("aria-label", track.ko + " / " + track.zh + " · " + I.t("mute"));
      muteBtn.innerHTML =
        '<svg class="sound-icon" viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M4 9v6h4l5 4V5L8 9H4zm12.5-1.5a6 6 0 010 9M19 5a10 10 0 010 14" ' +
        'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
        '<svg class="muted-icon" viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/>' +
        '<path d="M16 9l5 5m0-5l-5 5" fill="none" stroke="currentColor" stroke-width="2" ' +
        'stroke-linecap="round"/></svg>';
      muteBtn.addEventListener("click", function () {
        toggleMute(track, muteBtn, row);
      });

      head.appendChild(dot);
      head.appendChild(nameBtn);
      head.appendChild(muteBtn);

      var cellsWrap = document.createElement("div");
      cellsWrap.className = "cells";
      var trackCells = [];

      for (var s = 0; s < P.STEPS; s++) {
        var cell = document.createElement("button");
        cell.type = "button";
        cell.className = "cell" + (s % 4 === 0 ? " beat" : "");
        cell.dataset.track = track.id;
        cell.dataset.step = String(s);
        cell.setAttribute("aria-pressed", "false");
        cell.setAttribute("aria-label", cellLabel(track, s, false));
        bindCell(cell, track, s, trackCells);
        cellsWrap.appendChild(cell);
        trackCells.push(cell);
      }

      row.appendChild(head);
      row.appendChild(cellsWrap);
      grid.appendChild(row);

      cells.push(trackCells);
      rows.push({ el: row, track: track });
    });
  }

  function bindCell(cell, track, step, trackCells) {
    cell.addEventListener("click", function () {
      var on = P.toggle(state.pattern, track.id, step);
      cell.classList.toggle("is-on", !!on);
      cell.setAttribute("aria-pressed", on ? "true" : "false");
      cell.setAttribute("aria-label", cellLabel(track, step, !!on));
      audio.preview(track);
      markCustom();
      scheduleSessionSave();
      // re-trigger the pop animation on the same element
      cell.classList.remove("is-hit");
      void cell.offsetWidth;
      cell.classList.add("is-hit");
    });
    cell.__trackCells = trackCells;
  }

  function cellLabel(track, step, on) {
    return (
      track.ko +
      " / " +
      track.zh +
      " · " +
      (step + 1) +
      " " +
      I.t(on ? "stepOn" : "stepOff")
    );
  }

  /* --- Rendering --------------------------------------------------------- */

  function renderPattern() {
    for (var t = 0; t < P.TRACKS.length; t++) {
      var track = P.TRACKS[t];
      var isMuted = !!state.muted[track.id];
      rows[t].el.classList.toggle("is-muted", isMuted);
      for (var s = 0; s < P.STEPS; s++) {
        var on = !!state.pattern.grid[track.id][s];
        var cell = cells[t][s];
        cell.classList.toggle("is-on", on);
        cell.setAttribute("aria-pressed", on ? "true" : "false");
        cell.setAttribute("aria-label", cellLabel(track, s, on));
      }
    }
  }

  function renderControls() {
    $("#bpmRange").value = String(state.pattern.bpm);
    $("#bpmOut").textContent = String(state.pattern.bpm);
    $("#swingRange").value = String(Math.round(state.pattern.swing * 100));
    $("#swingOut").textContent = Math.round(state.pattern.swing * 100) + "%";
    $("#toneSel").value = state.pattern.tone;
    $("#presetSel").value = state.presetId;
  }

  function setPlayhead(step) {
    if (state.current === step) return;
    if (state.current >= 0) {
      for (var i = 0; i < cells.length; i++) {
        cells[i][state.current].classList.remove("is-current");
      }
      var oldNum = $("#ruler").children[state.current];
      if (oldNum) oldNum.classList.remove("is-current");
    }
    state.current = step;
    if (step >= 0) {
      for (var j = 0; j < cells.length; j++) {
        cells[j][step].classList.add("is-current");
      }
      var num = $("#ruler").children[step];
      if (num) num.classList.add("is-current");
    }
  }

  /* --- Playback ---------------------------------------------------------- */

  function togglePlay() {
    if (state.playing) {
      stopPlayback();
      return;
    }
    audio.setBpm(state.pattern.bpm);
    audio.setSwing(state.pattern.swing);
    audio.setTone(state.pattern.tone);
    audio.start(function () {
      return state.pattern;
    }).then(function () {
      state.playing = true;
      var btn = $("#playBtn");
      btn.classList.add("is-playing");
      btn.setAttribute("aria-pressed", "true");
      $(".play-label", btn).innerHTML = I.html("stop");
    }).catch(function () {
      toast(I.t("toastAudioError"));
    });
  }

  function stopPlayback() {
    audio.stop();
    state.playing = false;
    var btn = $("#playBtn");
    btn.classList.remove("is-playing");
    btn.setAttribute("aria-pressed", "false");
    $(".play-label", btn).innerHTML = I.html("play");
    setPlayhead(-1);
  }

  function loop() {
    if (state.playing) {
      var step = audio.pollStep();
      if (step !== null) setPlayhead(step);
    }
    global.requestAnimationFrame(loop);
  }

  /* --- Actions ----------------------------------------------------------- */

  function markCustom() {
    state.presetId = "";
    $("#presetSel").value = "";
  }

  function applyPreset(id, options) {
    var opts = options || {};
    if (!id) {
      P.clear(state.pattern);
      state.presetId = "";
    } else {
      var next = P.fromPreset(id);
      state.pattern = next;
      state.presetId = id;
      audio.setBpm(next.bpm);
      audio.setSwing(next.swing);
      audio.setTone(next.tone);
      if (state.playing) {
        audio.setBpm(next.bpm);
      }
    }
    renderPattern();
    renderControls();
    scheduleSessionSave();
    if (!opts.silent) {
      if (id) {
        var preset = P.getPreset(id);
        toast(I.t("toastPreset", { name: I.t(preset.labelKey) }));
      } else {
        toast(I.t("toastCleared"));
      }
    }
  }

  function randomize() {
    P.randomize(state.pattern);
    state.presetId = "";
    renderPattern();
    renderControls();
    scheduleSessionSave();
    toast(I.t("toastRandomized"));
  }

  function clearAll() {
    if (P.countOn(state.pattern) > 0 && !global.confirm(I.t("confirmClear"))) {
      return;
    }
    P.clear(state.pattern);
    state.presetId = "";
    renderPattern();
    renderControls();
    scheduleSessionSave();
    toast(I.t("toastCleared"));
  }

  function toggleMute(track, button, row) {
    var next = !state.muted[track.id];
    state.muted[track.id] = next;
    row.classList.toggle("is-muted", next);
    button.setAttribute("aria-pressed", next ? "true" : "false");
    button.setAttribute("aria-label", track.ko + " / " + track.zh + " · " + I.t(next ? "unmute" : "mute"));
    audio.setMuted(track.id, next);
  }

  /* --- Library ----------------------------------------------------------- */

  function renderLibrary() {
    var list = readLibrary();
    var ul = $("#patList");
    var empty = $("#patEmpty");
    ul.innerHTML = "";
    empty.hidden = list.length > 0;

    list.forEach(function (item) {
      var li = document.createElement("li");
      li.className = "pat-item";

      var meta = document.createElement("div");
      meta.className = "pat-meta";
      var name = document.createElement("strong");
      name.textContent = item.name;
      var when = document.createElement("small");
      when.textContent = new Date(item.at).toLocaleString("ko-KR", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
      meta.appendChild(name);
      meta.appendChild(when);

      var loadBtn = document.createElement("button");
      loadBtn.type = "button";
      loadBtn.className = "btn ghost";
      loadBtn.textContent = I.t("load");
      loadBtn.addEventListener("click", function () {
        loadSaved(item.id);
      });

      var delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn danger";
      delBtn.textContent = I.t("delete");
      delBtn.addEventListener("click", function () {
        deleteSaved(item.id);
      });

      li.appendChild(meta);
      li.appendChild(loadBtn);
      li.appendChild(delBtn);
      ul.appendChild(li);
    });
  }

  function saveCurrent(name) {
    var trimmed = String(name || "").trim();
    if (!trimmed) {
      toast(I.t("toastNameRequired"));
      return false;
    }
    var list = readLibrary();
    if (list.length >= MAX_SAVED) {
      toast(I.t("toastLimit"));
      return false;
    }
    list.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: trimmed.slice(0, 24),
      at: Date.now(),
      data: P.serialize(state.pattern)
    });
    writeLibrary(list);
    renderLibrary();
    toast(I.t("toastSaved", { name: trimmed }));
    return true;
  }

  function loadSaved(id) {
    var item = readLibrary().filter(function (entry) {
      return entry.id === id;
    })[0];
    if (!item) return;
    try {
      state.pattern = P.deserialize(item.data);
    } catch (err) {
      toast(I.t("toastImportError"));
      return;
    }
    state.presetId = "";
    stopPlayback();
    renderPattern();
    renderControls();
    scheduleSessionSave();
    toast(I.t("toastLoaded", { name: item.name }));
  }

  function deleteSaved(id) {
    var list = readLibrary();
    var item = list.filter(function (entry) {
      return entry.id === id;
    })[0];
    if (!item) return;
    if (!global.confirm(I.t("confirmDelete"))) return;
    writeLibrary(
      list.filter(function (entry) {
        return entry.id !== id;
      })
    );
    renderLibrary();
    toast(I.t("toastDeleted", { name: item.name }));
  }

  function exportJson() {
    var data = P.serialize(state.pattern);
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    var stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
    link.href = url;
    link.download = "beat-pattern-" + stamp + ".json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    global.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
    toast(I.t("toastExported"));
  }

  function importJson(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(String(reader.result));
        state.pattern = P.deserialize(data);
        state.presetId = "";
        stopPlayback();
        renderPattern();
        renderControls();
        scheduleSessionSave();
        toast(I.t("toastImported"));
      } catch (err) {
        toast(I.t("toastImportError"));
      }
    };
    reader.onerror = function () {
      toast(I.t("toastImportError"));
    };
    reader.readAsText(file);
  }

  /* --- Toast ------------------------------------------------------------- */

  function toast(message) {
    var el = $("#toast");
    el.textContent = message;
    el.classList.add("show");
    if (toastTimer) global.clearTimeout(toastTimer);
    toastTimer = global.setTimeout(function () {
      el.classList.remove("show");
    }, 2800);
  }

  /* --- Events ------------------------------------------------------------ */

  function bind() {
    $("#playBtn").addEventListener("click", togglePlay);

    $("#bpmRange").addEventListener("input", function (e) {
      var bpm = Number(e.target.value);
      state.pattern.bpm = bpm;
      $("#bpmOut").textContent = String(bpm);
      audio.setBpm(bpm);
      markCustom();
      scheduleSessionSave();
    });

    $("#swingRange").addEventListener("input", function (e) {
      var swing = Number(e.target.value) / 100;
      state.pattern.swing = swing;
      $("#swingOut").textContent = Math.round(swing * 100) + "%";
      audio.setSwing(swing);
      markCustom();
      scheduleSessionSave();
    });

    $("#volRange").addEventListener("input", function (e) {
      var volume = Number(e.target.value) / 100;
      $("#volOut").textContent = Math.round(volume * 100) + "%";
      audio.setVolume(volume);
    });

    $("#toneSel").addEventListener("change", function (e) {
      state.pattern.tone = e.target.value;
      audio.setTone(state.pattern.tone);
      markCustom();
      scheduleSessionSave();
    });

    $("#presetSel").addEventListener("change", function (e) {
      applyPreset(e.target.value);
    });

    $("#randomBtn").addEventListener("click", randomize);
    $("#clearBtn").addEventListener("click", clearAll);

    $("#saveForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var input = $("#patName");
      if (saveCurrent(input.value)) input.value = "";
    });

    $("#exportBtn").addEventListener("click", exportJson);
    $("#importBtn").addEventListener("click", function () {
      $("#importFile").click();
    });
    $("#importFile").addEventListener("change", function (e) {
      importJson(e.target.files && e.target.files[0]);
      e.target.value = "";
    });

    document.addEventListener("keydown", function (e) {
      var tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "select" || tag === "textarea" || e.target.isContentEditable) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "r" || e.key === "R") {
        randomize();
      } else if (e.key === "c" || e.key === "C") {
        clearAll();
      }
    });
  }

  /* --- Boot -------------------------------------------------------------- */

  function init() {
    I.apply(document);
    buildTones();
    buildPresets();
    buildRuler();
    buildGrid();
    bind();

    var saved = loadSession();
    state.pattern = saved || P.fromPreset("kpop");
    state.presetId = saved ? "" : "kpop";

    renderPattern();
    renderControls();
    renderLibrary();
    setPlayhead(-1);
    global.requestAnimationFrame(loop);

    var params = new URLSearchParams(global.location.search);
    var demo = params.get("demo");
    if (demo) {
      applyPreset(P.getPreset(demo) ? demo : "kpop", { silent: true });
      setPlayhead(6);
      document.body.classList.add("is-demo");
    }

    global.BS.app = {
      state: state,
      audio: audio,
      togglePlay: togglePlay,
      stopPlayback: stopPlayback,
      applyPreset: applyPreset,
      renderPattern: renderPattern,
      renderControls: renderControls,
      setPlayhead: setPlayhead,
      cellAt: function (trackIndex, step) {
        return cells[trackIndex][step];
      },
      toggleMute: toggleMute,
      saveCurrent: saveCurrent,
      readLibrary: readLibrary,
      writeLibrary: writeLibrary,
      clearLibrary: function () {
        writeLibrary([]);
        renderLibrary();
      }
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
