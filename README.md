# Tanita Reader

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
