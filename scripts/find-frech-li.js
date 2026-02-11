#!/usr/bin/env node

import fetch from 'node-fetch';

for (const date of ['2026-02-08', '2026-02-09', '2026-02-10', '2026-02-11']) {
  const url = `https://api.sofascore.com/api/v1/sport/tennis/scheduled-events/${date}`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json'
    }
  });
  
  const data = await response.json();
  const matches = data.events.filter(m => {
    if (m.status?.type !== 'finished') return false;
    const homeName = m.homeTeam?.name || '';
    const awayName = m.awayTeam?.name || '';
    if (homeName.includes(' / ') || awayName.includes(' / ')) return false;
    return (homeName.includes('Frech') || awayName.includes('Frech')) &&
           (homeName.includes('Li') || awayName.includes('Li'));
  });
  
  if (matches.length > 0) {
    console.log(`\n=== ${date} ===`);
    matches.forEach(m => {
      console.log(`${m.homeTeam.name} vs ${m.awayTeam.name}`);
      console.log(`Winner: ${m.winnerCode === 1 ? m.homeTeam.name : m.awayTeam.name}`);
      const s = [];
      for (let i = 1; i <= 3; i++) {
        if (m.homeScore[`period${i}`] !== undefined) {
          s.push(`${m.homeScore[`period${i}`]}-${m.awayScore[`period${i}`]}`);
        }
      }
      console.log(`Score: ${s.join(', ')}\n`);
    });
  }
}
