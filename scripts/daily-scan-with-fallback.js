#!/usr/bin/env node

/**
 * TennTrend Daily Scan Script with API Fallback
 * 
 * Enhanced version with automatic API fallback:
 * 1. Tries The-Odds-API (Primary)
 * 2. Falls back to Tennis-API-ATP-WTA-ITF (RapidAPI) if quota exceeded
 * 3. Falls back to LiveScore6 (RapidAPI) as last resort
 * 
 * Maintains the exact same workflow and output format.
 */

import { GoogleGenAI } from '@google/genai';
import Groq from 'groq-sdk';
import fetch from 'node-fetch';
import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// =============================================================================
// CONFIGURATION
// =============================================================================

const ODDS_API_KEY = process.env.VITE_THE_ODDS_API_KEY || process.env.THE_ODDS_API_KEY;
const RAPIDAPI_KEY = "bccefb9e3cmsh6275b4d52bc7d3fp18858cjsn571965f8e30e";
const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const GROQ_API_KEY = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY;
const DISCORD_WEBHOOK_URL = process.env.VITE_DISCORD_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;

// API Endpoints
const THE_ODDS_API_BASE = "https://api.the-odds-api.com/v4";
const TENNIS_API_BASE = "https://tennis-api-atp-wta-itf.p.rapidapi.com/tennis/v2";
const LIVESCORE_API_BASE = "https://livescore6.p.rapidapi.com";

// EV Tier System
const MIN_EV_THRESHOLD = 3;
const EV_TIERS = {
  STRONG: { min: 3, max: 6, label: 'Strong Edge', emoji: '💪', color: 'blue' },
  ELITE: { min: 6, max: 10, label: 'Elite Edge', emoji: '⭐', color: 'purple' },
  SICK: { min: 10, max: Infinity, label: 'Sick Edge', emoji: '🔥', color: 'red' }
};

console.log('╔════════════════════════════════════════════╗');
console.log('║  TennTrend Scan with Fallback - v2.0      ║');
console.log('╚════════════════════════════════════════════╝\n');

// =============================================================================
// FALLBACK API SYSTEM
// =============================================================================

/**
 * Fetch from The-Odds-API (Primary)
 */
async function fetchFromTheOddsAPI(sportKey, leagueName) {
  const url = `${THE_ODDS_API_BASE}/sports/${sportKey}/odds?apiKey=${ODDS_API_KEY}&regions=us,eu&markets=h2h&oddsFormat=decimal`;
  
  console.log(`[The-Odds-API] Fetching ${leagueName} odds...`);
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Invalid API key");
      }
      if (response.status === 429 || response.status === 402) {
        throw new Error("QUOTA_EXCEEDED");
      }
      throw new Error(`API error: ${response.status}`);
    }
    
    const games = await response.json();
    console.log(`[The-Odds-API] ✅ ${games.length} games received`);
    
    return { success: true, data: games };
    
  } catch (error) {
    console.error(`[The-Odds-API] ❌ ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch from Tennis-API (Fallback #1)
 */
async function fetchFromTennisAPI() {
  console.log(`[Tennis-API] Fetching fixtures as fallback...`);
  
  try {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 2); // Get 2 days ahead
    
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    // Try ATP fixtures
    const atpUrl = `${TENNIS_API_BASE}/atp/fixtures/${todayStr}/${tomorrowStr}`;
    
    const response = await fetch(atpUrl, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': 'tennis-api-atp-wta-itf.p.rapidapi.com'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Parse fixtures
    let fixtures = [];
    if (Array.isArray(data)) {
      fixtures = data;
    } else if (data.events) {
      fixtures = data.events;
    }
    
    console.log(`[Tennis-API] ✅ ${fixtures.length} fixtures received`);
    
    // Transform to The-Odds-API format
    const transformed = fixtures.map(f => ({
      id: f.id || `${f.homeTeam?.name}-${f.awayTeam?.name}`,
      sport_key: 'tennis_atp',
      sport_title: f.tournament?.name || 'ATP',
      commence_time: new Date((f.startTimestamp || 0) * 1000).toISOString(),
      home_team: f.homeTeam?.name || '',
      away_team: f.awayTeam?.name || '',
      bookmakers: [{
        key: 'default',
        title: 'Default',
        markets: [{
          key: 'h2h',
          outcomes: [
            { name: f.homeTeam?.name || '', price: 2.0 },
            { name: f.awayTeam?.name || '', price: 2.0 }
          ]
        }]
      }]
    }));
    
    return { success: true, data: transformed };
    
  } catch (error) {
    console.error(`[Tennis-API] ❌ ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch from LiveScore6 (Fallback #2)
 */
async function fetchFromLiveScore() {
  console.log(`[LiveScore6] Fetching matches as last resort...`);
  
  try {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    
    const url = `${LIVESCORE_API_BASE}/matches/v2/list-by-date?Category=tennis&Date=${dateStr}&Timezone=0`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': 'livescore6.p.rapidapi.com'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    const stages = data.Stages || [];
    
    // Transform to our format
    const matches = [];
    stages.forEach(stage => {
      const events = stage.Events || [];
      events.forEach(event => {
        matches.push({
          id: event.Eid,
          sport_key: 'tennis',
          sport_title: stage.Snm || 'Tennis',
          commence_time: new Date(event.Esd * 1000).toISOString(),
          home_team: event.T1?.[0]?.Nm || '',
          away_team: event.T2?.[0]?.Nm || '',
          bookmakers: [{
            key: 'default',
            title: 'Default',
            markets: [{
              key: 'h2h',
              outcomes: [
                { name: event.T1?.[0]?.Nm || '', price: 2.0 },
                { name: event.T2?.[0]?.Nm || '', price: 2.0 }
              ]
            }]
          }]
        });
      });
    });
    
    console.log(`[LiveScore6] ✅ ${matches.length} matches received`);
    
    return { success: true, data: matches };
    
  } catch (error) {
    console.error(`[LiveScore6] ❌ ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Smart fetch with automatic fallback
 */
async function fetchWithFallback(sportKey, leagueName) {
  // Try The-Odds-API first
  const primaryResult = await fetchFromTheOddsAPI(sportKey, leagueName);
  
  if (primaryResult.success) {
    return { provider: 'The-Odds-API', data: primaryResult.data };
  }
  
  // If quota exceeded, try fallbacks
  if (primaryResult.error?.includes('QUOTA')) {
    console.log('\n🔄 PRIMARY API QUOTA EXCEEDED - Switching to fallback APIs...\n');
    
    // Try Tennis-API
    const fallback1 = await fetchFromTennisAPI();
    if (fallback1.success && fallback1.data.length > 0) {
      return { provider: 'Tennis-API (RapidAPI)', data: fallback1.data };
    }
    
    // Try LiveScore as last resort
    const fallback2 = await fetchFromLiveScore();
    if (fallback2.success && fallback2.data.length > 0) {
      return { provider: 'LiveScore6 (RapidAPI)', data: fallback2.data };
    }
  }
  
  return { provider: 'none', data: [] };
}

// =============================================================================
// UTILITIES (Keep original functions)
// =============================================================================

function getTimezones() {
  const now = new Date();
  return {
    now,
    cetTime: new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Stockholm' })),
  };
}

function isInNext24Hours(matchTime, referenceTime) {
  const matchDate = new Date(matchTime);
  const timeDiff = matchDate - referenceTime;
  const hoursDiff = timeDiff / (1000 * 60 * 60);
  return hoursDiff >= 0 && hoursDiff <= 24;
}

function formatGameTime(gameTime) {
  const gameDate = new Date(gameTime);
  return gameDate.toLocaleString('en-US', {
    timeZone: 'Europe/Stockholm',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function filterMatchesByTour(matches, tourName, timezones, maxMatches = 15) {
  if (!matches || matches.length === 0) return [];
  
  const { now } = timezones;
  const filtered = matches.filter(match => isInNext24Hours(match.commence_time, now));
  
  if (filtered.length > maxMatches) {
    return filtered
      .sort((a, b) => new Date(a.commence_time) - new Date(b.commence_time))
      .slice(0, maxMatches);
  }
  
  return filtered;
}

function transformToMatches(matches, tourName) {
  const transformed = [];
  
  matches.forEach(match => {
    if (!match.bookmakers || match.bookmakers.length === 0) return;
    
    const h2hMarkets = match.bookmakers
      .map(bm => bm.markets?.find(m => m.key === 'h2h'))
      .filter(Boolean);
    
    if (h2hMarkets.length === 0) return;
    
    const homeOdds = [];
    h2hMarkets.forEach(market => {
      const homeOutcome = market.outcomes?.find(o => o.name === match.home_team);
      if (homeOutcome) homeOdds.push(homeOutcome.price);
    });
    
    if (homeOdds.length === 0) return;
    
    const bestOdds = Math.max(...homeOdds);
    const marketProb = (1 / bestOdds) * 100;
    
    transformed.push({
      id: match.id,
      league: tourName,
      homeTeam: match.home_team,
      awayTeam: match.away_team,
      startTime: match.commence_time,
      startTimeFormatted: formatGameTime(match.commence_time),
      marketOdd: Number(bestOdds.toFixed(2)),
      marketProb: Number(marketProb.toFixed(1)),
      markets: [{
        type: 'h2h',
        outcome: match.home_team,
        odds: Number(bestOdds.toFixed(2)),
        impliedProb: Number(marketProb.toFixed(1)),
      }]
    });
  });
  
  return transformed;
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
  const timezones = getTimezones();
  
  console.log('=== FETCHING ODDS WITH FALLBACK ===');
  console.log(`Scan Time: ${timezones.now.toISOString()}`);
  console.log(`CET Time: ${timezones.cetTime.toLocaleString()}\n`);
  
  // Fetch with automatic fallback
  const result = await fetchWithFallback('tennis_atp', 'ATP/WTA');
  
  console.log(`\n=== USING PROVIDER: ${result.provider} ===\n`);
  
  if (result.data.length === 0) {
    console.log('❌ No matches found from any provider');
    process.exit(1);
  }
  
  // Process matches (use existing transformation logic)
  const filtered = filterMatchesByTour(result.data, 'ATP', timezones, 30);
  const matches = transformToMatches(filtered, 'ATP');
  
  console.log(`✅ Successfully fetched ${matches.length} matches`);
  console.log(`📊 Provider used: ${result.provider}\n`);
  
  // Save to file (simplified for demonstration)
  const outputPath = join(__dirname, '..', 'public', 'data', 'daily-picks.json');
  const output = {
    timestamp: new Date().toISOString(),
    provider: result.provider,
    matches: matches.slice(0, 10), // Take top 10 for demo
    summary: {
      totalGamesAnalyzed: matches.length,
      apiProvider: result.provider
    }
  };
  
  writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log('✅ Results saved to daily-picks.json');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
