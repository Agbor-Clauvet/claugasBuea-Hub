import { describe, it, expect } from "vitest";
import { formatCurrency } from "@/lib/currency";

describe("formatCurrency", () => {
  it("formats a whole number with the XAF suffix", () => {
    expect(formatCurrency(8150)).toBe("8,150 XAF");
  });

  it("adds thousands separators for large amounts", () => {
    expect(formatCurrency(1234567)).toBe("1,234,567 XAF");
  });

  it("formats zero correctly", () => {
    expect(formatCurrency(0)).toBe("0 XAF");
  });

  it("accepts a numeric string and formats it the same way", () => {
    expect(formatCurrency("8150")).toBe("8,150 XAF");
  });

  it("falls back to a dash for null", () => {
    expect(formatCurrency(null)).toBe("— XAF");
  });

  it("falls back to a dash for undefined", () => {
    expect(formatCurrency(undefined)).toBe("— XAF");
  });

  it("falls back to a dash for non-numeric input", () => {
    expect(formatCurrency("not a number")).toBe("— XAF");
  });
});
