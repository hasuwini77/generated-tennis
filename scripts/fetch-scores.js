#!/usr/bin/env node

/**
 * PuckTrend Score Checker Script v3.0
 * 
 * Runs twice daily (22:00 & 08:00 CET) via GitHub Actions
 * - Checks ALL pending bets in results-history.json
 * - Fetches final scores from The-Odds-API (unified source)
 * - Determines win/loss outcome
 * - Updates results-history.json
 * 
 * Uses The-Odds-API /scores endpoint for all leagues.
 * Same API key, consistent data format, FREE tier.
 */

import fetch from 'node-fetch';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// =============================================================================
// CONFIGURATION
// =============================================================================

const THE_ODDS_API_KEY = process.env.THE_ODDS_API_KEY;
const THE_ODDS_API_BASE = 'https://api.the-odds-api.com/v4';

// League to sport key mapping
const LEAGUE_SPORT_KEYS = {
  'NHL': 'icehockey_nhl',
  'SHL': 'icehockey_sweden_hockey_league',
  'Allsvenskan': 'icehockey_sweden_allsvenskan'
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Read results history file
 */
function getResultsHistory() {
  const path = join(__dirname, '..', 'public', 'data', 'results-history.json');
  const data = readFileSync(path, 'utf-8');
  return JSON.parse(data);
}

/**
 * Save results history file
 */
function saveResultsHistory(history) {
  const path = join(__dirname, '..', 'public', 'data', 'results-history.json');
  writeFileSync(path, JSON.stringify(history, null, 2));
}

/**
 * Normalize team name for matching
 */
function normalizeTeamName(name) {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Match team names between different APIs
 */
function matchTeamName(team1, team2) {
  const normalized1 = normalizeTeamName(team1);
  const normalized2 = normalizeTeamName(team2);
  
  // Direct match
  if (normalized1 === normalized2) return true;
  
  // Partial match (contains)
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) return true;
  
  return false;
}

// =============================================================================
// THE-ODDS-API SCORE FETCHING
// =============================================================================

/**
 * Fetch game scores from The-Odds-API
 * @param {string} league - League name (NHL, SHL, Allsvenskan)
 * @param {string} homeTeam - Home team name
 * @param {string} awayTeam - Away team name
 * @param {string} gameDate - ISO date string
 * @returns {Object|null} { homeScore, awayScore } or null if not found/completed
 */
async function fetchGameScore(league, homeTeam, awayTeam, gameDate) {
  try {
    const sportKey = LEAGUE_SPORT_KEYS[league];
    if (!sportKey) {
      console.log(`   ⚠️  Unknown league: ${league}`);
      return null;
    }
    
    if (!THE_ODDS_API_KEY) {
      console.log(`   ⚠️  THE_ODDS_API_KEY not configured`);
      return null;
    }
    
    console.log(`   [${league}] Fetching score from The-Odds-API...`);
    
    // Calculate days from today
    const gameDateTime = new Date(gameDate);
    const now = new Date();
    const diffTime = now - gameDateTime;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // The-Odds-API scores endpoint
    const url = `${THE_ODDS_API_BASE}/sports/${sportKey}/scores/?apiKey=${THE_ODDS_API_KEY}&daysFrom=${Math.max(1, diffDays)}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.log(`   [${league}] API error: ${response.status}`);
      return null;
    }
    
    const games = await response.json();
    
    if (!games || games.length === 0) {
      console.log(`   [${league}] No completed games found`);
      return null;
    }
    
    // Find matching game
    const game = games.find(g => {
      const home = g.home_team || '';
      const away = g.away_team || '';
      return matchTeamName(homeTeam, home) && matchTeamName(awayTeam, away);
    });
    
    if (!game) {
      console.log(`   [${league}] Game not found in scores`);
      return null;
    }
    
    // Check if game is completed
    if (!game.completed) {
      console.log(`   [${league}] Game not finished yet`);
      return null;
    }
    
    // Get scores
    const homeScore = game.scores?.find(s => s.name === game.home_team)?.score;
    const awayScore = game.scores?.find(s => s.name === game.away_team)?.score;
    
    if (homeScore === undefined || awayScore === undefined) {
      console.log(`   [${league}] Scores not available`);
      return null;
    }
    
    console.log(`   [${league}] ✅ Final score: ${awayTeam} ${awayScore} @ ${homeTeam} ${homeScore}`);
    
    return { 
      homeScore: parseInt(homeScore), 
      awayScore: parseInt(awayScore) 
    };
    
  } catch (error) {
    console.error(`   [${league}] Error fetching score:`, error.message);
    return null;
  }
}

// =============================================================================
// OUTCOME DETERMINATION
// =============================================================================

/**
 * Determine if bet won or lost
 * @param {Object} bet - Bet of the Day
 * @param {Object} finalScore - { homeScore, awayScore }
 * @returns {string} 'WIN', 'LOSS', or 'PUSH'
 */
function determineOutcome(bet, finalScore) {
  const { homeScore, awayScore } = finalScore;
  
  // Determine which team we bet on
  const betOnHome = bet.marketName?.toLowerCase().includes(bet.homeTeam.toLowerCase());
  const betOnAway = bet.marketName?.toLowerCase().includes(bet.awayTeam.toLowerCase());
  
  // If we can't determine, try to infer from the market name
  let ourTeamWon = false;
  
  if (betOnHome) {
    ourTeamWon = homeScore > awayScore;
  } else if (betOnAway) {
    ourTeamWon = awayScore > homeScore;
  } else {
    console.log(`⚠️  Cannot determine which team we bet on from market: ${bet.marketName}`);
    return 'UNKNOWN';
  }
  
  // Handle tie (rare in hockey, usually goes to OT/SO)
  if (homeScore === awayScore) {
    return 'PUSH';
  }
  
  return ourTeamWon ? 'WIN' : 'LOSS';
}

// =============================================================================
// MAIN LOGIC
// =============================================================================

async function main() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   PuckTrend Score Checker - v3.0.0        ║');
  console.log('║   Using The-Odds-API for all leagues      ║');
  console.log('╚════════════════════════════════════════════╝\n');
  
  // Load current data
  const history = getResultsHistory();
  
  // Find all pending bets
  const pendingBets = history.results.filter(r => !r.settled);
  
  if (pendingBets.length === 0) {
    console.log('ℹ️  No pending bets to check.');
    return;
  }
  
  console.log(`\n📊 Found ${pendingBets.length} pending bet(s) to check:\n`);
  
  let updatedCount = 0;
  let stillPendingCount = 0;
  
  // Check each pending bet
  for (const bet of pendingBets) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎯 Checking: ${bet.awayTeam} @ ${bet.homeTeam}`);
    console.log(`   League: ${bet.league}`);
    console.log(`   Date: ${bet.date}`);
    console.log(`   Game Time: ${bet.gameStartTime}`);
    
    // Fetch final score using unified API
    const finalScore = await fetchGameScore(bet.league, bet.homeTeam, bet.awayTeam, bet.gameStartTime);
    
    if (!finalScore) {
      console.log('   ⏳ Game not finished yet or score not available.');
      stillPendingCount++;
      continue;
    }
    
    // Determine outcome - need to construct a bet-like object
    const betData = {
      homeTeam: bet.homeTeam,
      awayTeam: bet.awayTeam,
      marketName: bet.recommendedBet || `${bet.homeTeam} to win` // Fallback
    };
    
    const outcome = determineOutcome(betData, finalScore);
    
    if (outcome === 'UNKNOWN') {
      console.log('   ⚠️  Cannot determine outcome. Manual review needed.');
      stillPendingCount++;
      continue;
    }
    
    console.log(`   🎯 OUTCOME: ${outcome}`);
    
    // Calculate actual return
    let actualReturn = 0;
    if (outcome === 'WIN') {
      actualReturn = (bet.recommendedOdds || 2.0) - 1; // Profit
    } else if (outcome === 'LOSS') {
      actualReturn = -1; // Lost stake
    }
    
    // Update the bet in history
    bet.finalScore = finalScore;
    bet.outcome = outcome;
    bet.actualReturn = actualReturn;
    bet.settled = true;
    bet.settledAt = new Date().toISOString();
    
    updatedCount++;
    console.log(`   ✅ Bet settled!`);
  }
  
  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('\n📊 SUMMARY:');
  console.log(`   ✅ Settled: ${updatedCount} bet(s)`);
  console.log(`   ⏳ Still pending: ${stillPendingCount} bet(s)\n`);
  
  if (updatedCount === 0) {
    console.log('ℹ️  No bets were settled. Will check again next time.');
    return;
  }
  
  // Recalculate stats
  const settledResults = history.results.filter(r => r.settled);
  history.totalBets = settledResults.length;
  history.wins = settledResults.filter(r => r.outcome === 'WIN').length;
  history.losses = settledResults.filter(r => r.outcome === 'LOSS').length;
  history.pending = history.results.filter(r => !r.settled).length;
  history.winRate = history.totalBets > 0 ? (history.wins / history.totalBets) * 100 : 0;
  history.totalROI = settledResults.reduce((sum, r) => sum + (r.actualReturn || 0), 0);
  history.lastUpdated = new Date().toISOString();
  
  // Save
  saveResultsHistory(history);
  
  console.log('\n═══════════════════════════════════════════');
  console.log(`📊 Updated Results History`);
  console.log(`   Total Bets: ${history.totalBets}`);
  console.log(`   Wins: ${history.wins}`);
  console.log(`   Losses: ${history.losses}`);
  console.log(`   Win Rate: ${history.winRate.toFixed(1)}%`);
  console.log(`   Total ROI: ${history.totalROI > 0 ? '+' : ''}${history.totalROI.toFixed(2)} units`);
  console.log('═══════════════════════════════════════════\n');
  
  console.log('✅ Results history updated successfully!\n');
}

// Run
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
