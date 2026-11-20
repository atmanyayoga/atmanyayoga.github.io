// Theme toggle (light/dark)
(function () {
  const root = document.documentElement;
  const stored = localStorage.getItem('atmanya-theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = stored || (prefersDark ? 'dark' : 'light');
  root.setAttribute('data-theme', initial);

  function updateToggle(btn) {
    if (!btn) return;
    const isDark = root.getAttribute('data-theme') === 'dark';
    btn.textContent = isDark ? '☀️' : '🌙';
    btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    btn.setAttribute('title', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  }

  const themeToggle = document.getElementById('themeToggle');
  updateToggle(themeToggle);
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      localStorage.setItem('atmanya-theme', next);
      updateToggle(themeToggle);
    });
  }
})();

// Mobile navigation toggle
const navToggle = document.getElementById('navToggle');
const nav = document.getElementById('mainNav');

if (navToggle && nav) {
  navToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    navToggle.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) {
      nav.classList.remove('open');
      navToggle.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('click', (event) => {
    if (!nav.contains(event.target) && !navToggle.contains(event.target)) {
      nav.classList.remove('open');
      navToggle.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });
}

// Footer copyright year
const yearEl = document.getElementById('year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

// Enquiry / registration form handler
const enquiryForm = document.getElementById('enquiryForm');
const formConfirmation = document.getElementById('formConfirmation') || document.getElementById('formConfirm');

if (enquiryForm && formConfirmation) {
  enquiryForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!enquiryForm.reportValidity()) return;

    const data = new FormData(enquiryForm);
    const value = (key) => (data.get(key) || '').toString().trim();
    const type = value('enquiryType') || 'General enquiry';
    const subject = 'Ātmanya Yoga — ' + type + (value('register') === 'Yes' ? ' (Registration)' : '');
    const body = [
      'Full name: ' + value('fullName'),
      'Email: ' + value('email'),
      'Country: ' + value('country'),
      'Preferred region: ' + value('region'),
      'Type of enquiry: ' + type,
      'Preferred batch: ' + value('batch'),
      'Experience level: ' + value('experience'),
      'Would like to register: ' + value('register'),
      'Subscription duration: ' + value('subscription'),
      'Preferred start date: ' + value('startDate'),
      '',
      'Message:',
      value('message') || '-'
    ].join('\n');

    window.location.href = 'mailto:atmanyayoga@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);

    try {
      const lang = (window.AtmanyaTranslate && window.AtmanyaTranslate.getLang && window.AtmanyaTranslate.getLang()) || 'en';
      const i18n = window.ATMANYA_I18N || {};
      const note = (i18n[lang] && i18n[lang].formMailtoNote) || (i18n.en && i18n.en.formMailtoNote) || 'Your email app has opened with your details ready to send.';
      formConfirmation.textContent = note;
    } catch (_) {}
    formConfirmation.classList.add('show');
    enquiryForm.reset();
  });
}

// Scroll reveal for main content blocks
document.querySelectorAll('main section, .form-card').forEach((el) => {
  if (!el.classList.contains('reveal')) {
    el.classList.add('reveal');
  }
});

const revealElements = document.querySelectorAll('.reveal');

if ('IntersectionObserver' in window && revealElements.length) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  revealElements.forEach((el) => revealObserver.observe(el));
}

// 5-minute virtual yoga session (voice guidance + ambient background music)
(function () {
  const player = document.getElementById('sessionPlayer');
  if (!player) return;

  const startBtn = document.getElementById('sessionStart');
  const pauseBtn = document.getElementById('sessionPause');
  const resetBtn = document.getElementById('sessionReset');
  const voiceToggle = document.getElementById('voiceToggle');
  const musicToggle = document.getElementById('musicToggle');
  const phaseEl = document.getElementById('sessionPhase');
  const cueEl = document.getElementById('sessionCue');
  const timerEl = document.getElementById('sessionTimer');
  const elapsedEl = document.getElementById('sessionElapsed');
  const progressBar = document.getElementById('sessionProgressBar');
  const breathRing = document.getElementById('breathRing');
  const modeDesc = document.getElementById('sessionModeDesc');
  const modeBtns = Array.from(document.querySelectorAll('.mode-btn'));
  const langSelect = document.getElementById('langSelect');
  let speakToken = 0;

  const TOTAL = 300; // seconds
  const modes = {
    calm: {
      desc: 'A calming 5-minute practice with slow breathing and gentle stillness.',
      cues: [
        { at: 0, phase: 'Centering', text: 'Welcome to your five minute calm breath practice. Sit comfortably, lengthen your spine, and soften your shoulders.', breath: '' },
        { at: 20, phase: 'Centering', text: 'Close your eyes if comfortable. Bring awareness to the natural rhythm of your breath.', breath: '' },
        { at: 40, phase: 'Pranayama', text: 'Inhale slowly through the nose.', breath: 'inhale' },
        { at: 44, phase: 'Pranayama', text: 'Hold the breath softly.', breath: 'hold' },
        { at: 46, phase: 'Pranayama', text: 'Exhale slowly and completely.', breath: 'exhale' },
        { at: 52, phase: 'Pranayama', text: 'Inhale, filling the lungs with ease.', breath: 'inhale' },
        { at: 56, phase: 'Pranayama', text: 'Hold gently.', breath: 'hold' },
        { at: 58, phase: 'Pranayama', text: 'Exhale, releasing tension.', breath: 'exhale' },
        { at: 64, phase: 'Pranayama', text: 'Inhale deeply and calmly.', breath: 'inhale' },
        { at: 68, phase: 'Pranayama', text: 'Hold.', breath: 'hold' },
        { at: 70, phase: 'Pranayama', text: 'Exhale slowly.', breath: 'exhale' },
        { at: 76, phase: 'Pranayama', text: 'Inhale awareness.', breath: 'inhale' },
        { at: 80, phase: 'Pranayama', text: 'Hold with ease.', breath: 'hold' },
        { at: 82, phase: 'Pranayama', text: 'Exhale and soften.', breath: 'exhale' },
        { at: 88, phase: 'Pranayama', text: 'Inhale steadily.', breath: 'inhale' },
        { at: 92, phase: 'Pranayama', text: 'Hold.', breath: 'hold' },
        { at: 94, phase: 'Pranayama', text: 'Exhale fully.', breath: 'exhale' },
        { at: 100, phase: 'Pranayama', text: 'Inhale calm.', breath: 'inhale' },
        { at: 104, phase: 'Pranayama', text: 'Hold softly.', breath: 'hold' },
        { at: 106, phase: 'Pranayama', text: 'Exhale slowly.', breath: 'exhale' },
        { at: 112, phase: 'Pranayama', text: 'Continue breathing gently at your own pace for a few moments.', breath: '' },
        { at: 150, phase: 'Gentle Movement', text: 'Gently drop your right ear toward your right shoulder. Breathe naturally.', breath: '' },
        { at: 175, phase: 'Gentle Movement', text: 'Return to center. Now drop your left ear toward your left shoulder.', breath: '' },
        { at: 200, phase: 'Gentle Movement', text: 'Return to center and slowly roll your shoulders back and down.', breath: '' },
        { at: 230, phase: 'Stillness', text: 'Rest your hands comfortably. Allow the breath to return to its natural rhythm.', breath: '' },
        { at: 255, phase: 'Stillness', text: 'Notice a sense of calm and balance within.', breath: '' },
        { at: 280, phase: 'Stillness', text: 'Gently deepen your breath as you prepare to close.', breath: '' },
        { at: 292, phase: 'Completion', text: 'Thank you for practising. Carry this stillness with you.', breath: '' }
      ]
    },
    morning: {
      desc: 'A gentle morning practice to awaken the body, breath, and focus.',
      cues: [
        { at: 0, phase: 'Awakening', text: 'Welcome to your five minute morning ease practice. Sit tall and take a comfortable breath in.', breath: '' },
        { at: 18, phase: 'Awakening', text: 'Feel your spine lengthen and invite a sense of freshness into the body.', breath: '' },
        { at: 35, phase: 'Breath & Energy', text: 'Inhale slowly, welcoming energy.', breath: 'inhale' },
        { at: 39, phase: 'Breath & Energy', text: 'Hold gently.', breath: 'hold' },
        { at: 41, phase: 'Breath & Energy', text: 'Exhale smoothly.', breath: 'exhale' },
        { at: 47, phase: 'Breath & Energy', text: 'Inhale again with ease.', breath: 'inhale' },
        { at: 51, phase: 'Breath & Energy', text: 'Hold.', breath: 'hold' },
        { at: 53, phase: 'Breath & Energy', text: 'Exhale and soften.', breath: 'exhale' },
        { at: 59, phase: 'Breath & Energy', text: 'Continue this steady rhythm. Inhale.', breath: 'inhale' },
        { at: 63, phase: 'Breath & Energy', text: 'Hold.', breath: 'hold' },
        { at: 65, phase: 'Breath & Energy', text: 'Exhale.', breath: 'exhale' },
        { at: 75, phase: 'Breath & Energy', text: 'Breathe naturally for a few moments, feeling alert and calm.', breath: '' },
        { at: 110, phase: 'Gentle Movement', text: 'Roll your shoulders up, back, and down slowly. Let the chest feel open.', breath: '' },
        { at: 140, phase: 'Gentle Movement', text: 'Stretch your arms overhead if comfortable on an inhale, and lower them on an exhale. Move gently.', breath: '' },
        { at: 175, phase: 'Gentle Movement', text: 'Turn your head softly to the right, return to center, then to the left. Keep the breath easy.', breath: '' },
        { at: 210, phase: 'Focus', text: 'Return to a comfortable seat. Rest your hands and bring attention to a clear, steady breath.', breath: '' },
        { at: 245, phase: 'Focus', text: 'Set a simple intention for your day, grounded in awareness and balance.', breath: '' },
        { at: 275, phase: 'Completion', text: 'Take one more deep, comfortable breath in and out.', breath: '' },
        { at: 292, phase: 'Completion', text: 'Your morning practice is complete. Carry this clarity with you.', breath: '' }
      ]
    },
    evening: {
      desc: 'A soothing evening practice to release tension and unwind toward rest.',
      cues: [
        { at: 0, phase: 'Unwinding', text: 'Welcome to your five minute evening unwind practice. Settle into a comfortable position.', breath: '' },
        { at: 20, phase: 'Unwinding', text: 'Let the day soften. Allow your shoulders, jaw, and face to relax.', breath: '' },
        { at: 40, phase: 'Soothing Breath', text: 'Inhale slowly through the nose.', breath: 'inhale' },
        { at: 44, phase: 'Soothing Breath', text: 'Pause gently.', breath: 'hold' },
        { at: 46, phase: 'Soothing Breath', text: 'Exhale slowly, letting go.', breath: 'exhale' },
        { at: 52, phase: 'Soothing Breath', text: 'Inhale calm.', breath: 'inhale' },
        { at: 56, phase: 'Soothing Breath', text: 'Pause.', breath: 'hold' },
        { at: 58, phase: 'Soothing Breath', text: 'Exhale tension.', breath: 'exhale' },
        { at: 64, phase: 'Soothing Breath', text: 'Inhale softly.', breath: 'inhale' },
        { at: 68, phase: 'Soothing Breath', text: 'Pause.', breath: 'hold' },
        { at: 70, phase: 'Soothing Breath', text: 'Exhale fully and slowly.', breath: 'exhale' },
        { at: 80, phase: 'Soothing Breath', text: 'Continue with slow, easy breaths. Each exhale can feel a little longer.', breath: '' },
        { at: 120, phase: 'Gentle Release', text: 'Gently tilt your head to the right, relaxing the neck. Breathe softly.', breath: '' },
        { at: 145, phase: 'Gentle Release', text: 'Return to center and tilt your head to the left.', breath: '' },
        { at: 170, phase: 'Gentle Release', text: 'Return to center. Slowly roll your shoulders back and down, releasing the day.', breath: '' },
        { at: 200, phase: 'Gentle Release', text: 'If comfortable, fold forward slightly or rest your hands on your lap, and breathe quietly.', breath: '' },
        { at: 235, phase: 'Rest', text: 'Allow the breath to become natural. Rest in stillness and ease.', breath: '' },
        { at: 265, phase: 'Rest', text: 'Notice a sense of quiet settling through the body and mind.', breath: '' },
        { at: 292, phase: 'Completion', text: 'Your evening practice is complete. May you carry this calm into rest.', breath: '' }
      ]
    }
  };

  let currentMode = 'calm';
  let cues = modes[currentMode].cues;
  let elapsed = 0;
  let running = false;
  let timerId = null;
  let cueIndex = 0;
  let audioCtx = null;
  let musicNodes = null;

  function fmt(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ':' + String(s).padStart(2, '0');
  }

  function setBreath(state) {
    if (!breathRing) return;
    breathRing.classList.remove('inhale', 'exhale', 'hold');
    if (state) breathRing.classList.add(state);
  }

  function cancelSpeech() {
    speakToken += 1;
    try { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch (_) {}
  }

  async function speak(text, el) {
    const token = ++speakToken;
    if (!voiceToggle || !voiceToggle.checked) return;
    if (!('speechSynthesis' in window)) return;

    const t = window.AtmanyaTranslate;
    const lang = t && t.getLang ? t.getLang() : 'en';
    let spoken = text;
    if (lang !== 'en' && t && t.translateText) {
      try { spoken = await t.translateText(text, lang); } catch (_) {}
      if (token !== speakToken) return;
      if (el) {
        el.setAttribute('data-i18n-original', text);
        el.textContent = spoken;
      }
    }

    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(spoken);
      u.lang = t && t.getVoiceLang ? t.getVoiceLang() : 'en-US';
      const voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
      const wanted = u.lang.toLowerCase().replace('_', '-');
      const prefix = wanted.slice(0, 2);
      const voice = voices.find(v => v.lang && v.lang.toLowerCase().replace('_', '-') === wanted) ||
                    voices.find(v => v.lang && v.lang.toLowerCase().indexOf(prefix) === 0);
      if (voice) u.voice = voice;
      u.rate = 0.92;
      u.pitch = 1;
      u.volume = 1;
      window.speechSynthesis.speak(u);
    } catch (_) {}
  }

  function ensureAudio() {
    if (audioCtx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx = new Ctx();
  }

  function startMusic() {
    if (!musicToggle || !musicToggle.checked) return;
    ensureAudio();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (musicNodes) return;
    const master = audioCtx.createGain();
    master.gain.value = 0.0001;
    master.connect(audioCtx.destination);
    master.gain.linearRampToValueAtTime(0.035, audioCtx.currentTime + 2);
    const nodes = [];
    const freqs = currentMode === 'morning' ? [196, 293.66, 392] : (currentMode === 'evening' ? [174, 220, 261.63] : [174, 261.63, 329.63]);
    freqs.forEach((f, i) => {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.value = f;
      g.gain.value = i === 0 ? 0.5 : 0.18;
      osc.connect(g).connect(master);
      osc.start();
      nodes.push(osc, g);
    });
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    lfo.frequency.value = currentMode === 'morning' ? 0.1 : 0.07;
    lfoGain.gain.value = 0.008;
    lfo.connect(lfoGain).connect(master.gain);
    lfo.start();
    nodes.push(lfo, lfoGain);
    musicNodes = { nodes, master };
  }

  function stopMusic(fade) {
    if (!musicNodes || !audioCtx) return;
    try {
      const t = audioCtx.currentTime;
      if (fade) {
        musicNodes.master.gain.cancelScheduledValues(t);
        musicNodes.master.gain.setValueAtTime(musicNodes.master.gain.value, t);
        musicNodes.master.gain.linearRampToValueAtTime(0.0001, t + 0.8);
      }
      musicNodes.nodes.forEach(n => { try { if (n.stop) n.stop(t + (fade ? 0.9 : 0)); } catch (_) {} });
    } catch (_) {}
    musicNodes = null;
  }

  function applyCue(c) {
    if (phaseEl) phaseEl.textContent = c.phase;
    if (cueEl) cueEl.textContent = c.text;
    setBreath(c.breath);
    speak(c.text, cueEl);
  }

  function updateUI() {
    const remaining = Math.max(0, TOTAL - elapsed);
    if (timerEl) timerEl.textContent = fmt(remaining);
    if (elapsedEl) elapsedEl.textContent = fmt(elapsed);
    if (progressBar) progressBar.style.width = Math.min(100, (elapsed / TOTAL) * 100) + '%';
  }

  function tick() {
    elapsed += 1;
    while (cueIndex < cues.length && cues[cueIndex].at <= elapsed) {
      applyCue(cues[cueIndex]);
      cueIndex += 1;
    }
    updateUI();
    if (elapsed >= TOTAL) finish();
  }

  function finish() {
    running = false;
    if (timerId) { clearInterval(timerId); timerId = null; }
    if (startBtn) startBtn.disabled = false;
    if (pauseBtn) { pauseBtn.disabled = true; pauseBtn.textContent = 'Pause'; }
    if (startBtn) startBtn.textContent = 'Restart Practice';
    if (phaseEl) phaseEl.textContent = 'Practice complete';
    if (cueEl) cueEl.textContent = 'Your 5-minute practice is complete. Take a moment before returning to your day.';
    setBreath('');
    stopMusic(true);
  }

  function start() {
    if (elapsed >= TOTAL) reset(true);
    if (running) return;
    running = true;
    if (startBtn) startBtn.disabled = true;
    if (pauseBtn) { pauseBtn.disabled = false; pauseBtn.textContent = 'Pause'; }
    if (cueIndex === 0 && elapsed === 0) {
      applyCue(cues[0]);
      cueIndex = 1;
    }
    startMusic();
    timerId = setInterval(tick, 1000);
  }

  function pause() {
    if (!running) return;
    running = false;
    if (timerId) { clearInterval(timerId); timerId = null; }
    if (startBtn) startBtn.disabled = false;
    if (pauseBtn) pauseBtn.textContent = 'Resume';
    if (startBtn) startBtn.textContent = 'Resume';
    cancelSpeech();
    stopMusic(true);
  }

  function reset(silent) {
    running = false;
    if (timerId) { clearInterval(timerId); timerId = null; }
    elapsed = 0;
    cueIndex = 0;
    cues = modes[currentMode].cues;
    updateUI();
    setBreath('');
    if (phaseEl) phaseEl.textContent = 'Ready to begin';
    if (cueEl) cueEl.textContent = 'Press Start to begin your 5-minute guided practice with voice guidance and calming music.';
    if (startBtn) { startBtn.disabled = false; startBtn.textContent = 'Start Practice'; }
    if (pauseBtn) { pauseBtn.disabled = true; pauseBtn.textContent = 'Pause'; }
    cancelSpeech();
    stopMusic(false);
  }

  function setMode(mode) {
    if (!modes[mode]) return;
    currentMode = mode;
    cues = modes[mode].cues;
    if (modeDesc) modeDesc.textContent = modes[mode].desc;
    modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    reset(false);
  }

  modeBtns.forEach(btn => btn.addEventListener('click', () => { if (!running) setMode(btn.dataset.mode); }));
  if (startBtn) startBtn.addEventListener('click', start);
  if (pauseBtn) pauseBtn.addEventListener('click', () => { if (running) pause(); else start(); });
  if (resetBtn) resetBtn.addEventListener('click', () => reset(false));

  if (musicToggle) musicToggle.addEventListener('change', () => {
    if (!musicToggle.checked) stopMusic(true);
    else if (running) startMusic();
  });
  if (voiceToggle) voiceToggle.addEventListener('change', () => {
    if (!voiceToggle.checked) cancelSpeech();
  });
  if (langSelect) langSelect.addEventListener('change', cancelSpeech);

  window.addEventListener('beforeunload', () => { cancelSpeech(); stopMusic(false); });
  updateUI();
})();

// Language translation is handled by js/translate.js
