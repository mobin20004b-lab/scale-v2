const kpis = [
  { title: "تعداد کالاها", value: "۲۴۸" },
  { title: "ورود امروز", value: "۳۹ رکورد" },
  { title: "خروج امروز", value: "۲۱ رکورد" },
  { title: "کالاهای کم‌موجود", value: "۱۲" }
];

export default function HomePage() {
  return (
    <main className="container grid" style={{ gap: 24 }}>
      <section className="card">
        <h1>سامانه عملیات انبار (RTL / فارسی)</h1>
        <p className="muted">
          رابط کاربری بر پایه Material 3 برای مدیرعامل، انباردار و مسئول خروج کالا. ثبت ورود/خروج، مدیریت ترازو، چاپ برچسب و گزارش‌گیری.
        </p>
      </section>

      <section className="grid cards">
        {kpis.map((item) => (
          <article key={item.title} className="card">
            <h3>{item.title}</h3>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>

      <section className="card grid" style={{ gap: 12 }}>
        <h2>مدیریت ترازوها</h2>
        <p className="muted">تولید/چرخش توکن API، دریافت telemetry، مانیتورینگ Fresh/Stale و صف فرمان دستگاه.</p>
        <ul>
          <li>ساخت ترازو: <code>POST /api/scales</code></li>
          <li>گردش توکن: <code>POST /api/scales/:id/token</code></li>
          <li>ارسال تله‌متری: <code>POST /api/scales/:id/telemetry</code></li>
          <li>SSE زنده: <code>GET /api/scales/:id/stream</code></li>
        </ul>
        <pre>{`curl -X POST https://example.com/api/scales/sc_1/telemetry \\
  -H "Authorization: Bearer SCALE_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"weight":25.4,"isStable":true,"uptimeSec":9872,"model":"HX711"}'`}</pre>
      </section>

      <section className="card grid" style={{ gap: 12 }}>
        <h2>مدیریت انبار و موجودی</h2>
        <p className="muted">حذف ایمن انبارها، بازیابی، و کنترل موجودی قبل از خروج کالا.</p>
        <table className="table">
          <thead>
            <tr><th>انبار</th><th>کد</th><th>وضعیت</th><th>تعداد ترازو</th></tr>
          </thead>
          <tbody>
            <tr><td>انبار مرکزی</td><td>WH-TEH-01</td><td>فعال</td><td>۴</td></tr>
            <tr><td>انبار شمال</td><td>WH-RAS-02</td><td>آرشیو</td><td>۲</td></tr>
          </tbody>
        </table>
      </section>

      <section className="card grid" style={{ gap: 12 }}>
        <h2>پایگاه‌داده و پلتفرم</h2>
        <ul>
          <li>ORM: <b>Prisma</b> با provider برابر PostgreSQL</li>
          <li>DB Runtime: <b>PostgreSQL 16</b> در docker-compose</li>
          <li>Settings پایدار: <code>data/system-settings.json</code></li>
        </ul>
      </section>
    </main>
  );
}
