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
    setCard(
      ["قيمة المخزون", "تكلفة شراء المخزون"],
      "تكلفة شراء المخزون",
      inventory.purchaseCostValue,
      "تكلفة الوحدة المسجلة × الكمية الحالية — ليست قيمة البيع",
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
    setCard(["قيمة المخزون", "تكلفة شراء المخزون"], "تكلفة شراء المخزون", "—", "تعذر التحقق من قاعدة البيانات");
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

  function start() {
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    refreshTruth();
    refreshTimer = window.setInterval(refreshTruth, 60_000);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) refreshTruth();
    });
    window.addEventListener("popstate", refreshTruth);
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
