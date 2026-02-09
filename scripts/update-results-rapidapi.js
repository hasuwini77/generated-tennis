#!/usr/bin/env node

/**
 * Update Results Script - RapidAPI Tennis
 * 
 * Uses RapidAPI Tennis API to fetch completed match results
 * and update results-history.json with win/loss status and ROI calculations.
 * 
 * Run daily (ideally 6-12 hours after last match of the day)
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
 * Normalize player name for matching
 */
function normalizePlayerName(name) {
  if (!name) return '';
  return name.toLowerCase().trim().replace(/[^a-z\s]/g, '');
}

/**
 * Search for a player/match using RapidAPI
 */
async function searchMatch(playerName) {
  try {
    const url = `https://${RAPIDAPI_HOST}/tennis/v2/search?search=${encodeURIComponent(playerName)}`;
    const options = {
      method: 'GET',
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
      }
    };
    
    const response = await fetch(url, options);
    if (!response.ok) {
      console.warn(`[RapidAPI] Search failed for "${playerName}": ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`[RapidAPI] Error searching for "${playerName}":`, error.message);
    return null;
  }
}

/**
 * Get match details by ID
 */
async function getMatchDetails(matchId) {
  try {
    const url = `https://${RAPIDAPI_HOST}/tennis/match/${matchId}`;
    const options = {
      method: 'GET',
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
      }
    };
    
    const response = await fetch(url, options);
    if (!response.ok) {
      console.warn(`[RapidAPI] Match details failed for ID ${matchId}: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`[RapidAPI] Error fetching match ${matchId}:`, error.message);
    return null;
  }
}

/**
 * Find completed match for a bet
 */
async function findCompletedMatch(bet) {
  console.log(`\n[Search] Looking for: ${bet.homeTeam} vs ${bet.awayTeam}`);
  
  // Search for the match using player names
  const searchResults = await searchMatch(`${bet.homeTeam} ${bet.awayTeam}`);
  
  if (!searchResults || !searchResults.events || searchResults.events.length === 0) {
    console.log(`  ℹ️  No matches found`);
    return null;
  }
  
  // Filter for completed matches
  const completedMatches = searchResults.events.filter(event => {
    const status = event.status?.type;
    return status === 'finished';
  });
  
  if (completedMatches.length === 0) {
    console.log(`  ℹ️  Match not yet completed`);
    return null;
  }
  
  // Find best match based on player names
  const matchedEvent = completedMatches.find(event => {
    const home = normalizePlayerName(event.homeTeam?.name || '');
    const away = normalizePlayerName(event.awayTeam?.name || '');
    const betHome = normalizePlayerName(bet.homeTeam);
    const betAway = normalizePlayerName(bet.awayTeam);
    
    return (home === betHome && away === betAway) || 
           (home === betAway && away === betHome);
  });
  
  if (!matchedEvent) {
    console.log(`  ℹ️  No exact match found in completed matches`);
    return null;
  }
  
  console.log(`  ✅ Found completed match (ID: ${matchedEvent.id})`);
  return matchedEvent;
}

/**
 * Determine match winner
 */
function getMatchWinner(matchEvent, bet) {
  const homeScore = matchEvent.homeScore?.current || 0;
  const awayScore = matchEvent.awayScore?.current || 0;
  
  let homeWon = false;
  let awayWon = false;
  
  // In tennis, winner has more sets won
  if (matchEvent.homeScore?.period1 !== undefined && matchEvent.awayScore?.period1 !== undefined) {
    // Count sets won
    let homeSets = 0;
    let awaySets = 0;
    
    for (let i = 1; i <= 5; i++) {
      const homePeriod = matchEvent.homeScore[`period${i}`];
      const awayPeriod = matchEvent.awayScore[`period${i}`];
      
      if (homePeriod === undefined) break;
      
      if (homePeriod > awayPeriod) homeSets++;
      else if (awayPeriod > homePeriod) awaySets++;
    }
    
    homeWon = homeSets > awaySets;
    awayWon = awaySets > homeSets;
  } else {
    // Fallback to current score
    homeWon = homeScore > awayScore;
    awayWon = awayScore > homeScore;
  }
  
  return {
    homeWon,
    awayWon,
    homeScore: homeScore,
    awayScore: awayScore
  };
}

/**
 * Update results history with completed matches
 */
async function updateResultsHistory() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   Update Bet Results - RapidAPI v1.0     ║');
  console.log('╚════════════════════════════════════════════╝\n');
  
  if (!RAPIDAPI_KEY) {
    console.error('❌ Missing VITE_RAPIDAPI_TENNIS_KEY in .env.local');
    process.exit(1);
  }
  
  // Load current results history
  let history;
  try {
    const data = fs.readFileSync(RESULTS_FILE, 'utf-8');
    history = JSON.parse(data);
  } catch (error) {
    console.error('❌ Failed to load results-history.json:', error.message);
    return;
  }
  
  // Ensure safeBets and safeBetStats exist
  if (!history.safeBets) history.safeBets = [];
  if (!history.safeBetStats) {
    history.safeBetStats = { totalBets: 0, wins: 0, losses: 0, pending: 0, totalROI: 0 };
  }
  
  const pendingBets = history.bets.filter(b => b.status === 'pending');
  const pendingSafeBets = history.safeBets.filter(b => b.status === 'pending');
  
  console.log(`Found ${pendingBets.length} pending value bet(s) to check`);
  console.log(`Found ${pendingSafeBets.length} pending safe bet(s) to check\n`);
  
  if (pendingBets.length === 0 && pendingSafeBets.length === 0) {
    console.log('✅ All bets are already settled!\n');
    return;
  }
  
  let updatedCount = 0;
  let safeUpdatedCount = 0;
  let totalROI = history.stats.totalROI || 0;
  let safeTotalROI = history.safeBetStats.totalROI || 0;
  
  // Check each pending value bet
  for (const bet of pendingBets) {
    const matchEvent = await findCompletedMatch(bet);
    
    if (!matchEvent) {
      continue; // Match not completed yet
    }
    
    // Determine winner
    const result = getMatchWinner(matchEvent, bet);
    
    // Check if our bet won
    const betOn = normalizePlayerName(bet.outcome);
    const homeNorm = normalizePlayerName(bet.homeTeam);
    const awayNorm = normalizePlayerName(bet.awayTeam);
    
    let betWon = false;
    if (betOn === homeNorm) {
      betWon = result.homeWon;
    } else if (betOn === awayNorm) {
      betWon = result.awayWon;
    }
    
    // Calculate ROI (assuming 1 unit bet)
    const roi = betWon ? (bet.odds - 1) : -1;
    totalROI += roi;
    
    // Update bet in history
    const betIndex = history.bets.findIndex(b => b.id === bet.id);
    if (betIndex !== -1) {
      history.bets[betIndex] = {
        ...bet,
        status: betWon ? 'win' : 'loss',
        result: `${result.homeScore} - ${result.awayScore}`,
        roi: parseFloat(roi.toFixed(2))
      };
      
      updatedCount++;
      console.log(`✅ [VALUE] ${bet.homeTeam} vs ${bet.awayTeam}: ${betWon ? 'WIN ✓' : 'LOSS ✗'} (ROI: ${roi > 0 ? '+' : ''}${roi.toFixed(2)}u)`);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Check each pending safe bet
  for (const bet of pendingSafeBets) {
    const matchEvent = await findCompletedMatch(bet);
    
    if (!matchEvent) {
      continue;
    }
    
    const result = getMatchWinner(matchEvent, bet);
    
    const betOn = normalizePlayerName(bet.outcome);
    const homeNorm = normalizePlayerName(bet.homeTeam);
    const awayNorm = normalizePlayerName(bet.awayTeam);
    
    let betWon = false;
    if (betOn === homeNorm) {
      betWon = result.homeWon;
    } else if (betOn === awayNorm) {
      betWon = result.awayWon;
    }
    
    const roi = betWon ? (bet.odds - 1) : -1;
    safeTotalROI += roi;
    
    const betIndex = history.safeBets.findIndex(b => b.id === bet.id);
    if (betIndex !== -1) {
      history.safeBets[betIndex] = {
        ...bet,
        status: betWon ? 'win' : 'loss',
        result: `${result.homeScore} - ${result.awayScore}`,
        roi: parseFloat(roi.toFixed(2))
      };
      
      safeUpdatedCount++;
      console.log(`✅ [SAFE] ${bet.homeTeam} vs ${bet.awayTeam}: ${betWon ? 'WIN ✓' : 'LOSS ✗'} (ROI: ${roi > 0 ? '+' : ''}${roi.toFixed(2)}u)`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Update stats
  const wins = history.bets.filter(b => b.status === 'win').length;
  const losses = history.bets.filter(b => b.status === 'loss').length;
  const pending = history.bets.filter(b => b.status === 'pending').length;
  const settled = wins + losses;
  
  const safeWins = history.safeBets.filter(b => b.status === 'win').length;
  const safeLosses = history.safeBets.filter(b => b.status === 'loss').length;
  const safePending = history.safeBets.filter(b => b.status === 'pending').length;
  const safeSettled = safeWins + safeLosses;
  
  history.stats = {
    totalBets: history.bets.length,
    wins,
    losses,
    pending,
    totalROI: parseFloat(totalROI.toFixed(2)),
    winRate: settled > 0 ? parseFloat(((wins / settled) * 100).toFixed(1)) : 0
  };
  
  history.safeBetStats = {
    totalBets: history.safeBets.length,
    wins: safeWins,
    losses: safeLosses,
    pending: safePending,
    totalROI: parseFloat(safeTotalROI.toFixed(2)),
    winRate: safeSettled > 0 ? parseFloat(((safeWins / safeSettled) * 100).toFixed(1)) : 0
  };
  
  // Save updated history
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(history, null, 2), 'utf-8');
  
  console.log(`\n📊 SUMMARY:`);
  console.log(`\n💎 VALUE BETS:`);
  console.log(`   Updated: ${updatedCount} bet(s)`);
  console.log(`   Wins: ${wins} | Losses: ${losses} | Pending: ${pending}`);
  console.log(`   Win Rate: ${history.stats.winRate}%`);
  console.log(`   Total ROI: ${totalROI > 0 ? '+' : ''}${totalROI.toFixed(2)} units`);
  
  console.log(`\n🛡️  SAFE BETS:`);
  console.log(`   Updated: ${safeUpdatedCount} bet(s)`);
  console.log(`   Wins: ${safeWins} | Losses: ${safeLosses} | Pending: ${safePending}`);
  console.log(`   Win Rate: ${history.safeBetStats.winRate}%`);
  console.log(`   Total ROI: ${safeTotalROI > 0 ? '+' : ''}${safeTotalROI.toFixed(2)} units`);
  
  console.log(`\n✅ Results history updated!\n`);
}

// Run the script
updateResultsHistory();
