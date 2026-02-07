# Match Card UI - Clear Pick Identification

## Problem Solved

**Before:** Users couldn't easily tell which team to bet on
- ❌ Both teams displayed equally
- ❌ Unclear which team the odds/probabilities referred to
- ❌ Had to mentally interpret "Market Odds" vs "Actual Prob"
- ❌ No indication if it included overtime

**After:** Instantly obvious which team is the value pick
- ✅ Green highlighted card for the recommended team
- ✅ "VALUE PICK" badge that pulses
- ✅ All key data (odds, win %, edge) on one line
- ✅ Market type clearly labeled (incl. OT)
- ✅ Away team dimmed as reference only

---

## How to Read the Card

### Value Pick Example

```
┌─────────────────────────────────────────────────────┐
│ [SHL]  19:00 Today    Match Winner (incl. OT)       │
├─────────────────────────────────────────────────────┤
│ ╔═══════════════════════════════════════════════╗   │
│ ║ ✅ Malmö Redhawks  [VALUE PICK]               ║   │
│ ║ HOME                                           ║   │
│ ║                    Odds: 3.08  Win%: 52%  +20%║   │
│ ╚═══════════════════════════════════════════════╝   │
│                                                     │
│ ┌───────────────────────────────────────────────┐   │
│ │ Rögle BK                    (Not analyzed)    │   │
│ │ AWAY                                          │   │
│ └───────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**How to interpret:**
1. **Green card** = This is the pick!
2. **"VALUE PICK" badge** = Market undervalues this team
3. **Odds: 3.08** = Bookmaker odds for Malmö to win
4. **Win%: 52%** = Actual calculated probability (higher than market suggests)
5. **+20%** = The edge/value (delta between actual and market probability)
6. **Away team dimmed** = Not the analyzed bet (for context only)

---

## Visual Hierarchy

### High Value Pick (Delta > 0)

**Home Team Box:**
- Background: Green gradient (`from-green-500/10 to-emerald-500/5`)
- Border: 2px green (`border-green-500/30`)
- Text: Green (`text-green-400`)
- Badge: Pulsing "VALUE PICK" in bright green
- Metrics displayed: Odds, Win %, Edge

**Away Team Box:**
- Background: Dark transparent (`bg-slate-800/20`)
- Border: Thin slate (`border-slate-700/30`)
- Text: Muted gray (`text-slate-400`)
- Label: "(Not analyzed)"

### No Value (Delta ≤ 0)

**Home Team Box:**
- Background: Neutral (`bg-slate-800/30`)
- Border: Standard slate (`border-slate-700/50`)
- Text: Standard white (`text-slate-200`)
- No badge

**Away Team Box:**
- Same muted appearance

**Footer Message:**
```
┌───────────────────────────────────────┐
│ No value detected • Delta: -2%        │
└───────────────────────────────────────┘
```

---

## Data Explained

### Always Analyzing the HOME Team

**Important:** Our system **always analyzes the HOME team's chances**

- The odds displayed = bookmaker odds for the **home team to win**
- Win % = calculated probability for the **home team to win**
- Edge = how much the market underestimates the **home team**

**Why home team?**
- Consistent analysis (always same reference point)
- Home ice advantage is significant in hockey
- Bookmakers often underestimate home favorites

**If you want to bet on away team:**
- Wait for a game where they are the home team
- Or use the Scout Report AI for away team analysis

---

## Market Type

### "Match Winner (incl. OT)"

This refers to the **h2h (head-to-head)** market:

**Includes:**
- ✅ Regulation time (60 minutes)
- ✅ Overtime (if needed)
- ✅ Shootout (if needed)

**Result:** Final winner of the game, regardless of how they win

**Not included:**
- ❌ Puck line / handicap
- ❌ Total goals over/under
- ❌ Regulation time only

**Example:**
- Game goes to shootout
- Malmö wins in shootout
- **Bet wins!** (Because final result is Malmö victory)

---

## Color Coding

### League Badges

| League | Color | Emoji |
|--------|-------|-------|
| **NHL** | Red | 🇺🇸 |
| **SHL** | Yellow | 🇸🇪 |
| **Allsvenskan** | Blue | 🇸🇪 |

### Value Indicators

| Delta | Badge | Color | Meaning |
|-------|-------|-------|---------|
| **≥ 10%** | VALUE PICK | Bright Green | Strong value |
| **1-9%** | VALUE PICK | Green | Moderate value |
| **≤ 0%** | None | Gray | No value |

### Animation

**VALUE PICK badge:** Pulsing animation (`animate-pulse`)
- Draws attention to high-value picks
- Makes them stand out in the list

---

## Reading Strategy

### Quick Scan (5 seconds)

1. Look for **green cards** (value picks)
2. Check the **delta** (+20% = huge, +5% = small)
3. Note the **league badge** (NHL/SHL/Allsvenskan)
4. Check **time** (when does it start?)

### Detailed Analysis (30 seconds)

1. Read the **team names** (do you know these teams?)
2. Check **win percentage** (52% = slight favorite, 80% = heavy favorite)
3. Look at **odds** (3.08 = underdog, 1.50 = favorite)
4. Consider the **delta** (is the edge worth the risk?)
5. Check the **Scout Report** for AI reasoning

---

## Examples

### Example 1: Strong Value Pick

```
SHL | 19:00 Today | Match Winner (incl. OT)

┌────────────────────────────────────────────┐
│ ✅ Växjö Lakers  [VALUE PICK]              │
│ HOME                                       │
│ Odds: 2.10  Win%: 62%  +15%                │
└────────────────────────────────────────────┘

Frölunda HC (Not analyzed)
```

**Interpretation:**
- **Pick:** Växjö Lakers at home
- **Odds:** 2.10 (risk $100 to win $110)
- **Win %:** 62% (better than fair coin flip)
- **Edge:** +15% (market says 48%, model says 62%)
- **Verdict:** Strong value, high confidence

---

### Example 2: Small Edge

```
NHL | 01:10 Today | Match Winner (incl. OT)

┌────────────────────────────────────────────┐
│ ✅ Tampa Bay Lightning  [VALUE PICK]       │
│ HOME                                       │
│ Odds: 1.53  Win%: 67%  +2%                 │
└────────────────────────────────────────────┘

Florida Panthers (Not analyzed)
```

**Interpretation:**
- **Pick:** Tampa Bay at home
- **Odds:** 1.53 (heavy favorite)
- **Win %:** 67% (strong probability)
- **Edge:** Only +2% (small edge)
- **Verdict:** High probability but low value. Good for parlays.

---

### Example 3: No Value

```
NHL | 04:10 Today | Match Winner (incl. OT)

┌────────────────────────────────────────────┐
│ Vegas Golden Knights                       │
│ HOME                                       │
│ Odds: 1.45  Win%: 68%  -1%                 │
└────────────────────────────────────────────┘

Los Angeles Kings (Not analyzed)

┌────────────────────────────────────────────┐
│ No value detected • Delta: -1%             │
└────────────────────────────────────────────┘
```

**Interpretation:**
- **Pick:** None (no value)
- **Edge:** -1% (market is fairly priced or overpriced)
- **Verdict:** Skip this game

---

## Mobile Responsive

### Desktop View
- Full layout with all metrics inline
- Green gradient clearly visible
- Badge prominently displayed

### Mobile View  
- Stacked layout (metrics stack vertically)
- Badge still prominent
- Touch-friendly spacing

---

## Accessibility

- **High contrast:** Green on dark background
- **Clear hierarchy:** Pick vs reference
- **Large fonts:** Easy to read at a glance
- **No color-only info:** Badge text + color
- **Clear labels:** "VALUE PICK", "Not analyzed"

---

## Future Enhancements

Potential improvements:

- [ ] Show bookmaker name (which bookie has 3.08?)
- [ ] Add team logos
- [ ] Show recent form (W-L record)
- [ ] Display head-to-head history
- [ ] Add "confidence score" (1-10)
- [ ] Show how many bookmakers agree
- [ ] Add tooltip with odds explanation

---

**Version:** 1.3.0 (Swedish Hockey Support)  
**Last Updated:** 2026-02-05  
**Status:** ✅ Live in production
