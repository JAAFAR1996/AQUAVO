#!/usr/bin/env bash
set -euo pipefail

container_id="$(docker ps --filter 'ancestor=postgres:16' --format '{{.ID}}' | head -n 1)"
if [[ -z "$container_id" ]]; then
  echo "PostgreSQL 16 service container not found" >&2
  exit 1
fi

psql_exec() {
  docker exec -i "$container_id" psql -U postgres -v ON_ERROR_STOP=1 "$@"
}

for _ in $(seq 1 30); do
  if docker exec "$container_id" pg_isready -U postgres >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
docker exec "$container_id" pg_isready -U postgres >/dev/null

psql_exec <<'SQL'
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

CREATE TABLE public.schema_migrations(
  version text PRIMARY KEY,
  checksum text NOT NULL,
  notes text,
  applied_at timestamptz NOT NULL DEFAULT now(),
  rolled_back_at timestamptz
);

CREATE TABLE public.order_items_relational(
  id text PRIMARY KEY,
  order_id text NOT NULL,
  product_id text NOT NULL,
  quantity integer NOT NULL,
  price_at_purchase numeric NOT NULL,
  total_price numeric NOT NULL,
  unit_cost_price numeric,
  unit_packaging_cost numeric,
  unit_insert_cost numeric,
  cost_snapshot_status text,
  cost_snapshot_source text,
  cost_snapshot_confidence text,
  cost_snapshot_version integer,
  cost_snapshot_at timestamp,
  unit_sale_price_snapshot numeric,
  discount_snapshot numeric,
  final_unit_sale_price_snapshot numeric,
  sale_price_snapshot_at timestamp,
  sale_price_source text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.order_return_events(
  id text PRIMARY KEY,
  order_id text NOT NULL,
  type text NOT NULL,
  reason text,
  refund_amount numeric NOT NULL DEFAULT 0,
  delivery_cost_loss numeric NOT NULL DEFAULT 0,
  return_shipping_cost numeric NOT NULL DEFAULT 0,
  packaging_loss numeric NOT NULL DEFAULT 0,
  product_write_off_amount numeric NOT NULL DEFAULT 0,
  cogs_loss numeric NOT NULL DEFAULT 0,
  restocked boolean NOT NULL DEFAULT false,
  restocked_at timestamp,
  affected_items jsonb,
  status text NOT NULL DEFAULT 'recorded',
  note text,
  created_by text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  packaging_loss_source text NOT NULL DEFAULT 'manual'
);

CREATE OR REPLACE FUNCTION public.prepare_verified_return_inventory()
RETURNS trigger
LANGUAGE plpgsql
AS $stub$
BEGIN
  RETURN NEW;
END;
$stub$;

CREATE TRIGGER order_returns_prepare_verification
BEFORE UPDATE OF status ON public.order_return_events
FOR EACH ROW
EXECUTE FUNCTION public.prepare_verified_return_inventory();
SQL

# Execute the exact lock function and trigger from migration 0070 without the
# unrelated view rewrites required by the full production schema.
sed -n \
  '/CREATE OR REPLACE FUNCTION public.lock_order_return_verification()/,/EXECUTE FUNCTION public.lock_order_return_verification();/p' \
  migrations/0070_accounting_ledger_backed_views.sql \
  | psql_exec

# Execute the complete 0071 migration against real PostgreSQL.
psql_exec < migrations/0071_accounting_return_line_identity_and_refund_guard.sql

psql_exec <<'SQL'
INSERT INTO public.order_items_relational(
  id,order_id,product_id,quantity,price_at_purchase,total_price,
  unit_cost_price,unit_packaging_cost,unit_insert_cost,cost_snapshot_status,
  final_unit_sale_price_snapshot,metadata
) VALUES(
  'line-concurrent','order-concurrent','product-concurrent',1,100,100,
  20,4,1,'exact',90,'{}'
);

INSERT INTO public.order_return_events(
  id,order_id,type,affected_items,status,updated_at
) VALUES
(
  'return-a','order-concurrent','partial_return',
  '[{"orderItemId":"line-concurrent","productId":"product-concurrent","variantId":null,"qty":1,"priceAtPurchase":999,"cogsAtTime":999}]',
  'recorded',now()
),
(
  'return-b','order-concurrent','partial_return',
  '[{"orderItemId":"line-concurrent","productId":"product-concurrent","variantId":null,"qty":1,"priceAtPurchase":999,"cogsAtTime":999}]',
  'recorded',now()
);
SQL

first_log="$(mktemp)"
second_log="$(mktemp)"
cleanup() {
  rm -f "$first_log" "$second_log"
}
trap cleanup EXIT

# Transaction A acquires the per-order advisory lock, verifies the first return,
# then stays open long enough for transaction B to overlap.
(
  psql_exec >"$first_log" 2>&1 <<'SQL'
BEGIN;
UPDATE public.order_return_events
SET status='verified',updated_at=now()
WHERE id='return-a';
SELECT pg_sleep(2);
COMMIT;
SQL
) &
first_pid=$!

sleep 0.35

# Transaction B must wait for A's commit, re-read the now-verified quantity, and
# fail closed instead of approving a second unit that was never sold.
set +e
psql_exec >"$second_log" 2>&1 <<'SQL'
BEGIN;
UPDATE public.order_return_events
SET status='verified',updated_at=now()
WHERE id='return-b';
COMMIT;
SQL
second_status=$?
set -e

wait "$first_pid"

if [[ "$second_status" -eq 0 ]]; then
  echo "Concurrent second return unexpectedly succeeded" >&2
  cat "$second_log" >&2
  exit 1
fi

if ! grep -q "RETURN_QUANTITY_EXCEEDS_ORDER" "$second_log"; then
  echo "Concurrent second return failed for the wrong reason" >&2
  cat "$second_log" >&2
  exit 1
fi

verified_count="$(psql_exec -Atc "SELECT COUNT(*) FROM public.order_return_events WHERE status='verified'")"
recorded_count="$(psql_exec -Atc "SELECT COUNT(*) FROM public.order_return_events WHERE status='recorded'")"
canonical_refund="$(psql_exec -Atc "SELECT refund_amount FROM public.order_return_events WHERE id='return-a'")"

[[ "$verified_count" == "1" ]]
[[ "$recorded_count" == "1" ]]
[[ "$canonical_refund" == "90" ]]

echo "Concurrent return verification serialized correctly"
