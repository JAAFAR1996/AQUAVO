import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, HelpCircle, PackageSearch } from "lucide-react";

/**
 * What AQUAVO actually stocks for the tank the customer just described.
 *
 * The wizard already asks for litres. Until now it answered with generic aquarium rules — "1 واط لكل
 * لتر" — which name no product AQUAVO sells and can contradict the catalogue outright: that rule
 * prescribes 80W for an 80 litre tank, while AQUAVO's own 100W heater is rated by its manufacturer for
 * 50–100 litres. Sizing is 19% of every customer message AQUAVO receives, and it is currently answered
 * by a human, once per sale.
 *
 * This component shows only what the catalogue can defend. A product appears as a match ONLY when its
 * own specification states a litre range that covers this tank. Products whose specification states no
 * range are listed separately and explicitly as "size not stated" — never silently promoted into the
 * recommendation, and never hidden either.
 */

type Range = { minL: number | null; maxL: number | null };
type Candidate = {
  productId: string;
  name: string;
  slug: string | null;
  category: string | null;
  price: number | null;
  variantId: string | null;
  variantLabel: string | null;
  range: Range | null;
  evidence: string | null;
};
type Group = {
  category: string;
  fits: Candidate[];
  ratedButUnsuitable: (Candidate & { verdict: string })[];
  noSizeEvidence: Candidate[];
};

const fmtPrice = (p: number | null) => (typeof p === "number" && p > 0 ? `${p.toLocaleString("en-US")} د.ع` : null);

function ProductLine({ c, tone }: { c: Candidate; tone: "fit" | "unknown" }) {
  const href = c.slug ? `/products/${c.slug}` : `/products/${c.productId}`;
  return (
    <Link href={href}>
      <a className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background/60 p-3 transition-colors hover:border-primary/50">
        <div className="min-w-0 text-right">
          <div className="text-sm font-bold text-foreground">
            {c.name}
            {c.variantLabel ? <span className="text-primary"> — {c.variantLabel}</span> : null}
          </div>
          {/* The exact catalogue sentence the match came from. A shopper can check our work. */}
          {c.evidence ? (
            <div className="mt-0.5 text-xs text-muted-foreground">{c.evidence}</div>
          ) : (
            <div className="mt-0.5 text-xs text-muted-foreground">المواصفات ما تذكر حجم حوض مناسب</div>
          )}
        </div>
        <div className="shrink-0 text-left">
          {fmtPrice(c.price) ? <div className="text-xs font-bold text-foreground">{fmtPrice(c.price)}</div> : null}
          {tone === "fit" ? (
            <Badge className="mt-1 bg-primary/15 text-primary hover:bg-primary/15">مناسب</Badge>
          ) : (
            <Badge variant="outline" className="mt-1">غير محدد</Badge>
          )}
        </div>
      </a>
    </Link>
  );
}

export function TankFit({ litres }: { litres: number }) {
  const enabled = Number.isFinite(litres) && litres >= 10 && litres <= 2000;

  const { data, isLoading, isError } = useQuery<{ litres: number; groups: Group[]; limitation: string }>({
    queryKey: ["products", "fit", litres],
    queryFn: async () => {
      const r = await fetch(`/api/products/fit?litres=${litres}`);
      if (!r.ok) throw new Error("fit request failed");
      return r.json();
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (!enabled) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4 text-right text-sm text-muted-foreground">
        اكتب حجم حوضك باللتر بالخطوة السابقة، وننطيك المنتجات المناسبة من مخزوننا.
      </div>
    );
  }

  // A failed request must not become a confident-looking answer.
  if (isError) {
    return (
      <div className="rounded-xl border border-border p-4 text-right text-sm text-muted-foreground">
        ما كدرنا نجيب التوصيات هسه. جرّب مرة ثانية أو تصفح المنتجات.
      </div>
    );
  }
  if (isLoading || !data) {
    return <div className="rounded-xl border border-border p-4 text-right text-sm text-muted-foreground">دنكلّب المخزون…</div>;
  }

  const groups = (data.groups ?? []).filter((g) => g.fits.length > 0 || g.noSizeEvidence.length > 0);
  const anyFit = groups.some((g) => g.fits.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-right">
        <PackageSearch className="h-5 w-5 text-primary" />
        <div className="font-bold text-foreground">شنو يناسب حوض {litres} لتر من مخزون AQUAVO؟</div>
      </div>

      {!anyFit && (
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-right text-sm text-muted-foreground">
          ما عدنا منتج مواصفاته تذكر إنه يناسب حوض {litres} لتر. ما راح نوصّيك بشي مو متأكدين منه.
        </div>
      )}

      {groups.map((g) => (
        <div key={g.category} className="space-y-2">
          <div className="text-right text-sm font-bold text-foreground">{g.category}</div>

          {g.fits.length > 0 && (
            <div className="space-y-2">
              {g.fits.map((c) => (
                <ProductLine key={`${c.productId}:${c.variantId ?? "-"}`} c={c} tone="fit" />
              ))}
            </div>
          )}

          {g.fits.length === 0 && g.noSizeEvidence.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-muted/30 p-3 text-right text-xs text-muted-foreground">
              <HelpCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>ما عدنا بهذا القسم منتج مواصفاته تحدد حجم الحوض. المنتجات أدناه ممكن تناسب، بس المواصفات ما تأكد.</span>
            </div>
          )}

          {/* Shown, but never as a match. Hiding them would imply AQUAVO has nothing; promoting them would be a guess. */}
          {g.noSizeEvidence.length > 0 && (
            <details className="rounded-lg border border-border/60 p-2">
              <summary className="cursor-pointer text-right text-xs text-muted-foreground">
                منتجات ثانية بهذا القسم ({g.noSizeEvidence.length}) — الحجم غير مذكور بالمواصفات
              </summary>
              <div className="mt-2 space-y-2">
                {g.noSizeEvidence.slice(0, 6).map((c) => (
                  <ProductLine key={`${c.productId}:${c.variantId ?? "-"}`} c={c} tone="unknown" />
                ))}
              </div>
            </details>
          )}
        </div>
      ))}

      <div className="flex items-start gap-2 rounded-lg bg-muted/20 p-3 text-right text-xs text-muted-foreground">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>{data.limitation}</span>
      </div>
    </div>
  );
}
