const { array: badwords } = require('badwords-list');

// 2) Add any slurs or variants you care about
const extraSlurs = [
  'nigger','nigga','kike','spic','chink','gook','wetback',
  'beaner','raghead','faggot','dyke','tranny','retard','cripple'
];

// 3) Build our Set
const bannedWords = new Set([
  ...badwords.map(w => w.toLowerCase()),
  ...extraSlurs.map(w => w.toLowerCase())
]);

// 4) Normalize repeated letters: “aaabbb” → “ab”
function normalize(str) {
  return str.replace(/(.)\1+/g, '$1');
}

// 5) Profanity check
function containsProfanity(code) {
  const lower = code.toLowerCase();
  const norm  = normalize(lower);
  return bannedWords.has(lower) || bannedWords.has(norm);
}

module.exports = { containsProfanity };
