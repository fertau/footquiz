import { getCategories } from '../data.js';

let triviaData = null;
let state = null;

const TRIVIA_CATEGORIES = {
  mundiales: { nombre: 'Mundiales', emoji: '🏆🌍', descripcion: 'Todo sobre las Copas del Mundo' },
  finales: { nombre: 'Finales Épicas', emoji: '⚡🏟️', descripcion: 'Champions, Libertadores, ligas y más' },
  clasicos: { nombre: 'Clásicos', emoji: '⚔️🔥', descripcion: 'Boca-River, Real-Barça y más' },
};

async function loadTrivia() {
  if (triviaData) return triviaData;
  const files = ['trivia-mundiales.json', 'trivia-finales.json', 'trivia-clasicos.json'];
  const results = await Promise.all(
    files.map(f => fetch(`./data/${f}`).then(r => r.ok ? r.json() : []).catch(() => []))
  );
  triviaData = results.flat();
  return triviaData;
}

export async function renderTriviaMenu(container) {
  await loadTrivia();

  container.innerHTML = `
    <div class="header">
      <button class="header-back" onclick="location.hash='#/'">\u2190</button>
      <h1>Trivia Futbolera</h1>
      <div class="header-sub">Elegí un tema</div>
    </div>
    <div class="categories">
      <div class="cat-grid">
        ${Object.entries(TRIVIA_CATEGORIES).map(([id, cat]) => {
          const count = triviaData.filter(q => q.categoria === id).length;
          if (count < 5) return '';
          return `
            <div class="cat-card" data-cat="${id}">
              <span class="cat-emoji">${cat.emoji}</span>
              <span class="cat-name">${cat.nombre}</span>
              <span class="cat-desc">${cat.descripcion}</span>
            </div>
          `;
        }).join('')}
        <div class="cat-card" data-cat="all">
          <span class="cat-emoji">🎲</span>
          <span class="cat-name">Mezclado</span>
          <span class="cat-desc">De todo un poco</span>
        </div>
      </div>
    </div>
  `;

  container.querySelectorAll('.cat-card').forEach(card => {
    card.addEventListener('click', () => {
      const catId = card.dataset.cat;
      startTrivia(container, catId);
    });
  });
}

function startTrivia(container, categoryId) {
  let questions = categoryId === 'all'
    ? [...triviaData]
    : triviaData.filter(q => q.categoria === categoryId);

  // Shuffle and pick 10
  questions = questions.sort(() => Math.random() - 0.5).slice(0, 10);

  if (questions.length < 5) {
    container.innerHTML = '<div class="home"><p>No hay suficientes preguntas.</p><button class="mode-btn" onclick="location.hash=\'#/trivia\'">Volver</button></div>';
    return;
  }

  state = {
    questions,
    currentIndex: 0,
    score: 0,
    results: [], // { question, correct, selectedIndex }
    categoryId,
    categoryName: categoryId === 'all' ? 'Mezclado' : (TRIVIA_CATEGORIES[categoryId]?.nombre || categoryId)
  };

  renderQuestion(container);
}

function renderQuestion(container) {
  if (state.currentIndex >= state.questions.length) {
    renderTriviaResult(container);
    return;
  }

  const q = state.questions[state.currentIndex];
  const current = state.currentIndex + 1;
  const total = state.questions.length;

  container.innerHTML = `
    <div class="header">
      <button class="header-back" id="back-btn">\u2190</button>
      <h1>${state.categoryName}</h1>
      <div class="header-sub">Trivia Futbolera</div>
    </div>
    <div class="game">
      <div class="game-progress">
        <span>Pregunta ${current}/${total}</span>
        <span class="game-score">${state.score}/${current - 1}</span>
      </div>
      <div class="game-dots">
        ${state.questions.map((_, i) => {
          let cls = '';
          if (i < state.currentIndex) {
            cls = state.results[i].correct ? 'correct' : 'wrong';
          } else if (i === state.currentIndex) {
            cls = 'active';
          }
          return `<div class="game-dot ${cls}"></div>`;
        }).join('')}
      </div>
      <div class="trivia-consigna">${q.consigna}</div>
      <div class="trivia-pregunta">${q.pregunta}</div>
      <div class="trivia-opciones" id="trivia-opciones">
        ${q.opciones.map((op, i) => `
          <button class="trivia-opcion" data-idx="${i}">${op}</button>
        `).join('')}
      </div>
      <div id="trivia-feedback"></div>
    </div>
  `;

  document.getElementById('back-btn').addEventListener('click', () => {
    if (confirm('¿Seguro que querés salir?')) location.hash = '#/trivia';
  });

  // Add click handlers
  container.querySelectorAll('.trivia-opcion').forEach(btn => {
    btn.addEventListener('click', () => handleAnswer(container, parseInt(btn.dataset.idx, 10)));
  });
}

function handleAnswer(container, selectedIndex) {
  const q = state.questions[state.currentIndex];
  const correct = selectedIndex === q.respuesta;

  if (correct) state.score++;
  state.results.push({ question: q, correct, selectedIndex });

  // Disable all buttons and show correct/wrong
  const opciones = container.querySelectorAll('.trivia-opcion');
  opciones.forEach(btn => {
    btn.disabled = true;
    btn.style.pointerEvents = 'none';
    const idx = parseInt(btn.dataset.idx, 10);
    if (idx === q.respuesta) {
      btn.classList.add('trivia-correct');
    } else if (idx === selectedIndex && !correct) {
      btn.classList.add('trivia-wrong');
    } else {
      btn.style.opacity = '0.4';
    }
  });

  // Show fun fact
  const feedback = document.getElementById('trivia-feedback');
  feedback.innerHTML = `
    <div class="trivia-dato">
      <div class="trivia-dato-icon">${correct ? '✅' : '❌'}</div>
      <div class="trivia-dato-text">${q.dato}</div>
    </div>
    <button class="answer-next-btn" id="next-q-btn">
      ${state.currentIndex + 1 < state.questions.length ? 'Siguiente →' : 'Ver resultado'}
    </button>
  `;

  document.getElementById('next-q-btn').addEventListener('click', () => {
    state.currentIndex++;
    renderQuestion(container);
  });
}

function renderTriviaResult(container) {
  const total = state.questions.length;
  const score = state.score;

  let emoji = '😢';
  if (score === total) emoji = '🏆';
  else if (score >= total * 0.8) emoji = '🔥';
  else if (score >= total * 0.5) emoji = '💪';
  else if (score >= 1) emoji = '🤔';

  container.innerHTML = `
    <div class="header">
      <h1>Resultado</h1>
      <div class="header-sub">Trivia — ${state.categoryName}</div>
    </div>
    <div class="result">
      <div class="result-emoji">${emoji}</div>
      <div class="result-title">${score}/${total} correctas</div>
      <div class="result-breakdown">
        ${state.results.map((r, i) => `
          <div class="result-row">
            <span class="result-icon">${r.correct ? '✅' : '❌'}</span>
            <span class="result-player" style="font-size:0.8rem;">${r.question.consigna}</span>
          </div>
        `).join('')}
      </div>
      <div class="result-actions">
        <button class="share-btn" id="share-trivia">📋 Compartir</button>
        <button class="replay-btn" id="replay-trivia">🔄 Jugar de nuevo</button>
      </div>
    </div>
  `;

  document.getElementById('share-trivia').addEventListener('click', async () => {
    const text = `⚽🧩 FutQuiz Trivia — ${state.categoryName}\n${state.results.map((r, i) => `${i + 1}. ${r.correct ? '✅' : '❌'}`).join('\n')}\n\n${score}/${total} 🏆`;
    const btn = document.getElementById('share-trivia');
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        btn.textContent = '✅ ¡Copiado!';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = '📋 Compartir'; btn.classList.remove('copied'); }, 2000);
      }
    } catch {}
  });

  document.getElementById('replay-trivia').addEventListener('click', () => {
    location.hash = '#/trivia';
  });
}
