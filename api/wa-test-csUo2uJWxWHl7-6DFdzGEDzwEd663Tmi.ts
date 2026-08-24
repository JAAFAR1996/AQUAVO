import { dispatchDeliveryCareForOrder } from "../server/services/customer-messaging.js";

const TEST_ORDER_ID = "4416154c-8e1d-471f-817e-02697ae5e813";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const result = await dispatchDeliveryCareForOrder(TEST_ORDER_ID);
    return res.status(200).json({ ok: true, ...result });
  } catch {
    return res.status(500).json({ ok: false, error: "TEST_DISPATCH_FAILED" });
  }
}
