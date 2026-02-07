import React, { useState, useEffect } from "react";
import { Match } from "./types";
import BetOfTheDayHero from "./components/BetOfTheDayHero";
import ValueBetsList from "./components/ValueBetsList";
import { getTimeSince, isStaleData } from "./utils/formatters";

type League = "ATP" | "WTA";

interface DailyPicksData {
  timestamp: string;
  scanDateCET: string;
  scanTimeCET: string;
  leagueStats: {
    atp: { hasGames: boolean; gamesFound: number };
    wta: { hasGames: boolean; gamesFound: number };
  };
  summary: {
    totalGamesAnalyzed: number;
    valueBetsFound: number;
    hasBetOfTheDay: boolean;
    avgEV: number;
  };
  betOfTheDay: Match | null;
  featuredBets: Match[];
  allBets: Match[];
  metadata: {
    minEVThreshold: number;
    version: string;
    generatedBy: string;
  };
}

const App: React.FC = () => {
  const [dailyData, setDailyData] = useState<DailyPicksData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Fetch daily picks from static JSON
  const fetchDailyPicks = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/data/daily-picks.json");

      if (!response.ok) {
        throw new Error("Failed to load daily picks");
      }

      const data: DailyPicksData = await response.json();
      setDailyData(data);

      console.log("[App] Loaded daily picks:", {
        scanTime: data.scanTimeCET,
        totalGames: data.summary.totalGamesAnalyzed,
        valueBets: data.summary.valueBetsFound,
        betOfTheDay: data.summary.hasBetOfTheDay,
      });
    } catch (err) {
      console.error("[App] Error loading daily picks:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load daily picks",
      );
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and auto-refresh every hour
  useEffect(() => {
    fetchDailyPicks();

    // Auto-refresh every hour to check for new data
    const interval = setInterval(fetchDailyPicks, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Get other value bets (excluding Bet of the Day)
  const getOtherValueBets = (): Match[] => {
    if (!dailyData) return [];
    return dailyData.featuredBets.filter(
      (bet) => bet.id !== dailyData.betOfTheDay?.id,
    );
  };

  const otherBets = getOtherValueBets();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f172a]">
      {/* Header - More Compact */}
      <header className="bg-gradient-to-r from-[#1a1a2e]/95 to-[#16213e]/95 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 p-2 rounded-xl shadow-xl shadow-blue-500/30 text-2xl">
              🎾
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                TENN
                <span className="text-blue-400">
                  TREND
                </span>
              </h1>
              <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">
                AI-Powered Tennis Analysis
              </p>
            </div>
          </div>

          {dailyData && (
            <div className="text-xs text-gray-400 text-right">
              <div className="text-blue-400 font-mono text-[11px]">
                {getTimeSince(dailyData.timestamp)}
              </div>
              <div className="text-[9px] text-gray-500">Next: 8:00 AM CET</div>
            </div>
          )}
        </div>
      </header>

      {/* Stale Data Warning */}
      {dailyData && isStaleData(dailyData.timestamp) && (
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-3 text-xs backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span className="text-yellow-300 font-semibold">
                Data may be outdated. Next scan: 8:00 AM CET
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="bg-gradient-to-r from-red-500/20 to-pink-500/20 border border-red-500/30 rounded-xl p-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-xs">
              <span>⚠️</span>
              <p className="text-red-300 font-semibold">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Sidebar Layout */}
      <main className="max-w-7xl mx-auto px-4 py-4">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-400 border-t-transparent mb-4 shadow-lg shadow-blue-400/20"></div>
              <p className="text-gray-400 font-semibold">
                Loading AI Analysis...
              </p>
            </div>
          </div>
        )}

        {/* Content Grid: Sidebar + Main */}
        {!loading && dailyData && (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
            {/* Sidebar - Daily Stats */}
            <aside className="space-y-4">
              <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-2xl p-4 border border-white/10 shadow-lg sticky top-20">
                <h2 className="text-sm font-bold text-gray-300 mb-3 uppercase tracking-wider">
                  Daily Stats
                </h2>

                <div className="space-y-3">
                  <div className="bg-blue-500/10 backdrop-blur-sm rounded-xl p-3 border border-blue-500/20">
                    <div className="text-[10px] text-gray-400 mb-1">
                      Games Analyzed
                    </div>
                    <div className="text-2xl font-bold text-blue-400">
                      {dailyData.summary.totalGamesAnalyzed}
                    </div>
                  </div>

                  <div className="bg-blue-500/10 backdrop-blur-sm rounded-xl p-3 border border-blue-500/20">
                    <div className="text-[10px] text-gray-400 mb-1">
                      Value Bets Found
                    </div>
                    <div className="text-2xl font-bold text-blue-400">
                      {dailyData.summary.valueBetsFound}
                    </div>
                  </div>

                  <div className="bg-blue-500/10 backdrop-blur-sm rounded-xl p-3 border border-blue-500/20">
                    <div className="text-[10px] text-gray-400 mb-1">Avg EV</div>
                    <div className="text-2xl font-bold text-blue-400">
                      {dailyData.summary.avgEV > 0
                        ? `+${dailyData.summary.avgEV.toFixed(1)}%`
                        : "-"}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 backdrop-blur-sm rounded-xl p-3 border border-amber-400/30">
                    <div className="text-[10px] text-gray-400 mb-1">
                      Bet of the Day
                    </div>
                    <div className="text-xl font-bold text-amber-400">
                      {dailyData.summary.hasBetOfTheDay ? "🏆" : "None"}
                    </div>
                  </div>
                </div>

                {/* Leagues Scanned */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <h3 className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">
                    Tours Scanned
                  </h3>
                  <div className="space-y-2">
                    <div className="flex flex-col gap-0.5">
                      <div
                        className={`flex items-center justify-between text-xs ${dailyData.leagueStats.atp.hasGames ? "text-blue-300" : "text-gray-600"}`}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${dailyData.leagueStats.atp.hasGames ? "bg-blue-400" : "bg-gray-700"}`}
                          ></span>
                          ATP (Men)
                        </span>
                        <span className="font-mono">
                          {dailyData.leagueStats.atp.gamesFound}
                        </span>
                      </div>
                      {!dailyData.leagueStats.atp.hasGames && (
                        <div className="text-[9px] text-purple-400/60 ml-4 italic">
                          No match found
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <div
                        className={`flex items-center justify-between text-xs ${dailyData.leagueStats.wta.hasGames ? "text-blue-300" : "text-gray-600"}`}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${dailyData.leagueStats.wta.hasGames ? "bg-blue-400" : "bg-gray-700"}`}
                          ></span>
                          WTA (Women)
                        </span>
                        <span className="font-mono">
                          {dailyData.leagueStats.wta.gamesFound}
                        </span>
                      </div>
                      {!dailyData.leagueStats.wta.hasGames && (
                        <div className="text-[9px] text-purple-400/60 ml-4 italic">
                          No match found
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Results History Button */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <a
                    href="/history"
                    className="block w-full bg-gradient-to-r from-blue-500/10 to-indigo-500/10 hover:from-blue-500/20 hover:to-indigo-500/20 border border-blue-500/20 hover:border-blue-500/30 rounded-xl p-3 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">⚡</span>
                        <div>
                          <div className="text-sm font-bold text-blue-300 group-hover:text-blue-200">
                            Our Results History
                          </div>
                          <div className="text-[10px] text-gray-500">
                            Track our performance
                          </div>
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-blue-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </a>
                </div>
              </div>
            </aside>

            {/* Main Content Area */}
            <div className="space-y-4">
              {/* Bet of the Day - Compact Version */}
              {dailyData.betOfTheDay && (
                <BetOfTheDayHero bet={dailyData.betOfTheDay} />
              )}

              {/* Other Value Bets */}
              {otherBets.length > 0 && <ValueBetsList bets={otherBets} />}

              {/* Empty State - No Bets Today */}
              {dailyData.summary.valueBetsFound === 0 && (
                <div className="text-center py-20">
                  <div className="text-6xl mb-4">🎯</div>
                  <h3 className="text-2xl font-bold text-white mb-3">
                    No Value Bets Today
                  </h3>
                  <p className="text-gray-400 max-w-md mx-auto text-sm">
                    Our AI analyzed{" "}
                    <span className="text-blue-400 font-bold">
                      {dailyData.summary.totalGamesAnalyzed}
                    </span>{" "}
                    games but none met our{" "}
                    <span className="text-green-400 font-bold">
                      {dailyData.metadata.minEVThreshold}% EV
                    </span>{" "}
                    threshold.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer - Compact */}
      <footer className="border-t border-white/10 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center">
          <p className="text-gray-500 text-[10px]">
            Powered by TennTrend AI • Updated Daily at 8:00 AM CET
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
