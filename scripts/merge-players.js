#!/usr/bin/env node
/**
 * merge-players.js
 * Merges enriched players into final players.json + regenerates categories.json.
 * Input: data/players-enriched.json + data/players.json (existing)
 * Output: data/players.json, data/categories.json
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const CATEGORY_META = {
  argentinos_mundo: { nombre: 'Argentinos por el Mundo', emoji: '🇦🇷✈️', descripcion: 'Argentinos que brillaron afuera' },
  brasileros_mundo: { nombre: 'Brasileños por el Mundo', emoji: '🇧🇷✈️', descripcion: 'Brasileños que la rompieron afuera' },
  garra_charrua: { nombre: 'La Garra Charrúa', emoji: '🇺🇾💪', descripcion: 'Uruguayos con carrera internacional' },
  estrellas_africa: { nombre: 'Estrellas de África', emoji: '🌍⭐', descripcion: 'Africanos que brillaron en Europa' },
  heroes_90: { nombre: 'Héroes de los 90', emoji: '📼⚽', descripcion: 'Los cracks de los noventa' },
  generacion_2000: { nombre: 'Generación 2000', emoji: '💿⚽', descripcion: 'Pico de carrera en los 2000' },
  generacion_2010: { nombre: 'Generación 2010', emoji: '📱⚽', descripcion: 'Los que dominaron la década del 2010' },
  generacion_actual: { nombre: 'Generación Actual', emoji: '🔥⚽', descripcion: 'Las estrellas de hoy' },
  leyendas: { nombre: 'Leyendas', emoji: '👑🏆', descripcion: 'Los que conoce todo el mundo' },
  goleadores: { nombre: 'Goleadores', emoji: '⚽🔥', descripcion: 'Los que no paraban de meter goles' },
  enganches: { nombre: 'Enganches y Creativos', emoji: '🎩✨', descripcion: 'Los que inventaban fútbol' },
  mediocampistas: { nombre: 'Mediocampistas', emoji: '🧠⚡', descripcion: 'Los que manejaban el medio' },
  murallas: { nombre: 'Murallas', emoji: '🧱💪', descripcion: 'Defensores de fierro' },
  arqueros: { nombre: 'Arqueros', emoji: '🧤🥅', descripcion: 'Los guardianes del arco' },
  trotamundos: { nombre: 'Trotamundos', emoji: '🌎🧳', descripcion: 'Jugaron en 4 o más países' },
  ida_y_vuelta: { nombre: 'Ida y Vuelta', emoji: '🔄🏠', descripcion: 'Se fueron y volvieron a su club' },
  de_sudamerica_europa: { nombre: 'De Sudamérica a Europa', emoji: '🌎➡️🌍', descripcion: 'Carrera en ambos continentes' },
  mundialistas: { nombre: 'Mundialistas', emoji: '🏆🌍', descripcion: 'Marcados por el Mundial' },
  champions: { nombre: 'Champions League', emoji: '🏆⭐', descripcion: 'Figuras de la Champions' },
  te_acordas: { nombre: '¿Te Acordás?', emoji: '🤔💭', descripcion: 'Conocidos pero semi-olvidados' },
  serie_a: { nombre: 'Serie A Icons', emoji: '🇮🇹⚽', descripcion: 'Figuras del fútbol italiano' },
  premier_league: { nombre: 'Premier League', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿⚽', descripcion: 'Estrellas del fútbol inglés' },
  la_liga: { nombre: 'La Liga', emoji: '🇪🇸⚽', descripcion: 'Estrellas del fútbol español' },
  bundesliga: { nombre: 'Bundesliga', emoji: '🇩🇪⚽', descripcion: 'Figuras del fútbol alemán' },
  ligue_1: { nombre: 'Ligue 1', emoji: '🇫🇷⚽', descripcion: 'Figuras del fútbol francés' },
  libertadores: { nombre: 'Copa Libertadores', emoji: '🏆🌎', descripcion: 'Leyendas de la Copa' },
  numero_10: { nombre: 'El Número 10', emoji: '🔟✨', descripcion: 'Los clásicos camiseta 10' },
  tecnicos_jugadores: { nombre: 'De Jugador a DT', emoji: '📋⚽', descripcion: 'Jugadores que se hicieron técnicos famosos' },
};

function main() {
  const enrichedPath = resolve(ROOT, 'data', 'players-enriched.json');
  if (!existsSync(enrichedPath)) {
    console.error('data/players-enriched.json not found. Run enrich-players.js first.');
    process.exit(1);
  }

  const enrichedPlayers = JSON.parse(readFileSync(enrichedPath, 'utf-8'));

  // Load existing players to preserve manually curated data
  const existingPath = resolve(ROOT, 'data', 'players.json');
  const existingPlayers = existsSync(existingPath)
    ? JSON.parse(readFileSync(existingPath, 'utf-8'))
    : [];
  const existingById = new Map(existingPlayers.map(p => [p.id, p]));

  // Merge: existing data takes priority (it was manually curated)
  const merged = [];
  const seenIds = new Set();

  // First, keep all existing players with their curated data
  for (const existing of existingPlayers) {
    merged.push(existing);
    seenIds.add(existing.id);
  }

  // Then add new players from enriched data
  for (const enriched of enrichedPlayers) {
    if (seenIds.has(enriched.id)) continue;

    // Clean up the _raw field
    delete enriched._raw;

    // Validate minimum data
    if (!enriched.carrera || enriched.carrera.length < 1) continue;
    if (!enriched.nacionalidad) continue;
    if (!enriched.companeros || enriched.companeros.length < 3) {
      // Add empty companeros placeholder — will be filtered by modes that require them
      enriched.companeros = enriched.companeros || [];
    }

    merged.push(enriched);
    seenIds.add(enriched.id);
  }

  // Sort by ID for consistent output
  merged.sort((a, b) => a.id.localeCompare(b.id));

  // Write merged players
  writeFileSync(
    resolve(ROOT, 'data', 'players.json'),
    JSON.stringify(merged, null, 2)
  );
  console.log(`Wrote ${merged.length} players to data/players.json`);

  // Regenerate categories.json from player categorias arrays
  const categoryPlayers = {};
  for (const player of merged) {
    if (!player.categorias) continue;
    for (const catId of player.categorias) {
      if (!categoryPlayers[catId]) categoryPlayers[catId] = [];
      categoryPlayers[catId].push(player.id);
    }
  }

  // Build categories array, only including categories with 3+ players
  const categories = [];
  for (const [catId, playerIds] of Object.entries(categoryPlayers)) {
    if (playerIds.length < 3) {
      console.log(`  Skipping category "${catId}": only ${playerIds.length} players`);
      continue;
    }

    const meta = CATEGORY_META[catId];
    if (!meta) {
      console.log(`  Warning: unknown category "${catId}" used by ${playerIds.length} players`);
      continue;
    }

    categories.push({
      id: catId,
      nombre: meta.nombre,
      emoji: meta.emoji,
      descripcion: meta.descripcion,
      jugadorIds: playerIds
    });
  }

  // Sort categories by number of players (descending)
  categories.sort((a, b) => b.jugadorIds.length - a.jugadorIds.length);

  writeFileSync(
    resolve(ROOT, 'data', 'categories.json'),
    JSON.stringify(categories, null, 2)
  );
  console.log(`Wrote ${categories.length} categories to data/categories.json`);
}

main();
