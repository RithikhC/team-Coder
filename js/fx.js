/* Celebrations: a canvas coin shower and tiny synthesized sound effects.
   No image or audio files - coins are drawn on a <canvas>, sounds are Web Audio oscillators. */
(function (App) {
  'use strict';

  const SOUND_KEY = 'plunderport.sound';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let audio = null;
  let soundOn = (() => {
    try { return localStorage.getItem(SOUND_KEY) !== 'off'; } catch { return true; }
  })();

  /* ---------- Coin shower ---------- */

  function coins({ x = innerWidth / 2, y = innerHeight / 3, count = 60 } = {}) {
    if (reduceMotion.matches) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'fx-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    // Inside an open <dialog> so the coins render above the modal's top layer.
    (document.querySelector('dialog[open]') || document.body).append(canvas);

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const parts = Array.from({ length: count }, () => ({
      x, y,
      vx: (Math.random() - 0.5) * 15,
      vy: -Math.random() * 13 - 5,
      r: 6 + Math.random() * 6,
      spin: Math.random() * Math.PI,
      vs: (Math.random() - 0.5) * 0.5,
    }));

    function drawCoin(p) {
      // Squash the ellipse by |cos(spin)| to fake a coin flipping in 3D.
      const w = Math.max(1.5, p.r * Math.abs(Math.cos(p.spin)));
      const grad = ctx.createLinearGradient(p.x - w, p.y - p.r, p.x + w, p.y + p.r);
      grad.addColorStop(0, '#fff3b8');
      grad.addColorStop(0.5, '#e8b83c');
      grad.addColorStop(1, '#8f6010');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, w, p.r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(100, 62, 8, .65)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    let last = performance.now();
    let frame;
    function tick(now) {
      const dt = Math.min((now - last) / 16.7, 3);
      last = now;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      let alive = 0;
      for (const p of parts) {
        p.vy += 0.45 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.99;
        p.spin += p.vs * dt * 3;
        if (p.y - p.r < innerHeight) {
          alive++;
          drawCoin(p);
        }
      }
      if (alive) frame = requestAnimationFrame(tick);
      else canvas.remove();
    }
    frame = requestAnimationFrame(tick);
    setTimeout(() => { cancelAnimationFrame(frame); canvas.remove(); }, 5000);
  }

  /* ---------- Sound ---------- */

  function audioContext() {
    if (!audio) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      audio = new Ctor();
    }
    if (audio.state === 'suspended') audio.resume();
    return audio;
  }

  function tone(ac, freq, start, duration, type = 'triangle', peak = 0.07) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(ac.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  // [frequency Hz, offset s, duration s, waveform?, peak gain?]
  const SOUNDS = {
    coins: [[1318, 0, 0.12], [1568, 0.07, 0.12], [2093, 0.14, 0.3]],
    pop: [[880, 0, 0.09, 'sine', 0.05], [1320, 0.05, 0.08, 'sine', 0.03]],
    thud: [[150, 0, 0.2, 'sine', 0.14], [95, 0.05, 0.25, 'sine', 0.1]],
    grumble: [[220, 0, 0.14, 'sawtooth', 0.025], [196, 0.12, 0.2, 'sawtooth', 0.025]],
    fanfare: [[523, 0, 0.15], [659, 0.12, 0.15], [784, 0.24, 0.15], [1047, 0.36, 0.45]],
    tick: [[1800, 0, 0.03, 'square', 0.015]],
  };

  function play(name) {
    if (!soundOn) return;
    const ac = audioContext();
    if (!ac) return;
    const t = ac.currentTime + 0.01;
    (SOUNDS[name] || []).forEach(([f, offset, d, type, peak]) => tone(ac, f, t + offset, d, type, peak));
  }

  /** Coins burst from an element (or the screen centre) with a matching sound. */
  function celebrate(origin, sound = 'coins', count = 60) {
    const rect = origin?.getBoundingClientRect?.();
    coins({
      x: rect ? rect.left + rect.width / 2 : innerWidth / 2,
      y: rect ? rect.top + rect.height / 2 : innerHeight / 3,
      count,
    });
    play(sound);
  }

  function initToggle(button) {
    const update = () => {
      button.setAttribute('aria-pressed', String(soundOn));
      const label = soundOn ? 'Silence the ship’s bell (mute sounds)' : 'Ring the ship’s bell (unmute sounds)';
      button.setAttribute('aria-label', label);
      button.title = label;
    };
    update();
    button.addEventListener('click', () => {
      soundOn = !soundOn;
      try { localStorage.setItem(SOUND_KEY, soundOn ? 'on' : 'off'); } catch { /* ignore */ }
      update();
      play('pop');
    });
  }

  App.fx = { coins, play, celebrate, initToggle };
})(window.App = window.App || {});
