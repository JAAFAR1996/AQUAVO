import { Download, ExternalLink } from "lucide-react";

const PDF_URL = "/assets/guides/aquavo-guide-5-mistakes.pdf";

const pages = [
  "/assets/guides/5-mistakes/page-01.jpg",
  "/assets/guides/5-mistakes/page-02.jpg",
  "/assets/guides/5-mistakes/page-03.jpg",
  "/assets/guides/5-mistakes/page-04.jpg",
  "/assets/guides/5-mistakes/page-05.jpg",
  "/assets/guides/5-mistakes/page-06.jpg",
  "/assets/guides/5-mistakes/page-07.jpg",
  "/assets/guides/5-mistakes/page-08.jpg",
  "/assets/guides/5-mistakes/page-09.jpg",
];

export default function Guide5Mistakes() {
  return (
    <div className="min-h-screen bg-[#0B1E28] text-white" dir="rtl">
      {/* Sticky top bar */}
      <header
        style={{ backdropFilter: "blur(8px)" }}
        className="sticky top-0 z-50 h-16 bg-[#0B1E28]/96 border-b border-[#0B93A6]/35 flex items-center justify-between px-4"
      >
        <a href="/" className="text-[#0B93A6] font-bold tracking-[4px] text-lg">
          AQUAVO
        </a>

        <div className="flex items-center gap-2">
          <a
            href={PDF_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[#E8EDF2] border border-[#0B93A6]/45 hover:bg-[#0B93A6]/10 text-xs sm:text-sm h-9 px-3 rounded-full font-bold transition-colors"
          >
            <span className="hidden sm:inline">فتح PDF</span>
            <ExternalLink className="w-4 h-4" />
          </a>

          <a
            href={PDF_URL}
            download="aquavo-guide-5-mistakes.pdf"
            className="flex items-center gap-1.5 bg-[#0B93A6] text-[#0B1E28] hover:bg-[#0B93A6]/85 text-xs sm:text-sm h-9 px-3 sm:px-4 rounded-full font-bold transition-colors"
          >
            <span>تحميل PDF</span>
            <Download className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* Page images */}
      <main className="w-full max-w-[720px] mx-auto px-2.5 py-4 pb-12">
        {pages.map((src, index) => (
          <img
            key={src}
            src={src}
            alt={`صفحة ${index + 1} من دليل الأخطاء الخمسة`}
            loading={index === 0 ? "eager" : "lazy"}
            decoding="async"
            width={720}
            height={1018}
            className="block w-full h-auto mb-4 last:mb-0 rounded-xl shadow-[0_18px_50px_rgba(0,0,0,0.45)] bg-[#0B1E28]"
          />
        ))}
      </main>
    </div>
  );
}
