import { getRandomCategories, getPlayersForCategory } from '../data.js';

let currentSelection = null;

export function renderCategories(container, params) {
  const mode = params.modo;
  if (!currentSelection) {
    currentSelection = getRandomCategories(12);
  }

  render(container, mode);
}

function render(container, mode) {
  const modeNames = { carrera: 'La Carrera', companeros: 'Compañeros', pasaporte: 'El Pasaporte' };
  const modeName = modeNames[mode] || mode;

  // Filter categories that have enough players for this mode
  const validCategories = currentSelection.filter(cat => {
    const players = getPlayersForCategory(cat.id);
    return players.length >= 3 && players.every(p => {
      if (mode === 'carrera') return p.carrera && p.carrera.length >= 2;
      if (mode === 'companeros') return p.companeros && p.companeros.length >= 3;
      if (mode === 'pasaporte') return p.paises && p.paises.length >= 3;
      return false;
    });
  });

  container.innerHTML = `
    <div class="header">
      <button class="header-back" onclick="location.hash='#/'">\u2190</button>
      <h1>${modeName}</h1>
      <div class="header-sub">Elegí una categoría</div>
    </div>
    <div class="categories">
      <div class="cat-grid">
        ${validCategories.map(cat => `
          <div class="cat-card" data-cat="${cat.id}">
            <span class="cat-emoji">${cat.emoji}</span>
            <span class="cat-name">${cat.nombre}</span>
            <span class="cat-desc">${cat.descripcion}</span>
          </div>
        `).join('')}
      </div>
      <button class="shuffle-btn">🔀 Mezclar</button>
    </div>
  `;

  container.querySelectorAll('.cat-card').forEach(card => {
    card.addEventListener('click', () => {
      const catId = card.dataset.cat;
      location.hash = `#/jugar/${mode}/${catId}`;
    });
  });

  container.querySelector('.shuffle-btn').addEventListener('click', () => {
    currentSelection = getRandomCategories(12);
    render(container, mode);
  });
}
