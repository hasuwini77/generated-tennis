#!/usr/bin/env node

import fetch from 'node-fetch';

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

const frechMatch = matches.find(m => 
  (m.homeTeam?.name?.includes('Frech') || m.awayTeam?.name?.includes('Frech')) &&
  (m.homeTeam?.name?.includes('Li') || m.awayTeam?.name?.includes('Li'))
);

if (frechMatch) {
  console.log('Full match object:');
  console.log(JSON.stringify(frechMatch, null, 2));
}
