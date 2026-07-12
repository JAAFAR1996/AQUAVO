export function isTrackingAllowed(candidateHostname?: string): boolean {
  if (!candidateHostname && typeof window === "undefined") return false;
  const hostname = (candidateHostname ?? window.location.hostname).toLowerCase();
  const isUniqueVercelDeployment = hostname.endsWith(".vercel.app") && hostname !== "aquavo.vercel.app";
  return !isUniqueVercelDeployment;
}
