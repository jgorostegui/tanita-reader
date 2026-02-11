// js/parser.js — Tanita BC-601/BC-603 CSV Parser

const LB_TO_KG = 0.453592;
const IN_TO_CM = 2.54;
const WEIGHT_KEYS = new Set(['Wk', 'mW', 'bW', 'mr', 'ml', 'mR', 'mL', 'mT']);

/**
 * Tokenize a Tanita CSV line into an array of string tokens.
 * Handles the leading '{', quoted strings, and bare values.
 */
export function tokenizeLine(raw) {
  let line = raw.trim();
  if (line.startsWith('{')) line = line.substring(1);
  if (line.endsWith('}')) line = line.substring(0, line.length - 1);

  const tokens = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === ',') {
      i++;
    } else if (line[i] === '"') {
      const end = line.indexOf('"', i + 1);
      tokens.push(line.substring(i + 1, end === -1 ? line.length : end));
      i = (end === -1 ? line.length : end + 1);
    } else {
      let end = line.indexOf(',', i);
      if (end === -1) end = line.length;
      tokens.push(line.substring(i, end));
      i = end;
    }
  }
  return tokens;
}

/**
 * Parse DD/MM/YYYY date string, optionally with HH:MM:SS time.
 * Never relies on Date.parse — always explicit.
 */
export function parseDate(dateStr, timeStr) {
  const [day, month, year] = dateStr.split('/').map(Number);
  if (timeStr) {
    const [h, m, s] = timeStr.split(':').map(Number);
    return new Date(year, month - 1, day, h, m, s);
  }
  return new Date(year, month - 1, day);
}

/**
 * Parse a single measurement line into a structured object.
 * Detects imperial rows (~0 === 3) and normalizes to metric.
 */
export function parseMeasurementLine(line) {
  if (!line.trim() || !line.trim().startsWith('{')) return null;

  const tokens = tokenizeLine(line);
  if (tokens.length < 10) return null;

  // Build key-value map from token pairs
  const kv = {};
  for (let i = 0; i < tokens.length - 1; i += 2) {
    kv[tokens[i]] = tokens[i + 1];
  }

  if (!kv.DT) return null;

  const isImperial = kv['~0'] === '3';

  const num = (key) => {
    const v = parseFloat(kv[key]);
    if (isNaN(v)) return 0;
    if (isImperial && WEIGHT_KEYS.has(key)) return +(v * LB_TO_KG).toFixed(2);
    if (isImperial && key === 'Hm') return +(v * IN_TO_CM).toFixed(1);
    return v;
  };

  return {
    date: parseDate(kv.DT, kv.Ti),
    model: kv.MO || '',
    gender: parseInt(kv.GE) || 0,
    age: parseInt(kv.AG) || 0,
    height: num('Hm'),
    athleteLevel: parseInt(kv.AL) || 0,
    weight: num('Wk'),
    bmi: parseFloat(kv.MI) || 0,
    bodyFat: parseFloat(kv.FW) || 0,
    muscleMass: num('mW'),
    boneMass: num('bW'),
    bodyWater: parseFloat(kv.ww) || 0,
    visceralFat: parseInt(kv.IF) || 0,
    dailyCalories: parseInt(kv.rD) || 0,
    metabolicAge: parseInt(kv.rA) || 0,
    segments: {
      rightArm: { fat: parseFloat(kv.Fr) || 0, muscle: num('mr') },
      leftArm: { fat: parseFloat(kv.Fl) || 0, muscle: num('ml') },
      rightLeg: { fat: parseFloat(kv.FR) || 0, muscle: num('mR') },
      leftLeg: { fat: parseFloat(kv.FL) || 0, muscle: num('mL') },
      torso: { fat: parseFloat(kv.FT) || 0, muscle: num('mT') },
    },
  };
}

/**
 * Parse a full DATA*.CSV file. Returns an array of measurement objects
 * sorted by date ascending. Empty files return [].
 */
export function parseDataFile(text) {
  const lines = text.split('\n');
  const measurements = [];
  for (const line of lines) {
    const m = parseMeasurementLine(line);
    if (m) measurements.push(m);
  }
  measurements.sort((a, b) => a.date - b.date);
  return measurements;
}

/**
 * Parse a PROF*.CSV profile file. Returns a profile object or null.
 */
export function parseProfileFile(text) {
  const line = text.split('\n').find(l => l.trim().startsWith('{'));
  if (!line) return null;

  const tokens = tokenizeLine(line);
  const kv = {};
  for (let i = 0; i < tokens.length - 1; i += 2) {
    kv[tokens[i]] = tokens[i + 1];
  }

  const isImperial = kv['~1'] === '3';
  const height = parseFloat(kv.Hm) || 0;

  return {
    model: kv.MO || '',
    dateOfBirth: kv.DB ? parseDate(kv.DB) : null,
    gender: parseInt(kv.GE) || 0,
    height: isImperial ? +(height * IN_TO_CM).toFixed(1) : height,
    athleteLevel: parseInt(kv.AL) || 0,
  };
}

/**
 * Classify a filename as 'data', 'profile', or 'unknown'.
 */
export function classifyFile(filename) {
  const upper = filename.toUpperCase();
  if (/DATA\d*\.CSV$/.test(upper)) return 'data';
  if (/PROF\d*\.CSV$/.test(upper)) return 'profile';
  return 'unknown';
}

/**
 * Extract the slot number from a DATA/PROF filename. Returns 0 if not found.
 */
export function getSlotNumber(filename) {
  const match = filename.toUpperCase().match(/(DATA|PROF)(\d+)\.CSV$/);
  return match ? parseInt(match[2]) : 0;
}
