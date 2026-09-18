import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, type LucideProps } from "lucide-react";
import { useLocale } from "@/i18n/locale-context";

/**
 * Icons whose meaning is "forward / continue" or "back". In an RTL layout
 * forward points left; in LTR it points right. Use these instead of a literal
 * ArrowLeft/ArrowRight wherever the arrow expresses direction of travel.
 * Non-directional icons (search, cart, close) must not be mirrored.
 */
export function ArrowForward(props: LucideProps) {
  const { dir } = useLocale();
  return dir === "rtl" ? <ArrowLeft {...props} /> : <ArrowRight {...props} />;
}

export function ArrowBack(props: LucideProps) {
  const { dir } = useLocale();
  return dir === "rtl" ? <ArrowRight {...props} /> : <ArrowLeft {...props} />;
}

export function ChevronForward(props: LucideProps) {
  const { dir } = useLocale();
  return dir === "rtl" ? <ChevronLeft {...props} /> : <ChevronRight {...props} />;
}

export function ChevronBack(props: LucideProps) {
  const { dir } = useLocale();
  return dir === "rtl" ? <ChevronRight {...props} /> : <ChevronLeft {...props} />;
}

/** Tailwind hover translate that moves "forward" in the reading direction. */
export function useForwardHoverClass(): string {
  const { dir } = useLocale();
  return dir === "rtl" ? "group-hover:-translate-x-1" : "group-hover:translate-x-1";
}
