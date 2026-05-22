import { Download, ExternalLink } from "lucide-react";

export default function Guide5Mistakes() {
  const pdfUrl = "/assets/guides/aquavo-guide-5-mistakes.pdf";

  return (
    <div className="flex flex-col min-h-screen bg-[#010611] text-white" dir="rtl">
      {/* Top Bar */}
      <header className="flex-shrink-0 h-16 bg-[#010611]/96 border-b border-[#199BB8]/35 flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
        <div className="text-[#199BB8] font-bold tracking-[4px] text-xl">
          AQUAVO
        </div>
        
        <div className="flex items-center gap-3">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center bg-transparent text-[#E8EDF2] border border-[#199BB8]/45 hover:bg-[#199BB8]/10 text-xs md:text-sm h-9 md:h-10 px-3 md:px-4 rounded-full font-bold transition-colors"
          >
            <span className="hidden md:inline ml-2">فتح بصفحة كاملة</span>
            <span className="inline md:hidden ml-2">فتح</span>
            <ExternalLink className="w-4 h-4" />
          </a>

          <a
            href={pdfUrl}
            download
            className="flex items-center justify-center bg-[#199BB8] text-[#010611] hover:bg-[#199BB8]/90 text-xs md:text-sm h-9 md:h-10 px-3 md:px-4 rounded-full font-bold transition-colors"
          >
            <span className="ml-2">تحميل PDF</span>
            <Download className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* PDF Viewer */}
      <main className="flex-1 w-full bg-[#010611] relative">
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-neutral-400 -z-10">
          <p>إذا ما ظهر الدليل داخل الصفحة، اضغط تحميل PDF.</p>
        </div>
        
        <object
          data={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1`}
          type="application/pdf"
          className="w-full h-full min-h-[calc(100vh-64px)] border-0 block bg-[#010611] z-10 relative"
        >
          <iframe
            src={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1`}
            title="دليل الأخطاء الخمسة الشائعة بالأحواض"
            className="w-full h-full min-h-[calc(100vh-64px)] border-0 block bg-[#010611]"
          />
        </object>
      </main>
    </div>
  );
}
