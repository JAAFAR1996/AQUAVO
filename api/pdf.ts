import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const upstream = await fetch(
      "https://www.aquavoiq.com/assets/guides/aquavo-guide-5-mistakes.pdf"
    );
    if (!upstream.ok) {
      res.status(502).end();
      return;
    }
    const data = await upstream.arrayBuffer();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'inline; filename="aquavo-5-mistakes-guide-final.pdf"'
    );
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.end(Buffer.from(data));
  } catch {
    res.status(500).end();
  }
}
