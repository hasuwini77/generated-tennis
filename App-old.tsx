
import React, { useState, useEffect, useCallback } from 'react';
import { Match } from './types';
import { simulateDailyFetch, analyzeHockeyPicks, sendToDiscord } from './services/geminiService';
import { getApiUsage, getQuotaUsagePercent, clearOddsCache } from './services/oddsService';
import MatchCard from './components/MatchCard';
import ScoutReportArticle from './components/ScoutReportArticle';
import LeagueTabs from './components/LeagueTabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

type League = 'NHL' | 'SHL' | 'Allsvenskan';

const App: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [aiSummary, setAiSummary] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [apiUsage, setApiUsage] = useState(getApiUsage());
  const [activeLeague, setActiveLeague] = useState<League>('NHL');

  // Save settings to localStorage whenever they change
  useEffect(() => {
    // Removed Discord config localStorage - now using .env.local
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setAiSummary("");
    setError("");
    try {
      const data = await simulateDailyFetch();
      setMatches(data);
      setApiUsage(getApiUsage()); // Update usage stats
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    const summary = await analyzeHockeyPicks(matches);
    setAiSummary(summary);
    setAnalyzing(false);
  };

  const handlePushToDiscord = async () => {
    const webhookUrl = import.meta.env.VITE_DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
      alert("Discord webhook not configured. Add VITE_DISCORD_WEBHOOK_URL to .env.local");
      return;
    }
    setIsSending(true);
    const success = await sendToDiscord(webhookUrl, aiSummary);
    if (success) {
      alert("✅ Scout Report pushed to Discord!");
    } else {
      alert("❌ Failed to push. Check your Webhook URL or Internet connection.");
    }
    setIsSending(false);
  };

  const handleCopyReport = () => {
    navigator.clipboard.writeText(aiSummary);
    alert("Copied to clipboard!");
  };

  const handleClearCache = () => {
    if (confirm("Clear cached odds data and force fresh fetch?")) {
      clearOddsCache();
      fetchData();
    }
  };

  const quotaPercent = getQuotaUsagePercent();
  const quotaColor = quotaPercent > 80 ? 'text-red-500' : quotaPercent > 50 ? 'text-yellow-500' : 'text-green-500';

  // Filter matches by active league
  const filteredMatches = matches.filter(m => m.league === activeLeague);
  
  // Calculate game counts per league
  const gameCounts = {
    NHL: matches.filter(m => m.league === 'NHL').length,
    SHL: matches.filter(m => m.league === 'SHL').length,
    Allsvenskan: matches.filter(m => m.league === 'Allsvenskan').length
  };

  const chartData = filteredMatches.slice(0, 10).map(m => ({
    name: m.homeTeam.split(' ')[0],
    delta: m.delta
  }));

  return (
    <div className="min-h-screen pb-20 selection:bg-blue-500/30">
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight uppercase italic">Puck<span className="text-blue-500">Trend</span></h1>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Live Market Scanner</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchData}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 transition-all rounded-xl text-xs font-bold border border-slate-700 active:scale-95"
            >
              REFRESH DATA
            </button>
            <button 
              onClick={handleRunAnalysis}
              disabled={analyzing || loading}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-all rounded-xl text-xs font-black shadow-xl shadow-blue-900/40 active:scale-95 flex items-center gap-2"
            >
              {analyzing ? "SCOUTING..." : "RUN AI SCOUT"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          
          <section className="bg-slate-900 rounded-2xl border border-slate-800 p-6 overflow-hidden relative">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-6">Market Discrepancies (Δ%)</h2>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: '#1e293b'}}
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Bar dataKey="delta" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.delta > 10 ? '#3b82f6' : '#1e293b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {aiSummary && (
            <ScoutReportArticle 
              content={aiSummary}
              onCopy={handleCopyReport}
              onPushToDiscord={handlePushToDiscord}
              isSending={isSending}
            />
          )}

          <div className="space-y-4">
            <LeagueTabs 
              activeLeague={activeLeague}
              onLeagueChange={setActiveLeague}
              gameCounts={gameCounts}
            />
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <span className="text-red-500 text-xl">⚠️</span>
                  <div>
                    <h3 className="text-sm font-bold text-red-400 mb-1">Error</h3>
                    <p className="text-xs text-red-300">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            {loading ? (
              <div className="grid gap-4">
                {[1,2,3].map(i => <div key={i} className="h-28 bg-slate-900 animate-pulse rounded-2xl border border-slate-800" />)}
              </div>
            ) : filteredMatches.length === 0 ? (
              <div className="bg-slate-900/50 rounded-2xl border border-slate-700/50 p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
                    <span className="text-3xl">🏒</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-300 mb-2">No {activeLeague} Games Today</h3>
                    <p className="text-sm text-slate-500">
                      {activeLeague === 'NHL' 
                        ? 'Check back during the NHL season for live odds.'
                        : `${activeLeague} data will be available when we find a legal API source.`
                      }
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredMatches.map(match => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <section className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Discord Alerts</h3>
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${import.meta.env.VITE_DISCORD_WEBHOOK_URL ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'}`}>
                {import.meta.env.VITE_DISCORD_WEBHOOK_URL ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <p className="text-[11px] font-medium text-slate-300 leading-relaxed">
                  {import.meta.env.VITE_DISCORD_WEBHOOK_URL 
                    ? `🚨 Auto-alerts enabled! You'll get notified when games with Δ ≥ ${import.meta.env.VITE_DISCORD_MIN_DELTA || 8}% are detected.`
                    : '⚠️ Discord alerts disabled. Add VITE_DISCORD_WEBHOOK_URL to .env.local to enable.'}
                </p>
              </div>
              <div className="text-[9px] text-slate-500 space-y-1">
                <p>• Max 5 alerts per day</p>
                <p>• Only high-value games sent</p>
                <p>• 100% free (no rate limits)</p>
              </div>
            </div>
          </section>

          <section className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">API Usage</h3>
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${quotaPercent > 80 ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
                {quotaPercent}% USED
              </span>
            </div>
            <div className="space-y-4">
              <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] font-medium text-slate-400">The-Odds-API</span>
                  <span className={`text-sm font-black ${quotaColor}`}>{apiUsage.count} / {apiUsage.limit}</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${quotaPercent > 80 ? 'bg-red-500' : quotaPercent > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${quotaPercent}%` }}
                  />
                </div>
                <p className="text-[9px] text-slate-500 mt-2">
                  Resets: {new Date(apiUsage.resetDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </section>

          <section className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Safety Status</h3>
              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-green-500/10 text-green-500 border border-green-500/20">ACTIVE</span>
            </div>
            <div className="space-y-4">
              <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <p className="text-[11px] font-medium text-slate-300 leading-relaxed">
                  Using <span className="text-blue-400">The-Odds-API</span> for legal, real-time odds data. Cached for 24h to minimize API calls.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-700/30 text-center">
                  <div className="text-[9px] text-slate-500 font-bold uppercase mb-1">Last Fetch</div>
                  <div className="text-sm font-black text-slate-200">
                    {apiUsage.lastFetch ? new Date(apiUsage.lastFetch).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                  </div>
                </div>
                <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-700/30 text-center">
                  <div className="text-[9px] text-slate-500 font-bold uppercase mb-1">Games Today</div>
                  <div className="text-sm font-black text-slate-200">{filteredMatches.length} {activeLeague}</div>
                </div>
              </div>
            </div>
          </section>

          <div className="bg-blue-600/10 rounded-2xl border border-blue-500/20 p-5 text-center">
            <p className="text-[10px] leading-relaxed text-blue-300 font-bold uppercase italic">
              "Delta shows market inefficiency - where different bookmakers disagree = value opportunity."
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
