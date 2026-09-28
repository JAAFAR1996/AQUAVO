# AQUAVO Business Operating System

## Purpose

The Business OS is the canonical decision-support layer for AQUAVO. It combines commerce, accounting, inventory, customer, marketing, and operational data into deterministic metrics that any connected AI can read through MCP without inventing its own definitions.

AI is not the source of truth. PostgreSQL calculations are.

## Canonical sources

- Realized order revenue and post-cutover COGS: `v_order_accounting`
- Legacy realized orders: reconstructed explicitly and marked estimated
- Canonical stock: `inventory_canonical_balances`
- Current inventory asset: `v_accounting_inventory_asset_reconciliation`
- Operating expenses: posted journal entries, excluding COGS/packaging/delivery accounts already represented elsewhere
- Marketing spend and attributed conversions: `business_marketing_daily`
- Open finance/data-quality issues: existing reconciliation queues

## Business OS tables

- `business_metric_definitions`: governed metric names and formulas
- `business_marketing_daily`: provider facts imported from Google/Meta/etc.
- `business_daily_snapshots`: one deterministic daily business snapshot
- `business_event_log`: durable project/business timeline
- `business_findings`: open/resolved business warnings

## Confidence policy

Post-cutover accounting facts are exact.

Legacy order COGS is reconstructed using this order:
1. exact opening-inventory cost for the sold variant
2. product-level opening-inventory cost
3. verified current variant cost
4. verified current product cost

Any snapshot that includes reconstructed legacy orders is marked mixed/estimated rather than silently treated as exact.

Marketing data is never assumed to be zero simply because a provider is disconnected. If no rows exist in `business_marketing_daily`, the dashboard shows a warning and net operating profit explicitly excludes unimported ad spend.

## Decision support

`get_business_assessment` returns one of:
- `CONTINUE`
- `FIX`
- `REASSESS`
- `INSUFFICIENT_DATA`

The result is rule-based and includes the evidence and thresholds used. It is not an AI opinion or success-probability score.

Current rules require at least 20 realized orders for a substantive decision. `REASSESS` additionally requires at least 90 operating days plus negative economics and negative momentum.

## Admin API

All routes require the same accounting-admin authentication boundary:

- `GET /api/admin/business-intelligence/overview`
- `GET /api/admin/business-intelligence/assessment`
- `GET /api/admin/business-intelligence/history?days=90`
- `GET /api/admin/business-intelligence/inventory`
- `GET /api/admin/business-intelligence/findings`
- `POST /api/admin/business-intelligence/refresh`
- `POST /api/admin/business-intelligence/rebuild-history`
- `POST /api/admin/business-intelligence/marketing`

## Marketing ingestion contract

Example payload:

```json
{
  "day": "2026-09-27",
  "platform": "google_ads",
  "accountKey": "7102005031",
  "spendIqd": 13086.11,
  "spendOriginal": 9.9894,
  "currency": "USD",
  "impressions": 18739,
  "clicks": 2059,
  "trackedConversions": 0,
  "conversionValueIqd": 0,
  "source": "supermetrics",
  "confidence": "estimated",
  "evidence": {
    "fxRateIqdPerUsd": 1310,
    "fxBasis": "configured business conversion rate"
  }
}
```

Provider monetary values should retain their original currency/value in evidence and `spend_original`. The IQD amount is what is used in business-profit calculations.

## MCP

Read-only tools are exposed from the existing protected AQUAVO MCP server:

- `get_business_assessment`
- `get_business_overview`
- `get_business_history`
- `get_inventory_health`
- `get_business_findings`

This lets ChatGPT, Claude, agents, or other MCP clients read the same business truth without direct database credentials.

## Scheduled operation

The existing daily finance-audit cron also refreshes the previous Baghdad business day. Historical backfills never overwrite current findings.

Recommended operating sequence:
1. import previous-day provider marketing facts
2. run/refresh the previous-day Business OS snapshot
3. inspect findings
4. allow AI/reporting layers to read the snapshot

## Deployment

1. Run CI.
2. Apply migration `0090_business_operating_system.sql` explicitly.
3. Deploy the app.
4. Backfill historical marketing facts.
5. Rebuild historical daily snapshots.
6. Verify the admin Business OS tab and MCP tools.

The migration is additive and has a rollback. It does not rewrite legacy commerce, inventory, or accounting rows.
