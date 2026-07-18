import { expect, test, type Page } from "@playwright/test";

const product = {
  id: "e2e-3d-product",
  slug: "e2e-3d-product",
  name: "قطعة خشب اختبار للعرض ثلاثي الأبعاد",
  brand: "AQUAVO",
  category: "decor",
  subcategory: "driftwood",
  description: "قطعة اختبار محلية لا تنشئ طلباً ولا تستخدم بيانات الإنتاج.",
  price: "40000",
  currency: "IQD",
  images: ["/images/products/driftwood/dw-01.webp"],
  thumbnail: "/images/products/driftwood/dw-01.webp",
  image: "/images/products/driftwood/dw-01.webp",
  stock: 1,
  rating: "0",
  reviewCount: 0,
  isNew: false,
  isBestSeller: false,
  isProductOfWeek: false,
  hasVariants: false,
  variants: null,
  specifications: {
    "رمز القطعة": "E2E-3D",
    __model3d: {
      src: "/models/driftwood/dw-01/model.glb",
      poster: "/images/products/driftwood/dw-01.webp",
      pieceCode: "E2E-3D",
    },
  },
};

async function mockProduct(page: Page) {
  await page.route("**/api/products/e2e-3d-product", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(product) });
  });
  await page.route("**/api/products/e2e-3d-product/variants", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ variants: [] }) });
  });
}

async function cameraTheta(page: Page) {
  return page.locator("model-viewer").evaluate((element) => {
    const viewer = element as HTMLElement & { getCameraOrbit(): { theta: number } };
    return viewer.getCameraOrbit().theta;
  });
}

test("3D viewer is deferred and a real mouse drag rotates the camera", async ({ page }, testInfo) => {
  await mockProduct(page);
  const runtimeErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /model-viewer|webgl|\.glb/i.test(message.text())) {
      runtimeErrors.push(message.text());
    }
  });

  await page.goto("/products/e2e-3d-product", { waitUntil: "domcontentloaded" });
  await expect(page.locator("model-viewer")).toHaveCount(0);
  await page.getByRole("button", { name: "شغّل العرض ثلاثي الأبعاد" }).click();

  const viewer = page.locator("model-viewer");
  await expect(viewer).toHaveAttribute("camera-controls", "");
  await expect(viewer).toHaveAttribute("touch-action", "pan-y");
  await page.waitForFunction(() => document.querySelector("model-viewer")?.loaded === true, undefined, { timeout: 90_000 });

  const initialTheta = await cameraTheta(page);
  const beforePath = testInfo.outputPath("3d-mouse-before.png");
  await page.screenshot({ path: beforePath });
  const box = await viewer.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width * 0.75, box!.y + box!.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width * 0.25, box!.y + box!.height * 0.5, { steps: 20 });
  await page.mouse.up();
  await page.waitForTimeout(500);

  const finalTheta = await cameraTheta(page);
  const afterPath = testInfo.outputPath("3d-mouse-after.png");
  await page.screenshot({ path: afterPath });
  await testInfo.attach("3D mouse before", { path: beforePath, contentType: "image/png" });
  await testInfo.attach("3D mouse after", { path: afterPath, contentType: "image/png" });
  expect(Math.abs(finalTheta - initialTheta)).toBeGreaterThan(0.2);
  await expect(page.getByRole("button", { name: "رجّع العرض للبداية" })).toBeVisible();
  await page.getByRole("button", { name: "رجّع العرض للبداية" }).click();
  await page.waitForTimeout(300);
  const resetTheta = await cameraTheta(page);
  expect(Math.abs(resetTheta - initialTheta)).toBeLessThan(0.1);
  expect(runtimeErrors).toEqual([]);
});

test("one-finger touch drag rotates the camera without trapping page scroll", async ({ page, context }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockProduct(page);
  const runtimeErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /model-viewer|webgl|\.glb/i.test(message.text())) {
      runtimeErrors.push(message.text());
    }
  });

  await page.goto("/products/e2e-3d-product", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "شغّل العرض ثلاثي الأبعاد" }).click();
  const viewer = page.locator("model-viewer");
  await page.waitForFunction(() => document.querySelector("model-viewer")?.loaded === true, undefined, { timeout: 90_000 });

  const initialTheta = await cameraTheta(page);
  const beforePath = testInfo.outputPath("3d-touch-before.png");
  await page.screenshot({ path: beforePath });
  const box = await viewer.boundingBox();
  expect(box).not.toBeNull();

  const session = await context.newCDPSession(page);
  await session.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 2 });
  const startX = box!.x + box!.width * 0.75;
  const endX = box!.x + box!.width * 0.25;
  const y = box!.y + box!.height * 0.5;
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: startX, y, radiusX: 4, radiusY: 4, force: 1, id: 1 }],
  });
  for (let step = 1; step <= 16; step += 1) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: startX + ((endX - startX) * step) / 16, y, radiusX: 4, radiusY: 4, force: 1, id: 1 }],
    });
  }
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(500);

  const finalTheta = await cameraTheta(page);
  const afterPath = testInfo.outputPath("3d-touch-after.png");
  await page.screenshot({ path: afterPath });
  await testInfo.attach("3D touch before", { path: beforePath, contentType: "image/png" });
  await testInfo.attach("3D touch after", { path: afterPath, contentType: "image/png" });
  expect(Math.abs(finalTheta - initialTheta)).toBeGreaterThan(0.2);
  await expect(page.getByRole("button", { name: "قرّب العرض" })).toBeVisible();
  await expect(page.getByRole("button", { name: "بعّد العرض" })).toBeVisible();
  await expect(viewer).toHaveAttribute("touch-action", "pan-y");
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await page.mouse.move(20, 780);
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollBefore);
  expect(runtimeErrors).toEqual([]);
});
