#!/usr/bin/env node

/**
 * TennTrend Match Results Checker Script v1.0
 * 
 * Runs twice daily (22:00 & 08:00 CET) via GitHub Actions
 * - Checks ALL pending bets in results-history.json
 * - Fetches final match results from The-Odds-API
 * - Determines win/loss outcome
 * - Updates results-history.json
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

console.log('╔════════════════════════════════════════════╗');
console.log('║   TennTrend Results Checker - v1.0        ║');
console.log('╚════════════════════════════════════════════╝\n');

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Read results history file
 */
function getResultsHistory() {
  const path = join(__dirname, '..', 'public', 'data', 'results-history.json');
  try {
    const data = readFileSync(path, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.log('No existing history file found, creating new one');
    return { bets: [], stats: { totalBets: 0, wins: 0, losses: 0, pending: 0, totalROI: 0 } };
  }
}

/**
 * Save results history file
 */
function saveResultsHistory(history) {
  const path = join(__dirname, '..', 'public', 'data', 'results-history.json');
  writeFileSync(path, JSON.stringify(history, null, 2));
}

/**
 * Normalize player name for matching
 */
function normalizePlayerName(name) {
  return name.toLowerCase().trim()
    .replace(/\s+/g, ' ')
    .replace(/[.\-']/g, ''); // Remove periods, hyphens, apostrophes
}

/**
 * Match player names between different APIs
 */
function matchPlayerName(player1, player2) {
  const normalized1 = normalizePlayerName(player1);
  const normalized2 = normalizePlayerName(player2);
  
  // Direct match
  if (normalized1 === normalized2) return true;
  
  // Last name match (handles "Federer, Roger" vs "Roger Federer")
  const lastName1 = normalized1.split(' ').pop();
  const lastName2 = normalized2.split(' ').pop();
  if (lastName1 && lastName2 && lastName1 === lastName2) return true;
  
  // Partial match
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) return true;
  
  return false;
}

/**
 * Get all active tennis tournaments from The-Odds-API
 */
async function getActiveTennisTournaments() {
  try {
    const url = `${THE_ODDS_API_BASE}/sports/?apiKey=${THE_ODDS_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Failed to fetch active tournaments:', response.status);
      return [];
    }
    
    const sports = await response.json();
    const tennisSports = sports.filter(sport => 
      sport.key.includes('tennis') && sport.active
    );
    
    return tennisSports;
  } catch (error) {
    console.error('Error fetching active tournaments:', error.message);
    return [];
  }
}

/**
 * Fetch match result from The-Odds-API
 */
async function fetchMatchResult(player1, player2, matchDate) {
  try {
    if (!THE_ODDS_API_KEY) {
      console.log('   ⚠️  THE_ODDS_API_KEY not configured');
      return null;
    }
    
    console.log(`   Checking: ${player1} vs ${player2}`);
    
    // Get all active tennis tournaments
    const tournaments = await getActiveTennisTournaments();
    
    if (tournaments.length === 0) {
      console.log('   No active tennis tournaments found');
      return null;
    }
    
    // Calculate days from match date
    const matchDateTime = new Date(matchDate);
    const now = new Date();
    const diffTime = now - matchDateTime;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Check scores across all tournaments
    for (const tournament of tournaments) {
      const url = `${THE_ODDS_API_BASE}/sports/${tournament.key}/scores/?apiKey=${THE_ODDS_API_KEY}&daysFrom=${Math.max(1, diffDays)}`;
      
      const response = await fetch(url);
      
      if (!response.ok) continue;
      
      const matches = await response.json();
      
      if (!matches || matches.length === 0) continue;
      
      // Find matching match
      const match = matches.find(m => {
        const home = m.home_team || '';
        const away = m.away_team || '';
        return (matchPlayerName(player1, home) && matchPlayerName(player2, away)) ||
               (matchPlayerName(player1, away) && matchPlayerName(player2, home));
      });
      
      if (match && match.completed) {
        // Determine winner
        const homeTeam = match.home_team;
        const awayTeam = match.away_team;
        const scores = match.scores || [];
        
        const homeScore = scores.find(s => s.name === homeTeam);
        const awayScore = scores.find(s => s.name === awayTeam);
        
        // In tennis, winner has more score or is indicated differently
        // The Odds API might just show winner
        let winner = null;
        
        if (homeScore && awayScore) {
          winner = homeScore.score > awayScore.score ? homeTeam : awayTeam;
        } else if (match.last_update) {
          // If no scores, try to determine from other fields
          // This is fallback logic
          console.log('   Match completed but no scores available');
          return null;
        }
        
        console.log(`   ✅ Match completed: Winner is ${winner}`);
        
        return {
          completed: true,
          winner: winner,
          homeTeam: homeTeam,
          awayTeam: awayTeam
        };
      }
    }
    
    console.log('   Match not found or not completed');
    return null;
    
  } catch (error) {
    console.error('   Error fetching match result:', error.message);
    return null;
  }
}

/**
 * Determine if bet won or lost
 */
function determineOutcome(bet, matchResult) {
  const { winner } = matchResult;
  
  // Get the player we bet on from the bet outcome
  const betPlayer = bet.outcome; // e.g., "Roger Federer"
  
  if (matchPlayerName(betPlayer, winner)) {
    return 'WIN';
  } else {
    return 'LOSS';
  }
}

/**
 * Calculate ROI
 */
function calculateROI(outcome, odds, stake = 100) {
  if (outcome === 'WIN') {
    return ((odds - 1) * stake); // Profit
  } else if (outcome === 'LOSS') {
    return -stake; // Lost stake
  }
  return 0;
}

// =============================================================================
// MAIN LOGIC
// =============================================================================

async function main() {
  console.log('=== LOADING HISTORY ===');
  const history = getResultsHistory();
  
  console.log(`Total bets in history: ${history.bets?.length || 0}`);
  
  const pendingBets = (history.bets || []).filter(b => b.status === 'pending');
  console.log(`Pending bets: ${pendingBets.length}\n`);
  
  if (pendingBets.length === 0) {
    console.log('✅ No pending bets to check');
    return;
  }
  
  console.log('=== CHECKING RESULTS ===\n');
  
  let updatedCount = 0;
  
  for (const bet of pendingBets) {
    console.log(`📊 Checking bet from ${bet.date}:`);
    console.log(`   ${bet.homeTeam} vs ${bet.awayTeam}`);
    console.log(`   Bet on: ${bet.outcome} @ ${bet.odds}`);
    
    const matchResult = await fetchMatchResult(
      bet.homeTeam,
      bet.awayTeam,
      bet.matchTime
    );
    
    if (matchResult && matchResult.completed) {
      const outcome = determineOutcome(bet, matchResult);
      const roi = calculateROI(outcome, bet.odds);
      
      // Update bet
      bet.status = outcome.toLowerCase();
      bet.result = matchResult.winner;
      bet.roi = roi;
      bet.checkedAt = new Date().toISOString();
      
      updatedCount++;
      
      console.log(`   ${outcome === 'WIN' ? '✅ WIN' : '❌ LOSS'} (ROI: ${roi > 0 ? '+' : ''}${roi.toFixed(2)})\n`);
    } else {
      console.log(`   ⏳ Match not completed yet\n`);
    }
  }
  
  if (updatedCount > 0) {
    // Recalculate stats
    const allBets = history.bets || [];
    const wins = allBets.filter(b => b.status === 'win').length;
    const losses = allBets.filter(b => b.status === 'loss').length;
    const pending = allBets.filter(b => b.status === 'pending').length;
    const totalROI = allBets.reduce((sum, b) => sum + (b.roi || 0), 0);
    
    history.stats = {
      totalBets: allBets.length,
      wins,
      losses,
      pending,
      totalROI,
      winRate: wins > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : 0
    };
    
    console.log('=== SAVING UPDATED HISTORY ===');
    saveResultsHistory(history);
    console.log(`✅ Updated ${updatedCount} bet(s)`);
    console.log(`\nStats: ${wins}W / ${losses}L / ${pending}P | ROI: ${totalROI > 0 ? '+' : ''}${totalROI.toFixed(2)}`);
  } else {
    console.log('No updates needed');
  }
  
  console.log('\n✅ Results check complete!');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
