# PuckTrend Daily Scan Script

## Overview

The `daily-scan.js` script is the backend automation for PuckTrend. It runs once per day at 8:00 AM CET via GitHub Actions.

## What It Does

1. **Fetches Odds** from The-Odds-API for three leagues:
   - **NHL**: Games in the next 24-36 hours (European betting window)
   - **SHL**: Only today's games in Swedish time (CET)
   - **Allsvenskan**: Only today's games in Swedish time (CET)

2. **Smart Date/Timezone Logic**:
   - NHL games happen at night in North America → Europeans need to see "tonight's" games
   - Swedish leagues play during European hours → strict same-day only
   - Handles CET/CEST (daylight saving time) automatically

3. **AI Analysis** with Gemini:
   - Analyzes all games in one batch API call
   - Calculates Expected Value (EV) for each bet
   - Provides reasoning and confidence levels

4. **Filters for Value**:
   - Only shows bets with **≥15% Expected Value**
   - Some days may have zero bets (quality over quantity)

5. **Selects "Bet of the Day"**:
   - Highest scoring bet (EV + confidence)
   - Golden frame featured pick

6. **Saves Results** to `data/daily-picks.json`

7. **Sends Discord Notification**:
   - Once per day at 8 AM CET
   - Shows "Bet of the Day" or "No strong bets today"

## Local Testing

```bash
# Install dependencies
npm install

# Set environment variables in .env.local
THE_ODDS_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
DISCORD_WEBHOOK_URL=your_webhook_url  # Optional

# Run the script
npm run scan
```

## Required Secrets (GitHub Actions)

Set these in your GitHub repository settings → Secrets and variables → Actions:

1. `THE_ODDS_API_KEY` - Your The-Odds-API key
2. `GEMINI_API_KEY` - Your Google Gemini API key
3. `DISCORD_WEBHOOK_URL` - Your Discord webhook URL (optional)

## API Usage

- **The-Odds-API**: ~1-3 calls per day (only leagues with games)
- **Gemini AI**: 1 batch call per day (all games analyzed together)
- **Total**: ~2-4 API calls per day (vs 100+ in old system)

## Output Schema

See `data/daily-picks.json` for the full schema. Key fields:

```json
{
  "timestamp": "ISO 8601 timestamp",
  "scanDateCET": "Date in Swedish time",
  "leagueStats": {
    "nhl": { "hasGames": true, "gamesFound": 5 },
    "shl": { "hasGames": false, "gamesFound": 0 }
  },
  "betOfTheDay": { ... } or null,
  "featuredBets": [...],
  "allBets": [...]
}
```

## Timezone Details

- **Scan Time**: 8:00 AM CET (Europe/Stockholm)
- **NHL Window**: Next 24-36 hours from scan time
- **SHL/Allsvenskan**: Same day in CET only

## Troubleshooting

**No games found?**
- Check if leagues are in-season (NHL: Oct-June, SHL/Allsvenskan: Sep-Mar)
- Verify API keys are correct
- Check The-Odds-API quota (500 requests/month on free tier)

**AI analysis failed?**
- Check Gemini API key
- Check Gemini API quota (free tier limits)
- Script will continue without AI enrichment if it fails

**Discord not sending?**
- Verify webhook URL is correct
- Check webhook permissions in Discord server
- Some days have no bets (intentional - only ≥15% EV)
