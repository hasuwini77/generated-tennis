# API Fallback System Documentation

## Overview

TennTrend now features an **intelligent multi-provider fallback system** that automatically switches between different tennis data APIs when quotas are exceeded or primary sources fail.

## How It Works

### Provider Priority Chain

1. **The-Odds-API** (Primary)
   - Full odds data with bookmaker comparisons
   - Highest quality data for betting analysis
   - Free tier: 500 requests/month

2. **Tennis-API-ATP-WTA-ITF** (Fallback #1)
   - RapidAPI provider
   - Fixture data for ATP/WTA/ITF tournaments
   - No odds data, but maintains match listings

3. **LiveScore6** (Fallback #2)
   - RapidAPI provider
   - Live match data across all tennis
   - Last resort for match schedules

### Automatic Fallback Trigger

The system automatically activates fallback when:
- HTTP 429 (Rate Limit Exceeded)
- HTTP 402 (Payment Required - Quota Exceeded)
- API errors or timeouts

```
┌─────────────────────────┐
│   The-Odds-API          │
│   (Primary)             │
└───────────┬─────────────┘
            │
            ▼ Quota Exceeded?
┌─────────────────────────┐
│   Tennis-API            │
│   (RapidAPI Fallback)   │
└───────────┬─────────────┘
            │
            ▼ Failed?
┌─────────────────────────┐
│   LiveScore6            │
│   (Last Resort)         │
└─────────────────────────┘
```

## What's Been Updated

### Files Modified

1. **`services/apiProvider.ts`** (NEW)
   - Multi-provider service with automatic fallback
   - Unified interface for all providers
   - Smart error handling and retry logic

2. **`scripts/daily-scan.js`** (UPDATED)
   - Integrated fallback logic into existing workflow
   - Maintains exact same output format
   - Zero breaking changes to downstream consumers

3. **`scripts/fetch-scores-tennis.js`** (UPDATED)
   - Added fallback for results checking
   - Handles quota exceeded gracefully

4. **`scripts/daily-scan-with-fallback.js`** (NEW)
   - Standalone example of fallback system
   - Simplified demonstration version

## Usage

### No Code Changes Required!

The fallback system works **automatically** with your existing workflow:

```javascript
// Your existing code still works the same way
import { fetchNHLOdds } from './services/oddsService';

const matches = await fetchNHLOdds();
// ↑ Now automatically tries fallback APIs if primary fails!
```

### New Advanced Usage (Optional)

If you want more control:

```typescript
import { fetchTennisMatchesWithFallback, APIProvider } from './services/apiProvider';

const result = await fetchTennisMatchesWithFallback({
  atp: ['tennis_atp'],
  wta: ['tennis_wta']
});

console.log(`Fetched ${result.matches.length} matches`);
console.log(`Provider used: ${result.provider}`);
// Provider used: TENNIS_API (if primary failed)
```

## Data Quality by Provider

### The-Odds-API (Best)
✅ Real odds from multiple bookmakers  
✅ Accurate probability calculations  
✅ Value bet detection  
✅ Full tournament coverage  

### Tennis-API (Good)
✅ Match fixtures and schedules  
✅ Tournament information  
⚠️ Default odds (2.0) - no real bookmaker data  
⚠️ EV calculations unavailable  

### LiveScore6 (Basic)
✅ Match schedules  
✅ Live match status  
⚠️ Default odds (2.0)  
⚠️ Limited tournament metadata  

## Important Notes

### API Keys Required

All required API keys are already configured:

```env
# Primary API (Your Key)
VITE_THE_ODDS_API_KEY=your_key_here

# Fallback APIs (Already Configured)
RAPIDAPI_KEY=bccefb9e3cmsh6275b4d52bc7d3fp18858cjsn571965f8e30e
```

### Quota Management

- **The-Odds-API**: Your personal quota (typically 500/month free)
- **RapidAPI**: Shared key with generous free tier
- System intelligently caches to minimize API calls

### What Happens When Primary Quota Runs Out

1. ✅ **App continues working** - Uses fallback APIs
2. ✅ **Match data still loads** - From alternative sources
3. ⚠️ **Odds data becomes generic** - Fixed at 2.0
4. ⚠️ **AI analysis still works** - Uses player knowledge

### When Primary Quota Resets

The system automatically switches back to primary API when:
- Monthly quota resets (typically 1st of month)
- You upgrade your plan
- Manual cache clear triggers fresh fetch

## Testing the Fallback

### Simulate Quota Exceeded

```javascript
// In daily-scan.js, temporarily modify:
if (response.status === 429 || response.status === 402) {
  // This will trigger fallback
}

// Change to:
if (true) { // Force fallback for testing
  throw new Error("QUOTA_EXCEEDED");
}
```

### Check Logs

When fallback activates, you'll see:

```
⚠️  [ATP] QUOTA EXCEEDED - Activating fallback...

🔄 SWITCHING TO FALLBACK APIS...

🔄 [Fallback] Trying Tennis-API (RapidAPI)...
✅ [Tennis-API] 15 fixtures received
✅ Using Tennis-API fallback (15 matches)
```

## Benefits

### ✅ **Zero Downtime**
App continues working even when primary API fails

### ✅ **Seamless UX**
Users never see "API quota exceeded" errors

### ✅ **Cost Effective**
Free fallback APIs keep your app running without extra cost

### ✅ **Future Proof**
Easy to add more providers to the chain

### ✅ **Backward Compatible**
Existing code works without modifications

## Monitoring

### Check Which Provider Was Used

The daily-picks.json now includes provider metadata:

```json
{
  "timestamp": "2026-02-16T08:00:00.000Z",
  "provider": "Tennis-API (RapidAPI)",
  "matches": [...],
  "summary": {
    "apiProvider": "Tennis-API (RapidAPI)"
  }
}
```

### Console Output

Always shows which provider succeeded:

```
✅ Successfully fetched 12 matches
📊 Provider used: Tennis-API (RapidAPI)
```

## Troubleshooting

### All APIs Failing

If you see:
```
❌ All API providers failed
```

**Possible causes:**
1. Network connectivity issue
2. All API keys invalid/expired
3. All providers down (very rare)

**Solution:**
- Check internet connection
- Verify API keys in `.env.local`
- Check provider status pages

### Fallback Returning No Matches

If fallback APIs return empty arrays:
- May be no matches scheduled for next 24 hours
- Tournament dates may not align
- Try expanding date range in fallback functions

## Future Enhancements

Potential improvements:

1. **Add More Providers**
   - SofaScore API
   - Ultimate Tennis Stats
   - ATP/WTA Official APIs

2. **Smart Provider Selection**
   - Choose provider based on tournament type
   - Route Grand Slams to premium provider

3. **Hybrid Mode**
   - Use primary for odds
   - Use fallback for additional match data

4. **Quota Prediction**
   - Estimate when quota will run out
   - Proactively switch before hitting limit

## Support

For questions or issues:
1. Check console logs for provider used
2. Verify API keys are configured
3. Test each provider individually
4. Check provider status pages

---

**Last Updated:** February 16, 2026  
**Version:** 2.0 (with Multi-Provider Fallback)
