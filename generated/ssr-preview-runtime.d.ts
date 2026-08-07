import type { VercelRequest, VercelResponse } from "@vercel/node";

declare const semanticRuntime: (
  req: VercelRequest,
  res: VercelResponse,
) => Promise<void>;

export default semanticRuntime;
