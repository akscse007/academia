// Normalise any upload URL (logo, QR code, student photo) so it always
// resolves against the current origin.
//
// Old uploads were stored as absolute URLs like
//   https://academia-aks.onrender.com/uploads/logos/123.png
// after we moved to a single-service setup (backend serves frontend) they
// should load from the same origin we're on. This helper rewrites them.
export function assetUrl(url) {
  if (!url) return '';
  // Already a data URL / relative path → nothing to do
  if (url.startsWith('data:') || url.startsWith('/')) return url;
  try {
    const u = new URL(url);
    if (u.pathname.startsWith('/uploads/')) {
      // Keep only the pathname, dropping the stale host.
      return u.pathname + u.search;
    }
    return url;
  } catch {
    return url;
  }
}
