import React, { useState } from 'react';
import { Match } from '../types';
import { formatPercentage, formatOdds, formatProbability, formatConfidence } from '../utils/formatters';
import { cn } from '../utils/classNames';

interface ValueBetsListProps {
  bets: Match[];
}

const ValueBetsList: React.FC<ValueBetsListProps> = ({ bets }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (bets.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-2xl font-bold text-gray-400 mb-2">No Value Bets Today</h3>
        <p className="text-gray-500">Check back tomorrow for more opportunities!</p>
      </div>
    );
  }

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const tierColors = {
    STRONG: 'from-blue-500 to-blue-600',
    ELITE: 'from-blue-600 to-indigo-600',
    SICK: 'from-red-500 to-red-600',
  };

  const tierBorderColors = {
    STRONG: 'border-blue-500/30 hover:border-blue-500/50',
    ELITE: 'border-indigo-500/30 hover:border-indigo-500/50',
    SICK: 'border-red-500/30 hover:border-red-500/50',
  };

  const tierBgColors = {
    STRONG: 'bg-blue-500/10',
    ELITE: 'bg-indigo-500/10',
    SICK: 'bg-red-500/10',
  };

  return (
    <div className="space-y-3">
      <div className="text-center mb-4">
        <h2 className="text-lg font-bold text-blue-400 inline-block">
          Other Value Bets
        </h2>
      </div>

      {bets.map((bet) => {
        const isExpanded = expandedId === bet.id;
        const borderColor = bet.evTier ? tierBorderColors[bet.evTier.tier] : 'border-gray-700/50 hover:border-gray-600/50';
        const gradientClass = bet.evTier ? tierColors[bet.evTier.tier] : 'from-gray-500 to-gray-600';
        const bgClass = bet.evTier ? tierBgColors[bet.evTier.tier] : 'bg-gray-500/10';

        return (
          <div
            key={bet.id}
            className={cn(
              'bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-xl border transition-all duration-300 cursor-pointer shadow-md hover:shadow-lg',
              borderColor,
              isExpanded ? 'ring-1 ring-blue-500/20' : ''
            )}
            onClick={() => toggleExpand(bet.id)}
          >
            {/* Collapsed View */}
            <div className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-blue-500/20 text-blue-300">
                      {bet.league}
                    </span>
                    <span className="text-xs text-gray-400">{bet.startTimeFormatted || bet.startTime}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg font-bold text-white">{bet.homeTeam}</span>
                    <span className="text-gray-500 text-xs">vs</span>
                    <span className="text-lg font-bold text-gray-400">{bet.awayTeam}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-[9px] text-gray-400 mb-0.5">Odds</div>
                    <div className="text-xl font-bold text-blue-400">
                      {formatOdds(bet.marketOdd)}
                    </div>
                  </div>

                  {bet.evTier && (
                    <div className={`px-4 py-1.5 rounded-lg bg-gradient-to-r ${gradientClass} font-bold text-white text-sm shadow-md flex items-center gap-1.5`}>
                      <span className="text-base">{bet.evTier.emoji}</span>
                      <span>{formatPercentage(bet.expectedValue || 0)}</span>
                    </div>
                  )}

                  <div className="text-gray-400 transition-transform duration-300 text-sm" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                    ▶
                  </div>
                </div>
              </div>

              {!isExpanded && (
                <div className="mt-2 flex items-center gap-3 text-xs">
                  <span className="text-gray-400">
                    AI: <span className="text-blue-400 font-semibold">{formatProbability(bet.aiProbability || 0)}</span>
                  </span>
                  <span className="text-gray-600">•</span>
                  <span className="text-gray-400">
                    Confidence: <span className="text-purple-400 font-semibold">{formatConfidence(bet.confidence || 'medium')}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Expanded View */}
            {isExpanded && (
              <div className="border-t border-white/10 p-4 animate-fadeIn">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                  <div className={`${bgClass} backdrop-blur-sm rounded-lg p-2 border border-blue-500/20`}>
                    <div className="text-[9px] text-gray-400 mb-1">🤖 AI</div>
                    <div className="text-lg font-bold text-blue-400">
                      {formatProbability(bet.aiProbability || 0)}
                    </div>
                  </div>

                  <div className="bg-gray-500/10 backdrop-blur-sm rounded-lg p-2 border border-gray-500/20">
                    <div className="text-[9px] text-gray-400 mb-1">⚡ Market</div>
                    <div className="text-lg font-bold text-gray-300">
                      {formatProbability(bet.marketProb || 0)}
                    </div>
                  </div>

                  <div className="bg-green-500/10 backdrop-blur-sm rounded-lg p-2 border border-green-500/20">
                    <div className="text-[9px] text-gray-400 mb-1">⚡ EV</div>
                    <div className="text-lg font-bold text-green-400">
                      {formatPercentage(bet.expectedValue || 0)}
                    </div>
                  </div>

                  <div className="bg-purple-500/10 backdrop-blur-sm rounded-lg p-2 border border-purple-500/20">
                    <div className="text-[9px] text-gray-400 mb-1">🎲 Conf</div>
                    <div className="text-base font-bold text-purple-400 uppercase">
                      {(bet.confidence || 'medium').slice(0, 3)}
                    </div>
                  </div>
                </div>

                {bet.reasoning && (
                  <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/5 backdrop-blur-sm rounded-lg p-3 border border-amber-500/20">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-sm">💡</span>
                      <h4 className="text-xs font-bold text-amber-400">Analysis</h4>
                    </div>
                    <p className="text-gray-300 text-xs leading-relaxed">
                      {bet.reasoning}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ValueBetsList;
