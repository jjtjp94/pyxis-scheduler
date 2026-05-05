# Pyxis Strategy Center — Update Notes

## Two files changed

Replace the existing files in your project with:

- `src/App.jsx`  → full rewrite
- `package.json` → adds `recharts` and `papaparse`

## Setup

```bash
npm install
npm run dev
```

## What changed

### New: Analytics tab
- Date range filter (start/end date pickers)
- Percentile slider that also feeds the Scheduler
- Three summary cards: total transactions, Nth-percentile daily session time, nurse interruptions
- Main chart: session time or volume, stacked by Group (North/South/SCCT) or broken out by Device
- Interruptions chart below: daily Refill CANCELLED count

### New: Live data in Scheduler
- When CSV data is loaded, the Scheduler uses real per-device daily session totals instead of hardcoded baseline values
- Falls back to baseline if no CSV is loaded

### New: Data loading (Load Data button + Data Engine tab)
- Load CSV via file upload or paste
- New data appends to existing data (add new date ranges over time)
- Delete individual batches from the Data Engine tab
- Only Non-CS Med rows are imported

## CSV format expected
Columns used: Device, TransactionDateTime, MedClass, SessionLength, TransactionType

TransactionType = "Refill CANCELLED" is treated as a nurse interruption.
All other rows count toward session time and volume.

## How session time feeds the Scheduler

For each device, the app computes:
- Daily session total = sum of all SessionLength values for that device on each day
- Median, 85th percentile, and max of those daily totals across all loaded dates
- The Scheduler percentile slider interpolates between those three values

This means "time for this device" now means "how long will it take to refill
this unit today" — not time-per-item.
