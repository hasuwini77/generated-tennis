#!/usr/bin/env node

/**
 * Quick Tennis Scan for Today
 * Uses LiveScore for matches + Manual odds input
 */

import fetch from 'node-fetch';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const RAPIDAPI_KEY = "bccefb9e3cmsh6275b4d52bc7d3fp18858cjsn571965f8e30e";

console.log('╔════════════════════════════════════════════╗');
console.log('║  Today\'s Tennis Matches - Quick Scan     ║');
console.log('╚════════════════════════════════════════════╝\n');

async function getTodayMatches() {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
  
  const url = `https://livescore6.p.rapidapi.com/matches/v2/list-by-date?Category=tennis&Date=${dateStr}&Timezone=0`;
  
  const response = await fetch(url, {
    headers: {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': 'livescore6.p.rapidapi.com'
    }
  });
  
  const data = await response.json();
  const stages = data.Stages || [];
  
  const atpWtaMatches = [];
  
  stages.forEach(stage => {
    const tournamentName = stage.Snm || '';
    const category = stage.Cnm || '';
    
    // Filter for ATP/WTA main tours
    const isMainTour = 
      category.includes('ATP') || 
      category.includes('WTA') ||
      tournamentName.includes('ATP') ||
      tournamentName.includes('WTA');
    
    if (!isMainTour) return;
    
    const events = stage.Events || [];
    
    events.forEach(event => {
      const player1 = event.T1?.[0]?.Nm || '';
      const player2 = event.T2?.[0]?.Nm || '';
      const status = event.Eps || '';
      const startTime = event.Esd;
      
      if (!player1 || !player2) return;
      if (status === 'FT' || status === 'Canc.') return; // Skip finished/cancelled
      
      atpWtaMatches.push({
        id: event.Eid,
        tournament: tournamentName,
        category: category,
        player1,
        player2,
        status,
        startTime: new Date(String(startTime).slice(0,4) + '-' + 
                           String(startTime).slice(4,6) + '-' + 
                           String(startTime).slice(6,8) + ' ' + 
                           String(startTime).slice(8,10) + ':' + 
                           String(startTime).slice(10,12)).toISOString(),
        league: category.includes('WTA') ? 'WTA' : 'ATP'
      });
    });
  });
  
  return atpWtaMatches;
}

async function main() {
  console.log('Fetching today\'s ATP/WTA matches...\n');
  
  const matches = await getTodayMatches();
  
  console.log(`✅ Found ${matches.length} ATP/WTA matches today\n`);
  
  console.log('=== TOP MATCHES ===\n');
  
  matches.slice(0, 15).forEach((match, idx) => {
    console.log(`${idx + 1}. ${match.player1} vs ${match.player2}`);
    console.log(`   📍 ${match.tournament} (${match.league})`);
    console.log(`   ⏰ ${new Date(match.startTime).toLocaleString()}`);
    console.log('');
  });
  
  // Save to file
  const outputPath = join(__dirname, '..', 'public', 'data', 'today-matches.json');
  writeFileSync(outputPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalMatches: matches.length,
    matches: matches
  }, null, 2));
  
  console.log(`\n✅ Saved ${matches.length} matches to today-matches.json`);
  
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║  NEXT STEP: Add Odds Manually             ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('\nTo get EV analysis:');
  console.log('1. Visit Bet365, Pinnacle, or any bookmaker');
  console.log('2. Find odds for these matches');
  console.log('3. Run: node scripts/analyze-with-odds.js');
  console.log('4. Enter odds when prompted');
  console.log('5. Get AI EV analysis!\n');
}

main().catch(console.error);
