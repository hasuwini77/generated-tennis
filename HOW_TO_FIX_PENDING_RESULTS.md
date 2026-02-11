# 🎾 How to Update Results for Feb 9-10 Matches

## ⚠️ THE ISSUE

**The Odds API doesn't keep historical tennis scores**. Matches from Feb 9-10 are no longer in the system, so the automatic update can't find them.

## ✅ THE FIX

### Step 1: Look Up Match Results

Go to one of these sites and find the actual results:
- https://www.wtatennis.com/scores
- https://www.flashscore.com/tennis/  
- https://www.sofascore.com/tennis

For each match, note:
- **Winner**: Who won the match
- **Score**: Final score (e.g., "6-4, 7-5")

### Step 2: Edit the Manual Entry Script

Open `scripts/manual-results-entry.js` and find the `MANUAL_RESULTS` section (around line 29).

Update it with the ACTUAL results you found:

```javascript
const MANUAL_RESULTS = [
  {
    homeTeam: 'Daria Kasatkina',
    awayTeam: 'Elise Mertens',
    winner: 'Elise Mertens',  // <- Change to actual winner
    score: '6-3, 6-2',         // <- Change to actual score
  },
  // ... update all 5 matches
];
```

### Step 3: Run the Script

```bash
node scripts/manual-results-entry.js
```

This will:
- ✅ Update all 5 pending matches from Feb 9-10
- ✅ Calculate win/loss for each bet
- ✅ Update ROI
- ✅ Recalculate stats
- ✅ Save to results-history.json

### Step 4: Commit & Push

```bash
git add public/data/results-history.json
git commit -m "chore: manually update results for Feb 9-10 matches"
git push
```

---

## 🔧 LONG-TERM FIX APPLIED

I've updated the workflow to run **every 2 hours** (instead of twice daily) so it catches matches while they're still in The Odds API.

New schedule:
```
6 AM, 8 AM, 10 AM, 12 PM, 2 PM, 4 PM, 6 PM, 8 PM, 10 PM, 12 AM CET
```

This ensures we catch match results before The Odds API purges them!

---

## 📋 PENDING MATCHES TO UPDATE

1. **Daria Kasatkina vs Elise Mertens** (Feb 10)
2. **Elisabetta Cocciaretto vs Coco Gauff** (Feb 10)
3. **Janice Tjen vs Beatriz Haddad Maia** (Feb 9)
4. **Alexandra Eala vs Tereza Valentova** (Feb 9)
5. **Magdalena Frech vs Ann Li** (Feb 10)

Look these up, update the script, run it, and you're done! 🎉

---

## 🚀 FUTURE

Going forward, the system will automatically update results every 2 hours, so this manual process won't be needed again!
