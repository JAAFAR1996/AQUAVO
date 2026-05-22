import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function Guide5Mistakes() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6" dir="rtl">
      <div className="max-w-2xl w-full text-center space-y-8">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white leading-tight">
          دليل الأخطاء الخمسة الشائعة بالأحواض
        </h1>
        
        <p className="text-lg md:text-xl text-neutral-400">
          اكتشف الأخطاء التي تدمر حوضك وتعلم كيفية تجنبها بخطوات عملية بسيطة.
        </p>

        <div className="pt-8">
          <Button 
            asChild
            size="lg"
            className="w-full sm:w-auto text-lg h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white font-medium border-0"
          >
            <a 
              href="/assets/guides/aquavo-5-mistakes-guide-final.pdf" 
              download
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 justify-center"
            >
              <Download className="w-6 h-6" />
              <span>تحميل PDF</span>
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
