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

export function checkGuess(guess, player) {
  const g = normalize(guess);
  if (!g) return false;
  const targets = [
    player.nombre,
    player.nombreCompleto,
    player.apodo
  ].filter(Boolean).map(normalize);
  return targets.some(t => t === g || (t.includes(g) && g.length >= 4));
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
