// صفحة تجريبية لعرض ديكورات الأخشاب الطبيعية بالذكاء الاصطناعي
import { useEffect } from "react";
import { Link } from "wouter";

export default function AiDriftwoodExperiment() {
  useEffect(() => {
    document.title = "تجربة الأخشاب الطبيعية — AQUAVO";
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-bg-base, #0B1E28)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.5rem",
        padding: "2rem",
        fontFamily: "Cairo, Tahoma, sans-serif",
        direction: "rtl",
        color: "#e2e8f0",
      }}
    >
      <h1 style={{ fontSize: "2rem", color: "#0B93A6", textAlign: "center" }}>
        تجربة الأخشاب الطبيعية
      </h1>
      <p style={{ fontSize: "1.1rem", opacity: 0.7, textAlign: "center", maxWidth: 480 }}>
        هذه الصفحة التجريبية قيد التطوير. يمكنك تصفح ديكورات الأخشاب الطبيعية من صفحة المنتجات.
      </p>
      <Link
        href="/products?category=decorations"
        style={{
          padding: "0.75rem 2rem",
          background: "#0B93A6",
          color: "#fff",
          borderRadius: "0.5rem",
          textDecoration: "none",
          fontWeight: 600,
          fontSize: "1rem",
        }}
      >
        تصفح الديكورات
      </Link>
    </div>
  );
}
