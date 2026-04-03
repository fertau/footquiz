import { getRandomCategories, getPlayersForCategory } from '../data.js';
import { buildClubIndex } from '../generators.js';

let currentSelection = null;

export function renderCategories(container, params) {
  const mode = params.modo;
  if (!currentSelection) {
    currentSelection = getRandomCategories(20);
  }

  render(container, mode);
}

function checkModeViability(players, mode) {
  // Returns the count of players ready for this mode
  switch (mode) {
    case 'carrera':
      return players.filter(p => p.carrera && p.carrera.length >= 2).length;
    case 'companeros':
      return players.filter(p => p.companeros && p.companeros.length >= 3).length;
    case 'pasaporte':
      return players.filter(p => p.paises && p.paises.length >= 3).length;
    case 'quiensoy':
      return players.filter(p => p.carrera && p.carrera.length >= 2).length;
    case 'conexion': {
      // Need at least 2 players who share a club
      const clubIndex = buildClubIndex(players);
      let pairCount = 0;
      for (const [, playerIds] of clubIndex) {
        if (playerIds.size >= 2) pairCount++;
      }
      return pairCount >= 2 ? players.length : 0;
    }
    case 'linea':
      return players.filter(p => p.carrera && p.carrera.length >= 3).length;
    default:
      return 0;
  }
}

function render(container, mode) {
  const modeNames = {
    carrera: 'La Carrera', companeros: 'Compañeros', pasaporte: 'El Pasaporte',
    quiensoy: 'Quién Soy', conexion: 'Conexión', linea: 'Línea de Tiempo'
  };
  const modeName = modeNames[mode] || mode;

  const minPlayers = mode === 'conexion' ? 4 : 3;

  const validCategories = currentSelection.filter(cat => {
    const players = getPlayersForCategory(cat.id);
    return checkModeViability(players, mode) >= minPlayers;
  });

  container.innerHTML = `
    <div class="header">
      <button class="header-back" onclick="location.hash='#/'">\u2190</button>
      <h1>${modeName}</h1>
      <div class="header-sub">Elegí una categoría</div>
    </div>
    <div class="categories">
      ${validCategories.length === 0 ? '<p style="text-align:center;color:var(--gray-500);padding:32px;">No hay categorías disponibles para este modo. Probá mezclar.</p>' : ''}
      <div class="cat-grid">
        ${validCategories.map(cat => {
          const players = getPlayersForCategory(cat.id);
          const count = checkModeViability(players, mode);
          return `
            <div class="cat-card ripple" data-cat="${cat.id}">
              <span class="cat-emoji">${cat.emoji}</span>
              <span class="cat-name">${cat.nombre}</span>
              <span class="cat-count">${count} jugadores</span>
            </div>
          `;
        }).join('')}
      </div>
      <button class="shuffle-btn">🔀 Mezclar</button>
    </div>
  `;

  container.querySelectorAll('.cat-card').forEach(card => {
    card.addEventListener('click', () => {
      location.hash = `#/jugar/${mode}/${card.dataset.cat}`;
    });
  });

  container.querySelector('.shuffle-btn').addEventListener('click', () => {
    currentSelection = getRandomCategories(20);
    render(container, mode);
  });
}
