import { getFlag, checkGuess, getPlayersForCategory, getCategories } from '../data.js';
import {
  createGameState, getCurrentPlayer, getMaxClues, canRevealMore,
  revealNextClue, usePistaExtra, registerCorrectGuess, registerWrongGuess,
  registerGiveUp, advanceToNext, isGameOver
} from '../game.js';
import { setResultState } from './result.js';

let state = null;

export function renderCompaneros(container, params) {
  const { catId } = params;
  const allPlayers = getPlayersForCategory(catId)
    .filter(p => p.companeros && p.companeros.length >= 3);

  const shuffled = [...allPlayers].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(5, shuffled.length));

  if (selected.length === 0) {
    container.innerHTML = '<div class="home"><p>No hay suficientes jugadores con datos de compañeros.</p><button class="mode-btn" onclick="location.hash=\'#/\'">Volver</button></div>';
    return;
  }

  state = createGameState('companeros', catId, selected);
  renderRound(container);
}

function renderRound(container) {
  if (isGameOver(state)) {
    setResultState(state);
    location.hash = '#/resultado';
    return;
  }

  const cat = getCategories().find(c => c.id === state.categoryId);
  const catName = cat ? cat.nombre : '';
  const total = state.players.length;
  const current = state.currentIndex + 1;

  container.innerHTML = `
    <div class="header">
      <button class="header-back" id="back-btn">\u2190</button>
      <h1>${catName}</h1>
      <div class="header-sub">Compañeros</div>
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
      <div class="game-mode-label">¿Con quién jugaron todos estos?</div>
      <div class="clues-area" id="clues-area"></div>
      <div id="next-clue-area" class="next-clue-area"></div>
      <div id="answer-area"></div>
      <div class="guess-area" id="guess-area"></div>
    </div>
  `;

  document.getElementById('back-btn').addEventListener('click', () => {
    if (confirm('¿Seguro que querés salir?')) location.hash = '#/';
  });

  renderClues();
  renderNextClueButton();
  renderGuessArea();
}

function renderClues() {
  const player = getCurrentPlayer(state);
  const cluesArea = document.getElementById('clues-area');
  if (!cluesArea) return;

  let html = '';
  for (let i = 0; i < player.companeros.length; i++) {
    if (i < state.cluesRevealed) {
      const c = player.companeros[i];
      html += `
        <div class="clue-card">
          <span class="clue-number">${i + 1}</span>
          <span class="clue-flag">🤝</span>
          <span class="clue-text">${c.nombre}</span>
          <span class="clue-years">${c.club}</span>
        </div>
      `;
    }
  }

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

function renderNextClueButton() {
  const area = document.getElementById('next-clue-area');
  if (!area) return;

  if (state.resolved || !canRevealMore(state)) {
    area.innerHTML = '';
    return;
  }

  area.innerHTML = `
    <button class="next-clue-btn" id="next-clue-btn">
      <span class="btn-icon">+</span> Siguiente pista
    </button>
  `;

  document.getElementById('next-clue-btn').addEventListener('click', () => {
    revealNextClue(state);
    renderClues();
    renderNextClueButton();
  });
}

function renderGuessArea() {
  const guessArea = document.getElementById('guess-area');
  if (!guessArea) return;

  if (state.resolved) {
    guessArea.innerHTML = '';
    return;
  }

  guessArea.innerHTML = `
    <div class="guess-row">
      <input type="text" class="guess-input" id="guess-input" placeholder="¿Quién es?" autocomplete="off" autocorrect="off" spellcheck="false">
      <button class="guess-btn" id="guess-btn">OK</button>
    </div>
    <div class="game-actions">
      <button class="skip-btn" id="skip-btn">Me rindo 🏳️</button>
    </div>
  `;

  const input = document.getElementById('guess-input');
  const guessBtn = document.getElementById('guess-btn');
  const skipBtn = document.getElementById('skip-btn');

  const handleGuess = () => {
    const val = input.value.trim();
    if (!val) return;
    if (checkGuess(val, getCurrentPlayer(state))) {
      registerCorrectGuess(state);
      showAnswer(true);
    } else {
      registerWrongGuess(state);
      input.classList.add('wrong');
      input.value = '';
      setTimeout(() => input.classList.remove('wrong'), 400);
    }
  };

  guessBtn.addEventListener('click', handleGuess);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleGuess(); });

  skipBtn.addEventListener('click', () => {
    registerGiveUp(state);
    showAnswer(false);
  });
}

function showAnswer(correct) {
  const player = getCurrentPlayer(state);
  const answerArea = document.getElementById('answer-area');
  const guessArea = document.getElementById('guess-area');
  const nextClueArea = document.getElementById('next-clue-area');
  if (!answerArea) return;
  guessArea.innerHTML = '';
  if (nextClueArea) nextClueArea.innerHTML = '';

  const lastResult = state.results[state.results.length - 1];
  const points = lastResult ? lastResult.points : 0;

  answerArea.innerHTML = `
    <div class="answer-reveal ${correct ? 'correct' : 'wrong'}">
      <div class="answer-emoji">${correct ? '🎉' : '😔'}</div>
      <div class="answer-name">${getFlag(player.nacionalidad)} ${player.nombreCompleto || player.nombre}</div>
      ${player.apodo ? `<div class="answer-apodo">"${player.apodo}"</div>` : ''}
      <div class="answer-points">${correct ? `+${points} puntos` : 'Sin puntos'}</div>
      <button class="answer-next-btn" id="next-player-btn">
        ${state.currentIndex + 1 < state.players.length ? 'Siguiente jugador →' : 'Ver resultado'}
      </button>
    </div>
  `;

  state.cluesRevealed = player.companeros.length;
  renderClues();

  document.getElementById('next-player-btn').addEventListener('click', () => {
    advanceToNext(state);
    renderRound(document.getElementById('app'));
  });
}
