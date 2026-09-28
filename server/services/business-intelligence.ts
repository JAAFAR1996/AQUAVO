import { sql } from "drizzle-orm";
import { getDb } from "../db.js";

type Row = Record<string, unknown>;
type Confidence = "exact" | "mixed" | "estimated";

function rowsOf<T extends Row = Row>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const rows = (result as { rows?: T[] } | null)?.rows;
  return Array.isArray(rows) ? rows : [];
}

function n(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validateDay(day: string): string {
  if (!/^20\d{2}-(0[1-9]|1[0-2])-([012]\d|3[01])$/.test(day)) {
    throw new Error("BUSINESS_INTELLIGENCE_INVALID_DAY");
  }
  return day;
}

export function baghdadDay(offsetDays = 0): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date(Date.now() + offsetDays * 86_400_000));
}

function realizedOrderCte() {
  return sql.raw(`
realized_base AS (
  SELECT
    o.id,
    o.order_number,
    o.user_id,
    o.customer_phone,
    o.customer_email,
    o.created_at,
    o.shipping_cost,
    o.carrier_fee,
    o.box_cost,
    o.total,
    f.order_id AS accounting_order_id,
    v.recognized_at,
    v.gross_collected AS exact_gross,
    v.product_revenue AS exact_product_revenue,
    v.cogs_amount AS exact_cogs,
    v.delivery_subsidy AS exact_delivery_subsidy,
    v.contribution_profit AS exact_contribution
  FROM public.orders o
  LEFT JOIN public.order_accounting_facts f ON f.order_id=o.id
  LEFT JOIN public.v_order_accounting v ON v.order_id=o.id
  WHERE COALESCE(o.is_test,false)=false
    AND o.status='delivered'
    AND o.payment_status='paid'
    AND o.cod_received=true
),
old_line_cost AS (
  SELECT
    oi.order_id,
    SUM(
      oi.quantity * COALESCE(
        (
          SELECT s.unit_cost
          FROM public.opening_inventory_snapshot s
          JOIN public.accounting_cutovers c
            ON c.id=s.cutover_id AND c.status='active'
          WHERE s.product_id=oi.product_id
            AND s.variant_id IS NOT DISTINCT FROM NULLIF(oi.metadata->>'variantId','')
            AND s.cost_status='known'
            AND s.unit_cost IS NOT NULL
          ORDER BY s.as_of DESC
          LIMIT 1
        ),
        (
          SELECT s.unit_cost
          FROM public.opening_inventory_snapshot s
          JOIN public.accounting_cutovers c
            ON c.id=s.cutover_id AND c.status='active'
          WHERE s.product_id=oi.product_id
            AND s.variant_id IS NULL
            AND s.cost_status='known'
            AND s.unit_cost IS NOT NULL
          ORDER BY s.as_of DESC
          LIMIT 1
        ),
        (
          SELECT NULLIF(vv->>'costPrice','')::numeric
          FROM public.products pv
          CROSS JOIN LATERAL jsonb_array_elements(COALESCE(pv.variants,'[]'::jsonb)) vv
          WHERE pv.id=oi.product_id
            AND vv->>'id'=NULLIF(oi.metadata->>'variantId','')
            AND COALESCE(vv->>'costStatus','') IN ('verified_derived','exact','known','verified_zero')
          LIMIT 1
        ),
        CASE
          WHEN p.cost_price_resolution IN ('known','verified_zero')
           AND p.packaging_cost_resolution IN ('known','verified_zero')
           AND p.insert_cost_resolution IN ('known','verified_zero')
          THEN COALESCE(p.cost_price,0)+COALESCE(p.packaging_cost,0)+COALESCE(p.insert_cost,0)
          ELSE NULL
        END
      )
    ) AS estimated_cogs,
    COUNT(*) FILTER (
      WHERE COALESCE(
        (
          SELECT s.unit_cost
          FROM public.opening_inventory_snapshot s
          JOIN public.accounting_cutovers c
            ON c.id=s.cutover_id AND c.status='active'
          WHERE s.product_id=oi.product_id
            AND s.variant_id IS NOT DISTINCT FROM NULLIF(oi.metadata->>'variantId','')
            AND s.cost_status='known'
            AND s.unit_cost IS NOT NULL
          ORDER BY s.as_of DESC
          LIMIT 1
        ),
        (
          SELECT s.unit_cost
          FROM public.opening_inventory_snapshot s
          JOIN public.accounting_cutovers c
            ON c.id=s.cutover_id AND c.status='active'
          WHERE s.product_id=oi.product_id
            AND s.variant_id IS NULL
            AND s.cost_status='known'
            AND s.unit_cost IS NOT NULL
          ORDER BY s.as_of DESC
          LIMIT 1
        )
      ) IS NOT NULL
    ) AS opening_cost_lines,
    COUNT(*) AS total_lines
  FROM public.order_items_relational oi
  JOIN public.products p ON p.id=oi.product_id
  GROUP BY oi.order_id
),
realized AS (
  SELECT
    r.id,
    r.order_number,
    COALESCE(r.recognized_at, r.created_at AT TIME ZONE 'UTC') AS realized_at,
    COALESCE(NULLIF(regexp_replace(r.customer_phone,'\\D','','g'),''), r.user_id, lower(r.customer_email), r.id) AS customer_key,
    CASE WHEN r.accounting_order_id IS NOT NULL THEN 'exact' ELSE 'estimated' END AS basis,
    CASE WHEN r.accounting_order_id IS NOT NULL THEN r.exact_gross ELSE r.total END AS gross_collected,
    CASE WHEN r.accounting_order_id IS NOT NULL THEN r.exact_product_revenue ELSE r.total-r.shipping_cost END AS product_revenue,
    CASE WHEN r.accounting_order_id IS NOT NULL THEN r.exact_cogs ELSE lc.estimated_cogs END AS cogs,
    CASE
      WHEN r.accounting_order_id IS NOT NULL THEN r.exact_delivery_subsidy
      ELSE GREATEST(COALESCE(r.carrier_fee,r.shipping_cost)-r.shipping_cost,0)
    END AS delivery_subsidy,
    CASE
      WHEN r.accounting_order_id IS NOT NULL
        THEN GREATEST(r.exact_product_revenue-r.exact_cogs-r.exact_delivery_subsidy-r.exact_contribution,0)
      ELSE COALESCE(r.box_cost,0)
    END AS fulfillment_cost,
    CASE
      WHEN r.accounting_order_id IS NOT NULL THEN r.exact_contribution
      ELSE (r.total-r.shipping_cost)
           - lc.estimated_cogs
           - GREATEST(COALESCE(r.carrier_fee,r.shipping_cost)-r.shipping_cost,0)
           - COALESCE(r.box_cost,0)
    END AS contribution_profit,
    COALESCE(lc.opening_cost_lines,0) AS opening_cost_lines,
    COALESCE(lc.total_lines,0) AS old_total_lines
  FROM realized_base r
  LEFT JOIN old_line_cost lc ON lc.order_id=r.id
)
`);
}

async function calculatePeriod(fromDay: string | null, toDay: string | null) {
  const db = getDb();
  if (!db) throw new Error("DATABASE_NOT_CONNECTED");
  const from = fromDay ? validateDay(fromDay) : null;
  const to = toDay ? validateDay(toDay) : null;

  const result = await db.execute(sql`
    WITH ${realizedOrderCte()}
    SELECT
      COUNT(*)::int AS realized_orders,
      COUNT(*) FILTER (WHERE basis='exact')::int AS exact_orders,
      COUNT(*) FILTER (WHERE basis='estimated')::int AS estimated_orders,
      COALESCE(SUM(gross_collected),0) AS gross_collected,
      COALESCE(SUM(product_revenue),0) AS product_revenue,
      COALESCE(SUM(cogs),0) AS cogs,
      COALESCE(SUM(delivery_subsidy),0) AS delivery_subsidy,
      COALESCE(SUM(fulfillment_cost),0) AS fulfillment_cost,
      COALESCE(SUM(contribution_profit),0) AS contribution_profit,
      COALESCE(AVG(gross_collected),0) AS avg_order_value,
      COALESCE(SUM(opening_cost_lines),0)::int AS opening_cost_lines,
      COALESCE(SUM(old_total_lines),0)::int AS old_total_lines
    FROM realized
    WHERE (${from}::date IS NULL OR (realized_at AT TIME ZONE 'Asia/Baghdad')::date >= ${from}::date)
      AND (${to}::date IS NULL OR (realized_at AT TIME ZONE 'Asia/Baghdad')::date <= ${to}::date)
  `);
  const row = rowsOf(result)[0] ?? {};
  return {
    realizedOrders: n(row.realized_orders),
    exactOrders: n(row.exact_orders),
    estimatedOrders: n(row.estimated_orders),
    grossCollected: n(row.gross_collected),
    productRevenue: n(row.product_revenue),
    cogs: n(row.cogs),
    deliverySubsidy: n(row.delivery_subsidy),
    fulfillmentCost: n(row.fulfillment_cost),
    contributionProfit: n(row.contribution_profit),
    avgOrderValue: n(row.avg_order_value),
    openingCostLines: n(row.opening_cost_lines),
    oldTotalLines: n(row.old_total_lines),
  };
}

async function customerMetrics(asOfDay: string | null) {
  const db = getDb();
  if (!db) throw new Error("DATABASE_NOT_CONNECTED");
  const asOf = asOfDay ? validateDay(asOfDay) : null;
  const result = await db.execute(sql`
    WITH ${realizedOrderCte()},
    scoped AS (
      SELECT *
      FROM realized
      WHERE ${asOf}::date IS NULL
         OR (realized_at AT TIME ZONE 'Asia/Baghdad')::date <= ${asOf}::date
    ),
    per_customer AS (
      SELECT customer_key,
             COUNT(*)::int AS order_count,
             MIN((realized_at AT TIME ZONE 'Asia/Baghdad')::date) AS first_order_day
      FROM scoped
      GROUP BY customer_key
    )
    SELECT
      COUNT(*)::int AS customers_total,
      COUNT(*) FILTER (WHERE order_count>=2)::int AS repeat_customers_total,
      COALESCE(ROUND(100.0*COUNT(*) FILTER (WHERE order_count>=2)/NULLIF(COUNT(*),0),2),0) AS repeat_rate,
      COUNT(*) FILTER (WHERE first_order_day=${asOf}::date)::int AS new_customers
    FROM per_customer
  `);
  const row = rowsOf(result)[0] ?? {};
  return {
    customersTotal: n(row.customers_total),
    repeatCustomersTotal: n(row.repeat_customers_total),
    repeatCustomerRatePct: n(row.repeat_rate),
    newCustomers: asOf ? n(row.new_customers) : 0,
  };
}

async function dailyOperatingExpenses(day: string) {
  const db = getDb();
  if (!db) throw new Error("DATABASE_NOT_CONNECTED");
  const target = validateDay(day);
  const result = await db.execute(sql`
    SELECT COALESCE(SUM(jl.debit-jl.credit),0) AS operating_expenses
    FROM public.journal_lines jl
    JOIN public.journal_entries je ON je.id=jl.entry_id AND je.status='posted'
    JOIN public.chart_of_accounts coa ON coa.code=jl.account_code
    WHERE coa.account_type='expense'
      AND jl.account_code NOT IN ('4000','5100','5200')
      AND (je.entry_date AT TIME ZONE 'Asia/Baghdad')::date=${target}::date
  `);
  return n(rowsOf(result)[0]?.operating_expenses);
}

async function marketingMetrics(day: string | null) {
  const db = getDb();
  if (!db) throw new Error("DATABASE_NOT_CONNECTED");
  const target = day ? validateDay(day) : null;
  const result = await db.execute(sql`
    SELECT
      COUNT(*)::int AS rows_count,
      COALESCE(SUM(spend_iqd),0) AS ad_spend,
      COALESCE(SUM(tracked_conversions),0) AS tracked_conversions,
      COALESCE(SUM(conversion_value_iqd),0) AS conversion_value,
      COALESCE(SUM(impressions),0) AS impressions,
      COALESCE(SUM(clicks),0) AS clicks,
      COUNT(*) FILTER (WHERE confidence='exact')::int AS exact_rows
    FROM public.business_marketing_daily
    WHERE ${target}::date IS NULL OR day=${target}::date
  `);
  const row = rowsOf(result)[0] ?? {};
  return {
    rows: n(row.rows_count),
    adSpend: n(row.ad_spend),
    trackedConversions: n(row.tracked_conversions),
    conversionValue: n(row.conversion_value),
    impressions: n(row.impressions),
    clicks: n(row.clicks),
    exactRows: n(row.exact_rows),
  };
}

export async function getInventoryHealth(limitInput = 25) {
  const db = getDb();
  if (!db) throw new Error("DATABASE_NOT_CONNECTED");
  const limit = Math.max(1, Math.min(100, Math.floor(Number(limitInput) || 25)));

  const summary = await db.execute(sql`
    WITH stock AS (
      SELECT product_id, variant_id, SUM(canonical_stock)::numeric AS stock
      FROM public.inventory_canonical_balances
      GROUP BY product_id, variant_id
    ),
    costed AS (
      SELECT
        s.product_id,s.variant_id,s.stock,p.name,p.low_stock_threshold,p.is_storefront_visible,
        COALESCE(
          (
            SELECT NULLIF(vv->>'costPrice','')::numeric
            FROM jsonb_array_elements(COALESCE(p.variants,'[]'::jsonb)) vv
            WHERE vv->>'id'=s.variant_id
              AND COALESCE(vv->>'costStatus','') IN ('verified_derived','exact','known','verified_zero')
            LIMIT 1
          ),
          CASE
            WHEN p.cost_price_resolution IN ('known','verified_zero')
             AND p.packaging_cost_resolution IN ('known','verified_zero')
             AND p.insert_cost_resolution IN ('known','verified_zero')
            THEN COALESCE(p.cost_price,0)+COALESCE(p.packaging_cost,0)+COALESCE(p.insert_cost,0)
          END
        ) AS unit_cost
      FROM stock s
      JOIN public.products p ON p.id=s.product_id
      WHERE p.deleted_at IS NULL
    ),
    sales AS (
      SELECT
        oi.product_id,
        NULLIF(oi.metadata->>'variantId','') AS variant_id,
        MAX(COALESCE(v.recognized_at,o.created_at AT TIME ZONE 'UTC')) AS last_sale_at,
        SUM(oi.quantity) FILTER (
          WHERE COALESCE(v.recognized_at,o.created_at AT TIME ZONE 'UTC') >= now()-interval '60 days'
        ) AS units_60d
      FROM public.order_items_relational oi
      JOIN public.orders o ON o.id=oi.order_id
      LEFT JOIN public.v_order_accounting v ON v.order_id=o.id
      WHERE COALESCE(o.is_test,false)=false
        AND o.status='delivered' AND o.payment_status='paid' AND o.cod_received=true
      GROUP BY oi.product_id,NULLIF(oi.metadata->>'variantId','')
    ),
    enriched AS (
      SELECT c.*,sa.last_sale_at,COALESCE(sa.units_60d,0) AS units_60d,
             CASE WHEN c.unit_cost IS NULL THEN NULL ELSE c.stock*c.unit_cost END AS stock_value,
             CASE WHEN c.stock>0 AND COALESCE(sa.units_60d,0)=0 THEN true ELSE false END AS dead_60d
      FROM costed c
      LEFT JOIN sales sa ON sa.product_id=c.product_id AND sa.variant_id IS NOT DISTINCT FROM c.variant_id
    )
    SELECT
      COUNT(*)::int AS sku_count,
      COUNT(*) FILTER (WHERE stock<=0 AND is_storefront_visible)::int AS stockout_skus,
      COUNT(*) FILTER (WHERE stock>0 AND stock<=low_stock_threshold AND is_storefront_visible)::int AS low_stock_skus,
      COUNT(*) FILTER (WHERE dead_60d)::int AS dead_skus,
      COUNT(*) FILTER (WHERE stock>0 AND unit_cost IS NULL)::int AS uncosted_stock_skus,
      COALESCE(SUM(stock_value) FILTER (WHERE dead_60d),0) AS dead_stock_value
    FROM enriched
  `);

  const deadRows = await db.execute(sql`
    WITH stock AS (
      SELECT product_id,variant_id,SUM(canonical_stock)::numeric AS stock
      FROM public.inventory_canonical_balances GROUP BY product_id,variant_id
    ),
    sales AS (
      SELECT oi.product_id,NULLIF(oi.metadata->>'variantId','') AS variant_id,
             MAX(COALESCE(v.recognized_at,o.created_at AT TIME ZONE 'UTC')) AS last_sale_at,
             COALESCE(SUM(oi.quantity) FILTER (
               WHERE COALESCE(v.recognized_at,o.created_at AT TIME ZONE 'UTC') >= now()-interval '60 days'
             ),0) AS units_60d
      FROM public.order_items_relational oi
      JOIN public.orders o ON o.id=oi.order_id
      LEFT JOIN public.v_order_accounting v ON v.order_id=o.id
      WHERE COALESCE(o.is_test,false)=false
        AND o.status='delivered' AND o.payment_status='paid' AND o.cod_received=true
      GROUP BY oi.product_id,NULLIF(oi.metadata->>'variantId','')
    )
    SELECT p.id AS product_id,p.name,s.variant_id,s.stock,sa.last_sale_at,COALESCE(sa.units_60d,0) AS units_60d
    FROM stock s
    JOIN public.products p ON p.id=s.product_id
    LEFT JOIN sales sa ON sa.product_id=s.product_id AND sa.variant_id IS NOT DISTINCT FROM s.variant_id
    WHERE p.deleted_at IS NULL AND s.stock>0 AND COALESCE(sa.units_60d,0)=0
    ORDER BY s.stock DESC,p.name
    LIMIT ${limit}
  `);

  const currentAsset = await db.execute(sql`
    SELECT missing_current_costs,on_hand_inventory_iqd
    FROM public.v_accounting_inventory_asset_reconciliation
    LIMIT 1
  `);
  const packaging = await db.execute(sql`
    SELECT balance FROM public.v_accounting_live_balances WHERE code='1210' LIMIT 1
  `);

  const s = rowsOf(summary)[0] ?? {};
  return {
    inventoryValue: n(rowsOf(currentAsset)[0]?.on_hand_inventory_iqd),
    missingCurrentCosts: n(rowsOf(currentAsset)[0]?.missing_current_costs),
    packagingInventoryValue: n(rowsOf(packaging)[0]?.balance),
    skuCount: n(s.sku_count),
    stockoutSkus: n(s.stockout_skus),
    lowStockSkus: n(s.low_stock_skus),
    deadSkus: n(s.dead_skus),
    uncostedStockSkus: n(s.uncosted_stock_skus),
    deadStockValue: n(s.dead_stock_value),
    deadItems: rowsOf(deadRows).map((row) => ({
      productId: String(row.product_id ?? ""),
      name: String(row.name ?? ""),
      variantId: row.variant_id == null ? null : String(row.variant_id),
      stock: n(row.stock),
      units60d: n(row.units_60d),
      lastSaleAt: row.last_sale_at ?? null,
    })),
  };
}

export async function getBusinessFindings() {
  const db = getDb();
  if (!db) throw new Error("DATABASE_NOT_CONNECTED");
  const result = await db.execute(sql`
    SELECT id,fingerprint,finding_type,metric_key,severity,title_ar,details,status,
           first_seen_at,last_seen_at,resolved_at
    FROM public.business_findings
    WHERE status='open'
    ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,last_seen_at DESC
  `);
  return rowsOf(result).map((row) => ({ ...row, severity: String(row.severity ?? "info") })) as Array<Row & {severity:string}>;
}

export async function getBusinessOverview() {
  const [allTime, customers, marketing, inventory] = await Promise.all([
    calculatePeriod(null,null),customerMetrics(null),marketingMetrics(null),getInventoryHealth(10),
  ]);
  const db = getDb();
  if (!db) throw new Error("DATABASE_NOT_CONNECTED");
  const op = await db.execute(sql`
    SELECT COALESCE(SUM(jl.debit-jl.credit),0) AS operating_expenses
    FROM public.journal_lines jl
    JOIN public.journal_entries je ON je.id=jl.entry_id AND je.status='posted'
    JOIN public.chart_of_accounts coa ON coa.code=jl.account_code
    WHERE coa.account_type='expense' AND jl.account_code NOT IN ('4000','5100','5200')
  `);
  const operatingExpenses = n(rowsOf(op)[0]?.operating_expenses);
  const netOperatingProfit = allTime.contributionProfit-operatingExpenses-marketing.adSpend;
  const marketingComplete = marketing.rows>0;
  const confidence: Confidence = allTime.estimatedOrders>0 || !marketingComplete ? "mixed" : "exact";
  const findings = await getBusinessFindings();
  return {
    generatedAt: new Date().toISOString(),currency:"IQD",confidence,
    financials:{...allTime,operatingExpenses,adSpend:marketing.adSpend,netOperatingProfit,recordedMarketingOnly:true},
    customers,
    inventory,
    marketing:{
      ...marketing,configured:marketingComplete,
      blendedCac:customers.customersTotal>0 && marketing.adSpend>0 ? marketing.adSpend/customers.customersTotal : null,
      roas:marketing.adSpend>0 ? marketing.conversionValue/marketing.adSpend : null,
      mer:marketing.adSpend>0 ? allTime.productRevenue/marketing.adSpend : null,
    },
    findings:{
      open:findings.length,
      critical:findings.filter((item)=>item.severity==="critical").length,
      warning:findings.filter((item)=>item.severity==="warning").length,
    },
    methodology:{
      exactAccountingOrders:allTime.exactOrders,
      reconstructedLegacyOrders:allTime.estimatedOrders,
      legacyCostRule:"exact variant opening snapshot -> product opening snapshot -> verified current variant cost -> verified current product cost",
      marketingRule:"only rows imported into business_marketing_daily are deducted; missing provider sync is never silently treated as complete",
    },
  };
}

export async function getBusinessHistory(daysInput=90) {
  const db=getDb();
  if(!db) throw new Error("DATABASE_NOT_CONNECTED");
  const days=Math.max(1,Math.min(366,Math.floor(Number(daysInput)||90)));
  const result=await db.execute(sql`
    SELECT * FROM public.business_daily_snapshots
    WHERE day >= (CURRENT_DATE-${days}::int)
    ORDER BY day ASC
  `);
  return rowsOf(result).map((row)=>({
    ...row,
    realized_orders:n(row.realized_orders),exact_orders:n(row.exact_orders),estimated_orders:n(row.estimated_orders),
    gross_collected:n(row.gross_collected),product_revenue:n(row.product_revenue),cogs:n(row.cogs),
    delivery_subsidy:n(row.delivery_subsidy),fulfillment_cost:n(row.fulfillment_cost),
    contribution_profit:n(row.contribution_profit),operating_expenses:n(row.operating_expenses),
    ad_spend:n(row.ad_spend),net_operating_profit:n(row.net_operating_profit),
    customers_total:n(row.customers_total),repeat_customers_total:n(row.repeat_customers_total),
    repeat_customer_rate_pct:n(row.repeat_customer_rate_pct),new_customers:n(row.new_customers),
    avg_order_value:n(row.avg_order_value),inventory_value:nullableNumber(row.inventory_value),
    packaging_inventory_value:nullableNumber(row.packaging_inventory_value),dead_stock_value:nullableNumber(row.dead_stock_value),
    low_stock_skus:nullableNumber(row.low_stock_skus),stockout_skus:nullableNumber(row.stockout_skus),
    blended_cac:nullableNumber(row.blended_cac),roas:nullableNumber(row.roas),mer:nullableNumber(row.mer),
  }));
}

async function upsertFinding(input:{
  fingerprint:string;findingType:string;metricKey?:string|null;severity:"info"|"warning"|"critical";
  titleAr:string;details:Record<string,unknown>;
}) {
  const db=getDb();
  if(!db) throw new Error("DATABASE_NOT_CONNECTED");
  await db.execute(sql`
    INSERT INTO public.business_findings(
      fingerprint,finding_type,metric_key,severity,title_ar,details,status,first_seen_at,last_seen_at,resolved_at,updated_at
    ) VALUES(
      ${input.fingerprint},${input.findingType},${input.metricKey ?? null},${input.severity},
      ${input.titleAr},${JSON.stringify(input.details)}::jsonb,'open',now(),now(),NULL,now()
    )
    ON CONFLICT(fingerprint) DO UPDATE SET
      finding_type=EXCLUDED.finding_type,metric_key=EXCLUDED.metric_key,severity=EXCLUDED.severity,
      title_ar=EXCLUDED.title_ar,details=EXCLUDED.details,status='open',last_seen_at=now(),resolved_at=NULL,updated_at=now()
  `);
}

async function resolveFinding(fingerprint:string) {
  const db=getDb();
  if(!db) return;
  await db.execute(sql`
    UPDATE public.business_findings SET status='resolved',resolved_at=now(),updated_at=now()
    WHERE fingerprint=${fingerprint} AND status='open'
  `);
}

async function refreshFindings(day:string,snapshot:Record<string,number>,marketingRows:number) {
  const checks:Array<{fingerprint:string;active:boolean;findingType:string;metricKey?:string;severity:"warning"|"critical";titleAr:string;details:Record<string,unknown>}>= [
    {fingerprint:"bos:marketing-data-missing",active:marketingRows===0,findingType:"data_quality",metricKey:"ad_spend",severity:"warning",titleAr:"بيانات الإعلانات غير مربوطة بالنظام بعد",details:{day,reason:"No marketing facts recorded; profit excludes unimported ad spend."}},
    {fingerprint:"bos:repeat-rate-below-20",active:snapshot.customersTotal>=20&&snapshot.repeatRate<20,findingType:"customer_retention",metricKey:"repeat_customer_rate_pct",severity:"warning",titleAr:"نسبة العملاء المتكررين أقل من 20%",details:{day,repeatRate:snapshot.repeatRate,customers:snapshot.customersTotal}},
    {fingerprint:"bos:net-operating-loss",active:snapshot.netProfit<0,findingType:"profitability",metricKey:"net_operating_profit",severity:"critical",titleAr:"الربح التشغيلي المسجل أصبح سالباً",details:{day,netOperatingProfit:snapshot.netProfit}},
    {fingerprint:"bos:tracked-conversions-zero",active:snapshot.adSpend>0&&snapshot.trackedConversions===0,findingType:"marketing_attribution",metricKey:"roas",severity:"warning",titleAr:"يوجد إنفاق إعلاني لكن التحويلات المتتبعة صفر",details:{day,adSpend:snapshot.adSpend}},
  ];
  for(const check of checks){
    if(check.active) await upsertFinding(check);
    else await resolveFinding(check.fingerprint);
  }
}

export async function refreshBusinessSnapshot(dayInput?:string) {
  const day=validateDay(dayInput ?? baghdadDay(-1));
  const db=getDb();
  if(!db) throw new Error("DATABASE_NOT_CONNECTED");
  const [period,customers,operatingExpenses,marketing]=await Promise.all([
    calculatePeriod(day,day),customerMetrics(day),dailyOperatingExpenses(day),marketingMetrics(day),
  ]);
  const isPreviousDay=day===baghdadDay(-1);
  const inventory=isPreviousDay ? await getInventoryHealth(25) : null;
  const netOperatingProfit=period.contributionProfit-operatingExpenses-marketing.adSpend;
  const blendedCac=marketing.adSpend>0&&customers.newCustomers>0 ? marketing.adSpend/customers.newCustomers : null;
  const roas=marketing.adSpend>0 ? marketing.conversionValue/marketing.adSpend : null;
  const mer=marketing.adSpend>0 ? period.productRevenue/marketing.adSpend : null;
  const confidence:Confidence=period.estimatedOrders>0||marketing.rows===0 ? "mixed" : "exact";
  const details={
    methodology:"bos_v1",marketingDataPresent:marketing.rows>0,historicalAssetsBackdated:false,
    legacyCostReconstruction:period.estimatedOrders>0,legacyOpeningCostLines:period.openingCostLines,legacyTotalLines:period.oldTotalLines,
  };

  await db.execute(sql`
    INSERT INTO public.business_daily_snapshots(
      day,calculated_at,currency,realized_orders,exact_orders,estimated_orders,gross_collected,product_revenue,cogs,
      delivery_subsidy,fulfillment_cost,contribution_profit,operating_expenses,ad_spend,net_operating_profit,
      customers_total,repeat_customers_total,repeat_customer_rate_pct,new_customers,avg_order_value,
      inventory_value,packaging_inventory_value,dead_stock_value,low_stock_skus,stockout_skus,
      blended_cac,roas,mer,confidence,calculation_version,details,updated_at
    ) VALUES(
      ${day},now(),'IQD',${period.realizedOrders},${period.exactOrders},${period.estimatedOrders},
      ${period.grossCollected},${period.productRevenue},${period.cogs},${period.deliverySubsidy},
      ${period.fulfillmentCost},${period.contributionProfit},${operatingExpenses},${marketing.adSpend},
      ${netOperatingProfit},${customers.customersTotal},${customers.repeatCustomersTotal},
      ${customers.repeatCustomerRatePct},${customers.newCustomers},${period.avgOrderValue},
      ${inventory?.inventoryValue ?? null},${inventory?.packagingInventoryValue ?? null},
      ${inventory?.deadStockValue ?? null},${inventory?.lowStockSkus ?? null},${inventory?.stockoutSkus ?? null},
      ${blendedCac},${roas},${mer},${confidence},'bos_v1',${JSON.stringify(details)}::jsonb,now()
    )
    ON CONFLICT(day) DO UPDATE SET
      calculated_at=now(),realized_orders=EXCLUDED.realized_orders,exact_orders=EXCLUDED.exact_orders,
      estimated_orders=EXCLUDED.estimated_orders,gross_collected=EXCLUDED.gross_collected,
      product_revenue=EXCLUDED.product_revenue,cogs=EXCLUDED.cogs,delivery_subsidy=EXCLUDED.delivery_subsidy,
      fulfillment_cost=EXCLUDED.fulfillment_cost,contribution_profit=EXCLUDED.contribution_profit,
      operating_expenses=EXCLUDED.operating_expenses,ad_spend=EXCLUDED.ad_spend,
      net_operating_profit=EXCLUDED.net_operating_profit,customers_total=EXCLUDED.customers_total,
      repeat_customers_total=EXCLUDED.repeat_customers_total,repeat_customer_rate_pct=EXCLUDED.repeat_customer_rate_pct,
      new_customers=EXCLUDED.new_customers,avg_order_value=EXCLUDED.avg_order_value,
      inventory_value=EXCLUDED.inventory_value,packaging_inventory_value=EXCLUDED.packaging_inventory_value,
      dead_stock_value=EXCLUDED.dead_stock_value,low_stock_skus=EXCLUDED.low_stock_skus,stockout_skus=EXCLUDED.stockout_skus,
      blended_cac=EXCLUDED.blended_cac,roas=EXCLUDED.roas,mer=EXCLUDED.mer,confidence=EXCLUDED.confidence,
      calculation_version=EXCLUDED.calculation_version,details=EXCLUDED.details,updated_at=now()
  `);

  await db.execute(sql`
    INSERT INTO public.business_event_log(occurred_at,event_type,title,details,source,severity,fingerprint)
    VALUES(now(),'daily_snapshot',${"Business snapshot "+day},
      ${JSON.stringify({day,netOperatingProfit,productRevenue:period.productRevenue,orders:period.realizedOrders,confidence})}::jsonb,
      'business_operating_system','info',${"daily_snapshot:"+day})
    ON CONFLICT(fingerprint) DO UPDATE SET occurred_at=now(),details=EXCLUDED.details,source=EXCLUDED.source,severity=EXCLUDED.severity
  `);

  await refreshFindings(day,{
    customersTotal:customers.customersTotal,repeatRate:customers.repeatCustomerRatePct,
    netProfit:netOperatingProfit,adSpend:marketing.adSpend,trackedConversions:marketing.trackedConversions,
  },marketing.rows);

  return {day,confidence,financials:{...period,operatingExpenses,adSpend:marketing.adSpend,netOperatingProfit},customers,marketing,inventory,details};
}

export async function rebuildBusinessHistory(fromDay:string,toDay:string) {
  const from=validateDay(fromDay),to=validateDay(toDay);
  const start=new Date(from+"T12:00:00Z"),end=new Date(to+"T12:00:00Z");
  if(start>end) throw new Error("BUSINESS_INTELLIGENCE_INVALID_RANGE");
  const span=Math.floor((end.getTime()-start.getTime())/86_400_000)+1;
  if(span>366) throw new Error("BUSINESS_INTELLIGENCE_RANGE_TOO_LARGE");
  for(let i=0;i<span;i++){
    const d=new Date(start.getTime()+i*86_400_000).toISOString().slice(0,10);
    await refreshBusinessSnapshot(d);
  }
  return {from,to,days:span};
}

export async function ingestMarketingDaily(input:{
  day:string;platform:string;accountKey?:string;spendIqd:number;spendOriginal?:number|null;currency?:string;
  impressions?:number;clicks?:number;trackedConversions?:number;conversionValueIqd?:number;source:string;
  confidence?:"exact"|"estimated"|"unknown";evidence?:Record<string,unknown>;
}) {
  const db=getDb();
  if(!db) throw new Error("DATABASE_NOT_CONNECTED");
  const day=validateDay(input.day);
  await db.execute(sql`
    INSERT INTO public.business_marketing_daily(
      day,platform,account_key,spend_iqd,spend_original,currency,impressions,clicks,
      tracked_conversions,conversion_value_iqd,source,confidence,evidence,captured_at,updated_at
    ) VALUES(
      ${day},${input.platform},${input.accountKey ?? "default"},${input.spendIqd},${input.spendOriginal ?? null},
      ${input.currency ?? "IQD"},${input.impressions ?? 0},${input.clicks ?? 0},${input.trackedConversions ?? 0},
      ${input.conversionValueIqd ?? 0},${input.source},${input.confidence ?? "exact"},
      ${JSON.stringify(input.evidence ?? {})}::jsonb,now(),now()
    )
    ON CONFLICT(day,platform,account_key) DO UPDATE SET
      spend_iqd=EXCLUDED.spend_iqd,spend_original=EXCLUDED.spend_original,currency=EXCLUDED.currency,
      impressions=EXCLUDED.impressions,clicks=EXCLUDED.clicks,tracked_conversions=EXCLUDED.tracked_conversions,
      conversion_value_iqd=EXCLUDED.conversion_value_iqd,source=EXCLUDED.source,confidence=EXCLUDED.confidence,
      evidence=EXCLUDED.evidence,captured_at=now(),updated_at=now()
  `);
  return {ok:true,day,platform:input.platform,accountKey:input.accountKey ?? "default"};
}
