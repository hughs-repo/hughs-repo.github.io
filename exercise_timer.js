// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIG  (same exercises as exercises.cfg)
// ═══════════════════════════════════════════════════════════════════════════
const DEFAULT_CFG = `
[exercise.1]
name                = Quad stretch in lying
requirement         = You must be lying face up on the edge of your bed. Drop one leg over the edge of the bed, with a towel around your ankle, ready to pull the leg back. You should feel the stretch at the front of your thigh
between_focus_time  = 15
sets                = 2
activity            = pull

[exercise.1.focus.1]
name       = left leg
intro      = Please lie down with your left leg hanging off the edge of the bed
hold_time  = 10
relax_time = 5
reps       = 5

[exercise.1.focus.2]
name       = right leg
intro      = Please lie down with your right leg hanging off the edge of the bed
hold_time  = 10
relax_time = 5
reps       = 5

[exercise.2]
name                = Straight leg raise
requirement         = Start with the resistance band between your legs at the ankles. Then lie face up with a rolled up towel under the left thigh. Squeeze your knee down into the towel to  tighten your thigh muscle, pointing your toes and ankle upwards. When you do the exercie you willlift your leg to 30 degrees without bending your leg.
between_focus_time  = 15
sets                = 2
activity            = lift

[exercise.2.focus.1]
name       = left leg
intro      = Please place the rolled towel under your left thigh. When I tell you, lift your left leg tensioning the band
hold_time  = 5
relax_time = 5
reps       = 10

[exercise.2.focus.2]
name       = right leg
intro      = Please place the rolled towel under your right thigh. When I tell you, lift your right leg tensioning the band
hold_time  = 5
relax_time = 5
reps       = 10

[exercise.3]
name                = Supine hip abduction with band
requirement         = Lie face up with the resistance band between the legs at the ankles. To begin, you will be sliding your left leg out sideways
between_focus_time  = 15
sets                = 2
activity            = stretch

[exercise.3.focus.1]
name       = left leg
intro      = When I tell you, move your left leg to the left, tensioning the band
hold_time  = 5
relax_time = 5
reps       = 10

[exercise.3.focus.2]
name       = right leg
intro      = When I tell you, move your right leg to the right, tensioning the band
hold_time  = 5
relax_time = 5
reps       = 10

[exercise.4]
name                = Double heel leg rise
requirement         = With this exercise you will be standing straight and perhaps gently holding on to a table or chair for balance. You will push through your toes, lifting your heels off the ground as high as you can
between_focus_time  = 15
sets                = 2
activity            = Rise

[exercise.4.focus.1]
name       = legs
intro      = When I tell you, rise up on your toes, and then relax back down
hold_time  = 2
relax_time = 2
reps       = 15
`;

// ═══════════════════════════════════════════════════════════════════════════
// CFG PARSER
// ═══════════════════════════════════════════════════════════════════════════
function parseCfg(text) {
  const lines = text.split('\n');
  const sections = {};
  let current = null;
  let lastKey = null;

  for (let raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    const secMatch = line.match(/^\[(.+)\]$/);
    if (secMatch) {
      current = secMatch[1].trim().toLowerCase();
      sections[current] = {};
      lastKey = null;
      continue;
    }

    if (current === null) continue;

    const kvMatch = line.match(/^([^=]+)=(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1].trim().toLowerCase().replace(/\s+/g, '_');
      const val = kvMatch[2].trim();
      sections[current][key] = val;
      lastKey = key;
    } else if (lastKey && raw.match(/^\s+\S/)) {
      // continuation line
      sections[current][lastKey] += ' ' + line;
    }
  }

  // collapse whitespace in all values
  for (const sec of Object.values(sections))
    for (const k of Object.keys(sec))
      sec[k] = sec[k].replace(/\s+/g, ' ').trim();

  // Build exercise objects
  const exercises = [];
  let exNum = 1;
  while (true) {
    const exKey = `exercise.${exNum}`;
    if (!sections[exKey]) break;
    const ex = sections[exKey];
    const focusAreas = [];
    let faNum = 1;
    while (true) {
      const faKey = `exercise.${exNum}.focus.${faNum}`;
      if (!sections[faKey]) break;
      const fa = sections[faKey];
      focusAreas.push({
        name:      fa.name      || `Focus ${faNum}`,
        intro:     fa.intro     || '',
        holdTime:  parseInt(fa.hold_time  || '5'),
        relaxTime: parseInt(fa.relax_time || '5'),
        reps:      parseInt(fa.reps       || '10'),
      });
      faNum++;
    }
    exercises.push({
      name:            ex.name            || `Exercise ${exNum}`,
      requirement:     ex.requirement     || '',
      betweenFocusTime:parseInt(ex.between_focus_time || '10'),
      sets:            parseInt(ex.sets   || '1'),
      activity:        ex.activity        || 'go',
      focusAreas,
    });
    exNum++;
  }
  return exercises;
}

// ═══════════════════════════════════════════════════════════════════════════
// WORD HELPERS
// ═══════════════════════════════════════════════════════════════════════════
const COUNT_WORDS = ['','one','two','three','four','five','six','seven',
  'eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen',
  'sixteen','seventeen','eighteen','nineteen','twenty'];

function countWord(n) { return COUNT_WORDS[n] || String(n); }
function plural(n, s, p) { return n === 1 ? `1 ${s}` : `${n} ${p || s+'s'}`; }
function pluralWord(w) {
  const lw = w.toLowerCase();
  if (/(?:s|sh|ch|x|z)$/.test(lw)) return lw + 'es';
  if (/e$/.test(lw)) return lw + 's';
  return lw + 's';
}
function titleCase(s) { return s.replace(/\b\w/g, c => c.toUpperCase()); }
function naturalList(items) {
  if (items.length <= 1) return items[0] || '';
  if (items.length === 2) return `${items[0]}, and ${items[1]}`;
  return items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1];
}
function formatDuration(sec) {
  sec = Math.round(sec);
  const m = Math.floor(sec / 60), s = sec % 60;
  if (m === 0) return plural(s, 'second');
  if (s === 0) return plural(m, 'minute');
  return `${plural(m,'minute')} and ${plural(s,'second')}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// SPEECH
// ═══════════════════════════════════════════════════════════════════════════
let speechReady = false;
let speechVoice  = null;

function initSpeech() {
  if (!('speechSynthesis' in window)) {
    document.getElementById('speech-warn').classList.add('show');
    return;
  }
  speechReady = true;
  function pickVoice() {
    const voices = speechSynthesis.getVoices();
    // Prefer a natural-sounding English voice
    speechVoice = voices.find(v => v.lang.startsWith('en') && v.localService) ||
                  voices.find(v => v.lang.startsWith('en')) ||
                  voices[0] || null;
  }
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
}

// Speak text; returns a Promise that resolves after speech ends (or immediately if paused/stopped).
// Duration compensation: resolves with the actual elapsed ms.
function speak(text) {
  return new Promise(resolve => {
    if (!speechReady || stopped) { resolve(0); return; }
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate  = 0.95;
    utt.pitch = 1.0;
    if (speechVoice) utt.voice = speechVoice;
    const t0 = performance.now();
    utt.onend   = () => resolve(performance.now() - t0);
    utt.onerror = () => resolve(performance.now() - t0);
    speechSynthesis.speak(utt);
  });
}

function cancelSpeech() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN WAKE LOCK  —  keep the screen on while the session is running
// ═══════════════════════════════════════════════════════════════════════════
let wakeLock = null;

async function acquireWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
  } catch (_) {
    // Permission denied or not supported — silently ignore
  }
}

async function releaseWakeLock() {
  if (wakeLock) {
    try { await wakeLock.release(); } catch (_) { /* ignore */ }
    wakeLock = null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TIMING  —  pause-aware sleep using wall-clock accumulation
// ═══════════════════════════════════════════════════════════════════════════
let paused  = false;
let stopped = false;

// Wait for exactly `ms` real (unpaused) milliseconds.
// Polls every 20ms; clock freezes the moment paused===true.
function sleep(ms) {
  return new Promise(resolve => {
    if (ms <= 0) { resolve(); return; }
    let elapsed = 0;
    let last = performance.now();
    function tick() {
      if (stopped) { resolve(); return; }
      const now = performance.now();
      if (!paused) elapsed += now - last;
      last = now;
      if (elapsed >= ms) resolve();
      else setTimeout(tick, 20);
    }
    setTimeout(tick, 20);
  });
}

// Speak text, then wait for whatever real time remains in the beat.
// We record wall-clock time BEFORE and AFTER speak() so that any
// browser early-fire gap in onend is naturally absorbed.
async function speakThenWait(text, totalMs) {
  const beatStart = performance.now();
  await speak(text);
  const elapsed   = performance.now() - beatStart;
  const remaining = totalMs - elapsed;
  if (remaining > 0 && !stopped) await sleep(remaining);
}

// ═══════════════════════════════════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════════════════════════════════
const CIRCUMFERENCE = 2 * Math.PI * 42; // r=42

function setTag(cls, text) {
  const el = document.getElementById('status-tag');
  el.className = 'status-tag ' + cls;
  el.textContent = text;
}
function setMain(text)  { document.getElementById('status-main').textContent = text; }
function setSub(text)   { document.getElementById('status-sub').textContent  = text; }

function setRing(visible, pct, isRelax) {
  const wrap = document.getElementById('ring-wrap');
  wrap.classList.toggle('ring-visible', visible);
  const fill = document.getElementById('ring-fill-el');
  fill.className = 'ring-fill' + (isRelax ? ' relax' : '');
  fill.style.setProperty('--dash-offset', CIRCUMFERENCE * (1 - pct));
}
function setRingNum(text) { document.getElementById('count-num').textContent = text; }

function setChips(exName, setStr, focusName) {
  document.getElementById('chip-exercise').textContent = exName;
  document.getElementById('chip-set').textContent      = setStr;
  document.getElementById('chip-focus').textContent    = focusName;
}

function buildRepDots(total, current) {
  const wrap = document.getElementById('rep-dots');
  wrap.innerHTML = '';
  for (let i = 1; i <= total; i++) {
    const d = document.createElement('div');
    d.className = 'rep-dot' + (i < current ? ' done' : i === current ? ' active' : '');
    wrap.appendChild(d);
  }
}
function updateRepDot(rep, total) { buildRepDots(total, rep); }

let logLines = [];
function log(text) {
  const el = document.getElementById('log');
  const now = new Date();
  const ts = `${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `<span class="log-time">${ts}</span><span>${text}</span>`;
  el.appendChild(entry);
  el.scrollTop = el.scrollHeight;
}

// Progress
// ── Progress bar: counts completed relax events ──────────────────────────────
//
// totalRelaxCount(exercises) = total number of relax periods across the whole
// session (= reps - 1 per focus area per set, since the last rep has no relax,
// but we count the final "well done" pause too so the bar reaches 100%).
// Actually simplest: count every completed rep (each rep ends in either a
// relax or a well-done, both count as one tick).

function totalRepCount(exercises) {
  let total = 0;
  exercises.forEach(ex => {
    ex.focusAreas.forEach(fa => {
      total += fa.reps * ex.sets;
    });
  });
  return total;
}

let sessionTotalReps = 0;  // total reps across whole session
let sessionDoneReps  = 0;  // reps completed so far
let sessionStart     = 0;  // performance.now() at session start
let sessionPausedMs  = 0;  // accumulated paused ms
let pauseStartMs     = 0;  // when current pause began
let clockInterval    = null;

function startClock(exercises) {
  sessionTotalReps = totalRepCount(exercises);
  sessionDoneReps  = 0;
  sessionStart     = performance.now();
  sessionPausedMs  = 0;
  pauseStartMs     = 0;

  const textEl = document.getElementById('progress-text');
  const timeEl = document.getElementById('elapsed-time');

  clockInterval = setInterval(() => {
    // Track paused time for elapsed display
    if (paused) {
      if (pauseStartMs === 0) pauseStartMs = performance.now();
    } else {
      if (pauseStartMs > 0) {
        sessionPausedMs += performance.now() - pauseStartMs;
        pauseStartMs = 0;
      }
    }
    // Elapsed display
    const realElapsed = (performance.now() - sessionStart - sessionPausedMs) / 1000;
    const sec = Math.max(0, Math.floor(realElapsed));
    const m = Math.floor(sec / 60), s = sec % 60;
    timeEl.textContent = `${m}:${s.toString().padStart(2,'0')}`;
    // Label
    const rem = sessionTotalReps - sessionDoneReps;
    textEl.textContent = rem > 0
      ? `${sessionDoneReps} of ${sessionTotalReps} reps done`
      : 'Finishing…';
  }, 500);
}

// Call this after each rep completes (relax or well-done)
function tickProgress() {
  sessionDoneReps = Math.min(sessionDoneReps + 1, sessionTotalReps);
  const pct = sessionTotalReps > 0
    ? (sessionDoneReps / sessionTotalReps) * 100
    : 0;
  document.getElementById('progress-fill')
    .style.setProperty('--progress-pct', pct + '%');
}

function stopClock() {
  clearInterval(clockInterval);
  if (pauseStartMs > 0) {
    sessionPausedMs += performance.now() - pauseStartMs;
    pauseStartMs = 0;
  }
  return (performance.now() - sessionStart - sessionPausedMs) / 1000;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXERCISE RUNNER
// ═══════════════════════════════════════════════════════════════════════════
async function runSession(exercises) {
  const n = exercises.length;

  setMain('Hello!');
  setSub('');
  setTag('tag-intro', 'Welcome');
  await speakThenWait(
    `Hello! Today we are going to do ${plural(n,'exercise')}. ` +
    `You can tap Pause at any time to take a break.`,
    500
  );

  for (let exIdx = 0; exIdx < n && !stopped; exIdx++) {
    const ex = exercises[exIdx];
    // progress bar advances automatically via clock interval
    setChips(ex.name, '—', '—');

    // ── Exercise intro ────────────────────────────────────────────────────
    setTag('tag-intro', `Exercise ${exIdx+1} of ${n}`);
    setMain(ex.name);
    setRing(false);
    log(`▶ Exercise ${exIdx+1}: ${ex.name}`);
    await speak(`Exercise ${countWord(exIdx+1)}: ${ex.name}.`);
    await speak(`To do this exercise, ${ex.requirement}.`);

    const nSets  = ex.sets;
    const nAreas = ex.focusAreas.length;
    const areaNames = naturalList(ex.focusAreas.map(f => `the ${f.name}`));
    await speak(
      `We will do ${plural(nSets,'set')} of ${plural(nAreas,'focus area')}: ${areaNames}.`
    );

    for (let setNum = 1; setNum <= nSets && !stopped; setNum++) {
      setChips(ex.name, `${setNum} of ${nSets}`, '—');
      if (nSets > 1) {
        log(`  Set ${setNum} of ${nSets}`);
        await speak(`Starting set ${countWord(setNum)} of ${countWord(nSets)}.`);
      }

      for (let faIdx = 0; faIdx < nAreas && !stopped; faIdx++) {
        const fa = ex.focusAreas[faIdx];
        setChips(ex.name, `${setNum}/${nSets}`, titleCase(fa.name));
        log(`    Focus: ${fa.name}`);

        setTag('tag-intro', titleCase(fa.name));
        setMain(titleCase(fa.name));
        setSub(fa.intro);
        await speak(`${fa.intro}.`);
        await speak(
          `We will do ${plural(fa.reps,'repetition')}, ` +
          `holding for ${plural(fa.holdTime,'second')} each time.`
        );

        // Prep countdown
        setTag('tag-ready', 'Get ready');
        const prepTime = (setNum === 1 && faIdx === 0) ? 3000
                       : ex.betweenFocusTime * 1000;
        const prepMsg  = (setNum === 1 && faIdx === 0)
          ? 'Get ready.'
          : `Get ready. Starting in ${plural(ex.betweenFocusTime,'second')}.`;
        setMain('Get ready…');
        setSub('');
        setRing(false);
        await speakThenWait(prepMsg, prepTime);

        setTag('tag-hold', 'Here we go');
        await speakThenWait('Here we go.', 1000);

        // ── Reps ─────────────────────────────────────────────────────────
        buildRepDots(fa.reps, 1);
        for (let rep = 1; rep <= fa.reps && !stopped; rep++) {
          updateRepDot(rep, fa.reps);
          const isLast = rep === fa.reps;

          // ── HOLD phase ───────────────────────────────────────────────────
          // Each count beat = exactly 1000 ms of real time.
          // We measure wall-clock from the START of the beat so any gap
          // between onend firing and audio actually stopping is absorbed.
          setTag('tag-hold', `Hold — rep ${rep} of ${fa.reps}`);
          const activityWord = ex.activity.charAt(0).toUpperCase() + ex.activity.slice(1);
          setSub(`Hold for ${fa.holdTime} seconds`);
          setRing(true, 0, false);
          setRingNum(1);

          // When relax_time >= 4, say "OK." and wait before the activity word;
          // skip "OK." entirely for fast exercises (relax_time < 4).
          if (fa.relaxTime >= 4) {
            await speakThenWait('OK.', 1500);
          }

          for (let count = 1; count <= fa.holdTime && !stopped; count++) {
            // Ring fills up: empty at count=1, full at count=holdTime
            const pct = (count - 1) / (fa.holdTime - 1 || 1);
            setRing(true, pct, false);
            setRingNum(count);
            const word = count === 1 ? activityWord : countWord(count);
            // Show activity word on screen only when it is about to be spoken
            if (count === 1) setMain(activityWord);
            await speakThenWait(word, 1000);
          }

          // ── RELAX phase ──────────────────────────────────────────────────
          if (isLast) {
            updateRepDot(rep + 1, fa.reps); // mark all done
            setTag('tag-done', 'Well done!');
            setMain('Well done!');
            setSub(`Completed all ${fa.reps} reps`);
            setRing(false);
            log(`    ✓ Completed ${fa.reps} reps`);
            await speak(fa.relaxTime < 4
              ? 'And relax. Well done.'
              : `And relax. That was stretch ${fa.reps} of ${fa.reps}. Well done.`);
            await sleep(1500);
            tickProgress();
          } else {
            setTag('tag-relax', `Relax — ${rep} of ${fa.reps} done`);
            setMain('Relax');
            setSub(`Stretch ${rep} of ${fa.reps} complete`);
            setRing(true, 0.0, true);
            setRingNum(1);

            // Speak the relax message, then run a single pause-aware
            // countdown loop that is the ONLY source of truth for timing.
            await speak(fa.relaxTime < 4
              ? 'Relax.'
              : `Relax. That was stretch ${rep} of ${fa.reps}.`);

            const relaxMs = fa.relaxTime * 1000;
            let   relaxElapsed = 0;
            let   relaxLast    = performance.now();
            while (relaxElapsed < relaxMs && !stopped) {
              await new Promise(r => setTimeout(r, 20));
              const now = performance.now();
              if (!paused) relaxElapsed += now - relaxLast;
              relaxLast = now;
              const remaining = Math.max(0, relaxMs - relaxElapsed);
              // relax ring: fills as time elapses (count-up feel)
              setRing(true, 1 - remaining / relaxMs, true);
              setRingNum(Math.min(fa.relaxTime, Math.floor(relaxElapsed / 1000) + 1));
            }
            tickProgress();
          }
        } // end reps

        // Transition
        if (!stopped) {
          if (faIdx < nAreas - 1) {
            const nextFa = ex.focusAreas[faIdx + 1];
            await speak(`Great work on your ${fa.name}. Now we move to your ${nextFa.name}.`);
          } else if (setNum < nSets) {
            await speak(`That completes set ${countWord(setNum)}. Get ready for set ${countWord(setNum+1)}.`);
          } else {
            await speak(`Excellent! That completes this exercise.`);
          }
        }
      } // end focus areas
    } // end sets

    // (progress bar is clock-driven — no discrete update needed)

    // Break between exercises
    if (exIdx < n - 1 && !stopped) {
      setTag('tag-ready', 'Rest');
      setMain('Rest');
      setSub('Short break before the next exercise');
      setRing(false);
      log('  ⟳ Rest between exercises');
      await speakThenWait('Take a short break before the next exercise.', 10000);
    }
  } // end exercises

  if (!stopped) endSession();
}

// ═══════════════════════════════════════════════════════════════════════════
// SESSION START / END
// ═══════════════════════════════════════════════════════════════════════════
let exercises    = [];   // full parsed list (source of truth)
let exerciseOrder = [];  // indices into exercises[], in display order
// enabled state stored on each element as .disabled = true/false

function showScreen(id) {
  ['screen-setup','screen-session','screen-done'].forEach(s => {
    const el = document.getElementById(s);
    el.classList.toggle('screen-active', s === id);
  });
}

function startSession() {
  // Build ordered, enabled-only list from the UI selection
  const activeExercises = exerciseOrder
    .filter(e => !e.disabled)
    .map(e => exercises[e.idx]);
  if (activeExercises.length === 0) return;

  stopped = false;
  paused  = false;
  document.getElementById('log').innerHTML = '';
  document.getElementById('rep-dots').innerHTML = '';
  showScreen('screen-session');
  acquireWakeLock();
  startClock(activeExercises);
  runSession(activeExercises);
}

function endSession() {
  const elapsed = stopClock();
  releaseWakeLock();
  cancelSpeech();
  const durStr = formatDuration(elapsed);
  document.getElementById('done-time').textContent = `Total time: ${durStr}`;
  speak(`Congratulations! You have completed all your exercises in ${durStr}. Great job.`);
  showScreen('screen-done');
}

function stopSession() {
  stopped = true;
  paused  = false;
  setPaused(false);
  releaseWakeLock();
  cancelSpeech();
  stopClock();
  document.getElementById('progress-fill').style.setProperty('--progress-pct', '0%');
  showScreen('screen-setup');
}

// ═══════════════════════════════════════════════════════════════════════════
// PAUSE
// ═══════════════════════════════════════════════════════════════════════════
function setPaused(val) {
  paused = val;
  const overlay = document.getElementById('pause-overlay');
  const btn     = document.getElementById('btn-pause');
  overlay.classList.toggle('active', val);
  btn.classList.toggle('paused', val);
  btn.textContent = val ? '▶ Resume' : '⏸ Pause';
  if (val) {
    cancelSpeech();
    releaseWakeLock();
  } else if (!stopped) {
    acquireWakeLock();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CFG LOADING & PREVIEW
// ═══════════════════════════════════════════════════════════════════════════
function loadCfg(text, filename) {
  try {
    exercises = parseCfg(text);
    if (exercises.length === 0) throw new Error('No exercises found');
    showPreview(filename || 'exercises.cfg');
  } catch(e) {
    alert('Could not parse the config file: ' + e.message);
  }
}

// ── Exercise list: drag to reorder, tap to enable/disable ────────────────────

function showPreview(filename) {
  const zone   = document.getElementById('upload-zone');
  const status = document.getElementById('cfg-status');
  const preview= document.getElementById('preview-card');
  const btn    = document.getElementById('btn-start');

  zone.classList.add('loaded');
  zone.querySelector('h3').textContent = filename;
  zone.querySelector('p').textContent  = `${exercises.length} exercise${exercises.length!==1?'s':''} loaded`;
  zone.querySelector('.upload-icon').textContent = '✅';

  status.textContent = `✓ ${exercises.length} exercises loaded from "${filename}"`;
  status.classList.remove('hidden');

  // Initialise order: all enabled, in config order
  exerciseOrder = exercises.map((_, i) => ({ idx: i, disabled: false }));

  renderExerciseList();
  preview.classList.remove('hidden');
  btn.disabled = false;
}

function renderExerciseList() {
  const list = document.getElementById('exercise-preview');
  list.innerHTML = '';

  // Enabled first (in order), then disabled (greyed, at bottom)
  const enabled  = exerciseOrder.filter(e => !e.disabled);
  const disabled = exerciseOrder.filter(e =>  e.disabled);
  const ordered  = [...enabled, ...disabled];

  // Keep exerciseOrder in sync with this visual order
  exerciseOrder = ordered;

  let enabledCount = 0;
  ordered.forEach((entry, visualIdx) => {
    const ex  = exercises[entry.idx];
    const li  = document.createElement('li');
    li.dataset.visualIdx = visualIdx;
    li.classList.toggle('ex-disabled', entry.disabled);

    const num = entry.disabled ? '✕' : ++enabledCount;

    li.innerHTML = `
      <div class="ex-drag-handle" title="Drag to reorder">&#8942;</div>
      <div class="ex-num ${entry.disabled ? 'ex-num-off' : ''}">${num}</div>
      <div class="ex-body">
        <div class="ex-name">${ex.name}</div>
        <div class="ex-meta">${ex.sets}*(${ex.focusAreas[0]?.reps||0} ${pluralWord(ex.activity)} of ${ex.focusAreas[0]?.holdTime||0}secs): ${ex.focusAreas.map(f=>f.name).filter(n=>n).join(', ')}</div>
      </div>
      <div class="ex-toggle-btn" title="${entry.disabled ? 'Tap to enable' : 'Tap to skip'}">${entry.disabled ? '＋' : '−'}</div>`;

    // Tap toggle button
    li.querySelector('.ex-toggle-btn').addEventListener('click', e => {
      e.stopPropagation();
      entry.disabled = !entry.disabled;
      renderExerciseList();
      updateStartButton();
    });

    // Drag to reorder (mouse)
    attachDrag(li, list, visualIdx);

    list.appendChild(li);
  });
  updateStartButton();
}

function updateStartButton() {
  const anyEnabled = exerciseOrder.some(e => !e.disabled);
  document.getElementById('btn-start').disabled = !anyEnabled;
}

// ── Drag-to-reorder (works on both mouse and touch) ──────────────────────────
let dragSrc = null;

function attachDrag(li, list, visualIdx) {
  const handle = li.querySelector('.ex-drag-handle');

  // ── Mouse drag ────────────────────────────────────────────────────────────
  handle.addEventListener('mousedown', e => {
    e.preventDefault();
    dragSrc = li;
    li.classList.add('ex-dragging');

    const startY  = e.clientY;
    const startTop = li.getBoundingClientRect().top;

    function onMove(ev) {
      const dy = ev.clientY - startY;
      // Find which item we're hovering over
      const items = [...list.querySelectorAll('li:not(.ex-dragging)')];
      const over  = items.find(item => {
        const r = item.getBoundingClientRect();
        return ev.clientY >= r.top && ev.clientY <= r.bottom;
      });
      if (over) {
        const overIdx = parseInt(over.dataset.visualIdx);
        const srcIdx  = parseInt(li.dataset.visualIdx);
        if (overIdx !== srcIdx) {
          // Reorder in exerciseOrder
          const [moved] = exerciseOrder.splice(srcIdx, 1);
          exerciseOrder.splice(overIdx, 0, moved);
          renderExerciseList();
          // After re-render, dragSrc is stale — find new element
          dragSrc = list.querySelector(`li[data-visual-idx="${overIdx}"]`);
          if (dragSrc) {
            dragSrc.classList.add('ex-dragging');
          }
        }
      }
    }

    function onUp() {
      li.classList.remove('ex-dragging');
      if (dragSrc) dragSrc.classList.remove('ex-dragging');
      dragSrc = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
      renderExerciseList();
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  });

  // ── Touch drag ────────────────────────────────────────────────────────────
  handle.addEventListener('touchstart', e => {
    e.preventDefault();
    dragSrc = li;
    li.classList.add('ex-dragging');

    function onMove(ev) {
      const touch = ev.touches[0];
      const items = [...list.querySelectorAll('li:not(.ex-dragging)')];
      const over  = items.find(item => {
        const r = item.getBoundingClientRect();
        return touch.clientY >= r.top && touch.clientY <= r.bottom;
      });
      if (over) {
        const overIdx = parseInt(over.dataset.visualIdx);
        const srcIdx  = parseInt(li.dataset.visualIdx);
        if (overIdx !== srcIdx) {
          const [moved] = exerciseOrder.splice(srcIdx, 1);
          exerciseOrder.splice(overIdx, 0, moved);
          renderExerciseList();
          dragSrc = list.querySelector(`li[data-visual-idx="${overIdx}"]`);
          if (dragSrc) dragSrc.classList.add('ex-dragging');
        }
      }
    }

    function onEnd() {
      if (dragSrc) dragSrc.classList.remove('ex-dragging');
      dragSrc = null;
      handle.removeEventListener('touchmove', onMove);
      handle.removeEventListener('touchend',  onEnd);
      renderExerciseList();
    }

    handle.addEventListener('touchmove', onMove, { passive: false });
    handle.addEventListener('touchend',  onEnd);
  }, { passive: false });
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENT WIRING
// ═══════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initSpeech();

  // File upload
  const fileInput = document.getElementById('cfg-file');
  fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => loadCfg(ev.target.result, file.name);
    reader.readAsText(file);
  });

  // Drag and drop
  const zone = document.getElementById('upload-zone');
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => loadCfg(ev.target.result, file.name);
    reader.readAsText(file);
  });

  // Use default
  document.getElementById('btn-use-default').addEventListener('click', () => {
    loadCfg(DEFAULT_CFG, 'built-in sample');
  });

  // Start
  document.getElementById('btn-start').addEventListener('click', startSession);

  // Pause / Resume button
  document.getElementById('btn-pause').addEventListener('click', () => setPaused(!paused));
  document.getElementById('btn-resume').addEventListener('click', () => setPaused(false));

  // Stop
  document.getElementById('btn-stop').addEventListener('click', () => {
    if (confirm('Stop the session and return to the start?')) stopSession();
  });

  // Do again
  document.getElementById('btn-again').addEventListener('click', () => {
    stopped = false; paused = false;
    showScreen('screen-setup');
  });

  // Spacebar = pause toggle
  document.addEventListener('keydown', e => {
    if (e.code === 'Space' && document.getElementById('screen-session').classList.contains('screen-active')) {
      e.preventDefault();
      setPaused(!paused);
    }
  });

  // Re-acquire wake lock if the page becomes visible again while session is running
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !stopped && !paused) {
      acquireWakeLock();
    }
  });
});
