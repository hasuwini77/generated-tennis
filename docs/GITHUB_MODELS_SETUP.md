# GitHub Models API Setup Guide

## What is GitHub Models?

GitHub Models provides **FREE** access to premium AI models including:
- **Claude 3.5 Sonnet** (Anthropic's best)
- GPT-4o (OpenAI)
- Llama 3.1 405B (Meta)
- And more...

**Cost:** FREE for all GitHub users (generous rate limits)

---

## How to Get Your GitHub Token

### Step 1: Visit GitHub Settings
Go to: https://github.com/settings/tokens

### Step 2: Create a New Token
1. Click **"Generate new token"** → **"Generate new token (classic)"**
2. Give it a name: `TennTrend AI Models`
3. Set expiration: **No expiration** (or 1 year if preferred)
4. **Select scopes:**
   - ✅ Check: `repo` (if private repo)
   - ✅ Check: `read:org` (if using GitHub Models)
   - For GitHub Models specifically, you might only need basic access

### Step 3: Generate and Copy
1. Scroll down and click **"Generate token"**
2. **IMPORTANT:** Copy the token immediately (you won't see it again!)
3. It will look like: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 4: Add to Your Environment

#### Local Development (.env.local):
```bash
VITE_GITHUB_TOKEN=ghp_your_token_here
```

#### GitHub Actions (Repository Secrets):
1. Go to your repo: **Settings → Secrets and variables → Actions**
2. Click **"New repository secret"**
3. Name: `GH_MODELS_TOKEN`
4. Value: Paste your token
5. Click **"Add secret"**

---

## Verify It Works

### Test Locally:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://models.inference.ai.azure.com/info
```

If you get a JSON response, it's working! ✅

---

## Current AI Fallback Chain

Your daily scan now tries models in this order:

1. **Gemini 2.0 Flash Thinking** (Dec 2024 data) ⭐ Newest
2. **Claude 3.5 Sonnet** (Jun 2024 data) via GitHub Models
3. **Gemini 2.0 Flash Exp** (Dec 2024 data)
4. **Groq Llama 3.3 70B** (Dec 2023 data) - Final fallback

If one fails (rate limit, error, etc.), it automatically tries the next one.

---

## Benefits

- ✅ **FREE** - No credit card required
- ✅ **Reliable** - Multiple fallbacks ensure scans always work
- ✅ **Newest Data** - Gemini 2.0 knows tennis up to Dec 2024
- ✅ **Best Reasoning** - Claude 3.5 Sonnet for complex analysis
- ✅ **No Vendor Lock-in** - Can switch providers anytime

---

## Troubleshooting

**Error: "Unauthorized"**
- Check token is correct
- Make sure token hasn't expired
- Verify token has proper scopes

**Error: "Rate limit exceeded"**
- Wait 1 hour (rate limits reset)
- The fallback chain will try other models automatically

**Error: "Model not found"**
- GitHub Models might be in preview/beta
- Check https://github.com/marketplace/models for availability

---

## Need Help?

- GitHub Models Docs: https://docs.github.com/en/github-models
- Token Guide: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token

