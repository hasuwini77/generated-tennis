#!/usr/bin/env node

import fetch from 'node-fetch';

async function findMatches(date, score) {
  const url = `https://api.sofascore.com/api/v1/sport/tennis/scheduled-events/${date}`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json'
    }
  });
  
  const data = await response.json();
  const matches = data.events.filter(m => m.status?.type === 'finished');
  
  // Find matches with score "4-6, 6-3, 3-6"
  const found = matches.filter(m => {
    const s1 = `${m.homeScore?.period1}-${m.awayScore?.period1}`;
    const s2 = `${m.homeScore?.period2}-${m.awayScore?.period2}`;
    const s3 = `${m.homeScore?.period3}-${m.awayScore?.period3}`;
    const fullScore = [s1, s2, s3].filter(s => !s.includes('undefined')).join(', ');
    return fullScore === score;
  });
  
  console.log(`\n=== Matches with score "${score}" on ${date} ===`);
  found.forEach(m => {
    console.log(`${m.homeTeam.name} vs ${m.awayTeam.name}`);
    console.log(`Tournament: ${m.tournament?.uniqueTournament?.name || 'Unknown'}`);
    console.log(`Winner: ${m.winnerCode === 1 ? m.homeTeam.name : m.awayTeam.name}\n`);
  });
}

await findMatches('2026-02-09', '4-6, 6-3, 3-6');
await findMatches('2026-02-10', '4-6, 6-3, 3-6');
