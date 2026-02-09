<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 🎾 TennTrend - AI-Powered Tennis Betting Terminal

**Professional-grade tennis betting insights with automated daily analysis**

TennTrend analyzes ATP (men's) and WTA (women's) tennis matches using AI to identify high-value betting opportunities. The system runs automated scans daily at 8:00 AM CET and only recommends bets with ≥3% Expected Value.

## ✨ Features

- 🤖 **Automated Daily Scans** - GitHub Actions runs analysis at 8 AM CET
- 🎯 **Smart EV Filtering** - Only shows bets with ≥3% Expected Value
- 🛡️ **Safe Bets** - High-probability favorites (65%+ AI confidence, odds 1.20-1.60)
- 🏆 **Bet of the Day** - AI-selected top pick with golden frame
- 🎾 **ATP & WTA Coverage** - Max 15 ATP + 15 WTA matches per day
- ⏰ **24-Hour Window** - Analyzes matches in the next 24 hours
- 💬 **Discord Notifications** - Daily picks including safe bets
- 📊 **Results Tracking** - RapidAPI Tennis integration for automatic results
- 📈 **Separate Performance Stats** - Track value bets and safe bets independently
- 🔒 **Professional Quality** - No bets on weak days (quality over quantity)

## 🏗️ Architecture

```
GitHub Actions (8 AM CET Daily)
  ↓
Fetch Tennis Odds (ATP/WTA) → AI Analysis → Filter (≥3% EV) → Save to JSON
  ↓
Frontend fetches pre-analyzed data (instant loading)
```

**No API calls in frontend** - All analysis done server-side once per day.

## 🚀 Run Locally

**Prerequisites:** Node.js 18+

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables** in `.env.local`:
   ```bash
   VITE_THE_ODDS_API_KEY=your_odds_api_key
   VITE_GEMINI_API_KEY=your_gemini_api_key
   VITE_RAPIDAPI_TENNIS_KEY=your_rapidapi_key  # For match results
   VITE_DISCORD_WEBHOOK_URL=your_discord_webhook  # Optional
   ```

3. **Run the app:**
   ```bash
   npm run dev
   ```

## 🔧 Backend Setup (GitHub Actions)

The automated daily scan requires GitHub repository secrets:

1. Go to **Settings → Secrets and variables → Actions**
2. Add secrets:
   - `THE_ODDS_API_KEY` - Get from [The-Odds-API](https://the-odds-api.com/)
   - `GEMINI_API_KEY` - Get from [Google AI Studio](https://ai.google.dev/)
   - `RAPIDAPI_TENNIS_KEY` - Get from [RapidAPI Tennis API](https://rapidapi.com/jjrm365-kIFr3Nx_odV/api/tennis-api-atp-wta-itf)
   - `DISCORD_WEBHOOK_URL` - Optional, for notifications

3. Enable GitHub Actions in your repository

**Two workflows run automatically:**
- **Daily Scan**: 8:00 AM CET - Analyzes matches and generates picks
- **Update Results**: 10:00 PM CET - Checks completed matches and updates win/loss status

## 🧪 Test the Scanner Locally

```bash
# Run daily scan (generates picks)
npm run scan

# Update results (checks completed matches)
node scripts/update-results-rapidapi.js
```

This runs the backend scripts locally and saves results to `public/data/`.

## 📊 API Usage

- **The-Odds-API**: 2 calls/day (ATP + WTA)
- **Gemini AI**: 1 batch call/day (all matches analyzed together)
- **RapidAPI Tennis**: Variable (checks pending bets for results)
- **Frontend**: 0 API calls (reads static JSON)

**Monthly usage**: ~60-120 API calls total (well under free tier limits)

## 🌍 Timezone Logic

- **NHL**: Shows games in the next 24-36 hours (European betting window)
  - Games at 1 AM CET, 4 AM CET, etc. are all shown
- **SHL/Allsvenskan**: Only today's games in Swedish time (CET)
  - No games today = show nothing (strict same-day)

## 📁 Project Structure

```
├── scripts/
│   ├── daily-scan.js                    # Daily picks generation
│   └── update-results-rapidapi.js       # Results tracking
├── .github/workflows/
│   ├── daily-scan.yml                   # 8:00 AM CET scan
│   └── update-results.yml               # 10:00 PM CET results update
├── public/data/
│   ├── daily-picks.json                 # Daily analysis results
│   └── results-history.json             # Win/loss tracking
├── components/                # React components
├── services/                  # Frontend services (deprecated)
└── App.tsx                    # Main React app
```

## 🎯 EV Threshold

The system uses a **strict 15% minimum Expected Value** threshold. This means:

- ✅ Only professional-grade value bets are shown
- ✅ Some days have zero bets (this is intentional)
- ✅ Quality over quantity approach
- ✅ Better long-term ROI

## 📱 Discord Integration

Discord notifications are sent **once per day** at 8 AM CET with:

- 🏆 Bet of the Day (if EV ≥ 15%)
- 📊 Additional value bets summary
- ⚠️ "No strong bets today" if nothing meets criteria

## 🔒 Security

- API keys stored as GitHub Secrets (never committed)
- Frontend has no API access (reads static JSON only)
- Discord webhook optional (disable if not needed)

## 📚 Learn More

- [The-Odds-API Documentation](https://the-odds-api.com/liveapi/guides/v4/)
- [Google Gemini API](https://ai.google.dev/docs)
- [GitHub Actions Cron Syntax](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule)

## 📄 License

This project is private and for personal use only.

---

**View your app in AI Studio:** https://ai.studio/apps/drive/1FgRvGMhCfhikKJ0b9sRClqvfota0JUbJ
