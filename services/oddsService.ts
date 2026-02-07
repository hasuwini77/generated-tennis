
import { Match } from "../types";

// Types for The-Odds-API response
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

interface ApiUsageStats {
  count: number;
  limit: number;
  resetDate: string;
  lastFetch: string;
}

const API_BASE_URL = "https://api.the-odds-api.com/v4";
const CACHE_KEY = "pucktrend_odds_cache";
const USAGE_KEY = "pucktrend_api_usage";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Get API key from environment
 */
function getApiKey(): string {
  const key = import.meta.env.VITE_THE_ODDS_API_KEY;
  if (!key || key === "your_the_odds_api_key_here") {
    throw new Error("The-Odds-API key not configured. Please add VITE_THE_ODDS_API_KEY to .env.local");
  }
  return key;
}

/**
 * Get API usage statistics from localStorage
 */
export function getApiUsage(): ApiUsageStats {
  const stored = localStorage.getItem(USAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  
  // Initialize with default values
  const now = new Date();
  const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
  
  return {
    count: 0,
    limit: 500,
    resetDate: resetDate.toISOString(),
    lastFetch: ""
  };
}

/**
 * Update API usage counter
 */
function incrementApiUsage(): void {
  const usage = getApiUsage();
  const now = new Date();
  const resetDate = new Date(usage.resetDate);
  
  // Check if we need to reset the counter (new month)
  if (now >= resetDate) {
    usage.count = 1;
    usage.resetDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString();
  } else {
    usage.count += 1;
  }
  
  usage.lastFetch = now.toISOString();
  localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
}

/**
 * Check if we should use cached data
 */
function shouldUseCache(): { useCache: boolean; data: Match[] | null } {
  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) return { useCache: false, data: null };
  
  try {
    const { timestamp, data } = JSON.parse(cached);
    const age = Date.now() - timestamp;
    
    if (age < CACHE_DURATION) {
      console.log(`[Cache] Using cached data (${Math.round(age / 1000 / 60)} minutes old)`);
      return { useCache: true, data };
    }
  } catch (err) {
    console.error("[Cache] Error reading cache:", err);
  }
  
  return { useCache: false, data: null };
}

/**
 * Save data to cache
 */
function saveToCache(data: Match[]): void {
  const cacheData = {
    timestamp: Date.now(),
    data
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  console.log("[Cache] Data cached successfully");
}

/**
 * Calculate probability from decimal odds
 */
function calculateProbability(odds: number): number {
  return Math.round((1 / odds) * 100);
}

/**
 * Find the best and worst odds for a team across bookmakers
 */
function findOddsRange(bookmakers: OddsAPIBookmaker[], teamName: string): { min: number; max: number } | null {
  const odds: number[] = [];
  
  bookmakers.forEach(bookmaker => {
    const h2hMarket = bookmaker.markets.find(m => m.key === "h2h");
    if (h2hMarket) {
      const outcome = h2hMarket.outcomes.find(o => o.name === teamName);
      if (outcome) {
        odds.push(outcome.price);
      }
    }
  });
  
  if (odds.length === 0) return null;
  
  return {
    min: Math.min(...odds),
    max: Math.max(...odds)
  };
}

/**
 * Transform The-Odds-API data to our Match format
 */
function transformToMatches(games: OddsAPIGame[], league: 'NHL' | 'SHL' | 'Allsvenskan'): Match[] {
  const matches: Match[] = [];
  
  games.forEach(game => {
    if (game.bookmakers.length === 0) return;
    
    // Get odds range for home team
    const homeOddsRange = findOddsRange(game.bookmakers, game.home_team);
    if (!homeOddsRange) return;
    
    // Market odds = highest odds (worst for bettor, represents market consensus)
    const marketOdd = homeOddsRange.max;
    const marketProb = calculateProbability(marketOdd);
    
    // Actual odds = lowest odds (best for bettor, represents sharp money)
    const actualOdd = homeOddsRange.min;
    const actualProb = calculateProbability(actualOdd);
    
    // Delta = difference (positive delta = value opportunity)
    const delta = actualProb - marketProb;
    
    matches.push({
      id: game.id,
      league: league,
      homeTeam: game.home_team,
      awayTeam: game.away_team,
      startTime: new Date(game.commence_time).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }),
      marketOdd: Number(marketOdd.toFixed(2)),
      marketProb,
      actualProb,
      delta
    });
  });
  
  // Sort by delta descending (highest value first)
  return matches.sort((a, b) => b.delta - a.delta);
}

/**
 * Fetch NHL odds from The-Odds-API
 */
async function fetchLeagueOdds(sportKey: string, leagueName: 'NHL' | 'SHL' | 'Allsvenskan'): Promise<Match[]> {
  try {
    const apiKey = getApiKey();
    const url = `${API_BASE_URL}/sports/${sportKey}/odds?apiKey=${apiKey}&regions=us,eu&markets=h2h&oddsFormat=decimal`;
    
    console.log(`[API] Fetching ${leagueName} odds from The-Odds-API...`);
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Invalid API key. Please check your THE_ODDS_API_KEY in .env.local");
      }
      if (response.status === 429) {
        throw new Error("API quota exceeded. Please wait until quota resets.");
      }
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const games: OddsAPIGame[] = await response.json();
    console.log(`[API] Received ${games.length} ${leagueName} games`);
    
    // Transform to our format with league name
    const matches = transformToMatches(games, leagueName);
    
    return matches;
    
  } catch (error) {
    console.error(`[API] Error fetching ${leagueName} odds:`, error);
    return []; // Return empty array on error for this league
  }
}

/**
 * Fetch all hockey odds (NHL + SHL + Allsvenskan)
 */
export async function fetchNHLOdds(): Promise<Match[]> {
  // Check cache first
  const { useCache, data } = shouldUseCache();
  if (useCache && data) {
    return data;
  }
  
  // Check API quota
  const usage = getApiUsage();
  if (usage.count >= usage.limit) {
    console.warn(`[API] Quota exceeded (${usage.count}/${usage.limit}). Using cached data.`);
    if (data) return data;
    throw new Error(`API quota exceeded. Resets on ${new Date(usage.resetDate).toLocaleDateString()}`);
  }
  
  try {
    console.log("[API] Fetching all hockey leagues (NHL, SHL, Allsvenskan)...");
    
    // Fetch all 3 leagues in parallel
    const [nhlMatches, shlMatches, allsvenskanMatches] = await Promise.all([
      fetchLeagueOdds('icehockey_nhl', 'NHL'),
      fetchLeagueOdds('icehockey_sweden_hockey_league', 'SHL'),
      fetchLeagueOdds('icehockey_sweden_allsvenskan', 'Allsvenskan')
    ]);
    
    // Combine all matches
    const allMatches = [...nhlMatches, ...shlMatches, ...allsvenskanMatches];
    
    console.log(`[API] Total games: ${allMatches.length} (NHL: ${nhlMatches.length}, SHL: ${shlMatches.length}, Allsvenskan: ${allsvenskanMatches.length})`);
    
    // Update usage counter (3 requests made)
    incrementApiUsage();
    incrementApiUsage();
    incrementApiUsage();
    
    // Cache the combined results
    saveToCache(allMatches);
    
    console.log(`[API] Successfully processed ${allMatches.length} matches across all leagues. Usage: ${usage.count + 3}/${usage.limit}`);
    
    return allMatches;
    
  } catch (error) {
    console.error("[API] Error fetching odds:", error);
    
    // Try to return cached data as fallback
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data } = JSON.parse(cached);
      console.warn("[API] Returning stale cached data due to error");
      return data;
    }
    
    throw error;
  }
}

/**
 * Clear cache and force fresh fetch
 */
export function clearOddsCache(): void {
  localStorage.removeItem(CACHE_KEY);
  console.log("[Cache] Cache cleared");
}

/**
 * Check if API quota is available
 */
export function isQuotaAvailable(): boolean {
  const usage = getApiUsage();
  return usage.count < usage.limit;
}

/**
 * Get percentage of quota used
 */
export function getQuotaUsagePercent(): number {
  const usage = getApiUsage();
  return Math.round((usage.count / usage.limit) * 100);
}
