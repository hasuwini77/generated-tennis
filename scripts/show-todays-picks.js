#!/usr/bin/env node

/**
 * Display Today's Best Tennis Picks
 * Shows EV bets, close matches, and recommendations
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('╔════════════════════════════════════════════╗');
console.log('║    Today\'s Tennis Picks - Feb 16, 2026   ║');
console.log('╚════════════════════════════════════════════╝\n');

try {
  const dataPath = join(__dirname, '..', 'public', 'data', 'daily-picks.json');
  const data = JSON.parse(readFileSync(dataPath, 'utf-8'));
  
  console.log(`📊 Analysis: ${data.apiProvider}`);
  console.log(`⏰ Scan time: ${data.scanTimeCET}\n`);
  
  console.log('═══════════════════════════════════════════\n');
  
  // Get all analyzed bets sorted by EV
  const allBets = (data.allBets || []).sort((a, b) => b.expectedValue - a.expectedValue);
  
  // Categories
  const valueBets = allBets.filter(b => b.expectedValue >= 3);
  const closeValue = allBets.filter(b => b.expectedValue >= 0 && b.expectedValue < 3);
  const bestOfRest = allBets.slice(0, 5);
  
  // Display Value Bets
  if (valueBets.length > 0) {
    console.log('🔥 VALUE BETS (EV >= 3%):\n');
    valueBets.forEach((bet, idx) => {
      console.log(`${idx + 1}. ${bet.homeTeam} vs ${bet.awayTeam}`);
      console.log(`   📍 ${bet.tournament}`);
      console.log(`   💰 Odds: ${bet.marketOdd} | EV: +${bet.expectedValue}%`);
      console.log(`   🎯 AI Probability: ${bet.aiProbability}%`);
      console.log(`   💡 ${bet.reasoning}`);
      console.log('');
    });
  } else {
    console.log('⚠️  No clear value bets found today (EV >= 3%)\n');
  }
  
  // Display Close to Value
  if (closeValue.length > 0) {
    console.log('📊 CLOSE TO VALUE (Small positive EV):\n');
    closeValue.slice(0, 3).forEach((bet, idx) => {
      console.log(`${idx + 1}. ${bet.homeTeam} vs ${bet.awayTeam}`);
      console.log(`   📍 ${bet.tournament}`);
      console.log(`   💰 Odds: ${bet.marketOdd} | EV: +${bet.expectedValue}%`);
      console.log(`   💡 ${bet.reasoning}`);
      console.log('');
    });
  }
  
  // Display Best Opportunities (even if negative EV)
  console.log('🎯 TODAY\'S TOP MATCHES (Best relative value):\n');
  bestOfRest.slice(0, 5).forEach((bet, idx) => {
    const evLabel = bet.expectedValue >= 0 ? `+${bet.expectedValue}` : `${bet.expectedValue}`;
    console.log(`${idx + 1}. ${bet.homeTeam} vs ${bet.awayTeam}`);
    console.log(`   📍 ${bet.tournament} (${bet.league})`);
    console.log(`   💰 Odds: ${bet.marketOdd} | EV: ${evLabel}%`);
    console.log(`   🎯 AI Win Probability: ${bet.aiProbability}%`);
    console.log(`   ⚖️  ${bet.reasoning}`);
    console.log('');
  });
  
  // Recommendation
  console.log('═══════════════════════════════════════════\n');
  console.log('💡 RECOMMENDATION:\n');
  
  if (valueBets.length > 0) {
    const top = valueBets[0];
    console.log(`⭐ BET OF THE DAY: ${top.homeTeam} @ ${top.marketOdd}`);
    console.log(`   Expected Value: +${top.expectedValue}%`);
    console.log(`   ${top.reasoning}\n`);
  } else if (bestOfRest[0] && bestOfRest[0].expectedValue >= -2) {
    const top = bestOfRest[0];
    console.log(`🎯 BEST OPPORTUNITY: ${top.homeTeam} @ ${top.marketOdd}`);
    console.log(`   Note: No strong value today, but this is the least negative`);
    console.log(`   AI sees: ${top.aiProbability}% win probability`);
    console.log(`   ${top.reasoning}\n`);
  } else {
    console.log(`⚠️  No strong betting opportunities identified today`);
    console.log(`   AI suggests: Wait for better value or skip today's matches\n`);
  }
  
  console.log('═══════════════════════════════════════════\n');
  console.log(`📈 Summary: ${data.summary.totalGamesAnalyzed} matches analyzed`);
  console.log(`🎲 System: AI-powered fallback (The-Odds-API quota exhausted)`);
  console.log(`⚡ Status: Fully operational\n`);
  
} catch (error) {
  console.error('Error:', error.message);
  console.log('\nRun: node scripts/fallback-with-ai-odds.js first\n');
}
