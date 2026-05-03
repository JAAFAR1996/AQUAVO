const LOCAL_WEBP_OVERRIDES: Record<string, string> = {
  "/images/products/yee/yee-c1-1082-2a/yee_c1_1082_2a_1.png":
    "/images/products/yee/yee-c1-1082-2a/yee_c1_1082_2a_1.webp",
  "/images/products/general/general-sponge-filter-xy180/general-sponge-filter-xy180-1-v2.jpeg":
    "/images/products/general/general-sponge-filter-xy180/general-sponge-filter-xy180-1-v2.webp",
  "/images/products/general/general-air-stone/general-air-stone-1-v2.jpeg":
    "/images/products/general/general-air-stone/general-air-stone-1-v2.webp",
  "/images/products/sunsun/sunsun-air-pump/sunsun-air-pump-1-v2.jpeg":
    "/images/products/sunsun/sunsun-air-pump/sunsun-air-pump-1-v2.webp",
  "/images/products/houyi/houyi-tracheal-suction-cup/houyi-tracheal-suction-cup-1.jpg":
    "/images/products/houyi/houyi-tracheal-suction-cup/houyi-tracheal-suction-cup-1.webp",
};

export function preferLocalWebp(url: string | null | undefined): string {
  if (!url || typeof url !== "string") return "";

  try {
    const parsed = new URL(url, window.location.origin);
    const replacement = LOCAL_WEBP_OVERRIDES[parsed.pathname];
    if (!replacement) return url;
    return `${replacement}${parsed.search}${parsed.hash}`;
  } catch {
    const [pathWithQuery, hash = ""] = url.split("#");
    const [pathname, query = ""] = pathWithQuery.split("?");
    const replacement = LOCAL_WEBP_OVERRIDES[pathname];
    if (!replacement) return url;
    return `${replacement}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
  }
}

