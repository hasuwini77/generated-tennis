import React, { useState, useEffect } from 'react';
import { cn } from '../utils/classNames';

interface Result {
  id: string;
  date: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  recommendedBet?: string;
  recommendedOdds: number;
  expectedValue: number;
  aiConfidence: string;
  finalScore: { homeScore: number; awayScore: number } | null;
  outcome: 'WIN' | 'LOSS' | 'PENDING' | 'PUSH';
  actualReturn: number;
  settled: boolean;
}

interface HistoryData {
  lastUpdated: string;
  totalBets: number;
  wins: number;
  losses: number;
  pending: number;
  winRate: number;
  totalROI: number;
  results: Result[];
}

const ResultsHistory: React.FC = () => {
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'wins' | 'losses' | 'pending'>('all');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch('/data/results-history.json');
      const data = await response.json();
      setHistory(data);
    } catch (error) {
      console.error('Failed to load results history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f172a] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-400 border-t-transparent mb-4"></div>
          <p className="text-gray-400">Loading history...</p>
        </div>
      </div>
    );
  }

  if (!history) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f172a] flex items-center justify-center">
        <p className="text-gray-400">Failed to load history</p>
      </div>
    );
  }

  const filteredResults = history.results.filter(result => {
    if (filter === 'wins') return result.outcome === 'WIN';
    if (filter === 'losses') return result.outcome === 'LOSS';
    if (filter === 'pending') return result.outcome === 'PENDING';
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f172a]">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#1a1a2e]/95 to-[#16213e]/95 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">⚡ Results History</h1>
              <p className="text-sm text-gray-400">Track our Bet of the Day performance</p>
            </div>
            <a
              href="/"
              className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-300 text-sm font-semibold transition-colors"
            >
              ← Back to Picks
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-xs text-gray-500 mb-1">Total Bets</div>
            <div className="text-3xl font-bold text-white">{history.totalBets}</div>
          </div>
          
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-xs text-gray-500 mb-1">Wins</div>
            <div className="text-3xl font-bold text-white">{history.wins}</div>
          </div>
          
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-xs text-gray-500 mb-1">Losses</div>
            <div className="text-3xl font-bold text-white">{history.losses}</div>
          </div>
          
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-xs text-gray-500 mb-1">Win Rate</div>
            <div className="text-3xl font-bold text-white">{history.winRate.toFixed(1)}%</div>
          </div>
          
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-xs text-gray-500 mb-1">Total ROI</div>
            <div className={cn(
              "text-3xl font-bold",
              history.totalROI > 0 ? "text-green-400" : history.totalROI < 0 ? "text-red-400" : "text-white"
            )}>
              {history.totalROI > 0 ? '+' : ''}{history.totalROI.toFixed(2)}u
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold transition-colors",
              filter === 'all'
                ? "bg-white/10 border border-white/20 text-white"
                : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10"
            )}
          >
            All ({history.results.length})
          </button>
          <button
            onClick={() => setFilter('wins')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold transition-colors",
              filter === 'wins'
                ? "bg-white/10 border border-white/20 text-white"
                : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10"
            )}
          >
            Wins ({history.wins})
          </button>
          <button
            onClick={() => setFilter('losses')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold transition-colors",
              filter === 'losses'
                ? "bg-white/10 border border-white/20 text-white"
                : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10"
            )}
          >
            Losses ({history.losses})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold transition-colors",
              filter === 'pending'
                ? "bg-white/10 border border-white/20 text-white"
                : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10"
            )}
          >
            Pending ({history.pending})
          </button>
        </div>

        {/* Results List */}
        {filteredResults.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⚡</div>
            <h3 className="text-2xl font-bold text-gray-400 mb-2">No Results Yet</h3>
            <p className="text-gray-500">Check back after games are settled!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredResults.map((result) => (
              <div
                key={result.id}
                className={cn(
                  "bg-white/5 rounded-lg p-3 border transition-all",
                  result.outcome === 'WIN' && "border-green-500/40",
                  result.outcome === 'LOSS' && "border-red-500/40",
                  result.outcome === 'PENDING' && "border-white/10",
                  result.outcome === 'PUSH' && "border-white/10"
                )}
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  {/* Game Info */}
                  <div className="flex-1 min-w-[250px]">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-white/10 text-gray-300">
                        {result.league}
                      </span>
                      <span className="text-[11px] text-gray-500">{result.date}</span>
                    </div>
                    <div className="text-white font-semibold text-sm">
                      {result.awayTeam} @ {result.homeTeam}
                    </div>
                    {result.finalScore && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        Final: {result.finalScore.awayScore} - {result.finalScore.homeScore}
                      </div>
                    )}
                  </div>

                  {/* Bet Details */}
                  <div className="text-center">
                    <div className="text-[10px] text-gray-500 mb-0.5">Odds</div>
                    <div className="text-base font-bold text-white">{result.recommendedOdds.toFixed(2)}</div>
                  </div>

                  <div className="text-center">
                    <div className="text-[10px] text-gray-500 mb-0.5">EV</div>
                    <div className="text-base font-bold text-white">+{result.expectedValue.toFixed(1)}%</div>
                  </div>

                  {/* Outcome */}
                  <div className="text-center min-w-[90px]">
                    <div className={cn(
                      "px-3 py-1.5 rounded-lg font-bold text-sm",
                      result.outcome === 'WIN' && "bg-green-500/20 text-green-400",
                      result.outcome === 'LOSS' && "bg-red-500/20 text-red-400",
                      result.outcome === 'PENDING' && "bg-amber-500/20 text-amber-400",
                      result.outcome === 'PUSH' && "bg-gray-500/20 text-gray-400"
                    )}>
                      {result.outcome === 'WIN' && '✅ WIN'}
                      {result.outcome === 'LOSS' && '❌ LOSS'}
                      {result.outcome === 'PENDING' && '⏳ PENDING'}
                      {result.outcome === 'PUSH' && '➖ PUSH'}
                    </div>
                    {result.settled && (
                      <div className={cn(
                        "text-xs font-semibold mt-0.5",
                        result.actualReturn > 0 ? "text-green-400" : "text-red-400"
                      )}>
                        {result.actualReturn > 0 ? '+' : ''}{result.actualReturn.toFixed(2)}u
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ResultsHistory;
