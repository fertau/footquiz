// Effects module: confetti, haptic, animations, transitions

// === Confetti ===
const CONFETTI_COLORS = ['#2e7d32', '#43a047', '#ffd600', '#ff9800', '#1565c0', '#e91e63', '#9c27b0'];

export function confetti(container = document.body) {
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti-canvas';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const pieces = Array.from({ length: 80 }, () => ({
    x: canvas.width / 2 + (Math.random() - 0.5) * 100,
    y: canvas.height * 0.4,
    vx: (Math.random() - 0.5) * 12,
    vy: -Math.random() * 14 - 4,
    w: Math.random() * 8 + 4,
    h: Math.random() * 6 + 3,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    rotation: Math.random() * 360,
    vr: (Math.random() - 0.5) * 12,
    gravity: 0.25 + Math.random() * 0.1,
    opacity: 1
  }));

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (const p of pieces) {
      p.x += p.vx;
      p.vy += p.gravity;
      p.y += p.vy;
      p.rotation += p.vr;
      p.vx *= 0.99;
      if (frame > 40) p.opacity -= 0.015;
      if (p.opacity <= 0) continue;
      alive = true;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    frame++;
    if (alive && frame < 120) {
      requestAnimationFrame(draw);
    } else {
      canvas.remove();
    }
  }
  requestAnimationFrame(draw);
}

// === Mini confetti burst (for single correct answer) ===
export function miniConfetti(element) {
  if (!element) return;
  const rect = element.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  for (let i = 0; i < 12; i++) {
    const dot = document.createElement('div');
    dot.className = 'mini-confetti-dot';
    dot.style.left = cx + 'px';
    dot.style.top = cy + 'px';
    dot.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    dot.style.setProperty('--tx', (Math.random() - 0.5) * 120 + 'px');
    dot.style.setProperty('--ty', -Math.random() * 80 - 20 + 'px');
    document.body.appendChild(dot);
    setTimeout(() => dot.remove(), 700);
  }
}

// === Animated counter ===
export function animateCounter(element, from, to, duration = 600) {
  if (!element) return;
  const start = performance.now();
  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // ease in-out
    const current = Math.round(from + (to - from) * eased);
    element.textContent = current;
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// === Haptic feedback ===
export function haptic(type = 'light') {
  if (!navigator.vibrate) return;
  switch (type) {
    case 'light': navigator.vibrate(10); break;
    case 'medium': navigator.vibrate(25); break;
    case 'heavy': navigator.vibrate([30, 30, 30]); break;
    case 'error': navigator.vibrate([50, 30, 50]); break;
    case 'success': navigator.vibrate([10, 50, 20]); break;
  }
}

// === Page transition ===
export function pageTransition(container, renderFn) {
  container.style.opacity = '0';
  container.style.transform = 'translateY(8px)';
  setTimeout(() => {
    renderFn();
    container.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    container.style.opacity = '1';
    container.style.transform = 'translateY(0)';
    setTimeout(() => {
      container.style.transition = '';
      container.style.transform = '';
    }, 300);
  }, 100);
}

// === Score pop ===
export function scorePop(element) {
  if (!element) return;
  element.style.transition = 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)';
  element.style.transform = 'scale(1.3)';
  setTimeout(() => {
    element.style.transform = 'scale(1)';
    setTimeout(() => { element.style.transition = ''; }, 200);
  }, 200);
}
