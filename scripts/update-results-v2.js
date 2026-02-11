#!/usr/bin/env node

/**
 * Update Results Script V2 - Improved Results Tracking
 * 
 * Uses RapidAPI Tennis to fetch matches by date and update results-history.json
 * Improved approach: fetches all completed matches from specific dates instead of searching
 * 
 * Run daily (ideally twice: morning and evening to catch all completed matches)
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const RAPIDAPI_KEY = process.env.VITE_RAPIDAPI_TENNIS_KEY;
const RAPIDAPI_HOST = 'tennis-api-atp-wta-itf.p.rapidapi.com';
const RESULTS_FILE = path.join(__dirname, '../public/data/results-history.json');

/**
 * Normalize player name for matching (handles variations in names)
 */
function normalizePlayerName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Check if two player names match (fuzzy matching)
 */
function playerNamesMatch(name1, name2) {
  const norm1 = normalizePlayerName(name1);
  const norm2 = normalizePlayerName(name2);
  
  // Exact match
  if (norm1 === norm2) return true;
  
  // Check if one contains the other (handles first/last name variations)
  const parts1 = norm1.split(' ');
  const parts2 = norm2.split(' ');
  
  // At least surname should match
  if (parts1.length > 0 && parts2.length > 0) {
    const lastName1 = parts1[parts1.length - 1];
    const lastName2 = parts2[parts2.length - 1];
    if (lastName1 === lastName2 && lastName1.length > 2) {
      return true;
    }
  }
  
  return false;
}

/**
 * Fetch finished matches for a specific date
 */
async function fetchMatchesByDate(dateString) {
  try {
    // Format: YYYY-MM-DD -> DD/MM/YYYY for API
    const [year, month, day] = dateString.split('-');
    const apiDate = `${day}/${month}/${year}`;
    
    const url = `https://${RAPIDAPI_HOST}/tennis/matches/${apiDate}`;
    const options = {
      method: 'GET',
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
      }
    };
    
    const response = await fetch(url, options);
    if (!response.ok) {
      if (response.status === 404) {
        return []; // No matches on this date
      }
      console.warn(`[RapidAPI] Failed to fetch matches for ${dateString}: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    
    // Filter for finished matches
    const finishedMatches = [];
    if (data.events && Array.isArray(data.events)) {
      for (const event of data.events) {
        if (event.status?.type === 'finished') {
          finishedMatches.push(event);
        }
      }
    }
    
    return finishedMatches;
  } catch (error) {
    console.error(`[RapidAPI] Error fetching matches for ${dateString}:`, error.message);
    return [];
  }
}

/**
 * Find a completed match for a bet
 */
async function findCompletedMatchForBet(bet, completedMatches) {
  const betHome = normalizePlayerName(bet.homeTeam);
  const betAway = normalizePlayerName(bet.awayTeam);
  
  // Find match with matching players
  for (const match of completedMatches) {
    const matchHome = normalizePlayerName(match.homeTeam?.name || '');
    const matchAway = normalizePlayerName(match.awayTeam?.name || '');
    
    // Check both orientations
    const matchForward = playerNamesMatch(betHome, matchHome) && playerNamesMatch(betAway, matchAway);
    const matchReverse = playerNamesMatch(betHome, matchAway) && playerNamesMatch(betAway, matchHome);
    
    if (matchForward || matchReverse) {
      return match;
    }
  }
  
  return null;
}

/**
 * Determine match winner and score
 */
function getMatchWinner(matchEvent) {
  // Count sets won by each player
  let homeSets = 0;
  let awaySets = 0;
  const setScores = [];
  
  // Check up to 5 sets
  for (let i = 1; i <= 5; i++) {
    const homePeriod = matchEvent.homeScore?.[`period${i}`];
    const awayPeriod = matchEvent.awayScore?.[`period${i}`];
    
    if (homePeriod === undefined || homePeriod === null) break;
    
    setScores.push(`${homePeriod}-${awayPeriod}`);
    
    if (homePeriod > awayPeriod) {
      homeSets++;
    } else if (awayPeriod > homePeriod) {
      awaySets++;
    }
  }
  
  return {
    homeWon: homeSets > awaySets,
    awayWon: awaySets > homeSets,
    score: setScores.join(', '),
    homeSets,
    awaySets
  };
}

/**
 * Update results history
 */
async function updateResultsHistory() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   Update Bet Results - V2.0 (Enhanced)   ║');
  console.log('╚════════════════════════════════════════════╝\n');
  
  // Load current results history
  let history;
  try {
    const data = fs.readFileSync(RESULTS_FILE, 'utf-8');
    history = JSON.parse(data);
  } catch (error) {
    console.error('❌ Failed to load results-history.json:', error.message);
    process.exit(1);
  }
  
  // Get all pending bets
  const pendingBets = history.bets.filter(b => b.status === 'pending');
  const pendingSafeBets = history.safeBets ? history.safeBets.filter(b => b.status === 'pending') : [];
  
  console.log(`Found ${pendingBets.length} pending value bet(s) to check`);
  console.log(`Found ${pendingSafeBets.length} pending safe bet(s) to check\n`);
  
  if (pendingBets.length === 0 && pendingSafeBets.length === 0) {
    console.log('✅ No pending bets to update!\n');
    return;
  }
  
  // Collect unique dates from pending bets
  const datesToCheck = new Set();
  [...pendingBets, ...pendingSafeBets].forEach(bet => {
    datesToCheck.add(bet.date);
    
    // Also check the day after match time (in case match finished late)
    if (bet.matchTime) {
      const matchDate = new Date(bet.matchTime);
      const nextDay = new Date(matchDate);
      nextDay.setDate(nextDay.getDate() + 1);
      datesToCheck.add(nextDay.toISOString().split('T')[0]);
    }
  });
  
  console.log(`📅 Checking matches from ${datesToCheck.size} date(s)...\n`);
  
  // Fetch all completed matches for these dates
  const allCompletedMatches = [];
  for (const dateStr of Array.from(datesToCheck)) {
    console.log(`[${dateStr}] Fetching matches...`);
    const matches = await fetchMatchesByDate(dateStr);
    console.log(`[${dateStr}] Found ${matches.length} finished matches`);
    allCompletedMatches.push(...matches);
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log(`\n✅ Total finished matches found: ${allCompletedMatches.length}\n`);
  
  let updatedValueBets = 0;
  let updatedSafeBets = 0;
  let totalROI = history.stats?.totalROI || 0;
  let safeTotalROI = history.safeBetStats?.totalROI || 0;
  
  // Update value bets
  console.log('🔍 Checking VALUE BETS...\n');
  for (let i = 0; i < history.bets.length; i++) {
    const bet = history.bets[i];
    
    if (bet.status !== 'pending') continue;
    
    const match = await findCompletedMatchForBet(bet, allCompletedMatches);
    
    if (!match) {
      console.log(`⏳ ${bet.homeTeam} vs ${bet.awayTeam} - Still pending`);
      continue;
    }
    
    const result = getMatchWinner(match);
    
    // Determine if bet won
    const betOn = normalizePlayerName(bet.outcome);
    const homeNorm = normalizePlayerName(bet.homeTeam);
    const awayNorm = normalizePlayerName(bet.awayTeam);
    
    let betWon = false;
    if (playerNamesMatch(betOn, bet.homeTeam)) {
      betWon = result.homeWon;
    } else if (playerNamesMatch(betOn, bet.awayTeam)) {
      betWon = result.awayWon;
    }
    
    const roi = betWon ? (bet.odds - 1) : -1;
    totalROI += roi;
    
    history.bets[i] = {
      ...bet,
      status: betWon ? 'win' : 'loss',
      result: result.score,
      roi: parseFloat(roi.toFixed(2))
    };
    
    updatedValueBets++;
    console.log(`${betWon ? '✅ WIN' : '❌ LOSS'} | ${bet.homeTeam} vs ${bet.awayTeam}`);
    console.log(`   Score: ${result.score} | ROI: ${roi > 0 ? '+' : ''}${roi.toFixed(2)}u | Odds: ${bet.odds}\n`);
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Update safe bets
  if (history.safeBets && history.safeBets.length > 0) {
    console.log('🔍 Checking SAFE BETS...\n');
    for (let i = 0; i < history.safeBets.length; i++) {
      const bet = history.safeBets[i];
      
      if (bet.status !== 'pending') continue;
      
      const match = await findCompletedMatchForBet(bet, allCompletedMatches);
      
      if (!match) {
        console.log(`⏳ ${bet.homeTeam} vs ${bet.awayTeam} - Still pending`);
        continue;
      }
      
      const result = getMatchWinner(match);
      
      const betOn = normalizePlayerName(bet.outcome);
      let betWon = false;
      if (playerNamesMatch(betOn, bet.homeTeam)) {
        betWon = result.homeWon;
      } else if (playerNamesMatch(betOn, bet.awayTeam)) {
        betWon = result.awayWon;
      }
      
      const roi = betWon ? (bet.odds - 1) : -1;
      safeTotalROI += roi;
      
      history.safeBets[i] = {
        ...bet,
        status: betWon ? 'win' : 'loss',
        result: result.score,
        roi: parseFloat(roi.toFixed(2))
      };
      
      updatedSafeBets++;
      console.log(`${betWon ? '✅ WIN' : '❌ LOSS'} | ${bet.homeTeam} vs ${bet.awayTeam}`);
      console.log(`   Score: ${result.score} | ROI: ${roi > 0 ? '+' : ''}${roi.toFixed(2)}u | Odds: ${bet.odds}\n`);
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  // Update stats
  const valueWins = history.bets.filter(b => b.status === 'win').length;
  const valueLosses = history.bets.filter(b => b.status === 'loss').length;
  const valuePending = history.bets.filter(b => b.status === 'pending').length;
  const valueSettled = valueWins + valueLosses;
  
  history.stats = {
    totalBets: history.bets.length,
    wins: valueWins,
    losses: valueLosses,
    pending: valuePending,
    totalROI: parseFloat(totalROI.toFixed(2)),
    winRate: valueSettled > 0 ? parseFloat(((valueWins / valueSettled) * 100).toFixed(1)) : 0
  };
  
  if (history.safeBets) {
    const safeWins = history.safeBets.filter(b => b.status === 'win').length;
    const safeLosses = history.safeBets.filter(b => b.status === 'loss').length;
    const safePending = history.safeBets.filter(b => b.status === 'pending').length;
    const safeSettled = safeWins + safeLosses;
    
    history.safeBetStats = {
      totalBets: history.safeBets.length,
      wins: safeWins,
      losses: safeLosses,
      pending: safePending,
      totalROI: parseFloat(safeTotalROI.toFixed(2)),
      winRate: safeSettled > 0 ? parseFloat(((safeWins / safeSettled) * 100).toFixed(1)) : 0
    };
  }
  
  // Save updated history
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(history, null, 2), 'utf-8');
  
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║              📊 FINAL SUMMARY              ║');
  console.log('╚════════════════════════════════════════════╝\n');
  
  console.log('💎 VALUE BETS:');
  console.log(`   Updated: ${updatedValueBets} bet(s)`);
  console.log(`   Wins: ${valueWins} | Losses: ${valueLosses} | Pending: ${valuePending}`);
  console.log(`   Win Rate: ${history.stats.winRate}%`);
  console.log(`   Total ROI: ${totalROI > 0 ? '+' : ''}${totalROI.toFixed(2)} units\n`);
  
  if (history.safeBets) {
    console.log('🛡️  SAFE BETS:');
    console.log(`   Updated: ${updatedSafeBets} bet(s)`);
    console.log(`   Wins: ${history.safeBetStats.wins} | Losses: ${history.safeBetStats.losses} | Pending: ${history.safeBetStats.pending}`);
    console.log(`   Win Rate: ${history.safeBetStats.winRate}%`);
    console.log(`   Total ROI: ${safeTotalROI > 0 ? '+' : ''}${safeTotalROI.toFixed(2)} units\n`);
  }
  
  console.log('✅ Results history updated successfully!\n');
}

// Run the script
if (!RAPIDAPI_KEY) {
  console.error('❌ Missing VITE_RAPIDAPI_TENNIS_KEY in .env.local');
  process.exit(1);
}

updateResultsHistory().catch(error => {
  console.error('❌ Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
