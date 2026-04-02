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
      <p><strong>La Carrera:</strong> Te mostramos los clubes de un jugador uno por uno. Cuantas menos pistas necesites, más puntos sumás.</p>
      <p><strong>Compañeros:</strong> Te damos nombres de compañeros de equipo en distintos clubes. Vos tenés que adivinar quién jugó con todos.</p>
      <p><strong>El Pasaporte:</strong> Te mostramos los países donde jugó, en orden. Adiviná quién es.</p>
      <p>💡 En cada ronda podés pedir una <strong>pista extra</strong> si está disponible, pero te resta puntos.</p>
      <p>Elegí una categoría y a jugar. ¡Suerte! 🍀</p>
      <button class="modal-close">¡Dale!</button>
    </div>
  `;
  container.appendChild(overlay);
  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}
