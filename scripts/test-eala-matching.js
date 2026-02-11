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
  
  console.log(`Comparing: "${norm1}" vs "${norm2}"`);
  
  if (norm1 === norm2) return true;
  
  const parts1 = norm1.split(' ');
  const parts2 = norm2.split(' ');
  
  if (parts1.length > 0 && parts2.length > 0) {
    const lastName1 = parts1[parts1.length - 1];
    const lastName2 = parts2[parts2.length - 1];
    
    console.log(`Last names: "${lastName1}" vs "${lastName2}"`);
    
    if (lastName1 === lastName2 && lastName1.length >= 3) {
      console.log('  → MATCH: Last name');
      return true;
    }
    
    const words1 = new Set(parts1);
    const words2 = new Set(parts2);
    
    const commonWords = [...words1].filter(w => w.length > 2 && words2.has(w));
    console.log(`Common words (>2 chars): ${commonWords.join(', ')}`);
    
    if (commonWords.length >= 2) {
      console.log('  → MATCH: 2+ common words');
      return true;
    }
  }
  
  console.log('  → NO MATCH');
  return false;
}

console.log('=== Eala Match Test ===\n');
const m1 = playerNamesMatch('Alexandra Eala', 'Alexandra Eala');
console.log(`Result: ${m1}\n`);

console.log('=== Valentova Match Test ===\n');
const m2 = playerNamesMatch('Tereza Valentova', 'Tereza Valentová');  // Note the accent
console.log(`Result: ${m2}\n`);

console.log('=== Both Together ===');
console.log(`Both match: ${m1 && m2}`);
