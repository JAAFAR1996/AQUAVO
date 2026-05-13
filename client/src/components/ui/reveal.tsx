import { useInView } from "@/hooks/use-in-view";

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  direction?: "up" | "left" | "right";
  className?: string;
  once?: boolean;
}

const HIDDEN_TRANSFORM: Record<NonNullable<RevealProps["direction"]>, string> = {
  up: "translateY(16px)",
  left: "translateX(-16px)",
  right: "translateX(16px)",
};

export function Reveal({
  children,
  delay = 0,
  direction = "up",
  className,
  once = true,
}: RevealProps) {
  const { ref, inView } = useInView({ once });

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translate(0)" : HIDDEN_TRANSFORM[direction],
        transition: `all 400ms cubic-bezier(0.4, 0, 0.2, 1)`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
