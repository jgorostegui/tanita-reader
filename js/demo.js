// js/demo.js — Generate realistic dummy Tanita BC-601 CSV data

/**
 * Generate a set of dummy DATA CSV file contents.
 * Returns an array of { name, text } objects (one per slot).
 * Simulates ~18 months with realistic phases: initial loss, plateau,
 * holiday rebound, then strong improvement. Seeded for reproducibility.
 */
export function generateDemoData() {
  const lines = [];
  const startDate = new Date(2024, 6, 1);  // Jul 2024
  const endDate = new Date(2026, 0, 20);   // Jan 2026

  const height = 185.0;
  const gender = 1;
  const athleteLevel = 2;

  // Segment ratios (relative to totals)
  const segFat = { Fr: 0.58, Fl: 0.62, FR: 0.84, FL: 0.87, FT: 1.02 };
  const segMuscle = { mr: 0.071, ml: 0.074, mR: 0.176, mL: 0.170, mT: 0.548 };

  // Seeded PRNG for reproducible demo data
  let seed = 42;
  function rng() {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  }
  const noise = (scale = 1) => (rng() - 0.5) * scale;

  // Phase-based progression for realistic trends
  function phaseValue(progress) {
    // Phase 1 (0-0.25): initial motivated loss
    // Phase 2 (0.25-0.45): plateau / stall
    // Phase 3 (0.45-0.55): holiday rebound
    // Phase 4 (0.55-1.0): renewed effort, strong improvement
    if (progress < 0.25) {
      const t = progress / 0.25;
      return { weightDelta: -3.0 * t, fatDelta: -2.0 * t, muscleDelta: 1.0 * t };
    } else if (progress < 0.45) {
      const t = (progress - 0.25) / 0.20;
      return { weightDelta: -3.0 - 0.3 * t, fatDelta: -2.0 + 0.2 * t, muscleDelta: 1.0 - 0.1 * t };
    } else if (progress < 0.55) {
      const t = (progress - 0.45) / 0.10;
      return { weightDelta: -3.3 + 2.5 * t, fatDelta: -1.8 + 1.5 * t, muscleDelta: 0.9 - 0.8 * t };
    }
    const t = (progress - 0.55) / 0.45;
    return { weightDelta: -0.8 - 6.0 * t, fatDelta: -0.3 - 4.5 * t, muscleDelta: 0.1 + 3.0 * t };
  }

  let current = new Date(startDate);

  while (current <= endDate) {
    const progress = (current - startDate) / (endDate - startDate);
    const phase = phaseValue(progress);

    const weight = 94.5 + phase.weightDelta + noise(1.0);
    const bodyFat = 22.5 + phase.fatDelta + noise(0.6);
    const muscleMass = 69.5 + phase.muscleDelta + noise(0.5);
    const boneMass = 3.7 + noise(0.15);
    const bodyWater = 56.0 - phase.fatDelta * 0.8 + noise(0.5);
    const visceralFat = Math.max(3, Math.round(7 + phase.fatDelta * 0.6 + noise(0.4)));
    const metabolicAge = Math.max(20, Math.round(32 + phase.fatDelta * 1.5 + noise(0.8)));
    const dailyCalories = Math.round(4750 + phase.weightDelta * 40 + noise(40));
    const bmi = +(weight / (height / 100) ** 2).toFixed(1);

    const dd = String(current.getDate()).padStart(2, '0');
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const yyyy = current.getFullYear();
    const hh = String(6 + Math.floor(rng() * 4)).padStart(2, '0');
    const mi = String(Math.floor(rng() * 60)).padStart(2, '0');
    const ss = String(Math.floor(rng() * 60)).padStart(2, '0');

    const r = (v, d = 1) => +v.toFixed(d);

    const fr = r(bodyFat * segFat.Fr + noise(0.5));
    const fl = r(bodyFat * segFat.Fl + noise(0.5));
    const fR = r(bodyFat * segFat.FR + noise(0.5));
    const fL = r(bodyFat * segFat.FL + noise(0.5));
    const fT = r(bodyFat * segFat.FT + noise(0.5));

    const mr = r(muscleMass * segMuscle.mr + noise(0.15));
    const ml = r(muscleMass * segMuscle.ml + noise(0.15));
    const mR = r(muscleMass * segMuscle.mR + noise(0.15));
    const mL = r(muscleMass * segMuscle.mL + noise(0.15));
    const mT = r(muscleMass * segMuscle.mT + noise(0.15));

    const line = `{0,16,~0,2,~1,2,~2,3,~3,4,MO,"BC-601",DT,"${dd}/${mm}/${yyyy}",Ti,"${hh}:${mi}:${ss}",Bt,2,GE,${gender},AG,${Math.round(28 + progress * 1.5)},Hm,${height},AL,${athleteLevel},Wk,${r(weight)},MI,${bmi},FW,${r(bodyFat)},Fr,${fr},Fl,${fl},FR,${fR},FL,${fL},FT,${fT},mW,${r(muscleMass)},mr,${mr},ml,${ml},mR,${mR},mL,${mL},mT,${mT},bW,${r(boneMass)},IF,${visceralFat},rD,${dailyCalories},rA,${metabolicAge},ww,${r(bodyWater)},CS,00}`;

    lines.push(line);

    // Every 4-8 days, with occasional 2-week gap (vacation)
    let gap = 4 + Math.floor(rng() * 5);
    if (rng() < 0.08) gap += 7;
    current = new Date(current.getTime() + gap * 86400000);
  }

  return [{ name: 'DATA1.CSV', text: lines.join('\n') }];
}
