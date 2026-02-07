
import { GoogleGenAI } from "@google/genai";
import { Match } from "../types";
import { fetchNHLOdds } from "./oddsService";

// Note: API_KEY is automatically provided in this environment.
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY });

export async function analyzeHockeyPicks(matches: Match[]): Promise<string> {
  const prompt = `
    Analyze the following ice hockey matches for today (NHL, SHL, Allsvenskan).
    Matches Data: ${JSON.stringify(matches)}

    Task:
    1. Identify the 'Value King': The match with the largest positive delta (Actual Prob - Market Prob). Explain why this is a discrepancy.
    2. Identify the 'Power Pick': The match with the highest overall Actual Probability.
    3. Provide a short, punchy summary of the day's hockey landscape.
    
    Format the output as a clean Markdown report suitable for a Discord notification.
    Use emojis like 🏒, 🚨, and 📈.
    Be professional but sharp.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are an elite Ice Hockey analyst. You specialize in identifying 'value' in the betting market by finding gaps between bookmaker odds and statistical win probabilities.",
        temperature: 0.5,
      },
    });

    return response.text || "Analysis complete, but no text was returned.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "The AI scout is currently unavailable. Please check the market data manually.";
  }
}

/**
 * Fetch daily NHL matches with real odds data
 * Uses The-Odds-API for legitimate, legal data
 */
export async function simulateDailyFetch(): Promise<Match[]> {
  try {
    // Fetch real NHL odds from The-Odds-API
    const matches = await fetchNHLOdds();
    
    if (matches.length === 0) {
      console.warn("No NHL games found for today");
      // Return empty array instead of simulated data
      return [];
    }
    
    // Auto-send high-value games to Discord
    await autoSendHighValueGamesToDiscord(matches);
    
    return matches;
    
  } catch (error) {
    console.error("Error fetching NHL odds:", error);
    
    // If API fails, show error state instead of simulated data
    throw new Error("Failed to fetch odds data. Please check your API key and internet connection.");
  }
}

/**
 * Auto-send high-value games to Discord (smart notifications)
 */
async function autoSendHighValueGamesToDiscord(matches: Match[]): Promise<void> {
  const webhookUrl = import.meta.env.VITE_DISCORD_WEBHOOK_URL;
  
  // If no webhook configured, skip silently
  if (!webhookUrl || webhookUrl === "") {
    console.log("[Discord] No webhook configured. Skipping notifications.");
    return;
  }
  
  // Get minimum delta threshold from env (default: 8%)
  const minDelta = parseInt(import.meta.env.VITE_DISCORD_MIN_DELTA || "8");
  
  // Filter high-value games
  const highValueGames = matches
    .filter(m => m.delta >= minDelta)
    .slice(0, 5); // Max 5 notifications per day
  
  if (highValueGames.length === 0) {
    console.log("[Discord] No high-value games found today. No notifications sent.");
    return;
  }
  
  console.log(`[Discord] Found ${highValueGames.length} high-value games. Sending notifications...`);
  
  // Send each game as a separate message
  for (const game of highValueGames) {
    await sendHighValueAlert(webhookUrl, game);
    // Small delay between messages to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

/**
 * Send a single high-value game alert to Discord
 */
async function sendHighValueAlert(webhookUrl: string, game: Match): Promise<void> {
  const embed = {
    embeds: [{
      title: "🚨 HIGH VALUE ALERT 🚨",
      color: 0x3B82F6, // Blue color
      fields: [
        {
          name: "🏒 Match",
          value: `**${game.homeTeam}** vs ${game.awayTeam}`,
          inline: false
        },
        {
          name: "📊 Delta",
          value: `**+${game.delta}%**`,
          inline: true
        },
        {
          name: "💰 Market Odds",
          value: `${game.marketOdd}`,
          inline: true
        },
        {
          name: "📈 Actual Probability",
          value: `**${game.actualProb}%**`,
          inline: true
        },
        {
          name: "⏰ Game Time",
          value: game.startTime,
          inline: true
        },
        {
          name: "🎯 League",
          value: game.league,
          inline: true
        },
        {
          name: "💡 Analysis",
          value: `Market underpricing detected! The actual win probability (${game.actualProb}%) is significantly higher than market odds suggest (${game.marketProb}%). This represents a **${game.delta}% value edge**.`,
          inline: false
        }
      ],
      footer: {
        text: "PuckTrend • Powered by The-Odds-API • For informational purposes only"
      },
      timestamp: new Date().toISOString()
    }]
  };
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(embed)
    });
    
    if (response.ok) {
      console.log(`[Discord] ✅ Alert sent for ${game.homeTeam} vs ${game.awayTeam} (Δ${game.delta}%)`);
    } else {
      console.error(`[Discord] ❌ Failed to send alert: ${response.status}`);
    }
  } catch (error) {
    console.error("[Discord] Error sending alert:", error);
  }
}

/**
 * Send full AI scout report to Discord (manual trigger)
 */
export async function sendToDiscord(webhookUrl: string, content: string): Promise<boolean> {
  if (!webhookUrl) return false;
  
  try {
    // Clean up the content and format for Discord
    const cleanContent = content
      .replace(/\*\*/g, '**') // Keep markdown bold
      .replace(/###/g, '\n**') // Convert headers
      .replace(/---/g, '\n━━━━━━━━━━━━━━━━━\n'); // Better separators
    
    // Split into chunks (Discord embed description limit: 4096 chars)
    const chunks: string[] = [];
    const sections = cleanContent.split('\n\n');
    let currentChunk = '';
    
    for (const section of sections) {
      if (currentChunk.length + section.length + 2 > 3900) {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = section;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + section;
      }
    }
    if (currentChunk) chunks.push(currentChunk.trim());
    
    // Create embeds (max 10 per message)
    const embeds = chunks.slice(0, 10).map((chunk, index) => ({
      title: index === 0 ? "🏒 Daily Scout Report" : `Scout Report (Part ${index + 1})`,
      description: chunk,
      color: 0x3B82F6,
      footer: index === chunks.length - 1 ? {
        text: "PuckTrend • Powered by Gemini AI"
      } : undefined,
      timestamp: new Date().toISOString()
    }));
    
    console.log(`[Discord] Sending ${embeds.length} embed(s) to webhook...`);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Discord] API error:", response.status, errorText);
      return false;
    }
    
    console.log("[Discord] ✅ Scout Report sent successfully!");
    return true;
  } catch (err) {
    console.error("[Discord] Send failed:", err);
    return false;
  }
}
