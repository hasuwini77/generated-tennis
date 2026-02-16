/**
 * Multi-Provider Tennis API Service
 * 
 * Implements automatic fallback between multiple tennis data providers:
 * 1. The-Odds-API (Primary)
 * 2. Tennis-API-ATP-WTA-ITF (RapidAPI)
 * 3. LiveScore6 (RapidAPI)
 * 
 * Keeps the current workflow intact while providing resilience when quota is exceeded.
 */

import { Match } from "../types";

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

interface OddsAPIBookmaker {
  key: string;
  title: string;
  markets: {
    key: string;
    outcomes: {
      name: string;
      price: number;
    }[];
  }[];
}

interface OddsAPIGame {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsAPIBookmaker[];
}

interface TennisAPIFixture {
  id: string;
  tournament: {
    name: string;
    category: string;
  };
  homeTeam: {
    name: string;
  };
  awayTeam: {
    name: string;
  };
  startTimestamp: number;
}

interface LiveScoreMatch {
  Eid: string;
  Epr: string;
  T1: Array<{ Nm: string }>;
  T2: Array<{ Nm: string }>;
  Esd: number;
}

export enum APIProvider {
  THE_ODDS_API = 'THE_ODDS_API',
  TENNIS_API = 'TENNIS_API',
  LIVESCORE = 'LIVESCORE'
}

interface FetchResult {
  success: boolean;
  provider: APIProvider;
  matches: Match[];
  error?: string;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const THE_ODDS_API_BASE = "https://api.the-odds-api.com/v4";
const TENNIS_API_BASE = "https://tennis-api-atp-wta-itf.p.rapidapi.com/tennis/v2";
const LIVESCORE_API_BASE = "https://livescore6.p.rapidapi.com";

const RAPIDAPI_KEY = "bccefb9e3cmsh6275b4d52bc7d3fp18858cjsn571965f8e30e";

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculate probability from decimal odds
 */
function calculateProbability(odds: number): number {
  return Math.round((1 / odds) * 100);
}

/**
 * Format game time for display
 */
function formatGameTime(timestamp: string | number): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp * 1000);
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
}

/**
 * Determine league (ATP/WTA) from tournament info
 */
function determineTourFromName(tournamentName: string): 'ATP' | 'WTA' {
  const name = tournamentName.toUpperCase();
  if (name.includes('WTA') || name.includes('WOMEN')) return 'WTA';
  return 'ATP'; // Default to ATP
}

/**
 * Get API key from environment
 */
function getTheOddsApiKey(): string {
  const key = import.meta.env.VITE_THE_ODDS_API_KEY;
  if (!key || key === "your_the_odds_api_key_here") {
    throw new Error("The-Odds-API key not configured");
  }
  return key;
}

// =============================================================================
// PROVIDER 1: THE-ODDS-API (PRIMARY)
// =============================================================================

async function fetchFromTheOddsAPI(sportKey: string, leagueName: 'ATP' | 'WTA'): Promise<FetchResult> {
  try {
    const apiKey = getTheOddsApiKey();
    const url = `${THE_ODDS_API_BASE}/sports/${sportKey}/odds?apiKey=${apiKey}&regions=us,eu&markets=h2h&oddsFormat=decimal`;
    
    console.log(`[The-Odds-API] Fetching ${leagueName} odds...`);
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Invalid API key");
      }
      if (response.status === 429 || response.status === 402) {
        throw new Error("API quota exceeded");
      }
      throw new Error(`API error: ${response.status}`);
    }
    
    const games: OddsAPIGame[] = await response.json();
    console.log(`[The-Odds-API] Received ${games.length} ${leagueName} games`);
    
    // Transform to Match format
    const matches = transformTheOddsAPIMatches(games, leagueName);
    
    return {
      success: true,
      provider: APIProvider.THE_ODDS_API,
      matches
    };
    
  } catch (error) {
    console.error(`[The-Odds-API] Error:`, error);
    return {
      success: false,
      provider: APIProvider.THE_ODDS_API,
      matches: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function transformTheOddsAPIMatches(games: OddsAPIGame[], league: 'ATP' | 'WTA'): Match[] {
  const matches: Match[] = [];
  
  games.forEach(game => {
    if (!game.bookmakers || game.bookmakers.length === 0) return;
    
    // Collect all odds for home team
    const homeOdds: number[] = [];
    game.bookmakers.forEach(bookmaker => {
      const h2hMarket = bookmaker.markets.find(m => m.key === "h2h");
      if (h2hMarket) {
        const outcome = h2hMarket.outcomes.find(o => o.name === game.home_team);
        if (outcome) {
          homeOdds.push(outcome.price);
        }
      }
    });
    
    if (homeOdds.length === 0) return;
    
    // Best odds = highest (best for bettor)
    const marketOdd = Math.max(...homeOdds);
    const marketProb = calculateProbability(marketOdd);
    
    matches.push({
      id: game.id,
      league,
      homeTeam: game.home_team,
      awayTeam: game.away_team,
      startTime: formatGameTime(game.commence_time),
      startTimeFormatted: new Date(game.commence_time).toLocaleString('en-US', {
        timeZone: 'Europe/Stockholm',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }),
      marketOdd: Number(marketOdd.toFixed(2)),
      marketProb,
    });
  });
  
  return matches;
}

// =============================================================================
// PROVIDER 2: TENNIS-API (RAPIDAPI) - FALLBACK
// =============================================================================

async function fetchFromTennisAPI(): Promise<FetchResult> {
  try {
    console.log(`[Tennis-API] Fetching fixtures as fallback...`);
    
    // Get current date for fixtures
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    // Try date range endpoint
    const url = `${TENNIS_API_BASE}/atp/fixtures/${todayStr}/${tomorrowStr}`;
    
    const response = await fetch(url, {
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
    console.log(`[Tennis-API] Received response`);
    
    // Parse response - structure may vary
    let fixtures: any[] = [];
    if (Array.isArray(data)) {
      fixtures = data;
    } else if (data.events) {
      fixtures = data.events;
    } else if (data.fixtures) {
      fixtures = data.fixtures;
    }
    
    const matches = transformTennisAPIMatches(fixtures);
    
    return {
      success: true,
      provider: APIProvider.TENNIS_API,
      matches
    };
    
  } catch (error) {
    console.error(`[Tennis-API] Error:`, error);
    return {
      success: false,
      provider: APIProvider.TENNIS_API,
      matches: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function transformTennisAPIMatches(fixtures: any[]): Match[] {
  const matches: Match[] = [];
  
  fixtures.forEach((fixture: any) => {
    try {
      // Handle different possible structures
      const homeTeam = fixture.homeTeam?.name || fixture.home_team || fixture.player1?.name || '';
      const awayTeam = fixture.awayTeam?.name || fixture.away_team || fixture.player2?.name || '';
      const startTime = fixture.startTimestamp || fixture.commence_time || fixture.start_time;
      const tournamentName = fixture.tournament?.name || fixture.sport_title || 'Tennis';
      
      if (!homeTeam || !awayTeam) return;
      
      // Default odds (no odds available from this API, use placeholder)
      const marketOdd = 2.00;
      const marketProb = calculateProbability(marketOdd);
      
      matches.push({
        id: fixture.id || `${homeTeam}-${awayTeam}-${startTime}`,
        league: determineTourFromName(tournamentName),
        homeTeam,
        awayTeam,
        startTime: formatGameTime(startTime),
        startTimeFormatted: new Date(startTime * 1000).toLocaleString('en-US', {
          timeZone: 'Europe/Stockholm',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }),
        marketOdd,
        marketProb,
      });
    } catch (err) {
      console.warn('[Tennis-API] Failed to parse fixture:', err);
    }
  });
  
  return matches;
}

// =============================================================================
// PROVIDER 3: LIVESCORE6 (RAPIDAPI) - LAST RESORT
// =============================================================================

async function fetchFromLiveScore(): Promise<FetchResult> {
  try {
    console.log(`[LiveScore6] Fetching matches as fallback...`);
    
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
    console.log(`[LiveScore6] Received response`);
    
    // Parse response
    const events = data.Stages || [];
    const matches = transformLiveScoreMatches(events);
    
    return {
      success: true,
      provider: APIProvider.LIVESCORE,
      matches
    };
    
  } catch (error) {
    console.error(`[LiveScore6] Error:`, error);
    return {
      success: false,
      provider: APIProvider.LIVESCORE,
      matches: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function transformLiveScoreMatches(stages: any[]): Match[] {
  const matches: Match[] = [];
  
  stages.forEach((stage: any) => {
    const events = stage.Events || [];
    
    events.forEach((event: any) => {
      try {
        const homeTeam = event.T1?.[0]?.Nm || '';
        const awayTeam = event.T2?.[0]?.Nm || '';
        const startTime = event.Esd;
        const category = stage.Snm || 'Tennis';
        
        if (!homeTeam || !awayTeam) return;
        
        // Default odds (no odds from LiveScore)
        const marketOdd = 2.00;
        const marketProb = calculateProbability(marketOdd);
        
        matches.push({
          id: event.Eid || `${homeTeam}-${awayTeam}-${startTime}`,
          league: determineTourFromName(category),
          homeTeam,
          awayTeam,
          startTime: formatGameTime(startTime),
          startTimeFormatted: new Date(startTime * 1000).toLocaleString('en-US', {
            timeZone: 'Europe/Stockholm',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }),
          marketOdd,
          marketProb,
        });
      } catch (err) {
        console.warn('[LiveScore6] Failed to parse event:', err);
      }
    });
  });
  
  return matches;
}

// =============================================================================
// MAIN FALLBACK LOGIC
// =============================================================================

/**
 * Fetch tennis matches with automatic fallback
 * Tries providers in order: The-Odds-API -> Tennis-API -> LiveScore6
 */
export async function fetchTennisMatchesWithFallback(
  sportKeys: { atp?: string[]; wta?: string[] } = {}
): Promise<{
  matches: Match[];
  provider: APIProvider;
  success: boolean;
  error?: string;
}> {
  console.log('\n=== FETCHING TENNIS DATA WITH FALLBACK ===\n');
  
  // STEP 1: Try The-Odds-API (Primary)
  try {
    const atpKeys = sportKeys.atp || ['tennis_atp'];
    const wtaKeys = sportKeys.wta || ['tennis_wta'];
    
    const atpResults = await Promise.all(
      atpKeys.map(key => fetchFromTheOddsAPI(key, 'ATP'))
    );
    const wtaResults = await Promise.all(
      wtaKeys.map(key => fetchFromTheOddsAPI(key, 'WTA'))
    );
    
    const allResults = [...atpResults, ...wtaResults];
    const hasFailures = allResults.some(r => !r.success);
    
    if (!hasFailures) {
      const matches = allResults.flatMap(r => r.matches);
      console.log(`✅ [The-Odds-API] Success! ${matches.length} matches fetched\n`);
      return {
        matches,
        provider: APIProvider.THE_ODDS_API,
        success: true
      };
    }
    
    // Check if quota exceeded (trigger fallback)
    const quotaExceeded = allResults.some(r => 
      r.error?.includes('quota') || r.error?.includes('429') || r.error?.includes('402')
    );
    
    if (quotaExceeded) {
      console.warn('⚠️  [The-Odds-API] Quota exceeded, trying fallback...\n');
    }
  } catch (error) {
    console.warn('⚠️  [The-Odds-API] Failed, trying fallback...\n');
  }
  
  // STEP 2: Try Tennis-API (Fallback)
  console.log('🔄 Attempting fallback to Tennis-API...\n');
  const tennisAPIResult = await fetchFromTennisAPI();
  
  if (tennisAPIResult.success && tennisAPIResult.matches.length > 0) {
    console.log(`✅ [Tennis-API] Success! ${tennisAPIResult.matches.length} matches fetched\n`);
    return {
      matches: tennisAPIResult.matches,
      provider: APIProvider.TENNIS_API,
      success: true
    };
  }
  
  // STEP 3: Try LiveScore6 (Last Resort)
  console.log('🔄 Attempting fallback to LiveScore6...\n');
  const liveScoreResult = await fetchFromLiveScore();
  
  if (liveScoreResult.success && liveScoreResult.matches.length > 0) {
    console.log(`✅ [LiveScore6] Success! ${liveScoreResult.matches.length} matches fetched\n`);
    return {
      matches: liveScoreResult.matches,
      provider: APIProvider.LIVESCORE,
      success: true
    };
  }
  
  // All providers failed
  console.error('❌ All API providers failed\n');
  return {
    matches: [],
    provider: APIProvider.THE_ODDS_API,
    success: false,
    error: 'All API providers failed or returned no data'
  };
}

/**
 * Export for backward compatibility
 * This maintains the existing interface while adding fallback
 */
export async function fetchNHLOdds(): Promise<Match[]> {
  const result = await fetchTennisMatchesWithFallback();
  return result.matches;
}
