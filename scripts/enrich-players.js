#!/usr/bin/env node
/**
 * enrich-players.js
 * Enriches raw player data with Claude API (apodo, tier, companeros, pistaExtra, categorias).
 * Input: data/players-raw.json
 * Output: data/players-enriched.json
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const client = new Anthropic();

const BATCH_SIZE = 10;

const CATEGORIES = [
  'argentinos_mundo', 'brasileros_mundo', 'garra_charrua', 'estrellas_africa',
  'heroes_90', 'generacion_2000', 'generacion_2010', 'generacion_actual',
  'leyendas', 'goleadores', 'enganches', 'mediocampistas', 'murallas', 'arqueros',
  'trotamundos', 'ida_y_vuelta', 'de_sudamerica_europa',
  'mundialistas', 'champions', 'te_acordas',
  'serie_a', 'premier_league', 'la_liga', 'bundesliga', 'ligue_1',
  'libertadores', 'numero_10', 'tecnicos_jugadores'
];

async function enrichBatch(players) {
  const playerSummaries = players.map(p => {
    const clubs = p.carrera.map(c => `${c.club} (${c.anios})`).join(', ');
    return `- ${p.nombreCompleto} (${p.nacionalidad}, ${p.posicion}): ${clubs}`;
  }).join('\n');

  const prompt = `Sos un experto en fútbol mundial. Te doy datos de ${players.length} jugadores. Para CADA uno necesito que devuelvas un JSON array con exactamente estos campos:

Para cada jugador:
1. "id": el ID que te doy
2. "apodo": apodo popular del jugador (null si no tiene uno conocido). Ejemplos: "El Diego", "La Pulga", "O Fenômeno"
3. "tier": 1 si es leyenda mundial (Balón de Oro, ícono absoluto), 2 si es estrella internacional reconocida, 3 si es jugador conocido pero no de primer nivel mundial
4. "companeros": array de exactamente 4 objetos {nombre, club} con compañeros notables en distintos clubes. Elegí compañeros famosos que ayuden a adivinar al jugador
5. "pistaExtra": una frase corta con un dato curioso o logro notable que ayude a adivinar (ej: "Campeón del Mundo en 2022", "Máximo goleador de la Serie A en los 90")
6. "categorias": array de IDs de categorías que aplican de esta lista: ${CATEGORIES.join(', ')}

Jugadores:
${playerSummaries}

IMPORTANTE:
- Respondé SOLO con el JSON array, sin texto adicional, sin markdown
- Los compañeros deben ser jugadores reales que realmente jugaron juntos en ese club
- La pistaExtra debe ser un dato VERIFICABLE
- Cada jugador debe tener entre 3 y 6 categorías
- Si no conocés al jugador o no estás seguro de un dato, usá tier 3 y datos conservadores`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.content[0].text.trim();

  // Try to parse JSON from response
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Try to extract JSON array from text
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      throw new Error(`Failed to parse response for batch: ${text.slice(0, 200)}`);
    }
  }

  return parsed;
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const rawPath = resolve(ROOT, 'data', 'players-raw.json');
  if (!existsSync(rawPath)) {
    console.error('data/players-raw.json not found. Run fetch-careers.js first.');
    process.exit(1);
  }

  const rawPlayers = JSON.parse(readFileSync(rawPath, 'utf-8'));
  console.log(`Enriching ${rawPlayers.length} players with Claude API...`);

  // Check for already enriched (resume support)
  const enrichedPath = resolve(ROOT, 'data', 'players-enriched.json');
  let enriched = [];
  const enrichedIds = new Set();

  if (existsSync(enrichedPath)) {
    enriched = JSON.parse(readFileSync(enrichedPath, 'utf-8'));
    for (const p of enriched) enrichedIds.add(p.id);
    console.log(`Resuming: ${enriched.length} already enriched`);
  }

  // Filter out already enriched
  const remaining = rawPlayers.filter(p => !enrichedIds.has(p.id));
  console.log(`${remaining.length} players to enrich`);

  for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
    const batch = remaining.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(remaining.length / BATCH_SIZE);

    process.stdout.write(`Batch ${batchNum}/${totalBatches} (${batch.map(p => p.nombre).join(', ')})... `);

    try {
      const enrichments = await enrichBatch(batch);

      // Merge raw + enrichment
      for (const raw of batch) {
        const enrichment = enrichments.find(e => e.id === raw.id);
        if (enrichment) {
          enriched.push({
            ...raw,
            apodo: enrichment.apodo || null,
            tier: enrichment.tier || 3,
            companeros: enrichment.companeros || [],
            pistaExtra: enrichment.pistaExtra || null,
            categorias: enrichment.categorias || [],
          });
        } else {
          // Fallback: add with defaults
          enriched.push({
            ...raw,
            apodo: null,
            tier: 3,
            companeros: [],
            pistaExtra: null,
            categorias: [],
          });
        }
      }

      console.log('OK');

      // Save progress after each batch
      writeFileSync(enrichedPath, JSON.stringify(enriched, null, 2));
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      // Save progress and continue
      writeFileSync(enrichedPath, JSON.stringify(enriched, null, 2));
    }

    // Rate limit
    await sleep(1000);
  }

  writeFileSync(enrichedPath, JSON.stringify(enriched, null, 2));
  console.log(`\nWrote ${enriched.length} enriched players to ${enrichedPath}`);
}

main().catch(console.error);
