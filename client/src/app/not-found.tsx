/**
 * 404 Page
 * Standard 404 page with animated background
 */

import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Home } from 'lucide-react';

export default function NotFound() {
  // Simple floating animation
  const floatAnim = {
    y: [0, -20, 0],
    rotate: [0, 90, 180, 270, 360],
  };
  const transition = { duration: 4, repeat: Infinity, ease: 'linear' } as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center p-4 overflow-hidden relative">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, 0.05) 25%, rgba(255, 255, 255, 0.05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, 0.05) 75%, rgba(255, 255, 255, 0.05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, 0.05) 25%, rgba(255, 255, 255, 0.05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, 0.05) 75%, rgba(255, 255, 255, 0.05) 76%, transparent 77%, transparent)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Floating pixel blocks */}
      <motion.div className="absolute top-20 left-20 text-6xl" animate={floatAnim} transition={transition}>▪️</motion.div>
      <motion.div className="absolute bottom-20 right-20 text-6xl" animate={floatAnim} transition={transition}>▫️</motion.div>
      <motion.div className="absolute top-40 right-40 text-6xl" animate={floatAnim} transition={transition}>🟥</motion.div>

      {/* Main content */}
      <div className="max-w-2xl w-full text-center space-y-8 relative z-10">
        <motion.div
          className="relative"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-9xl font-black text-white tracking-tight">404</h1>
        </motion.div>

        <div className="space-y-2">
          <h2 className="text-3xl md:text-4xl font-bold text-white">الرابط ضاع... الصفحة غير موجودة!</h2>
          <p className="text-lg text-gray-300">الصفحة اللي تدور عليها مو موجودة أو انحذفت</p>
        </div>

        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-card text-black font-bold rounded-lg hover:bg-gray-100 transition-colors shadow-lg hover:shadow-white/25"
          >
            <Home className="w-5 h-5" />
            <span>العودة للرئيسية</span>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
