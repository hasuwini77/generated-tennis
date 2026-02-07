import React from 'react';

type League = 'NHL' | 'SHL' | 'Allsvenskan';

interface LeagueTabsProps {
  activeLeague: League;
  onLeagueChange: (league: League) => void;
  gameCounts: {
    NHL: number;
    SHL: number;
    Allsvenskan: number;
  };
}

const LeagueTabs: React.FC<LeagueTabsProps> = ({ activeLeague, onLeagueChange, gameCounts }) => {
  const tabs: { league: League; label: string; flag: string }[] = [
    { league: 'NHL', label: 'NHL', flag: '🇺🇸' },
    { league: 'SHL', label: 'SHL', flag: '🇸🇪' },
    { league: 'Allsvenskan', label: 'Allsvenskan', flag: '🇸🇪' }
  ];

  return (
    <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-6">
      <div className="flex-1">
        <h2 className="font-black text-lg uppercase italic tracking-wider text-slate-200">
          The Ice Feed
        </h2>
      </div>
      
      <div className="flex gap-2 bg-slate-900/50 p-1.5 rounded-xl border border-slate-700/50">
        {tabs.map(({ league, label, flag }) => {
          const isActive = activeLeague === league;
          const count = gameCounts[league];
          
          return (
            <button
              key={league}
              onClick={() => onLeagueChange(league)}
              className={`
                relative px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-all
                ${isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                  : 'bg-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{flag}</span>
                <span>{label}</span>
                {count > 0 && (
                  <span className={`
                    px-1.5 py-0.5 rounded-full text-[9px] font-black
                    ${isActive 
                      ? 'bg-white/20 text-white' 
                      : 'bg-slate-700 text-slate-300'
                    }
                  `}>
                    {count}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LeagueTabs;
