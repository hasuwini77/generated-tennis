#!/usr/bin/env node

function normalizePlayerName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ');
}

function playerNamesMatch(name1, name2) {
  const norm1 = normalizePlayerName(name1);
  const norm2 = normalizePlayerName(name2);
  
  console.log(`  Comparing: "${norm1}" vs "${norm2}"`);
  
  if (norm1 === norm2) {
    console.log(`  → MATCH: Exact match`);
    return true;
  }
  
  const parts1 = norm1.split(' ');
  const parts2 = norm2.split(' ');
  
  if (parts1.length > 0 && parts2.length > 0) {
    const lastName1 = parts1[parts1.length - 1];
    const lastName2 = parts2[parts2.length - 1];
    
    console.log(`  Last names: "${lastName1}" vs "${lastName2}"`);
    
    if (lastName1 === lastName2 && lastName1.length >= 3) {
      console.log(`  → MATCH: Last names match`);
      return true;
    }
    
    if (norm1.includes(lastName2) || norm2.includes(lastName1)) {
      console.log(`  → MATCH: Contains check (${norm1.includes(lastName2) ? 'norm1 includes lastName2' : 'norm2 includes lastName1'})`);
      return true;
    }
  }
  
  console.log(`  → NO MATCH`);
  return false;
}

// Test the Frech match case
console.log('\n=== Testing: "Magdalena Frech" vs "Liudmila Samsonova" ===');
const m1 = playerNamesMatch('Magdalena Frech', 'Liudmila Samsonova');
const m2 = playerNamesMatch('Ann Li', 'Liudmila Samsonova');

console.log('\nBoth match?', m1 && m2);

console.log('\n\n=== Testing: "Magdalena Frech" vs "Magdalena Frech" ===');
const m3 = playerNamesMatch('Magdalena Frech', 'Magdalena Frech');
const m4 = playerNamesMatch('Ann Li', 'Ann Li');

console.log('\nBoth match?', m3 && m4);
