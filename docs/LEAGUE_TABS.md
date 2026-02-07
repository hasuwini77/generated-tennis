# League Tabs Feature - Documentation

## Overview

Added a **tabbed interface** to filter hockey games by league (NHL / SHL / Allsvenskan), allowing users to focus on specific competitions.

---

## Features

### 🏒 Three League Tabs

1. **NHL** 🇺🇸 - North American hockey (currently active)
2. **SHL** 🇸🇪 - Swedish Hockey League (top tier)
3. **Allsvenskan** 🇸🇪 - Swedish second tier

### Visual Design

- **Active tab**: Blue background with white text and shadow
- **Inactive tabs**: Transparent with hover effect
- **Game counts**: Badge showing number of games per league
- **Flags**: Country emojis for quick visual identification
- **Responsive**: Adapts to mobile screens

---

## How It Works

### Tab Switching
```
User clicks SHL tab
     ↓
activeLeague state updates to 'SHL'
     ↓
Matches filtered to show only SHL games
     ↓
Chart updates with SHL game data
     ↓
Game count updates in sidebar
```

### Filtering Logic
```typescript
const filteredMatches = matches.filter(m => m.league === activeLeague);
```

### Game Counts
```typescript
const gameCounts = {
  NHL: matches.filter(m => m.league === 'NHL').length,
  SHL: matches.filter(m => m.league === 'SHL').length,
  Allsvenskan: matches.filter(m => m.league === 'Allsvenskan').length
};
```

---

## Component Structure

### LeagueTabs Component

**Props:**
```typescript
interface LeagueTabsProps {
  activeLeague: League;              // Currently selected league
  onLeagueChange: (league: League) => void;  // Callback when tab clicked
  gameCounts: {                      // Number of games per league
    NHL: number;
    SHL: number;
    Allsvenskan: number;
  };
}
```

**Rendering:**
- Maps over tabs array
- Shows active state styling
- Displays game count badge
- Handles click events

---

## Empty States

When a league has no games:

```
┌─────────────────────────────────┐
│                                 │
│           🏒                    │
│                                 │
│   No SHL Games Today            │
│                                 │
│   SHL data will be available    │
│   when we find a legal API.     │
│                                 │
└─────────────────────────────────┘
```

**Messages:**
- **NHL** (no games): "Check back during NHL season"
- **SHL/Allsvenskan** (no API): "Data will be available when we find a legal API source"

---

## Data Sources

### Current Status

| League | API Source | Status | Notes |
|--------|-----------|--------|-------|
| NHL | The-Odds-API | ✅ Active | Real odds data |
| SHL | TBD | ⏳ Pending | Researching legal sources |
| Allsvenskan | TBD | ⏳ Pending | Researching legal sources |

### Future Implementation

**For SHL/Allsvenskan:**
1. Research Swedish bookmakers with public APIs
2. Check if The-Odds-API adds European leagues
3. Look for official SHL/Allsvenskan APIs
4. Consider manual entry option as fallback

**Requirements:**
- ✅ Must be 100% legal
- ✅ Must be free (or very cheap)
- ✅ Must provide odds data
- ✅ Must respect rate limits

---

## UI/UX Details

### Tab Bar Design
```
┌──────────────────────────────────────────────┐
│  [🇺🇸 NHL (7)] [🇸🇪 SHL (0)] [🇸🇪 Allsvenskan (0)]  │
└──────────────────────────────────────────────┘
```

**Active tab (NHL):**
- Blue background (`bg-blue-600`)
- White text
- Shadow effect
- Game count in white badge

**Inactive tabs:**
- Transparent background
- Gray text (`text-slate-400`)
- Hover effect (lighter text + subtle bg)
- Game count in dark badge

### Mobile Responsive

On small screens:
- Tabs remain horizontal
- Font sizes adjust
- Padding reduces
- Scrollable if needed

---

## Integration with App.tsx

### State Management
```typescript
const [activeLeague, setActiveLeague] = useState<League>('NHL');
```

### Filtering
```typescript
const filteredMatches = matches.filter(m => m.league === activeLeague);
```

### Chart Update
```typescript
const chartData = filteredMatches.slice(0, 10).map(m => ({
  name: m.homeTeam.split(' ')[0],
  delta: m.delta
}));
```

### Game Count Display
```typescript
<div className="text-sm font-black text-slate-200">
  {filteredMatches.length} {activeLeague}
</div>
```

---

## User Experience

### Quick Switching
- Click any tab to instantly filter games
- No page reload required
- Chart and stats update automatically

### Visual Feedback
- Active tab clearly highlighted
- Game counts show data availability
- Empty states explain why no games shown

### Accessibility
- Semantic button elements
- Clear hover states
- Keyboard navigation support
- Screen reader friendly

---

## Performance

### Optimization
- Filtering happens in memory (instant)
- No API calls when switching tabs
- Minimal re-renders
- Efficient game count calculation

### Bundle Size
- LeagueTabs component: ~2KB minified
- No additional dependencies
- Uses existing Tailwind classes

---

## Future Enhancements

Potential improvements:

- [ ] Add "All Leagues" tab (show everything)
- [ ] League-specific filters (date, team, odds range)
- [ ] Save last selected tab in localStorage
- [ ] Keyboard shortcuts (1=NHL, 2=SHL, 3=Allsvenskan)
- [ ] Tab reordering based on preference
- [ ] Expandable tab info (league description, season info)
- [ ] Tab badges for high-value games per league

---

## Swedish Hockey Research

### SHL (Svenska Hockeyligan)
**What**: Swedish top-tier professional league  
**Teams**: 14 teams (Frölunda, Färjestad, etc.)  
**Season**: September - April + playoffs  
**Betting**: Popular in Sweden

**Potential APIs:**
- Swedish Riksidrottsförbundet (if public)
- European bookmakers (Betsson, Unibet)
- SHL.se official site (check for API)

### Allsvenskan Hockey
**What**: Swedish second-tier league  
**Teams**: 14 teams  
**Season**: Similar to SHL  
**Betting**: Available but less popular

**Data Challenges:**
- Fewer bookmakers offer odds
- May need manual aggregation
- Lower priority than NHL/SHL

---

## Testing Checklist

- [x] Tabs render correctly
- [x] Active tab highlights properly
- [x] Tab switching works
- [x] Filtered matches display correctly
- [x] Game counts accurate
- [x] Empty states show when no games
- [x] Chart updates with filtered data
- [x] Mobile responsive
- [x] Build successful
- [ ] User tested

---

## Code Changes

### Files Modified:
1. `App.tsx` - Added tab state, filtering, integration
2. `components/LeagueTabs.tsx` - New component

### Lines Added:
- LeagueTabs component: 65 lines
- App.tsx updates: ~30 lines
- Total: ~95 lines

---

**Version**: 1.2.0 (League Tabs)  
**Status**: ✅ Ready for testing  
**Implemented**: 2026-02-05
