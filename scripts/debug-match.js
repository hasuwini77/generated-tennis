#!/usr/bin/env node

import fetch from 'node-fetch';

// Let's check a specific match - Frech vs Li on 2026-02-10
const date = '2026-02-10';
const url = `https://api.sofascore.com/api/v1/sport/tennis/scheduled-events/${date}`;

const response = await fetch(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json'
  }
});

const data = await response.json();
const matches = data.events.filter(m => m.status?.type === 'finished');

// Find Frech vs Li match
const frechMatch = matches.find(m => 
  (m.homeTeam?.name?.includes('Frech') || m.awayTeam?.name?.includes('Frech')) &&
  (m.homeTeam?.name?.includes('Li') || m.awayTeam?.name?.includes('Li'))
);

if (frechMatch) {
  console.log('=== FRECH vs LI MATCH ===');
  console.log('Home Team:', frechMatch.homeTeam?.name);
  console.log('Away Team:', frechMatch.awayTeam?.name);
  console.log('\nHome Score:', JSON.stringify(frechMatch.homeScore, null, 2));
  console.log('\nAway Score:', JSON.stringify(frechMatch.awayScore, null, 2));
  console.log('\nWinner Code:', frechMatch.winnerCode); // 1 = home, 2 = away
}

// Find Eala vs Valentova
const date2 = '2026-02-09';
const url2 = `https://api.sofascore.com/api/v1/sport/tennis/scheduled-events/${date2}`;

const response2 = await fetch(url2, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json'
  }
});

const data2 = await response2.json();
const matches2 = data2.events.filter(m => m.status?.type === 'finished');

const ealaMatch = matches2.find(m => 
  (m.homeTeam?.name?.includes('Eala') || m.awayTeam?.name?.includes('Eala')) &&
  (m.homeTeam?.name?.includes('Valentova') || m.awayTeam?.name?.includes('Valentova'))
);

if (ealaMatch) {
  console.log('\n\n=== EALA vs VALENTOVA MATCH ===');
  console.log('Home Team:', ealaMatch.homeTeam?.name);
  console.log('Away Team:', ealaMatch.awayTeam?.name);
  console.log('\nHome Score:', JSON.stringify(ealaMatch.homeScore, null, 2));
  console.log('\nAway Score:', JSON.stringify(ealaMatch.awayScore, null, 2));
  console.log('\nWinner Code:', ealaMatch.winnerCode);
}

// Find Tjen vs Haddad Maia
const tjenMatch = matches2.find(m => 
  (m.homeTeam?.name?.includes('Tjen') || m.awayTeam?.name?.includes('Tjen')) &&
  (m.homeTeam?.name?.includes('Haddad') || m.awayTeam?.name?.includes('Haddad'))
);

if (tjenMatch) {
  console.log('\n\n=== TJEN vs HADDAD MAIA MATCH ===');
  console.log('Home Team:', tjenMatch.homeTeam?.name);
  console.log('Away Team:', tjenMatch.awayTeam?.name);
  console.log('\nHome Score:', JSON.stringify(tjenMatch.homeScore, null, 2));
  console.log('\nAway Score:', JSON.stringify(tjenMatch.awayScore, null, 2));
  console.log('\nWinner Code:', tjenMatch.winnerCode);
}
