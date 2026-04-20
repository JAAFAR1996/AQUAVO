import path from "path";
import { fileURLToPath } from "url";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, openBrowser } from "@remotion/renderer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log("📦 جاري تجميع المشروع...");

  const bundleLocation = await bundle({
    entryPoint: path.resolve(__dirname, "src/index.ts"),
    webpackOverride: (config) => config,
    publicDir: path.resolve(__dirname, "public"),
  });

  console.log("✅ Bundle folder:", bundleLocation);

  // فتح المتصفح يدوياً وتمريره لمنع port conflict
  const browser = await openBrowser("chrome");

  try {
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: "P2Samurai",
      puppeteerInstance: browser,
      port: 3099, // port بعيد عن أي conflict
    });

    console.log(`🎬 ${composition.durationInFrames} frames @ ${composition.fps}fps (${composition.width}x${composition.height})`);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const outputPath = path.resolve(__dirname, `../output/P2_SAMURAI_REMOTION_${timestamp}.mp4`);

    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: "h264",
      outputLocation: outputPath,
      puppeteerInstance: browser,
      port: 3099,
      onProgress: ({ progress }) => {
        process.stdout.write(`\r⏳ ${Math.round(progress * 100)}%  `);
      },
    });

    console.log("\n🏆 تم! " + outputPath);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
