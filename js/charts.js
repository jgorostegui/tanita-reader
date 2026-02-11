// js/charts.js — Chart.js visualizations with zoom, crosshair sync, segments

/* global Chart */

// ── Theme-Aware Colors ─────────────────────────────────

function getThemeColors() {
  const s = getComputedStyle(document.documentElement);
  const g = k => s.getPropertyValue(k).trim();
  return {
    accent: g('--accent'), rose: g('--rose'), green: g('--green'),
    amber: g('--amber'), text: g('--text'), text2: g('--text-2'),
    text3: g('--text-3'), border: g('--border-soft') || g('--border'),
    chartTitle: g('--chart-title'), tooltipBg: g('--tooltip-bg'),
    tooltipTitle: g('--tooltip-title'), tooltipBody: g('--tooltip-body'),
    tooltipBorder: g('--tooltip-border'), crosshair: g('--crosshair'),
    zoneBlue: g('--zone-blue'), zoneGreen: g('--zone-green'),
    zoneAmber: g('--zone-amber'), zoneRed: g('--zone-red'),
    dragBg: g('--drag-bg'), dragBorder: g('--drag-border'),
  };
}

function getCOLORS() {
  const t = getThemeColors();
  return {
    weight: t.accent, fat: t.rose, muscle: t.green, water: t.accent,
    bmi: t.amber, visceral: t.accent, metabolicAge: t.text2,
    calories: t.amber, bone: t.text3,
    grid: t.border, text: t.text3, textLight: t.text2,
    chartTitle: t.chartTitle,
    tooltipBg: t.tooltipBg, tooltipTitle: t.tooltipTitle,
    tooltipBody: t.tooltipBody, tooltipBorder: t.tooltipBorder,
    crosshair: t.crosshair,
    zoneBlue: t.zoneBlue, zoneGreen: t.zoneGreen,
    zoneAmber: t.zoneAmber, zoneRed: t.zoneRed,
    dragBg: t.dragBg, dragBorder: t.dragBorder,
  };
}

// Backwards-compatible export (snapshot at load time)
const COLORS = getCOLORS();
export { COLORS };

// ── Shared Helpers ──────────────────────────────────────

function timeScale() {
  const c = getCOLORS();
  return {
    type: 'time',
    time: { unit: 'month', tooltipFormat: 'dd MMM yyyy HH:mm' },
    grid: { color: c.grid },
    ticks: { color: c.text, maxRotation: 45 },
  };
}

function yScale(title) {
  const c = getCOLORS();
  return {
    grid: { color: c.grid },
    ticks: { color: c.text },
    title: title ? { display: true, text: title, color: c.text } : undefined,
  };
}

function legend() {
  const c = getCOLORS();
  return { labels: { color: c.textLight, padding: 12, usePointStyle: true, pointStyleWidth: 10, boxWidth: 8, font: { size: 12 } } };
}

function tooltipOpts() {
  const c = getCOLORS();
  return {
    mode: 'index',
    intersect: false,
    backgroundColor: c.tooltipBg,
    titleColor: c.tooltipTitle,
    bodyColor: c.tooltipBody,
    borderColor: c.tooltipBorder,
    borderWidth: 1,
    padding: 10,
    cornerRadius: 8,
    titleFont: { weight: '600' },
    callbacks: {
      title: (items) => {
        if (items.length && items[0].parsed?.x) {
          return new Date(items[0].parsed.x).toLocaleDateString('en-GB', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
          });
        }
        return '';
      },
    },
  };
}

function chartTitle(text) {
  const c = getCOLORS();
  return { display: true, text, color: c.chartTitle, font: { size: 13, weight: '600' }, padding: { top: 4, bottom: 12 } };
}

function ds(label, data, color, extra = {}) {
  return {
    label, data,
    borderColor: color,
    backgroundColor: color + '22',
    borderWidth: 2,
    pointRadius: 2,
    pointHoverRadius: 6,
    pointHitRadius: 4,
    tension: 0.3,
    fill: false,
    ...extra,
  };
}

function pts(measurements, accessor) {
  return measurements.map(m => ({
    x: m.date,
    y: typeof accessor === 'function' ? accessor(m) : m[accessor],
  }));
}

function zoomOpts(measurements) {
  const c = getCOLORS();
  const hasData = measurements.length > 1;
  return {
    zoom: {
      wheel: { enabled: true, speed: 0.05 },
      pinch: { enabled: true },
      drag: {
        enabled: true,
        threshold: 8,
        backgroundColor: c.dragBg,
        borderColor: c.dragBorder,
        borderWidth: 1,
      },
      mode: 'x',
    },
    limits: hasData ? {
      x: {
        min: measurements[0].date.getTime(),
        max: measurements[measurements.length - 1].date.getTime(),
        minRange: 86400000 * 3,
      },
    } : {},
  };
}

// ── BMI Zone Background Plugin ──────────────────────────

const bmiZonesPlugin = {
  id: 'bmiZones',
  beforeDraw(chart) {
    if (!chart.options.plugins?.bmiZones?.enabled) return;
    const { ctx, chartArea, scales } = chart;
    if (!chartArea || !scales.y) return;
    const { top, bottom, left, right } = chartArea;
    const y = scales.y;
    const c = getCOLORS();

    const zones = [
      { min: y.min, max: 18.5, color: c.zoneBlue, label: 'Underweight' },
      { min: 18.5, max: 25, color: c.zoneGreen, label: 'Normal' },
      { min: 25, max: 30, color: c.zoneAmber, label: 'Overweight' },
      { min: 30, max: y.max, color: c.zoneRed, label: 'Obese' },
    ];

    ctx.save();
    for (const zone of zones) {
      const zTop = y.getPixelForValue(Math.min(zone.max, y.max));
      const zBot = y.getPixelForValue(Math.max(zone.min, y.min));
      const cTop = Math.max(zTop, top);
      const cBot = Math.min(zBot, bottom);
      if (cTop >= cBot) continue;

      ctx.fillStyle = zone.color;
      ctx.fillRect(left, cTop, right - left, cBot - cTop);

      ctx.fillStyle = c.text;
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      const ly = Math.max(cTop + 14, top + 14);
      if (ly < cBot) ctx.fillText(zone.label, right - 6, ly);
    }
    ctx.restore();
  },
};

// ── Visceral Fat Zone Background Plugin ──────────────────

const visceralZonesPlugin = {
  id: 'visceralZones',
  beforeDraw(chart) {
    if (!chart.options.plugins?.visceralZones?.enabled) return;
    const { ctx, chartArea, scales } = chart;
    if (!chartArea || !scales.y) return;
    const { top, bottom, left, right } = chartArea;
    const y = scales.y;
    const c = getCOLORS();

    const zones = [
      { min: y.min, max: 13, color: c.zoneGreen, label: 'Healthy' },
      { min: 13, max: y.max, color: c.zoneRed, label: 'Excess' },
    ];

    ctx.save();
    for (const zone of zones) {
      const zTop = y.getPixelForValue(Math.min(zone.max, y.max));
      const zBot = y.getPixelForValue(Math.max(zone.min, y.min));
      const cTop = Math.max(zTop, top);
      const cBot = Math.min(zBot, bottom);
      if (cTop >= cBot) continue;

      ctx.fillStyle = zone.color;
      ctx.fillRect(left, cTop, right - left, cBot - cTop);

      ctx.fillStyle = c.text;
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      const ly = Math.max(cTop + 14, top + 14);
      if (ly < cBot) ctx.fillText(zone.label, right - 6, ly);
    }
    ctx.restore();
  },
};

// ── Crosshair Sync Plugin ───────────────────────────────

let hoverDate = null;
let hoverSourceId = null;
let syncRAF = null;

function scheduleSync() {
  if (syncRAF) return;
  syncRAF = requestAnimationFrame(() => {
    syncRAF = null;
    for (const inst of Object.values(instances)) {
      if (inst.id !== hoverSourceId && inst.config.type === 'line') {
        inst.draw();
      }
    }
  });
}

const crosshairPlugin = {
  id: 'crosshair',
  afterDraw(chart) {
    if (!hoverDate || hoverSourceId === chart.id || chart.config.type !== 'line') return;
    const { ctx, chartArea, scales } = chart;
    if (!chartArea || !scales.x) return;
    const px = scales.x.getPixelForValue(hoverDate);
    if (px < chartArea.left || px > chartArea.right) return;

    const c = getCOLORS();
    ctx.save();
    ctx.strokeStyle = c.crosshair;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(px, chartArea.top);
    ctx.lineTo(px, chartArea.bottom);
    ctx.stroke();
    ctx.restore();
  },
  afterEvent(chart, args) {
    if (chart.config.type !== 'line') return;
    const evt = args.event;
    if (evt.type === 'mousemove' && chart.chartArea && chart.scales.x) {
      if (evt.x >= chart.chartArea.left && evt.x <= chart.chartArea.right) {
        hoverDate = chart.scales.x.getValueForPixel(evt.x);
        hoverSourceId = chart.id;
        scheduleSync();
      }
    } else if (evt.type === 'mouseout') {
      hoverDate = null;
      hoverSourceId = null;
      scheduleSync();
    }
  },
};

Chart.register(bmiZonesPlugin, visceralZonesPlugin, crosshairPlugin);

// ── Chart Instance Management ───────────────────────────

const instances = {};

function destroy(id) {
  if (instances[id]) {
    instances[id].destroy();
    delete instances[id];
  }
}

export function destroyAll() {
  for (const id of Object.keys(instances)) destroy(id);
}

export function resetAllZoom() {
  for (const inst of Object.values(instances)) {
    if (inst.config.type === 'line' && inst.resetZoom) inst.resetZoom();
  }
}

function interaction() {
  return { mode: 'nearest', intersect: false };
}

function makeOnClick(measurements, onPointClick) {
  if (!onPointClick) return undefined;
  return (event, _elements, chart) => {
    const hit = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, false);
    if (hit.length > 0) {
      onPointClick(measurements[hit[0].index], hit[0].index);
    }
  };
}

function addDblClickReset(canvas, chart) {
  canvas.ondblclick = () => { if (chart.resetZoom) chart.resetZoom(); };
}

// ── Segment Colors ──────────────────────────────────────

function getSegmentColors() {
  const c = getCOLORS();
  return {
    rightArm: c.weight,
    leftArm: c.water,
    rightLeg: c.muscle,
    leftLeg: c.muscle,
    torso: c.bmi,
  };
}

const SEGMENT_LABELS = {
  rightArm: 'R. Arm',
  leftArm: 'L. Arm',
  rightLeg: 'R. Leg',
  leftLeg: 'L. Leg',
  torso: 'Torso',
};

// ── Time-Series Chart Factories ─────────────────────────

export function createWeightChart(canvas, measurements, onPointClick) {
  destroy('weight');
  const c = getCOLORS();
  const ch = new Chart(canvas, {
    type: 'line',
    data: { datasets: [ds('Weight', pts(measurements, 'weight'), c.weight)] },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: interaction(),
      onClick: makeOnClick(measurements, onPointClick),
      plugins: {
        legend: legend(), tooltip: tooltipOpts(),
        title: chartTitle('Weight (kg)'),
        zoom: zoomOpts(measurements),
      },
      scales: { x: timeScale(), y: yScale('kg') },
    },
  });
  instances.weight = ch;
  addDblClickReset(canvas, ch);
  return ch;
}

export function createWeightMuscleChart(canvas, measurements, onPointClick) {
  destroy('weightMuscle');
  const c = getCOLORS();
  const ch = new Chart(canvas, {
    type: 'line',
    data: {
      datasets: [
        ds('Weight', pts(measurements, 'weight'), c.weight),
        ds('Muscle Mass', pts(measurements, 'muscleMass'), c.muscle),
        ds('Bone Mass', pts(measurements, 'boneMass'), c.bone, { borderDash: [4, 3], pointRadius: 1 }),
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: interaction(),
      onClick: makeOnClick(measurements, onPointClick),
      plugins: {
        legend: legend(), tooltip: tooltipOpts(),
        title: chartTitle('Weight & Muscle Mass (kg)'),
        zoom: zoomOpts(measurements),
      },
      scales: { x: timeScale(), y: yScale('kg') },
    },
  });
  instances.weightMuscle = ch;
  addDblClickReset(canvas, ch);
  return ch;
}

export function createMassBreakdownChart(canvas, measurements, onPointClick) {
  destroy('massBreakdown');
  const c = getCOLORS();
  const ch = new Chart(canvas, {
    type: 'line',
    data: {
      datasets: [
        ds('Fat Mass', pts(measurements, m => +((m.weight * m.bodyFat / 100).toFixed(1))), c.fat, { fill: true, backgroundColor: c.fat + '18' }),
        ds('Muscle Mass', pts(measurements, 'muscleMass'), c.muscle, { fill: true, backgroundColor: c.muscle + '18' }),
        ds('Bone Mass', pts(measurements, 'boneMass'), c.bone, { fill: true, backgroundColor: c.bone + '12' }),
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: interaction(),
      onClick: makeOnClick(measurements, onPointClick),
      plugins: {
        legend: legend(), tooltip: tooltipOpts(),
        title: chartTitle('Mass Breakdown (kg)'),
        zoom: zoomOpts(measurements),
      },
      scales: { x: timeScale(), y: yScale('kg') },
    },
  });
  instances.massBreakdown = ch;
  addDblClickReset(canvas, ch);
  return ch;
}

export function createCompositionChart(canvas, measurements, onPointClick) {
  destroy('composition');
  const c = getCOLORS();
  const ch = new Chart(canvas, {
    type: 'line',
    data: {
      datasets: [
        ds('Body Fat %', pts(measurements, 'bodyFat'), c.fat),
        ds('Body Water %', pts(measurements, 'bodyWater'), c.water),
        ds('Muscle %', pts(measurements, m => m.weight ? +((m.muscleMass / m.weight) * 100).toFixed(1) : 0), c.muscle),
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: interaction(),
      onClick: makeOnClick(measurements, onPointClick),
      plugins: {
        legend: legend(), tooltip: tooltipOpts(),
        title: chartTitle('Body Composition (%)'),
        zoom: zoomOpts(measurements),
      },
      scales: { x: timeScale(), y: yScale('%') },
    },
  });
  instances.composition = ch;
  addDblClickReset(canvas, ch);
  return ch;
}

export function createBMIChart(canvas, measurements, onPointClick) {
  destroy('bmi');
  const c = getCOLORS();
  const ch = new Chart(canvas, {
    type: 'line',
    data: { datasets: [ds('BMI', pts(measurements, 'bmi'), c.bmi)] },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: interaction(),
      onClick: makeOnClick(measurements, onPointClick),
      plugins: {
        legend: legend(), tooltip: tooltipOpts(),
        title: chartTitle('BMI'),
        bmiZones: { enabled: true },
        zoom: zoomOpts(measurements),
      },
      scales: {
        x: timeScale(),
        y: { ...yScale(), suggestedMin: 15, suggestedMax: 35 },
      },
    },
  });
  instances.bmi = ch;
  addDblClickReset(canvas, ch);
  return ch;
}

export function createVisceralChart(canvas, measurements, onPointClick) {
  destroy('visceral');
  const c = getCOLORS();
  const ch = new Chart(canvas, {
    type: 'line',
    data: {
      datasets: [
        ds('Visceral Fat', pts(measurements, 'visceralFat'), c.visceral, { yAxisID: 'y' }),
        ds('Metabolic Age', pts(measurements, 'metabolicAge'), c.metabolicAge, { yAxisID: 'y1' }),
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: interaction(),
      onClick: makeOnClick(measurements, onPointClick),
      plugins: {
        legend: legend(), tooltip: tooltipOpts(),
        title: chartTitle('Visceral Fat & Metabolic Age'),
        visceralZones: { enabled: true },
        zoom: zoomOpts(measurements),
      },
      scales: {
        x: timeScale(),
        y: { ...yScale('Visceral Fat Rating'), position: 'left', suggestedMin: 1, suggestedMax: 20 },
        y1: { ...yScale('Metabolic Age (yr)'), position: 'right', grid: { drawOnChartArea: false } },
      },
    },
  });
  instances.visceral = ch;
  addDblClickReset(canvas, ch);
  return ch;
}

export function createCaloriesChart(canvas, measurements, onPointClick) {
  destroy('calories');
  const c = getCOLORS();
  const ch = new Chart(canvas, {
    type: 'line',
    data: { datasets: [ds('DCI', pts(measurements, 'dailyCalories'), c.calories)] },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: interaction(),
      onClick: makeOnClick(measurements, onPointClick),
      plugins: {
        legend: legend(), tooltip: tooltipOpts(),
        title: chartTitle('Daily Calorie Intake (kcal)'),
        zoom: zoomOpts(measurements),
      },
      scales: { x: timeScale(), y: yScale('kcal') },
    },
  });
  instances.calories = ch;
  addDblClickReset(canvas, ch);
  return ch;
}

// ── Segment Radar Charts (split: fat % + muscle kg) ─────

export function createSegmentFatChart(canvas, measurement) {
  destroy('segFat');
  if (!measurement) return null;

  const c = getCOLORS();
  const labels = ['Right Arm', 'Left Arm', 'Right Leg', 'Left Leg', 'Torso'];
  const keys = ['rightArm', 'leftArm', 'rightLeg', 'leftLeg', 'torso'];
  const data = keys.map(k => measurement.segments[k].fat);
  const dateStr = fmtDate(measurement.date);

  instances.segFat = new Chart(canvas, {
    type: 'radar',
    data: {
      labels,
      datasets: [{
        label: 'Fat %',
        data,
        borderColor: c.fat,
        backgroundColor: c.fat + '33',
        borderWidth: 2,
        pointBackgroundColor: c.fat,
        pointRadius: 4,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: chartTitle(`Segment Fat % — ${dateStr}`),
      },
      scales: {
        r: {
          grid: { color: c.grid },
          angleLines: { color: c.grid },
          pointLabels: { color: c.textLight, font: { size: 11 } },
          ticks: { color: c.text, backdropColor: 'transparent' },
          suggestedMin: 0,
        },
      },
    },
  });
  return instances.segFat;
}

export function createSegmentMuscleChart(canvas, measurement) {
  destroy('segMuscle');
  if (!measurement) return null;

  const c = getCOLORS();
  const labels = ['Right Arm', 'Left Arm', 'Right Leg', 'Left Leg', 'Torso'];
  const keys = ['rightArm', 'leftArm', 'rightLeg', 'leftLeg', 'torso'];
  const data = keys.map(k => measurement.segments[k].muscle);
  const dateStr = fmtDate(measurement.date);

  instances.segMuscle = new Chart(canvas, {
    type: 'radar',
    data: {
      labels,
      datasets: [{
        label: 'Muscle (kg)',
        data,
        borderColor: c.muscle,
        backgroundColor: c.muscle + '33',
        borderWidth: 2,
        pointBackgroundColor: c.muscle,
        pointRadius: 4,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: chartTitle(`Segment Muscle (kg) — ${dateStr}`),
      },
      scales: {
        r: {
          grid: { color: c.grid },
          angleLines: { color: c.grid },
          pointLabels: { color: c.textLight, font: { size: 11 } },
          ticks: { color: c.text, backdropColor: 'transparent' },
          suggestedMin: 0,
        },
      },
    },
  });
  return instances.segMuscle;
}

// ── Segment Time-Series Charts ──────────────────────────

export function createSegmentFatTimeChart(canvas, measurements, onPointClick) {
  destroy('segFatTime');
  const sc = getSegmentColors();
  const keys = ['rightArm', 'leftArm', 'rightLeg', 'leftLeg', 'torso'];
  const datasets = keys.map(k =>
    ds(SEGMENT_LABELS[k], pts(measurements, m => m.segments[k].fat), sc[k])
  );
  const ch = new Chart(canvas, {
    type: 'line',
    data: { datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: interaction(),
      onClick: makeOnClick(measurements, onPointClick),
      plugins: {
        legend: legend(), tooltip: tooltipOpts(),
        title: chartTitle('Segment Fat % Over Time'),
        zoom: zoomOpts(measurements),
      },
      scales: { x: timeScale(), y: yScale('%') },
    },
  });
  instances.segFatTime = ch;
  addDblClickReset(canvas, ch);
  return ch;
}

export function createSegmentMuscleTimeChart(canvas, measurements, onPointClick) {
  destroy('segMuscleTime');
  const sc = getSegmentColors();
  const keys = ['rightArm', 'leftArm', 'rightLeg', 'leftLeg', 'torso'];
  const datasets = keys.map(k =>
    ds(SEGMENT_LABELS[k], pts(measurements, m => m.segments[k].muscle), sc[k])
  );
  const ch = new Chart(canvas, {
    type: 'line',
    data: { datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: interaction(),
      onClick: makeOnClick(measurements, onPointClick),
      plugins: {
        legend: legend(), tooltip: tooltipOpts(),
        title: chartTitle('Segment Muscle (kg) Over Time'),
        zoom: zoomOpts(measurements),
      },
      scales: { x: timeScale(), y: yScale('kg') },
    },
  });
  instances.segMuscleTime = ch;
  addDblClickReset(canvas, ch);
  return ch;
}

function fmtDate(d) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
