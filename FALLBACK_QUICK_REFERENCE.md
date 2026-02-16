# API Fallback System - Quick Reference

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER REQUESTS MATCH DATA                      │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────────┐
         │   Try The-Odds-API         │
         │   (Primary Provider)       │
         └────────┬───────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
   ✅ SUCCESS          ❌ QUOTA EXCEEDED
   (429/402)
        │                   │
        │                   ▼
        │      ┌────────────────────────────┐
        │      │   Try Tennis-API           │
        │      │   (RapidAPI Fallback)      │
        │      └────────┬───────────────────┘
        │               │
        │     ┌─────────┴─────────┐
        │     │                   │
        │     ▼                   ▼
        │  ✅ SUCCESS        ❌ FAILED
        │     │                   │
        │     │                   ▼
        │     │      ┌────────────────────────────┐
        │     │      │   Try LiveScore6           │
        │     │      │   (Last Resort)            │
        │     │      └────────┬───────────────────┘
        │     │               │
        │     │     ┌─────────┴─────────┐
        │     │     │                   │
        │     │     ▼                   ▼
        │     │  ✅ SUCCESS        ❌ FAILED
        │     │     │                   │
        └─────┴─────┴───────────────────┘
                    │
                    ▼
         ┌────────────────────────────┐
         │   RETURN MATCHES TO USER   │
         └────────────────────────────┘
```

## Quick Command Reference

### Test Fallback System
```bash
node scripts/test-fallback.js
```

### Run Daily Scan (with automatic fallback)
```bash
node scripts/daily-scan.js
```

### Check Fallback in Action
Look for these log messages:
```
⚠️  [ATP] QUOTA EXCEEDED - Activating fallback...
🔄 SWITCHING TO FALLBACK APIS...
🔄 [Fallback] Trying Tennis-API (RapidAPI)...
✅ [Tennis-API] 15 fixtures received
✅ Using Tennis-API fallback (15 matches)
```

## Provider Comparison

| Feature | The-Odds-API | Tennis-API | LiveScore6 |
|---------|--------------|------------|------------|
| **Odds Data** | ✅ Real bookmaker odds | ⚠️ Default (2.0) | ⚠️ Default (2.0) |
| **Match Fixtures** | ✅ Full details | ✅ Full details | ✅ Basic details |
| **Tournament Info** | ✅ Complete | ✅ Complete | ⚠️ Limited |
| **Cost** | 💰 Quota limited | 🆓 Free tier | 🆓 Free tier |
| **Reliability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

## Emergency Response Plan

### If Primary API Fails
1. ✅ **Automatic:** System switches to Tennis-API
2. ✅ **Transparent:** Users see no errors
3. ✅ **Logged:** Check console for provider used

### If All APIs Fail
1. Check console for specific errors
2. Verify internet connectivity
3. Test each provider with `test-fallback.js`
4. Check API key validity
5. Review provider status pages

## Code Examples

### Check Which Provider Was Used
```javascript
// In your daily-picks.json output:
{
  "provider": "Tennis-API (RapidAPI)",  // ← Shows which API succeeded
  "matches": [...]
}
```

### Force Fallback for Testing
```javascript
// In daily-scan.js, temporarily modify:
if (response.status === 429 || response.status === 402) {
  throw new Error("QUOTA_EXCEEDED");
}

// Change to:
if (true) {  // ← Force fallback
  throw new Error("QUOTA_EXCEEDED");
}
```

## Success Indicators

✅ App continues working when quota exceeded  
✅ No "API quota exceeded" errors shown to users  
✅ Match data still loads from alternative sources  
✅ Console shows clear provider switching messages  
✅ Automatic recovery when primary quota resets  

## Key Files

- `services/apiProvider.ts` - Core fallback logic
- `scripts/daily-scan.js` - Integrated scan with fallback
- `scripts/test-fallback.js` - Provider testing tool
- `docs/API_FALLBACK_SYSTEM.md` - Full documentation

---

**Status:** ✅ Production Ready  
**Last Updated:** February 16, 2026
