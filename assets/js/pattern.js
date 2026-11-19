/* ==========================================================================
   Pattern model — tracks, presets, validation, randomization.
   패턴 데이터 모델 / 图案数据模型 (framework free, easy to test)
   ========================================================================== */
(function (global) {
  "use strict";

  var STEPS = 16;
  var VERSION = 1;
  var TONES = ["pluck", "lead", "bass"];

  var TRACKS = [
    { id: "kick", kind: "drum", ko: "킥", zh: "底鼓", color: "#ff4d6d" },
    { id: "snare", kind: "drum", ko: "스네어", zh: "军鼓", color: "#ff922b" },
    { id: "hat", kind: "drum", ko: "하이햇", zh: "踩镲", color: "#fcc419" },
    { id: "clap", kind: "drum", ko: "클랩", zh: "拍手", color: "#b197fc" },
    { id: "c4", kind: "note", midi: 60, noteName: "C4", ko: "도4", zh: "do4", color: "#74c0fc" },
    { id: "d4", kind: "note", midi: 62, noteName: "D4", ko: "레4", zh: "re4", color: "#4dabf7" },
    { id: "e4", kind: "note", midi: 64, noteName: "E4", ko: "미4", zh: "mi4", color: "#38d9a9" },
    { id: "g4", kind: "note", midi: 67, noteName: "G4", ko: "솔4", zh: "sol4", color: "#63e6be" },
    { id: "a4", kind: "note", midi: 69, noteName: "A4", ko: "라4", zh: "la4", color: "#a9e34b" },
    { id: "c5", kind: "note", midi: 72, noteName: "C5", ko: "도5", zh: "do5", color: "#ffd43b" }
  ];

  /** Strip the spaces used to keep 4-step groups readable. */
  function row(text) {
    return text.replace(/\s+/g, "");
  }

  var PRESETS = [
    {
      id: "boomBap",
      labelKey: "presetBoomBap",
      bpm: 88,
      swing: 0.22,
      tone: "bass",
      rows: {
        kick: "x..x .... x... ..x.",
        snare: ".... x... .... x...",
        hat: "x.x. x.x. x.x. x.x.",
        clap: ".... .... .... ....",
        c4: "x... ..x. ...x ....",
        d4: ".... .... .... ....",
        e4: ".... ..x. .... ....",
        g4: ".... .... x... ....",
        a4: ".... .... .... ....",
        c5: ".... .... .... ...."
      }
    },
    {
      id: "house",
      labelKey: "presetHouse",
      bpm: 124,
      swing: 0.04,
      tone: "pluck",
      rows: {
        kick: "x... x... x... x...",
        snare: ".... .... .... ....",
        hat: "..x. ..x. ..x. ..x.",
        clap: ".... x... .... x...",
        c4: "x... .... .... ....",
        d4: ".... .... .... ....",
        e4: ".... .... .... ....",
        g4: ".... .... x... ....",
        a4: "..x. .... ..x. ....",
        c5: ".... .... .... ..x."
      }
    },
    {
      id: "trap",
      labelKey: "presetTrap",
      bpm: 140,
      swing: 0.02,
      tone: "bass",
      rows: {
        kick: "x... .x.. ..x. ....",
        snare: ".... .... x... ....",
        hat: "x.xx x.x. x.xx x.x.",
        clap: ".... .... x... ....",
        c4: "x... .... .... ....",
        d4: ".... .... .... ....",
        e4: ".... .... .... ....",
        g4: ".... .... .... .x..",
        a4: ".... .... ..x. ....",
        c5: ".... .... .... ...."
      }
    },
    {
      id: "kpop",
      labelKey: "presetKpop",
      bpm: 108,
      swing: 0.1,
      tone: "lead",
      rows: {
        kick: "x..x ..x. ..x. x...",
        snare: ".... x... .... x...",
        hat: "x.x. x.x. x.x. x.x.",
        clap: ".... x... .... x...",
        c4: "..x. .... .... ....",
        d4: ".... .... .... ....",
        e4: ".... ..x. .... ..x.",
        g4: "x... .... .... ....",
        a4: ".... .... .... ....",
        c5: ".... .... ..x. ...."
      }
    }
  ];

  function makeError(code, message) {
    var err = new Error(message || code);
    err.code = code;
    return err;
  }

  function emptyGrid() {
    var grid = {};
    for (var i = 0; i < TRACKS.length; i++) {
      grid[TRACKS[i].id] = new Array(STEPS).fill(0);
    }
    return grid;
  }

  function create(overrides) {
    var opts = overrides || {};
    var pattern = {
      v: VERSION,
      bpm: clampNumber(opts.bpm, 60, 180, 96),
      swing: clampNumber(opts.swing, 0, 0.6, 0.12),
      tone: TONES.indexOf(opts.tone) >= 0 ? opts.tone : "pluck",
      grid: emptyGrid()
    };
    if (opts.grid) {
      for (var i = 0; i < TRACKS.length; i++) {
        var id = TRACKS[i].id;
        if (!Array.isArray(opts.grid[id])) continue;
        for (var s = 0; s < STEPS; s++) {
          pattern.grid[id][s] = opts.grid[id][s] ? 1 : 0;
        }
      }
    }
    return pattern;
  }

  function clampNumber(value, min, max, fallback) {
    var n = Number(value);
    if (!isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function clone(pattern) {
    return {
      v: VERSION,
      bpm: pattern.bpm,
      swing: pattern.swing,
      tone: pattern.tone,
      grid: (function () {
        var g = {};
        for (var i = 0; i < TRACKS.length; i++) {
          g[TRACKS[i].id] = pattern.grid[TRACKS[i].id].slice();
        }
        return g;
      })()
    };
  }

  function toggle(pattern, trackId, step) {
    if (!pattern.grid[trackId]) return false;
    if (step < 0 || step >= STEPS) return false;
    pattern.grid[trackId][step] = pattern.grid[trackId][step] ? 0 : 1;
    return !!pattern.grid[trackId][step];
  }

  function clear(pattern) {
    pattern.grid = emptyGrid();
    return pattern;
  }

  function applyRows(pattern, rows) {
    for (var i = 0; i < TRACKS.length; i++) {
      var id = TRACKS[i].id;
      var text = row(rows[id] || "");
      for (var s = 0; s < STEPS; s++) {
        pattern.grid[id][s] = text.charAt(s) === "x" ? 1 : 0;
      }
    }
    return pattern;
  }

  function fromPreset(presetId) {
    var preset = getPreset(presetId);
    if (!preset) throw makeError("UNKNOWN_PRESET", "Unknown preset: " + presetId);
    var pattern = create({ bpm: preset.bpm, swing: preset.swing, tone: preset.tone });
    applyRows(pattern, preset.rows);
    return pattern;
  }

  function getPreset(presetId) {
    for (var i = 0; i < PRESETS.length; i++) {
      if (PRESETS[i].id === presetId) return PRESETS[i];
    }
    return null;
  }

  /** Musically weighted random pattern. `rng` is injectable for tests. */
  function randomize(pattern, rng) {
    var rand = typeof rng === "function" ? rng : Math.random;
    var grid = emptyGrid();
    var s;

    for (s = 0; s < STEPS; s++) {
      var onBeat = s % 4 === 0;
      grid.kick[s] = rand() < (onBeat ? 0.62 : 0.1) ? 1 : 0;
      grid.snare[s] = rand() < (s === 4 || s === 12 ? 0.85 : 0.03) ? 1 : 0;
      grid.clap[s] = rand() < (s === 4 || s === 12 ? 0.3 : 0.02) ? 1 : 0;
      grid.hat[s] = rand() < (s % 2 === 0 ? 0.8 : 0.28) ? 1 : 0;
    }
    if (grid.kick[0] === 0) grid.kick[0] = 1;

    var noteTracks = TRACKS.filter(function (t) {
      return t.kind === "note";
    });
    var onsets = 0;
    for (s = 0; s < STEPS; s++) {
      if (rand() < 0.22) {
        var track = noteTracks[Math.floor(rand() * noteTracks.length)];
        if (track) {
          grid[track.id][s] = 1;
          onsets++;
        }
      }
    }
    var guard = 0;
    while (onsets < 2 && guard++ < 200) {
      var t = noteTracks[Math.floor(rand() * noteTracks.length)];
      var step = Math.floor(rand() * STEPS);
      if (!grid[t.id][step]) {
        grid[t.id][step] = 1;
        onsets++;
      }
    }

    pattern.grid = grid;
    if (rand() < 0.35) {
      pattern.tone = TONES[Math.floor(rand() * TONES.length)];
    }
    return pattern;
  }

  function serialize(pattern) {
    var data = {
      v: VERSION,
      bpm: pattern.bpm,
      swing: pattern.swing,
      tone: pattern.tone,
      grid: {}
    };
    for (var i = 0; i < TRACKS.length; i++) {
      var id = TRACKS[i].id;
      data.grid[id] = pattern.grid[id].map(function (v) {
        return v ? 1 : 0;
      });
    }
    return data;
  }

  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  /** Strict validation; throws an Error with `code` on bad input. */
  function deserialize(data) {
    if (!isPlainObject(data)) throw makeError("NOT_OBJECT", "Pattern must be an object");
    if (Number(data.v) !== VERSION) throw makeError("BAD_VERSION", "Unsupported pattern version");
    if (!isPlainObject(data.grid)) throw makeError("NO_GRID", "Pattern grid is missing");

    var bpm = Number(data.bpm);
    if (!isFinite(bpm) || bpm < 40 || bpm > 220) {
      throw makeError("BAD_BPM", "BPM out of range");
    }
    var swing = Number(data.swing);
    if (!isFinite(swing) || swing < 0 || swing > 0.75) {
      throw makeError("BAD_SWING", "Swing out of range");
    }
    if (TONES.indexOf(data.tone) < 0) throw makeError("BAD_TONE", "Unknown tone");

    var grid = {};
    for (var i = 0; i < TRACKS.length; i++) {
      var id = TRACKS[i].id;
      var cells = data.grid[id];
      if (!Array.isArray(cells)) throw makeError("MISSING_TRACK", "Missing track: " + id);
      if (cells.length !== STEPS) throw makeError("BAD_LENGTH", "Track must have 16 steps: " + id);
      grid[id] = cells.map(function (cell) {
        if (cell === 1 || cell === 0 || cell === true || cell === false) {
          return cell ? 1 : 0;
        }
        throw makeError("BAD_CELL", "Step values must be 0 or 1");
      });
    }

    return {
      v: VERSION,
      bpm: Math.round(bpm),
      swing: swing,
      tone: data.tone,
      grid: grid
    };
  }

  function countOn(pattern) {
    var total = 0;
    for (var i = 0; i < TRACKS.length; i++) {
      var cells = pattern.grid[TRACKS[i].id];
      for (var s = 0; s < STEPS; s++) total += cells[s] ? 1 : 0;
    }
    return total;
  }

  global.BS = global.BS || {};
  global.BS.Pattern = {
    STEPS: STEPS,
    VERSION: VERSION,
    TONES: TONES,
    TRACKS: TRACKS,
    PRESETS: PRESETS,
    PRESET_IDS: PRESETS.map(function (p) {
      return p.id;
    }),
    create: create,
    clone: clone,
    toggle: toggle,
    clear: clear,
    applyRows: applyRows,
    fromPreset: fromPreset,
    getPreset: getPreset,
    randomize: randomize,
    serialize: serialize,
    deserialize: deserialize,
    countOn: countOn,
    row: row
  };
})(window);
