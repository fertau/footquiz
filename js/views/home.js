import { getPlayers } from '../data.js';

// Historical footballs - one per session
const BALLS = [
  { name: 'T-Model 1930', year: '1930', bg: '#8B6914', pattern: 'radial-gradient(circle at 40% 35%, #a07828 0%, #6b4e12 60%, #4a3510 100%)', border: '#5a3e10', seams: '#6b4e12' },
  { name: 'Challenge 4-Star 1966', year: '1966', bg: '#c45a20', pattern: 'radial-gradient(circle at 40% 35%, #d4722e 0%, #b04818 60%, #8a3610 100%)', border: '#7a3010', seams: '#9a4015' },
  { name: 'Telstar 1970', year: '1970', bg: '#fff', pattern: 'radial-gradient(circle at 40% 35%, #ffffff 0%, #e8e8e8 70%, #d0d0d0 100%)', border: '#999', seams: '#333', dark: true },
  { name: 'Tango 1978', year: '1978', bg: '#fff', pattern: 'radial-gradient(circle at 40% 35%, #ffffff 0%, #f0f0f0 70%, #ddd 100%)', border: '#888', seams: '#222', dark: true },
  { name: 'Azteca 1986', year: '1986', bg: '#fff', pattern: 'radial-gradient(circle at 40% 35%, #ffffff 0%, #f5f5f5 60%, #e0e0e0 100%)', border: '#777', seams: '#444', dark: true },
  { name: 'Etrusco 1990', year: '1990', bg: '#fff', pattern: 'radial-gradient(circle at 38% 33%, #ffffff 0%, #f0f0f0 70%, #ddd 100%)', border: '#888', seams: '#333', dark: true },
  { name: 'Questra 1994', year: '1994', bg: '#fff', pattern: 'radial-gradient(circle at 40% 35%, #ffffff 0%, #f0f0f0 60%, #e5e5e5 100%)', border: '#aaa', seams: '#555', dark: true },
  { name: 'Fevernova 2002', year: '2002', bg: '#f5f5f0', pattern: 'radial-gradient(circle at 40% 35%, #ffffff 0%, #f5f0e5 60%, #e8e0d0 100%)', border: '#c4a035', seams: '#c4a035' },
  { name: 'Teamgeist 2006', year: '2006', bg: '#fff', pattern: 'radial-gradient(circle at 38% 33%, #ffffff 0%, #f0f0f0 60%, #ddd 100%)', border: '#999', seams: '#333', dark: true },
  { name: 'Jabulani 2010', year: '2010', bg: '#fff', pattern: 'radial-gradient(circle at 40% 35%, #ffffff 0%, #f5f5f5 60%, #e8e8e8 100%)', border: '#ccc', seams: '#666', dark: true },
  { name: 'Brazuca 2014', year: '2014', bg: '#fff', pattern: 'radial-gradient(circle at 38% 33%, #ffffff 0%, #f5f5f5 60%, #eee 100%)', border: '#e65100', seams: '#1b5e20' },
  { name: 'Al Rihla 2022', year: '2022', bg: '#fff', pattern: 'radial-gradient(circle at 40% 35%, #ffffff 0%, #f8f8f8 60%, #eee 100%)', border: '#1a237e', seams: '#b71c1c' },
];

function getSessionBall() {
  const key = 'futquiz_ball_session';
  const stored = sessionStorage.getItem(key);
  if (stored) {
    const idx = parseInt(stored, 10);
    if (idx >= 0 && idx < BALLS.length) return BALLS[idx];
  }
  const idx = Math.floor(Math.random() * BALLS.length);
  sessionStorage.setItem(key, idx.toString());
  return BALLS[idx];
}

const MODES = [
  { id: 'carrera', emoji: '🏟️', name: 'La Carrera', desc: 'Clubes donde jugó', color: '#2e7d32' },
  { id: 'companeros', emoji: '🤝', name: 'Compañeros', desc: 'Compañeros de equipo', color: '#1565c0' },
  { id: 'pasaporte', emoji: '🛂', name: 'Pasaporte', desc: 'Países donde jugó', color: '#6a1b9a' },
  { id: 'quiensoy', emoji: '🎭', name: 'Quién Soy', desc: 'Pistas y datos', color: '#e65100' },
  { id: 'conexion', emoji: '🔗', name: 'Conexión', desc: 'Club en común', color: '#00838f' },
  { id: 'linea', emoji: '📅', name: 'Línea de Tiempo', desc: 'Orden cronológico', color: '#ad1457' },
];

export function renderHome(container) {
  const ball = getSessionBall();

  container.innerHTML = `
    <div class="home">
      <div class="home-hero">
        <div class="home-ball" style="background: ${ball.pattern}; border-color: ${ball.border};">
          <div class="ball-seam ball-seam-h" style="background: ${ball.seams};"></div>
          <div class="ball-seam ball-seam-v" style="background: ${ball.seams};"></div>
          ${ball.dark ? '<div class="ball-pentagon" style="background: ' + ball.seams + ';"></div>' : ''}
          <div class="ball-shine"></div>
        </div>
        <h1 class="home-title">FutQuiz</h1>
        <p class="home-subtitle">${ball.name}</p>
      </div>
      <div class="home-section-label">Adiviná al jugador</div>
      <div class="mode-grid">
        ${MODES.map(m => `
          <button class="mode-btn" data-mode="${m.id}" style="--mode-color: ${m.color}">
            <span class="mode-emoji">${m.emoji}</span>
            <div class="mode-text">
              <span class="mode-name">${m.name}</span>
              <span class="mode-desc">${m.desc}</span>
            </div>
          </button>
        `).join('')}
      </div>
      <div class="home-section-label">Trivia</div>
      <button class="trivia-home-btn" id="trivia-btn">
        <span class="trivia-emoji">🧠</span>
        <div class="trivia-info">
          <span class="trivia-title">Trivia Futbolera</span>
          <span class="mode-desc">Mundiales, finales épicas, clásicos</span>
        </div>
        <span class="trivia-arrow">›</span>
      </button>
      <button class="how-to-play-btn">¿Cómo se juega?</button>
    </div>
  `;

  container.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      location.hash = `#/categorias/${btn.dataset.mode}`;
    });
  });

  document.getElementById('trivia-btn').addEventListener('click', () => {
    location.hash = '#/trivia';
  });

  container.querySelector('.how-to-play-btn').addEventListener('click', () => {
    showHowToPlay(container);
  });
}

function showHowToPlay(container) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h2>¿Cómo se juega?</h2>
      <p><strong>La Carrera:</strong> Te mostramos los clubes uno por uno. Menos pistas = más puntos.</p>
      <p><strong>Compañeros:</strong> Te damos compañeros. Adiviná con quién jugaron todos.</p>
      <p><strong>Pasaporte:</strong> Países donde jugó.</p>
      <p><strong>Quién Soy:</strong> Pistas genéricas: posición, década, datos.</p>
      <p><strong>Conexión:</strong> Dos jugadores. ¿Club en común?</p>
      <p><strong>Línea de Tiempo:</strong> Ordená los clubes cronológicamente.</p>
      <p><strong>Trivia:</strong> Preguntas de mundiales, finales y clásicos.</p>
      <button class="modal-close">Entendido</button>
    </div>
  `;
  container.appendChild(overlay);
  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}
