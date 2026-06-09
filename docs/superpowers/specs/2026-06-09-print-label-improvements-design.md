# Print Label Improvements

## Problem

The print label feature has several issues:

1. **Two disconnected print systems**: Browser `window.print()` and PrintJob queue (TSPL/ESC-POS) have no integration.
2. **Data in URL params**: All label data passed via URL search params — fragile, ugly, size-limited.
3. **Race condition**: `setTimeout(() => window.print(), 200)` — unreliable timing.
4. **Circular weight fallback**: `grossWeight ?? netWeight ?? quantity` loses original scale data. Original gross weight is not stored in DB.
5. **PrintJob queue is unused**: `POST /api/print-jobs` exists but no UI calls it. Payload says "TSPL or ESC-POS commands" but no TSPL generation exists.
6. **Fragile batch digit display**: Splits lot number into first 8 characters into a grid.

## Architecture

```
Print Label Click
  │
  ├── Try: POST /api/print-jobs { payload: TSPL commands }
  │     ├── Success → done (ESP32/bridge polls & prints)
  │     └── 404/error → fallback to browser print
  │
  └── Browser Print Fallback:
        sessionStorage.setItem('printLabel', data)
        → window.open('/print-label')
        → PrintLabelClient reads sessionStorage
        → window.print() on mount (no setTimeout)
```

## Changes

### 1. NEW: `lib/tspl.ts`
Generate TSPL (TSC Label Printer Language) commands for the label content:
- SIZE, GAP, DIRECTION, CODEPAGE headers
- TEXT commands for product name, company, weight, date
- BARCODE command for Code 128 barcode
- QRCODE command for QR code data
- PRINT command

### 2. MODIFY: `lib/label-print.ts`
- Add `createPrintJob(payload)` → `POST /api/print-jobs` with TSPL payload
- Add `printLabel(payload)` — tries `createPrintJob`, falls back to `openLabelPrintWindow`
- Modify `openLabelPrintWindow` — use `sessionStorage` instead of URL params
- Simplify `buildLabelPrintUrl` to just route path (no data in URL)

### 3. MODIFY: `app/print-label/page.tsx`
- Server component: just render the client component
- Remove all URL param parsing — no search params needed

### 4. MODIFY: `app/print-label/PrintLabelClient.tsx`
- Read label data from `sessionStorage` on mount
- Remove `setTimeout(() => window.print(), 200)`
- Use `window.print()` directly on mount (browser handles timing)
- Use `window.onafterprint` for cleanup
- Fix weight display: `grossWeight` and `netWeight` are both required; if absent, render "—"
- Add "Print" button if auto-print fails/closes

### 5. MODIFY: `app/api/print-jobs/route.ts`
- Accept `{ scaleId, payload }` where payload is TSPL commands
- Return success/error

### 6. MODIFY: `app/incoming/page.tsx`
- In `handlePrint()`: try `printLabel()` which tries PrintJob first, falls back to browser

### 7. MODIFY: `app/products/page.tsx`
- Same as incoming: use new `printLabel()` function

## Data Flow

```
handlePrint(incoming good data)
  │
  ├── payload = { productName, grossWeight, netWeight, unit, lotNumber, ... }
  │
  ├── printLabel(payload)
  │     ├── tspl = buildTSPL(payload)
  │     ├── await fetch('/api/print-jobs', { method: 'POST', body: { scaleId, payload: tspl } })
  │     │     └── success → done
  │     └── catch (no bridge / offline)
  │           └── sessionStorage.setItem('labelData', JSON.stringify(payload))
  │           └── window.open('/print-label', '_blank', 'noopener,noreferrer')
  │
  └── PrintLabelClient (on mount)
        ├── data = JSON.parse(sessionStorage.getItem('labelData'))
        ├── sessionStorage.removeItem('labelData')
        ├── render label
        └── window.print()
```

## Error Handling

- **No PrintJob bridge**: Fallback to browser print silently
- **sessionStorage empty**: Show error message, "Close and retry" button
- **Print dialog cancelled**: "Print" button visible on page to retry
- **Network error on PrintJob POST**: Silently fallback (no error toast)

## Non-Goals

- Changing the DB schema (Lot model changes, barcode/QR content) — separate concern
- Building the ESP32 bridge firmware — hardware concern
- Printer discovery UI
- PDF generation
