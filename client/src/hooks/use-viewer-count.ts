import { useState, useEffect } from "react";

export function useViewerCount(productId: string): number | null {
  const base = productId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 8 + 3;
  const [count, setCount] = useState(base);

  useEffect(() => {
    const schedule = () => {
      const delay = Math.floor(Math.random() * 7000) + 8000;
      return setTimeout(() => {
        setCount((prev) => {
          const delta = (Math.random() < 0.5 ? -1 : 1) * (Math.random() < 0.4 ? 2 : 1);
          return Math.min(12, Math.max(2, prev + delta));
        });
        timer = schedule();
      }, delay);
    };

    let timer = schedule();
    return () => clearTimeout(timer);
  }, [productId]);

  return count >= 3 ? count : null;
}
