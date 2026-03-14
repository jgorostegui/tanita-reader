# Tanita Reader

[![CI](https://github.com/jgorostegui/tanita-reader/actions/workflows/ci.yml/badge.svg)](https://github.com/jgorostegui/tanita-reader/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub Pages](https://img.shields.io/badge/demo-live-green)](https://jgorostegui.github.io/tanita-reader/?demo)

**[Open App](https://jgorostegui.github.io/tanita-reader/)** · **[Try with demo data](https://jgorostegui.github.io/tanita-reader/?demo)**

A browser-based dashboard for Tanita BC-601 / BC-603 body composition data. Drop your SD card CSV files and get charts, tables, and segmental breakdowns. No install, no server, no data leaves your browser.

The official Tanita software (BodyVision) is Windows-only, abandoned, and barely functional. This replaces it.

![Demo](assets/demo.gif)

## Features

- Weight, body fat, muscle mass, BMI, visceral fat, metabolic age, calories over time
- Fat mass vs muscle mass vs bone mass breakdown
- Per-limb and torso fat % and muscle mass (radar charts + time series)
- BMI and visceral fat charts with health zone bands
- Click any data point to compare it against your latest reading
- History grid with conditional color scale, plus a summary view with period deltas
- Daily, weekly, or monthly aggregation
- Date presets (30d, 6m, 1y, 1.5y, 2y, 3y, all) or custom range
- 8 user slots
- Dark and light theme

## Usage

1. Remove the SD card from your Tanita BC-601 or BC-603
2. Open the [dashboard](https://jgorostegui.github.io/tanita-reader/)
3. Drop your `DATA*.CSV` files onto the upload zone

The scale stores measurements in `DATA/DATA1.CSV` through `DATA/DATA8.CSV`, one file per user slot.

## Built with

- Vanilla JS (ES modules, no framework, no bundler)
- [Chart.js v4](https://www.chartjs.org/) with date-fns adapter and zoom plugin
- CSS custom properties for theming
- Everything runs client-side. No backend.

## Development

No build step. Open `index.html` directly or serve locally.

```bash
npm install          # dev dependencies only
npm test             # unit tests
npm run lint         # eslint + stylelint
npm run serve        # python3 -m http.server 8080
just record-demo     # re-record demo gif (requires playwright + ffmpeg)
```

## Contributing

Issues and pull requests are welcome. The codebase is small (4 JS files, 1 CSS file), so getting oriented should be quick. Run `npm test && npm run lint` before submitting.

## License

MIT
