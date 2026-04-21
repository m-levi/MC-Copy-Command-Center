/**
 * Tiny relative time formatter — avoids the date-fns dep for one call.
 * Returns "just now", "3m", "4h", "2d", "3w", "5mo", "2y".
 */
export function formatDistanceToNow(iso: string | number | Date): string {
  const then = typeof iso === "string" || typeof iso === "number" ? new Date(iso) : iso;
  const delta = (Date.now() - then.getTime()) / 1000;
  if (delta < 60) return "just now";
  if (delta < 3600) return `${Math.floor(delta / 60)}m`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h`;
  if (delta < 604800) return `${Math.floor(delta / 86400)}d`;
  if (delta < 2592000) return `${Math.floor(delta / 604800)}w`;
  if (delta < 31536000) return `${Math.floor(delta / 2592000)}mo`;
  return `${Math.floor(delta / 31536000)}y`;
}
