import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Bubble {
  id: number;
  x: number;
  y: number;
  size: number;
}

export function BubbleTrail() {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    // Create automatic floating bubbles
    const createAutoBubble = () => {
      if (!isMountedRef.current) return;

      const newBubble = {
        id: Date.now() + Math.random(),
        x: Math.random() * window.innerWidth,
        y: window.innerHeight + 50, // Start from bottom
        size: Math.random() * 40 + 20, // Increased size range: 20-60px
      };
      setBubbles(prev => [...prev.slice(-60), newBubble]);
    };

    // Create bubbles automatically every 500ms (more frequent)
    const autoInterval = setInterval(createAutoBubble, 500);

    // Create bubbles on mouse move
    const handleMouseMove = (e: MouseEvent) => {
      if (!isMountedRef.current) return;

      if (Math.random() > 0.3) { // Higher chance to create bubbles (70%)
        const newBubble = {
          id: Date.now() + Math.random(),
          x: e.clientX,
          y: e.clientY,
          size: Math.random() * 30 + 15, // Increased size: 15-45px
        };
        setBubbles(prev => [...prev.slice(-60), newBubble]);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      isMountedRef.current = false;
      window.removeEventListener("mousemove", handleMouseMove);
      clearInterval(autoInterval);
    };
  }, []);

  const handleAnimationComplete = (bubbleId: number) => {
    if (isMountedRef.current) {
      setBubbles(prev => prev.filter(b => b.id !== bubbleId));
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      <AnimatePresence>
        {bubbles.map(bubble => (
          <motion.div
            key={bubble.id}
            initial={{ opacity: 0.9, y: bubble.y, x: bubble.x, scale: 0 }}
            animate={{
              opacity: 0,
              y: bubble.y - 200, // Float higher
              x: bubble.x + (Math.random() * 60 - 30), // More horizontal movement
              scale: 1.3
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.5, ease: "easeOut" }}
            className="absolute rounded-full"
            style={{
              width: bubble.size,
              height: bubble.size,
              background: "radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8), rgba(6, 182, 212, 0.6), rgba(14, 165, 233, 0.4))",
              border: "3px solid rgba(6, 182, 212, 0.8)",
              boxShadow: "0 0 30px rgba(6, 182, 212, 0.8), inset 0 0 20px rgba(255, 255, 255, 0.5), 0 8px 32px rgba(6, 182, 212, 0.4)",
              backdropFilter: "blur(4px)"
            }}
            onAnimationComplete={() => handleAnimationComplete(bubble.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

