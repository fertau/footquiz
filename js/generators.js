// Question generators for Conexión and Línea de Tiempo modes
import { getPlayers, normalize } from './data.js';

// Build an index of club → player IDs
export function buildClubIndex(players) {
  const index = new Map(); // clubName → Set of playerIds
  for (const p of players) {
    if (!p.carrera) continue;
    for (const c of p.carrera) {
      const club = c.club;
      if (!index.has(club)) index.set(club, new Set());
      index.get(club).add(p.id);
    }
  }
  return index;
}

// Generate connection pairs from a set of players
export function generateConnectionPairs(players, count = 5) {
  const clubIndex = buildClubIndex(players);
  const pairs = [];
  const usedPairKeys = new Set();

  // Find all valid pairs
  for (const [club, playerIds] of clubIndex) {
    const ids = [...playerIds];
    if (ids.length < 2) continue;

    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const key = [ids[i], ids[j]].sort().join('|');
        if (usedPairKeys.has(key)) continue;
        usedPairKeys.add(key);

        // Find ALL shared clubs between these two players
        const pA = players.find(p => p.id === ids[i]);
        const pB = players.find(p => p.id === ids[j]);
        const clubsA = new Set(pA.carrera.map(c => c.club));
        const clubsB = new Set(pB.carrera.map(c => c.club));
        const shared = [...clubsA].filter(c => clubsB.has(c));

        if (shared.length > 0) {
          pairs.push({
            playerA: pA,
            playerB: pB,
            validAnswers: shared,
            // For display in results
            nombre: `${pA.nombre} ↔ ${pB.nombre}`,
            tier: Math.min(pA.tier || 2, pB.tier || 2)
          });
        }
      }
    }
  }

  // Shuffle and pick
  const shuffled = pairs.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// Check if a guess matches any of the valid clubs
export function checkConnectionGuess(guess, validAnswers) {
  const g = normalize(guess);
  if (!g || g.length < 3) return false;
  return validAnswers.some(club => {
    const n = normalize(club);
    return n === g || n.includes(g) && g.length >= 4;
  });
}

// Parse start year from "YYYY-YYYY" or "YYYY-" format
export function parseStartYear(anios) {
  if (!anios) return 9999;
  const match = anios.match(/(\d{4})/);
  return match ? parseInt(match[1], 10) : 9999;
}

// Generate timeline questions from players
export function generateTimelineQuestions(players, count = 5) {
  // Filter to players with 3+ career entries
  const eligible = players.filter(p => p.carrera && p.carrera.length >= 3);
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, eligible.length));

  return selected.map(player => {
    // Pick 4 stints (or fewer if player has less)
    const stintCount = Math.min(4, player.carrera.length);
    const stints = player.carrera.slice(0, stintCount).map((c, i) => ({
      club: c.club,
      pais: c.pais,
      anios: c.anios,
      correctOrder: i
    }));

    // Shuffle the stints
    const shuffledStints = [...stints].sort(() => Math.random() - 0.5);

    return {
      player,
      stints: shuffledStints,
      stintCount,
      // For result display
      nombre: player.nombre,
      tier: player.tier || 2
    };
  });
}

// Build "Quién Soy" clues from player metadata
export function buildQuienSoyClues(player) {
  const clues = [];

  // 1. Position
  const posNames = {
    arquero: 'Arquero', defensor: 'Defensor', mediocampista: 'Mediocampista',
    enganche: 'Enganche / Mediapunta', extremo: 'Extremo',
    goleador: 'Delantero / Goleador', delantero: 'Delantero'
  };
  clues.push({
    emoji: '🏃',
    text: `Posición: ${posNames[player.posicion] || player.posicion}`,
    type: 'position'
  });

  // 2. Number of countries
  if (player.paises && player.paises.length > 1) {
    clues.push({
      emoji: '🌍',
      text: `Jugó en ${player.paises.length} países`,
      type: 'countries'
    });
  }

  // 3. Decade active (from career)
  if (player.carrera && player.carrera.length > 0) {
    const startYear = parseStartYear(player.carrera[0].anios);
    const lastEntry = player.carrera[player.carrera.length - 1];
    const endYear = lastEntry.anios?.includes('-')
      ? parseInt(lastEntry.anios.split('-')[1], 10) || new Date().getFullYear()
      : startYear + 5;
    const decades = new Set();
    for (let y = startYear; y <= endYear; y += 10) {
      decades.add(Math.floor(y / 10) * 10);
    }
    const decadeStr = [...decades].sort().map(d => `${d}s`).join(' y ');
    clues.push({
      emoji: '📅',
      text: `Activo en los ${decadeStr}`,
      type: 'decade'
    });
  }

  // 4. Number of clubs
  if (player.carrera) {
    clues.push({
      emoji: '🏟️',
      text: `Pasó por ${player.carrera.length} clubes`,
      type: 'clubs'
    });
  }

  // 5. Tier hint
  const tierHints = {
    1: 'Leyenda absoluta del fútbol mundial',
    2: 'Estrella internacional reconocida',
    3: 'Conocido por los entendedores del fútbol'
  };
  clues.push({
    emoji: '⭐',
    text: tierHints[player.tier] || tierHints[2],
    type: 'tier'
  });

  // 6. Apodo hint (if exists)
  if (player.apodo) {
    // Give a vague hint about the nickname
    clues.push({
      emoji: '🏷️',
      text: `Su apodo tiene ${player.apodo.length} letras`,
      type: 'apodo'
    });
  }

  // 7. pistaExtra as last clue
  if (player.pistaExtra) {
    clues.push({
      emoji: '💡',
      text: player.pistaExtra,
      type: 'extra'
    });
  }

  return clues;
}
