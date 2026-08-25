(() => {
  "use strict";

  const root = document.querySelector("[data-payment-page]");
  if (!root) return;

  function csrfToken() {
    const key = "aquavo_csrf_token";
    let token = sessionStorage.getItem(key);
    if (!token) {
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
      sessionStorage.setItem(key, token);
    }
    return token;
  }

  const orderId = root.dataset.orderId || "";
  const paymentId = root.dataset.paymentId || "";

  if (root.dataset.paymentPage === "success") {
    try {
      localStorage.removeItem("aquavo_cart-v2");
      sessionStorage.removeItem("aquavo_checkout_attempt_v1");
      sessionStorage.removeItem("aquavo_applied_coupon_v1");
      sessionStorage.removeItem("aquavo_online_payment_v1");
    } catch {
      // Storage is optional; a successful order must never depend on it.
    }

    fetch("/api/cart/", {
      method: "DELETE",
      credentials: "include",
      headers: { "X-CSRF-Token": csrfToken() },
    }).catch(() => {});
  }

  function destinationFor(paymentStatus) {
    if (paymentStatus === "paid") return "success";
    if (["failed", "cancelled", "expired"].includes(paymentStatus)) return "failed";
    return "pending";
  }

  function moveToCanonical(state) {
    const page = destinationFor(state.paymentStatus);
    const query = new URLSearchParams({ order_id: state.orderId, payment_id: state.paymentId });
    window.location.replace(`/payment/${page}?${query.toString()}`);
  }

  const refreshButton = document.querySelector("[data-payment-refresh]");
  const live = document.querySelector("[data-payment-live]");
  const statusText = document.querySelector("[data-payment-status-text]");
  const pollingDelays = [2000, 3000, 5000, 8000, 13000];
  let pollIndex = 0;
  let pollTimer = 0;
  let verifying = false;

  async function verifyPending(manual) {
    if (!orderId || !paymentId || verifying) return;
    verifying = true;
    if (refreshButton) refreshButton.disabled = true;
    if (live) live.textContent = manual ? "جارٍ التحقق الآن…" : "جارٍ التحقق تلقائياً…";
    try {
      const query = new URLSearchParams({ paymentId });
      const response = await fetch(`/api/payments/alqaseh/order/${encodeURIComponent(orderId)}/status?${query.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.paymentStatus || !data.paymentId) {
        throw new Error(data.message || "تعذر التحقق من حالة الدفع");
      }
      if (destinationFor(data.paymentStatus) !== "pending") {
        moveToCanonical(data);
        return;
      }
      if (statusText) statusText.textContent = "ما زلنا ننتظر تأكيد بوابة الدفع";
      if (live) live.textContent = "لم تصل الحالة النهائية بعد. لا تعِد الدفع؛ سنحاول مرة أخرى تلقائياً.";
    } catch (error) {
      if (live) live.textContent = error && error.message
        ? `${error.message}. سنعيد المحاولة بدون افتراض نجاح أو فشل العملية.`
        : "تعذر التحقق مؤقتاً. سنعيد المحاولة بدون افتراض نجاح أو فشل العملية.";
    } finally {
      verifying = false;
      if (refreshButton) refreshButton.disabled = false;
      if (root.dataset.paymentPage === "pending" && root.dataset.paymentAuto === "true" && pollIndex < pollingDelays.length) {
        const delay = pollingDelays[pollIndex++];
        window.clearTimeout(pollTimer);
        pollTimer = window.setTimeout(() => void verifyPending(false), delay);
      } else if (live && root.dataset.paymentPage === "pending") {
        live.textContent = "ما زالت العملية قيد التأكيد. يمكنك الضغط على «تحقق الآن» أو العودة لاحقاً.";
      }
    }
  }

  if (refreshButton) {
    refreshButton.addEventListener("click", () => {
      pollIndex = 0;
      window.clearTimeout(pollTimer);
      void verifyPending(true);
    });
  }

  if (root.dataset.paymentPage === "pending" && root.dataset.paymentAuto === "true") {
    pollTimer = window.setTimeout(() => void verifyPending(false), pollingDelays[pollIndex++]);
  }

  const retryButton = document.getElementById("retry");
  if (!retryButton) return;

  const errorBox = document.getElementById("retryError");

  retryButton.addEventListener("click", async () => {
    if (!orderId || !paymentId) return;
    retryButton.disabled = true;
    retryButton.textContent = "جارٍ تجهيز محاولة آمنة...";
    if (errorBox) errorBox.hidden = true;

    try {
      const response = await fetch(`/api/payments/alqaseh/order/${encodeURIComponent(orderId)}/retry`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken(),
        },
        body: JSON.stringify({ paymentId }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 409 && data.payment) {
        moveToCanonical(data.payment);
        return;
      }
      if (!response.ok || !data.redirectUrl) {
        throw new Error(data.message || "تعذر إنشاء محاولة دفع جديدة");
      }
      window.location.assign(data.redirectUrl);
    } catch (error) {
      if (errorBox) {
        errorBox.textContent = error && error.message ? error.message : "تعذر إعادة المحاولة حالياً";
        errorBox.hidden = false;
      }
      retryButton.disabled = false;
      retryButton.textContent = "إعادة محاولة الدفع الآمن";
    }
  });
})();
