#!/usr/bin/env node
import dotenv from 'dotenv';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const ODDS_API_KEY = process.env.VITE_THE_ODDS_API_KEY;
const API_BASE_URL = 'https://api.the-odds-api.com/v4';

async function checkMatches() {
  const scoresUrl = `${API_BASE_URL}/sports/tennis_wta_qatar_open/scores?apiKey=${ODDS_API_KEY}&daysFrom=3`;
  const response = await fetch(scoresUrl);
  const matches = await response.json();
  
  console.log(`\n📊 All ${matches.length} matches in WTA Qatar Open:\n`);
  
  matches.forEach((m, i) => {
    console.log(`${i+1}. ${m.home_team} vs ${m.away_team}`);
    console.log(`   ID: ${m.id}`);
    console.log(`   Completed: ${m.completed}`);
    console.log(`   Commence Time: ${m.commence_time}`);
    console.log(`   Last Update: ${m.last_update || 'N/A'}`);
    
    if (m.scores && m.scores.length > 0) {
      console.log(`   ✅ HAS SCORES:`);
      m.scores.forEach(s => {
        console.log(`      ${s.name}: ${s.score || 'N/A'}`);
      });
    } else {
      console.log(`   ❌ No scores yet`);
    }
    console.log('');
  });
}

checkMatches();
