#!/usr/bin/env node

import fetch from 'node-fetch';

async function checkMatch(date, player1, player2) {
  const url = `https://api.sofascore.com/api/v1/sport/tennis/scheduled-events/${date}`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json'
    }
  });
  
  const data = await response.json();
  const matches = data.events.filter(m => m.status?.type === 'finished');
  
  const match = matches.find(m => 
    (m.homeTeam?.name?.includes(player1) || m.awayTeam?.name?.includes(player1)) &&
    (m.homeTeam?.name?.includes(player2) || m.awayTeam?.name?.includes(player2))
  );
  
  if (match) {
    console.log(`\n=== ${player1} vs ${player2} ===`);
    console.log(`Home: ${match.homeTeam.name} | Away: ${match.awayTeam.name}`);
    console.log(`Score: ${match.homeScore?.period1}-${match.awayScore?.period1}, ${match.homeScore?.period2}-${match.awayScore?.period2}${match.homeScore?.period3 ? ', ' + match.homeScore.period3 + '-' + match.awayScore.period3 : ''}`);
    console.log(`Winner Code: ${match.winnerCode} (1=home, 2=away)`);
    console.log(`WINNER: ${match.winnerCode === 1 ? match.homeTeam.name : match.awayTeam.name}`);
  } else {
    console.log(`\n=== ${player1} vs ${player2} === NOT FOUND`);
  }
}

await checkMatch('2026-02-09', 'Tjen', 'Haddad');
await checkMatch('2026-02-09', 'Eala', 'Valentova');
await checkMatch('2026-02-10', 'Frech', 'Li');
await checkMatch('2026-02-09', 'Kalinskaya', 'Bouzas');
