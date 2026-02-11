import React, { useState, useEffect } from 'react';
import { cn } from '../utils/classNames';

interface Bet {
  id: string;
  date: string;
  matchTime: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  outcome: string; // Player name we bet on
  odds: number;
  expectedValue: number;
  confidence: string;
  reasoning: string;
  status: 'pending' | 'win' | 'loss';
  result: string | null;
  roi: number | null;
  addedAt: string;
}

interface HistoryData {
  bets: Bet[];
  safeBets?: Bet[];
  stats: {
    totalBets: number;
    wins: number;
    losses: number;
    pending: number;
    totalROI: number;
    winRate?: number;
  };
  safeBetStats?: {
    totalBets: number;
    wins: number;
    losses: number;
    pending: number;
    totalROI: number;
    winRate?: number;
  };
}

const ResultsHistory: React.FC = () => {
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'win' | 'loss' | 'pending'>('all');
  const [betType, setBetType] = useState<'value' | 'safe' | 'combined'>('value');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch('/data/results-history.json');
      const data = await response.json();
      
      // Ensure safeBetStats exists with default values
      if (!data.safeBetStats) {
        data.safeBetStats = {
          totalBets: 0,
          wins: 0,
          losses: 0,
          pending: 0,
          totalROI: 0,
          winRate: 0
        };
      }
      
      // Calculate win rate if not present (for value bets)
      if (!data.stats.winRate && data.stats.totalBets > 0) {
        const settled = data.stats.wins + data.stats.losses;
        data.stats.winRate = settled > 0 ? (data.stats.wins / settled) * 100 : 0;
      }
      
      // Calculate win rate if not present (for safe bets)
      if (!data.safeBetStats.winRate && data.safeBetStats.totalBets > 0) {
        const settled = data.safeBetStats.wins + data.safeBetStats.losses;
        data.safeBetStats.winRate = settled > 0 ? (data.safeBetStats.wins / settled) * 100 : 0;
      }
      
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

  // Get all bets based on bet type
  const getAllBets = () => {
    if (betType === 'combined') {
      return [...history.bets, ...(history.safeBets || [])];
    }
    return betType === 'value' ? history.bets : (history.safeBets || []);
  };
  
  const filteredBets = getAllBets().filter(bet => {
    if (filter === 'win') return bet.status === 'win';
    if (filter === 'loss') return bet.status === 'loss';
    if (filter === 'pending') return bet.status === 'pending';
    return true;
  });
  
  // Calculate combined stats if needed
  const getCombinedStats = () => {
    const allBets = [...history.bets, ...(history.safeBets || [])];
    const wins = allBets.filter(b => b.status === 'win').length;
    const losses = allBets.filter(b => b.status === 'loss').length;
    const pending = allBets.filter(b => b.status === 'pending').length;
    const settled = wins + losses;
    const totalROI = allBets.reduce((sum, b) => sum + (b.roi || 0), 0);
    
    return {
      totalBets: allBets.length,
      wins,
      losses,
      pending,
      totalROI: parseFloat(totalROI.toFixed(2)),
      winRate: settled > 0 ? parseFloat(((wins / settled) * 100).toFixed(1)) : 0
    };
  };
  
  const currentStats = betType === 'combined' 
    ? getCombinedStats()
    : betType === 'value' 
      ? history.stats 
      : (history.safeBetStats || {
          totalBets: 0,
          wins: 0,
          losses: 0,
          pending: 0,
          totalROI: 0,
          winRate: 0
        });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f172a]">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#1a1a2e]/95 to-[#16213e]/95 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">📊 Bet History</h1>
              <p className="text-sm text-gray-400">Track all our value bet predictions & results</p>
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
        {/* Bet Type Toggle */}
        <div className="flex gap-2 justify-center mb-6 flex-wrap">
          <button
            onClick={() => setBetType('value')}
            className={cn(
              "px-6 py-3 rounded-xl font-semibold transition-all",
              betType === 'value'
                ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
            )}
          >
            💎 Value Bets ({history.stats.totalBets})
          </button>
          <button
            onClick={() => setBetType('safe')}
            className={cn(
              "px-6 py-3 rounded-xl font-semibold transition-all",
              betType === 'safe'
                ? "bg-green-500 text-white shadow-lg shadow-green-500/30"
                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
            )}
          >
            🛡️ Safe Bets ({(history.safeBetStats?.totalBets || 0)})
          </button>
          <button
            onClick={() => setBetType('combined')}
            className={cn(
              "px-6 py-3 rounded-xl font-semibold transition-all",
              betType === 'combined'
                ? "bg-purple-500 text-white shadow-lg shadow-purple-500/30"
                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
            )}
          >
            🎯 All Bets ({history.stats.totalBets + (history.safeBetStats?.totalBets || 0)})
          </button>
        </div>
        
        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-xs text-gray-500 mb-1">Total Bets</div>
            <div className="text-3xl font-bold text-white">{currentStats.totalBets}</div>
          </div>
          
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-xs text-gray-500 mb-1">Wins</div>
            <div className="text-3xl font-bold text-green-400">{currentStats.wins}</div>
          </div>
          
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-xs text-gray-500 mb-1">Losses</div>
            <div className="text-3xl font-bold text-red-400">{currentStats.losses}</div>
          </div>
          
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-xs text-gray-500 mb-1">Win Rate</div>
            <div className="text-3xl font-bold text-white">
              {currentStats.winRate !== undefined ? currentStats.winRate.toFixed(1) : '0.0'}%
            </div>
          </div>
          
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-xs text-gray-500 mb-1">Total ROI</div>
            <div className={cn(
              "text-3xl font-bold",
              currentStats.totalROI > 0 ? "text-green-400" : currentStats.totalROI < 0 ? "text-red-400" : "text-white"
            )}>
              {currentStats.totalROI > 0 ? '+' : ''}{currentStats.totalROI.toFixed(2)}u
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
            All ({getAllBets().length})
          </button>
          <button
            onClick={() => setFilter('win')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold transition-colors",
              filter === 'win'
                ? "bg-white/10 border border-white/20 text-white"
                : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10"
            )}
          >
            Wins ({currentStats.wins})
          </button>
          <button
            onClick={() => setFilter('loss')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold transition-colors",
              filter === 'loss'
                ? "bg-white/10 border border-white/20 text-white"
                : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10"
            )}
          >
            Losses ({currentStats.losses})
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
            Pending ({currentStats.pending})
          </button>
        </div>

        {/* Results List */}
        {filteredBets.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎾</div>
            <h3 className="text-2xl font-bold text-gray-400 mb-2">No Bets Yet</h3>
            <p className="text-gray-500">
              {filter === 'all' ? 'Check back after the daily scan runs!' : `No ${filter} bets to show.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBets.map((bet) => (
              <div
                key={bet.id}
                className={cn(
                  "bg-white/5 rounded-xl p-4 border transition-all hover:bg-white/[0.07]",
                  bet.status === 'win' && "border-green-500/40",
                  bet.status === 'loss' && "border-red-500/40",
                  bet.status === 'pending' && "border-amber-500/20"
                )}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  {/* Game Info */}
                  <div className="flex-1 min-w-[280px]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/20 text-blue-300">
                        {bet.league}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(bet.matchTime).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-semibold uppercase",
                        bet.confidence === 'high' && "bg-green-500/20 text-green-400",
                        bet.confidence === 'medium' && "bg-amber-500/20 text-amber-400",
                        bet.confidence === 'low' && "bg-gray-500/20 text-gray-400"
                      )}>
                        {bet.confidence}
                      </span>
                    </div>
                    
                    <div className="text-white font-semibold mb-1">
                      {bet.homeTeam} <span className="text-gray-500">vs</span> {bet.awayTeam}
                    </div>
                    
                    <div className="text-sm text-blue-300 mb-2">
                      ✨ Bet on: <span className="font-semibold">{bet.outcome}</span>
                    </div>
                    
                    <div className="text-xs text-gray-400 leading-relaxed">
                      {bet.reasoning}
                    </div>
                    
                    {bet.result && (
                      <div className="mt-2 text-xs text-gray-500 italic">
                        Result: {bet.result}
                      </div>
                    )}
                  </div>

                  {/* Stats & Outcome */}
                  <div className="flex gap-4 items-center">
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">Odds</div>
                      <div className="text-lg font-bold text-white">{bet.odds.toFixed(2)}</div>
                    </div>

                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">{bet.expectedValue ? 'EV' : 'Prob'}</div>
                      <div className="text-lg font-bold text-blue-400">
                        {bet.expectedValue ? `+${bet.expectedValue.toFixed(1)}%` : `${bet.aiProbability}%`}
                      </div>
                    </div>

                    {/* Outcome Badge */}
                    <div className="text-center min-w-[100px]">
                      <div className={cn(
                        "px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap",
                        bet.status === 'win' && "bg-green-500/20 text-green-400 border border-green-500/40",
                        bet.status === 'loss' && "bg-red-500/20 text-red-400 border border-red-500/40",
                        bet.status === 'pending' && "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                      )}>
                        {bet.status === 'win' && '✅ WIN'}
                        {bet.status === 'loss' && '❌ LOSS'}
                        {bet.status === 'pending' && '⏳ PENDING'}
                      </div>
                      {bet.roi !== null && (
                        <div className={cn(
                          "text-sm font-semibold mt-1",
                          bet.roi > 0 ? "text-green-400" : "text-red-400"
                        )}>
                          {bet.roi > 0 ? '+' : ''}{bet.roi.toFixed(2)}u
                        </div>
                      )}
                    </div>
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
