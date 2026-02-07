#!/usr/bin/env node

/**
 * Update Results Script
 * 
 * Checks The Odds API for completed matches and updates results-history.json
 * with win/loss status and ROI calculations.
 * 
 * Run daily (ideally 6-12 hours after last match of the day)
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const ODDS_API_KEY = process.env.VITE_THE_ODDS_API_KEY;
const API_BASE_URL = 'https://api.the-odds-api.com/v4';
const RESULTS_FILE = path.join(__dirname, '../public/data/results-history.json');

// Tennis tournaments we track (same as daily-scan.js)
const TENNIS_SPORTS = {
  atp: [],
  wta: ['tennis_wta_qatar_open'], // Add more as needed
  all: []
};

/**
 * Normalize player name for matching
 */
function normalizePlayerName(name) {
  if (!name) return '';
  return name.toLowerCase().trim().replace(/[^a-z\s]/g, '');
}

/**
 * Fetch completed match scores from The Odds API
 */
async function fetchCompletedMatches() {
  console.log('\n=== FETCHING COMPLETED MATCHES ===');
  
  const allCompletedMatches = [];
  
  // Combine all tournaments
  TENNIS_SPORTS.all = [...TENNIS_SPORTS.atp, ...TENNIS_SPORTS.wta];
  
  for (const sportKey of TENNIS_SPORTS.all) {
    try {
      // Fetch scores from last 3 days
      const url = `${API_BASE_URL}/sports/${sportKey}/scores?apiKey=${ODDS_API_KEY}&daysFrom=3`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn(`⚠️  Failed to fetch scores for ${sportKey}: ${response.status}`);
        continue;
      }
      
      const matches = await response.json();
      const completed = matches.filter(m => m.completed && m.scores);
      
      console.log(`[${sportKey}] Found ${completed.length} completed matches`);
      allCompletedMatches.push(...completed);
      
    } catch (error) {
      console.error(`❌ Error fetching ${sportKey}:`, error.message);
    }
  }
  
  console.log(`\n✅ Total completed matches: ${allCompletedMatches.length}\n`);
  return allCompletedMatches;
}

/**
 * Determine match winner from scores
 */
function getMatchWinner(match) {
  if (!match.scores || match.scores.length < 2) return null;
  
  // In tennis, scores array has both players
  // The winner typically has "score" field with set scores like "6-4, 6-3"
  // Find who won based on completed match
  
  const homeScore = match.scores.find(s => normalizePlayerName(s.name) === normalizePlayerName(match.home_team));
  const awayScore = match.scores.find(s => normalizePlayerName(s.name) === normalizePlayerName(match.away_team));
  
  if (!homeScore || !awayScore) return null;
  
  // Simple heuristic: winner has score data, or we parse set wins
  // For now, assume The Odds API marks winner somehow
  // TODO: Improve this logic based on actual API response format
  
  return {
    homeWon: homeScore.score && homeScore.score.length > 0,
    awayWon: awayScore.score && awayScore.score.length > 0,
    homeScore: homeScore.score,
    awayScore: awayScore.score
  };
}

/**
 * Update results history with completed matches
 */
function updateResultsHistory(completedMatches) {
  console.log('=== UPDATING RESULTS HISTORY ===');
  
  // Load current results history
  let history;
  try {
    const data = fs.readFileSync(RESULTS_FILE, 'utf-8');
    history = JSON.parse(data);
  } catch (error) {
    console.error('❌ Failed to load results-history.json:', error.message);
    return;
  }
  
  let updatedCount = 0;
  let totalROI = history.stats.totalROI || 0;
  
  // Update each pending bet
  history.bets = history.bets.map(bet => {
    if (bet.status !== 'pending') {
      return bet; // Already settled
    }
    
    // Find matching completed match
    const match = completedMatches.find(m => {
      const homeMatch = normalizePlayerName(m.home_team) === normalizePlayerName(bet.homeTeam);
      const awayMatch = normalizePlayerName(m.away_team) === normalizePlayerName(bet.awayTeam);
      return homeMatch && awayMatch;
    });
    
    if (!match) {
      return bet; // Match not completed yet
    }
    
    // Determine winner
    const result = getMatchWinner(match);
    if (!result) {
      console.warn(`⚠️  Could not determine winner for ${bet.homeTeam} vs ${bet.awayTeam}`);
      return bet;
    }
    
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
    
    updatedCount++;
    console.log(`✅ ${bet.homeTeam} vs ${bet.awayTeam}: ${betWon ? 'WIN' : 'LOSS'} (ROI: ${roi > 0 ? '+' : ''}${roi.toFixed(2)}u)`);
    
    return {
      ...bet,
      status: betWon ? 'win' : 'loss',
      result: `${result.homeScore || '?'} - ${result.awayScore || '?'}`,
      roi: parseFloat(roi.toFixed(2))
    };
  });
  
  // Update stats
  const wins = history.bets.filter(b => b.status === 'win').length;
  const losses = history.bets.filter(b => b.status === 'loss').length;
  const pending = history.bets.filter(b => b.status === 'pending').length;
  const settled = wins + losses;
  
  history.stats = {
    totalBets: history.bets.length,
    wins,
    losses,
    pending,
    totalROI: parseFloat(totalROI.toFixed(2)),
    winRate: settled > 0 ? parseFloat(((wins / settled) * 100).toFixed(1)) : 0
  };
  
  // Save updated history
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(history, null, 2), 'utf-8');
  
  console.log(`\n📊 SUMMARY:`);
  console.log(`   Updated: ${updatedCount} bets`);
  console.log(`   Wins: ${wins} | Losses: ${losses} | Pending: ${pending}`);
  console.log(`   Win Rate: ${history.stats.winRate}%`);
  console.log(`   Total ROI: ${totalROI > 0 ? '+' : ''}${totalROI.toFixed(2)} units`);
  console.log(`\n✅ Results history updated!\n`);
}

/**
 * Main function
 */
async function main() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   Update Bet Results - Version 1.0        ║');
  console.log('╚════════════════════════════════════════════╝');
  
  if (!ODDS_API_KEY) {
    console.error('❌ Missing VITE_THE_ODDS_API_KEY in .env.local');
    process.exit(1);
  }
  
  try {
    // 1. Fetch completed matches from The Odds API
    const completedMatches = await fetchCompletedMatches();
    
    if (completedMatches.length === 0) {
      console.log('ℹ️  No completed matches found. Results are up to date.\n');
      return;
    }
    
    // 2. Update results history
    updateResultsHistory(completedMatches);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
