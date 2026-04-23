import { motion } from "framer-motion";
import { Shield, CheckCircle, Download, FileText, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function VerifyCertificate() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] pt-24 pb-12 overflow-hidden relative">
      {/* Background Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-yellow-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-amber-600/10 blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 max-w-5xl relative z-10">
        
        {/* Header Section */}
        <div className="text-center mb-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-100/50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700/30 text-yellow-800 dark:text-yellow-400 mb-6"
          >
            <Shield className="w-4 h-4" />
            <span className="text-sm font-semibold tracking-wider">AQUAVO TRUST & SECURITY</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4 font-cairo"
          >
            شهادة الوكالة الرسمية <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-amber-600">YEE</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-tajawal leading-relaxed"
          >
            نحن في AQUAVO نفخر بكوننا الموزع المعتمد لمنتجات YEE الأصلية في العراق. هذه الشهادة تثبت أصالة المنتجات التي نقدمها لعملائنا لضمان أعلى مستويات الجودة والثقة.
          </motion.p>
        </div>

        {/* Certificate Frame Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Main Certificate Display */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="lg:col-span-8"
          >
            {/* The "Frame" */}
            <div className="relative rounded-2xl p-2 bg-gradient-to-br from-yellow-300 via-amber-500 to-yellow-600 shadow-[0_0_40px_rgba(245,158,11,0.2)]">
              
              <div className="relative bg-white dark:bg-slate-900 rounded-xl overflow-hidden h-[600px] md:h-[800px] w-full flex flex-col shadow-2xl">
                {/* Browser-like Top Bar */}
                <div className="h-10 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center px-4 gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400/80"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400/80"></div>
                  </div>
                  <div className="mx-auto flex items-center gap-2 px-3 py-1 bg-white dark:bg-slate-900 rounded text-xs text-slate-500 font-mono w-1/2 justify-center border border-slate-200 dark:border-slate-700">
                    <Shield className="w-3 h-3 text-green-500" />
                    yee-official-certificate.pdf
                  </div>
                </div>
                
                {/* PDF Embed */}
                <iframe 
                  src="/certificates/yee-certificate.pdf#toolbar=0&navpanes=0&scrollbar=0&view=FitH" 
                  className="w-full h-full border-none bg-white"
                  title="YEE Certificate of Authenticity"
                />
              </div>
            </div>
          </motion.div>

          {/* Info & Actions Sidebar */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-4 flex flex-col gap-6"
          >
            {/* Verification Status Card */}
            <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md border border-green-200 dark:border-green-900/30 rounded-2xl p-6 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-600"></div>
              
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white font-cairo">تم التحقق</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-tajawal mt-1">شهادة أصلية وصالحة لعام 2026</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-sm text-slate-500 dark:text-slate-400">الشركة المصدرة</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">Weifang Yipin Pet Products</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-sm text-slate-500 dark:text-slate-400">الوكيل المعتمد</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">AQUAVO (العراق)</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-sm text-slate-500 dark:text-slate-400">تاريخ الإصدار</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">14 يناير 2026</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <a 
                href="/certificates/yee-certificate.pdf" 
                download="AQUAVO_YEE_Certificate_2026.pdf"
                className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white font-bold transition-all shadow-lg shadow-yellow-600/20 hover:shadow-yellow-600/40 hover:-translate-y-1 font-cairo"
              >
                <Download className="w-5 h-5" />
                تحميل النسخة الأصلية (PDF)
              </a>
              
              <Link href="/">
                <a className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition-all font-cairo group">
                  العودة للتسوق
                  <ArrowRight className="w-4 h-4 group-hover:-translate-x-1 transition-transform rtl:rotate-180" />
                </a>
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="mt-4 flex items-center justify-center gap-4 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
              <Shield className="w-8 h-8 text-slate-400" />
              <FileText className="w-8 h-8 text-slate-400" />
              <CheckCircle className="w-8 h-8 text-slate-400" />
            </div>

          </motion.div>
        </div>
      </div>
    </div>
  );
}
