#!/usr/bin/env node

// scripts/record-demo.js — Record a demo video from lossless PNG screenshots
// Usage: node scripts/record-demo.js
// Outputs: assets/demo.mp4 + assets/demo.gif
// Temp:   assets/_frames/ (auto-created, auto-deleted)

import { chromium } from 'playwright';
import { execSync, spawn } from 'node:child_process';
import { mkdirSync, existsSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ASSETS = resolve(ROOT, 'assets');
const FRAMES = resolve(ASSETS, '_frames');

// ── Setup ───────────────────────────────────────────────

if (!existsSync(ASSETS)) mkdirSync(ASSETS, { recursive: true });
if (existsSync(FRAMES)) rmSync(FRAMES, { recursive: true });
mkdirSync(FRAMES);

const PORT = 8090;
const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: ROOT, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 800));

const WIDTH = 1400;
const HEIGHT = 800;
const FPS = 15;
const FRAME_MS = 1000 / FPS;

let frameNum = 0;
const wait = (ms) => new Promise(r => setTimeout(r, ms));

// ── Recording helpers ───────────────────────────────────

async function capture(page) {
  const path = resolve(FRAMES, `frame_${String(frameNum++).padStart(5, '0')}.png`);
  await page.screenshot({ path });
}

async function captureFor(page, ms) {
  const count = Math.round(ms / FRAME_MS);
  for (let i = 0; i < count; i++) {
    await capture(page);
  }
}

async function captureScroll(page, target, ms) {
  const startY = await page.evaluate(() => window.scrollY);
  const distance = target - startY;
  const count = Math.round(ms / FRAME_MS);
  for (let i = 0; i <= count; i++) {
    const p = i / count;
    const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
    await page.evaluate((y) => window.scrollTo(0, y), startY + distance * ease);
    await capture(page);
  }
}

// ── Main ────────────────────────────────────────────────

try {
  console.log('Launching browser...');
  const browser = await chromium.launch();
  const page = await (await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  })).newPage();

  await page.goto(`http://localhost:${PORT}?demo`);
  await page.waitForSelector('.metric-cards .metric-card', { timeout: 5000 });
  await wait(300);

  console.log('Recording frames...');

  // Dashboard overview
  await captureFor(page, 2000);

  // Grid table
  await captureScroll(page, 250, 1000);
  await captureFor(page, 1500);

  // Summary toggle
  await page.click('[data-view="summary"]');
  await captureFor(page, 1500);
  await page.click('[data-view="grid"]');
  await captureFor(page, 1000);

  // Trend charts
  await captureScroll(page, 650, 1200);
  await captureFor(page, 1500);

  // All data
  await page.click('[data-preset="all"]');
  await captureFor(page, 1800);

  // Scroll through charts
  await captureScroll(page, 1300, 1200);
  await captureFor(page, 1500);
  await captureScroll(page, 2000, 1200);
  await captureFor(page, 1500);

  // Segments
  await captureScroll(page, 2800, 1200);
  await captureFor(page, 1500);

  // Bottom
  const max = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  await captureScroll(page, max, 1200);
  await captureFor(page, 1500);

  // Back to top
  await captureScroll(page, 0, 1500);
  await captureFor(page, 1000);

  // Weekly
  await page.click('[data-mode="weekly"]');
  await captureFor(page, 1800);

  // Light theme
  await page.click('#btn-theme-toggle');
  await captureFor(page, 1800);
  await captureScroll(page, 400, 1000);
  await captureFor(page, 1200);

  // Back to dark
  await page.click('#btn-theme-toggle');
  await captureFor(page, 1200);
  await captureScroll(page, 0, 800);
  await captureFor(page, 800);

  await browser.close();
  console.log(`Captured ${frameNum} frames`);

  // ── Encode ──────────────────────────────────────────

  const mp4 = resolve(ASSETS, 'demo.mp4');
  const gif = resolve(ASSETS, 'demo.gif');

  console.log('Encoding MP4...');
  execSync(`ffmpeg -y -framerate ${FPS} -i "${FRAMES}/frame_%05d.png" -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -movflags +faststart "${mp4}"`, { stdio: 'pipe' });

  console.log('Encoding GIF...');
  execSync(`ffmpeg -y -i "${mp4}" -vf "fps=${FPS},split[s0][s1];[s0]palettegen=max_colors=256:stats_mode=diff[p];[s1][p]paletteuse=dither=none:diff_mode=rectangle" "${gif}"`, { stdio: 'pipe' });

  // ── Cleanup ─────────────────────────────────────────

  rmSync(FRAMES, { recursive: true });

  const sz = (f) => {
    const b = execSync(`stat -c%s "${f}"`).toString().trim();
    return (b / 1048576).toFixed(1) + 'MB';
  };

  console.log(`\nDone!`);
  console.log(`  MP4: ${mp4} (${sz(mp4)})`);
  console.log(`  GIF: ${gif} (${sz(gif)})`);
} finally {
  server.kill();
}
