/** App path that respects GitHub Pages basePath when present. */
export function appPath(path = "/"): string {
  const base = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
  if (!path || path === "/") return `${base}/` === "/" ? "/" : `${base}/`;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  // Keep trailing slash for GH Pages static folders.
  const withSlash = normalized.endsWith("/") ? normalized : `${normalized}/`;
  return `${base}${withSlash}`;
}

/** Static asset path (file) that respects GitHub Pages basePath. */
export function withBasePath(path: string): string {
  const base = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}
