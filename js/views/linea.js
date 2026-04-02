import { getFlag, getPlayersForCategory, getCategories } from '../data.js';
import { generateTimelineQuestions } from '../generators.js';
import {
  createGameState, getCurrentPlayer, registerChoiceResult,
  advanceToNext, isGameOver
} from '../game.js';
import { setResultState } from './result.js';

let state = null;
let userOrder = [];

export function renderLinea(container, params) {
  const { catId } = params;
  const allPlayers = getPlayersForCategory(catId)
    .filter(p => p.carrera && p.carrera.length >= 3);

  const questions = generateTimelineQuestions(allPlayers, 5);

  if (questions.length < 2) {
    container.innerHTML = '<div class="home"><p>No hay suficientes jugadores con carrera larga.</p><button class="mode-btn" onclick="location.hash=\'#/\'">Volver</button></div>';
    return;
  }

  state = createGameState('linea', catId, questions);
  renderRound(container);
}

function renderRound(container) {
  if (isGameOver(state)) {
    setResultState(state);
    location.hash = '#/resultado';
    return;
  }

  userOrder = [];
  const question = getCurrentPlayer(state);
  const cat = getCategories().find(c => c.id === state.categoryId);
  const catName = cat ? cat.nombre : '';
  const total = state.players.length;
  const current = state.currentIndex + 1;

  container.innerHTML = `
    <div class="header">
      <button class="header-back" id="back-btn">\u2190</button>
      <h1>${catName}</h1>
      <div class="header-sub">Línea de Tiempo</div>
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
      <div class="game-mode-label">
        ${getFlag(question.player.nacionalidad)} <strong>${question.player.nombre}</strong> — Ordená los clubes cronológicamente
      </div>
      <div class="timeline-cards" id="timeline-cards"></div>
      <div id="answer-area"></div>
      <div class="guess-area" id="guess-area">
        <button class="guess-btn timeline-confirm-btn" id="confirm-btn" disabled>Confirmar orden</button>
        <div class="game-actions">
          <button class="skip-btn" id="skip-btn">No sé 🏳️</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('back-btn').addEventListener('click', () => {
    if (confirm('¿Seguro que querés salir?')) location.hash = '#/';
  });

  renderTimelineCards();

  document.getElementById('confirm-btn').addEventListener('click', submitOrder);
  document.getElementById('skip-btn').addEventListener('click', () => {
    registerChoiceResult(state, false, 0);
    showAnswer();
  });
}

function renderTimelineCards() {
  const question = getCurrentPlayer(state);
  const cardsContainer = document.getElementById('timeline-cards');
  if (!cardsContainer) return;

  cardsContainer.innerHTML = question.stints.map((stint, idx) => {
    const orderPos = userOrder.indexOf(idx);
    const isSelected = orderPos !== -1;
    return `
      <div class="timeline-card ${isSelected ? 'selected' : ''}" data-idx="${idx}">
        <span class="timeline-badge">${isSelected ? orderPos + 1 : ''}</span>
        <span class="timeline-flag">${getFlag(stint.pais)}</span>
        <span class="timeline-club">${stint.club}</span>
      </div>
    `;
  }).join('');

  // Add click handlers
  cardsContainer.querySelectorAll('.timeline-card').forEach(card => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.dataset.idx, 10);
      const pos = userOrder.indexOf(idx);
      if (pos !== -1) {
        // Deselect: remove this and all after it
        userOrder = userOrder.slice(0, pos);
      } else {
        userOrder.push(idx);
      }
      renderTimelineCards();

      // Enable confirm when all selected
      const confirmBtn = document.getElementById('confirm-btn');
      if (confirmBtn) {
        confirmBtn.disabled = userOrder.length !== question.stints.length;
      }
    });
  });
}

function submitOrder() {
  const question = getCurrentPlayer(state);

  // Check correctness: compare user order to correct chronological order
  let correctCount = 0;
  for (let i = 0; i < userOrder.length; i++) {
    const stintIdx = userOrder[i];
    if (question.stints[stintIdx].correctOrder === i) {
      correctCount++;
    }
  }

  const total = question.stints.length;
  const allCorrect = correctCount === total;
  const points = allCorrect ? 100 : Math.round((correctCount / total) * 60);

  registerChoiceResult(state, allCorrect, points);
  showAnswer();
}

function showAnswer() {
  const question = getCurrentPlayer(state);
  const answerArea = document.getElementById('answer-area');
  const guessArea = document.getElementById('guess-area');
  const cardsContainer = document.getElementById('timeline-cards');
  if (!answerArea) return;

  guessArea.innerHTML = '';

  const lastResult = state.results[state.results.length - 1];
  const correct = lastResult?.correct;
  const points = lastResult?.points || 0;

  // Show correct order with years
  const correctOrder = [...question.stints].sort((a, b) => a.correctOrder - b.correctOrder);

  cardsContainer.innerHTML = correctOrder.map((stint, i) => {
    // Check if user had this position right
    const userStintIdx = question.stints.indexOf(stint);
    const userPos = userOrder.indexOf(userStintIdx);
    const isCorrectPos = userPos === i;

    return `
      <div class="timeline-card ${isCorrectPos ? 'timeline-correct' : 'timeline-wrong'}">
        <span class="timeline-badge">${i + 1}</span>
        <span class="timeline-flag">${getFlag(stint.pais)}</span>
        <span class="timeline-club">${stint.club}</span>
        <span class="clue-years">${stint.anios}</span>
      </div>
    `;
  }).join('');

  answerArea.innerHTML = `
    <div class="answer-reveal ${correct ? 'correct' : 'wrong'}" style="margin-top:12px;">
      <div class="answer-emoji">${correct ? '🎉' : '😔'}</div>
      <div class="answer-points">${points > 0 ? `+${points} puntos` : 'Sin puntos'}</div>
      <button class="answer-next-btn" id="next-player-btn">
        ${state.currentIndex + 1 < state.players.length ? 'Siguiente jugador →' : 'Ver resultado'}
      </button>
    </div>
  `;

  document.getElementById('next-player-btn').addEventListener('click', () => {
    advanceToNext(state);
    renderRound(document.getElementById('app'));
  });
}
