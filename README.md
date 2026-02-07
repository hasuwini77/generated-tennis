<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 🏒 PuckTrend - AI-Powered Hockey Betting Terminal

**Professional-grade betting insights with automated daily analysis**

PuckTrend analyzes NHL, SHL, and Allsvenskan hockey games using AI to identify high-value betting opportunities. The system runs automated scans daily at 8:00 AM CET and only recommends bets with ≥15% Expected Value.

## ✨ Features

- 🤖 **Automated Daily Scans** - GitHub Actions runs analysis at 8 AM CET
- 🎯 **Smart EV Filtering** - Only shows bets with ≥15% Expected Value
- 🏆 **Bet of the Day** - AI-selected top pick with golden frame
- 🌍 **Smart Timezone Handling** - NHL (next 36 hours) vs Swedish leagues (same-day only)
- 💬 **Discord Notifications** - Once per day with best picks
- 📊 **Minimal API Usage** - 2-4 calls/day (vs 100+ in old system)
- 🔒 **Professional Quality** - No bets on weak days (quality over quantity)

## 🏗️ Architecture

```
GitHub Actions (8 AM CET Daily)
  ↓
Fetch Odds → AI Analysis → Filter (≥15% EV) → Save to JSON
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
   VITE_DISCORD_WEBHOOK_URL=your_discord_webhook  # Optional
   ```

3. **Run the app:**
   ```bash
   npm run dev
   ```

## 🔧 Backend Setup (GitHub Actions)

The automated daily scan requires GitHub repository secrets:

1. Go to **Settings → Secrets and variables → Actions**
2. Add three secrets:
   - `THE_ODDS_API_KEY` - Get from [The-Odds-API](https://the-odds-api.com/)
   - `GEMINI_API_KEY` - Get from [Google AI Studio](https://ai.google.dev/)
   - `DISCORD_WEBHOOK_URL` - Optional, for notifications

3. Enable GitHub Actions in your repository

The workflow runs automatically at 8:00 AM CET daily. You can also trigger it manually from the Actions tab.

## 🧪 Test the Scanner Locally

```bash
npm run scan
```

This runs the backend script locally and saves results to `data/daily-picks.json`.

## 📊 API Usage

- **The-Odds-API**: 1-3 calls/day (only leagues with games)
- **Gemini AI**: 1 batch call/day (all games analyzed together)
- **Frontend**: 0 API calls (reads static JSON)

**Monthly usage**: ~45-90 API calls (well under free tier limits)

## 🌍 Timezone Logic

- **NHL**: Shows games in the next 24-36 hours (European betting window)
  - Games at 1 AM CET, 4 AM CET, etc. are all shown
- **SHL/Allsvenskan**: Only today's games in Swedish time (CET)
  - No games today = show nothing (strict same-day)

## 📁 Project Structure

```
├── scripts/
│   └── daily-scan.js          # Backend automation script
├── .github/workflows/
│   └── daily-scan.yml         # GitHub Actions workflow
├── data/
│   └── daily-picks.json       # Daily analysis results
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
