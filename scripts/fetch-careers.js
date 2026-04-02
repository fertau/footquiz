#!/usr/bin/env node
/**
 * fetch-careers.js
 * Fetches player career data from Wikidata SPARQL.
 * Input: scripts/player-names.txt
 * Output: data/players-raw.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Read player names
const namesFile = readFileSync(resolve(__dirname, 'player-names.txt'), 'utf-8');
const names = namesFile
  .split('\n')
  .map(l => l.trim())
  .filter(l => l && !l.startsWith('#'))
  .filter((v, i, a) => a.indexOf(v) === i); // dedup

console.log(`Found ${names.length} unique player names`);

// Country code mapping from Wikidata country labels
const COUNTRY_CODES = {
  'argentina': 'AR', 'brazil': 'BR', 'uruguay': 'UY', 'paraguay': 'PY',
  'colombia': 'CO', 'chile': 'CL', 'peru': 'PE', 'ecuador': 'EC',
  'bolivia': 'BO', 'venezuela': 'VE', 'mexico': 'MX',
  'united states of america': 'US', 'united states': 'US',
  'england': 'GB-ENG', 'scotland': 'GB-SCT', 'wales': 'GB-WLS',
  'united kingdom': 'GB-ENG', 'northern ireland': 'GB-NIR',
  'spain': 'ES', 'italy': 'IT', 'france': 'FR', 'germany': 'DE',
  'portugal': 'PT', 'netherlands': 'NL', 'belgium': 'BE',
  'croatia': 'HR', 'serbia': 'RS', 'greece': 'GR',
  'turkey': 'TR', 'russia': 'RU', 'ukraine': 'UA', 'poland': 'PL',
  'czech republic': 'CZ', 'czechia': 'CZ', 'romania': 'RO',
  'hungary': 'HU', 'sweden': 'SE', 'denmark': 'DK', 'norway': 'NO',
  'switzerland': 'CH', 'austria': 'AT', 'ireland': 'IE',
  'japan': 'JP', 'south korea': 'KR', 'china': 'CN',
  'australia': 'AU', 'india': 'IN',
  'saudi arabia': 'SA', 'qatar': 'QA', 'united arab emirates': 'AE',
  'ivory coast': 'CI', "côte d'ivoire": 'CI', 'cameroon': 'CM',
  'nigeria': 'NG', 'senegal': 'SN', 'ghana': 'GH',
  'south africa': 'ZA', 'morocco': 'MA', 'algeria': 'DZ',
  'tunisia': 'TN', 'egypt': 'EG', 'mali': 'ML', 'guinea': 'GN',
  'democratic republic of the congo': 'CD', 'gabon': 'GA',
  'bosnia and herzegovina': 'BA', 'north macedonia': 'MK',
  'albania': 'AL', 'montenegro': 'ME', 'slovenia': 'SI',
  'slovakia': 'SK', 'israel': 'IL', 'georgia': 'GE',
  'costa rica': 'CR', 'honduras': 'HN', 'jamaica': 'JM',
  'trinidad and tobago': 'TT', 'canada': 'CA',
  'republic of the congo': 'CG', 'togo': 'TG', 'liberia': 'LR',
  'burkina faso': 'BF', 'benin': 'BJ', 'cape verde': 'CV',
};

function getCountryCode(label) {
  if (!label) return null;
  const lower = label.toLowerCase().trim();
  return COUNTRY_CODES[lower] || null;
}

// Country of a club — we'll build this from Wikidata too
const CLUB_COUNTRIES = {};

async function sparqlQuery(query) {
  const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'FutQuiz/1.0 (football trivia game)' }
  });
  if (!res.ok) {
    throw new Error(`SPARQL query failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// Batch players in groups to avoid query timeout
async function fetchPlayerBatch(playerNames) {
  // Create VALUES clause with player names
  const values = playerNames.map(n => `"${n.replace(/"/g, '\\"')}"@en`).join(' ');

  const query = `
    SELECT ?player ?playerLabel ?nationalityLabel ?positionLabel
           ?team ?teamLabel ?teamCountryLabel ?start ?end
    WHERE {
      VALUES ?name { ${values} }
      ?player rdfs:label ?name .
      ?player wdt:P106 wd:Q937857 .

      OPTIONAL { ?player wdt:P27 ?nationality }
      OPTIONAL { ?player wdt:P413 ?position }

      OPTIONAL {
        ?player p:P54 ?stmt .
        ?stmt ps:P54 ?team .
        OPTIONAL { ?stmt pq:P580 ?start }
        OPTIONAL { ?stmt pq:P582 ?end }
        OPTIONAL { ?team wdt:P17 ?teamCountry }
      }

      SERVICE wikibase:label { bd:serviceParam wikibase:language "en,es" }
    }
  `;

  return sparqlQuery(query);
}

// Alternative: search by label with FILTER
async function fetchPlayerBySearch(playerName) {
  const escapedName = playerName.replace(/"/g, '\\"');

  const query = `
    SELECT ?player ?playerLabel ?nationalityLabel ?positionLabel
           ?team ?teamLabel ?teamCountryLabel ?start ?end
    WHERE {
      ?player wdt:P106 wd:Q937857 .
      ?player rdfs:label "${escapedName}"@en .

      OPTIONAL { ?player wdt:P27 ?nationality }
      OPTIONAL { ?player wdt:P413 ?position }

      OPTIONAL {
        ?player p:P54 ?stmt .
        ?stmt ps:P54 ?team .
        OPTIONAL { ?stmt pq:P580 ?start }
        OPTIONAL { ?stmt pq:P582 ?end }
        OPTIONAL { ?team wdt:P17 ?teamCountry }
      }

      SERVICE wikibase:label { bd:serviceParam wikibase:language "en,es" }
    }
    LIMIT 50
  `;

  return sparqlQuery(query);
}

// Try Spanish label too
async function fetchPlayerBySearchEs(playerName) {
  const escapedName = playerName.replace(/"/g, '\\"');

  const query = `
    SELECT ?player ?playerLabel ?nationalityLabel ?positionLabel
           ?team ?teamLabel ?teamCountryLabel ?start ?end
    WHERE {
      ?player wdt:P106 wd:Q937857 .
      ?player rdfs:label "${escapedName}"@es .

      OPTIONAL { ?player wdt:P27 ?nationality }
      OPTIONAL { ?player wdt:P413 ?position }

      OPTIONAL {
        ?player p:P54 ?stmt .
        ?stmt ps:P54 ?team .
        OPTIONAL { ?stmt pq:P580 ?start }
        OPTIONAL { ?stmt pq:P582 ?end }
        OPTIONAL { ?team wdt:P17 ?teamCountry }
      }

      SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en" }
    }
    LIMIT 50
  `;

  return sparqlQuery(query);
}

function parseYear(dateStr) {
  if (!dateStr) return null;
  const match = dateStr.match(/(\d{4})/);
  return match ? parseInt(match[1], 10) : null;
}

function formatAnios(start, end) {
  const s = parseYear(start);
  const e = parseYear(end);
  if (s && e) return `${s}-${e}`;
  if (s) return `${s}-`;
  return '';
}

function processResults(data, playerName) {
  const bindings = data.results?.bindings || [];
  if (bindings.length === 0) return null;

  const nationality = bindings[0]?.nationalityLabel?.value || '';
  const position = bindings[0]?.positionLabel?.value || '';
  const playerLabel = bindings[0]?.playerLabel?.value || playerName;

  // Group career entries
  const careerMap = new Map();
  for (const b of bindings) {
    const team = b.teamLabel?.value;
    if (!team || team.startsWith('Q')) continue; // Skip unresolved QIDs

    const teamCountry = b.teamCountryLabel?.value;
    const start = b.start?.value;
    const end = b.end?.value;

    const key = `${team}|${formatAnios(start, end)}`;
    if (!careerMap.has(key)) {
      careerMap.set(key, {
        club: team,
        pais: getCountryCode(teamCountry) || '',
        anios: formatAnios(start, end),
        startYear: parseYear(start) || 9999
      });
    }
  }

  // Sort by start year
  const carrera = [...careerMap.values()]
    .sort((a, b) => a.startYear - b.startYear)
    .map(({ club, pais, anios }) => ({ club, pais, anios }));

  // Derive countries played
  const paisesSet = new Set();
  const natCode = getCountryCode(nationality);
  if (natCode) paisesSet.add(natCode);
  for (const c of carrera) {
    if (c.pais) paisesSet.add(c.pais);
  }

  // Map position to Spanish
  const posMap = {
    'goalkeeper': 'arquero',
    'defender': 'defensor', 'centre-back': 'defensor', 'full-back': 'defensor',
    'right-back': 'defensor', 'left-back': 'defensor', 'sweeper': 'defensor',
    'midfielder': 'mediocampista', 'central midfielder': 'mediocampista',
    'defensive midfielder': 'mediocampista', 'attacking midfielder': 'enganche',
    'winger': 'extremo', 'left winger': 'extremo', 'right winger': 'extremo',
    'forward': 'delantero', 'striker': 'goleador', 'centre-forward': 'goleador',
    'second striker': 'delantero',
  };
  const posLower = position.toLowerCase();
  const posEsp = posMap[posLower] || 'mediocampista';

  return {
    id: playerName.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '_'),
    nombre: playerLabel.split(' ').pop(), // Last name as short name
    nombreCompleto: playerLabel,
    nacionalidad: natCode || '',
    posicion: posEsp,
    carrera,
    paises: [...paisesSet],
    _raw: { nationality, position }
  };
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const results = [];
  const failed = [];

  console.log(`Fetching career data for ${names.length} players from Wikidata...`);

  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    process.stdout.write(`[${i + 1}/${names.length}] ${name}... `);

    try {
      let data = await fetchPlayerBySearch(name);
      let player = processResults(data, name);

      // Try Spanish label if English didn't work
      if (!player || player.carrera.length === 0) {
        data = await fetchPlayerBySearchEs(name);
        player = processResults(data, name);
      }

      if (player && player.carrera.length >= 1) {
        results.push(player);
        console.log(`OK (${player.carrera.length} clubs)`);
      } else {
        console.log('NO DATA');
        failed.push(name);
      }
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      failed.push(name);
      // Rate limit: wait longer on error
      await sleep(3000);
    }

    // Be nice to Wikidata
    await sleep(500);
  }

  // Write results
  const outputPath = resolve(ROOT, 'data', 'players-raw.json');
  writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nWrote ${results.length} players to ${outputPath}`);

  if (failed.length > 0) {
    const failedPath = resolve(__dirname, 'failed-names.txt');
    writeFileSync(failedPath, failed.join('\n'));
    console.log(`${failed.length} players failed. See ${failedPath}`);
  }
}

main().catch(console.error);
