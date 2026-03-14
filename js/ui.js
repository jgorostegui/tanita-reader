// js/ui.js — UI components: drop zone, metric cards, filters, table

/**
 * Show one view and hide the other.
 */
export function showView(view) {
  document.getElementById('upload-view').classList.toggle('hidden', view !== 'upload');
  document.getElementById('dashboard-view').classList.toggle('hidden', view !== 'dashboard');
}

// ── Drop Zone ───────────────────────────────────────────

export function setupDropZone(onFiles) {
  const zone = document.getElementById('drop-zone');
  const input = document.getElementById('file-input');

  zone.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    if (input.files.length) onFiles([...input.files]);
  });

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('dragover');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    if (e.dataTransfer.files.length) onFiles([...e.dataTransfer.files]);
  });
}

// ── Upload Feedback ─────────────────────────────────────

export function showUploadError(message) {
  clearUploadFeedback();
  const container = document.querySelector('.upload-container');
  const div = document.createElement('div');
  div.className = 'upload-error';
  div.textContent = message;
  container.appendChild(div);
}

export function showUploadSuccess(count) {
  clearUploadFeedback();
  const container = document.querySelector('.upload-container');
  const div = document.createElement('div');
  div.className = 'upload-success';
  div.textContent = `Loaded ${count} measurement${count !== 1 ? 's' : ''}`;
  container.appendChild(div);
  setTimeout(() => { div.style.opacity = '0'; }, 2000);
  setTimeout(() => { div.remove(); }, 2500);
}

function clearUploadFeedback() {
  document.querySelectorAll('.upload-error, .upload-success').forEach(el => el.remove());
}

// ── Info Bar ────────────────────────────────────────────

export function renderInfoBar(measurements, slotNumber) {
  const bar = document.getElementById('info-bar');
  if (!measurements.length) { bar.innerHTML = ''; return; }

  const first = measurements[0].date;
  const last = measurements[measurements.length - 1].date;
  const fmt = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const days = Math.round((last - first) / 86400000);

  bar.innerHTML = `
    <span class="info-item"><strong>${measurements.length}</strong> measurements</span>
    <span class="info-item">${fmt(first)} &mdash; ${fmt(last)}</span>
    <span class="info-item"><strong>${days}</strong> days span</span>
    <span class="info-item">Slot <strong>${slotNumber}</strong></span>
  `;
}

// ── Metric Cards ────────────────────────────────────────

const METRICS = [
  { key: 'weight', label: 'Weight', unit: 'kg', decimals: 1 },
  { key: 'bodyFat', label: 'Body Fat', unit: '%', decimals: 1 },
  { key: 'muscleMass', label: 'Muscle Mass', unit: 'kg', decimals: 1 },
  { key: 'bmi', label: 'BMI', unit: '', decimals: 1 },
  { key: 'bodyWater', label: 'Body Water', unit: '%', decimals: 1 },
  { key: 'visceralFat', label: 'Visceral Fat', unit: '', decimals: 0 },
  { key: 'metabolicAge', label: 'Metabolic Age', unit: 'yr', decimals: 0 },
  { key: 'dailyCalories', label: 'Daily Calories', unit: 'kcal', decimals: 0 },
];

function getHealthIndicator(key, value, measurement) {
  if (key === 'bodyFat') {
    const isFemale = measurement.gender === 2;
    if (isFemale) {
      if (value < 14) return { label: 'Underfat', cls: 'health-underfat' };
      if (value <= 28) return { label: 'Healthy', cls: 'health-healthy' };
      if (value <= 32) return { label: 'Overfat', cls: 'health-overfat' };
      return { label: 'Obese', cls: 'health-obese' };
    }
    if (value < 6) return { label: 'Underfat', cls: 'health-underfat' };
    if (value <= 20) return { label: 'Healthy', cls: 'health-healthy' };
    if (value <= 25) return { label: 'Overfat', cls: 'health-overfat' };
    return { label: 'Obese', cls: 'health-obese' };
  }
  if (key === 'visceralFat') {
    if (value <= 12) return { label: 'Healthy', cls: 'health-healthy' };
    return { label: 'Excess', cls: 'health-obese' };
  }
  if (key === 'bmi') {
    if (value < 18.5) return { label: 'Underweight', cls: 'health-underfat' };
    if (value < 25) return { label: 'Normal', cls: 'health-healthy' };
    if (value < 30) return { label: 'Overweight', cls: 'health-overfat' };
    return { label: 'Obese', cls: 'health-obese' };
  }
  return null;
}

function computeStats(measurements, key) {
  const vals = measurements.map(m => m[key]);
  const sum = vals.reduce((a, b) => a + b, 0);
  return {
    avg: sum / vals.length,
    min: Math.min(...vals),
    max: Math.max(...vals),
  };
}

export function renderMetricCards(measurements) {
  const container = document.getElementById('metric-cards');
  if (!measurements.length) {
    container.innerHTML = '<div class="empty-state">No data for selected range</div>';
    return;
  }

  const latest = measurements[measurements.length - 1];
  const prev = measurements.length > 1 ? measurements[measurements.length - 2] : null;

  container.innerHTML = METRICS.map(({ key, label, unit, decimals }) => {
    const val = latest[key];
    const valStr = val.toFixed(decimals);
    const stats = computeStats(measurements, key);

    let deltaHTML = '';
    if (prev) {
      const diff = val - prev[key];
      if (Math.abs(diff) > 0.01) {
        const sign = diff > 0 ? '+' : '';
        const arrow = diff > 0 ? '&#9650;' : '&#9660;';
        const cls = diff > 0 ? 'up' : 'down';
        deltaHTML = `<div class="delta ${cls}">${arrow} ${sign}${diff.toFixed(decimals)}</div>`;
      } else {
        deltaHTML = '<div class="delta neutral">&mdash;</div>';
      }
    }

    const indicator = getHealthIndicator(key, val, latest);
    const badgeHTML = indicator
      ? `<div><span class="health-badge ${indicator.cls}">${indicator.label}</span></div>`
      : '';
    const healthMod = indicator ? ` metric-card--${indicator.cls.replace('health-', '')}` : '';
    const accentClass = key === 'weight' ? ' card--primary' : key === 'bodyFat' ? ' card--rose' : '';

    return `
      <div class="metric-card${healthMod}${accentClass}">
        <div class="label">${label}</div>
        <div class="value">${valStr}<span class="unit"> ${unit}</span></div>
        ${deltaHTML}
        ${badgeHTML}
        <div class="stats">
          <span class="stat-item"><span class="stat-label">avg</span> <span class="stat-value">${stats.avg.toFixed(decimals)}</span></span>
          <span class="stat-item"><span class="stat-label">min</span> <span class="stat-value">${stats.min.toFixed(decimals)}</span></span>
          <span class="stat-item"><span class="stat-label">max</span> <span class="stat-value">${stats.max.toFixed(decimals)}</span></span>
        </div>
      </div>`;
  }).join('');
}

// ── Slot Selector ───────────────────────────────────────

export function renderSlotSelector(slots, activeSlot, onChange) {
  const container = document.getElementById('slot-selector');
  if (slots.length <= 1) { container.innerHTML = ''; return; }

  container.innerHTML = slots.map(s =>
    `<button class="btn-group__item ${s === activeSlot ? 'active' : ''}" data-slot="${s}">Slot ${s}</button>`
  ).join('');

  container.querySelectorAll('.btn-group__item').forEach(btn => {
    btn.addEventListener('click', () => onChange(parseInt(btn.dataset.slot)));
  });
}

// ── Date Range Filter ───────────────────────────────────

export function setupDateFilter(onChange) {
  document.getElementById('date-from').addEventListener('change', onChange);
  document.getElementById('date-to').addEventListener('change', onChange);
}

function getDateRange() {
  const fromVal = document.getElementById('date-from').value;
  const toVal = document.getElementById('date-to').value;
  return {
    from: fromVal ? new Date(fromVal + 'T00:00:00') : null,
    to: toVal ? new Date(toVal + 'T23:59:59') : null,
  };
}

export function filterByDateRange(measurements) {
  const { from, to } = getDateRange();
  return measurements.filter(m => {
    if (from && m.date < from) return false;
    if (to && m.date > to) return false;
    return true;
  });
}

// ── Date Presets ────────────────────────────────────────

export function setupDatePresets(allMeasurements, onApply) {
  const container = document.getElementById('date-presets');

  container.querySelectorAll('.btn-group__item').forEach(btn => {
    // Remove old listeners by cloning
    const clone = btn.cloneNode(true);
    btn.replaceWith(clone);
  });

  container.querySelectorAll('.btn-group__item').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset;
      const last = allMeasurements[allMeasurements.length - 1]?.date;
      if (!last) return;

      let from;
      if (preset === 'all') {
        from = allMeasurements[0].date;
      } else if (preset === '30d') {
        from = new Date(last.getTime() - 30 * 86400000);
      } else if (preset === '6m') {
        from = new Date(last.getFullYear(), last.getMonth() - 6, last.getDate());
      } else if (preset === '1y') {
        from = new Date(last.getFullYear() - 1, last.getMonth(), last.getDate());
      } else if (preset === '1.5y') {
        from = new Date(last.getFullYear(), last.getMonth() - 18, last.getDate());
      } else if (preset === '2y') {
        from = new Date(last.getFullYear() - 2, last.getMonth(), last.getDate());
      } else if (preset === '3y') {
        from = new Date(last.getFullYear() - 3, last.getMonth(), last.getDate());
      }

      const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      document.getElementById('date-from').value = fmt(from);
      document.getElementById('date-to').value = fmt(last);

      // Update active state
      container.querySelectorAll('.btn-group__item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      onApply();
    });
  });
}

// ── Aggregation Mode ────────────────────────────────────

export function setupAggregationMode(activeMode, onChange) {
  const container = document.getElementById('aggregation-mode');
  if (!container) return;

  container.querySelectorAll('.btn-group__item').forEach(btn => {
    const clone = btn.cloneNode(true);
    btn.replaceWith(clone);
  });

  container.querySelectorAll('.btn-group__item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === activeMode);
    btn.addEventListener('click', () => {
      container.querySelectorAll('.btn-group__item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onChange(btn.dataset.mode);
    });
  });
}

// ── Segment Slider ──────────────────────────────────────

export function setupSegmentSlider(measurements, onChange) {
  const slider = document.getElementById('segment-slider');
  const dateLabel = document.getElementById('segment-date');

  if (!measurements.length) {
    slider.max = 0;
    slider.value = 0;
    dateLabel.textContent = '';
    return;
  }

  slider.min = 0;
  slider.max = measurements.length - 1;
  slider.value = measurements.length - 1;

  const updateLabel = (idx) => {
    const m = measurements[idx];
    if (m) {
      dateLabel.textContent = m.date.toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
    }
  };

  updateLabel(measurements.length - 1);

  // Remove old listeners by cloning
  const clone = slider.cloneNode(true);
  slider.replaceWith(clone);
  const newSlider = document.getElementById('segment-slider');

  newSlider.addEventListener('input', () => {
    const idx = parseInt(newSlider.value);
    updateLabel(idx);
    onChange(measurements[idx], idx);
  });
}

/**
 * Set the segment slider to a specific index (e.g. when clicking a chart point).
 */
export function setSegmentSliderIndex(idx) {
  const slider = document.getElementById('segment-slider');
  slider.value = idx;
  slider.dispatchEvent(new Event('input'));
}

// ── Data View (Summary + Grid) ──────────────────────────

const DATA_VIEW_METRICS = [
  { key: 'weight', label: 'Weight', unit: 'kg', decimals: 1, lowerBetter: true },
  { key: 'bodyFat', label: 'Fat %', unit: '%', decimals: 1, lowerBetter: true },
  { key: 'muscleMass', label: 'Muscle', unit: 'kg', decimals: 1, lowerBetter: false },
  { key: 'bmi', label: 'BMI', unit: '', decimals: 1, lowerBetter: true },
  { key: 'bodyWater', label: 'Water %', unit: '%', decimals: 1, lowerBetter: false },
  { key: 'visceralFat', label: 'Visc. Fat', unit: '', decimals: 0, lowerBetter: true },
  { key: 'metabolicAge', label: 'Met. Age', unit: 'yr', decimals: 0, lowerBetter: true },
  { key: 'dailyCalories', label: 'DCI', unit: 'kcal', decimals: 0, lowerBetter: false },
];

let currentDataView = 'grid';
let dataViewMeasurements = [];

export function renderDataView(measurements) {
  dataViewMeasurements = measurements;
  const container = document.getElementById('data-view-container');
  if (!measurements.length) {
    container.innerHTML = '<div class="empty-state">No data for selected range</div>';
    return;
  }
  if (currentDataView === 'summary') {
    renderSummaryTable(container, measurements);
  } else {
    renderGridTable(container, measurements);
  }
}

export function setupDataViewToggle() {
  const toggle = document.getElementById('data-view-toggle');
  toggle.querySelectorAll('.btn-group__item').forEach(btn => {
    btn.addEventListener('click', () => {
      toggle.querySelectorAll('.btn-group__item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentDataView = btn.dataset.view;
      renderDataView(dataViewMeasurements);
    });
  });
}

function renderSummaryTable(container, measurements) {
  const sorted = [...measurements].reverse();
  const headerCells = DATA_VIEW_METRICS.map(m => `<th>${m.label}</th>`).join('');

  const rows = sorted.map((m, i) => {
    const prev = i < sorted.length - 1 ? sorted[i + 1] : null;
    const dateStr = fmtDateShort(m.date);

    const cells = DATA_VIEW_METRICS.map(({ key, decimals, lowerBetter }) => {
      const val = m[key];
      const valStr = val.toFixed(decimals);
      let deltaHTML = '<span class="val-delta flat">&mdash;</span>';

      if (prev) {
        const diff = val - prev[key];
        if (Math.abs(diff) > 0.01) {
          const sign = diff > 0 ? '+' : '';
          const improved = lowerBetter ? diff < 0 : diff > 0;
          const cls = improved ? 'better' : 'worse';
          deltaHTML = `<span class="val-delta ${cls}">${sign}${diff.toFixed(decimals)}</span>`;
        }
      }

      return `<td class="val-cell"><span class="val-main">${valStr}</span>${deltaHTML}</td>`;
    }).join('');

    return `<tr><td class="period-cell">${dateStr}</td>${cells}</tr>`;
  }).join('');

  container.innerHTML = `
    <table class="summary-table">
      <thead><tr><th>Date</th>${headerCells}</tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

const SEGMENT_METRICS = [
  { seg: 'rightArm', label: 'R. Arm', fatKey: 'fat', muscleKey: 'muscle' },
  { seg: 'leftArm', label: 'L. Arm', fatKey: 'fat', muscleKey: 'muscle' },
  { seg: 'rightLeg', label: 'R. Leg', fatKey: 'fat', muscleKey: 'muscle' },
  { seg: 'leftLeg', label: 'L. Leg', fatKey: 'fat', muscleKey: 'muscle' },
  { seg: 'torso', label: 'Torso', fatKey: 'fat', muscleKey: 'muscle' },
];

function gridRow(data, label, unit, decimals, lowerBetter, accessor) {
  const vals = data.map(accessor);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min;

  const cells = data.map(m => {
    const val = accessor(m);
    const valStr = val.toFixed(decimals);
    let style = '';
    if (range > 0) {
      const t = lowerBetter
        ? 1 - (val - min) / range
        : (val - min) / range;
      const color = t >= 0.5
        ? `rgba(110, 231, 183, ${((t - 0.5) * 2 * 0.15).toFixed(3)})`
        : `rgba(240, 171, 171, ${((0.5 - t) * 2 * 0.15).toFixed(3)})`;
      style = ` style="background:${color}"`;
    }
    return `<td${style}>${valStr}</td>`;
  }).join('');

  const unitStr = unit ? `<span class="grid-unit">${unit}</span>` : '';
  return `<tr><td>${label}${unitStr}</td>${cells}</tr>`;
}

function gridSeparator(label, colCount) {
  return `<tr class="grid-separator"><td colspan="${colCount + 1}">${label}</td></tr>`;
}

function renderGridTable(container, measurements) {
  const maxCols = 10;
  const data = measurements.length > maxCols
    ? measurements.slice(-maxCols)
    : measurements;

  const headerCells = data.map(m =>
    `<th>${m.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</th>`
  ).join('');

  const mainRows = DATA_VIEW_METRICS.map(({ key, label, unit, decimals, lowerBetter }) =>
    gridRow(data, label, unit, decimals, lowerBetter, m => m[key])
  ).join('');

  const fatRows = SEGMENT_METRICS.map(({ seg, label }) =>
    gridRow(data, label, '%', 1, true, m => m.segments[seg].fat)
  ).join('');

  const muscleRows = SEGMENT_METRICS.map(({ seg, label }) =>
    gridRow(data, label, 'kg', 1, false, m => m.segments[seg].muscle)
  ).join('');

  container.innerHTML = `
    <table class="grid-table">
      <thead><tr><th>Metric</th>${headerCells}</tr></thead>
      <tbody>
        ${mainRows}
        ${gridSeparator('Segment Fat %', data.length)}
        ${fatRows}
        ${gridSeparator('Segment Muscle', data.length)}
        ${muscleRows}
      </tbody>
    </table>`;
}

// ── Comparison Panel ────────────────────────────────────

const COMPARISON_METRICS = [
  { key: 'weight', label: 'Weight', unit: 'kg', decimals: 1, lowerBetter: true },
  { key: 'bodyFat', label: 'Body Fat', unit: '%', decimals: 1, lowerBetter: true },
  { key: 'muscleMass', label: 'Muscle', unit: 'kg', decimals: 1, lowerBetter: false },
  { key: 'bmi', label: 'BMI', unit: '', decimals: 1, lowerBetter: true },
  { key: 'bodyWater', label: 'Water', unit: '%', decimals: 1, lowerBetter: false },
  { key: 'visceralFat', label: 'Visc. Fat', unit: '', decimals: 0, lowerBetter: true },
  { key: 'metabolicAge', label: 'Met. Age', unit: 'yr', decimals: 0, lowerBetter: true },
  { key: 'dailyCalories', label: 'DCI', unit: 'kcal', decimals: 0, lowerBetter: false },
  { key: 'boneMass', label: 'Bone', unit: 'kg', decimals: 1, lowerBetter: false },
];

function fmtDateShort(d) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

let compEscHandler = null;

function getOrCreateOverlay() {
  let overlay = document.querySelector('.comp-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'comp-overlay';
    document.body.appendChild(overlay);
  }
  return overlay;
}

function closeComparisonPanel() {
  const panel = document.getElementById('comparison-panel');
  const overlay = document.querySelector('.comp-overlay');
  panel.classList.remove('visible');
  if (overlay) overlay.classList.remove('visible');
  document.getElementById('dashboard-view').style.paddingBottom = '';
  if (compEscHandler) {
    document.removeEventListener('keydown', compEscHandler);
    compEscHandler = null;
  }
  setTimeout(() => {
    panel.classList.add('hidden');
    panel.innerHTML = '';
  }, 300);
}

export function renderComparisonPanel(selected, latest) {
  const panel = document.getElementById('comparison-panel');
  if (!selected || !latest || selected === latest) {
    closeComparisonPanel();
    return;
  }

  const rows = COMPARISON_METRICS.map(({ key, label, unit, decimals, lowerBetter }) => {
    const selVal = selected[key];
    const latVal = latest[key];
    const diff = latVal - selVal;
    const absDiff = Math.abs(diff);
    let cls = 'neutral';
    if (absDiff > 0.01) {
      const improved = lowerBetter ? diff < 0 : diff > 0;
      cls = improved ? 'improved' : 'worsened';
    }
    const sign = diff > 0 ? '+' : '';
    const diffStr = absDiff > 0.01 ? `${sign}${diff.toFixed(decimals)}` : '—';

    return `
      <div class="comp-row">
        <span class="comp-label">${label}</span>
        <span class="comp-val">${selVal.toFixed(decimals)}${unit ? ' ' + unit : ''}</span>
        <span class="comp-delta ${cls}">${diffStr}</span>
        <span class="comp-val">${latVal.toFixed(decimals)}${unit ? ' ' + unit : ''}</span>
      </div>`;
  }).join('');

  panel.innerHTML = `
    <div class="comp-header">
      <h3>Comparison</h3>
      <button class="btn-secondary comp-close" id="comp-close">Close</button>
    </div>
    <div class="comp-columns">
      <div class="comp-row comp-row-header">
        <span class="comp-label"></span>
        <span class="comp-val">Selected<br><small>${fmtDateShort(selected.date)}</small></span>
        <span class="comp-delta">Delta</span>
        <span class="comp-val">Latest<br><small>${fmtDateShort(latest.date)}</small></span>
      </div>
      ${rows}
    </div>`;
  panel.classList.remove('hidden');

  const overlay = getOrCreateOverlay();

  // Slide up with rAF for smooth transition
  requestAnimationFrame(() => {
    panel.classList.add('visible');
    overlay.classList.add('visible');
    // Set padding based on actual panel height
    const h = panel.offsetHeight;
    document.getElementById('dashboard-view').style.paddingBottom = h + 'px';
  });

  // Close handlers (use assignment to avoid stacking listeners)
  document.getElementById('comp-close').onclick = closeComparisonPanel;
  overlay.onclick = closeComparisonPanel;

  if (compEscHandler) document.removeEventListener('keydown', compEscHandler);
  compEscHandler = (e) => { if (e.key === 'Escape') closeComparisonPanel(); };
  document.addEventListener('keydown', compEscHandler);
}

// ── New Upload Button ───────────────────────────────────

export function setupNewUploadButton(onReset) {
  document.getElementById('btn-new-upload').addEventListener('click', onReset);
}
