#!/usr/bin/env node

/**
 * Test script for API fallback system
 * Tests each provider independently and together
 */

import fetch from 'node-fetch';

const RAPIDAPI_KEY = "bccefb9e3cmsh6275b4d52bc7d3fp18858cjsn571965f8e30e";
const TENNIS_API_BASE = "https://tennis-api-atp-wta-itf.p.rapidapi.com/tennis/v2";
const LIVESCORE_API_BASE = "https://livescore6.p.rapidapi.com";

console.log('╔════════════════════════════════════════════╗');
console.log('║  API Fallback System Test                 ║');
console.log('╚════════════════════════════════════════════╝\n');

// Test Tennis-API
async function testTennisAPI() {
  console.log('1️⃣  Testing Tennis-API (RapidAPI)...');
  
  try {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 2);
    
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const url = `${TENNIS_API_BASE}/atp/fixtures/${todayStr}/${tomorrowStr}`;
    
    console.log(`   URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': 'tennis-api-atp-wta-itf.p.rapidapi.com'
      }
    });
    
    console.log(`   Status: ${response.status}`);
    
    if (!response.ok) {
      console.log(`   ❌ Failed: ${response.statusText}\n`);
      return false;
    }
    
    const data = await response.json();
    let fixtures = Array.isArray(data) ? data : (data.events || []);
    
    console.log(`   ✅ Success: ${fixtures.length} fixtures found`);
    
    if (fixtures.length > 0) {
      const sample = fixtures[0];
      console.log(`   📋 Sample: ${sample.homeTeam?.name || 'N/A'} vs ${sample.awayTeam?.name || 'N/A'}`);
    }
    console.log('');
    
    return true;
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
    return false;
  }
}

// Test LiveScore6
async function testLiveScore() {
  console.log('2️⃣  Testing LiveScore6 (RapidAPI)...');
  
  try {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    
    const url = `${LIVESCORE_API_BASE}/matches/v2/list-by-date?Category=tennis&Date=${dateStr}&Timezone=0`;
    
    console.log(`   URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': 'livescore6.p.rapidapi.com'
      }
    });
    
    console.log(`   Status: ${response.status}`);
    
    if (!response.ok) {
      console.log(`   ❌ Failed: ${response.statusText}\n`);
      return false;
    }
    
    const data = await response.json();
    const stages = data.Stages || [];
    
    let totalMatches = 0;
    stages.forEach(stage => {
      const events = stage.Events || [];
      totalMatches += events.length;
    });
    
    console.log(`   ✅ Success: ${totalMatches} matches found across ${stages.length} stages`);
    
    if (stages.length > 0 && stages[0].Events?.length > 0) {
      const sample = stages[0].Events[0];
      console.log(`   📋 Sample: ${sample.T1?.[0]?.Nm || 'N/A'} vs ${sample.T2?.[0]?.Nm || 'N/A'}`);
    }
    console.log('');
    
    return true;
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
    return false;
  }
}

// Main test
async function runTests() {
  console.log('=== TESTING FALLBACK PROVIDERS ===\n');
  
  const results = {
    tennisAPI: await testTennisAPI(),
    liveScore: await testLiveScore()
  };
  
  console.log('=== TEST SUMMARY ===');
  console.log(`Tennis-API:   ${results.tennisAPI ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`LiveScore6:   ${results.liveScore ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');
  
  const allPassed = Object.values(results).every(r => r);
  
  if (allPassed) {
    console.log('✅ All fallback providers are working!\n');
    console.log('Your app will continue working even if The-Odds-API quota is exceeded.');
  } else {
    console.log('⚠️  Some providers failed. Check the errors above.\n');
    console.log('App may have limited fallback capability.');
  }
  
  console.log('\n💡 TIP: To test the full fallback chain, temporarily modify');
  console.log('   daily-scan.js to force a QUOTA_EXCEEDED error.\n');
}

runTests().catch(console.error);
