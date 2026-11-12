// Normalise any upload URL (logo, QR code, profile photo) so it always renders.
//
// Three cases:
//   1. data:image/...  → return as-is, it IS the image bytes
//   2. /uploads/...   → relative path, browser resolves to current origin
//   3. https://.../uploads/...  → strip stale host (file may be gone; data URL is now the canonical way)
export function assetUrl(url) {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  if (url.startsWith('/')) return url;
  try {
    const u = new URL(url);
    if (u.pathname.startsWith('/uploads/')) return u.pathname + u.search;
    return url;
  } catch {
    return url;
  }
}
