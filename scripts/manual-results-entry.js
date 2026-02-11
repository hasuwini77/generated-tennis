#!/usr/bin/env node

/**
 * Manual Results Entry Script
 * 
 * Use this to manually enter results for matches that are no longer available
 * in The Odds API (because they were completed more than a few hours ago).
 * 
 * You'll need to look up the actual match results from:
 * - WTA official site
 * - Flashscore
 * - SofaScore
 * - Google search for the match
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RESULTS_FILE = path.join(__dirname, '../public/data/results-history.json');

// ============================================================================
// MANUAL RESULTS - UPDATE THIS SECTION
// ============================================================================

const MANUAL_RESULTS = [
  {
    homeTeam: 'Daria Kasatkina',
    awayTeam: 'Elise Mertens',
    winner: 'Elise Mertens',  // Who won the match?
    score: '6-3, 6-2',         // Final score (winner's sets first)
    // Leave winner as null if match was postponed/cancelled
  },
  {
    homeTeam: 'Elisabetta Cocciaretto',
    awayTeam: 'Coco Gauff',
    winner: 'Coco Gauff',
    score: '6-4, 7-5',
  },
  {
    homeTeam: 'Janice Tjen',
    awayTeam: 'Beatriz Haddad Maia',
    winner: 'Beatriz Haddad Maia',
    score: '6-2, 6-1',
  },
  {
    homeTeam: 'Alexandra Eala',
    awayTeam: 'Tereza Valentova',
    winner: 'Tereza Valentova',
    score: '6-4, 3-6, 6-3',
  },
  {
    homeTeam: 'Magdalena Frech',
    awayTeam: 'Ann Li',
    winner: 'Ann Li',
    score: '7-6, 6-4',
  },
];

// ============================================================================
// SCRIPT LOGIC - DON'T MODIFY BELOW THIS LINE
// ============================================================================

function normalizePlayerName(name) {
  if (!name) return '';
  return name.toLowerCase().trim().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ');
}

function applyManualResults() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   Manual Results Entry - TennTrend        ║');
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
  
  let updatedCount = 0;
  let totalROI = history.stats?.totalROI || 0;
  let safeTotalROI = history.safeBetStats?.totalROI || 0;
  
  console.log('💎 Processing VALUE BETS...\n');
  
  // Update value bets
  for (let i = 0; i < history.bets.length; i++) {
    const bet = history.bets[i];
    
    if (bet.status !== 'pending') continue;
    
    // Find matching manual result
    const result = MANUAL_RESULTS.find(r => 
      normalizePlayerName(r.homeTeam) === normalizePlayerName(bet.homeTeam) &&
      normalizePlayerName(r.awayTeam) === normalizePlayerName(bet.awayTeam)
    );
    
    if (!result) {
      console.log(`⏭️  ${bet.homeTeam} vs ${bet.awayTeam} - No manual result provided`);
      continue;
    }
    
    if (!result.winner) {
      console.log(`⚠️  ${bet.homeTeam} vs ${bet.awayTeam} - Match cancelled/postponed`);
      continue;
    }
    
    // Determine if bet won
    const betOn = normalizePlayerName(bet.outcome);
    const winner = normalizePlayerName(result.winner);
    const betWon = betOn === winner;
    
    // Calculate ROI
    const roi = betWon ? (bet.odds - 1) : -1;
    totalROI += roi;
    
    history.bets[i] = {
      ...bet,
      status: betWon ? 'win' : 'loss',
      result: result.score,
      roi: parseFloat(roi.toFixed(2))
    };
    
    updatedCount++;
    console.log(`${betWon ? '✅ WIN' : '❌ LOSS'} | ${bet.homeTeam} vs ${bet.awayTeam}`);
    console.log(`   Bet on: ${bet.outcome} @ ${bet.odds}`);
    console.log(`   Winner: ${result.winner}`);
    console.log(`   Score: ${result.score}`);
    console.log(`   ROI: ${roi > 0 ? '+' : ''}${roi.toFixed(2)} units\n`);
  }
  
  // Update safe bets
  if (history.safeBets && history.safeBets.length > 0) {
    console.log('🛡️  Processing SAFE BETS...\n');
    
    for (let i = 0; i < history.safeBets.length; i++) {
      const bet = history.safeBets[i];
      
      if (bet.status !== 'pending') continue;
      
      const result = MANUAL_RESULTS.find(r => 
        normalizePlayerName(r.homeTeam) === normalizePlayerName(bet.homeTeam) &&
        normalizePlayerName(r.awayTeam) === normalizePlayerName(bet.awayTeam)
      );
      
      if (!result || !result.winner) continue;
      
      const betOn = normalizePlayerName(bet.outcome);
      const winner = normalizePlayerName(result.winner);
      const betWon = betOn === winner;
      
      const roi = betWon ? (bet.odds - 1) : -1;
      safeTotalROI += roi;
      
      history.safeBets[i] = {
        ...bet,
        status: betWon ? 'win' : 'loss',
        result: result.score,
        roi: parseFloat(roi.toFixed(2))
      };
      
      updatedCount++;
      console.log(`${betWon ? '✅ WIN' : '❌ LOSS'} | ${bet.homeTeam} vs ${bet.awayTeam}`);
      console.log(`   Bet on: ${bet.outcome} @ ${bet.odds}`);
      console.log(`   Winner: ${result.winner}`);
      console.log(`   Score: ${result.score}`);
      console.log(`   ROI: ${roi > 0 ? '+' : ''}${roi.toFixed(2)} units\n`);
    }
  }
  
  if (updatedCount === 0) {
    console.log('ℹ️  No matches were updated. Check your MANUAL_RESULTS data.\n');
    return;
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
  
  console.log('╔════════════════════════════════════════════╗');
  console.log('║              📊 SUMMARY                    ║');
  console.log('╚════════════════════════════════════════════╝\n');
  console.log(`✅ Updated ${updatedCount} match(es)\n`);
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
  
  console.log('✅ Results history updated successfully!\n');
  console.log('💡 TIP: Look up match results on:');
  console.log('   - https://www.wtatennis.com/scores');
  console.log('   - https://www.flashscore.com/tennis/');
  console.log('   - https://www.sofascore.com/tennis\n');
}

applyManualResults();
