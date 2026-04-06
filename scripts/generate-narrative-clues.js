#!/usr/bin/env node
/**
 * generate-narrative-clues.js
 * Generates 5 escalating story-beat clues per player using Claude API.
 * Input: data/players.json
 * Output: data/players.json (updated in-place with narrativeClues field)
 *
 * Usage:
 *   node scripts/generate-narrative-clues.js              # all players without clues
 *   node scripts/generate-narrative-clues.js --force       # regenerate all
 *   node scripts/generate-narrative-clues.js --limit 20    # first 20 players only
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const client = new Anthropic();

const BATCH_SIZE = 5;
const RETRY_ATTEMPTS = 2;

function buildPrompt(players) {
  const playerSummaries = players.map(p => {
    const clubs = p.carrera.map(c => `${c.club} (${c.pais}, ${c.anios})`).join(', ');
    const extras = [
      p.pistaExtra ? `Dato: ${p.pistaExtra}` : '',
      p.apodo ? `Apodo: "${p.apodo}"` : '',
      `Tier: ${p.tier}`,
      `Posición: ${p.posicion}`,
    ].filter(Boolean).join('. ');
    return `- ID: "${p.id}" | ${p.nombreCompleto} (${p.nacionalidad}): ${clubs}. ${extras}`;
  }).join('\n');

  return `Sos un relator de fútbol latinoamericano. Narrás con emoción, dramatismo y pasión. Tu trabajo es crear 5 pistas narrativas para cada jugador, como si estuvieras contando una historia en una transmisión.

Para cada jugador, generá exactamente 5 "beats" que vayan de lo más críptico a lo más obvio:
- Beat 1 (difficulty: "hard"): Ambientación. Describí un momento, una época, un estadio. NO nombres al jugador, ni su apodo, ni sus iniciales. Que solo un experto pueda adivinar.
- Beat 2 (difficulty: "hard"): Un dato más específico sobre su carrera o un logro, pero sin revelar identidad.
- Beat 3 (difficulty: "medium"): Una pista que reduce las opciones. Mencioná una liga, un equipo, o una época más precisa.
- Beat 4 (difficulty: "medium"): Ya se puede adivinar con buen conocimiento. Mencioná un club importante o un logro reconocido.
- Beat 5 (difficulty: "easy"): Casi revelado. Un hincha casual lo adivinaría. Podés mencionar el club más famoso y un logro icónico.

REGLAS ESTRICTAS:
- NUNCA menciones el nombre, apellido, apodo o iniciales del jugador en NINGÚN beat.
- Cada beat debe agregar información NUEVA, no reformular beats anteriores.
- Los beats 1-3 deben ser adivinables SOLO por expertos.
- Los beats 4-5 deben reducir a un solo jugador posible.
- Cada texto entre 30 y 180 caracteres.
- Todos los textos en español.
- Los datos deben ser VERIFICABLES. No inventes logros, goles, ni clubes.
- Usá el estilo de un relator: emoción, drama, frases cortas. "¡Gol!" "Increíble." "¿Quién puede ser?"

Jugadores:
${playerSummaries}

Respondé SOLO con un JSON array, sin texto adicional, sin markdown. Formato:
[
  {
    "id": "player_id",
    "narrativeClues": [
      { "beat": 1, "text": "...", "difficulty": "hard" },
      { "beat": 2, "text": "...", "difficulty": "hard" },
      { "beat": 3, "text": "...", "difficulty": "medium" },
      { "beat": 4, "text": "...", "difficulty": "medium" },
      { "beat": 5, "text": "...", "difficulty": "easy" }
    ]
  }
]`;
}

function validateClues(clues, player) {
  const errors = [];

  if (!Array.isArray(clues) || clues.length !== 5) {
    errors.push(`Expected 5 beats, got ${Array.isArray(clues) ? clues.length : 'non-array'}`);
    return errors;
  }

  const nameWords = [
    player.nombre, player.nombreCompleto, player.apodo
  ].filter(Boolean).flatMap(n => n.toLowerCase().split(/\s+/)).filter(w => w.length > 3);

  for (const clue of clues) {
    if (!clue.text || typeof clue.text !== 'string') {
      errors.push(`Beat ${clue.beat}: missing or invalid text`);
      continue;
    }
    if (clue.text.length < 20 || clue.text.length > 200) {
      errors.push(`Beat ${clue.beat}: text length ${clue.text.length} (expected 20-200)`);
    }
    if (!['hard', 'medium', 'easy'].includes(clue.difficulty)) {
      errors.push(`Beat ${clue.beat}: invalid difficulty "${clue.difficulty}"`);
    }
    // Check if name leaks in early beats (1-3)
    if (clue.beat <= 3) {
      const textLower = clue.text.toLowerCase();
      for (const word of nameWords) {
        if (textLower.includes(word)) {
          errors.push(`Beat ${clue.beat}: possible name leak "${word}"`);
        }
      }
    }
  }

  return errors;
}

async function generateBatch(players) {
  const prompt = buildPrompt(players);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.content[0].text.trim();

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      throw new Error(`Failed to parse JSON: ${text.slice(0, 200)}`);
    }
  }

  return parsed;
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;

  const playersPath = resolve(ROOT, 'data', 'players.json');
  const players = JSON.parse(readFileSync(playersPath, 'utf-8'));
  console.log(`Loaded ${players.length} players`);

  // Filter: players that need narrative clues
  let toProcess = force
    ? players
    : players.filter(p => !p.narrativeClues || p.narrativeClues.length !== 5);

  if (limit < toProcess.length) {
    toProcess = toProcess.slice(0, limit);
  }

  console.log(`${toProcess.length} players to process (force=${force}, limit=${limit})`);

  if (toProcess.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  let generated = 0;
  let failed = 0;
  let validationErrors = 0;

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(toProcess.length / BATCH_SIZE);

    process.stdout.write(`Batch ${batchNum}/${totalBatches} (${batch.map(p => p.nombre).join(', ')})... `);

    let results = null;
    for (let attempt = 0; attempt <= RETRY_ATTEMPTS; attempt++) {
      try {
        results = await generateBatch(batch);
        break;
      } catch (err) {
        if (attempt < RETRY_ATTEMPTS) {
          process.stdout.write(`retry ${attempt + 1}... `);
          await sleep(2000 * (attempt + 1));
        } else {
          console.log(`FAILED after ${RETRY_ATTEMPTS + 1} attempts: ${err.message}`);
          failed += batch.length;
        }
      }
    }

    if (results) {
      let batchOk = 0;
      for (const player of batch) {
        const result = results.find(r => r.id === player.id);
        if (result && result.narrativeClues) {
          const errors = validateClues(result.narrativeClues, player);
          if (errors.length === 0) {
            // Find in main array and update
            const idx = players.findIndex(p => p.id === player.id);
            if (idx !== -1) {
              players[idx].narrativeClues = result.narrativeClues;
              batchOk++;
              generated++;
            }
          } else {
            console.log(`\n  Validation errors for ${player.nombre}: ${errors.join('; ')}`);
            validationErrors++;
          }
        } else {
          console.log(`\n  No result for ${player.nombre}`);
          failed++;
        }
      }
      process.stdout.write(`${batchOk}/${batch.length} OK\n`);
    }

    // Save progress after each batch
    writeFileSync(playersPath, JSON.stringify(players, null, 2));

    // Rate limit
    await sleep(1500);
  }

  // Final save
  writeFileSync(playersPath, JSON.stringify(players, null, 2));

  // Stats
  const withClues = players.filter(p => p.narrativeClues && p.narrativeClues.length === 5).length;
  console.log(`\n=== RESULTS ===`);
  console.log(`Generated: ${generated}`);
  console.log(`Failed: ${failed}`);
  console.log(`Validation errors: ${validationErrors}`);
  console.log(`Total with narrative clues: ${withClues}/${players.length}`);

  const passRate = generated / (generated + failed + validationErrors);
  if (passRate < 0.8) {
    console.log(`\nWARNING: Pass rate ${(passRate * 100).toFixed(1)}% is below 80% threshold.`);
    console.log('Consider tuning the prompt and re-running with --force on failed players.');
  }
}

main().catch(console.error);
