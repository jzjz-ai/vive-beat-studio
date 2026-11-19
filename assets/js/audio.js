/* ==========================================================================
   Audio engine — Web Audio synthesis + step scheduler.
   Web Audio 실시간 합성 및 스케줄러 / Web Audio 实时合成与调度器。
   No samples, no network: every sound is generated in the browser.
   ========================================================================== */
(function (global) {
  "use strict";

  var Audio = {};

  function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function noiseBuffer(ctx) {
    if (ctx.__bsNoise) return ctx.__bsNoise;
    var len = Math.floor(ctx.sampleRate * 1.2);
    var buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    ctx.__bsNoise = buffer;
    return buffer;
  }

  function impulseResponse(ctx) {
    var seconds = 2.1;
    var decay = 3;
    var rate = ctx.sampleRate;
    var len = Math.floor(rate * seconds);
    var buffer = ctx.createBuffer(2, len, rate);
    for (var ch = 0; ch < 2; ch++) {
      var data = buffer.getChannelData(ch);
      for (var i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buffer;
  }

  /* --- Instruments ------------------------------------------------------- */

  function kick(ctx, dest, time, level) {
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(175, time);
    osc.frequency.exponentialRampToValueAtTime(46, time + 0.14);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(level, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.44);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + 0.46);

    var click = ctx.createBufferSource();
    click.buffer = noiseBuffer(ctx);
    var clickFilter = ctx.createBiquadFilter();
    clickFilter.type = "highpass";
    clickFilter.frequency.value = 1400;
    var clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(level * 0.28, time);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.018);
    click.connect(clickFilter);
    clickFilter.connect(clickGain);
    clickGain.connect(dest);
    click.start(time);
    click.stop(time + 0.03);
  }

  function snare(ctx, dest, time, level) {
    var noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer(ctx);
    var band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 1900;
    band.Q.value = 0.7;
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(level * 0.75, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.19);
    noise.connect(band);
    band.connect(gain);
    gain.connect(dest);
    noise.start(time);
    noise.stop(time + 0.2);

    var body = ctx.createOscillator();
    var bodyGain = ctx.createGain();
    body.type = "triangle";
    body.frequency.setValueAtTime(190, time);
    body.frequency.exponentialRampToValueAtTime(140, time + 0.08);
    bodyGain.gain.setValueAtTime(level * 0.32, time);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
    body.connect(bodyGain);
    bodyGain.connect(dest);
    body.start(time);
    body.stop(time + 0.13);
  }

  function hat(ctx, dest, time, level, open) {
    var noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer(ctx);
    noise.loop = true;
    var filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 7200;
    var gain = ctx.createGain();
    var duration = open ? 0.28 : 0.055;
    gain.gain.setValueAtTime(level * 0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    noise.start(time);
    noise.stop(time + duration + 0.02);
  }

  function clap(ctx, dest, time, level) {
    var noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer(ctx);
    var band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 1350;
    band.Q.value = 1.1;
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    for (var i = 0; i < 3; i++) {
      var t0 = time + i * 0.012;
      gain.gain.setValueAtTime(level * (0.9 - i * 0.18), t0);
      gain.gain.exponentialRampToValueAtTime(level * 0.12, t0 + 0.011);
    }
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.24);
    noise.connect(band);
    band.connect(gain);
    gain.connect(dest);
    noise.start(time);
    noise.stop(time + 0.26);
  }

  function synthNote(ctx, dest, time, midi, tone, level) {
    var freq = midiToFreq(midi);
    var gain = ctx.createGain();
    var filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 3;
    gain.connect(dest);
    filter.connect(gain);

    var oscs = [];
    var decay;
    if (tone === "bass") {
      var sub = ctx.createOscillator();
      sub.type = "sine";
      sub.frequency.value = freq / 2;
      var saw = ctx.createOscillator();
      saw.type = "sawtooth";
      saw.frequency.value = freq;
      saw.detune.value = -4;
      filter.frequency.setValueAtTime(520, time);
      filter.frequency.exponentialRampToValueAtTime(220, time + 0.2);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(level * 0.85, time + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.38);
      decay = 0.4;
      oscs.push(sub, saw);
    } else if (tone === "lead") {
      var leadA = ctx.createOscillator();
      leadA.type = "sawtooth";
      leadA.frequency.value = freq;
      leadA.detune.value = -8;
      var leadB = ctx.createOscillator();
      leadB.type = "square";
      leadB.frequency.value = freq;
      leadB.detune.value = 8;
      filter.frequency.setValueAtTime(3400, time);
      filter.frequency.exponentialRampToValueAtTime(900, time + 0.26);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(level * 0.42, time + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.42);
      decay = 0.44;
      oscs.push(leadA, leadB);
    } else {
      var tri = ctx.createOscillator();
      tri.type = "triangle";
      tri.frequency.value = freq;
      var pluck = ctx.createOscillator();
      pluck.type = "sawtooth";
      pluck.frequency.value = freq;
      pluck.detune.value = 7;
      filter.frequency.setValueAtTime(2600, time);
      filter.frequency.exponentialRampToValueAtTime(700, time + 0.18);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(level * 0.5, time + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.3);
      decay = 0.32;
      oscs.push(tri, pluck);
    }

    for (var i = 0; i < oscs.length; i++) {
      oscs[i].connect(filter);
      oscs[i].start(time);
      oscs[i].stop(time + decay + 0.02);
    }
  }

  var TRIGGERS = {
    kick: kick,
    snare: snare,
    hat: function (ctx, dest, time, level) {
      hat(ctx, dest, time, level, false);
    },
    clap: clap
  };

  function trigger(ctx, dest, track, time, tone, level) {
    var lvl = typeof level === "number" ? level : 1;
    if (track.kind === "note") {
      synthNote(ctx, dest, time, track.midi, tone || "pluck", lvl * 0.9);
    } else if (TRIGGERS[track.id]) {
      TRIGGERS[track.id](ctx, dest, time, lvl);
    }
  }

  /* --- Scheduler --------------------------------------------------------- */

  function stepDuration(bpm) {
    return 60 / bpm / 4;
  }

  function swingOffset(stepIndex, stepDur, swing) {
    return stepIndex % 2 === 1 ? stepDur * swing * 0.5 : 0;
  }

  function Engine() {
    this.ctx = null;
    this.master = null;
    this.compressor = null;
    this.reverbIn = null;
    this.gains = {};
    this.muted = {};
    this.bpm = 96;
    this.swing = 0.12;
    this.tone = "pluck";
    this.volume = 0.8;
    this.playing = false;
    this.timer = null;
    this.nextTime = 0;
    this.stepIndex = 0;
    this.queue = [];
    this.getPattern = null;
  }

  Engine.prototype.ensure = function () {
    if (this.ctx) return this.ctx;
    var Ctor = global.AudioContext || global.webkitAudioContext;
    if (!Ctor) return null;
    var ctx = new Ctor();
    this.ctx = ctx;

    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -16;
    this.compressor.knee.value = 20;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.004;
    this.compressor.release.value = 0.24;

    this.master = ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.compressor);
    this.compressor.connect(ctx.destination);

    var convolver = ctx.createConvolver();
    convolver.buffer = impulseResponse(ctx);
    var wet = ctx.createGain();
    wet.gain.value = 0.16;
    this.reverbIn = ctx.createGain();
    this.reverbIn.connect(convolver);
    convolver.connect(wet);
    wet.connect(this.master);

    var tracks = global.BS.Pattern.TRACKS;
    for (var i = 0; i < tracks.length; i++) {
      var g = ctx.createGain();
      g.gain.value = 0.9;
      g.connect(this.master);
      if (tracks[i].kind === "note") g.connect(this.reverbIn);
      this.gains[tracks[i].id] = g;
    }
    return ctx;
  };

  Engine.prototype.resume = function () {
    this.ensure();
    if (!this.ctx) return Promise.reject(new Error("NO_AUDIO_CONTEXT"));
    if (this.ctx.state === "running") return Promise.resolve();
    return this.ctx.resume();
  };

  Engine.prototype.setBpm = function (bpm) {
    this.bpm = Math.min(220, Math.max(40, Number(bpm) || 96));
  };

  Engine.prototype.setSwing = function (swing) {
    this.swing = Math.min(0.75, Math.max(0, Number(swing) || 0));
  };

  Engine.prototype.setTone = function (tone) {
    this.tone = tone || "pluck";
  };

  Engine.prototype.setVolume = function (volume) {
    this.volume = Math.min(1, Math.max(0, Number(volume)));
    if (this.master) {
      this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02);
    }
  };

  Engine.prototype.setMuted = function (trackId, muted) {
    this.muted[trackId] = !!muted;
    var g = this.gains[trackId];
    if (g) {
      g.gain.setTargetAtTime(muted ? 0 : 0.9, this.ctx.currentTime, 0.02);
    }
  };

  Engine.prototype.start = function (getPattern) {
    var self = this;
    this.ensure();
    if (!this.ctx) return Promise.reject(new Error("NO_AUDIO_CONTEXT"));
    this.getPattern = getPattern;
    return this.ctx.resume().then(function () {
      if (self.playing) return;
      self.playing = true;
      self.stepIndex = 0;
      self.queue = [];
      self.nextTime = self.ctx.currentTime + 0.08;
      self.tick();
      self.timer = global.setInterval(function () {
        self.tick();
      }, 25);
    });
  };

  Engine.prototype.stop = function () {
    this.playing = false;
    if (this.timer) {
      global.clearInterval(this.timer);
      this.timer = null;
    }
    this.queue = [];
    this.stepIndex = 0;
  };

  Engine.prototype.tick = function () {
    if (!this.playing || !this.ctx) return;
    var horizon = this.ctx.currentTime + 0.15;
    var guard = 0;
    while (this.nextTime < horizon && guard++ < 64) {
      var stepDur = stepDuration(this.bpm);
      var offset = swingOffset(this.stepIndex, stepDur, this.swing);
      var time = this.nextTime + offset;
      this.schedule(this.stepIndex, time);
      this.queue.push({ step: this.stepIndex, time: time });
      this.nextTime += stepDur;
      this.stepIndex = (this.stepIndex + 1) % global.BS.Pattern.STEPS;
    }
  };

  Engine.prototype.schedule = function (step, time) {
    var pattern = this.getPattern ? this.getPattern() : null;
    if (!pattern) return;
    var tracks = global.BS.Pattern.TRACKS;
    for (var i = 0; i < tracks.length; i++) {
      var track = tracks[i];
      if (this.muted[track.id]) continue;
      if (!pattern.grid[track.id][step]) continue;
      trigger(this.ctx, this.gains[track.id], track, time, this.tone, 1);
    }
  };

  /** Returns the most recent step that has already reached the speakers. */
  Engine.prototype.pollStep = function () {
    if (!this.ctx) return null;
    var current = this.ctx.currentTime + 0.008;
    var last = null;
    while (this.queue.length && this.queue[0].time <= current) {
      last = this.queue.shift().step;
    }
    return last;
  };

  Engine.prototype.preview = function (track) {
    var self = this;
    if (!this.ctx) {
      this.ensure();
    }
    if (!this.ctx) return;
    this.ctx.resume().then(function () {
      trigger(self.ctx, self.gains[track.id], track, self.ctx.currentTime + 0.02, self.tone, 0.85);
    });
  };

  /** Offline render used by the automated self-test. */
  Audio.renderTrack = function (track, tone, duration) {
    var seconds = duration || 1.4;
    var rate = 44100;
    var OfflineCtor = global.OfflineAudioContext || global.webkitOfflineAudioContext;
    var ctx = new OfflineCtor(1, Math.ceil(rate * seconds), rate);
    var gain = ctx.createGain();
    gain.gain.value = 1;
    gain.connect(ctx.destination);
    trigger(ctx, gain, track, 0.02, tone || "pluck", 1);
    return ctx.startRendering();
  };

  Audio.Engine = Engine;
  Audio.stepDuration = stepDuration;
  Audio.swingOffset = swingOffset;
  Audio.trigger = trigger;
  Audio.TRIGGERS = TRIGGERS;

  global.BS = global.BS || {};
  global.BS.Audio = Audio;
})(window);
