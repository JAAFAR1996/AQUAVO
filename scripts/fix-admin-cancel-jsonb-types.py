from pathlib import Path

route_path = Path("server/routes/admin-orders-v2.ts")
text = route_path.read_text(encoding="utf-8")

old_actor = """                     'adminCancelledBy', ${actor.id},"""
new_actor = """                     'adminCancelledBy', ${String(actor.id ?? "admin")}::text,"""
old_reason = """                     'adminCancelReason', ${input.financialReason ?? "إلغاء الزبون قبل إتمام الدفع"}"""
new_reason = """                     'adminCancelReason', ${input.financialReason ?? "إلغاء الزبون قبل إتمام الدفع"}::text"""

if old_actor not in text:
    raise SystemExit("actor jsonb parameter pattern not found")
if old_reason not in text:
    raise SystemExit("reason jsonb parameter pattern not found")

text = text.replace(old_actor, new_actor, 1).replace(old_reason, new_reason, 1)
route_path.write_text(text, encoding="utf-8")

test_path = Path("server/services/__tests__/alqaseh-admin-cancellation-contract.test.ts")
test = test_path.read_text(encoding="utf-8")
needle = """    expect(adminRoute).toContain('{ paymentStatus: \"cancelled\" }');"""
addition = """    expect(adminRoute).toContain('{ paymentStatus: \"cancelled\" }');
    expect(adminRoute).toContain('${String(actor.id ?? \"admin\")}::text');
    expect(adminRoute).toContain('${input.financialReason ?? \"إلغاء الزبون قبل إتمام الدفع\"}::text');"""
if needle not in test:
    raise SystemExit("contract-test insertion point not found")
test = test.replace(needle, addition, 1)
test_path.write_text(test, encoding="utf-8")
