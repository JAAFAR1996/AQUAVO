// ─────────────────────────────────────────────────────────────────────────────
// TYPE tests for the fulfillment DB contract (item 2). Compile-time only — this
// file has no runtime behaviour and is checked by `npm run check:accounting`.
//
// It proves that BOTH drivers satisfy the ONE typed contract:
//   * production  → NeonDatabase<typeof schema>
//   * integration → PgliteDatabase<typeof schema>
// If someone reintroduces `type Db = any`, or a driver drifts out of the contract,
// this file stops compiling.
// ─────────────────────────────────────────────────────────────────────────────
import type { NeonDatabase } from "drizzle-orm/neon-serverless";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import type * as schema from "../../shared/schema.js";
import type {
  FulfillmentDb, FulfillmentTx, FulfillmentExecutor,
  EventRow, MovementRow, LineRow, CostRecordRow, DraftRow, DraftLineRow,
} from "./fulfillment-db.js";
import type {
  ConfirmFulfillmentInput, ConfirmResult, LineInput, LineSnapshot,
} from "./fulfillment-service.js";
import type { DraftView, DraftLineView } from "./fulfillment-draft-service.js";
import type { ApprovedCost } from "./material-cost-service.js";

type Assert<T extends true> = T;
type Extends<A, B> = A extends B ? true : false;
/** `any` swallows everything, so this is how we detect a smuggled-in `any`. */
type IsAny<T> = 0 extends 1 & T ? true : false;
type IsNotAny<T> = IsAny<T> extends true ? false : true;

// ── The contract is a real type, not `any` ──────────────────────────────────
export type _ContractIsNotAny = Assert<IsNotAny<FulfillmentDb>>;
export type _TxIsNotAny = Assert<IsNotAny<FulfillmentTx>>;
export type _ExecutorIsNotAny = Assert<IsNotAny<FulfillmentExecutor>>;

// ── Both drivers satisfy the contract ───────────────────────────────────────
export type _ProdDbSatisfies = Assert<Extends<NeonDatabase<typeof schema>, FulfillmentDb>>;
export type _TestDbSatisfies = Assert<Extends<PgliteDatabase<typeof schema>, FulfillmentDb>>;

// ── Domain rows are concrete, never `any` ───────────────────────────────────
export type _EventRowTyped = Assert<IsNotAny<EventRow>>;
export type _LineRowTyped = Assert<IsNotAny<LineRow>>;
export type _MovementRowTyped = Assert<IsNotAny<MovementRow>>;
export type _CostRecordTyped = Assert<IsNotAny<CostRecordRow>>;
export type _DraftRowTyped = Assert<IsNotAny<DraftRow>>;
export type _DraftLineRowTyped = Assert<IsNotAny<DraftLineRow>>;

// ── Money fields are explicitly nullable: NULL means UNKNOWN, never 0 ───────
export type _UnitCostNullable = Assert<Extends<null, LineInput["unitCost"]>>;
export type _TotalCostNullable = Assert<Extends<null, LineSnapshot["totalCost"]>>;
export type _ActualCostNullable = Assert<Extends<null, ConfirmResult["actualCost"]>>;
export type _VarianceNullable = Assert<Extends<null, ConfirmResult["variance"]>>;
export type _DraftExpectedNullable = Assert<Extends<null, DraftView["expectedCost"]>>;
export type _DraftLineCostNullable = Assert<Extends<null, DraftLineView["unitCost"]>>;
export type _ApprovedCostNullable = Assert<Extends<null, ApprovedCost["unitCost"]>>;

// ── API payloads are typed, not `any` ───────────────────────────────────────
export type _ConfirmInputTyped = Assert<IsNotAny<ConfirmFulfillmentInput>>;
export type _ConfirmResultTyped = Assert<IsNotAny<ConfirmResult>>;
export type _DraftViewTyped = Assert<IsNotAny<DraftView>>;

// ── The event-type union is closed (a typo cannot become a new event type) ──
type EventTypeUnion = NonNullable<ConfirmFulfillmentInput["eventType"]>;
export type _EventTypeClosed = Assert<Extends<EventTypeUnion, "original" | "reshipment" | "return_handling" | "replacement" | "adjustment">>;
