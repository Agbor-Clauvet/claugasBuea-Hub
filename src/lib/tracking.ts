/**
 * Derives a human-friendly tracking number from an order's UUID.
 * No database change needed — this just formats the existing order id.
 * Example: "a1b2c3d4-..." -> "CG-A1B2C3D4"
 */
export function formatTrackingNumber(orderId: string): string {
  return `CG-${orderId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}
