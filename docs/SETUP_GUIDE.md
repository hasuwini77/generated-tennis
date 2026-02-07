# PuckTrend Setup Guide

Complete step-by-step guide to get PuckTrend running legally and for free.

---

## 📋 Prerequisites

- Node.js (v16 or higher)
- A Discord account (for notifications)
- A web browser

---

## 🔑 Step 1: Get API Keys

### 1.1 Get The-Odds-API Key (Required)

This is your primary data source for real NHL odds.

1. Go to **https://the-odds-api.com/**
2. Click **"Get API Key"** or **"Sign Up"**
3. Create a free account:
   - Enter your email
   - Choose a password
   - Verify your email
4. Once logged in, go to your Dashboard
5. Copy your **API Key** (it looks like: `a1b2c3d4e5f6g7h8i9j0`)
6. **Important**: Keep this key secret!

**Free Tier**: 500 requests/month (plenty for personal use)

### 1.2 Get Google Gemini API Key (Required)

This powers the AI analysis feature.

1. Go to **https://aistudio.google.com/app/apikey**
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Select **"Create API key in new project"** (or use existing project)
5. Copy your **API Key**
6. **Important**: Keep this key secret!

**Free Tier**: 1,500 requests/day (we only use 1/day)

---

## 🛠️ Step 2: Install the App

### 2.1 Clone or Download

If you have this code already, great! If not:

```bash
git clone <repository-url>
cd generated-sport
```

### 2.2 Install Dependencies

```bash
npm install
```

This installs all required packages (React, Vite, Gemini, Recharts, etc.)

---

## ⚙️ Step 3: Configure Environment Variables

### 3.1 Create `.env.local` File

In the project root, create a file named `.env.local`:

```bash
# Copy the example file
cp .env.example .env.local
```

### 3.2 Add Your API Keys

Open `.env.local` and add your actual keys:

```env
GEMINI_API_KEY=YOUR_ACTUAL_GEMINI_KEY_HERE
VITE_THE_ODDS_API_KEY=YOUR_ACTUAL_ODDS_API_KEY_HERE
```

**Replace** the placeholder text with your real keys from Step 1.

### 3.3 Verify (Important!)

Double-check:
- ✅ File is named exactly `.env.local` (not `.env` or `.env.local.txt`)
- ✅ No spaces around the `=` sign
- ✅ Keys are pasted correctly with no extra characters
- ✅ File is in the project root (same folder as `package.json`)

---

## 🚀 Step 4: Run the App

### 4.1 Start Development Server

```bash
npm run dev
```

You should see:
```
VITE v6.2.0  ready in 500 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### 4.2 Open in Browser

1. Open your browser
2. Go to **http://localhost:5173/**
3. You should see the PuckTrend app!

### 4.3 First Load

On first load:
- The app will fetch NHL odds from The-Odds-API
- Data will be cached for 24 hours
- You'll see real NHL games (if any are scheduled today)

---

## 💬 Step 5: Set Up Discord (Optional but Recommended)

### 5.1 Create a Discord Server (if needed)

1. Open Discord
2. Click **+** (Create a Server)
3. Choose **"Create My Own"**
4. Choose **"For me and my friends"**
5. Name it (e.g., "PuckTrend Analytics")
6. Create server

### 5.2 Create a Channel

1. Right-click your server
2. **Create Channel**
3. Choose **Text Channel**
4. Name it `hockey-scout` (or whatever you prefer)
5. Create channel

### 5.3 Create a Webhook

1. Right-click your channel → **Edit Channel**
2. Go to **Integrations** → **Webhooks**
3. Click **"New Webhook"**
4. Name it: `PuckTrend Scout`
5. Click **"Copy Webhook URL"**
6. Save the webhook

### 5.4 Configure in App

1. In PuckTrend, find **Discord Settings** panel (right sidebar)
2. Toggle **"Enable Discord Integration"**
3. Paste your **Webhook URL**
4. Channel name will auto-fill
5. Settings are saved automatically in your browser

**Security**: Webhook URLs are stored only in your browser's localStorage, never in code!

---

## 🎯 Step 6: Using PuckTrend

### 6.1 Daily Workflow

1. **Open the app** (or refresh if already open)
2. Data loads automatically (from cache or fresh API call)
3. View the **Market Discrepancies chart** to see top value games
4. Click **"RUN AI SCOUT"** to get Gemini's analysis
5. Click **"Push to Discord"** to send the report to your channel

### 6.2 Understanding the Data

Each match shows:

- **Home Team** vs **Away Team**
- **Market Odds**: Worst odds (highest from bookmakers)
- **Market Prob**: Probability from market odds
- **Actual Prob**: Best odds (lowest from bookmakers)
- **Delta (Δ)**: The difference = VALUE

**Example**:
```
Boston Bruins vs Toronto Maple Leafs
Market Odd: 1.50 → Market Prob: 67%
Actual Odd: 1.35 → Actual Prob: 74%
Delta: +7% ← Value opportunity!
```

When different bookmakers offer different odds, it means the market hasn't settled on the "true" probability - that's where value exists!

### 6.3 Features

- **REFRESH DATA**: Force a new API call (use sparingly, costs API quota)
- **RUN AI SCOUT**: Get Gemini's analysis of the best value picks
- **CLEAR CACHE**: Delete cached data and fetch fresh (for testing)
- **Push to Discord**: Send AI report to your Discord channel

---

## 📊 Step 7: Monitor API Usage

### Check the **API Usage** panel (right sidebar)

- **The-Odds-API**: Shows requests used out of 500/month
- **Progress bar**: Visual quota indicator
  - 🟢 Green: Under 50% (safe)
  - 🟡 Yellow: 50-80% (caution)
  - 🔴 Red: Over 80% (approaching limit)
- **Reset Date**: When your quota resets

### Best Practices

- ✅ **Use cache**: App automatically caches for 24h
- ✅ **One fetch per day**: Just open the app once daily
- ⚠️ **Avoid spam refreshing**: Each refresh = 1 API call
- ⚠️ **Check quota**: Keep an eye on usage percentage

If you hit your quota:
- App will use cached data
- Manual refresh will be disabled
- You'll see a clear error message
- Quota resets monthly on your signup anniversary

---

## 🔒 Security & Legal

### What You MUST Do

1. **Never share your API keys** publicly
2. **Never commit `.env.local`** to git (it's in `.gitignore`)
3. **Keep webhook URLs private** (they're in localStorage, not code)
4. **Use for personal purposes only** (no commercial use)
5. **Respect rate limits** (don't abuse the free tiers)

### What the App Does NOT Do

- ❌ Scrape websites illegally
- ❌ Facilitate actual betting
- ❌ Store any personal data on servers
- ❌ Share your data with third parties
- ❌ Cost you any money (100% free)

### Legal Disclaimers

- This app is for **educational and entertainment purposes only**
- We are **not affiliated with any gambling services**
- Odds data is for **informational purposes only**
- You must **comply with local laws** regarding gambling information
- **No warranty** - use at your own risk

---

## 🐛 Troubleshooting

### Problem: "API key not configured" error

**Solution**:
1. Check `.env.local` exists in project root
2. Verify key names match exactly: `VITE_THE_ODDS_API_KEY` and `GEMINI_API_KEY`
3. Restart the dev server: `Ctrl+C` then `npm run dev`

### Problem: "Invalid API key" error

**Solution**:
1. Check you copied the full key (no spaces/extra characters)
2. Verify the key at https://the-odds-api.com/account/
3. Make sure you verified your email

### Problem: "No NHL games found"

**Solution**:
- This is normal if there are no NHL games scheduled today
- NHL has off-days, especially mid-week
- Try again on game days (usually Tue-Sun)

### Problem: "API quota exceeded"

**Solution**:
1. Check your usage at https://the-odds-api.com/account/
2. Wait until quota resets (shown in API Usage panel)
3. App will continue working with cached data

### Problem: Discord webhook not working

**Solution**:
1. Test the webhook URL manually (use a tool like curl or Postman)
2. Make sure you copied the full URL
3. Check the webhook still exists in Discord settings
4. Regenerate webhook if needed

### Problem: App won't load/blank screen

**Solution**:
1. Check browser console for errors (F12)
2. Clear browser cache
3. Verify dependencies: `npm install`
4. Try a different browser

---

## 🚀 Deployment Options

See `DEPLOYMENT.md` (coming soon) for guides on:
- Running locally 24/7 with cron
- Deploying to Vercel (free tier)
- Using GitHub Actions for scheduled runs
- Railway/Render deployment

---

## 📚 Additional Resources

- **The-Odds-API Docs**: https://the-odds-api.com/liveapi/guides/v4/
- **Google Gemini Docs**: https://ai.google.dev/docs
- **Discord Webhooks**: https://discord.com/developers/docs/resources/webhook
- **API Documentation**: See `/docs/API_DOCUMENTATION.md`

---

## 💡 Tips & Tricks

1. **Best time to check**: Open the app in the morning to catch all day's games
2. **Discord notifications**: Perfect for busy days - get the AI summary in Discord
3. **Watch for high deltas**: Games with Δ > 10% are rare and potentially valuable
4. **Use cached data**: Don't refresh unless you need the absolute latest odds
5. **Monitor both leagues**: NHL is the main focus, Swedish leagues coming soon

---

## ✅ Quick Checklist

Before using PuckTrend daily:

- [ ] API keys configured in `.env.local`
- [ ] Dev server running (`npm run dev`)
- [ ] Discord webhook set up (optional)
- [ ] API quota has available requests
- [ ] Browser cache cleared (if having issues)

---

**Enjoy using PuckTrend! 🏒** 

For questions, issues, or suggestions, refer to the main README.md or check the /docs folder.

**Version**: 1.0.0  
**Last Updated**: 2026-02-05
