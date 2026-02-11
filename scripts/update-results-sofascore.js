#!/usr/bin/env node

/**
 * Automatic Results Update Script - SofaScore API
 * 
 * Uses free SofaScore API to fetch completed tennis match results
 * and automatically update results-history.json
 * 
 * Runs twice daily:
 * - Morning: Catches overnight matches
 * - Evening (22:00): Catches day matches
 * 
 * NO MANUAL INTERVENTION REQUIRED!
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RESULTS_FILE = path.join(__dirname, '../public/data/results-history.json');

/**
 * Normalize player name for fuzzy matching
 */
function normalizePlayerName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')  // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '')  // Remove diacritics
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Check if two player names match (handles first/last name variations)
 */
function playerNamesMatch(name1, name2) {
  const norm1 = normalizePlayerName(name1);
  const norm2 = normalizePlayerName(name2);
  
  if (norm1 === norm2) return true;
  
  // Check if last names match (most reliable)
  const parts1 = norm1.split(' ');
  const parts2 = norm2.split(' ');
  
  if (parts1.length > 0 && parts2.length > 0) {
    const lastName1 = parts1[parts1.length - 1];
    const lastName2 = parts2[parts2.length - 1];
    
    // Last name must match exactly and be at least 3 chars
    if (lastName1 === lastName2 && lastName1.length >= 3) {
      return true;
    }
    
    // Check if one name is a subset of the other (word-level, not substring)
    // E.g., "D. Kasatkina" should match "Daria Kasatkina"
    const words1 = new Set(parts1);
    const words2 = new Set(parts2);
    
    // At least one common word (excluding single letters)
    const commonWords = [...words1].filter(w => w.length > 2 && words2.has(w));
    if (commonWords.length >= 2) {
      return true; // At least 2 words in common (good match)
    }
  }
  
  return false;
}

/**
 * Fetch tennis matches for a specific date from SofaScore
 */
async function fetchMatchesForDate(dateString) {
  const url = `https://api.sofascore.com/api/v1/sport/tennis/scheduled-events/${dateString}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.log(`⚠️  Failed to fetch ${dateString}: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    const allEvents = data.events || [];
    
    // Filter for: finished, singles only (not doubles), and WTA/ATP only
    const filtered = allEvents.filter(m => {
      if (m.status?.type !== 'finished') return false;
      
      // Exclude doubles (team names contain "/" or have multiple words)
      const homeName = m.homeTeam?.name || '';
      const awayName = m.awayTeam?.name || '';
      if (homeName.includes(' / ') || awayName.includes(' / ')) return false;
      
      // Only include WTA or ATP categories
      const category = m.tournament?.category?.slug || '';
      if (!category.includes('wta') && !category.includes('atp')) return false;
      
      return true;
    });
    
    return filtered;
  } catch (error) {
    console.error(`❌ Error fetching ${dateString}:`, error.message);
    return [];
  }
}

/**
 * Find a completed match for a bet
 */
function findMatchForBet(bet, allMatches, debug = false) {
  for (const match of allMatches) {
    const matchHome = match.homeTeam?.name || '';
    const matchAway = match.awayTeam?.name || '';
    
    // Check both orientations (home/away might be swapped)
    const forwardMatch = 
      playerNamesMatch(bet.homeTeam, matchHome) && 
      playerNamesMatch(bet.awayTeam, matchAway);
    
    const reverseMatch = 
      playerNamesMatch(bet.homeTeam, matchAway) && 
      playerNamesMatch(bet.awayTeam, matchHome);
    
    if (forwardMatch || reverseMatch) {
      if (debug) {
        console.log(`  🎯 MATCHED: ${bet.homeTeam} vs ${bet.awayTeam}`);
        console.log(`     → Found: ${matchHome} vs ${matchAway}`);
        console.log(`     → Tournament: ${match.tournament?.uniqueTournament?.name || 'Unknown'}`);
      }
      return match;
    }
  }
  
  return null;
}

/**
 * Get match winner and score from SofaScore event
 */
function getMatchResult(match) {
  if (!match.homeScore || !match.awayScore) {
    return null;
  }
  
  // Use winnerCode from SofaScore (1 = home won, 2 = away won)
  // This is more reliable than counting sets manually
  const homeWon = match.winnerCode === 1;
  const awayWon = match.winnerCode === 2;
  
  if (!homeWon && !awayWon) {
    // No winner determined (shouldn't happen for finished matches)
    return null;
  }
  
  // Build score string from individual sets
  const scoreStr = [];
  let homeSetsWon = 0;
  let awaySetsWon = 0;
  
  for (let i = 1; i <= 5; i++) {
    const h = match.homeScore[`period${i}`];
    const a = match.awayScore[`period${i}`];
    if (h !== undefined && a !== undefined) {
      scoreStr.push(`${h}-${a}`);
      // Count sets for display purposes
      if (h > a) {
        homeSetsWon++;
      } else if (a > h) {
        awaySetsWon++;
      }
    }
  }
  
  return {
    homeWon,
    awayWon,
    score: scoreStr.join(', '),
    homeSets: homeSetsWon,
    awaySets: awaySetsWon,
    homeTeam: match.homeTeam.name,
    awayTeam: match.awayTeam.name
  };
}

/**
 * Main update function
 */
async function updateResults() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   Auto Results Update - SofaScore API    ║');
  console.log('╚════════════════════════════════════════════╝\n');
  
  // Load results history
  let history;
  try {
    const data = fs.readFileSync(RESULTS_FILE, 'utf-8');
    history = JSON.parse(data);
  } catch (error) {
    console.error('❌ Failed to load results-history.json:', error.message);
    process.exit(1);
  }
  
  // Get pending bets
  const pendingBets = history.bets.filter(b => b.status === 'pending');
  const pendingSafeBets = (history.safeBets || []).filter(b => b.status === 'pending');
  
  console.log(`Found ${pendingBets.length} pending value bet(s)`);
  console.log(`Found ${pendingSafeBets.length} pending safe bet(s)\n`);
  
  if (pendingBets.length === 0 && pendingSafeBets.length === 0) {
    console.log('✅ No pending bets to update!\n');
    return;
  }
  
  // Collect unique dates to check
  const datesToCheck = new Set();
  [...pendingBets, ...pendingSafeBets].forEach(bet => {
    datesToCheck.add(bet.date);
    
    // Also check day after (in case match was rescheduled)
    if (bet.matchTime) {
      const matchDate = new Date(bet.matchTime);
      const nextDay = new Date(matchDate);
      nextDay.setDate(nextDay.getDate() + 1);
      datesToCheck.add(nextDay.toISOString().split('T')[0]);
      
      // And day before (timezone differences)
      const prevDay = new Date(matchDate);
      prevDay.setDate(prevDay.getDate() - 1);
      datesToCheck.add(prevDay.toISOString().split('T')[0]);
    }
  });
  
  console.log(`📅 Checking ${datesToCheck.size} date(s): ${Array.from(datesToCheck).join(', ')}\n`);
  
  // Fetch all matches from those dates
  const allMatches = [];
  for (const dateStr of Array.from(datesToCheck)) {
    console.log(`[${dateStr}] Fetching matches from SofaScore...`);
    const matches = await fetchMatchesForDate(dateStr);
    console.log(`[${dateStr}] Found ${matches.length} finished singles matches`);
    allMatches.push(...matches);
    
    await new Promise(r => setTimeout(r, 300)); // Rate limiting
  }
  
  console.log(`\n✅ Total finished matches collected: ${allMatches.length}\n`);
  
  let updatedValueBets = 0;
  let updatedSafeBets = 0;
  let totalROI = history.stats?.totalROI || 0;
  let safeTotalROI = history.safeBetStats?.totalROI || 0;
  
  // Update VALUE BETS
  console.log('💎 Processing VALUE BETS...\n');
  
  for (let i = 0; i < history.bets.length; i++) {
    const bet = history.bets[i];
    if (bet.status !== 'pending') continue;
    
    const match = findMatchForBet(bet, allMatches); // Disable debug
    
    if (!match) {
      console.log(`⏳ ${bet.homeTeam} vs ${bet.awayTeam} - Still pending`);
      continue;
    }
    
    const result = getMatchResult(match);
    if (!result) {
      console.log(`⚠️  ${bet.homeTeam} vs ${bet.awayTeam} - Could not parse result`);
      continue;
    }
    
    // Determine if bet won
    const betOn = normalizePlayerName(bet.outcome);
    let betWon = false;
    
    if (playerNamesMatch(bet.outcome, result.homeTeam)) {
      betWon = result.homeWon;
    } else if (playerNamesMatch(bet.outcome, result.awayTeam)) {
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
    console.log(`   Bet: ${bet.outcome} @ ${bet.odds}`);
    console.log(`   Result: ${result.score}`);
    console.log(`   ROI: ${roi > 0 ? '+' : ''}${roi.toFixed(2)} units\n`);
  }
  
  // Update SAFE BETS
  if (history.safeBets && history.safeBets.length > 0) {
    console.log('🛡️  Processing SAFE BETS...\n');
    
    for (let i = 0; i < history.safeBets.length; i++) {
      const bet = history.safeBets[i];
      if (bet.status !== 'pending') continue;
      
      const match = findMatchForBet(bet, allMatches); // Disable debug
      
      if (!match) {
        console.log(`⏳ ${bet.homeTeam} vs ${bet.awayTeam} - Still pending`);
        continue;
      }
      
      const result = getMatchResult(match);
      if (!result) continue;
      
      const betOn = normalizePlayerName(bet.outcome);
      let betWon = false;
      
      if (playerNamesMatch(bet.outcome, result.homeTeam)) {
        betWon = result.homeWon;
      } else if (playerNamesMatch(bet.outcome, result.awayTeam)) {
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
      console.log(`   Bet: ${bet.outcome} @ ${bet.odds}`);
      console.log(`   Result: ${result.score}`);
      console.log(`   ROI: ${roi > 0 ? '+' : ''}${roi.toFixed(2)} units\n`);
    }
  }
  
  // Recalculate stats
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
  
  // Summary
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║              📊 FINAL SUMMARY              ║');
  console.log('╚════════════════════════════════════════════╝\n');
  console.log(`✅ Updated ${updatedValueBets + updatedSafeBets} match(es) automatically\n`);
  console.log('💎 VALUE BETS:');
  console.log(`   Wins: ${wins} | Losses: ${losses} | Pending: ${pending}`);
  console.log(`   Win Rate: ${history.stats.winRate}%`);
  console.log(`   Total ROI: ${totalROI > 0 ? '+' : ''}${totalROI.toFixed(2)} units\n`);
  
  if (history.safeBets) {
    console.log('🛡️  SAFE BETS:');
    console.log(`   Wins: ${history.safeBetStats.wins} | Losses: ${history.safeBetStats.losses} | Pending: ${history.safeBetStats.pending}`);
    console.log(`   Win Rate: ${history.safeBetStats.winRate}%`);
    console.log(`   Total ROI: ${safeTotalROI > 0 ? '+' : ''}${safeTotalROI.toFixed(2)} units\n`);
  }
  
  console.log('✅ Results updated successfully!\n');
}

// Run
updateResults().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
