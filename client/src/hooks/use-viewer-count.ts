import { useState, useEffect, useCallback } from "react";

// Baghdad = UTC+3
function getBaghdadHour(): number {
  return (new Date().getUTCHours() + 3) % 24;
}

// Returns 0-2.0 multiplier based on time + day (Iraqi Friday/Saturday = weekend)
function getActivityMultiplier(): number {
  const hour = getBaghdadHour();
  const day = new Date().getDay();
  const weekendBoost = day === 5 || day === 6 ? 1.35 : 1;

  let m: number;
  if (hour >= 19 && hour <= 23)      m = 2.0;  // peak evening
  else if (hour >= 14 && hour < 19)  m = 1.4;  // afternoon
  else if (hour >= 9  && hour < 14)  m = 1.0;  // morning
  else if (hour >= 6  && hour < 9)   m = 0.5;  // early morning
  else                                m = 0.15; // night → nearly zero

  return m * weekendBoost;
}

// 3 popularity tiers based on product id hash
function getPopularityBase(productId: string): number {
  const hash = productId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const tier = hash % 3;
  return tier === 0 ? 2 : tier === 1 ? 5 : 8;
}

function compute(productId: string): number {
  const base = getPopularityBase(productId);
  const raw = Math.round(base * getActivityMultiplier());
  const noise = Math.floor(Math.random() * 3) - 1; // -1, 0, +1
  return Math.max(0, raw + noise);
}

export function useViewerCount(productId: string): number | null {
  const [count, setCount] = useState(() => compute(productId));

  const refresh = useCallback(() => {
    setCount(compute(productId));
  }, [productId]);

  useEffect(() => {
    // Re-baseline every 5 min (hour changes affect multiplier)
    const activityTimer = setInterval(refresh, 5 * 60 * 1000);

    // Small live drift every 10-20s — can go up or down or stay
    const scheduleDrift = (): ReturnType<typeof setTimeout> =>
      setTimeout(() => {
        setCount(prev => {
          const target = Math.round(getPopularityBase(productId) * getActivityMultiplier());
          // Nudge toward current target ±1 random walk
          const pull = prev < target ? 1 : prev > target ? -1 : 0;
          const delta = pull + (Math.floor(Math.random() * 3) - 1);
          return Math.max(0, Math.min(15, prev + delta));
        });
        driftTimer = scheduleDrift();
      }, Math.floor(Math.random() * 10_000) + 10_000);

    let driftTimer = scheduleDrift();

    return () => {
      clearInterval(activityTimer);
      clearTimeout(driftTimer);
    };
  }, [productId, refresh]);

  return count >= 2 ? count : null;
}
