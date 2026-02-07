# API Documentation - PuckTrend

## Overview

This document outlines all external APIs used in PuckTrend and their legal usage terms.

---

## 🏒 The-Odds-API (Primary Data Source)

**Purpose**: Fetch real-time betting odds and implied probabilities for NHL hockey games

**Website**: https://the-odds-api.com/  
**Documentation**: https://the-odds-api.com/liveapi/guides/v4/

### Legal Status
- ✅ **100% Legal** - Official public API with clear Terms of Service
- ✅ **Free for Personal Use** - Free tier available
- ✅ **No Scraping** - Legitimate REST API with authentication
- ✅ **Commercial ToS Compliant** - Our personal use falls within acceptable use

### Free Tier Limits
- **500 requests per month**
- **No rate limiting** beyond monthly quota
- **Resets monthly** on the day you signed up
- **Our Usage**: 1-2 requests/day = ~30-60/month (well within limit)

### Getting Your API Key

1. Go to https://the-odds-api.com/
2. Click "Get API Key" or "Sign Up"
3. Create a free account with your email
4. Verify your email address
5. Copy your API key from the dashboard
6. Add to `.env.local` file:
   ```
   THE_ODDS_API_KEY=your_api_key_here
   ```

### API Endpoints We Use

#### 1. Get NHL Odds
```
GET https://api.the-odds-api.com/v4/sports/icehockey_nhl/odds

Query Parameters:
- apiKey: YOUR_API_KEY (required)
- regions: us (US bookmakers)
- markets: h2h (head-to-head winner market)
- oddsFormat: decimal (e.g., 1.37, 2.50)
- dateFormat: iso (ISO 8601 timestamps)

Response: Array of games with odds from multiple bookmakers
```

### Data Structure

**Response Example:**
```json
{
  "id": "abc123",
  "sport_key": "icehockey_nhl",
  "sport_title": "NHL",
  "commence_time": "2026-02-05T19:00:00Z",
  "home_team": "Boston Bruins",
  "away_team": "Toronto Maple Leafs",
  "bookmakers": [
    {
      "key": "draftkings",
      "title": "DraftKings",
      "markets": [
        {
          "key": "h2h",
          "outcomes": [
            {
              "name": "Boston Bruins",
              "price": 1.37  // Market Odds
            },
            {
              "name": "Toronto Maple Leafs",
              "price": 3.20
            }
          ]
        }
      ]
    },
    {
      "key": "fanduel",
      "title": "FanDuel",
      "markets": [
        {
          "key": "h2h",
          "outcomes": [
            {
              "name": "Boston Bruins",
              "price": 1.20  // Different odds = discrepancy!
            },
            {
              "name": "Toronto Maple Leafs",
              "price": 3.50
            }
          ]
        }
      ]
    }
  ]
}
```

### How We Calculate Delta (Value)

1. **Market Odds** (from one bookmaker, e.g., DraftKings): `1.37`
2. **Market Probability**: `100 / 1.37 = 73%`
3. **Actual Odds** (from another bookmaker, e.g., FanDuel): `1.20`
4. **Actual Probability**: `100 / 1.20 = 83%`
5. **Delta**: `83% - 73% = 10%` ← **VALUE FOUND!**

When different bookmakers have different odds, it indicates market inefficiency - this is where value exists.

### Rate Limit Strategy

**Monthly Allowance**: 500 requests  
**Daily Usage**: 3 requests (NHL + SHL + Allsvenskan)
**Monthly Usage**: ~90 requests
**Safety Buffer**: 410 requests remaining for testing/errors

**Smart Caching**:
- Cache API response in localStorage for 24 hours
- Only fetch new data once per day (or on manual refresh)
- Track requests in localStorage counter
- Alert user when approaching 80% of quota (400 requests)
- All 3 leagues fetched in parallel (faster, efficient)

**Request Counter Logic**:
```typescript
{
  count: 45,           // Total requests this month
  limit: 500,          // Monthly limit
  resetDate: "2026-03-05",  // When quota resets
  lastFetch: "2026-02-05T13:00:00Z"  // Last API call
}
```

### Swedish Hockey Support

**Status**: ✅ ACTIVE - Real data from The-Odds-API

**Supported Leagues:**
1. **SHL** (`icehockey_sweden_hockey_league`)
   - Swedish top-tier professional league
   - 14 teams, September - April season
   - European bookmakers (Betsson, Unibet, Bet365)

2. **Allsvenskan** (`icehockey_sweden_allsvenskan`)
   - Swedish second-tier league
   - 14 teams, September - March season
   - Fewer bookmakers but still covered

**Data Quality:**
- Same quality as NHL odds
- European bookmakers provide odds
- Real-time during season
- Off-season shows empty state

**Current Scope**: NHL + SHL + Allsvenskan all active!

---

## 🤖 Google Gemini API

**Purpose**: AI analysis of match data to generate scouting reports

**Free Tier**: 1,500 requests per day (Flash model)  
**Our Usage**: 1 request per day  
**Cost**: $0.00

### Model Used
- **Model**: `gemini-3-flash-preview`
- **Temperature**: 0.5 (balanced creativity/consistency)
- **System Instruction**: Ice hockey analytics expert

### API Key Setup
Already configured in `.env.local`:
```
GEMINI_API_KEY=your_gemini_key_here
```

---

## 💬 Discord Webhooks

**Purpose**: Auto-send high-value game alerts to personal Discord server

**Rate Limits**: None for personal use (reasonable = <5 messages/day)  
**Cost**: Free forever

### Smart Auto-Notifications

PuckTrend automatically sends Discord alerts when high-value games are detected:

- **Trigger**: Games with delta ≥ 8% (configurable)
- **Limit**: Maximum 5 alerts per day
- **Format**: Rich embedded messages with game details
- **Timing**: Sent automatically when data is fetched

### Setting Up Discord Webhook

1. Open your Discord server
2. Go to Server Settings → Integrations → Webhooks
3. Click "New Webhook"
4. Name it "PuckTrend Scout" (or similar)
5. Choose the channel (e.g., #general)
6. Copy the Webhook URL
7. Add to `.env.local`:
   ```
   VITE_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
   ```

### Configuration

**Environment Variables:**
```env
# Required: Your Discord webhook URL
VITE_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# Optional: Minimum delta to trigger alerts (default: 8)
VITE_DISCORD_MIN_DELTA=8
```

**How It Works:**
1. App fetches NHL odds from The-Odds-API
2. Filters games with delta ≥ threshold (e.g., 8%)
3. Takes top 5 high-value games
4. Sends each as a rich Discord embed automatically
5. No manual action needed!

**Alert Message Format:**
```
🚨 HIGH VALUE ALERT 🚨

🏒 Match: Vegas Golden Knights vs LA Kings
📊 Delta: +10%
💰 Market Odds: 1.76
📈 Actual Probability: 60%
⏰ Game Time: 19:00
🎯 League: NHL

💡 Analysis: Market underpricing detected! The actual win 
probability (60%) is significantly higher than market odds 
suggest (50%). This represents a 10% value edge.
```

**Security Note**: Webhook URLs are stored in `.env.local` only (never committed to git).

---

## Legal Compliance Summary

| API | Legal Status | Cost | Rate Limit | Our Usage | Risk Level |
|-----|-------------|------|-----------|-----------|-----------|
| The-Odds-API | ✅ Official API | Free | 500/month | 30-60/month | 🟢 Zero |
| Google Gemini | ✅ Official API | Free | 1,500/day | 1/day | 🟢 Zero |
| Discord Webhooks | ✅ Official Feature | Free | Unlimited* | 1-2/day | 🟢 Zero |

*Reasonable use policy applies

---

## Attribution & Disclaimers

### Data Attribution
- Betting odds data provided by The-Odds-API
- AI analysis powered by Google Gemini
- NHL team names and schedules are publicly available data

### Disclaimers
1. **Personal Use Only** - This app is for educational and entertainment purposes
2. **No Gambling Affiliation** - We do not facilitate or encourage betting
3. **Data Accuracy** - Odds are delayed and for informational purposes only
4. **No Warranty** - Use at your own risk; no guarantees of accuracy
5. **Compliance** - Users must comply with local gambling laws

### Terms of Service Compliance
- We respect all API rate limits
- We cache data to minimize requests
- We attribute data sources appropriately
- We do not resell or redistribute API data
- Personal use only (non-commercial)

---

## Monitoring API Usage

### Daily Checklist
- [ ] Check The-Odds-API quota (Dashboard: https://the-odds-api.com/account/)
- [ ] Verify cache is working (should only fetch 1x/day)
- [ ] Monitor Discord webhook delivery
- [ ] Check for API errors in console

### Warning Signs
- ⚠️ More than 2 API calls per day (cache may be broken)
- ⚠️ Approaching 400/500 requests (80% quota used)
- ⚠️ API returning 401 errors (invalid key)
- ⚠️ API returning 429 errors (quota exceeded)

### Emergency Actions
If quota exceeded:
1. App will continue to work with cached data
2. Manually refresh will be disabled until quota resets
3. User will see clear message about quota reset date
4. No functionality is lost (last cached data still displays)

---

## Future Enhancements

### Potential APIs to Add (When Legal Source Found)
- [ ] SHL (Swedish Hockey League) odds
- [ ] Allsvenskan (Swedish second tier) odds
- [ ] Live scores integration (optional)

### API Wishlist
- Official SHL API (if/when available)
- European bookmaker APIs with Swedish hockey coverage
- NHL Stats API (for additional team statistics)

---

**Last Updated**: 2026-02-05  
**Version**: 1.0.0
