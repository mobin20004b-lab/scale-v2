# Reports Filter System — Design Spec

## Overview

Add a comprehensive filter system to the reports page (`/reports`) enabling users to narrow inventory ledger data by customer, Jalali date range, warehouse, product, operator, and more. The system is built for future Excel export by using server-side filtering throughout.

## Current State

The reports page shows inventory ledger entries with:
- 3 summary cards (total incoming, outgoing, transaction count)
- Type filter (ALL / STOCK_IN / STOCK_OUT)
- Date range quick-select (7d / 30d / 90d / year)
- Client-side full-text search across product, warehouse, customer, operator, type
- Client-side pagination (10 rows/page)

All filtering except the date range is done in-memory on the client.

## Architecture

**Full server-side filtering.** All filter parameters are sent as query params to `/api/reports`. The Prisma query builds a dynamic `where` clause from provided params. This ensures:
- Scalability with large datasets
- Correct summary card totals (reflect filtered data)
- Future Excel export of exactly the visible dataset
- Clean URL-serializable filter state

## API Changes

### `GET /api/reports?type=inventory`

Current params: `type`, `startDate`, `endDate`

New params (all optional):

| Param | Type | Source | Behavior |
|---|---|---|---|
| `startDate` | ISO string | Jalali date picker / quick-select | `createdAt >= date` |
| `endDate` | ISO string | Jalali date picker / quick-select | `createdAt <= date` |
| `customerId` | string | Searchable customer select | `customerId = value` |
| `warehouseId` | string | Warehouse select | `warehouseId = value` |
| `productId` | string | Product search/select | `productId = value` |
| `operatorId` | string | Operator/user select | `createdBy = value` |
| `type` | string | Type toggle | Filter by ledger type(s) |
| `search` | string | Search input | Full-text across product, warehouse, customer names |
| `page` | number | Pagination | Offset-based (default 1) |
| `pageSize` | number | Pagination | Rows per page (default 10) |

The Prisma `where` clause is assembled dynamically — only present params are included. All date filtering (including Jalali) converts user input to Gregorian `Date` objects for the DB query.

### Response shape

```typescript
{
  rows: InventoryRow[],
  totals: { incoming: number, outgoing: number, transactions: number },
  pagination: { page: number, pageSize: number, total: number, totalPages: number }
}
```

Summary totals reflect **filtered** data (not all-time totals), so summary cards stay consistent with the table.

## Components

### `FilterPanel` (`/components/reports/FilterPanel.tsx`)

Collapsible card containing all filter controls:
- **Row 1:** Type toggle buttons (unchanged) + Date range quick-select buttons
  - Quick options: 7d, 30d, 90d, year-start, **custom** (opens Jalali inputs)
- **Row 2:** Jalali date range inputs (shown when "custom" selected)
- **Row 3:** Customer searchable select + Warehouse select (in a 2-column grid)
- **Row 4:** Product search input + Operator/user select (in a 2-column grid)
- **Action row:** "اعمال فیلتر" button + "پاک کردن" button

Auto-submit with 300ms debounce on all filter changes. Filter state stored as React state, serializable to URL query params.

### `JalaliDateRange` (`/components/reports/JalaliDateRange.tsx`)

Two text inputs with `YYYY/MM/DD` pattern:
- Uses `date-fns-jalali/format` (already installed) to display dates
- Uses `date-fns-jalali/parse` for validation and conversion
- Converts Jalali date → Gregorian `Date` → ISO string for API
- Shows Persian month names in placeholder
- Client-side validation with visual error state

### `SearchableSelect` (`/components/reports/SearchableSelect.tsx`)

Reusable combobox component:
- Text input triggers debounced search via API
- Dropdown shows matching results with keyboard navigation
- Selected item shows as tag with clear button
- Used for: Customer, Warehouse, Product, Operator filters

### Reports Page Update (`/app/reports/page.tsx`)

- Add filter state for all new params
- Fetch now passes all filters to API
- API returns `{ rows, totals, pagination }` instead of flat array
- Summary cards use server-computed totals
- Loading state during fetch
- Empty state when no results match filters

### API Route Update (`/app/api/reports/route.ts`)

- Add optional query params for each filter
- Build dynamic Prisma where clause
- Add pagination with skip/take
- Compute filtered totals server-side with aggregation queries
- Return new response shape

## Files to Change

1. `/app/api/reports/route.ts` — Dynamic where clause, pagination, filtered totals
2. `/app/reports/page.tsx` — New filter state, updated fetch, new response shape
3. `/components/reports/FilterPanel.tsx` — **New** filter panel component
4. `/components/reports/JalaliDateRange.tsx` — **New** Jalali date range inputs
5. `/components/reports/SearchableSelect.tsx` — **New** searchable select component

## Future Excel Export

The filter system is designed so that `/api/reports?export=csv&<same-filters>` can stream the identical filtered dataset as CSV/XLSX. All filter logic is server-side, so the export endpoint reuses the same filtering code.

## Edge Cases

- **No filters applied:** Shows all inventory transactions (same as current 7d default)
- **Filters yield zero results:** Summary cards show 0, table shows "نتیجه‌ای پیدا نشد"
- **Invalid Jalali date:** Input shows red border + error message; API is not called
- **API error:** Error message displayed; previous data preserved
- **Loading state:** Skeleton shimmer on table while fetching
- **Empty customer/warehouse/product/operator lists:** Select shows "موردی یافت نشد"
- **Pagination with filters:** Server handles skip/take; page resets to 1 on filter change

## Accessibility & UX

- All form inputs have visible labels (not placeholder-only)
- Error states shown inline near invalid fields
- Loading states with clear feedback
- Filter count badge on collapsed panel (e.g., "۳ فیلتر فعال")
- Responsive: filters stack vertically on mobile, 2-column grid on desktop
- Keyboard navigation on searchable select
