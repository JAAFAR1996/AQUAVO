import { useState, useCallback, useEffect, useRef } from "react";

interface UseInViewOptions {
  threshold?: number;
  once?: boolean;
  rootMargin?: string;
}

export function useInView(options?: UseInViewOptions): {
  ref: React.RefCallback<Element>;
  inView: boolean;
} {
  const threshold = options?.threshold ?? 0.1;
  const once = options?.once ?? true;
  const rootMargin = options?.rootMargin ?? "0px 0px -50px 0px";

  const [inView, setInView] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementRef = useRef<Element | null>(null);

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const ref = useCallback(
    (node: Element | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      elementRef.current = node;

      if (!node) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry.isIntersecting) {
            setInView(true);
            if (once) {
              observerRef.current?.disconnect();
              observerRef.current = null;
            }
          } else if (!once) {
            setInView(false);
          }
        },
        { threshold, rootMargin }
      );

      observerRef.current.observe(node);
    },
    [threshold, once, rootMargin]
  );

  return { ref, inView };
}
