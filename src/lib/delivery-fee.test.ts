import { describe, it, expect } from "vitest";
import {
  calculateDeliveryFee,
  haversineDistanceKm,
  DELIVERY_BASE_FEE_XAF,
  DELIVERY_RATE_PER_KM_XAF,
  DELIVERY_MAX_FEE_XAF,
  DELIVERY_DISCOUNT_THRESHOLD_XAF,
  DELIVERY_DISCOUNT_RATE,
  type Coordinates,
} from "@/lib/delivery-fee";

describe("haversineDistanceKm", () => {
  it("returns 0 for identical points", () => {
    const point: Coordinates = { lat: 4.1553, lng: 9.2624 }; // Buea
    expect(haversineDistanceKm(point, point)).toBeCloseTo(0, 5);
  });

  it("is symmetric — distance A to B equals B to A", () => {
    const a: Coordinates = { lat: 4.1553, lng: 9.2624 };
    const b: Coordinates = { lat: 4.1, lng: 9.29 };
    expect(haversineDistanceKm(a, b)).toBeCloseTo(haversineDistanceKm(b, a), 10);
  });

  it("matches a known real-world distance (Molyko to Bokwango, Buea) within reason", () => {
    // Two real Buea locality coordinates, roughly ~3km apart in a straight line.
    const molyko: Coordinates = { lat: 4.1536, lng: 9.2833 };
    const bokwango: Coordinates = { lat: 4.1747, lng: 9.2394 };
    const distance = haversineDistanceKm(molyko, bokwango);
    // Sanity range check rather than an exact figure — protects against a
    // gross unit error (e.g. degrees vs radians) without being brittle
    // against tiny coordinate precision changes.
    expect(distance).toBeGreaterThan(3);
    expect(distance).toBeLessThan(8);
  });
});

describe("calculateDeliveryFee", () => {
  it("charges exactly the base fee at zero distance", () => {
    const result = calculateDeliveryFee(0, 5000);
    expect(result.rawFee).toBe(DELIVERY_BASE_FEE_XAF);
    expect(result.fee).toBe(DELIVERY_BASE_FEE_XAF);
  });

  it("adds the per-km rate for each kilometer", () => {
    const result = calculateDeliveryFee(2, 5000);
    expect(result.rawFee).toBe(DELIVERY_BASE_FEE_XAF + DELIVERY_RATE_PER_KM_XAF * 2);
  });

  it("never charges more than the cap, no matter how far", () => {
    const nearby = calculateDeliveryFee(1000, 5000);
    expect(nearby.rawFee).toBe(DELIVERY_MAX_FEE_XAF);
    expect(nearby.fee).toBeLessThanOrEqual(DELIVERY_MAX_FEE_XAF);
  });

  it("does NOT apply the loyalty discount just under the threshold", () => {
    const result = calculateDeliveryFee(1, DELIVERY_DISCOUNT_THRESHOLD_XAF - 1);
    expect(result.discountApplied).toBe(false);
    expect(result.fee).toBe(result.rawFee - (result.rawFee % 50 === 0 ? 0 : 0)); // rounded, no discount
  });

  it("DOES apply the loyalty discount exactly at the threshold", () => {
    const result = calculateDeliveryFee(1, DELIVERY_DISCOUNT_THRESHOLD_XAF);
    expect(result.discountApplied).toBe(true);
  });

  it("halves the fee when the discount applies", () => {
    const withoutDiscount = calculateDeliveryFee(5, 1000);
    const withDiscount = calculateDeliveryFee(5, DELIVERY_DISCOUNT_THRESHOLD_XAF);
    // Both start from the same raw fee (same distance) — the discounted
    // one should land at roughly half, allowing for rounding to the
    // nearest 50 XAF on each side.
    expect(withDiscount.fee).toBeLessThan(withoutDiscount.fee);
    expect(withDiscount.fee).toBeCloseTo(withoutDiscount.fee * (1 - DELIVERY_DISCOUNT_RATE), -1);
  });

  it("always rounds the final fee to the nearest 50 XAF", () => {
    // Try a spread of distances and confirm every result is a multiple of 50.
    for (const distanceKm of [0, 0.3, 1, 1.7, 3.33, 7.9, 15, 50]) {
      const result = calculateDeliveryFee(distanceKm, 1000);
      expect(result.fee % 50).toBe(0);
    }
  });

  it("is a pure function — same inputs always produce the same output", () => {
    const a = calculateDeliveryFee(3.5, 12000);
    const b = calculateDeliveryFee(3.5, 12000);
    expect(a).toEqual(b);
  });

  it("never returns a negative fee", () => {
    const result = calculateDeliveryFee(0, 999999);
    expect(result.fee).toBeGreaterThanOrEqual(0);
  });
});
