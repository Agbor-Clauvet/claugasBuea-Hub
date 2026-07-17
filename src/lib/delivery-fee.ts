/**
 * Automatic, distance-based delivery fee calculation.
 *
 * There is no manual override anywhere in this file on purpose —
 * the fee is entirely a function of (a) the straight-line distance
 * between the retailer's depot and the customer's quarter, and
 * (b) the order subtotal (for the loyalty discount). Nobody can
 * nudge one customer's price without changing these constants for
 * everyone.
 */

export const DELIVERY_BASE_FEE_XAF = 300;
export const DELIVERY_RATE_PER_KM_XAF = 100;
export const DELIVERY_MAX_FEE_XAF = 2000;
export const DELIVERY_DISCOUNT_THRESHOLD_XAF = 20000;
export const DELIVERY_DISCOUNT_RATE = 0.5; // 50% off delivery above the threshold

export type Coordinates = { lat: number; lng: number };

/**
 * Great-circle distance between two lat/lng points, in kilometers.
 * Standard haversine formula — accurate enough for in-town delivery
 * distances, no external API or network call needed.
 */
export function haversineDistanceKm(a: Coordinates, b: Coordinates): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

export type DeliveryFeeResult = {
  distanceKm: number;
  rawFee: number;
  discountApplied: boolean;
  fee: number;
};

/**
 * fee = min(base + rate*distance, cap), then halved if subtotal
 * clears the loyalty threshold. Pure function of its inputs —
 * same distance and subtotal always produce the same fee.
 */
export function calculateDeliveryFee(distanceKm: number, subtotal: number): DeliveryFeeResult {
  const rawFee = Math.min(
    DELIVERY_BASE_FEE_XAF + DELIVERY_RATE_PER_KM_XAF * distanceKm,
    DELIVERY_MAX_FEE_XAF,
  );
  const discountApplied = subtotal >= DELIVERY_DISCOUNT_THRESHOLD_XAF;
  const fee = discountApplied ? rawFee * (1 - DELIVERY_DISCOUNT_RATE) : rawFee;
  // Round to the nearest 50 XAF for a clean, bank-friendly number.
  const rounded = Math.round(fee / 50) * 50;
  return { distanceKm, rawFee, discountApplied, fee: rounded };
}
