import { generateShareText, getMaxPossibleScore } from '../game.js';
import { getCategories, updateStats, getStats, getPlayers } from '../data.js';

let savedState = null;

export function setResultState(state) {
  savedState = state;
}

export function renderResult(container) {
  const state = savedState;
  if (!state) {
    location.hash = '#/';
    return;
  }

  const cat = getCategories().find(c => c.id === state.categoryId);
  const catName = cat ? cat.nombre : '';
  const maxScore = getMaxPossibleScore(state);
  const correct = state.results.filter(r => r.correct).length;
  const total = state.results.length;

  // Update stats
  const stats = updateStats(state.results);

  let emoji = '😢';
  if (correct === total) emoji = '🏆';
  else if (correct >= total * 0.8) emoji = '🔥';
  else if (correct >= total * 0.5) emoji = '💪';
  else if (correct >= 1) emoji = '🤔';

  container.innerHTML = `
    <div class="header">
      <h1>Resultado</h1>
      <div class="header-sub">${catName}</div>
    </div>
    <div class="result">
      <div class="result-emoji">${emoji}</div>
      <div class="result-title">${correct}/${total} adivinados</div>
      <div class="result-score">${state.totalScore} <span>/ ${maxScore}</span></div>
      <div class="result-breakdown">
        ${state.results.map((r, i) => `
          <div class="result-row">
            <span class="result-icon">${r.correct ? '✅' : '❌'}</span>
            <span class="result-player">${r.player.nombre}</span>
            <span class="result-clues">${r.cluesUsed} pista${r.cluesUsed > 1 ? 's' : ''}${r.pistaExtra ? ' +💡' : ''}</span>
            <span class="result-pts">${r.points} pts</span>
          </div>
        `).join('')}
      </div>
      <div class="result-actions">
        <button class="share-btn" id="share-btn">📋 Compartir resultado</button>
        <button class="replay-btn" id="replay-btn">🔄 Jugar de nuevo</button>
      </div>
    </div>
  `;

  document.getElementById('share-btn').addEventListener('click', async () => {
    const text = generateShareText(state, catName);
    const btn = document.getElementById('share-btn');
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        btn.textContent = '✅ ¡Copiado!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = '📋 Compartir resultado';
          btn.classList.remove('copied');
        }, 2000);
      }
    } catch {
      // Fallback: show in textarea
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:90%;height:200px;z-index:999;font-size:14px;padding:12px;border-radius:8px;border:2px solid #4caf50;';
      document.body.appendChild(ta);
      ta.select();
      ta.addEventListener('blur', () => ta.remove());
    }
  });

  document.getElementById('replay-btn').addEventListener('click', () => {
    savedState = null;
    location.hash = '#/';
  });
}
