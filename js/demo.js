// js/demo.js — Generate realistic dummy Tanita BC-601 CSV data

/**
 * Generate a set of dummy DATA CSV file contents.
 * Returns an array of { name, text } objects (one per slot).
 * Simulates ~18 months of weekly-ish weigh-ins with realistic trends.
 */
export function generateDemoData() {
  const lines = [];
  const startDate = new Date(2024, 6, 1); // Jul 2024
  const endDate = new Date(2026, 0, 15);  // Jan 2026
  // Starting values for a ~90kg male, slightly overweight, improving over time
  let weight = 94.5;
  let bodyFat = 22.0;
  let muscleMass = 70.0;
  let boneMass = 3.8;
  let bodyWater = 56.5;
  let visceralFat = 7;
  let metabolicAge = 32;
  let dailyCalories = 4750;

  const height = 185.0;
  const gender = 1;
  const athleteLevel = 2;

  // Segment ratios (relative to totals)
  const segFatBase = { Fr: 0.60, Fl: 0.63, FR: 0.85, FL: 0.88, FT: 1.0 };
  const segMuscleBase = { mr: 0.072, ml: 0.073, mR: 0.175, mL: 0.172, mT: 0.545 };

  // Walk through time generating measurements every 4-8 days
  let current = new Date(startDate);
  while (current <= endDate) {
    // Gradual improvement trend with noise
    const progress = (current - startDate) / (endDate - startDate);
    const noise = () => (Math.random() - 0.5);

    weight = 94.5 - progress * 6.5 + noise() * 0.8;
    bodyFat = 22.0 - progress * 4.0 + noise() * 0.5;
    muscleMass = 70.0 + progress * 2.5 + noise() * 0.4;
    boneMass = 3.7 + noise() * 0.1;
    bodyWater = 56.5 + progress * 3.5 + noise() * 0.4;
    visceralFat = Math.max(3, Math.round(7 - progress * 3 + noise() * 0.5));
    metabolicAge = Math.max(20, Math.round(32 - progress * 8 + noise()));
    dailyCalories = Math.round(4750 - progress * 300 + noise() * 50);

    const bmi = +(weight / (height / 100) ** 2).toFixed(1);

    const dd = String(current.getDate()).padStart(2, '0');
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const yyyy = current.getFullYear();
    const hh = String(6 + Math.floor(Math.random() * 4)).padStart(2, '0');
    const mi = String(Math.floor(Math.random() * 60)).padStart(2, '0');
    const ss = String(Math.floor(Math.random() * 60)).padStart(2, '0');

    const r = (v, d = 1) => +v.toFixed(d);

    const fr = r(bodyFat * segFatBase.Fr + noise() * 0.3);
    const fl = r(bodyFat * segFatBase.Fl + noise() * 0.3);
    const fR = r(bodyFat * segFatBase.FR + noise() * 0.3);
    const fL = r(bodyFat * segFatBase.FL + noise() * 0.3);
    const fT = r(bodyFat * segFatBase.FT + noise() * 0.3);

    const mr = r(muscleMass * segMuscleBase.mr + noise() * 0.1);
    const ml = r(muscleMass * segMuscleBase.ml + noise() * 0.1);
    const mR = r(muscleMass * segMuscleBase.mR + noise() * 0.1);
    const mL = r(muscleMass * segMuscleBase.mL + noise() * 0.1);
    const mT = r(muscleMass * segMuscleBase.mT + noise() * 0.1);

    // Build the Tanita CSV line
    const line = `{0,16,~0,2,~1,2,~2,3,~3,4,MO,"BC-601",DT,"${dd}/${mm}/${yyyy}",Ti,"${hh}:${mi}:${ss}",Bt,2,GE,${gender},AG,${Math.round(28 + progress * 1.5)},Hm,${height},AL,${athleteLevel},Wk,${r(weight)},MI,${bmi},FW,${r(bodyFat)},Fr,${fr},Fl,${fl},FR,${fR},FL,${fL},FT,${fT},mW,${r(muscleMass)},mr,${mr},ml,${ml},mR,${mR},mL,${mL},mT,${mT},bW,${r(boneMass)},IF,${visceralFat},rD,${dailyCalories},rA,${metabolicAge},ww,${r(bodyWater)},CS,00}`;

    lines.push(line);

    // Next measurement: 4-8 days later, occasionally skip (vacation etc.)
    const gap = 4 + Math.floor(Math.random() * 5);
    current = new Date(current.getTime() + gap * 86400000);
  }

  return [{ name: 'DATA1.CSV', text: lines.join('\n') }];
}
