(() => {
  const pick = (id) => document.getElementById('hb-' + id);
  const fields = [pick('work'), pick('rest'), pick('count')];
  const timer = document.querySelector('.hb-console');
  const ring = document.querySelector('.hb-progress');
  const preset = pick('preset');
  const toggle = pick('toggle');
  const reset = pick('reset');
  const sound = pick('sound');
  const plans = { quick: [5, 3, 2], plank: [30, 15, 3] };
  const cues = {
    work: [[523.3, 0, 0.22]],
    rest: [
      [440, 0, 0.18],
      [329.6, 0.21, 0.2],
    ],
    done: [
      [659.3, 0, 0.21],
      [880, 0.24, 0.33],
      [1046.5, 0.62, 0.62],
    ],
  };
  let audio, interval;
  let status = 'ready',
    storedElapsed = 0,
    began = 0,
    lastStep = '';
  let plan = plans.quick;
  const duration = () => plan[0] * plan[2] + plan[1] * (plan[2] - 1);
  const elapsed = () =>
    storedElapsed + (status === 'running' ? Math.max(0, performance.now() - began) / 1000 : 0);
  const format = (s) =>
    Math.floor(s / 60)
      .toString()
      .padStart(2, '0') +
    ':' +
    (s % 60).toString().padStart(2, '0');

  function unlockAudio() {
    if (!sound.checked) return;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    try {
      if (!audio) audio = new Audio();
      if (audio.state === 'suspended') audio.resume().catch(() => {});
    } catch {
      /* Timing also works on devices without Web Audio. */
    }
  }
  function cue(phase) {
    if (!sound.checked || !audio || audio.state === 'closed') return;
    for (const [hz, delay, length] of cues[phase]) {
      const at = audio.currentTime + delay;
      const osc = audio.createOscillator(),
        gain = audio.createGain();
      osc.type = 'sine';
      osc.frequency.value = hz;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.1, at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
      osc.start(at);
      osc.stop(at + length + 0.015);
    }
  }
  function render() {
    const played = Math.min(duration(), elapsed());
    const cycle = plan[0] + plan[1];
    const round = Math.min(plan[2], Math.floor(played / cycle) + 1);
    const position = played - (round - 1) * cycle;
    const phase = played >= duration() ? 'done' : position < plan[0] ? 'work' : 'rest';
    const length = phase === 'rest' ? plan[1] : plan[0];
    const remaining = phase === 'done' ? 0 : length - position + (phase === 'rest' ? plan[0] : 0);
    const step = round + phase;
    if (status === 'running' && step !== lastStep) cue(phase);
    lastStep = step;
    if (phase === 'done' && status === 'running') {
      clearInterval(interval);
      storedElapsed = duration();
      status = 'done';
    }
    const text =
      status === 'ready'
        ? 'Готов к старту'
        : status === 'paused'
          ? 'Пауза'
          : phase === 'done'
            ? 'Готово'
            : phase === 'rest'
              ? 'Отдых'
              : 'Удержание';
    if (pick('phase').textContent !== text) pick('phase').textContent = text;
    timer.dataset.phase = phase;
    pick('round').textContent = 'Подход ' + round + ' из ' + plan[2];
    pick('time').textContent = format(Math.ceil(remaining));
    pick('total').textContent = format(duration());
    ring.style.strokeDashoffset = String(100 * (1 - remaining / length));
    toggle.textContent = { ready: 'Старт', running: 'Пауза', paused: 'Продолжить', done: 'Ещё раз' }[status];
    reset.disabled = status === 'ready';
    pick('config').disabled = status === 'paused' || status === 'running';
  }
  function ready() {
    clearInterval(interval);
    status = 'ready';
    storedElapsed = 0;
    lastStep = '';
    render();
  }
  function readPlan() {
    if (fields.some((field) => !field.validity.valid)) {
      toggle.disabled = true;
      pick('total').textContent = '—';
      return false;
    }
    plan = fields.map((field) => field.valueAsNumber);
    toggle.disabled = false;
    ready();
    return true;
  }
  toggle.addEventListener('click', () => {
    unlockAudio();
    if (status === 'running') {
      render();
      if (status === 'done') return;
      storedElapsed = elapsed();
      clearInterval(interval);
      status = 'paused';
    } else {
      if (status !== 'paused') {
        if (!readPlan()) return;
        lastStep = '';
      }
      status = 'running';
      began = performance.now();
      interval = setInterval(render, 100);
    }
    render();
  });
  reset.addEventListener('click', ready);
  preset.addEventListener('change', () => {
    if (plans[preset.value]) {
      fields.forEach((field, i) => {
        field.value = plans[preset.value][i];
      });
      readPlan();
    }
  });
  fields.forEach((field) =>
    field.addEventListener('input', () => {
      preset.value = 'custom';
      readPlan();
    }),
  );
  sound.addEventListener('change', () => {
    unlockAudio();
    if (sound.checked) cue('work');
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && status === 'running') render();
  });
  window.addEventListener('pagehide', () => {
    ready();
    if (audio) audio.suspend().catch(() => {});
  });
  render();
})();
