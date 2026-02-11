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
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const ODDS_API_KEY = process.env.VITE_THE_ODDS_API_KEY;
const API_BASE_URL = 'https://api.the-odds-api.com/v4';
const RESULTS_FILE = path.join(__dirname, '../public/data/results-history.json');

/**
 * Normalize player name for matching
 */
function normalizePlayerName(name) {
  if (!name) return '';
  return name.toLowerCase().trim().replace(/[^a-z\s]/g, '');
}

/**
 * Fetch all available tennis sports from The Odds API
 */
async function fetchAvailableTennisSports() {
  const url = `${API_BASE_URL}/sports/?apiKey=${ODDS_API_KEY}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const sports = await response.json();
    const tennisSports = sports.filter(sport => 
      sport.key.includes('tennis') && sport.active
    );
    
    console.log(`📋 Found ${tennisSports.length} active tennis tournament(s)\n`);
    return tennisSports.map(s => s.key);
  } catch (error) {
    console.error('❌ Error fetching tennis sports:', error.message);
    return [];
  }
}

/**
 * Fetch completed match scores from The Odds API
 */
async function fetchCompletedMatches() {
  console.log('=== FETCHING COMPLETED MATCHES ===\n');
  
  // First, get all active tennis tournaments
  const tennisSportKeys = await fetchAvailableTennisSports();
  
  if (tennisSportKeys.length === 0) {
    console.log('⚠️  No active tennis tournaments found\n');
    return [];
  }
  
  const allCompletedMatches = [];
  
  for (const sportKey of tennisSportKeys) {
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
      
      if (completed.length > 0) {
        console.log(`✅ [${sportKey}] Found ${completed.length} completed matches`);
        allCompletedMatches.push(...completed);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`❌ Error fetching ${sportKey}:`, error.message);
    }
  }
  
  console.log(`\n📊 Total completed matches found: ${allCompletedMatches.length}\n`);
  return allCompletedMatches;
}

/**
 * Determine match winner from scores
 */
function getMatchWinner(match) {
  if (!match.scores || match.scores.length < 2) return null;
  
  // Find scores for home and away teams
  const homeScore = match.scores.find(s => normalizePlayerName(s.name) === normalizePlayerName(match.home_team));
  const awayScore = match.scores.find(s => normalizePlayerName(s.name) === normalizePlayerName(match.away_team));
  
  if (!homeScore || !awayScore) return null;
  
  // Parse sets from score string (e.g., "6-4, 6-3" or "6-4,6-3")
  const parseSetScore = (scoreStr) => {
    if (!scoreStr) return [];
    return scoreStr.split(',').map(s => s.trim());
  };
  
  const homeSets = parseSetScore(homeScore.score);
  const awaySets = parseSetScore(awayScore.score);
  
  // Count who won more sets
  let homeWins = 0;
  let awayWins = 0;
  
  for (let i = 0; i < Math.min(homeSets.length, awaySets.length); i++) {
    const homeGames = parseInt(homeSets[i].split('-')[0]) || 0;
    const awayGames = parseInt(awaySets[i].split('-')[0]) || 0;
    
    if (homeGames > awayGames) homeWins++;
    else if (awayGames > homeGames) awayWins++;
  }
  
  return {
    homeWon: homeWins > awayWins,
    awayWon: awayWins > homeWins,
    homeScore: homeScore.score,
    awayScore: awayScore.score
  };
}

/**
 * Update results history with completed matches
 */
function updateResultsHistory(completedMatches) {
  console.log('=== UPDATING RESULTS HISTORY ===\n');
  
  // Load current results history
  let history;
  try {
    const data = fs.readFileSync(RESULTS_FILE, 'utf-8');
    history = JSON.parse(data);
  } catch (error) {
    console.error('❌ Failed to load results-history.json:', error.message);
    return;
  }
  
  let updatedValueBets = 0;
  let updatedSafeBets = 0;
  let totalROI = history.stats?.totalROI || 0;
  let safeTotalROI = history.safeBetStats?.totalROI || 0;
  
  // Update each pending VALUE bet
  console.log('💎 Checking VALUE BETS...\n');
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
      console.log(`⏳ ${bet.homeTeam} vs ${bet.awayTeam} - Still pending`);
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
    
    updatedValueBets++;
    console.log(`${betWon ? '✅ WIN' : '❌ LOSS'} | ${bet.homeTeam} vs ${bet.awayTeam}`);
    console.log(`   Score: ${result.homeScore} vs ${result.awayScore} | ROI: ${roi > 0 ? '+' : ''}${roi.toFixed(2)}u | Odds: ${bet.odds}\n`);
    
    return {
      ...bet,
      status: betWon ? 'win' : 'loss',
      result: `${result.homeScore || '?'} - ${result.awayScore || '?'}`,
      roi: parseFloat(roi.toFixed(2))
    };
  });
  
  // Update each pending SAFE bet
  if (history.safeBets && history.safeBets.length > 0) {
    console.log('🛡️  Checking SAFE BETS...\n');
    history.safeBets = history.safeBets.map(bet => {
      if (bet.status !== 'pending') {
        return bet;
      }
      
      const match = completedMatches.find(m => {
        const homeMatch = normalizePlayerName(m.home_team) === normalizePlayerName(bet.homeTeam);
        const awayMatch = normalizePlayerName(m.away_team) === normalizePlayerName(bet.awayTeam);
        return homeMatch && awayMatch;
      });
      
      if (!match) {
        console.log(`⏳ ${bet.homeTeam} vs ${bet.awayTeam} - Still pending`);
        return bet;
      }
      
      const result = getMatchWinner(match);
      if (!result) {
        console.warn(`⚠️  Could not determine winner for ${bet.homeTeam} vs ${bet.awayTeam}`);
        return bet;
      }
      
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
      
      updatedSafeBets++;
      console.log(`${betWon ? '✅ WIN' : '❌ LOSS'} | ${bet.homeTeam} vs ${bet.awayTeam}`);
      console.log(`   Score: ${result.homeScore} vs ${result.awayScore} | ROI: ${roi > 0 ? '+' : ''}${roi.toFixed(2)}u | Odds: ${bet.odds}\n`);
      
      return {
        ...bet,
        status: betWon ? 'win' : 'loss',
        result: `${result.homeScore || '?'} - ${result.awayScore || '?'}`,
        roi: parseFloat(roi.toFixed(2))
      };
    });
  }
  
  // Update stats for VALUE bets
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
  
  // Update stats for SAFE bets
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
  console.log('║              📊 SUMMARY                    ║');
  console.log('╚════════════════════════════════════════════╝\n');
  console.log('💎 VALUE BETS:');
  console.log(`   Updated: ${updatedValueBets} bet(s)`);
  console.log(`   Wins: ${wins} | Losses: ${losses} | Pending: ${pending}`);
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

/**
 * Main function
 */
async function main() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   Update Bet Results - Version 2.0        ║');
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
