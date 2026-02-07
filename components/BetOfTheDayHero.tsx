import React from 'react';
import { Match } from '../types';
import { formatPercentage, formatOdds, formatProbability, formatConfidence } from '../utils/formatters';

interface BetOfTheDayHeroProps {
  bet: Match;
}

const BetOfTheDayHero: React.FC<BetOfTheDayHeroProps> = ({ bet }) => {
  const tierColors = {
    STRONG: 'from-blue-500 to-blue-600',
    ELITE: 'from-blue-600 to-indigo-600',
    SICK: 'from-red-500 to-red-600',
  };

  const tierBgColors = {
    STRONG: 'bg-blue-500/10',
    ELITE: 'bg-indigo-500/10',
    SICK: 'bg-red-500/10',
  };

  const gradientClass = bet.evTier ? tierColors[bet.evTier.tier] : 'from-gray-500 to-gray-600';
  const bgClass = bet.evTier ? tierBgColors[bet.evTier.tier] : 'bg-gray-500/10';

  return (
    <div className="relative">
      {/* Subtle Golden Accent Border */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-400/20 via-yellow-500/30 to-amber-400/20 rounded-2xl blur-sm"></div>
      
      <div className="relative bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-2xl overflow-hidden shadow-xl">
        {/* Decorative gradient overlay */}
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-gradient-to-br from-amber-500/5 to-transparent rounded-full blur-2xl"></div>
        
        <div className="relative p-5">
          {/* Compact Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏆</span>
              <h2 className="text-xl font-bold bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">
                Bet of the Day
              </h2>
            </div>
            
            {/* League & Time */}
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-1 rounded-lg font-semibold bg-blue-500/20 text-blue-300">
                {bet.league}
              </span>
              <span className="text-gray-400">{bet.startTimeFormatted || bet.startTime}</span>
            </div>
          </div>

          {/* Teams & Odds - Single Row */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center mb-4">
            <div className="text-right">
              <h3 className="text-xl md:text-2xl font-bold text-white truncate">{bet.homeTeam}</h3>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10">
              <div className="text-center">
                <div className="text-[9px] text-gray-400 mb-0.5">Odds</div>
                <div className="text-3xl font-bold text-blue-400">
                  {formatOdds(bet.marketOdd)}
                </div>
              </div>
            </div>
            
            <div className="text-left">
              <h3 className="text-xl md:text-2xl font-bold text-gray-400 truncate">{bet.awayTeam}</h3>
            </div>
          </div>

          {/* EV Tier Badge */}
          {bet.evTier && (
            <div className="flex justify-center mb-4">
              <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r ${gradientClass} font-bold text-white text-sm shadow-lg`}>
                <span className="text-lg">{bet.evTier.emoji}</span>
                <span>{bet.evTier.label}</span>
                <span className="opacity-50">|</span>
                <span>{formatPercentage(bet.expectedValue || 0)} EV</span>
              </div>
            </div>
          )}

          {/* AI Analysis Cards - Compact Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <div className={`${bgClass} backdrop-blur-sm rounded-xl p-3 border border-blue-500/20`}>
              <div className="text-[9px] text-gray-400 mb-1">🤖 AI Prob</div>
              <div className="text-xl font-bold text-blue-400">
                {formatProbability(bet.aiProbability || 0)}
              </div>
            </div>

            <div className="bg-gray-500/10 backdrop-blur-sm rounded-xl p-3 border border-gray-500/20">
              <div className="text-[9px] text-gray-400 mb-1">⚡ Market</div>
              <div className="text-xl font-bold text-gray-300">
                {formatProbability(bet.marketProb || 0)}
              </div>
            </div>

            <div className="bg-green-500/10 backdrop-blur-sm rounded-xl p-3 border border-green-500/20">
              <div className="text-[9px] text-gray-400 mb-1">⚡ EV</div>
              <div className="text-xl font-bold text-green-400">
                {formatPercentage(bet.expectedValue || 0)}
              </div>
            </div>

            <div className="bg-purple-500/10 backdrop-blur-sm rounded-xl p-3 border border-purple-500/20">
              <div className="text-[9px] text-gray-400 mb-1">🎲 Conf</div>
              <div className="text-lg font-bold text-purple-400 uppercase">
                {(bet.confidence || 'medium').slice(0, 3)}
              </div>
            </div>
          </div>

          {/* AI Reasoning - Compact */}
          {bet.reasoning && (
            <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/5 backdrop-blur-sm rounded-xl p-4 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">💡</span>
                <h4 className="text-sm font-bold text-amber-400">Analysis</h4>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                {bet.reasoning}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BetOfTheDayHero;
