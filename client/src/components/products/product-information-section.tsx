import { useState, useSyncExternalStore, type ReactNode } from "react";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

const desktopQuery = "(min-width: 768px)";
function subscribe(onChange: () => void) {
  const media = window.matchMedia(desktopQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** One copy of each section: expanded on desktop, independently collapsible on mobile. */
export function ProductInformationSection({ id, title, icon, children, defaultOpen = false }: {
  id: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const desktop = useSyncExternalStore(subscribe, () => window.matchMedia(desktopQuery).matches, () => false);
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Accordion.Root type="single" collapsible value={desktop || open ? id : ""} onValueChange={value => setOpen(value === id)}>
      <Accordion.Item value={id} id={id} className="scroll-mt-28 overflow-hidden border-b border-border">
        <Accordion.Header asChild>
          <h2>
            <Accordion.Trigger disabled={desktop}
              className="flex min-h-14 w-full items-center justify-between gap-3 py-5 text-start font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&[data-state=open]>svg]:rotate-180 md:cursor-default">
              <span className="flex items-center gap-2">{icon}{title}</span>
              <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none md:hidden" />
            </Accordion.Trigger>
          </h2>
        </Accordion.Header>
        <Accordion.Content className="pb-5">{children}</Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  );
}
