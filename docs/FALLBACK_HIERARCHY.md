# API Fallback System - Primary vs Fallback Logic

## System Architecture

### ✅ Primary Logic (Default Behavior)

**The-Odds-API is ALWAYS tried first**

```javascript
// STEP 1: Try The-Odds-API (Primary)
const response = await fetch(THE_ODDS_API_URL);

if (response.ok) {
  // ✅ SUCCESS: Use The-Odds-API data
  // - Full bookmaker odds
  // - Multiple markets
  // - Real EV calculation
  return primaryData;
}
```

### 🔄 Fallback Logic (Only When Primary Fails)

**Fallback ONLY activates on quota errors (429, 402)**

```javascript
// STEP 2: Primary failed with quota error?
if (response.status === 429 || response.status === 402) {
  console.warn("QUOTA EXCEEDED - Activating fallback...");
  
  // Try Tennis-API
  let fallbackData = await fetchTennisAPI();
  if (fallbackData.length > 0) {
    return fallbackData; // ⚠️ Default odds (2.0)
  }
  
  // Try LiveScore6
  fallbackData = await fetchLiveScore();
  if (fallbackData.length > 0) {
    return fallbackData; // ⚠️ Default odds (2.0)
  }
}
```

## Decision Tree

```
┌─────────────────────────┐
│  Daily Scan Triggered   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Try The-Odds-API        │◄─────── ALWAYS PRIMARY
└───────────┬─────────────┘
            │
      ┌─────┴─────┐
      │           │
      ▼           ▼
  ✅ SUCCESS  ❌ 429/402?
      │           │
      │           ├──► Try Tennis-API
      │           │         │
      │           │    ┌────┴────┐
      │           │    ▼         ▼
      │           │   ✅        ❌
      │           │   USE    Try LiveScore
      │           │            │
      │           │       ┌────┴────┐
      │           │       ▼         ▼
      │           │      ✅        ❌
      │           │      USE     FAIL
      │           │
      └───────────┴───────────────┘
                  │
                  ▼
        ┌──────────────────┐
        │  Continue Scan   │
        └──────────────────┘
```

## Automatic Recovery

### When Quota Resets

```javascript
// Next scan after quota resets:
// 1. System tries The-Odds-API again (ALWAYS)
// 2. Quota available? ✅ Use primary
// 3. Fallback NEVER used if primary works
// 4. Automatic switchback - no manual intervention
```

**The system automatically returns to The-Odds-API when:**
- Monthly quota resets
- You upgrade your plan
- API recovers from any error

## Key Principles

### 1. **Primary First, Always**
```javascript
// Every scan starts here:
fetchLeagueOdds(sportKey) {
  // ✅ ALWAYS try The-Odds-API first
  const response = await fetch(THE_ODDS_API_URL);
  
  // Only use fallback if primary fails
  if (response.status === 429) {
    return fallback();
  }
}
```

### 2. **Fallback Only on Quota Error**
```javascript
// Fallback triggers ONLY for:
- HTTP 429 (Rate Limit Exceeded)
- HTTP 402 (Payment Required / Quota Exceeded)

// NOT triggered for:
- Network errors (returns empty)
- Invalid API key (throws error)
- Other HTTP errors (returns empty)
```

### 3. **Transparent Switching**
```javascript
// User sees in logs:
console.log("[ATP] Fetching odds from The-Odds-API...");

// If primary works:
console.log("✅ [The-Odds-API] 12 matches fetched");

// If quota exceeded:
console.warn("⚠️  QUOTA EXCEEDED - Activating fallback...");
console.log("✅ [Tennis-API] 15 matches fetched (fallback)");
```

### 4. **Data Quality Indicator**
```javascript
// Primary data:
{
  provider: "The-Odds-API",
  hasRealOdds: true,
  canCalculateEV: true
}

// Fallback data:
{
  provider: "Tennis-API",
  hasRealOdds: false,
  canCalculateEV: false,
  note: "Using default odds (2.0)"
}
```

## Testing the Hierarchy

### Test 1: Primary Available
```bash
# When quota is available:
$ node scripts/daily-scan.js

# Expected output:
[ATP] Fetching odds from The-Odds-API...
✅ [The-Odds-API] 12 matches fetched
# Fallback NOT activated ✅
```

### Test 2: Primary Quota Exceeded
```bash
# When quota exhausted:
$ node scripts/daily-scan.js

# Expected output:
[ATP] Fetching odds from The-Odds-API...
⚠️  QUOTA EXCEEDED - Activating fallback...
🔄 [Fallback] Trying Tennis-API...
✅ [Tennis-API] 15 matches fetched
# Fallback activated ✅
```

### Test 3: Automatic Recovery
```bash
# After quota resets:
$ node scripts/daily-scan.js

# Expected output:
[ATP] Fetching odds from The-Odds-API...
✅ [The-Odds-API] 12 matches fetched
# Automatically back to primary ✅
```

## Configuration

### No Changes Needed!

Your existing `.env.local` stays the same:
```env
# Primary API (your key)
VITE_THE_ODDS_API_KEY=806f59e99af631013ea33576273da89b

# Fallback APIs (pre-configured)
# No new variables needed - already in code
```

## Monitoring

### Check Which API is Being Used

```bash
# In your logs:
grep "Fetching odds" logs/scan.log
# Shows: "Fetching odds from The-Odds-API..."

grep "Using" logs/scan.log
# Shows which provider succeeded
```

### Daily Picks JSON

```json
{
  "timestamp": "2026-02-16T09:00:00Z",
  "apiProvider": "The-Odds-API",  // or "Tennis-API (fallback)"
  "hasRealOdds": true,              // false for fallback
  "matches": [...]
}
```

## Summary

✅ **The-Odds-API = Primary** (always tried first)  
✅ **Fallback = Emergency only** (quota errors)  
✅ **Automatic recovery** (no manual intervention)  
✅ **Backward compatible** (existing code unchanged)  
✅ **Zero configuration** (works out of the box)  

**Bottom Line:** Your existing workflow is preserved. Fallback is invisible when not needed, and automatically activates only when necessary.

---

**Status:** Production Ready  
**Risk:** Zero (non-breaking)  
**Impact:** High (prevents downtime)
