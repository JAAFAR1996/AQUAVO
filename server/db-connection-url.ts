/** Remove the unsupported Neon channel-binding option without corrupting query separators. */
export function normalizeNeonConnectionString(value: string): string | undefined {
  const raw = value.trim();
  if (!raw) return undefined;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    // URL errors may carry their input as metadata: never attach a credential URL.
    throw new Error("DATABASE_URL is not a valid PostgreSQL connection URL");
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must use the postgres or postgresql protocol");
  }
  url.searchParams.delete("channel_binding");
  return url.toString();
}
