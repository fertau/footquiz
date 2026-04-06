import { getFlag, getPlayers, getPlayersForCategory, getCategories, selectPlayersForRound, updateStats } from '../data.js';
import { miniConfetti, haptic, scorePop } from '../effects.js';
import { setResultState } from './result.js';

const BEAT_POINTS = [100, 80, 60, 40, 20];
const MIN_NARRADOR_PLAYERS = 50;

let state = null;

function hasValidNarrativeClues(player) {
  return player.narrativeClues && Array.isArray(player.narrativeClues) && player.narrativeClues.length === 5;
}

export function getNarradorPlayerCount() {
  return getPlayers().filter(hasValidNarrativeClues).length;
}

export function isNarradorAvailable() {
  return getNarradorPlayerCount() >= MIN_NARRADOR_PLAYERS;
}

export function renderNarradorSetup(container, params) {
  const { catId } = params;
  const allPlayers = getPlayersForCategory(catId)
    .filter(hasValidNarrativeClues);

  const cat = getCategories().find(c => c.id === catId);
  const catName = cat ? cat.nombre : '';
  const available = allPlayers.length;

  container.innerHTML = `
    <div class="narrador-setup">
      <div class="home-logo">🎙️</div>
      <h2>Modo Narrador</h2>
      <p>${catName} — ${available} jugadores disponibles</p>
      <p>¿Cuántos jugadores querés adivinar?</p>
      <div class="narrador-length-options">
        ${[5, 10, 15].map(n => `
          <button class="narrador-length-btn ${n > available ? 'disabled' : ''}"
                  data-length="${n}" ${n > available ? 'disabled' : ''}>
            ${n}
          </button>
        `).join('')}
      </div>
      <button class="header-back" style="position:static;opacity:0.6;font-size:0.85rem;margin-top:var(--space-md);color:var(--dark-text-dim);background:none;border:none;cursor:pointer;font-family:var(--font);"
              id="narrador-back">← Volver</button>
    </div>
  `;

  container.querySelectorAll('.narrador-length-btn:not(.disabled)').forEach(btn => {
    btn.addEventListener('click', () => {
      const len = parseInt(btn.dataset.length, 10);
      const selected = selectPlayersForRound(allPlayers, len);
      startNarradorGame(container, catId, catName, selected);
    });
  });

  document.getElementById('narrador-back').addEventListener('click', () => {
    location.hash = '#/narrador';
  });
}

function startNarradorGame(container, catId, catName, players) {
  state = {
    mode: 'narrador',
    categoryId: catId,
    categoryName: catName,
    players,
    currentIndex: 0,
    currentBeat: 0,
    totalScore: 0,
    results: [],
  };
  renderNarradorRound(container);
}

function renderNarradorRound(container) {
  if (state.currentIndex >= state.players.length) {
    finishNarrador(container);
    return;
  }

  const player = state.players[state.currentIndex];
  const clues = player.narrativeClues;
  const beat = state.currentBeat;
  const total = state.players.length;
  const current = state.currentIndex + 1;

  // Progress dots
  const dots = state.players.map((_, i) => {
    if (i < state.results.length) {
      return state.results[i].correct
        ? '<span class="progress-dot correct">●</span>'
        : '<span class="progress-dot wrong">●</span>';
    }
    if (i === state.currentIndex) return '<span class="progress-dot current">●</span>';
    return '<span class="progress-dot">○</span>';
  }).join(' ');

  const allBeatsUsed = beat >= 5;

  container.innerHTML = `
    <div class="narrador-screen">
      <div class="header" style="background:var(--dark-surface);position:static;">
        <button class="header-back" id="narrador-back-game">←</button>
        <h1>Modo Narrador</h1>
        <div class="header-sub">${state.categoryName} — ${state.totalScore} pts</div>
      </div>
      <div class="progress-dots" style="padding:var(--space-md);text-align:center;">
        ${dots}
      </div>
      ${beat > 0 ? `
        <div class="narrador-beat-text" key="beat-${beat}">
          ${clues[beat - 1].text}
        </div>
      ` : `
        <div class="narrador-beat-text" style="color:var(--dark-text-dim);font-size:1.2rem;">
          Jugador ${current} de ${total}<br>Tocá "Siguiente pista" para empezar
        </div>
      `}
      <div class="narrador-beat-counter">
        ${beat > 0 ? `Beat ${beat} de 5` : ''}
      </div>
      <div class="narrador-actions">
        ${allBeatsUsed ? `
          <button class="narrador-actions button narrador-btn-reveal" id="narrador-reveal">Revelar</button>
          <button class="narrador-actions button narrador-btn-skip" id="narrador-skip">Saltar</button>
        ` : `
          <button class="narrador-actions button narrador-btn-next" id="narrador-next">Siguiente pista</button>
          <button class="narrador-actions button narrador-btn-correct" id="narrador-correct">¡Correcto!</button>
        `}
      </div>
    </div>
  `;

  // Back button — custom modal
  document.getElementById('narrador-back-game').addEventListener('click', () => {
    showExitModal(container);
  });

  if (allBeatsUsed) {
    document.getElementById('narrador-reveal').addEventListener('click', () => {
      recordResult(false, 0);
      showPlayerReveal(container, false);
    });
    document.getElementById('narrador-skip').addEventListener('click', () => {
      recordResult(false, 0);
      advancePlayer(container);
    });
  } else {
    document.getElementById('narrador-next').addEventListener('click', () => {
      state.currentBeat++;
      renderNarradorRound(container);
    });
    document.getElementById('narrador-correct').addEventListener('click', () => {
      const points = BEAT_POINTS[state.currentBeat > 0 ? state.currentBeat - 1 : 0];
      recordResult(true, points);
      showPlayerReveal(container, true);
    });
  }
}

function recordResult(correct, points) {
  const player = state.players[state.currentIndex];
  state.results.push({
    player,
    correct,
    cluesUsed: state.currentBeat,
    pistaExtra: false,
    attempts: 0,
    points,
  });
  if (correct) state.totalScore += points;
}

function showPlayerReveal(container, correct) {
  const player = state.players[state.currentIndex];
  const points = state.results[state.results.length - 1].points;
  const career = player.carrera
    .map(c => `${getFlag(c.pais)} ${c.club} (${c.anios})`)
    .join('<br>');

  container.innerHTML = `
    <div class="narrador-screen">
      <div class="narrador-reveal">
        <div class="narrador-reveal-flag">${getFlag(player.nacionalidad)}</div>
        <div class="narrador-reveal-name">${player.nombreCompleto || player.nombre}</div>
        ${player.apodo ? `<div class="narrador-reveal-apodo">"${player.apodo}"</div>` : ''}
        <div class="narrador-reveal-career">${career}</div>
        ${correct
          ? `<div class="narrador-reveal-points">+${points} puntos</div>`
          : `<div class="narrador-reveal-missed">Nadie adivinó</div>`
        }
        <button class="narrador-actions button narrador-btn-next" id="narrador-continue"
                style="width:100%;max-width:300px;margin-top:var(--space-lg);">
          ${state.currentIndex + 1 < state.players.length ? 'Siguiente jugador →' : 'Ver resultado'}
        </button>
      </div>
    </div>
  `;

  if (correct) {
    haptic('success');
    miniConfetti(container.querySelector('.narrador-reveal'));
  }

  document.getElementById('narrador-continue').addEventListener('click', () => {
    advancePlayer(container);
  });
}

function advancePlayer(container) {
  state.currentIndex++;
  state.currentBeat = 0;
  renderNarradorRound(container);
}

function finishNarrador(container) {
  // Update stats
  updateStats(state.results);

  // Build a state object compatible with the result view
  const resultState = {
    mode: 'narrador',
    categoryId: state.categoryId,
    players: state.players,
    currentIndex: state.currentIndex,
    totalScore: state.totalScore,
    results: state.results,
    modeConfig: {},
  };

  // Generate share text
  const shareText = generateNarradorShareText(state);
  resultState.shareText = shareText;

  setResultState(resultState);
  location.hash = '#/resultado';
}

function generateNarradorShareText(st) {
  let text = `⚽🎙️ FutQuiz — Modo Narrador\n`;
  text += `Categoría: ${st.categoryName}\n\n`;
  st.results.forEach((r, i) => {
    const icon = r.correct ? '✅' : '❌';
    const beats = r.cluesUsed > 0
      ? Array.from({ length: r.cluesUsed }, () => '⬛').join('')
      : '';
    const detail = r.correct ? `(beat ${r.cluesUsed}, +${r.points}pts)` : '';
    text += `${i + 1}. ${icon} ${beats} ${detail}\n`;
  });
  const maxPossible = st.players.length * 100;
  text += `\nPuntaje: ${st.totalScore}/${maxPossible} 🏆\n`;
  return text;
}

function showExitModal(container) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="background:var(--dark-surface);color:var(--dark-text);">
      <h2>¿Salir del juego?</h2>
      <p>Se pierde el progreso de esta partida.</p>
      <div style="display:flex;gap:var(--space-sm);margin-top:var(--space-md);">
        <button class="narrador-btn-skip" id="exit-cancel"
                style="flex:1;min-height:44px;border:none;border-radius:var(--radius-sm);font-family:var(--font);font-weight:700;cursor:pointer;background:var(--dark-surface);color:var(--dark-text-dim);border:1px solid rgba(255,255,255,0.1);">
          Seguir jugando
        </button>
        <button class="narrador-btn-reveal" id="exit-confirm"
                style="flex:1;min-height:44px;border:none;border-radius:var(--radius-sm);font-family:var(--font);font-weight:700;cursor:pointer;background:var(--red);color:white;">
          Salir
        </button>
      </div>
    </div>
  `;
  container.appendChild(overlay);

  document.getElementById('exit-cancel').addEventListener('click', () => overlay.remove());
  document.getElementById('exit-confirm').addEventListener('click', () => {
    overlay.remove();
    location.hash = '#/';
  });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}
