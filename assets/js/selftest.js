/* ==========================================================================
   Self-test — runs only with ?selftest=1.
   브라우저에서 자동 검증합니다. / 在浏览器中自动验证。
   ========================================================================== */
(function (global) {
  "use strict";

  if (!/[?&]selftest(=|&|$)/.test(global.location.search)) return;

  var P = global.BS.Pattern;
  var I = global.BS.i18n;
  var A = global.BS.Audio;
  var results = [];

  function assert(condition, message) {
    if (!condition) throw new Error(message || "assertion failed");
  }

  function test(name, fn) {
    try {
      fn();
      results.push({ name: name, ok: true });
    } catch (err) {
      results.push({ name: name, ok: false, error: err.message });
    }
  }

  function testAsync(name, fn) {
    return Promise.resolve()
      .then(fn)
      .then(function () {
        results.push({ name: name, ok: true });
      })
      .catch(function (err) {
        results.push({ name: name, ok: false, error: err.message });
      });
  }

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function bufferStats(buffer) {
    var data = buffer.getChannelData(0);
    var peak = 0;
    var sum = 0;
    var finite = true;
    for (var i = 0; i < data.length; i++) {
      var v = data[i];
      if (!isFinite(v)) finite = false;
      var abs = Math.abs(v);
      if (abs > peak) peak = abs;
      sum += v * v;
    }
    return { peak: peak, rms: Math.sqrt(sum / data.length), finite: finite };
  }

  function deepEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function expectThrow(fn, code) {
    try {
      fn();
    } catch (err) {
      if (code && err.code !== code) {
        throw new Error("expected code " + code + " but got " + err.code);
      }
      return true;
    }
    throw new Error("expected an error but none was thrown");
  }

  function trackById(id) {
    return P.TRACKS.filter(function (t) {
      return t.id === id;
    })[0];
  }

  function runSync() {
    test("i18n: 모든 문구가 한국어와 중국어를 함께 가진다 / 所有文案均为中韩双语", function () {
      var keys = Object.keys(I.dict);
      assert(keys.length >= 40, "dictionary too small: " + keys.length);
      keys.forEach(function (key) {
        var entry = I.dict[key];
        assert(entry.ko && entry.ko.trim(), "missing ko: " + key);
        assert(entry.zh && entry.zh.trim(), "missing zh: " + key);
        assert(/[가-힣]/.test(entry.ko), "no Hangul in ko: " + key);
        assert(/[\u4e00-\u9fff]/.test(entry.zh), "no Han in zh: " + key);
      });
    });

    test("i18n: 화면의 모든 data-i18n 요소가 적용되었다 / 所有 UI 文本均已应用", function () {
      var nodes = document.querySelectorAll("[data-i18n]");
      assert(nodes.length >= 20, "expected many i18n nodes, got " + nodes.length);
      for (var i = 0; i < nodes.length; i++) {
        var text = nodes[i].textContent || "";
        assert(text.indexOf("/") >= 0, "not bilingual: " + nodes[i].getAttribute("data-i18n"));
        assert(/[가-힣]/.test(text), "missing Korean: " + nodes[i].getAttribute("data-i18n"));
        assert(/[\u4e00-\u9fff]/.test(text), "missing Chinese: " + nodes[i].getAttribute("data-i18n"));
      }
    });

    test("presets: 4개 프리셋이 모두 16스텝 규격을 지킨다 / 4 个预设均符合 16 步规范", function () {
      assert(P.PRESETS.length === 4, "expected 4 presets");
      P.PRESETS.forEach(function (preset) {
        assert(I.has(preset.labelKey), "missing label: " + preset.labelKey);
        assert(preset.bpm >= 60 && preset.bpm <= 180, "bad bpm: " + preset.id);
        P.TRACKS.forEach(function (track) {
          var rowText = P.row(preset.rows[track.id] || "");
          assert(rowText.length === 16, "preset " + preset.id + " / " + track.id + " length " + rowText.length);
          assert(/^[x.]{16}$/.test(rowText), "invalid characters in " + preset.id + " / " + track.id);
        });
      });
    });

    test("pattern: 토글 · 초기화가 정확히 동작한다 / 开关节拍与清空功能正确", function () {
      var pattern = P.create({ bpm: 100 });
      assert(P.countOn(pattern) === 0, "new pattern should be empty");
      assert(P.toggle(pattern, "kick", 0) === true, "toggle on failed");
      assert(pattern.grid.kick[0] === 1, "cell not set");
      assert(P.toggle(pattern, "kick", 0) === false, "toggle off failed");
      assert(pattern.grid.kick[0] === 0, "cell not cleared");
      P.toggle(pattern, "snare", 4);
      P.clear(pattern);
      assert(P.countOn(pattern) === 0, "clear failed");
    });

    test("pattern: 저장 후 다시 읽어도 동일하다 / 序列化往返一致", function () {
      var pattern = P.fromPreset("house");
      var data = P.serialize(pattern);
      var restored = P.deserialize(data);
      assert(deepEqual(P.serialize(restored), data), "round trip mismatch");
      assert(restored.bpm === pattern.bpm && restored.tone === pattern.tone, "meta mismatch");
    });

    test("pattern: 잘못된 데이터를 거부한다 / 拒绝非法数据", function () {
      expectThrow(function () {
        P.deserialize(null);
      }, "NOT_OBJECT");
      expectThrow(function () {
        P.deserialize({});
      }, "BAD_VERSION");
      expectThrow(function () {
        var data = P.serialize(P.create());
        data.grid.kick = data.grid.kick.slice(0, 15);
        P.deserialize(data);
      }, "BAD_LENGTH");
      expectThrow(function () {
        var data = P.serialize(P.create());
        data.grid.kick[0] = 7;
        P.deserialize(data);
      }, "BAD_CELL");
      expectThrow(function () {
        var data = P.serialize(P.create());
        data.bpm = 900;
        P.deserialize(data);
      }, "BAD_BPM");
      expectThrow(function () {
        var data = P.serialize(P.create());
        delete data.grid.clap;
        P.deserialize(data);
      }, "MISSING_TRACK");
    });

    test("pattern: 랜덤 비트가 음악적 최소 조건을 만족한다 / 随机节拍满足基本音乐条件", function () {
      var rng = mulberry32(20261119);
      for (var i = 0; i < 25; i++) {
        var pattern = P.create({ bpm: 120, swing: 0.1 });
        P.randomize(pattern, rng);
        assert(pattern.grid.kick.indexOf(1) >= 0, "kick must exist");
        assert(pattern.bpm === 120, "bpm must not change");
        var notes = 0;
        P.TRACKS.forEach(function (track) {
          var cells = pattern.grid[track.id];
          assert(cells.length === 16, "bad length");
          cells.forEach(function (v) {
            assert(v === 0 || v === 1, "cell must be 0/1");
          });
          if (track.kind === "note") notes += cells.reduce(function (a, b) { return a + b; }, 0);
        });
        assert(notes >= 2, "at least two notes expected");
      }
    });

    test("timing: BPM·스윙 계산이 맞다 / 速度与摇摆计算正确", function () {
      var dur = A.stepDuration(120);
      assert(Math.abs(dur - 0.125) < 1e-9, "step duration wrong: " + dur);
      assert(Math.abs(A.stepDuration(60) - 0.25) < 1e-9, "60bpm wrong");
      assert(A.swingOffset(0, dur, 0.3) === 0, "downbeat must not swing");
      assert(Math.abs(A.swingOffset(1, dur, 0.3) - dur * 0.3 * 0.5) < 1e-9, "swing offset wrong");
    });

    test("dom: 10트랙 × 16스텝 그리드가 그려졌다 / 已绘制 10 轨 × 16 步网格", function () {
      var gridRows = document.querySelectorAll("#grid .row");
      assert(gridRows.length === P.TRACKS.length, "row count " + gridRows.length);
      var totalCells = 0;
      for (var t = 0; t < P.TRACKS.length; t++) {
        var row = gridRows[t];
        var rowCells = row.querySelectorAll(".cell");
        assert(rowCells.length === 16, "cells in row " + t + ": " + rowCells.length);
        totalCells += rowCells.length;
        for (var s = 0; s < rowCells.length; s++) {
          var label = rowCells[s].getAttribute("aria-label") || "";
          assert(label.indexOf("/") >= 0, "cell label not bilingual");
          assert(/[가-힣]/.test(label), "cell label missing Korean");
          assert(/[\u4e00-\u9fff]/.test(label), "cell label missing Chinese");
        }
      }
      assert(totalCells === 160, "expected 160 cells, got " + totalCells);
    });

    test("ui: 셀 클릭이 모델과 화면을 함께 갱신한다 / 点击格子同时更新模型与界面", function () {
      var app = global.BS.app;
      assert(app, "app not initialised");
      app.applyPreset("kpop", { silent: true });
      var cell = app.cellAt(0, 0);
      var before = app.state.pattern.grid.kick[0];
      cell.click();
      var after = app.state.pattern.grid.kick[0];
      assert(after !== before, "model not toggled");
      assert(cell.getAttribute("aria-pressed") === String(!!after), "aria-pressed not synced");
      cell.click();
      assert(app.state.pattern.grid.kick[0] === before, "second click did not restore");
    });

    test("ui: 음소거 버튼이 행과 엔진에 반영된다 / 静音按钮同步到行与引擎", function () {
      var app = global.BS.app;
      var row = document.querySelector('#grid .row[data-track="snare"]');
      var btn = row.querySelector(".row-mute");
      btn.click();
      assert(row.classList.contains("is-muted"), "row not muted");
      assert(app.audio.muted.snare === true, "engine not muted");
      btn.click();
      assert(!row.classList.contains("is-muted"), "row still muted");
    });

    test("ui: 재생 위치 표시가 10개 트랙에 적용된다 / 播放位置在 10 条轨道上高亮", function () {
      var app = global.BS.app;
      app.setPlayhead(3);
      var current = document.querySelectorAll("#grid .cell.is-current");
      assert(current.length === P.TRACKS.length, "highlighted cells: " + current.length);
      assert(document.querySelectorAll("#ruler .is-current").length === 1, "ruler not highlighted");
      app.setPlayhead(-1);
      assert(document.querySelectorAll("#grid .cell.is-current").length === 0, "highlight not cleared");
    });

    test("storage: 패턴 저장과 목록 반영이 동작한다 / 保存图案并刷新列表", function () {
      var app = global.BS.app;
      app.clearLibrary();
      var ok = app.saveCurrent("테스트 패턴");
      assert(ok === true, "save failed");
      assert(app.readLibrary().length === 1, "library length wrong");
      var item = app.readLibrary()[0];
      var restored = P.deserialize(item.data);
      assert(P.countOn(restored) > 0, "saved pattern is empty");
      app.clearLibrary();
      assert(app.readLibrary().length === 0, "library not cleared");
    });
  }

  function runAsync() {
    var jobs = [];
    var drums = ["kick", "snare", "hat", "clap"];
    var toneVariants = ["pluck", "lead", "bass"];

    jobs.push(
      testAsync("audio: 드럼 4종이 실제로 소리를 만든다 / 四种鼓均产生真实声音", function () {
        return Promise.all(
          drums.map(function (id) {
            return A.renderTrack(trackById(id), "pluck", 1.2).then(function (buffer) {
              var stats = bufferStats(buffer);
              assert(stats.finite, id + " produced NaN samples");
              assert(stats.peak > 0.02, id + " peak too low: " + stats.peak.toFixed(4));
              assert(stats.rms > 0.001, id + " rms too low: " + stats.rms.toFixed(5));
            });
          })
        );
      })
    );

    jobs.push(
      testAsync("audio: 신스 3종 음색이 모두 소리를 만든다 / 三种合成音色均发声", function () {
        var track = trackById("a4");
        return Promise.all(
          toneVariants.map(function (tone) {
            return A.renderTrack(track, tone, 1.2).then(function (buffer) {
              var stats = bufferStats(buffer);
              assert(stats.finite, tone + " produced NaN samples");
              assert(stats.peak > 0.01, tone + " peak too low: " + stats.peak.toFixed(4));
            });
          })
        );
      })
    );

    return Promise.all(jobs);
  }

  function render() {
    var passed = results.filter(function (r) {
      return r.ok;
    }).length;
    var total = results.length;
    var allPass = passed === total;

    var items = results
      .map(function (r) {
        return (
          '<li class="' + (r.ok ? "pass" : "fail") + '">' +
          (r.ok ? "PASS" : "FAIL") + " — " + escape(r.name) +
          (r.ok ? "" : '<span class="err">' + escape(r.error) + "</span>") +
          "</li>"
        );
      })
      .join("");

    var wrap = document.createElement("div");
    wrap.id = "selftest";
    wrap.innerHTML =
      "<h1>VIVE BEAT STUDIO — SELFTEST</h1>" +
      '<p>브라우저 기능 자동 검증 / 浏览器功能自动验证</p>' +
      '<p class="summary ' + (allPass ? "pass" : "fail") + '" id="selftest-summary">SELFTEST: ' +
      (allPass ? "PASS" : "FAIL") + " " + passed + "/" + total + "</p>" +
      "<ol>" + items + "</ol>";
    document.body.appendChild(wrap);
    document.title = "SELFTEST " + (allPass ? "PASS" : "FAIL") + " " + passed + "/" + total;
    global.__SELFTEST__ = { passed: passed, total: total, ok: allPass, results: results };
  }

  function escape(text) {
    return String(text == null ? "" : text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  global.addEventListener("load", function () {
    runSync();
    runAsync().then(render);
  });
})(window);
