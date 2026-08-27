(() => {
  "use strict";

  if (window.__AQUAVO_ADMIN_TRUTH_BOOTSTRAP__) return;
  window.__AQUAVO_ADMIN_TRUTH_BOOTSTRAP__ = true;

  const API_PATH = "/api/pricing/dashboard-insights";
  const formatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  let latestTruth = null;
  let refreshTimer = null;
  let applyQueued = false;

  const normalizedText = (value) => String(value || "").replace(/\s+/g, " ").trim();

  function isAdminPage() {
    return window.location.pathname === "/admin" || window.location.pathname.startsWith("/admin/");
  }

  function findCardByTitle(possibleTitles) {
    const titles = new Set(possibleTitles.map(normalizedText));
    const candidates = document.querySelectorAll("h1,h2,h3,h4,p,div");

    for (const element of candidates) {
      if (!titles.has(normalizedText(element.textContent))) continue;

      let current = element;
      for (let depth = 0; current && depth < 5; depth += 1, current = current.parentElement) {
        const value = current.querySelector(".text-2xl");
        if (value) return { card: current, title: element, value };
      }
    }

    return null;
  }

  function setCard(possibleTitles, nextTitle, value, description) {
    const match = findCardByTitle(possibleTitles);
    if (!match) return false;

    const formattedValue = typeof value === "number" && Number.isFinite(value)
      ? formatter.format(value)
      : String(value);

    if (normalizedText(match.title.textContent) !== normalizedText(nextTitle)) {
      match.title.textContent = nextTitle;
    }
    if (normalizedText(match.value.textContent) !== formattedValue) {
      match.value.textContent = formattedValue;
    }

    const descriptionElement = Array.from(match.card.querySelectorAll("p"))
      .find((item) => item !== match.title && item !== match.value);
    if (descriptionElement && normalizedText(descriptionElement.textContent) !== normalizedText(description)) {
      descriptionElement.textContent = description;
    }

    return true;
  }

  function applyTruth() {
    applyQueued = false;
    if (!isAdminPage() || !latestTruth) return;

    const inventory = latestTruth.inventory;
    const orders = latestTruth.orders;
    if (!inventory || !orders) return;

    setCard(
      ["إجمالي المنتجات"],
      "إجمالي المنتجات",
      inventory.liveProducts,
      "المنتجات النشطة غير المحذوفة",
    );
    setCard(
      ["منتجات بمخزون منخفض"],
      "منتجات بمخزون منخفض",
      inventory.lowStock,
      `لا تشمل ${formatter.format(inventory.outOfStock)} منتجات نافدة كلياً`,
    );

    const costComplete = inventory.purchaseCostComplete === true;
    const missingUnits = Number(inventory.missingVariantCostUnits || 0);
    const missingVariants = Number(inventory.missingVariantCostCount || 0);
    const costTitle = costComplete ? "تكلفة شراء المخزون" : "تكلفة المخزون الموثقة";
    const costDescription = costComplete
      ? "تكلفة كل وحدة وخيار مثبتة في قاعدة البيانات"
      : `مجموع جزئي؛ ${formatter.format(missingUnits)} وحدة ضمن ${formatter.format(missingVariants)} خياراً بلا تكلفة مثبتة`;

    setCard(
      ["قيمة المخزون", "تكلفة شراء المخزون", "تكلفة المخزون الموثقة"],
      costTitle,
      inventory.purchaseCostValue,
      costDescription,
    );
    setCard(
      ["إجمالي الطلبات", "الطلبات النشطة"],
      "الطلبات النشطة",
      orders.activeNow,
      "لا تشمل الموصلة أو المرفوضة أو الملغاة أو المرتجعة",
    );
  }

  function queueApply() {
    if (applyQueued) return;
    applyQueued = true;
    window.requestAnimationFrame(applyTruth);
  }

  function markUnavailable() {
    if (!isAdminPage()) return;
    setCard(
      ["قيمة المخزون", "تكلفة شراء المخزون", "تكلفة المخزون الموثقة"],
      "تكلفة المخزون الموثقة",
      "—",
      "تعذر التحقق من قاعدة البيانات",
    );
    setCard(["إجمالي الطلبات", "الطلبات النشطة"], "الطلبات النشطة", "—", "تعذر التحقق من قاعدة البيانات");
  }

  async function refreshTruth() {
    if (!isAdminPage()) return;
    try {
      const response = await fetch(API_PATH, {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const payload = await response.json();
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }
      latestTruth = payload.data;
      queueApply();
    } catch (error) {
      console.error("[Admin Truth Cards] Verification failed:", error);
      latestTruth = null;
      markUnavailable();
    }
  }

  const observer = new MutationObserver(queueApply);

  let started = false;

  /**
   * Arm the dashboard machinery — on an admin page, and nowhere else.
   *
   * Every visitor used to run this. The fetch and the card writes were already
   * guarded by isAdminPage(), but the observer was not: a
   * `{childList, subtree, characterData}` observer on document.documentElement
   * watched the whole tree on the homepage and on every product page, and each
   * mutation queued a requestAnimationFrame that then did nothing. Hydration
   * and gallery interaction are exactly the mutation-heavy moments where that
   * is most expensive, and they are also when responsiveness is being
   * measured. A 60-second interval and a visibilitychange listener were armed
   * on those pages too.
   *
   * Nothing an admin sees changes; the work simply starts when it can matter.
   */
  function start() {
    if (started || !isAdminPage()) return;
    started = true;
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    refreshTruth();
    refreshTimer = window.setInterval(refreshTruth, 60_000);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) refreshTruth();
    });
  }

  /**
   * /admin is a client-side route, so arriving there may never reload the page.
   *
   * popstate covers back and forward. It does not fire for the router's own
   * pushState/replaceState, which is how a link into /admin actually navigates,
   * so those are wrapped: the original runs first and its result is returned
   * untouched, and the notification cannot throw into the caller. Previously
   * this case was covered only incidentally, by the always-on observer
   * noticing that the page had changed.
   */
  function onNavigate() {
    if (started) {
      refreshTruth();
      return;
    }
    start();
  }

  window.addEventListener("popstate", onNavigate);

  for (const method of ["pushState", "replaceState"]) {
    const original = history[method];
    if (typeof original !== "function") continue;
    history[method] = function patchedHistoryMethod() {
      const result = original.apply(this, arguments);
      try {
        onNavigate();
      } catch (error) {
        console.error("[Admin Truth Cards] navigation hook failed:", error);
      }
      return result;
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  window.addEventListener("beforeunload", () => {
    observer.disconnect();
    if (refreshTimer) window.clearInterval(refreshTimer);
  });
})();
