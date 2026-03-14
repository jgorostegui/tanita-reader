# Tanita Reader

**[Open App](https://jgorostegui.github.io/tanita-reader/)** · **[Try with demo data](https://jgorostegui.github.io/tanita-reader/?demo)**

A web dashboard for visualizing body composition data exported from Tanita BC-601 / BC-603 scales.

The Tanita BC-601 stores body composition data on an SD card, but the official software is Windows-only, abandoned, and barely functional. This dashboard lets you drop your CSV files into a browser and actually see your data.

![Demo](assets/demo.gif)

## Features

- **Trends** — weight, body fat, muscle mass, BMI, visceral fat, metabolic age, and calories over time
- **Body composition** — fat mass vs muscle mass vs bone mass breakdown
- **Segmental analysis** — per-limb and torso fat % and muscle mass with radar charts and time series
- **Health zones** — BMI and visceral fat charts with healthy/overweight/obese bands
- **Measurement comparison** — click any data point to compare against your latest reading
- **History views** — summary table with period deltas or transposed metrics grid
- **Aggregation** — daily, weekly, or monthly averages
- **Date filtering** — 30 days, 6 months, 1–3 years, custom range, or all data
- **Multi-slot** — switch between all 8 user slots
- **Dark / light theme**
- **Privacy** — everything runs in your browser, nothing is uploaded

## Usage

1. Remove the SD card from your Tanita BC-601 or BC-603
2. Open the [dashboard](https://jgorostegui.github.io/tanita-reader/)
3. Drop your `DATA*.CSV` files onto the upload zone

The scale stores measurements in `DATA/DATA1.CSV` through `DATA/DATA8.CSV` (one file per user slot).

## Development

No build step. Open `index.html` directly or serve locally.

```bash
npm install          # dev dependencies only
npm test             # unit tests
npm run lint         # eslint + stylelint
npm run serve        # python3 -m http.server 8080
just record-demo     # re-record demo gif (requires playwright + ffmpeg)
```

## License

MIT
