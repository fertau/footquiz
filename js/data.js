// Data loading and indexing
let players = [];
let categories = [];
let playersById = {};

const FLAG_MAP = {
  'AR': '\u{1F1E6}\u{1F1F7}',
  'BR': '\u{1F1E7}\u{1F1F7}',
  'UY': '\u{1F1FA}\u{1F1FE}',
  'PY': '\u{1F1F5}\u{1F1FE}',
  'CO': '\u{1F1E8}\u{1F1F4}',
  'CL': '\u{1F1E8}\u{1F1F1}',
  'PE': '\u{1F1F5}\u{1F1EA}',
  'EC': '\u{1F1EA}\u{1F1E8}',
  'MX': '\u{1F1F2}\u{1F1FD}',
  'US': '\u{1F1FA}\u{1F1F8}',
  'GB-ENG': '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
  'GB-SCT': '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}',
  'ES': '\u{1F1EA}\u{1F1F8}',
  'IT': '\u{1F1EE}\u{1F1F9}',
  'FR': '\u{1F1EB}\u{1F1F7}',
  'DE': '\u{1F1E9}\u{1F1EA}',
  'PT': '\u{1F1F5}\u{1F1F9}',
  'NL': '\u{1F1F3}\u{1F1F1}',
  'BE': '\u{1F1E7}\u{1F1EA}',
  'RU': '\u{1F1F7}\u{1F1FA}',
  'TR': '\u{1F1F9}\u{1F1F7}',
  'GR': '\u{1F1EC}\u{1F1F7}',
  'UA': '\u{1F1FA}\u{1F1E6}',
  'AE': '\u{1F1E6}\u{1F1EA}',
  'SA': '\u{1F1F8}\u{1F1E6}',
  'QA': '\u{1F1F6}\u{1F1E6}',
  'JP': '\u{1F1EF}\u{1F1F5}',
  'CN': '\u{1F1E8}\u{1F1F3}',
  'AU': '\u{1F1E6}\u{1F1FA}',
  'CI': '\u{1F1E8}\u{1F1EE}',
  'CM': '\u{1F1E8}\u{1F1F2}',
  'NG': '\u{1F1F3}\u{1F1EC}',
  'SN': '\u{1F1F8}\u{1F1F3}',
  'ZA': '\u{1F1FF}\u{1F1E6}',
  'IL': '\u{1F1EE}\u{1F1F1}',
  'HR': '\u{1F1ED}\u{1F1F7}',
  'RS': '\u{1F1F7}\u{1F1F8}',
  'IN': '\u{1F1EE}\u{1F1F3}',
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

export function getRandomCategories(count = 12) {
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
  return targets.some(t => t === g || t.includes(g) && g.length >= 4);
}
