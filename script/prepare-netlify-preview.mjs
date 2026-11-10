import { access, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

if (process.env.CONTEXT !== "deploy-preview") {
  throw new Error("The static UI preview setup only runs in Netlify Deploy Previews.");
}

const output = new URL("../dist/public/", import.meta.url);
await access(new URL("index.html", output));

// A failed API request stays a failed API request. Returning the SPA HTML with
// status 200 would make JSON readers fail; forwarding it would touch live data.
await writeFile(new URL("preview-api-unavailable.json", output), JSON.stringify({
  error: "This design preview has no backend connection. Local journey choices remain editable.",
}));
await writeFile(new URL("_redirects", output), [
  "/api/* /preview-api-unavailable.json 404",
  "/* /index.html 200",
  "",
].join("\n"));
await writeFile(new URL("_headers", output), [
  "/*",
  "  X-Robots-Tag: noindex, nofollow",
  "  X-Content-Type-Options: nosniff",
  "",
].join("\n"));

console.info(`Static UI preview prepared in ${fileURLToPath(output)}`);
