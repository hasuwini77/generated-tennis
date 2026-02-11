#!/usr/bin/env node

import fetch from 'node-fetch';

async function searchDate(date) {
  const url = `https://api.sofascore.com/api/v1/sport/tennis/scheduled-events/${date}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });
    
    const data = await response.json();
    const matches = data.events.filter(m => m.status?.type === 'finished');
    
    const ealaMatches = matches.filter(m => 
      m.homeTeam?.name?.includes('Eala') || m.awayTeam?.name?.includes('Eala')
    );
    
    if (ealaMatches.length > 0) {
      console.log(`\n=== ${date} ===`);
      ealaMatches.forEach(m => {
        console.log(`${m.homeTeam.name} vs ${m.awayTeam.name}`);
        console.log(`Score: ${m.homeScore?.period1}-${m.awayScore?.period1}, ${m.homeScore?.period2}-${m.awayScore?.period2}${m.homeScore?.period3 ? ', ' + m.homeScore.period3 + '-' + m.awayScore.period3 : ''}`);
        console.log(`Winner: ${m.winnerCode === 1 ? m.homeTeam.name : m.awayTeam.name}\n`);
      });
    }
  } catch (e) {
    // ignore
  }
}

await searchDate('2026-02-08');
await searchDate('2026-02-09');
await searchDate('2026-02-10');
await searchDate('2026-02-11');
await searchDate('2026-02-12');
