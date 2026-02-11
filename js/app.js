// js/app.js — Entry point and orchestration

import { parseDataFile, parseProfileFile, classifyFile, getSlotNumber } from './parser.js';
import {
  destroyAll,
  resetAllZoom,
  createWeightChart,
  createWeightMuscleChart,
  createCompositionChart,
  createMassBreakdownChart,
  createBMIChart,
  createVisceralChart,
  createCaloriesChart,
  createSegmentFatChart,
  createSegmentMuscleChart,
  createSegmentFatTimeChart,
  createSegmentMuscleTimeChart,
} from './charts.js';
import {
  showView,
  setupDropZone,
  renderInfoBar,
  renderMetricCards,
  renderSlotSelector,
  setupDateFilter,
  setupDatePresets,
  filterByDateRange,
  setupAggregationMode,
  setupSegmentSlider,
  setSegmentSliderIndex,
  renderDataTable,
  setupTableToggle,
  renderComparisonPanel,
  setupNewUploadButton,
  showUploadError,
  showUploadSuccess,
} from './ui.js';

// ── State ───────────────────────────────────────────────

const dataSlots = {};
const profileSlots = {};
let activeSlot = 0;
let displayMode = 'daily'; // 'daily' | 'weekly' | 'monthly'

// ── Data Pipeline Helpers ───────────────────────────────

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const NUMERIC_FIELDS = [
  'weight', 'bmi', 'bodyFat', 'muscleMass', 'boneMass',
  'bodyWater', 'visceralFat', 'dailyCalories', 'metabolicAge', 'height',
];
const SEGMENT_KEYS = ['rightArm', 'leftArm', 'rightLeg', 'leftLeg', 'torso'];

function averageMeasurements(group) {
  if (group.length === 1) return group[0];
  const avg = { ...group[group.length - 1] };
  for (const field of NUMERIC_FIELDS) {
    const sum = group.reduce((s, m) => s + m[field], 0);
    avg[field] = +(sum / group.length).toFixed(2);
  }
  avg.segments = {};
  for (const seg of SEGMENT_KEYS) {
    const fatSum = group.reduce((s, m) => s + m.segments[seg].fat, 0);
    const muscleSum = group.reduce((s, m) => s + m.segments[seg].muscle, 0);
    avg.segments[seg] = {
      fat: +(fatSum / group.length).toFixed(1),
      muscle: +(muscleSum / group.length).toFixed(2),
    };
  }
  return avg;
}

function normalizeDailyMeasurements(measurements, mode = 'last') {
  if (measurements.length <= 1) return measurements;
  const groups = new Map();
  for (const m of measurements) {
    const key = dateKey(m.date);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(m);
  }
  const result = [];
  for (const group of groups.values()) {
    if (mode === 'average') {
      result.push(averageMeasurements(group));
    } else {
      result.push(group[group.length - 1]);
    }
  }
  result.sort((a, b) => a.date - b.date);
  return result;
}

function isoWeekKey(d) {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function aggregateMeasurements(measurements, mode = 'daily') {
  if (mode === 'daily' || measurements.length <= 1) return measurements;

  const keyFn = mode === 'weekly' ? isoWeekKey : monthKey;
  const groups = new Map();
  for (const m of measurements) {
    const key = keyFn(m.date);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(m);
  }

  const result = [];
  for (const group of groups.values()) {
    const avg = averageMeasurements(group);
    // Use midpoint date for the period
    const mid = new Date((group[0].date.getTime() + group[group.length - 1].date.getTime()) / 2);
    avg.date = mid;
    result.push(avg);
  }
  result.sort((a, b) => a.date - b.date);
  return result;
}

// ── File Loading ────────────────────────────────────────

async function readFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

async function handleFiles(files) {
  for (const file of files) {
    const type = classifyFile(file.name);
    const slot = getSlotNumber(file.name);
    if (type === 'unknown') continue;

    const text = await readFileText(file);

    if (type === 'data') {
      const measurements = parseDataFile(text);
      if (measurements.length) dataSlots[slot] = measurements;
    } else if (type === 'profile') {
      const profile = parseProfileFile(text);
      if (profile) profileSlots[slot] = profile;
    }
  }

  const slots = Object.keys(dataSlots).map(Number).sort((a, b) => a - b);
  if (!slots.length) {
    showUploadError('No measurement data found in the selected files.');
    return;
  }

  const totalMeasurements = Object.values(dataSlots).reduce((sum, arr) => sum + arr.length, 0);
  showUploadSuccess(totalMeasurements);

  activeSlot = slots[0];
  showView('dashboard');
  renderDashboard();
}

// ── Rendering Helpers ───────────────────────────────────

function getFilteredMeasurements() {
  const filtered = filterByDateRange(dataSlots[activeSlot] || []);
  return normalizeDailyMeasurements(filtered);
}

function getAggregatedMeasurements(daily) {
  return aggregateMeasurements(daily, displayMode);
}

function updateSegmentCharts(measurement) {
  createSegmentFatChart(document.getElementById('chart-segment-fat'), measurement);
  createSegmentMuscleChart(document.getElementById('chart-segment-muscle'), measurement);
}

function onPointClick(measurement, index) {
  updateSegmentCharts(measurement);
  setSegmentSliderIndex(index);
  const daily = getFilteredMeasurements();
  const latest = daily[daily.length - 1];
  renderComparisonPanel(measurement, latest);
}

function renderCharts(measurements) {
  destroyAll();

  createWeightChart(document.getElementById('chart-weight'), measurements, onPointClick);
  createWeightMuscleChart(document.getElementById('chart-weight-muscle'), measurements, onPointClick);
  createCompositionChart(document.getElementById('chart-composition'), measurements, onPointClick);
  createMassBreakdownChart(document.getElementById('chart-mass-breakdown'), measurements, onPointClick);
  createBMIChart(document.getElementById('chart-bmi'), measurements, onPointClick);
  createVisceralChart(document.getElementById('chart-visceral'), measurements, onPointClick);
  createCaloriesChart(document.getElementById('chart-calories'), measurements, onPointClick);

  createSegmentFatTimeChart(document.getElementById('chart-segment-fat-time'), measurements, onPointClick);
  createSegmentMuscleTimeChart(document.getElementById('chart-segment-muscle-time'), measurements, onPointClick);

  // Segment defaults to latest measurement
  if (measurements.length) {
    updateSegmentCharts(measurements[measurements.length - 1]);
  }
}

// ── Dashboard Rendering ─────────────────────────────────

function renderDashboard() {
  const slots = Object.keys(dataSlots).map(Number).sort((a, b) => a - b);
  const allMeasurements = dataSlots[activeSlot] || [];

  // Default to last 1 year
  if (allMeasurements.length) {
    const last = allMeasurements[allMeasurements.length - 1].date;
    const from = new Date(last.getFullYear() - 1, last.getMonth(), last.getDate());
    const fmt = d => d.toISOString().slice(0, 10);
    document.getElementById('date-from').value = fmt(from);
    document.getElementById('date-to').value = fmt(last);
  }
  const daily = getFilteredMeasurements();
  const measurements = getAggregatedMeasurements(daily);

  renderSlotSelector(slots, activeSlot, (slot) => {
    activeSlot = slot;
    renderDashboard();
  });

  renderInfoBar(measurements, activeSlot);
  renderMetricCards(daily);
  renderCharts(measurements);
  renderDataTable(measurements);
  setupTableToggle();

  setupDatePresets(allMeasurements, updateFromFilter);
  setupAggregationMode(displayMode, (mode) => {
    displayMode = mode;
    updateFromFilter();
  });

  setupSegmentSlider(measurements, (m) => {
    updateSegmentCharts(m);
  });
}

function updateFromFilter() {
  const daily = getFilteredMeasurements();
  const measurements = getAggregatedMeasurements(daily);

  renderInfoBar(measurements, activeSlot);
  renderMetricCards(daily);
  renderCharts(measurements);
  renderDataTable(measurements);
  setupTableToggle();

  setupSegmentSlider(measurements, (m) => {
    updateSegmentCharts(m);
  });
}

function resetToUpload() {
  destroyAll();
  for (const k of Object.keys(dataSlots)) delete dataSlots[k];
  for (const k of Object.keys(profileSlots)) delete profileSlots[k];
  activeSlot = 0;
  showView('upload');
}

// ── Init ────────────────────────────────────────────────

setupDropZone(handleFiles);
setupDateFilter(updateFromFilter);
setupNewUploadButton(resetToUpload);
document.getElementById('btn-reset-zoom').addEventListener('click', resetAllZoom);

// ── Theme ────────────────────────────────────────────────

const THEME_KEY = 'tanita-theme';

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);
  // Redraw charts with new theme colors
  const daily = getFilteredMeasurements();
  if (daily.length) {
    const measurements = getAggregatedMeasurements(daily);
    renderCharts(measurements);
  }
}

initTheme();
document.getElementById('btn-theme-toggle').addEventListener('click', toggleTheme);
