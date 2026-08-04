const BASE_URL = "https://www.aquavoiq.com";
const INDEXNOW_KEY = "67d3eed08e869c3cd18bdf563d183fcc";
const KEY_LOCATION = `${BASE_URL}/${INDEXNOW_KEY}.txt`;
const RECOVERY_SITEMAP = `${BASE_URL}/sitemap-recovery.xml`;

const URLS = [
  `${BASE_URL}/`,
  `${BASE_URL}/products/houyi-stainless-shunt`,
  `${BASE_URL}/guides/aquarium-decor-stones-guide`,
  `${BASE_URL}/guides/filter-choice`,
  `${BASE_URL}/shipping`,
  `${BASE_URL}/faq`,
];

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "AQUAVO-IndexNow-Deployment-Check/1.0",
      accept: "text/plain, application/xml, text/xml;q=0.9, */*;q=0.1",
    },
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
}

async function waitForProduction(maxAttempts = 30, delayMs = 20_000) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const [keyText, sitemapText] = await Promise.all([
        fetchText(KEY_LOCATION),
        fetchText(RECOVERY_SITEMAP),
      ]);
      if (keyText.trim() !== INDEXNOW_KEY) {
        throw new Error("IndexNow key file content does not match the configured key");
      }
      if (!sitemapText.includes("/products/houyi-stainless-shunt")) {
        throw new Error("Production recovery sitemap is not the expected deployment yet");
      }
      console.log(`Production SEO recovery assets are live after ${attempt} attempt(s).`);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        console.log(`Production is not ready for IndexNow yet (${attempt}/${maxAttempts}): ${error.message}`);
        await wait(delayMs);
      }
    }
  }
  throw lastError || new Error("Production readiness check failed");
}

async function submitIndexNow() {
  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
      "user-agent": "AQUAVO-IndexNow/1.0",
    },
    body: JSON.stringify({
      host: "www.aquavoiq.com",
      key: INDEXNOW_KEY,
      keyLocation: KEY_LOCATION,
      urlList: URLS,
    }),
  });

  const body = await response.text();
  if (response.status === 200 || response.status === 202) {
    console.log(`IndexNow accepted ${URLS.length} AQUAVO URL(s) with HTTP ${response.status}.`);
    return;
  }
  if (response.status === 429) {
    console.warn("IndexNow rate-limited this notification; the sitemap and next deployment will provide another signal.");
    return;
  }
  throw new Error(`IndexNow submission failed with HTTP ${response.status}: ${body.slice(0, 500)}`);
}

await waitForProduction();
await submitIndexNow();
