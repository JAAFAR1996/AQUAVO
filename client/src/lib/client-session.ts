// The VIEW-session id (per tab; dies when the tab closes). This is the id that reaches
// `page_views.session_id` in Neon, and now `search_queries.session_id` as well.
//
// The key is deliberately NOT `aq_sid`. It used to be, and that was a genuine defect: `aq_sid` is also
// the name lib/attribution.ts gives its DURABLE acquisition id — a crypto.randomUUID kept in
// localStorage and sent to PostHog. Two different values lived under one name in two different storage
// backends at the same time (verified in production 2026-08-14: localStorage held
// `f576b9b5-c6dc-…` while sessionStorage held `cs_1786716488976_…`).
//
// Why that mattered more than it looks: every one of the ~10,700 page_views rows AQUAVO has ever
// recorded carries the `cs_` shape and none carries the uuid shape, so an order stamped with the
// durable `aq_sid` could never join the only session data production has. The join would return zero
// rows forever — and an empty join is exactly the condition that tempts someone to "fix" it with
// timestamp proximity, which is not attribution.
//
// These are two legitimately different ids with different lifetimes. They just must not share a name.
//
// Lifted out of App.tsx so the search path can use the SAME id. Express's own `req.sessionID` is not
// usable as a join key for guests: production operation on 2026-08-14 showed four consecutive requests
// from one browser tab receiving four different session ids, because a guest never writes to the
// session and so never gets a session cookie. Anything keyed on it can only ever join to itself.
export function getClientSessionId(): string {
  try {
    let sid = sessionStorage.getItem("aq_view_sid");
    if (!sid) {
      // One-time migration off the colliding key, so an open tab keeps its view session.
      const legacy = sessionStorage.getItem("aq_sid");
      sid = legacy && legacy.startsWith("cs_")
        ? legacy
        : `cs_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem("aq_view_sid", sid);
      try { sessionStorage.removeItem("aq_sid"); } catch { /* non-fatal */ }
    }
    return sid;
  } catch {
    // Storage can be unavailable (private mode, blocked cookies). Return an id that is honest about
    // being unjoinable rather than throwing inside a tracking path.
    return "cs_unavailable";
  }
}
