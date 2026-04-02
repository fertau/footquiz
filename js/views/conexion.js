import { getFlag, getPlayersForCategory, getCategories, normalize } from '../data.js';
import { generateConnectionPairs, checkConnectionGuess } from '../generators.js';
import {
  createGameState, getCurrentPlayer, registerChoiceResult,
  registerWrongGuess, advanceToNext, isGameOver
} from '../game.js';
import { setResultState } from './result.js';

let state = null;

export function renderConexion(container, params) {
  const { catId } = params;
  const allPlayers = getPlayersForCategory(catId)
    .filter(p => p.carrera && p.carrera.length >= 2);

  const pairs = generateConnectionPairs(allPlayers, 5);

  if (pairs.length < 2) {
    container.innerHTML = '<div class="home"><p>No hay suficientes conexiones en esta categoría.</p><button class="mode-btn" onclick="location.hash=\'#/\'">Volver</button></div>';
    return;
  }

  // Use pairs as the "players" array — each pair is one question
  state = createGameState('conexion', catId, pairs);
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
  const pair = getCurrentPlayer(state);

  container.innerHTML = `
    <div class="header">
      <button class="header-back" id="back-btn">\u2190</button>
      <h1>${catName}</h1>
      <div class="header-sub">Conexión</div>
    </div>
    <div class="game">
      <div class="game-progress">
        <span>Par ${current}/${total}</span>
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
      <div class="game-mode-label">¿En qué club jugaron juntos?</div>
      <div class="conexion-pair">
        <div class="conexion-player">
          <span class="conexion-flag">${getFlag(pair.playerA.nacionalidad)}</span>
          <span class="conexion-name">${pair.playerA.nombreCompleto || pair.playerA.nombre}</span>
        </div>
        <div class="conexion-vs">🤝</div>
        <div class="conexion-player">
          <span class="conexion-flag">${getFlag(pair.playerB.nacionalidad)}</span>
          <span class="conexion-name">${pair.playerB.nombreCompleto || pair.playerB.nombre}</span>
        </div>
      </div>
      <div id="answer-area"></div>
      <div class="guess-area" id="guess-area"></div>
    </div>
  `;

  document.getElementById('back-btn').addEventListener('click', () => {
    if (confirm('¿Seguro que querés salir?')) location.hash = '#/';
  });

  renderGuessArea();
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
      <input type="text" class="guess-input" id="guess-input" placeholder="Nombre del club..." autocomplete="off" autocorrect="off" spellcheck="false">
      <button class="guess-btn" id="guess-btn">OK</button>
    </div>
    <div class="game-actions">
      <button class="skip-btn" id="skip-btn">No sé 🏳️</button>
    </div>
  `;

  const input = document.getElementById('guess-input');
  const guessBtn = document.getElementById('guess-btn');
  const skipBtn = document.getElementById('skip-btn');

  const handleGuess = () => {
    const val = input.value.trim();
    if (!val) return;
    const pair = getCurrentPlayer(state);
    if (checkConnectionGuess(val, pair.validAnswers)) {
      const points = Math.max(0, 100 - state.attempts * 20);
      registerChoiceResult(state, true, points);
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
    registerChoiceResult(state, false, 0);
    showAnswer(false);
  });
}

function showAnswer(correct) {
  const pair = getCurrentPlayer(state);
  const answerArea = document.getElementById('answer-area');
  const guessArea = document.getElementById('guess-area');
  if (!answerArea) return;
  guessArea.innerHTML = '';

  const lastResult = state.results[state.results.length - 1];
  const points = lastResult ? lastResult.points : 0;

  answerArea.innerHTML = `
    <div class="answer-reveal ${correct ? 'correct' : 'wrong'}">
      <div class="answer-emoji">${correct ? '🎉' : '😔'}</div>
      <div class="answer-name">${pair.validAnswers.join(', ')}</div>
      <div class="answer-apodo">Club${pair.validAnswers.length > 1 ? 'es' : ''} en común</div>
      <div class="answer-points">${correct ? `+${points} puntos` : 'Sin puntos'}</div>
      <button class="answer-next-btn" id="next-pair-btn">
        ${state.currentIndex + 1 < state.players.length ? 'Siguiente par →' : 'Ver resultado'}
      </button>
    </div>
  `;

  document.getElementById('next-pair-btn').addEventListener('click', () => {
    advanceToNext(state);
    renderRound(document.getElementById('app'));
  });
}
