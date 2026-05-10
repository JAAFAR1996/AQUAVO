/**
 * AQUAVO Links Page — صفحة الروابط الشاملة
 * 
 * 2026 Premium Design: Glassmorphism 2.0 + Liquid Interaction
 * Standalone page designed specifically for the QR Code landing experience.
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import {
  ShoppingBag,
  Instagram,
  Facebook,
  Globe,
  Heart,
  ChevronLeft,
  ExternalLink,
  Music2,
  MapPin
} from 'lucide-react';
import { trackBioLinkClick } from '@/lib/analytics';
import { WHATSAPP_URL } from '@/lib/constants/shipping';

// ═══════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════
const LINKS_CONFIG = {
  brand: {
    name: 'AQUAVO',
    tagline: 'أول متجر أحواض سمك في العراق 🇮🇶',
    logoUrl: '/assets/brand/AQUAVO-logo-full-color.svg',
  },
  links: [
    {
      id: 'shop',
      label: 'تصفح المتجر',
      sublabel: 'منتجات أحواض مائية فاخرة',
      url: '/products',
      icon: 'shop',
      color: 'from-cyan-400 to-teal-500',
      glow: 'shadow-cyan-500/40',
      featured: true,
    },
    {
      id: 'whatsapp',
      label: 'تواصل واتساب',
      sublabel: 'رد فوري — اسألنا أي شي!',
      url: `${WHATSAPP_URL}?text=${encodeURIComponent('مرحبا! جيت من QR Code الكتيب 🐟')}`,
      icon: 'whatsapp',
      color: 'from-emerald-400 to-emerald-600',
      glow: 'shadow-emerald-500/20',
      external: true,
    },
    {
      id: 'instagram',
      label: 'انستغرام',
      sublabel: '@aquavo_iq — صور وفيديوهات',
      url: 'https://instagram.com/aquavo_iq',
      icon: 'instagram',
      color: 'from-pink-500 to-purple-600',
      glow: 'shadow-purple-500/20',
      external: true,
    },
    {
      id: 'tiktok',
      label: 'تيك توك',
      sublabel: '@aquavo.iq — محتوى فيرال 🔥',
      url: 'https://tiktok.com/@aquavo.iq',
      icon: 'tiktok',
      color: 'from-slate-700 to-slate-900',
      glow: 'shadow-slate-600/20',
      external: true,
    },
    {
      id: 'facebook',
      label: 'فيسبوك',
      sublabel: 'مجتمع هواة الأحواض',
      url: 'https://www.facebook.com/profile.php?id=61587249730248',
      icon: 'facebook',
      color: 'from-blue-500 to-blue-700',
      glow: 'shadow-blue-500/20',
      external: true,
    },
    {
      id: 'website',
      label: 'الموقع الرسمي',
      sublabel: 'aquavoiq.com',
      url: '/',
      icon: 'globe',
      color: 'from-amber-400 to-orange-500',
      glow: 'shadow-amber-500/20',
    },
    {
      id: 'location',
      label: 'موقعنا',
      sublabel: 'بغداد — العراق 📍',
      url: 'https://maps.google.com/?q=Baghdad,Iraq',
      icon: 'location',
      color: 'from-rose-400 to-rose-600',
      glow: 'shadow-rose-500/20',
      external: true,
    },
  ],
};

// ═══════════════════════════════════════════════
// ICON COMPONENT
// ═══════════════════════════════════════════════
function LinkIcon({ icon, className }: { icon: string; className?: string }) {
  const props = { className: className || 'w-5 h-5' };
  switch (icon) {
    case 'shop': return <ShoppingBag {...props} />;
    case 'whatsapp': return (
      <svg {...props} fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    );
    case 'instagram': return <Instagram {...props} />;
    case 'facebook': return <Facebook {...props} />;
    case 'tiktok': return <Music2 {...props} />;
    case 'globe': return <Globe {...props} />;
    case 'location': return <MapPin {...props} />;
    default: return <ExternalLink {...props} />;
  }
}

// ═══════════════════════════════════════════════
// AMBIENT GLOW TEXTURE (2026 Trend)
// ═══════════════════════════════════════════════
function InteractiveBackground() {
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const springX = useSpring(cursorX, { stiffness: 50, damping: 20 });
  const springY = useSpring(cursorY, { stiffness: 50, damping: 20 });

  useEffect(() => {
    const moveCursor = (e: MouseEvent | TouchEvent) => {
      if ('touches' in e && e.touches.length > 0) {
        cursorX.set(e.touches[0].clientX);
        cursorY.set(e.touches[0].clientY);
      } else if ('clientX' in e) {
        cursorX.set(e.clientX);
        cursorY.set(e.clientY);
      }
    };
    window.addEventListener('mousemove', moveCursor);
    window.addEventListener('touchmove', moveCursor);
    return () => {
      window.removeEventListener('mousemove', moveCursor);
      window.removeEventListener('touchmove', moveCursor);
    };
  }, [cursorX, cursorY]);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-[#071324]">
      {/* Dark luxury base gradients */}
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-[#0a1b35] to-transparent opacity-80" />
      <div className="absolute bottom-0 left-0 w-full h-[50vh] bg-gradient-to-t from-[#06101c] to-transparent opacity-90" />

      {/* Floating static orbs for depth */}
      <div className="absolute top-10 -right-20 w-[400px] h-[400px] bg-cyan-600/10 rounded-full blur-[100px] mix-blend-screen" />
      <div className="absolute -bottom-20 -left-20 w-[600px] h-[600px] bg-teal-600/10 rounded-full blur-[120px] mix-blend-screen" />

      {/* Interactive cursor glow (Glassmorphism 2.0 reactive lighting) */}
      <motion.div
        className="absolute rounded-full pointer-events-none mix-blend-screen"
        style={{
          width: 600,
          height: 600,
          x: springX,
          y: springY,
          translateX: '-50%',
          translateY: '-50%',
          background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, rgba(20,184,166,0.05) 40%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      
      {/* Subtle floating particles/bubbles */}
      {Array.from({ length: 15 }).map((_, i) => {
        const size = 3 + Math.random() * 5;
        const left = Math.random() * 100;
        const duration = 15 + Math.random() * 15;
        const delay = Math.random() * 5;
        return (
          <div
            key={`orb-${i}`}
            className="absolute rounded-full bg-cyan-300/20"
            style={{
              width: size,
              height: size,
              left: `${left}%`,
              bottom: -20,
              filter: `blur(${Math.random() > 0.5 ? 1 : 0}px)`,
              animation: `floatUp ${duration}s linear infinite`,
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}

      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.5; }
          100% { transform: translateY(-110vh) translateX(${Math.random() * 50 - 25}px) scale(0.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════
// LINK CARD COMPONENT (Glassmorphism 2.0)
// ═══════════════════════════════════════════════
function LinkCard({
  link,
  index,
}: {
  link: typeof LINKS_CONFIG.links[0];
  index: number;
}) {
  const isExternal = link.external || link.url.startsWith('http');

  const handleClick = () => {
    trackBioLinkClick(link.id);
  };

  return (
    <motion.a
      href={link.url}
      onClick={handleClick}
      target={isExternal ? '_blank' : '_self'}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`
        group relative block w-full rounded-[20px] overflow-hidden
        transition-all duration-500 cursor-pointer
        ${link.featured
          ? 'bg-gradient-to-r ' + link.color + ' shadow-[0_8px_32px_rgba(0,0,0,0.2)] ' + link.glow
          : 'bg-white/[0.03] hover:bg-white/[0.08] backdrop-blur-[24px] border border-white/[0.08] hover:border-white/[0.2] shadow-[0_4px_24px_rgba(0,0,0,0.1)]'
        }
      `}
    >
      {/* Dynamic shimmer sweep */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent -translate-x-[150%] skew-x-[30deg] group-hover:animate-shimmer" />

      <div className="relative flex items-center p-4 px-5">
        {/* Animated Icon Container */}
        <div className={`
          flex-shrink-0 w-12 h-12 rounded-[14px] flex items-center justify-center
          transition-all duration-500 group-hover:scale-110 group-hover:rotate-3
          ${link.featured
            ? 'bg-white/20'
            : 'bg-gradient-to-br ' + link.color + ' shadow-inner'
          }
        `}>
          <LinkIcon icon={link.icon} className="w-5 h-5 text-white" />
        </div>

        {/* Typography refined for 2026 */}
        <div className="flex-1 text-right min-w-0 pr-4">
          <span className={`
            block font-bold text-base tracking-wide
            ${link.featured ? 'text-white drop-shadow-sm' : 'text-slate-100'}
          `}>
            {link.label}
          </span>
          {link.sublabel && (
            <span className={`
              block text-[13px] mt-0.5 tracking-wide truncate
              ${link.featured ? 'text-white/80' : 'text-slate-400 font-medium'}
            `}>
              {link.sublabel}
            </span>
          )}
        </div>

        {/* Minimalist Arrow */}
        <div className={`
          flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300
          ${link.featured ? 'bg-white/10 text-white' : 'bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-white group-hover:-translate-x-1'}
        `}>
          <ChevronLeft className="w-4 h-4 ml-0.5" />
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(150%) skewX(30deg); }
        }
        .animate-shimmer {
          animation: shimmer 1.5s ease-in-out forwards;
        }
      `}</style>
    </motion.a>
  );
}

// ═══════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════
export default function LinksPage() {
  // Setup headers
  useEffect(() => {
    document.title = 'AQUAVO | الروابط الشاملة';
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', '#071324');
  }, []);

  return (
    <div className="min-h-screen relative font-sans text-slate-200" dir="rtl">
      
      {/* 2026 Interactive "Alive" Background */}
      <InteractiveBackground />

      {/* Main Content Container */}
      <div className="relative z-10 min-h-screen flex flex-col items-center px-4 py-12 max-w-md mx-auto w-full">

        {/* ── Brand Header ──────────────────── */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center mb-10"
        >
          {/* Glowing Avatar */}
          <div className="relative group">
            <div className="absolute inset-0 bg-cyan-400/30 blur-2xl rounded-full scale-110 transition-transform duration-700 group-hover:scale-150 group-hover:bg-cyan-400/40" />
            <div className="relative w-28 h-28 rounded-full bg-[#0a1b35]/80 backdrop-blur-xl border border-white/10 shadow-2xl flex items-center justify-center overflow-hidden p-4">
              <img
                src={LINKS_CONFIG.brand.logoUrl}
                alt="AQUAVO"
                className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  const parent = (e.target as HTMLImageElement).parentElement;
                  if (parent && !parent.querySelector('span')) {
                    const fallback = document.createElement('span');
                    fallback.textContent = '🐟';
                    fallback.style.fontSize = '3rem';
                    parent.appendChild(fallback);
                  }
                }}
              />
            </div>
          </div>
          
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-6 text-3xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-teal-200 drop-shadow-sm"
          >
            {LINKS_CONFIG.brand.name}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-2 text-slate-400 text-[15px] font-medium tracking-wide text-center"
          >
            {LINKS_CONFIG.brand.tagline}
          </motion.p>
        </motion.div>

        {/* ── Links Grid ────────────────────── */}
        <div className="w-full flex flex-col gap-3">
          {LINKS_CONFIG.links.map((link, i) => (
            <LinkCard key={link.id} link={link} index={i} />
          ))}
        </div>

        {/* ── Signature Footer ──────────────── */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-14 mb-6 text-center"
        >
          <div className="flex items-center justify-center gap-2 text-slate-500 text-[13px] font-medium tracking-wide">
            <span>صُنع بحب في العراق</span>
            <Heart className="w-4 h-4 text-rose-500/70" fill="currentColor" />
          </div>
          <p className="text-slate-600/50 text-[11px] mt-2 font-mono tracking-widest">
            © {new Date().getFullYear()} AQUAVO
          </p>
        </motion.footer>
        
      </div>
    </div>
  );
}
