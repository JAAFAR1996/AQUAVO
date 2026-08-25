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

  const refreshButton = document.querySelector("[data-payment-refresh]");
  if (refreshButton) {
    refreshButton.addEventListener("click", () => window.location.reload());
  }

  const retryButton = document.getElementById("retry");
  if (!retryButton) return;

  const orderId = root.dataset.orderId || "";
  const paymentId = root.dataset.paymentId || "";
  const errorBox = document.getElementById("retryError");

  retryButton.addEventListener("click", async () => {
    if (!orderId || !paymentId) return;
    retryButton.disabled = true;
    retryButton.textContent = "جارٍ تجهيز الدفع...";
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
        window.location.reload();
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
      retryButton.textContent = "إعادة محاولة الدفع";
    }
  });
})();
