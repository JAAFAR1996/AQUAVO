import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Shield, CheckCircle, Download, FileText, ArrowRight, Award, Lock } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

export default function VerifyCertificate() {
  // 3D Tilt Effect Logic
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7deg", "-7deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7deg", "7deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] pt-24 pb-12 overflow-hidden relative selection:bg-yellow-500/30">
      {/* Background Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-yellow-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-amber-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-white opacity-[0.015] mix-blend-overlay pointer-events-none"></div>

      <div className="container mx-auto px-4 max-w-6xl relative z-10">
        
        {/* Header Section */}
        <div className="text-center mb-12 lg:mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-100/80 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700/30 text-yellow-800 dark:text-yellow-400 mb-6 backdrop-blur-md shadow-sm"
          >
            <Shield className="w-4 h-4" />
            <span className="text-sm font-semibold tracking-wider">AQUAVO TRUST & SECURITY</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6 font-cairo"
          >
            شهادة أصالة المنتجات <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-amber-500">YEE</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-tajawal leading-relaxed"
          >
            هذه الشهادة الرسمية من شركة Weifang Yipin تؤكد أن جميع منتجات YEE التي يوفرها <strong className="text-slate-900 dark:text-white">AQUAVO</strong> في العراق هي منتجات أصلية 100%.
          </motion.p>
        </div>

        {/* Content Area */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-start justify-center">
          
          {/* 3D Certificate Frame */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 100, damping: 20 }}
            className="w-full lg:w-3/5 perspective-[1200px]"
          >
            <motion.div
              style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="relative rounded-[2rem] p-2 md:p-3 bg-gradient-to-br from-yellow-200 via-amber-400 to-yellow-600 shadow-[0_20px_50px_rgba(245,158,11,0.2)] dark:shadow-[0_20px_50px_rgba(245,158,11,0.1)] cursor-crosshair group transition-all duration-300 ease-out"
            >
              {/* Glossy Reflection Effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/40 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-[2rem] z-20" style={{ mixBlendMode: 'overlay', transform: 'translateZ(1px)' }}></div>
              
              <div 
                className="relative bg-white dark:bg-[#0f0f13] rounded-3xl overflow-hidden shadow-2xl flex flex-col transform-gpu"
                style={{ transform: "translateZ(20px)" }}
              >
                {/* Security Hologram Strip */}
                <div className="absolute top-0 right-0 w-full h-2 bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-50 z-20"></div>
                <div className="absolute top-4 left-4 z-20 w-12 h-12 rounded-full border border-yellow-200 bg-gradient-to-br from-yellow-50 to-white flex items-center justify-center shadow-lg opacity-80 backdrop-blur-sm">
                  <Award className="w-6 h-6 text-yellow-600" />
                </div>

                {/* The Certificate Image (Replaces the ugly iframe) */}
                <div className="w-full aspect-[1/1.4] relative bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                  {/* We ask user to put yee-certificate.png in public/certificates/ */}
                  <img 
                    src="/certificates/yee-certificate.jpg" 
                    alt="YEE Official Certificate of Authenticity" 
                    className="w-full h-full object-contain object-center z-10 transition-transform duration-700 group-hover:scale-[1.02]"
                    onError={(e) => {
                      // Fallback visual if image doesn't exist yet
                      e.currentTarget.src = "https://images.unsplash.com/photo-1633394867954-15c00e12d525?q=80&w=800&auto=format&fit=crop";
                      e.currentTarget.style.opacity = "0.1";
                    }}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-0 text-slate-400">
                    <FileText className="w-16 h-16 mb-4 opacity-50" />
                    <p className="font-tajawal">يرجى إضافة صورة الشهادة yee-certificate.jpg</p>
                  </div>
                </div>

                {/* Verification Bar */}
                <div className="bg-slate-50 border-t border-slate-100 dark:bg-slate-900 dark:border-slate-800 p-4 flex items-center justify-between z-20 relative">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-500">
                    <Lock className="w-4 h-4" />
                    <span className="text-xs font-bold font-mono tracking-widest">SECURE VIEW</span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    ID: YEE-AQ-2026-VERIFIED
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Info & Actions Sidebar */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="w-full lg:w-2/5 flex flex-col gap-6"
          >
            {/* Verification Status Card */}
            <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-green-200 dark:border-green-900/30 rounded-3xl p-8 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-green-400 to-emerald-600"></div>
              <div className="absolute -right-12 -top-12 w-40 h-40 bg-green-500/5 dark:bg-green-500/10 rounded-full blur-3xl group-hover:bg-green-500/10 transition-colors"></div>
              
              <div className="flex items-start gap-5 mb-8 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/40 dark:to-green-800/20 flex items-center justify-center flex-shrink-0 border border-green-200 dark:border-green-700/30 shadow-inner">
                  <CheckCircle className="w-7 h-7 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white font-cairo">تم التحقق بنجاح</h3>
                  <p className="text-sm text-green-600 dark:text-green-500 font-tajawal mt-1 font-medium">شهادة أصالة منتجات — وثيقة رسمية</p>
                </div>
              </div>

              <div className="space-y-5 relative z-10">
                <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800/50">
                  <span className="text-sm text-slate-500 dark:text-slate-400 font-tajawal">الشركة المصدرة</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">Weifang Yipin Pet Products</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800/50">
                  <span className="text-sm text-slate-500 dark:text-slate-400 font-tajawal">المورَّد إليه</span>
                  <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400">AQUAVO (العراق)</span>
                </div>
                <div className="flex justify-between items-center pb-2">
                  <span className="text-sm text-slate-500 dark:text-slate-400 font-tajawal">تاريخ الإصدار</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">Jan 14, 2026</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-4 mt-2">
              <a 
                href="/certificates/yee-certificate.pdf" 
                download="AQUAVO_YEE_Certificate_2026.pdf"
                className="flex items-center justify-center gap-3 w-full py-4 px-6 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 font-bold transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 font-cairo group overflow-hidden relative"
              >
                <div className="absolute inset-0 bg-white/20 dark:bg-black/10 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300"></div>
                <Download className="w-5 h-5 relative z-10" />
                <span className="relative z-10">تحميل النسخة الأصلية (PDF)</span>
              </a>
              
              <Link href="/">
                <a className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 font-bold transition-all font-cairo group">
                  العودة للتسوق
                  <ArrowRight className="w-4 h-4 group-hover:-translate-x-1 transition-transform rtl:rotate-180" />
                </a>
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="mt-6 flex items-center justify-center gap-6 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
              <Shield className="w-6 h-6 text-slate-400" />
              <Award className="w-6 h-6 text-slate-400" />
              <Lock className="w-6 h-6 text-slate-400" />
            </div>

          </motion.div>
        </div>
      </div>
    </div>
  );
}
