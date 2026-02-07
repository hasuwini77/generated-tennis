
import React from 'react';
import { Match } from '../types';

interface MatchCardProps {
  match: Match;
}

const MatchCard: React.FC<MatchCardProps> = ({ match }) => {
  const isHighValue = match.delta >= 10;

  return (
    <div className={`bg-slate-900 rounded-xl border ${isHighValue ? 'border-blue-500/50 shadow-lg shadow-blue-500/5' : 'border-slate-800'} p-5 transition-all hover:scale-[1.01]`}>
      <div className="flex flex-col gap-4">
        {/* Header: League + Time + Market Type */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
              match.league === 'NHL' ? 'bg-red-900/30 text-red-400' :
              match.league === 'SHL' ? 'bg-yellow-900/30 text-yellow-400' :
              'bg-blue-900/30 text-blue-400'
            }`}>
              {match.league}
            </span>
            <span className="text-xs text-slate-500">{match.startTime} Today</span>
          </div>
          <span className="text-[9px] text-slate-600 font-medium uppercase tracking-wide">
            Match Winner (incl. OT)
          </span>
        </div>

        {/* Teams Section */}
        <div className="flex flex-col gap-2">
          {/* HOME TEAM - The Pick */}
          <div className={`flex items-center justify-between p-3 rounded-lg transition-all ${
            match.delta > 0 
              ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/5 border-2 border-green-500/30' 
              : 'bg-slate-800/30 border border-slate-700/50'
          }`}>
            <div className="flex items-center gap-3 flex-1">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${match.delta > 0 ? 'text-green-400' : 'text-slate-200'}`}>
                    {match.homeTeam}
                  </span>
                  {match.delta > 0 && (
                    <span className="bg-green-500 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider animate-pulse">
                      VALUE PICK
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 font-medium">HOME</span>
              </div>
            </div>
            
            {/* Odds Display for Home Team */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-[10px] text-slate-500 font-medium mb-0.5">Odds</div>
                <div className={`mono text-xl font-black ${match.delta > 0 ? 'text-green-400' : 'text-slate-300'}`}>
                  {match.marketOdd.toFixed(2)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-500 font-medium mb-0.5">Win %</div>
                <div className={`mono text-xl font-black ${match.delta > 0 ? 'text-green-400' : 'text-slate-300'}`}>
                  {match.actualProb}%
                </div>
              </div>
              {match.delta > 0 && (
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 font-medium mb-0.5">Edge</div>
                  <div className="mono text-xl font-black text-green-400">
                    +{match.delta}%
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AWAY TEAM - For Reference */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/20 border border-slate-700/30">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="text-lg font-bold text-slate-400">{match.awayTeam}</span>
                <span className="text-[10px] text-slate-600 font-medium">AWAY</span>
              </div>
            </div>
            <div className="text-xs text-slate-600">
              (Not analyzed)
            </div>
          </div>
        </div>

        {/* Delta Badge (if negative or neutral) */}
        {match.delta <= 0 && (
          <div className="flex items-center justify-center p-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <span className="text-[10px] text-slate-500 font-medium">
              No value detected • Delta: {match.delta > 0 ? '+' : ''}{match.delta}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchCard;
