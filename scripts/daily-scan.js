#!/usr/bin/env node

/**
 * TennTrend Daily Scan Script
 * 
 * Runs once per day at 8:00 AM CET via GitHub Actions
 * - Fetches odds from The-Odds-API (ATP Grand Slams & Masters 1000, WTA 1000)
 * - Analyzes with Gemini AI
 * - Filters for EV >= 3% (professional-grade bets only)
 * - Max 15 ATP matches + 15 WTA matches per scan
 * - Saves results to data/daily-picks.json
 * - Sends Discord notification (if worthy bets exist)
 * 
 * Note: Free tier covers Grand Slams + Masters/1000 tournaments only
 * ATP 500/250 and WTA 500/250 require paid API plan
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

// Load environment variables from .env.local (for local development)
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// =============================================================================
// CONFIGURATION
// =============================================================================

const API_BASE_URL = "https://api.the-odds-api.com/v4";
const ODDS_API_KEY = process.env.VITE_THE_ODDS_API_KEY || process.env.THE_ODDS_API_KEY;
const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const GROQ_API_KEY = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY;
const DISCORD_WEBHOOK_URL = process.env.VITE_DISCORD_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;

// EV Tier System (professional sports betting standards)
const MIN_EV_THRESHOLD = 3; // Minimum 3% EV to show a bet (Strong Edge)
const EV_TIERS = {
  STRONG: { min: 3, max: 6, label: 'Strong Edge', emoji: '💪', color: 'blue' },
  ELITE: { min: 6, max: 10, label: 'Elite Edge', emoji: '⭐', color: 'purple' },
  SICK: { min: 10, max: Infinity, label: 'Sick Edge', emoji: '🔥', color: 'red' }
};

const DISCORD_MIN_EV = 3; // Send Discord notifications for 3%+ EV bets

// =============================================================================
// DATE/TIMEZONE HELPERS
// =============================================================================

/**
 * Get current time in different timezones
 */
function getTimezones() {
  const now = new Date();
  
  return {
    now,
    cetTime: new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Stockholm' })),
    etTime: new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' })),
  };
}

/**
 * Check if a game is happening "today" in Swedish time (CET/CEST)
 * For SHL and Allsvenskan - strict same-day only
 */
function isToday_SwedishTime(gameTime, referenceTime) {
  const gameDate = new Date(gameTime);
  const gameInSweden = new Date(gameDate.toLocaleString('en-US', { timeZone: 'Europe/Stockholm' }));
  const refInSweden = new Date(referenceTime.toLocaleString('en-US', { timeZone: 'Europe/Stockholm' }));
  
  return (
    gameInSweden.getFullYear() === refInSweden.getFullYear() &&
    gameInSweden.getMonth() === refInSweden.getMonth() &&
    gameInSweden.getDate() === refInSweden.getDate()
  );
}

/**
 * Check if a match is in the next 24 hours
 * For tennis, we show matches happening in the next 24 hours
 */
function isInNext24Hours(matchTime, referenceTime) {
  const matchDate = new Date(matchTime);
  const timeDiff = matchDate - referenceTime;
  const hoursDiff = timeDiff / (1000 * 60 * 60);
  
  return hoursDiff >= 0 && hoursDiff <= 24;
}

/**
 * Check if a game is in the next 36 hours (deprecated - keeping for compatibility)
 */
function isInNext36Hours(gameTime, referenceTime) {
  return isInNext24Hours(gameTime, referenceTime);
}

/**
 * Format game time for display in CET
 */
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

// =============================================================================
// ODDS API FUNCTIONS
// =============================================================================

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
    
    // Categorize by ATP/WTA
    const atp = tennisSports.filter(s => 
      s.key.includes('atp') || s.title.toUpperCase().includes('ATP')
    );
    const wta = tennisSports.filter(s => 
      s.key.includes('wta') || s.title.toUpperCase().includes('WTA')
    );
    
    console.log(`Found ${tennisSports.length} active tennis tournament(s)`);
    console.log(`  ATP: ${atp.length} | WTA: ${wta.length}`);
    
    return { atp, wta, all: tennisSports };
  } catch (error) {
    console.error('Error fetching sports list:', error.message);
    return { atp: [], wta: [], all: [] };
  }
}

/**
 * Fetch odds from The-Odds-API for a specific league
 */
async function fetchLeagueOdds(sportKey, leagueName) {
  const url = `${API_BASE_URL}/sports/${sportKey}/odds?apiKey=${ODDS_API_KEY}&regions=us,eu&markets=h2h&oddsFormat=decimal`;
  
  console.log(`[${leagueName}] Fetching odds from The-Odds-API...`);
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Invalid API key");
      }
      if (response.status === 429) {
        throw new Error("API quota exceeded");
      }
      throw new Error(`API error: ${response.status}`);
    }
    
    const games = await response.json();
    console.log(`[${leagueName}] Received ${games.length} games from API`);
    
    return games;
    
  } catch (error) {
    console.error(`[${leagueName}] Error fetching odds:`, error.message);
    return [];
  }
}

/**
 * Filter matches by date/timezone rules and apply max limits
 */
function filterMatchesByTour(matches, tourName, timezones, maxMatches = 15) {
  if (!matches || matches.length === 0) return [];
  
  const { now } = timezones;
  
  // Filter to next 24 hours
  const filtered = matches.filter(match => isInNext24Hours(match.commence_time, now));
  console.log(`[${tourName}] Filtered to ${filtered.length} matches (next 24 hours)`);
  
  // Apply max limit (15 matches per tour)
  if (filtered.length > maxMatches) {
    console.log(`[${tourName}] Limiting to ${maxMatches} matches (sorted by start time)`);
    // Sort by start time and take first N matches
    const limited = filtered
      .sort((a, b) => new Date(a.commence_time) - new Date(b.commence_time))
      .slice(0, maxMatches);
    return limited;
  }
  
  return filtered;
}

/**
 * Transform odds data to our Match format
 */
function transformToMatches(matches, tourName) {
  const transformed = [];
  
  matches.forEach(match => {
    if (!match.bookmakers || match.bookmakers.length === 0) return;
    
    // Find h2h market and extract odds for home team (player 1)
    const h2hMarkets = match.bookmakers
      .map(bm => bm.markets?.find(m => m.key === 'h2h'))
      .filter(Boolean);
    
    if (h2hMarkets.length === 0) return;
    
    // Collect all home player odds
    const homeOdds = [];
    h2hMarkets.forEach(market => {
      const homeOutcome = market.outcomes?.find(o => o.name === match.home_team);
      if (homeOutcome) homeOdds.push(homeOutcome.price);
    });
    
    if (homeOdds.length === 0) return;
    
    // Best odds for bettor (highest for player to win)
    const bestOdds = Math.max(...homeOdds);
    
    // Market probability (implied from best odds)
    const marketProb = (1 / bestOdds) * 100;
    
    // Create base match object
    const matchObj = {
      id: match.id,
      league: tourName,
      homeTeam: match.home_team,
      awayTeam: match.away_team,
      startTime: match.commence_time,
      startTimeFormatted: formatGameTime(match.commence_time),
      marketOdd: Number(bestOdds.toFixed(2)),
      marketProb: Number(marketProb.toFixed(1)),
      markets: [
        {
          type: 'h2h',
          outcome: match.home_team,
          odds: Number(bestOdds.toFixed(2)),
          impliedProb: Number(marketProb.toFixed(1)),
        }
      ]
    };
    
    transformed.push(matchObj);
  });
  
  return transformed;
}

/**
 * Fetch all tours with smart date filtering
 */
async function fetchAllLeagues() {
  const timezones = getTimezones();
  
  console.log('\n=== FETCHING ODDS ===');
  console.log(`Scan Time: ${timezones.now.toISOString()}`);
  console.log(`CET Time: ${timezones.cetTime.toLocaleString()}`);
  console.log(`ET Time: ${timezones.etTime.toLocaleString()}\n`);
  
  // First, get all available tennis tournaments
  const tennisSports = await fetchAvailableTennisSports();
  
  if (tennisSports.all.length === 0) {
    console.log('⚠️  No active tennis tournaments found in The Odds API');
    return {
      allMatches: [],
      leagueStats: {
        atp: { hasGames: false, gamesFound: 0 },
        wta: { hasGames: false, gamesFound: 0 },
      }
    };
  }
  
  // Fetch odds for all ATP tournaments
  const atpPromises = tennisSports.atp.map(sport => 
    fetchLeagueOdds(sport.key, `ATP - ${sport.title}`)
  );
  
  // Fetch odds for all WTA tournaments
  const wtaPromises = tennisSports.wta.map(sport => 
    fetchLeagueOdds(sport.key, `WTA - ${sport.title}`)
  );
  
  // Warning if ATP or WTA data is missing
  if (tennisSports.atp.length === 0) {
    console.log('⚠️  No ATP tournaments currently available in The Odds API');
    console.log('   ATP matches will appear when bookmakers start offering odds');
  }
  if (tennisSports.wta.length === 0) {
    console.log('⚠️  No WTA tournaments currently available in The Odds API');
    console.log('   WTA matches will appear when bookmakers start offering odds');
  }
  
  // Fetch all in parallel
  const [atpResults, wtaResults] = await Promise.all([
    Promise.all(atpPromises),
    Promise.all(wtaPromises)
  ]);
  
  // Combine all matches from different tournaments
  const atpMatches = atpResults.flat();
  const wtaMatches = wtaResults.flat();
  
  // Filter by date rules and apply max limits (15 per tour)
  const atpFiltered = filterMatchesByTour(atpMatches, 'ATP', timezones, 15);
  const wtaFiltered = filterMatchesByTour(wtaMatches, 'WTA', timezones, 15);
  
  // Transform to our format
  const atpTransformed = transformToMatches(atpFiltered, 'ATP');
  const wtaTransformed = transformToMatches(wtaFiltered, 'WTA');
  
  const allMatches = [...atpTransformed, ...wtaTransformed];
  
  console.log(`\n=== TOTALS ===`);
  console.log(`ATP: ${atpTransformed.length} matches`);
  console.log(`WTA: ${wtaTransformed.length} matches`);
  console.log(`TOTAL: ${allMatches.length} matches\n`);
  
  return {
    allMatches,
    activeTournaments: tennisSports.all, // Pass tournaments for form data fetching
    leagueStats: {
      atp: { hasGames: atpTransformed.length > 0, gamesFound: atpTransformed.length },
      wta: { hasGames: wtaTransformed.length > 0, gamesFound: wtaTransformed.length },
    }
  };
}

// =============================================================================
// RECENT FORM DATA FUNCTIONS
// =============================================================================

/**
 * Normalize player name for matching (handles different formats)
 */
function normalizePlayerName(name) {
  if (!name) return '';
  
  // Remove accents, special chars, convert to lowercase
  let normalized = name.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z ]/g, '') // Only letters and spaces
    .trim();
  
  // Handle "Last, First" format → "first last"
  if (normalized.includes(',')) {
    const parts = normalized.split(',').map(p => p.trim());
    normalized = parts.reverse().join(' ');
  }
  
  return normalized;
}

/**
 * Fetch recent match results from last 3 days for player form data
 * 
 * NOTE: The Odds API doesn't provide historical scores across all tennis.
 * It only provides scores for specific active tournaments.
 * For now, we return empty form data and rely on AI's built-in knowledge.
 * 
 * Future improvement: Integrate Tennis Data API or ATP/WTA official stats
 */
async function fetchRecentFormForLeague(league) {
  console.log(`[Form] Skipping ${league} - The Odds API doesn't support historical tennis scores`);
  console.log(`[Form] AI will use built-in player knowledge instead`);
  
  // TODO: Integrate proper tennis stats API (e.g., Tennis Data API, Ultimate Tennis)
  // For accurate W-L records, H2H history, and surface-specific stats
  
  return {};
}

/**
 * Get player form summary string
 */
function getPlayerFormString(playerName, formData) {
  const normalized = normalizePlayerName(playerName);
  const form = formData[normalized];
  
  if (!form || (form.wins === 0 && form.losses === 0)) {
    return 'No recent matches';
  }
  
  return `${form.wins}W-${form.losses}L`;
}

/**
 * Enrich matches with recent form data
 */
async function enrichMatchesWithFormData(matches) {
  console.log('\n=== FETCHING RECENT FORM DATA ===');
  
  // Determine which leagues we need data for
  const leagues = [...new Set(matches.map(m => m.league))]; // ['ATP', 'WTA']
  const allFormData = {};
  
  // Fetch form data for each league
  for (const league of leagues) {
    const formData = await fetchRecentFormForLeague(league);
    // Merge into allFormData
    Object.assign(allFormData, formData);
  }
  
  // Add form data to each match
  const enrichedMatches = matches.map(match => {
    const homeForm = getPlayerFormString(match.homeTeam, allFormData);
    const awayForm = getPlayerFormString(match.awayTeam, allFormData);
    
    return {
      ...match,
      homeForm,
      awayForm,
      formData: {
        home: allFormData[normalizePlayerName(match.homeTeam)],
        away: allFormData[normalizePlayerName(match.awayTeam)]
      }
    };
  });
  
  console.log('[Form] Added recent form data to all matches\n');
  
  return enrichedMatches;
}

// =============================================================================
// AI ANALYSIS (GEMINI)
// =============================================================================

/**
 * Analyze matches with Gemini AI and calculate Expected Value
 */
async function analyzeWithAI(matches, modelIndex = 0) {
  // Use single reliable free-tier model (quota issues require paid plan for multiple retries)
  const GEMINI_MODELS = [
    'gemini-3-flash-preview',  // Only model - works on free tier
  ];
  
  if (!GEMINI_API_KEY) {
    console.warn('[AI] No Gemini API key found. Skipping AI analysis.');
    return matches.map(match => ({
      ...match,
      aiProbability: null,
      reasoning: 'AI analysis unavailable - no API key',
      confidence: 'low',
      expectedValue: 0,
      markets: match.markets.map(m => ({
        ...m,
        expectedValue: 0,
        aiProbability: null,
        reasoning: 'AI analysis unavailable',
        confidence: 'low',
      }))
    }));
  }
  
  if (matches.length === 0) {
    console.log('[AI] No matches to analyze');
    return [];
  }
  
  const currentModel = GEMINI_MODELS[modelIndex];
  console.log(`\n=== AI ANALYSIS ===`);
  console.log(`Analyzing ${matches.length} matches with Gemini AI (${currentModel})...\n`);
  
  try {
    // Initialize Gemini AI
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    
    // Create detailed prompt for professional betting analysis
    const prompt = `You are an elite professional sports bettor specializing in tennis. Analyze these ${matches.length} matches with the mindset of a sharp bettor looking for value.

**Matches to Analyze:**
${matches.map((m, i) => `
${i + 1}. ${m.league}: ${m.homeTeam} vs ${m.awayTeam}
   - Start Time: ${m.startTimeFormatted}
   - Current Odds: ${m.marketOdd} (implied probability: ${m.marketProb.toFixed(1)}%)
   - Recent Form: ${m.homeTeam} (${m.homeForm || 'Unknown'}) | ${m.awayTeam} (${m.awayForm || 'Unknown'})
   - Tour: ${m.league}
`).join('\n')}

**Your Task:**
For each match, provide:
1. **Player 1 Win Probability** (0-100%): Your realistic assessment of ${matches[0]?.homeTeam || 'the first player'}'s win chance
2. **Reasoning** (2-3 sentences): Explain your probability assessment AND the betting angle
   - **IMPORTANT**: Your reasoning should explain WHY this is a value bet
   - If you rate Player 1 higher than market odds suggest → Explain what the market is missing
   - If you rate Player 1 as an underdog but still see value → Explain why the odds are generous (e.g., "While Player 2 is favored, Player 1's odds are inflated due to recent upset potential")
   - Include: Recent form, H2H history, surface suitability, ranking trends, physical condition
   - Make it clear whether you're backing a favorite who's undervalued OR an underdog with generous odds
3. **Confidence** (high/medium/low): How confident are you in this prediction?
   - **HIGH**: Clear form/H2H advantage + surface match + no injury concerns + solid data
   - **MEDIUM**: Some indicators favor your pick but with caveats or mixed signals
   - **LOW**: Limited data, unpredictable matchup, injury concerns, or high variance player

**Think Like a Professional:**
- Be conservative and realistic (avoid extreme probabilities unless very justified)
- **CRITICAL**: If you disagree with market odds by more than 15-20%, double-check your reasoning
  - Example: Market says 36% (2.76 odds), don't go above 50-55% unless you have STRONG evidence
  - Markets are generally efficient - massive edges (>30% EV) are extremely rare in tennis
- If "No recent matches" data is available, stay CLOSER to market odds (±5-10% max)
- Surface type matters significantly in tennis (clay specialists vs hard court players)
- Recent form and head-to-head records are critical indicators
- Rankings matter but recent momentum often matters more
- Consider tournament stage (early rounds vs finals)
- Assign LOW confidence if: unknown opponent, injury comeback, extreme weather, or volatile player

**Output Format:**
Return a JSON array with exactly ${matches.length} predictions in this format:
\`\`\`json
[
  {
    "gameIndex": 0,
    "homeWinProbability": 58,
    "reasoning": "Djokovic leads H2H 4-1 and has won 8 of last 10 on hard court. Market undervalues his consistency at this stage. VALUE: Favorite is underpriced.",
    "confidence": "medium"
  },
  ...
]
\`\`\`

Return ONLY the JSON array, no other text.`;

    // Call Gemini AI
    const response = await ai.models.generateContent({
      model: currentModel,
      contents: prompt,
      config: {
        systemInstruction: "You are an elite tennis betting analyst. Provide realistic win probabilities based on player performance, surface, and H2H records. Be conservative - sharp bettors don't chase every match.",
        temperature: 0.3,
        maxOutputTokens: 4096,
      },
    });
    
    const text = response.text || '';
    console.log('[AI] Raw response received, parsing...');
    
    // Extract JSON from response - handle both raw JSON and markdown-wrapped JSON
    let jsonText = text;
    
    // Remove markdown code blocks if present (```json ... ``` or ``` ... ```)
    const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1].trim();
      console.log('[AI] Extracted JSON from markdown code block');
    }
    
    // Extract JSON array from the text
    const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('[AI] Failed to find JSON array in response:', jsonText.substring(0, 300));
      throw new Error('Failed to parse AI response - no JSON array found');
    }
    
    const aiPredictions = JSON.parse(jsonMatch[0]);
    console.log(`[AI] Successfully parsed ${aiPredictions.length} predictions`);
    
    // Enrich matches with AI data and calculate Expected Value
    const enrichedMatches = matches.map((match, index) => {
      const prediction = aiPredictions.find(p => p.gameIndex === index);
      
      if (!prediction) {
        console.warn(`[AI] No prediction found for game ${index}`);
        return {
          ...match,
          aiProbability: null,
          reasoning: 'AI prediction missing',
          confidence: 'low',
          expectedValue: 0,
          markets: match.markets.map(m => ({
            ...m,
            expectedValue: 0,
            aiProbability: null,
            reasoning: 'AI prediction missing',
            confidence: 'low',
          }))
        };
      }
      
      const aiProb = prediction.homeWinProbability / 100; // Convert to decimal (0-1)
      const marketOdds = match.marketOdd;
      
      // Expected Value Formula: (AI Probability × Odds) - 1
      // Example: If AI says 60% chance (0.60) and odds are 2.00:
      //   EV = (0.60 × 2.00) - 1 = 1.20 - 1 = 0.20 = +20% EV
      const expectedValue = (aiProb * marketOdds - 1) * 100; // Convert to percentage
      
      console.log(`  Game ${index + 1}: ${match.homeTeam} - AI: ${prediction.homeWinProbability}%, EV: ${expectedValue > 0 ? '+' : ''}${expectedValue.toFixed(1)}%`);
      
      return {
        ...match,
        aiProbability: prediction.homeWinProbability,
        reasoning: prediction.reasoning,
        confidence: prediction.confidence,
        expectedValue: Number(expectedValue.toFixed(1)),
        markets: match.markets.map(m => ({
          ...m,
          expectedValue: Number(expectedValue.toFixed(1)),
          aiProbability: prediction.homeWinProbability,
          reasoning: prediction.reasoning,
          confidence: prediction.confidence,
        }))
      };
    });
    
    console.log('[AI] Analysis complete');
    return enrichedMatches;
    
  } catch (error) {
    const isOverloaded = error.message && (
      error.message.includes('503') || 
      error.message.includes('overloaded') ||
      error.message.includes('UNAVAILABLE')
    );
    
    const isQuotaExceeded = error.message && (
      error.message.includes('429') ||
      error.message.includes('quota') ||
      error.message.includes('RESOURCE_EXHAUSTED')
    );
    
    const isTimeout = error.message && error.message.includes('timeout');
    const isParsingError = error.message && error.message.includes('parse');
    
    console.error('[Gemini] Error:', error.message.substring(0, 150));
    
    // If Gemini fails due to quota/overload, try Groq as fallback
    if ((isQuotaExceeded || isOverloaded || isParsingError) && GROQ_API_KEY) {
      console.log('[AI] Gemini unavailable, trying Groq fallback...');
      return analyzeWithGroq(matches);
    }
    
    // Retry same model on timeout (with exponential backoff)
    if (isTimeout && (matches.retryCount || 0) < 2) {
      const retryCount = (matches.retryCount || 0) + 1;
      const delay = [5000, 10000][retryCount - 1];
      
      console.log(`[AI] Timeout - retrying in ${delay/1000}s (attempt ${retryCount}/2)...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      matches.retryCount = retryCount;
      return analyzeWithAI(matches, modelIndex);
    }
    
    console.error('[AI] All AI providers exhausted. Skipping analysis.');
    
    // Return matches without AI enrichment on error
    return matches.map(match => ({
      ...match,
      aiProbability: null,
      reasoning: `AI analysis failed: ${error.message}`,
      confidence: 'low',
      expectedValue: 0,
      markets: match.markets.map(m => ({
        ...m,
        expectedValue: 0,
        aiProbability: null,
        reasoning: 'AI analysis failed',
        confidence: 'low',
      }))
    }));
  }
}

/**
 * Analyze matches with Groq AI (fallback provider)
 */
async function analyzeWithGroq(matches) {
  if (!GROQ_API_KEY) {
    console.error('[Groq] No API key found');
    return matches;
  }
  
  console.log(`\n=== GROQ FALLBACK ===`);
  console.log(`Analyzing ${matches.length} matches with Groq AI...\n`);
  
  try {
    const groq = new Groq({ apiKey: GROQ_API_KEY });
    
    // Build the prompt (same format as Gemini)
    const prompt = `You are an elite tennis betting analyst. Analyze these ${matches.length} tennis matches and provide realistic win probability predictions.

${matches.map((m, i) => `
**Match ${i + 1}: ${m.homeTeam} vs ${m.awayTeam}**
   - Start Time: ${m.startTimeFormatted}
   - Current Odds: ${m.marketOdd} (implied probability: ${m.marketProb.toFixed(1)}%)
   - Recent Form: ${m.homeTeam} (${m.homeForm || 'Unknown'}) | ${m.awayTeam} (${m.awayForm || 'Unknown'})
   - Tour: ${m.league}
`).join('\n')}

**Your Task:**
For each match, provide:
1. **Player 1 Win Probability** (0-100%)
   - IMPORTANT: Be conservative! If market odds imply 36%, don't exceed 50% unless you have STRONG evidence
   - If "No recent matches" data, stay within ±10% of market probability
   - Massive edges (>30% EV) are extremely rare - markets are generally efficient
2. **Reasoning** (2-3 sentences): Explain your probability AND the betting value
   - **CRITICAL**: Explain WHY this is a value bet
   - If Player 1 is undervalued favorite → Say what market is missing
   - If Player 1 is underdog with value → Explain why odds are generous despite being less likely to win
   - Include: form, H2H, surface suitability, ranking trends
3. **Confidence** (high/medium/low):
   - **HIGH**: Clear form/H2H advantage + surface match + solid data
   - **MEDIUM**: Some indicators favor pick but with mixed signals
   - **LOW**: Limited data, injury concerns, or high variance player

Return ONLY a JSON array with exactly ${matches.length} predictions:
[
  {
    "gameIndex": 0,
    "homeWinProbability": 58,
    "reasoning": "Strong form on hard court and market undervalues consistency. VALUE: Underpriced favorite.",
    "confidence": "medium"
  }
]`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are an elite tennis betting analyst. Return ONLY valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 4096,
    });
    
    const text = response.choices[0]?.message?.content || '';
    console.log('[Groq] Raw response received, parsing...');
    
    // Extract JSON from response
    let jsonText = text;
    const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1].trim();
      console.log('[Groq] Extracted JSON from markdown');
    }
    
    const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse Groq response - no JSON array found');
    }
    
    const aiPredictions = JSON.parse(jsonMatch[0]);
    console.log(`[Groq] Successfully parsed ${aiPredictions.length} predictions`);
    
    // Enrich matches with AI data
    const enrichedMatches = matches.map((match, index) => {
      const prediction = aiPredictions.find(p => p.gameIndex === index);
      if (!prediction) return { ...match, expectedValue: 0 };
      
      const aiProb = prediction.homeWinProbability / 100;
      const marketOdds = match.marketOdd;
      const expectedValue = (aiProb * marketOdds) - 1;
      const expectedValuePercent = Number((expectedValue * 100).toFixed(1));
      
      return {
        ...match,
        aiProbability: prediction.homeWinProbability, // Store as percentage (consistent with Gemini)
        reasoning: prediction.reasoning || 'No reasoning',
        confidence: prediction.confidence || 'medium',
        expectedValue: expectedValuePercent,
        markets: match.markets.map(m => ({
          ...m,
          expectedValue: expectedValuePercent,
          aiProbability: prediction.homeWinProbability, // Store as percentage (consistent with Gemini)
          reasoning: prediction.reasoning,
          confidence: prediction.confidence,
        }))
      };
    });
    
    enrichedMatches.forEach((match, i) => {
      const ev = match.expectedValue >= 0 ? `+${match.expectedValue}` : match.expectedValue;
      console.log(`  Game ${i + 1}: ${match.homeTeam} - AI: ${match.aiProbability.toFixed(0)}%, EV: ${ev}%`);
    });
    
    console.log('[Groq] Analysis complete');
    return enrichedMatches;
    
  } catch (error) {
    console.error('[Groq] Error:', error.message);
    return matches.map(match => ({
      ...match,
      expectedValue: 0,
      aiProbability: null,
      reasoning: 'All AI providers failed',
      confidence: 'low',
      markets: match.markets.map(m => ({
        ...m,
        expectedValue: 0,
        aiProbability: null,
        reasoning: 'AI unavailable',
        confidence: 'low',
      }))
    }));
  }
}

// =============================================================================
// BET SELECTION & FILTERING
// =============================================================================

/**
 * Classify bet into EV tier
 */
function classifyEVTier(expectedValue) {
  if (expectedValue >= EV_TIERS.SICK.min) {
    return { ...EV_TIERS.SICK, tier: 'SICK' };
  } else if (expectedValue >= EV_TIERS.ELITE.min) {
    return { ...EV_TIERS.ELITE, tier: 'ELITE' };
  } else if (expectedValue >= EV_TIERS.STRONG.min) {
    return { ...EV_TIERS.STRONG, tier: 'STRONG' };
  }
  return null; // Below minimum threshold
}

/**
 * Filter for "Safe Bets" - high probability favorites with reasonable odds
 * These are reliable bets with lower risk, perfect for parlays or conservative betting
 */
function filterSafeBets(matches, minOdds = 1.20, maxOdds = 1.60, minAIProbability = 65) {
  const safeBets = matches.filter(m => {
    const odds = m.marketOdd;
    const aiProb = m.aiProbability || 0; // Already a percentage (65 = 65%)
    
    // Must be a favorite (odds between 1.20 and 1.60)
    if (odds < minOdds || odds > maxOdds) return false;
    
    // AI must be confident (65%+ win probability)
    if (aiProb < minAIProbability) return false;
    
    return true;
  });
  
  // Sort by AI probability (most confident first), then by odds (lower = safer)
  safeBets.sort((a, b) => {
    const aProbDiff = Math.abs((b.aiProbability || 0) - (a.aiProbability || 0));
    if (aProbDiff > 5) { // If >5% difference in probability, prioritize higher probability
      return (b.aiProbability || 0) - (a.aiProbability || 0);
    }
    return a.marketOdd - b.marketOdd; // Otherwise, prefer safer odds
  });
  
  console.log(`\n=== SAFE BETS FILTERING ===`);
  console.log(`Found ${safeBets.length} safe bets (odds ${minOdds}-${maxOdds}, AI prob ≥${minAIProbability}%)`);
  
  if (safeBets.length > 0) {
    console.log('\nTop safe bets:');
    safeBets.slice(0, 3).forEach((bet, i) => {
      const aiProb = (bet.aiProbability || 0).toFixed(0);
      console.log(`  ${i + 1}. ${bet.homeTeam} vs ${bet.awayTeam} → Odds: ${bet.marketOdd.toFixed(2)} | AI: ${aiProb}% | ${bet.confidence} conf`);
    });
  }
  
  return safeBets;
}

/**
 * Filter for high-value bets (EV >= threshold)
 */
function filterHighValueBets(matches, minEV = MIN_EV_THRESHOLD) {
  const valueBets = matches.filter(m => m.expectedValue && m.expectedValue >= minEV);
  
  // Add tier classification to each bet
  const tieredBets = valueBets.map(bet => ({
    ...bet,
    evTier: classifyEVTier(bet.expectedValue)
  }));
  
  // Sort by tier priority (SICK > ELITE > STRONG), then by EV within tier
  tieredBets.sort((a, b) => {
    const tierOrder = { SICK: 3, ELITE: 2, STRONG: 1 };
    const aTierValue = tierOrder[a.evTier?.tier] || 0;
    const bTierValue = tierOrder[b.evTier?.tier] || 0;
    
    if (aTierValue !== bTierValue) {
      return bTierValue - aTierValue; // Higher tier first
    }
    return b.expectedValue - a.expectedValue; // Higher EV first within same tier
  });
  
  console.log(`\n=== VALUE FILTERING ===`);
  console.log(`Found ${tieredBets.length} bets with EV >= ${minEV}%`);
  
  if (tieredBets.length > 0) {
    // Count by tier
    const sickCount = tieredBets.filter(b => b.evTier?.tier === 'SICK').length;
    const eliteCount = tieredBets.filter(b => b.evTier?.tier === 'ELITE').length;
    const strongCount = tieredBets.filter(b => b.evTier?.tier === 'STRONG').length;
    
    console.log(`\nBreakdown by tier:`);
    if (sickCount > 0) console.log(`  🔥 Sick Edge (10%+): ${sickCount} bets`);
    if (eliteCount > 0) console.log(`  ⭐ Elite Edge (6-10%): ${eliteCount} bets`);
    if (strongCount > 0) console.log(`  💪 Strong Edge (3-6%): ${strongCount} bets`);
    
    console.log('\nTop bets:');
    tieredBets.slice(0, 5).forEach((bet, i) => {
      const tierBadge = bet.evTier ? `${bet.evTier.emoji} ${bet.evTier.label}` : '';
      console.log(`  ${i + 1}. ${bet.homeTeam} vs ${bet.awayTeam} → +${bet.expectedValue}% EV ${tierBadge} (${bet.confidence} confidence)`);
    });
  }
  
  return tieredBets;
}

/**
 * Select "Bet of the Day" (highest tier + highest EV + confidence)
 */
function selectBetOfTheDay(valueBets) {
  if (valueBets.length === 0) return null;
  
  // Multi-factor scoring system for professional bet selection
  const scored = valueBets.map(bet => {
    // Tier scoring (highest priority)
    const tierScore = bet.evTier?.tier === 'SICK' ? 200 : 
                     bet.evTier?.tier === 'ELITE' ? 150 : 
                     bet.evTier?.tier === 'STRONG' ? 100 : 0;
    
    // Confidence scoring (professional bettors prioritize confidence)
    const confidenceScore = bet.confidence === 'high' ? 100 : bet.confidence === 'medium' ? 60 : 20;
    
    // League reliability (NHL is more predictable than lower leagues)
    const leagueScore = bet.league === 'NHL' ? 100 : bet.league === 'SHL' ? 80 : 60;
    
    // Expected Value score
    const evScore = bet.expectedValue || 0;
    
    // Weighted formula:
    // - Tier: 30% weight (prioritize higher tiers)
    // - EV: 35% weight (primary factor)
    // - Confidence: 25% weight (critical for sharp betting)
    // - League: 10% weight (context matters)
    const score = (tierScore * 0.3) + (evScore * 0.35) + (confidenceScore * 0.25) + (leagueScore * 0.1);
    
    return { ...bet, score };
  });
  
  // Sort by composite score
  scored.sort((a, b) => b.score - a.score);
  
  const betOfTheDay = scored[0];
  const tierInfo = betOfTheDay.evTier ? `${betOfTheDay.evTier.emoji} ${betOfTheDay.evTier.label}` : '';
  
  console.log(`\n=== BET OF THE DAY ===`);
  console.log(`${betOfTheDay.homeTeam} vs ${betOfTheDay.awayTeam} (${betOfTheDay.league})`);
  console.log(`${tierInfo} | EV: +${betOfTheDay.expectedValue}% | Confidence: ${betOfTheDay.confidence} | Score: ${betOfTheDay.score.toFixed(1)}`);
  console.log(`Reasoning: ${betOfTheDay.reasoning}`);
  
  // Show top 3 for context
  if (scored.length > 1) {
    console.log(`\nTop 3 picks by score:`);
    scored.slice(0, 3).forEach((bet, i) => {
      const tier = bet.evTier ? `${bet.evTier.emoji}` : '';
      console.log(`  ${i + 1}. ${tier} ${bet.homeTeam} - EV: +${bet.expectedValue}%, Conf: ${bet.confidence}, Score: ${bet.score.toFixed(1)}`);
    });
  }
  console.log();
  
  return betOfTheDay;
}

// =============================================================================
// DISCORD NOTIFICATION
// =============================================================================

/**
 * Send Discord notification with bet of the day and safe bets
 */
async function sendDiscordNotification(betOfTheDay, valueBets, safeBets = []) {
  if (!DISCORD_WEBHOOK_URL) {
    console.log('[Discord] No webhook configured. Skipping notification.');
    return;
  }
  
  if (!betOfTheDay && safeBets.length === 0) {
    console.log('[Discord] No bets found. Sending "no bets" message.');
    
    const message = {
      content: `🎾 **TennTrend Daily Update**\n\n` +
        `📊 No value betting opportunities found today.\n` +
        `🎯 Our AI analyzed all available matches but none met our 3% EV minimum threshold.\n\n` +
        `✨ Quality over quantity - we only recommend professional-grade value bets.\n` +
        `📅 Check back tomorrow at 8:00 AM CET for new picks!\n\n` +
        `💪 Strong Edge (3-6%) | ⭐ Elite Edge (6-10%) | 🔥 Sick Edge (10%+)`
    };
    
    try {
      await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
      console.log('[Discord] "No bets" notification sent successfully');
    } catch (error) {
      console.error('[Discord] Failed to send notification:', error.message);
    }
    
    return;
  }
  
  // Build notification content
  let content = '';
  
  // Bet of the Day section
  if (betOfTheDay) {
    const tierBadge = betOfTheDay.evTier ? `${betOfTheDay.evTier.emoji} **${betOfTheDay.evTier.label}**` : '';
    
    content += `🏆 **TennTrend - Bet of the Day**\n\n` +
      `**${betOfTheDay.homeTeam} vs ${betOfTheDay.awayTeam}** (${betOfTheDay.league})\n` +
      `🕐 Start: ${betOfTheDay.startTimeFormatted}\n\n` +
      `${tierBadge}\n` +
      `🎯 **Pick:** ${betOfTheDay.homeTeam} to Win\n` +
      `💰 **Odds:** ${betOfTheDay.marketOdd}\n` +
      `🤖 **AI Win Probability:** ${betOfTheDay.aiProbability}%\n` +
      `📈 **Expected Value:** +${betOfTheDay.expectedValue}%\n` +
      `🎲 **Confidence:** ${betOfTheDay.confidence.toUpperCase()}\n\n` +
      `💡 **Analysis:**\n${betOfTheDay.reasoning}\n\n` +
      `${getAdditionalBetsMessage(valueBets)}\n`;
  }
  
  // Safe Bets section
  if (safeBets.length > 0) {
    if (betOfTheDay) content += `\n---\n\n`;
    
    content += `🛡️ **Safe Bets Today** (High Probability Favorites)\n\n`;
    
    safeBets.slice(0, 3).forEach((bet, i) => {
      content += `**${i + 1}. ${bet.homeTeam}** vs ${bet.awayTeam}\n` +
        `   💰 Odds: ${bet.marketOdd.toFixed(2)} | 🤖 AI: ${bet.aiProbability}% | 🎲 ${bet.confidence.toUpperCase()}\n` +
        `   🕐 ${bet.startTimeFormatted}\n\n`;
    });
    
    content += `💡 *Safe bets are high-probability favorites perfect for parlays or conservative betting*\n`;
  }
  
  content += `\n✨ Professional-grade analysis | EV Tiers: 💪 Strong (3-6%) | ⭐ Elite (6-10%) | 🔥 Sick (10%+)`;
  
  const message = { content };
  
  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
    console.log('[Discord] Notification sent successfully (Value bets: ' + valueBets.length + ', Safe bets: ' + safeBets.length + ')');
  } catch (error) {
    console.error('[Discord] Failed to send notification:', error.message);
  }
}

/**
 * Get additional bets summary message
 */
function getAdditionalBetsMessage(valueBets) {
  if (valueBets.length <= 1) return '';
  
  const additional = valueBets.length - 1;
  const tiers = {
    sick: valueBets.filter(b => b.evTier?.tier === 'SICK').length,
    elite: valueBets.filter(b => b.evTier?.tier === 'ELITE').length,
    strong: valueBets.filter(b => b.evTier?.tier === 'STRONG').length
  };
  
  let msg = `📊 **${additional} More Value Bet${additional > 1 ? 's' : ''} Available**\n`;
  if (tiers.sick > 1) msg += `   🔥 Sick Edge: ${tiers.sick}\n`;
  if (tiers.elite > 0) msg += `   ⭐ Elite Edge: ${tiers.elite}\n`;
  if (tiers.strong > 0) msg += `   💪 Strong Edge: ${tiers.strong}\n`;
  
  return msg;
}

// =============================================================================
// SAVE RESULTS
// =============================================================================

/**
 * Save daily picks to JSON file
 */
function saveDailyPicks(allMatches, valueBets, betOfTheDay, safeBets, leagueStats) {
  const timezones = getTimezones();
  
  const output = {
    timestamp: timezones.now.toISOString(),
    scanDateCET: timezones.cetTime.toLocaleDateString('sv-SE'),
    scanDateET: timezones.etTime.toLocaleDateString('en-US'),
    scanTimeCET: timezones.cetTime.toLocaleString('sv-SE'),
    leagueStats,
    summary: {
      totalGamesAnalyzed: allMatches.length,
      valueBetsFound: valueBets.length,
      safeBetsFound: safeBets.length,
      hasBetOfTheDay: !!betOfTheDay,
      avgEV: valueBets.length > 0 
        ? Number((valueBets.reduce((sum, b) => sum + b.expectedValue, 0) / valueBets.length).toFixed(1))
        : 0,
    },
    betOfTheDay: betOfTheDay || null,
    featuredBets: valueBets.slice(0, 5), // Top 5
    allBets: valueBets,
    safeBets: safeBets.slice(0, 3), // Top 3 safe bets
    allSafeBets: safeBets,
    metadata: {
      minEVThreshold: MIN_EV_THRESHOLD,
      version: '2.1.0',
      generatedBy: 'daily-scan.js'
    }
  };
  
  const outputPath = join(__dirname, '..', 'public', 'data', 'daily-picks.json');
  writeFileSync(outputPath, JSON.stringify(output, null, 2));
  
  console.log(`\n=== SAVED ===`);
  console.log(`Results saved to: ${outputPath}`);
  console.log(`Total games: ${allMatches.length}`);
  console.log(`Value bets: ${valueBets.length}`);
  console.log(`Safe bets: ${safeBets.length}`);
  console.log(`Bet of the day: ${betOfTheDay ? 'YES' : 'NO'}\n`);
  
  // Also add Bet of the Day to results history
  if (betOfTheDay) {
    addBetToHistory(betOfTheDay, timezones.cetTime);
  }
  
  // Also add safe bets to history for separate tracking
  if (safeBets.length > 0) {
    addSafeBetsToHistory(safeBets, timezones.cetTime);
  }
}

/**
 * Add the Bet of the Day to results history for tracking
 */
function addBetToHistory(betOfTheDay, scanTime) {
  try {
    const historyPath = join(__dirname, '..', 'public', 'data', 'results-history.json');
    
    let history;
    try {
      const data = readFileSync(historyPath, 'utf-8');
      history = JSON.parse(data);
    } catch (error) {
      console.log('[History] Creating new results history file');
      history = { 
        bets: [], 
        safeBets: [],
        stats: { 
          totalBets: 0, 
          wins: 0, 
          losses: 0, 
          pending: 0, 
          totalROI: 0 
        },
        safeBetStats: {
          totalBets: 0,
          wins: 0,
          losses: 0,
          pending: 0,
          totalROI: 0
        }
      };
    }
    
    // Ensure safeBets array exists
    if (!history.safeBets) history.safeBets = [];
    if (!history.safeBetStats) {
      history.safeBetStats = {
        totalBets: 0,
        wins: 0,
        losses: 0,
        pending: 0,
        totalROI: 0
      };
    }
    
    const todayDate = scanTime.toLocaleDateString('sv-SE');
    
    // Add Bet of the Day to history
    const historyBet = {
      id: betOfTheDay.id,
      date: todayDate,
      matchTime: betOfTheDay.startTime,
      league: betOfTheDay.league,
      homeTeam: betOfTheDay.homeTeam,
      awayTeam: betOfTheDay.awayTeam,
      outcome: betOfTheDay.markets[0].outcome,
      odds: betOfTheDay.markets[0].odds,
      expectedValue: betOfTheDay.expectedValue,
      confidence: betOfTheDay.confidence,
      reasoning: betOfTheDay.reasoning,
      status: 'pending',
      result: null,
      roi: null,
      addedAt: new Date().toISOString()
    };
    
    // Check if this bet already exists (by ID)
    const exists = history.bets.some(b => b.id === betOfTheDay.id);
    if (!exists) {
      history.bets.unshift(historyBet);
      console.log(`[History] Added Bet of the Day to results history`);
    } else {
      console.log(`[History] Bet of the Day already exists in history`);
    }
    
    // Update stats
    history.stats.totalBets = history.bets.length;
    history.stats.pending = history.bets.filter(b => b.status === 'pending').length;
    
    writeFileSync(historyPath, JSON.stringify(history, null, 2));
    
  } catch (error) {
    console.error('[History] Error updating results history:', error.message);
  }
}

/**
 * Add safe bets to history for separate tracking
 */
function addSafeBetsToHistory(safeBets, scanTime) {
  if (safeBets.length === 0) return;
  
  try {
    const historyPath = join(__dirname, '..', 'public', 'data', 'results-history.json');
    
    let history;
    try {
      const data = readFileSync(historyPath, 'utf-8');
      history = JSON.parse(data);
    } catch (error) {
      console.log('[History] Creating new results history file');
      history = { 
        bets: [], 
        safeBets: [],
        stats: { totalBets: 0, wins: 0, losses: 0, pending: 0, totalROI: 0 },
        safeBetStats: { totalBets: 0, wins: 0, losses: 0, pending: 0, totalROI: 0 }
      };
    }
    
    // Ensure safeBets array exists
    if (!history.safeBets) history.safeBets = [];
    if (!history.safeBetStats) {
      history.safeBetStats = { totalBets: 0, wins: 0, losses: 0, pending: 0, totalROI: 0 };
    }
    
    const todayDate = scanTime.toLocaleDateString('sv-SE');
    let addedCount = 0;
    
    // Add each safe bet
    safeBets.forEach(safeBet => {
      const historyBet = {
        id: safeBet.id,
        date: todayDate,
        matchTime: safeBet.startTime,
        league: safeBet.league,
        homeTeam: safeBet.homeTeam,
        awayTeam: safeBet.awayTeam,
        outcome: safeBet.homeTeam,
        odds: safeBet.marketOdd,
        aiProbability: safeBet.aiProbability,
        confidence: safeBet.confidence,
        reasoning: safeBet.reasoning,
        status: 'pending',
        result: null,
        roi: null,
        addedAt: new Date().toISOString()
      };
      
      // Check if this bet already exists
      const exists = history.safeBets.some(b => b.id === safeBet.id);
      if (!exists) {
        history.safeBets.unshift(historyBet);
        addedCount++;
      }
    });
    
    if (addedCount > 0) {
      console.log(`[History] Added ${addedCount} safe bet(s) to history`);
    }
    
    // Update safe bet stats
    history.safeBetStats.totalBets = history.safeBets.length;
    history.safeBetStats.pending = history.safeBets.filter(b => b.status === 'pending').length;
    
    writeFileSync(historyPath, JSON.stringify(history, null, 2));
    
  } catch (error) {
    console.error('[History] Error adding safe bets to history:', error.message);
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   TennTrend Daily Scan - Version 2.1      ║');
  console.log('╚════════════════════════════════════════════╝\n');
  
  try {
    // 1. Fetch odds from all leagues
    const { allMatches, activeTournaments, leagueStats } = await fetchAllLeagues();
    
    if (allMatches.length === 0) {
      console.log('\n⚠️  No games found across all leagues. Saving empty state.');
      saveDailyPicks([], [], null, [], leagueStats);
      await sendDiscordNotification(null, [], []);
      return;
    }
    
    // 2. Enrich matches with recent form data
    const matchesWithForm = await enrichMatchesWithFormData(allMatches);
    
    // 3. Analyze with AI
    const enrichedMatches = await analyzeWithAI(matchesWithForm);
    
    // 4. Filter for high-value bets (EV >= 3%)
    const valueBets = filterHighValueBets(enrichedMatches, MIN_EV_THRESHOLD);
    
    // 5. Filter for safe bets (favorites with odds 1.20-1.60 and high AI probability)
    const safeBets = filterSafeBets(enrichedMatches);
    
    // 6. Select bet of the day
    const betOfTheDay = selectBetOfTheDay(valueBets);
    
    // 7. Save results
    saveDailyPicks(enrichedMatches, valueBets, betOfTheDay, safeBets, leagueStats);
    
    // 8. Send Discord notification (including safe bets)
    await sendDiscordNotification(betOfTheDay, valueBets, safeBets);
    
    console.log('✅ Daily scan complete!\n');
    
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    process.exit(1);
  }
}

// Run the script
main();
