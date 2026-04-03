import { getPlayers } from '../data.js';

const MODES = [
  { id: 'carrera', emoji: '🏟️', name: 'La Carrera', desc: 'Clubes donde jugó', color: '#2e7d32' },
  { id: 'companeros', emoji: '🤝', name: 'Compañeros', desc: 'Compañeros de equipo', color: '#1565c0' },
  { id: 'pasaporte', emoji: '🛂', name: 'Pasaporte', desc: 'Países donde jugó', color: '#6a1b9a' },
  { id: 'quiensoy', emoji: '🎭', name: 'Quién Soy', desc: 'Pistas y datos', color: '#e65100' },
  { id: 'conexion', emoji: '🔗', name: 'Conexión', desc: 'Club en común', color: '#00838f' },
  { id: 'linea', emoji: '📅', name: 'Línea de Tiempo', desc: 'Orden cronológico', color: '#ad1457' },
];

export function renderHome(container) {
  const total = getPlayers().length;

  container.innerHTML = `
    <div class="home">
      <div class="home-hero">
        <h1 class="home-title">⚽ FutQuiz</h1>
        <p class="home-subtitle">${total} jugadores para adivinar</p>
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
