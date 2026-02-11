# Tanita Reader

**[Live Demo](https://jgorostegui.github.io/tanita-reader/)**

A web dashboard for visualizing body composition data exported from Tanita BC-601 / BC-603 scales.

The Tanita BC-601 stores years of body composition data on an SD card, but the official software is Windows-only, abandoned, and barely functional. This dashboard lets you drop your CSV files into a browser and actually see your data.

## Features

- **Long-term trends** — see how your weight, body fat, muscle mass, BMI, and visceral fat evolve over months and years
- **Body composition breakdown** — fat mass vs muscle mass vs bone mass charted over time, not just the single reading on the scale's screen
- **Segmental analysis** — per-limb and torso fat % and muscle mass as radar charts and time series, so you can spot asymmetries and track targeted training
- **Health context** — BMI and visceral fat charts show healthy/overweight/obese zones as background bands, and metric cards flag your current status
- **Measurement comparison** — click any past data point to see a side-by-side delta against your latest measurement
- **Aggregation** — smooth out noise by switching between daily, weekly, or monthly averages
- **Date filtering** — zoom into the last 30 days, 6 months, 1 year, or any custom range
- **Multi-slot** — if multiple people use the same scale, switch between all 8 user slots
- **Full data table** — every measurement sortable by any column
- **Privacy** — all processing happens locally in the browser, nothing is uploaded anywhere

## Usage

1. Remove the SD card from your Tanita BC-601 or BC-603 scale
2. Open the dashboard in a browser
3. Drop the `DATA*.CSV` files onto the upload zone (or click to select)

The scale stores measurements in `DATA/DATA1.CSV` through `DATA/DATA8.CSV` (one file per user slot).

## Development

Static site — no build step. Open `index.html` directly or serve with any static file server.

```bash
# Install dev dependencies (linting & tests only)
npm install

# Run tests
npm test

# Lint
npm run lint:js
npm run lint:css
```

## Tech Stack

- Vanilla JavaScript (ES modules, no framework)
- [Chart.js v4](https://www.chartjs.org/) with date-fns adapter and zoom plugin
- CSS custom properties for theming

## License

MIT
