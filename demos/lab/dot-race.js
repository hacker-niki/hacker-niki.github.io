(() => {
  const pick = (id) => document.getElementById('dr-' + id);
  const arena = pick('arena');
  const ctx = arena.getContext('2d');
  const mode = pick('mode'),
    goal = pick('goal'),
    toggle = pick('toggle'),
    reset = pick('reset');
  const players = [{ color: '#ffb703' }, { color: '#219ebc' }];
  const dots = [];
  const keys = new Set();
  const target = [null, null];
  const pointers = new Map();
  const radius = 20,
    dotRadius = 7;
  let width = 800,
    height = 470,
    game = 'ready',
    last = 0,
    loopId;
  const sprites = {};
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function tint(key, path, color) {
    const image = new Image();
    image.onload = () => {
      const stamp = document.createElement('canvas');
      stamp.width = image.naturalWidth;
      stamp.height = image.naturalHeight;
      const paint = stamp.getContext('2d');
      paint.drawImage(image, 0, 0);
      paint.globalCompositeOperation = 'source-in';
      paint.fillStyle = color;
      paint.fillRect(0, 0, stamp.width, stamp.height);
      sprites[key] = stamp;
      draw();
    };
    image.src = 'dot-race-art/' + path + '.png';
  }
  function newDot() {
    let p;
    for (let i = 0; i < 40; i++) {
      p = { x: 18 + Math.random() * (width - 36), y: 18 + Math.random() * (height - 36) };
      if (
        players.every((c) => distance(p, c) > radius + dotRadius + 8) &&
        dots.every((c) => distance(p, c) > dotRadius * 2 + 6)
      )
        break;
    }
    return p;
  }
  function drawSprite(key, p, r, color) {
    if (sprites[key]) ctx.drawImage(sprites[key], p.x - r, p.y - r, 2 * r, 2 * r);
    else {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  function draw() {
    ctx.fillStyle = '#8ecae6';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#72b8d9';
    for (let y = 18; y < height; y += 28) {
      for (let x = 18; x < width; x += 28) ctx.fillRect(x, y, 1.5, 1.5);
    }
    dots.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, dotRadius + 3, 0, Math.PI * 2);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#995000';
      ctx.stroke();
      drawSprite('dot', p, dotRadius, '#fb8500');
    });
    players.forEach((p, i) => {
      drawSprite('p' + i, p, radius, p.color);
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#244757';
      ctx.stroke();
      ctx.font = 'bold 16px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#0b2637';
      ctx.fillText(String(i + 1), p.x, p.y);
      const aim = target[i];
      if (aim && game === 'playing') {
        ctx.strokeStyle = '#265267';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(aim.x, aim.y, 7, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
  }
  function resize() {
    const rect = arena.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const nextHeight = Math.round(width / Math.max(1, rect.width / rect.height));
    const ratio = nextHeight / height;
    for (const p of [...players, ...dots, ...target.filter(Boolean)]) {
      if (Number.isFinite(p.y)) p.y *= ratio;
    }
    height = nextHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    arena.width = Math.max(1, Math.round(rect.width * dpr));
    arena.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform(arena.width / width, 0, 0, arena.height / height, 0, 0);
    draw();
  }
  function showState(message) {
    pick('status').textContent = message;
    for (const [i, id] of ['yellow', 'blue'].entries()) pick(id).textContent = String(players[i].score);
    toggle.textContent = { ready: 'Начать матч', playing: 'Пауза', paused: 'Продолжить', done: 'Ещё матч' }[
      game
    ];
    reset.disabled = game === 'ready';
    goal.disabled = mode.disabled = game === 'playing' || game === 'paused';
    pick('target').textContent = 'До ' + goal.value + ' очков';
  }
  function setup() {
    cancelAnimationFrame(loopId);
    keys.clear();
    pointers.clear();
    target.fill(null);
    players.forEach((p, i) => {
      p.x = width * (i === 0 ? 0.21 : 0.79);
      p.y = height * (i === 0 ? 0.36 : 0.64);
      p.score = 0;
    });
    dots.length = 0;
    for (let i = 0; i < 5; i++) dots.push(newDot());
    game = 'ready';
    pick('help').textContent =
      mode.value === 'bot'
        ? 'Управляйте жёлтым кругом стрелками или касайтесь поля, чтобы задать направление. Синим играет бот.'
        : 'Жёлтый играет стрелками, синий — клавишами WASD. На сенсорном экране каждый ведёт свой круг касанием. Первый палец задаёт цель жёлтому, второй — синему.';
    showState('Готовы к матчу');
    draw();
  }
  function steer(index) {
    const p = players[index];
    const codes =
      index === 0 ? ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'] : ['KeyA', 'KeyD', 'KeyW', 'KeyS'];
    let x = Number(keys.has(codes[1])) - Number(keys.has(codes[0]));
    let y = Number(keys.has(codes[3])) - Number(keys.has(codes[2]));
    let aim = target[index];
    if (index === 1 && mode.value === 'bot') {
      aim = dots.reduce((a, b) => (distance(p, a) < distance(p, b) ? a : b));
      x = 0;
      y = 0;
    }
    if (x || y) {
      target[index] = null;
      aim = null;
    } else if (aim) {
      x = aim.x - p.x;
      y = aim.y - p.y;
    }
    const magnitude = Math.hypot(x, y);
    return magnitude
      ? { x: x / magnitude, y: y / magnitude, limit: aim ? magnitude : Infinity }
      : { x: 0, y: 0, limit: 0 };
  }
  function move(dt) {
    players.forEach((p, i) => {
      const v = steer(i);
      const speed = i === 1 && mode.value === 'bot' ? 126 : 222;
      const step = Math.min(v.limit, speed * dt);
      p.x = clamp(p.x + v.x * step, radius, width - radius);
      p.y = clamp(p.y + v.y * step, radius, height - radius);
      if (target[i] && distance(p, target[i]) < 1) target[i] = null;
    });
    const [a, b] = players,
      sep = distance(a, b);
    if (sep < 2 * radius) {
      const x = sep ? (a.x - b.x) / sep : 1,
        y = sep ? (a.y - b.y) / sep : 0,
        overlap = (2 * radius - sep) / 2;
      a.x = clamp(a.x + x * overlap, radius, width - radius);
      a.y = clamp(a.y + y * overlap, radius, height - radius);
      b.x = clamp(b.x - x * overlap, radius, width - radius);
      b.y = clamp(b.y - y * overlap, radius, height - radius);
    }
    for (let i = 0; i < dots.length; i++) {
      const p = distance(a, dots[i]) <= distance(b, dots[i]) ? a : b;
      if (distance(p, dots[i]) > radius + dotRadius) continue;
      p.score++;
      dots[i] = newDot();
      if (p.score >= Number(goal.value)) {
        game = 'done';
        showState(p === a ? 'Победил жёлтый игрок' : 'Победил синий игрок');
        return;
      }
      showState('Матч идёт');
    }
  }
  function frame(now) {
    if (game !== 'playing') return;
    move(Math.min((now - last) / 1000, 0.04));
    last = now;
    draw();
    if (game === 'playing') loopId = requestAnimationFrame(frame);
  }
  function pause() {
    if (game !== 'playing') return;
    game = 'paused';
    keys.clear();
    pointers.clear();
    target.fill(null);
    cancelAnimationFrame(loopId);
    showState('Пауза');
  }
  toggle.addEventListener('click', () => {
    if (game === 'playing') {
      pause();
      return;
    }
    if (game === 'done') setup();
    game = 'playing';
    last = performance.now();
    showState('Матч идёт');
    arena.focus({ preventScroll: true });
    loopId = requestAnimationFrame(frame);
  });
  reset.addEventListener('click', setup);
  mode.addEventListener('change', setup);
  goal.addEventListener('change', setup);
  function trackKeys(e, down) {
    if (
      !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code) ||
      game !== 'playing'
    )
      return;
    e.preventDefault();
    if (down) keys.add(e.code);
    else keys.delete(e.code);
  }
  window.addEventListener('keydown', (e) => trackKeys(e, true));
  window.addEventListener('keyup', (e) => trackKeys(e, false));
  window.addEventListener('blur', pause);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
  });
  function aim(e) {
    const index = pointers.get(e.pointerId);
    if (index === undefined) return;
    const rect = arena.getBoundingClientRect();
    target[index] = {
      x: clamp(((e.clientX - rect.left) * width) / rect.width, radius, width - radius),
      y: clamp(((e.clientY - rect.top) * height) / rect.height, radius, height - radius),
    };
  }
  arena.addEventListener('pointerdown', (e) => {
    if (game !== 'playing') return;
    const used = [...pointers.values()];
    const index = !used.includes(0) ? 0 : mode.value === 'human' && !used.includes(1) ? 1 : -1;
    if (index < 0) return;
    pointers.set(e.pointerId, index);
    arena.setPointerCapture(e.pointerId);
    aim(e);
  });
  arena.addEventListener('pointermove', aim);
  arena.addEventListener('pointerup', (e) => pointers.delete(e.pointerId));
  arena.addEventListener('lostpointercapture', (e) => pointers.delete(e.pointerId));
  setup();
  resize();
  tint('p0', 'round', players[0].color);
  tint('p1', 'round', players[1].color);
  tint('dot', 'dot', '#fb8500');
  new ResizeObserver(resize).observe(arena);
})();
