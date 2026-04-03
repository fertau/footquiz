import { getPlayers } from '../data.js';

export function renderHome(container) {
  container.innerHTML = `
    <div class="home">
      <div class="home-hero">
        <div class="home-logo">⚽</div>
        <h1 class="home-title">FutQuiz</h1>
        <p class="home-subtitle">Adiviná jugadores de fútbol con pistas de su carrera</p>
      </div>
      <div class="mode-grid">
        <button class="mode-btn" data-mode="carrera">
          <span class="mode-emoji">🏟️</span>
          <span class="mode-info">
            <span>La Carrera</span>
            <span class="mode-desc">Adiviná por los clubes donde jugó</span>
          </span>
        </button>
        <button class="mode-btn" data-mode="companeros">
          <span class="mode-emoji">🤝</span>
          <span class="mode-info">
            <span>Compañeros</span>
            <span class="mode-desc">¿Con quién jugaron todos estos?</span>
          </span>
        </button>
        <button class="mode-btn" data-mode="pasaporte">
          <span class="mode-emoji">🛂</span>
          <span class="mode-info">
            <span>El Pasaporte</span>
            <span class="mode-desc">Adiviná por los países donde jugó</span>
          </span>
        </button>
        <button class="mode-btn" data-mode="quiensoy">
          <span class="mode-emoji">🎭</span>
          <span class="mode-info">
            <span>Quién Soy</span>
            <span class="mode-desc">Pistas genéricas: posición, década, datos</span>
          </span>
        </button>
        <button class="mode-btn" data-mode="conexion">
          <span class="mode-emoji">🔗</span>
          <span class="mode-info">
            <span>Conexión</span>
            <span class="mode-desc">¿En qué club jugaron juntos?</span>
          </span>
        </button>
        <button class="mode-btn" data-mode="linea">
          <span class="mode-emoji">📅</span>
          <span class="mode-info">
            <span>Línea de Tiempo</span>
            <span class="mode-desc">Ordená los clubes cronológicamente</span>
          </span>
        </button>
      </div>
      <button class="how-to-play-btn">¿Cómo se juega?</button>
    </div>
  `;

  container.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      location.hash = `#/categorias/${btn.dataset.mode}`;
    });
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
      <h2>¿Cómo se juega? 🎮</h2>
      <p><strong>La Carrera:</strong> Te mostramos los clubes uno por uno. Cuantas menos pistas, más puntos.</p>
      <p><strong>Compañeros:</strong> Te damos compañeros de equipo. Adiviná con quién jugaron todos.</p>
      <p><strong>El Pasaporte:</strong> Te mostramos los países donde jugó.</p>
      <p><strong>Quién Soy:</strong> Pistas genéricas: posición, década, cantidad de clubes. ¿Podés adivinar?</p>
      <p><strong>Conexión:</strong> Dos jugadores. ¿En qué club jugaron juntos?</p>
      <p><strong>Línea de Tiempo:</strong> Clubes desordenados. Ponelos en orden cronológico.</p>
      <p>💡 En algunos modos podés pedir una <strong>pista extra</strong>, pero te resta puntos.</p>
      <button class="modal-close">¡Dale!</button>
    </div>
  `;
  container.appendChild(overlay);
  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}
