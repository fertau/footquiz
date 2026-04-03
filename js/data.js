// Data loading and indexing
let players = [];
let categories = [];
let playersById = {};

const FLAG_MAP = {
  'AR': '\u{1F1E6}\u{1F1F7}', 'BR': '\u{1F1E7}\u{1F1F7}',
  'UY': '\u{1F1FA}\u{1F1FE}', 'PY': '\u{1F1F5}\u{1F1FE}',
  'CO': '\u{1F1E8}\u{1F1F4}', 'CL': '\u{1F1E8}\u{1F1F1}',
  'PE': '\u{1F1F5}\u{1F1EA}', 'EC': '\u{1F1EA}\u{1F1E8}',
  'BO': '\u{1F1E7}\u{1F1F4}', 'VE': '\u{1F1FB}\u{1F1EA}',
  'MX': '\u{1F1F2}\u{1F1FD}', 'US': '\u{1F1FA}\u{1F1F8}',
  'CA': '\u{1F1E8}\u{1F1E6}',
  'GB-ENG': '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
  'GB-SCT': '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}',
  'GB-WLS': '\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}',
  'ES': '\u{1F1EA}\u{1F1F8}', 'IT': '\u{1F1EE}\u{1F1F9}',
  'FR': '\u{1F1EB}\u{1F1F7}', 'DE': '\u{1F1E9}\u{1F1EA}',
  'PT': '\u{1F1F5}\u{1F1F9}', 'NL': '\u{1F1F3}\u{1F1F1}',
  'BE': '\u{1F1E7}\u{1F1EA}', 'RU': '\u{1F1F7}\u{1F1FA}',
  'TR': '\u{1F1F9}\u{1F1F7}', 'GR': '\u{1F1EC}\u{1F1F7}',
  'UA': '\u{1F1FA}\u{1F1E6}', 'PL': '\u{1F1F5}\u{1F1F1}',
  'CZ': '\u{1F1E8}\u{1F1FF}', 'RO': '\u{1F1F7}\u{1F1F4}',
  'HU': '\u{1F1ED}\u{1F1FA}', 'SE': '\u{1F1F8}\u{1F1EA}',
  'DK': '\u{1F1E9}\u{1F1F0}', 'NO': '\u{1F1F3}\u{1F1F4}',
  'CH': '\u{1F1E8}\u{1F1ED}', 'AT': '\u{1F1E6}\u{1F1F9}',
  'IE': '\u{1F1EE}\u{1F1EA}', 'HR': '\u{1F1ED}\u{1F1F7}',
  'RS': '\u{1F1F7}\u{1F1F8}', 'BA': '\u{1F1E7}\u{1F1E6}',
  'AE': '\u{1F1E6}\u{1F1EA}', 'SA': '\u{1F1F8}\u{1F1E6}',
  'QA': '\u{1F1F6}\u{1F1E6}', 'JP': '\u{1F1EF}\u{1F1F5}',
  'KR': '\u{1F1F0}\u{1F1F7}', 'CN': '\u{1F1E8}\u{1F1F3}',
  'AU': '\u{1F1E6}\u{1F1FA}', 'IN': '\u{1F1EE}\u{1F1F3}',
  'CI': '\u{1F1E8}\u{1F1EE}', 'CM': '\u{1F1E8}\u{1F1F2}',
  'NG': '\u{1F1F3}\u{1F1EC}', 'SN': '\u{1F1F8}\u{1F1F3}',
  'GH': '\u{1F1EC}\u{1F1ED}', 'ZA': '\u{1F1FF}\u{1F1E6}',
  'MA': '\u{1F1F2}\u{1F1E6}', 'DZ': '\u{1F1E9}\u{1F1FF}',
  'TN': '\u{1F1F9}\u{1F1F3}', 'EG': '\u{1F1EA}\u{1F1EC}',
  'ML': '\u{1F1F2}\u{1F1F1}', 'GA': '\u{1F1EC}\u{1F1E6}',
  'LR': '\u{1F1F1}\u{1F1F7}', 'IL': '\u{1F1EE}\u{1F1F1}',
  'GE': '\u{1F1EC}\u{1F1EA}', 'CR': '\u{1F1E8}\u{1F1F7}',
  'JM': '\u{1F1EF}\u{1F1F2}',
};

export function getFlag(code) {
  return FLAG_MAP[code] || '\u{1F3F3}\u{FE0F}';
}

export async function loadData() {
  const [playersRes, categoriesRes] = await Promise.all([
    fetch('./data/players.json'),
    fetch('./data/categories.json')
  ]);
  players = await playersRes.json();
  categories = await categoriesRes.json();
  playersById = {};
  for (const p of players) {
    playersById[p.id] = p;
  }
  return { players, categories };
}

export function getPlayers() { return players; }
export function getCategories() { return categories; }
export function getPlayerById(id) { return playersById[id]; }

export function getPlayersForCategory(categoryId) {
  const cat = categories.find(c => c.id === categoryId);
  if (!cat) return [];
  return cat.jugadorIds.map(id => playersById[id]).filter(Boolean);
}

export function getRandomCategories(count = 20) {
  const shuffled = [...categories].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// Normalize text for matching guesses
export function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

// Levenshtein distance for typo tolerance
function levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}

// How many typos to allow based on word length
function maxTypos(len) {
  if (len <= 3) return 0;
  if (len <= 5) return 1;
  return 2;
}

// Fuzzy match: exact, substring, or within typo tolerance
export function fuzzyMatch(guess, target) {
  if (target === guess) return true;
  if (target.includes(guess) && guess.length >= 4) return true;
  // Typo tolerance on the last word of the guess (usually the surname)
  if (guess.length >= 4 && levenshtein(guess, target) <= maxTypos(target.length)) return true;
  // Also check each word of the target against the guess
  const targetWords = target.split(/\s+/);
  return targetWords.some(tw =>
    tw.length >= 4 && guess.length >= 4 && levenshtein(guess, tw) <= maxTypos(tw.length)
  );
}

const ARTICLES = new Set(['el', 'la', 'lo', 'los', 'las', 'o', 'a', 'il', 'le', 'the', 'de', 'del']);

export function checkGuess(guess, player) {
  const g = normalize(guess);
  if (!g) return false;
  const targets = [
    player.nombre,
    player.nombreCompleto,
    player.apodo
  ].filter(Boolean).map(normalize);

  // Check each target with fuzzy matching
  if (targets.some(t => fuzzyMatch(g, t))) return true;

  // Also check each word of the guess against targets
  const guessWords = g.split(/\s+/).filter(w => !ARTICLES.has(w) && w.length > 1);
  if (guessWords.length > 0) {
    // Match last name: last significant word of guess against any target word
    const lastWord = guessWords[guessWords.length - 1];
    if (lastWord.length >= 4) {
      for (const t of targets) {
        const tWords = t.split(/\s+/);
        if (tWords.some(tw => tw.length >= 4 && fuzzyMatch(lastWord, tw))) return true;
      }
    }
  }

  // For apodos: match by significant words
  if (player.apodo) {
    const apodoWords = normalize(player.apodo).split(/\s+/).filter(w => !ARTICLES.has(w) && w.length > 1);
    if (guessWords.length > 0 && guessWords.every(gw =>
      apodoWords.some(aw => fuzzyMatch(gw, aw))
    )) {
      return true;
    }
  }

  return false;
}

// === Anti-repetition ===
const RECENT_KEY = 'futquiz_recent';
const RECENT_MAX = 20;

function getRecentlyPlayed() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch { return []; }
}

function addToRecentlyPlayed(ids) {
  const recent = getRecentlyPlayed();
  const updated = [...new Set([...ids, ...recent])].slice(0, RECENT_MAX);
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}

export function selectPlayersForRound(availablePlayers, count = 5) {
  const recent = new Set(getRecentlyPlayed());

  // Split into fresh and seen
  const fresh = availablePlayers.filter(p => !recent.has(p.id));
  const seen = availablePlayers.filter(p => recent.has(p.id));

  // Prefer fresh, fill with seen if needed
  const shuffledFresh = [...fresh].sort(() => Math.random() - 0.5);
  const shuffledSeen = [...seen].sort(() => Math.random() - 0.5);
  const pool = [...shuffledFresh, ...shuffledSeen];

  const selected = pool.slice(0, Math.min(count, pool.length));

  // Sort by tier for progressive difficulty (easy first)
  selected.sort((a, b) => (a.tier || 2) - (b.tier || 2));

  // Track as recently played
  addToRecentlyPlayed(selected.map(p => p.id));

  return selected;
}

// === Stats ===
const STATS_KEY = 'futquiz_stats';

export function getStats() {
  try {
    return JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
  } catch { return {}; }
}

export function updateStats(results) {
  const stats = getStats();
  stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
  stats.discovered = stats.discovered || {};
  for (const r of results) {
    const pid = r.player?.id || r.player?.nombre;
    if (pid && r.correct) {
      stats.discovered[pid] = true;
    }
  }
  stats.discoveredCount = Object.keys(stats.discovered).length;
  stats.totalPlayers = players.length;
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  return stats;
}
