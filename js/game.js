// Game state management

export function createGameState(mode, categoryId, playerList, modeConfig = {}) {
  return {
    mode,
    categoryId,
    players: playerList,
    currentIndex: 0,
    totalScore: 0,
    results: [], // { player, correct, cluesUsed, pistaExtra, attempts, points }
    // Per-player state (reset each round)
    cluesRevealed: 1,
    pistaExtraUsed: false,
    attempts: 0,
    resolved: false,
    modeConfig
  };
}

export function getCurrentPlayer(state) {
  return state.players[state.currentIndex] || null;
}

export function getMaxClues(state) {
  const player = getCurrentPlayer(state);
  if (!player) return 0;
  switch (state.mode) {
    case 'carrera': return player.carrera.length;
    case 'companeros': return player.companeros.length;
    case 'pasaporte': return player.paises.length;
    case 'quiensoy': return state.modeConfig.clues ? state.modeConfig.clues.length : 0;
    default: return 0;
  }
}

export function canRevealMore(state) {
  return state.cluesRevealed < getMaxClues(state);
}

export function revealNextClue(state) {
  if (canRevealMore(state)) {
    state.cluesRevealed++;
  }
  return state;
}

export function usePistaExtra(state) {
  state.pistaExtraUsed = true;
  return state;
}

export function calculatePoints(state) {
  const player = getCurrentPlayer(state);
  if (!player) return 0;
  const maxPoints = (player.tier || 2) * 100;
  const totalClues = getMaxClues(state);
  if (totalClues === 0) return maxPoints;
  const penaltyPerClue = maxPoints / totalClues;
  const pistaExtraPenalty = state.pistaExtraUsed ? 50 : 0;
  const attemptPenalty = state.attempts * 10;
  const points = maxPoints
    - (state.cluesRevealed - 1) * penaltyPerClue
    - pistaExtraPenalty
    - attemptPenalty;
  return Math.max(0, Math.round(points));
}

export function registerCorrectGuess(state) {
  const player = getCurrentPlayer(state);
  const points = calculatePoints(state);
  state.resolved = true;
  state.results.push({
    player,
    correct: true,
    cluesUsed: state.cluesRevealed,
    pistaExtra: state.pistaExtraUsed,
    attempts: state.attempts,
    points
  });
  state.totalScore += points;
  return state;
}

export function registerWrongGuess(state) {
  state.attempts++;
  return state;
}

export function registerGiveUp(state) {
  const player = getCurrentPlayer(state);
  state.resolved = true;
  state.results.push({
    player,
    correct: false,
    cluesUsed: state.cluesRevealed,
    pistaExtra: state.pistaExtraUsed,
    attempts: state.attempts,
    points: 0
  });
  return state;
}

// For modes that don't use text input (linea, conexion scoring)
export function registerChoiceResult(state, correct, points) {
  const player = getCurrentPlayer(state);
  state.resolved = true;
  state.results.push({
    player,
    correct,
    cluesUsed: state.cluesRevealed,
    pistaExtra: false,
    attempts: state.attempts,
    points: correct ? points : 0
  });
  if (correct) state.totalScore += points;
  return state;
}

export function advanceToNext(state) {
  state.currentIndex++;
  state.cluesRevealed = 1;
  state.pistaExtraUsed = false;
  state.attempts = 0;
  state.resolved = false;
  return state;
}

export function isGameOver(state) {
  return state.currentIndex >= state.players.length;
}

export function getMaxPossibleScore(state) {
  if (state.mode === 'conexion') {
    return state.players.length * 100;
  }
  if (state.mode === 'linea') {
    return state.players.length * 100;
  }
  return state.players.reduce((sum, p) => sum + (p.tier || 2) * 100, 0);
}

export function generateShareText(state, categoryName) {
  const modeNames = {
    carrera: 'La Carrera', companeros: 'Compañeros', pasaporte: 'El Pasaporte',
    quiensoy: 'Quién Soy', conexion: 'Conexión', linea: 'Línea de Tiempo'
  };
  const modeName = modeNames[state.mode] || state.mode;
  let text = `\u26BD\u{1F9E9} FutQuiz \u2014 ${modeName}\n`;
  text += `Categor\u00eda: ${categoryName}\n\n`;
  state.results.forEach((r, i) => {
    const icon = r.correct ? '\u2705' : '\u274C';
    const blocks = r.cluesUsed > 0
      ? Array.from({ length: r.cluesUsed }, () => '\u2B1B').join('')
      : '';
    const extra = r.pistaExtra ? '\u{1F4A1}' : '';
    const detail = r.correct ? `(${r.cluesUsed} pista${r.cluesUsed > 1 ? 's' : ''})` : '';
    text += `${i + 1}. ${icon} ${blocks}${extra} ${detail}\n`;
  });
  text += `\nPuntaje: ${state.totalScore}/${getMaxPossibleScore(state)} \u{1F3C6}\n`;
  return text;
}
