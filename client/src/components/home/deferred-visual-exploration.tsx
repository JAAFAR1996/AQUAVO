import { lazy, Suspense, useEffect, useRef, useState } from 'react';
function ExplorationSkeleton() {
  return <div aria-hidden="true" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8"><div className="mb-8 h-24 rounded-2xl bg-muted/30" /><div className="grid gap-6 lg:grid-cols-3">{[0, 1, 2].map(key => <div key={key} className="overflow-hidden rounded-2xl border border-border"><div className="aspect-[1672/941] bg-muted/30" /><div className="h-48 bg-card" /></div>)}</div><div className="mt-8 h-72 rounded-2xl bg-muted/30" /></div>;
}
const Exploration = lazy(() => import('./home-visual-exploration'));
/** Keep secondary imagery, catalogue validation and queries off the initial shell. */
export function DeferredVisualExploration() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!('IntersectionObserver' in window)) { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: '300px' });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref}>{visible ? <Suspense fallback={<ExplorationSkeleton />}><Exploration /></Suspense> : <ExplorationSkeleton />}</div>;
}
