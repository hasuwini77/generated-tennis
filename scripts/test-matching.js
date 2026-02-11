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
  
  if (norm1 === norm2) return true;
  
  // Check if last names match (most reliable)
  const parts1 = norm1.split(' ');
  const parts2 = norm2.split(' ');
  
  if (parts1.length > 0 && parts2.length > 0) {
    const lastName1 = parts1[parts1.length - 1];
    const lastName2 = parts2[parts2.length - 1];
    
    // Last name must match and be at least 3 chars
    if (lastName1 === lastName2 && lastName1.length >= 3) {
      return true;
    }
    
    // Also check if one name contains the other (for nicknames)
    if (norm1.includes(lastName2) || norm2.includes(lastName1)) {
      return true;
    }
  }
  
  return false;
}

// Test cases
console.log('Janice Tjen vs Sonay Kartal:', playerNamesMatch('Janice Tjen', 'Sonay Kartal'));
console.log('Janice Tjen vs Janice Tjen:', playerNamesMatch('Janice Tjen', 'Janice Tjen'));
console.log('Anna Kalinskaya vs Sonay Kartal:', playerNamesMatch('Anna Kalinskaya', 'Sonay Kartal'));
console.log('Magdalena Frech vs Sonay Kartal:', playerNamesMatch('Magdalena Frech', 'Sonay Kartal'));
console.log('Alexandra Eala vs Sonay Kartal:', playerNamesMatch('Alexandra Eala', 'Sonay Kartal'));

console.log('\nChecking last name parts:');
console.log('Janice Tjen:', normalizePlayerName('Janice Tjen').split(' '));
console.log('Sonay Kartal:', normalizePlayerName('Sonay Kartal').split(' '));
