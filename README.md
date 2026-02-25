# سامانه جامع انبار و باسکول (Scale v2)

یک پلتفرم کامل برای مدیریت عملیات انبار شامل ورود/خروج کالا، مدیریت ناوگان ترازوهای ESP32، برچسب‌گذاری بارکد/QR، گزارش‌گیری و لاگ فعالیت.

## ویژگی‌های کلیدی

- **کاملا فارسی + RTL** با UX ساده و سریع برای اپراتور انبار.
- **نقش‌ها:** مدیرعامل، انباردار، مسئول خروج، مدیر سیستم.
- **احراز هویت** با نام کاربری/رمز عبور و JWT session.
- **مدیریت کالا** (CRUD، متادیتا، بارکد/QR، حذف نرم با امکان بازیابی).
- **عملیات batch برای کالاها** با `POST /api/products/batch`.
- **مدیریت انبار** با آرشیو ایمن در صورت وجود وابستگی + بازیابی.
- **ورود و خروج موجودی** با ثبت در ledger قابل ردگیری و کنترل موجودی هنگام خروج.
- **مدیریت بارکد** (resolve + ثبت بارکد ناشناخته با وضعیت OPEN/TEMP_RECEIVING/MAPPED).
- **مدیریت ترازوها** (توکن اختصاصی، rotate token، سلامت Fresh/Stale، telemetry، queue فرمان و SSE).
- **Label/Print pipeline** با وضعیت صف چاپ (مدل داده).
- **API یکپارچه خارجی** زیر مسیر `/api/external/*`.
- **پایگاه داده PostgreSQL + Prisma**.
- **Firmware scope** برای ESP32 داخل `firmware/esp32-scale-agent`.

## استک فنی

- Next.js 14 (App Router)
- TypeScript
- Prisma ORM
- PostgreSQL
- JSON settings store (`data/system-settings.json`)

## راه‌اندازی سریع

```bash
cp .env.example .env
npm install
docker compose up -d db
npx prisma generate
npx prisma db push
npm run dev
```

## APIهای مهم

### احراز هویت
- `POST /api/auth/login`

### مدیریت کالا
- `GET/POST /api/products`
- `GET/PATCH/DELETE /api/products/:id`
- `POST /api/products/recover`
- `POST /api/products/batch`

### مدیریت انبار
- `GET/POST /api/warehouses`
- `PATCH/DELETE /api/warehouses/:id`
- `POST /api/warehouses/recover`

### عملیات موجودی
- `POST /api/stock-in`
- `POST /api/stock-out`
- `GET /api/inventory/balance?productId=...&warehouseId=...`

### بارکد
- `GET /api/barcodes/resolve?barcode=...`
- `GET/PATCH /api/barcodes/unknown`

### مدیریت ترازو
- `GET/POST /api/scales`
- `GET/PATCH /api/scales/:id`
- `POST /api/scales/:id/token`
- `POST /api/scales/:id/telemetry`
- `GET/POST /api/scales/:id/commands`
- `GET /api/scales/:id/stream`

### API خارجی
- `GET /api/external/products`
- `GET /api/external/product/:id`
- `POST /api/external/stock-in`
- `POST /api/external/stock-out`
- `GET /api/external/inventory`

### نمونه cURL برای telemetry
```bash
curl -X POST http://localhost:3000/api/scales/<scale-id>/telemetry \
  -H "Authorization: Bearer sc_xxx" \
  -H "Content-Type: application/json" \
  -d '{"weight": 12.45, "isStable": true, "uptimeSec": 3511, "model": "ESP32-HX711"}'
```

## مدل داده
مدل‌های Prisma این حوزه‌ها را پوشش می‌دهد:
- Users/Roles
- Products
- Warehouses
- Scales
- StockIn/StockOut
- InventoryLedger
- UnknownBarcodeEvent
- ScaleCommand
- PrintJob
- ActivityLog

## نکات محصول
- UI فارسی و راست‌به‌چپ برای سرعت یادگیری.
- امکان اتصال چند ترازو به هر انبار.
- دریافت وزن لحظه‌ای/پایدار از ESP32 و تایید اپراتور.
- صدور و چاپ برچسب (بارکد + وزن + نوع کالا).
