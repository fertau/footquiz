#!/usr/bin/env node
/**
 * validate-data.js
 * Validates players.json and categories.json for data integrity.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const FLAG_MAP_KEYS = new Set([
  'AR','BR','UY','PY','CO','CL','PE','EC','MX','US','GB-ENG','GB-SCT','GB-WLS','GB-NIR',
  'ES','IT','FR','DE','PT','NL','BE','RU','TR','GR','UA','AE','SA','QA','JP','CN','AU',
  'CI','CM','NG','SN','ZA','IL','HR','RS','IN','SE','DK','NO','CH','AT','IE','PL','CZ',
  'RO','HU','BA','MK','AL','ME','SI','SK','GE','KR','MA','DZ','TN','EG','GH','ML',
  'GA','CD','CG','TG','LR','BF','BJ','CV','CR','HN','JM','TT','CA','BO','VE','GN',
]);

function main() {
  let errors = 0;
  let warnings = 0;

  const players = JSON.parse(readFileSync(resolve(ROOT, 'data', 'players.json'), 'utf-8'));
  const categories = JSON.parse(readFileSync(resolve(ROOT, 'data', 'categories.json'), 'utf-8'));

  const playerIds = new Set();
  const categoryIds = new Set(categories.map(c => c.id));
  let narrativeCount = 0;

  console.log(`Validating ${players.length} players and ${categories.length} categories...\n`);

  // === Player validation ===
  const requiredFields = ['id', 'nombre', 'nombreCompleto', 'nacionalidad', 'posicion', 'tier', 'carrera', 'paises'];

  for (const p of players) {
    const ctx = `Player "${p.id || p.nombre}"`;

    // Check required fields
    for (const field of requiredFields) {
      if (p[field] === undefined || p[field] === null) {
        console.error(`  ERROR: ${ctx} missing field "${field}"`);
        errors++;
      }
    }

    // Check duplicate IDs
    if (playerIds.has(p.id)) {
      console.error(`  ERROR: Duplicate player ID "${p.id}"`);
      errors++;
    }
    playerIds.add(p.id);

    // Check tier
    if (p.tier && ![1, 2, 3].includes(p.tier)) {
      console.error(`  ERROR: ${ctx} invalid tier ${p.tier} (must be 1, 2, or 3)`);
      errors++;
    }

    // Check nationality code
    if (p.nacionalidad && !FLAG_MAP_KEYS.has(p.nacionalidad)) {
      console.warn(`  WARN: ${ctx} unknown nationality code "${p.nacionalidad}"`);
      warnings++;
    }

    // Check career
    if (p.carrera) {
      if (p.carrera.length < 2) {
        console.warn(`  WARN: ${ctx} has only ${p.carrera.length} career entries`);
        warnings++;
      }
      for (const c of p.carrera) {
        if (!c.club) {
          console.error(`  ERROR: ${ctx} career entry missing club`);
          errors++;
        }
        if (c.pais && !FLAG_MAP_KEYS.has(c.pais)) {
          console.warn(`  WARN: ${ctx} career club "${c.club}" has unknown country "${c.pais}"`);
          warnings++;
        }
      }
    }

    // Check companeros
    if (!p.companeros || p.companeros.length < 3) {
      console.warn(`  WARN: ${ctx} has ${p.companeros?.length || 0} companeros (need 3+ for Compañeros mode)`);
      warnings++;
    }

    // Check paises
    if (p.paises && p.paises.length < 2) {
      console.warn(`  WARN: ${ctx} only played in ${p.paises.length} country (need 3+ for Pasaporte mode)`);
      warnings++;
    }

    // Check categorias references
    if (p.categorias) {
      for (const catId of p.categorias) {
        if (!categoryIds.has(catId)) {
          console.warn(`  WARN: ${ctx} references category "${catId}" which doesn't exist`);
          warnings++;
        }
      }
    }

    // === Narrative clues validation (3-tier) ===
    if (p.narrativeClues) {
      // Tier 1: Structural
      if (!Array.isArray(p.narrativeClues) || p.narrativeClues.length !== 5) {
        console.error(`  ERROR: ${ctx} narrativeClues must be array of 5 beats (got ${Array.isArray(p.narrativeClues) ? p.narrativeClues.length : 'non-array'})`);
        errors++;
      } else {
        const validDifficulties = ['hard', 'medium', 'easy'];
        for (const clue of p.narrativeClues) {
          if (typeof clue.beat !== 'number' || clue.beat < 1 || clue.beat > 5) {
            console.error(`  ERROR: ${ctx} narrative beat number invalid: ${clue.beat}`);
            errors++;
          }
          if (!clue.text || typeof clue.text !== 'string') {
            console.error(`  ERROR: ${ctx} narrative beat ${clue.beat} missing text`);
            errors++;
          } else if (clue.text.length < 20 || clue.text.length > 200) {
            console.warn(`  WARN: ${ctx} narrative beat ${clue.beat} text length ${clue.text.length} (expected 20-200)`);
            warnings++;
          }
          if (!validDifficulties.includes(clue.difficulty)) {
            console.error(`  ERROR: ${ctx} narrative beat ${clue.beat} invalid difficulty "${clue.difficulty}"`);
            errors++;
          }
        }

        // Tier 2: Cross-reference years and clubs from clue text against carrera
        if (p.carrera) {
          const knownYears = new Set();
          const knownClubs = new Set();
          for (const c of p.carrera) {
            if (c.anios) {
              const yearMatch = c.anios.match(/\d{4}/g);
              if (yearMatch) yearMatch.forEach(y => knownYears.add(y));
            }
            if (c.club) knownClubs.add(c.club.toLowerCase());
          }

          for (const clue of p.narrativeClues) {
            if (!clue.text) continue;
            // Extract 4-digit years from clue text
            const clueYears = clue.text.match(/\b(19\d{2}|20\d{2})\b/g) || [];
            for (const year of clueYears) {
              if (!knownYears.has(year)) {
                console.warn(`  WARN: ${ctx} narrative beat ${clue.beat} mentions year ${year} not in carrera`);
                warnings++;
              }
            }
          }
        }

        // Check name leak in early beats (1-3)
        const nameWords = [p.nombre, p.nombreCompleto, p.apodo]
          .filter(Boolean)
          .flatMap(n => n.toLowerCase().split(/\s+/))
          .filter(w => w.length > 3);

        for (const clue of p.narrativeClues) {
          if (clue.beat <= 3 && clue.text) {
            const textLower = clue.text.toLowerCase();
            for (const word of nameWords) {
              if (textLower.includes(word)) {
                console.warn(`  WARN: ${ctx} narrative beat ${clue.beat} may leak name: "${word}"`);
                warnings++;
              }
            }
          }
        }
      }
      narrativeCount++;
    }
  }

  // === Category validation ===
  for (const c of categories) {
    const ctx = `Category "${c.id}"`;

    if (!c.nombre || !c.emoji || !c.descripcion) {
      console.error(`  ERROR: ${ctx} missing nombre/emoji/descripcion`);
      errors++;
    }

    // Check player references
    for (const pid of c.jugadorIds) {
      if (!playerIds.has(pid)) {
        console.error(`  ERROR: ${ctx} references unknown player "${pid}"`);
        errors++;
      }
    }

    // Check minimum players for each mode
    const catPlayers = c.jugadorIds.map(id => players.find(p => p.id === id)).filter(Boolean);
    const carreraReady = catPlayers.filter(p => p.carrera && p.carrera.length >= 2).length;
    const compReady = catPlayers.filter(p => p.companeros && p.companeros.length >= 3).length;
    const pasaReady = catPlayers.filter(p => p.paises && p.paises.length >= 3).length;

    if (catPlayers.length < 3) {
      console.warn(`  WARN: ${ctx} has only ${catPlayers.length} valid players (need 3+)`);
      warnings++;
    }

    if (carreraReady < 3) {
      console.warn(`  WARN: ${ctx} only ${carreraReady} players ready for Carrera mode`);
      warnings++;
    }
  }

  // === Summary ===
  console.log('\n=== Summary ===');
  console.log(`Players: ${players.length}`);
  console.log(`Categories: ${categories.length}`);
  console.log(`Errors: ${errors}`);
  console.log(`Warnings: ${warnings}`);

  // Stats
  const tiers = { 1: 0, 2: 0, 3: 0 };
  for (const p of players) tiers[p.tier] = (tiers[p.tier] || 0) + 1;
  console.log(`\nTier distribution: T1=${tiers[1]}, T2=${tiers[2]}, T3=${tiers[3]}`);

  const nationalities = {};
  for (const p of players) {
    nationalities[p.nacionalidad] = (nationalities[p.nacionalidad] || 0) + 1;
  }
  const topNat = Object.entries(nationalities).sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log(`Top nationalities: ${topNat.map(([k, v]) => `${k}(${v})`).join(', ')}`);
  console.log(`Narrative clues: ${narrativeCount}/${players.length} players (${(narrativeCount/players.length*100).toFixed(1)}%)`);

  if (errors > 0) {
    console.log(`\n❌ ${errors} errors found. Fix before deploying.`);
    process.exit(1);
  } else {
    console.log(`\n✅ No errors. ${warnings} warnings.`);
  }
}

main();
