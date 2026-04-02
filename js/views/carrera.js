import { getFlag, checkGuess, getPlayersForCategory, getCategories } from '../data.js';
import {
  createGameState, getCurrentPlayer, getMaxClues, canRevealMore,
  revealNextClue, usePistaExtra, registerCorrectGuess, registerWrongGuess,
  registerGiveUp, advanceToNext, isGameOver
} from '../game.js';
import { setResultState } from './result.js';

let state = null;

export function renderCarrera(container, params) {
  const { catId } = params;
  const allPlayers = getPlayersForCategory(catId)
    .filter(p => p.carrera && p.carrera.length >= 2);

  // Shuffle and pick up to 5
  const shuffled = [...allPlayers].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(5, shuffled.length));

  if (selected.length === 0) {
    container.innerHTML = '<div class="home"><p>No hay suficientes jugadores para esta categoría.</p><button class="mode-btn" onclick="location.hash=\'#/\'">Volver</button></div>';
    return;
  }

  state = createGameState('carrera', catId, selected);
  renderRound(container);
}

function renderRound(container) {
  if (isGameOver(state)) {
    setResultState(state);
    location.hash = '#/resultado';
    return;
  }

  const player = getCurrentPlayer(state);
  const cat = getCategories().find(c => c.id === state.categoryId);
  const catName = cat ? cat.nombre : '';
  const total = state.players.length;
  const current = state.currentIndex + 1;
  const maxClues = getMaxClues(state);

  container.innerHTML = `
    <div class="header">
      <button class="header-back" id="back-btn">\u2190</button>
      <h1>${catName}</h1>
      <div class="header-sub">La Carrera</div>
    </div>
    <div class="game">
      <div class="game-progress">
        <span>Jugador ${current}/${total}</span>
        <span class="game-score">${state.totalScore} pts</span>
      </div>
      <div class="game-dots">
        ${state.players.map((_, i) => {
          let cls = '';
          if (i < state.currentIndex) {
            cls = state.results[i].correct ? 'correct' : 'wrong';
          } else if (i === state.currentIndex) {
            cls = 'active';
          }
          return `<div class="game-dot ${cls}"></div>`;
        }).join('')}
      </div>
      <div class="clues-area" id="clues-area"></div>
      <div id="answer-area"></div>
      <div class="guess-area" id="guess-area"></div>
    </div>
  `;

  document.getElementById('back-btn').addEventListener('click', () => {
    if (confirm('¿Seguro que querés salir? Se pierde el progreso.')) {
      location.hash = '#/';
    }
  });

  renderClues();
  renderGuessArea();
}

function renderClues() {
  const player = getCurrentPlayer(state);
  const cluesArea = document.getElementById('clues-area');
  if (!cluesArea) return;

  let html = '';
  for (let i = 0; i < player.carrera.length; i++) {
    if (i < state.cluesRevealed) {
      const c = player.carrera[i];
      html += `
        <div class="clue-card">
          <span class="clue-number">${i + 1}</span>
          <span class="clue-flag">${getFlag(c.pais)}</span>
          <span class="clue-text">${c.club}</span>
          <span class="clue-years">${c.anios}</span>
        </div>
      `;
    }
  }

  // Pista extra button (only if player has one and not resolved)
  if (player.pistaExtra && !state.resolved) {
    if (state.pistaExtraUsed) {
      html += `<div class="pista-extra-btn revealed">💡 ${player.pistaExtra}</div>`;
    } else {
      html += `<div class="pista-extra-btn" id="pista-extra-btn">💡 Pista extra disponible (-50 pts)</div>`;
    }
  }

  cluesArea.innerHTML = html;

  const pistaBtn = document.getElementById('pista-extra-btn');
  if (pistaBtn) {
    pistaBtn.addEventListener('click', () => {
      usePistaExtra(state);
      renderClues();
    });
  }
}

function renderGuessArea() {
  const guessArea = document.getElementById('guess-area');
  const answerArea = document.getElementById('answer-area');
  if (!guessArea) return;

  if (state.resolved) {
    guessArea.innerHTML = '';
    return;
  }

  const moreClues = canRevealMore(state);

  guessArea.innerHTML = `
    <div class="guess-row">
      <input type="text" class="guess-input" id="guess-input" placeholder="¿Quién es?" autocomplete="off" autocorrect="off" spellcheck="false">
      <button class="guess-btn" id="guess-btn">Adivinar</button>
    </div>
    <div class="game-actions">
      ${moreClues ? '<button class="next-clue-btn" id="next-clue-btn">Siguiente pista 👆</button>' : ''}
      <button class="skip-btn" id="skip-btn">${moreClues ? 'Me rindo 🏳️' : 'No sé 🏳️'}</button>
    </div>
  `;

  const input = document.getElementById('guess-input');
  const guessBtn = document.getElementById('guess-btn');
  const nextClueBtn = document.getElementById('next-clue-btn');
  const skipBtn = document.getElementById('skip-btn');

  input.focus();

  const handleGuess = () => {
    const val = input.value.trim();
    if (!val) return;
    const player = getCurrentPlayer(state);
    if (checkGuess(val, player)) {
      registerCorrectGuess(state);
      showAnswer(true);
    } else {
      registerWrongGuess(state);
      input.classList.add('wrong');
      input.value = '';
      setTimeout(() => input.classList.remove('wrong'), 400);
      input.focus();
    }
  };

  guessBtn.addEventListener('click', handleGuess);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleGuess();
  });

  if (nextClueBtn) {
    nextClueBtn.addEventListener('click', () => {
      revealNextClue(state);
      renderClues();
      renderGuessArea();
    });
  }

  skipBtn.addEventListener('click', () => {
    registerGiveUp(state);
    showAnswer(false);
  });
}

function showAnswer(correct) {
  const player = getCurrentPlayer(state);
  const answerArea = document.getElementById('answer-area');
  const guessArea = document.getElementById('guess-area');
  if (!answerArea) return;

  guessArea.innerHTML = '';

  const lastResult = state.results[state.results.length - 1];
  const points = lastResult ? lastResult.points : 0;

  answerArea.innerHTML = `
    <div class="answer-reveal ${correct ? 'correct' : 'wrong'}">
      <div class="answer-emoji">${correct ? '🎉' : '😔'}</div>
      <div class="answer-name">${getFlag(player.nacionalidad)} ${player.nombreCompleto || player.nombre}</div>
      ${player.apodo ? `<div style="color:var(--gray-600);font-size:0.9rem;">"${player.apodo}"</div>` : ''}
      <div class="answer-points">${correct ? `+${points} puntos` : 'Sin puntos'}</div>
      <button class="answer-next-btn" id="next-player-btn">
        ${state.currentIndex + 1 < state.players.length ? 'Siguiente jugador →' : 'Ver resultado'}
      </button>
    </div>
  `;

  // Show all clues
  state.cluesRevealed = getMaxClues(state);
  renderClues();

  document.getElementById('next-player-btn').addEventListener('click', () => {
    advanceToNext(state);
    renderRound(document.getElementById('app'));
  });
}
