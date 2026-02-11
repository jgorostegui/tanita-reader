// test/parser.test.js — Unit tests for js/parser.js

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  tokenizeLine,
  parseDate,
  parseMeasurementLine,
  parseDataFile,
  classifyFile,
  getSlotNumber,
} from '../js/parser.js';

// Sample lines from data/DATA/DATA1.csv
const METRIC_LINE = '{0,16,~0,2,~1,2,~2,3,~3,4,MO,"BC-601",DT,"12/01/2016",Ti,"23:48:53",Bt,2,GE,1,AG,26,Hm,185.0,AL,3,Wk,96.1,MI,28.1,FW,18.9,Fr,12.6,Fl,13.3,FR,17.8,FL,18.6,FT,20.8,mW,74.1,mr,5.1,ml,5.2,mR,12.5,mL,12.3,mT,39.0,bW,3.8,IF,5,rD,4871,rA,25,ww,58.9,CS,30}';
const IMPERIAL_LINE = '{0,16,~0,3,~1,3,~2,3,~3,4,MO,"BC-601",DT,"10/05/2016",Ti,"06:06:57",Bt,2,GE,1,AG,27,Hm,73.0,AL,3,Wk,206.2,MI,27.3,FW,19.4,Fr,12.1,Fl,12.3,FR,18.3,FL,19.1,FT,21.5,mW,158.0,mr,10.8,ml,11.2,mR,26.2,mL,25.8,mT,84.0,bW,8.2,IF,5,rD,4698,rA,28,ww,58.1,CS,B5}';

// ── tokenizeLine ────────────────────────────────────────

describe('tokenizeLine', () => {
  it('strips leading { and trailing }', () => {
    const tokens = tokenizeLine('{a,b,c}');
    assert.deepStrictEqual(tokens, ['a', 'b', 'c']);
  });

  it('handles quoted strings', () => {
    const tokens = tokenizeLine('{MO,"BC-601",DT,"12/01/2016"}');
    assert.deepStrictEqual(tokens, ['MO', 'BC-601', 'DT', '12/01/2016']);
  });

  it('handles bare numbers', () => {
    const tokens = tokenizeLine('{0,16,~0,2}');
    assert.deepStrictEqual(tokens, ['0', '16', '~0', '2']);
  });

  it('parses a full measurement line into correct token count', () => {
    const tokens = tokenizeLine(METRIC_LINE);
    // Key-value pairs: each field is 2 tokens
    assert.ok(tokens.length >= 50, `expected >= 50 tokens, got ${tokens.length}`);
    // Check specific values
    assert.strictEqual(tokens[tokens.indexOf('MO') + 1], 'BC-601');
    assert.strictEqual(tokens[tokens.indexOf('DT') + 1], '12/01/2016');
    assert.strictEqual(tokens[tokens.indexOf('Wk') + 1], '96.1');
  });

  it('returns empty array for empty string', () => {
    assert.deepStrictEqual(tokenizeLine(''), []);
  });
});

// ── parseDate ───────────────────────────────────────────

describe('parseDate', () => {
  it('parses DD/MM/YYYY date', () => {
    const d = parseDate('12/01/2016');
    assert.strictEqual(d.getFullYear(), 2016);
    assert.strictEqual(d.getMonth(), 0); // January = 0
    assert.strictEqual(d.getDate(), 12);
  });

  it('parses DD/MM/YYYY with HH:MM:SS time', () => {
    const d = parseDate('12/01/2016', '23:48:53');
    assert.strictEqual(d.getFullYear(), 2016);
    assert.strictEqual(d.getMonth(), 0);
    assert.strictEqual(d.getDate(), 12);
    assert.strictEqual(d.getHours(), 23);
    assert.strictEqual(d.getMinutes(), 48);
    assert.strictEqual(d.getSeconds(), 53);
  });

  it('handles single-digit day and month', () => {
    const d = parseDate('01/02/2020');
    assert.strictEqual(d.getDate(), 1);
    assert.strictEqual(d.getMonth(), 1); // February
    assert.strictEqual(d.getFullYear(), 2020);
  });
});

// ── parseMeasurementLine ────────────────────────────────

describe('parseMeasurementLine', () => {
  it('parses a metric line into correct structure', () => {
    const m = parseMeasurementLine(METRIC_LINE);
    assert.ok(m, 'should not be null');
    assert.strictEqual(m.weight, 96.1);
    assert.strictEqual(m.bmi, 28.1);
    assert.strictEqual(m.bodyFat, 18.9);
    assert.strictEqual(m.muscleMass, 74.1);
    assert.strictEqual(m.boneMass, 3.8);
    assert.strictEqual(m.bodyWater, 58.9);
    assert.strictEqual(m.visceralFat, 5);
    assert.strictEqual(m.dailyCalories, 4871);
    assert.strictEqual(m.metabolicAge, 25);
    assert.strictEqual(m.height, 185.0);
    assert.strictEqual(m.gender, 1);
    assert.strictEqual(m.age, 26);
    assert.strictEqual(m.model, 'BC-601');
  });

  it('parses date and time correctly', () => {
    const m = parseMeasurementLine(METRIC_LINE);
    assert.strictEqual(m.date.getFullYear(), 2016);
    assert.strictEqual(m.date.getMonth(), 0); // January
    assert.strictEqual(m.date.getDate(), 12);
    assert.strictEqual(m.date.getHours(), 23);
    assert.strictEqual(m.date.getMinutes(), 48);
  });

  it('parses segment data', () => {
    const m = parseMeasurementLine(METRIC_LINE);
    assert.deepStrictEqual(m.segments, {
      rightArm: { fat: 12.6, muscle: 5.1 },
      leftArm: { fat: 13.3, muscle: 5.2 },
      rightLeg: { fat: 17.8, muscle: 12.5 },
      leftLeg: { fat: 18.6, muscle: 12.3 },
      torso: { fat: 20.8, muscle: 39.0 },
    });
  });

  it('returns null for empty string', () => {
    assert.strictEqual(parseMeasurementLine(''), null);
  });

  it('returns null for non-{ line', () => {
    assert.strictEqual(parseMeasurementLine('not a data line'), null);
  });

  it('returns null for too-short line', () => {
    assert.strictEqual(parseMeasurementLine('{a,b}'), null);
  });
});

// ── Imperial conversion ─────────────────────────────────

describe('imperial conversion', () => {
  it('converts weight from lbs to kg', () => {
    const m = parseMeasurementLine(IMPERIAL_LINE);
    assert.ok(m, 'should not be null');
    // 206.2 lbs * 0.453592 = 93.53 kg (approx)
    assert.ok(Math.abs(m.weight - 93.53) < 0.1, `weight ${m.weight} should be ~93.53`);
  });

  it('converts height from inches to cm', () => {
    const m = parseMeasurementLine(IMPERIAL_LINE);
    // 73.0 in * 2.54 = 185.42 cm
    assert.ok(Math.abs(m.height - 185.4) < 0.2, `height ${m.height} should be ~185.4`);
  });

  it('converts muscle mass from lbs to kg', () => {
    const m = parseMeasurementLine(IMPERIAL_LINE);
    // 158.0 lbs * 0.453592 = 71.67 kg (approx)
    assert.ok(Math.abs(m.muscleMass - 71.67) < 0.1, `muscleMass ${m.muscleMass} should be ~71.67`);
  });

  it('converts bone mass from lbs to kg', () => {
    const m = parseMeasurementLine(IMPERIAL_LINE);
    // 8.2 lbs * 0.453592 = 3.72 kg (approx)
    assert.ok(Math.abs(m.boneMass - 3.72) < 0.1, `boneMass ${m.boneMass} should be ~3.72`);
  });

  it('does not convert percentage fields', () => {
    const m = parseMeasurementLine(IMPERIAL_LINE);
    assert.strictEqual(m.bodyFat, 19.4);
    assert.strictEqual(m.bodyWater, 58.1);
    assert.strictEqual(m.bmi, 27.3);
  });

  it('converts segment muscle mass from lbs to kg', () => {
    const m = parseMeasurementLine(IMPERIAL_LINE);
    // mr=10.8 lbs * 0.453592 = 4.90 kg
    assert.ok(Math.abs(m.segments.rightArm.muscle - 4.90) < 0.1,
      `rightArm muscle ${m.segments.rightArm.muscle} should be ~4.90`);
  });

  it('does not convert segment fat percentages', () => {
    const m = parseMeasurementLine(IMPERIAL_LINE);
    assert.strictEqual(m.segments.rightArm.fat, 12.1);
    assert.strictEqual(m.segments.torso.fat, 21.5);
  });
});

// ── parseDataFile ───────────────────────────────────────

describe('parseDataFile', () => {
  it('parses multiple lines and sorts by date', () => {
    const text = [METRIC_LINE, IMPERIAL_LINE].join('\n');
    const results = parseDataFile(text);
    assert.strictEqual(results.length, 2);
    assert.ok(results[0].date <= results[1].date, 'should be sorted by date ascending');
  });

  it('returns empty array for empty string', () => {
    assert.deepStrictEqual(parseDataFile(''), []);
  });

  it('returns empty array for garbage input', () => {
    assert.deepStrictEqual(parseDataFile('hello\nworld\n'), []);
  });

  it('skips blank lines', () => {
    const text = METRIC_LINE + '\n\n\n' + IMPERIAL_LINE + '\n';
    const results = parseDataFile(text);
    assert.strictEqual(results.length, 2);
  });

  it('parses a realistic file with correct count', () => {
    // 3 lines from Jan 13, 2016 (same day, different times)
    const lines = [
      '{0,16,~0,2,~1,2,~2,3,~3,4,MO,"BC-601",DT,"13/01/2016",Ti,"00:25:06",Bt,2,GE,1,AG,26,Hm,185.0,AL,3,Wk,95.6,MI,27.9,FW,18.0,Fr,12.4,Fl,13.2,FR,17.7,FL,18.0,FT,19.5,mW,74.5,mr,5.1,ml,5.2,mR,12.5,mL,12.5,mT,39.2,bW,3.8,IF,5,rD,4893,rA,23,ww,59.7,CS,2B}',
      '{0,16,~0,2,~1,2,~2,3,~3,4,MO,"BC-601",DT,"13/01/2016",Ti,"00:30:06",Bt,2,GE,1,AG,26,Hm,185.0,AL,3,Wk,95.6,MI,27.9,FW,17.6,Fr,12.4,Fl,13.0,FR,17.5,FL,17.8,FT,18.9,mW,74.9,mr,5.1,ml,5.2,mR,12.5,mL,12.5,mT,39.6,bW,3.9,IF,5,rD,4914,rA,22,ww,60.1,CS,26}',
      '{0,16,~0,2,~1,2,~2,3,~3,4,MO,"BC-601",DT,"13/01/2016",Ti,"07:20:10",Bt,2,GE,1,AG,26,Hm,185.0,AL,3,Wk,95.0,MI,27.7,FW,19.9,Fr,13.0,Fl,13.8,FR,18.9,FL,18.2,FT,22.3,mW,72.3,mr,4.9,ml,5.0,mR,12.0,mL,12.3,mT,38.1,bW,3.7,IF,5,rD,4755,rA,29,ww,57.7,CS,22}',
    ];
    const results = parseDataFile(lines.join('\n'));
    assert.strictEqual(results.length, 3);
  });
});

// ── classifyFile ────────────────────────────────────────

describe('classifyFile', () => {
  it('classifies DATA files as data', () => {
    assert.strictEqual(classifyFile('DATA1.CSV'), 'data');
    assert.strictEqual(classifyFile('DATA8.csv'), 'data');
    assert.strictEqual(classifyFile('data1.csv'), 'data');
  });

  it('classifies PROF files as profile', () => {
    assert.strictEqual(classifyFile('PROF1.CSV'), 'profile');
    assert.strictEqual(classifyFile('PROF5.csv'), 'profile');
  });

  it('returns unknown for other files', () => {
    assert.strictEqual(classifyFile('foo.txt'), 'unknown');
    assert.strictEqual(classifyFile('readme.md'), 'unknown');
    assert.strictEqual(classifyFile('data.txt'), 'unknown');
  });
});

// ── getSlotNumber ───────────────────────────────────────

describe('getSlotNumber', () => {
  it('extracts slot number from DATA files', () => {
    assert.strictEqual(getSlotNumber('DATA1.CSV'), 1);
    assert.strictEqual(getSlotNumber('DATA5.CSV'), 5);
    assert.strictEqual(getSlotNumber('DATA8.csv'), 8);
  });

  it('extracts slot number from PROF files', () => {
    assert.strictEqual(getSlotNumber('PROF1.CSV'), 1);
    assert.strictEqual(getSlotNumber('PROF5.CSV'), 5);
  });

  it('returns 0 for non-matching files', () => {
    assert.strictEqual(getSlotNumber('foo.txt'), 0);
    assert.strictEqual(getSlotNumber('DATA.CSV'), 0);
  });
});
