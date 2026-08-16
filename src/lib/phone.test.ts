import { describe, it, expect } from "vitest";
import {
  normalizeCameroonPhone,
  formatCameroonPhone,
  phoneToSyntheticEmail,
  isSyntheticPhoneEmail,
  PHONE_EMAIL_DOMAIN,
} from "@/lib/phone";

describe("normalizeCameroonPhone", () => {
  it("normalizes a bare 9-digit number starting with 6", () => {
    expect(normalizeCameroonPhone("650556715")).toBe("237650556715");
  });

  it("normalizes a number with the +237 prefix and spaces", () => {
    expect(normalizeCameroonPhone("+237 6 50 55 67 15")).toBe("237650556715");
  });

  it("normalizes a number already in 237XXXXXXXXX form", () => {
    expect(normalizeCameroonPhone("237650556715")).toBe("237650556715");
  });

  it("normalizes the 00237 international dialing prefix", () => {
    expect(normalizeCameroonPhone("00237650556715")).toBe("237650556715");
  });

  it("strips punctuation and dashes", () => {
    expect(normalizeCameroonPhone("+237-650-556-715")).toBe("237650556715");
  });

  it("rejects a number that doesn't start with 6 after the country code", () => {
    expect(normalizeCameroonPhone("237750556715")).toBeNull();
  });

  it("rejects a too-short number", () => {
    expect(normalizeCameroonPhone("6505567")).toBeNull();
  });

  it("rejects a too-long number", () => {
    expect(normalizeCameroonPhone("2376505567159999")).toBeNull();
  });

  it("rejects an empty string", () => {
    expect(normalizeCameroonPhone("")).toBeNull();
  });

  it("rejects non-numeric garbage", () => {
    expect(normalizeCameroonPhone("not a phone number")).toBeNull();
  });
});

describe("formatCameroonPhone", () => {
  it("formats a valid number into the human-readable grouped form", () => {
    expect(formatCameroonPhone("237650556715")).toBe("+237 650 55 67 15");
  });

  it("formats regardless of input format, as long as it's a valid number", () => {
    expect(formatCameroonPhone("650556715")).toBe("+237 650 55 67 15");
  });

  it("returns the original input unchanged if it can't be normalized", () => {
    expect(formatCameroonPhone("garbage")).toBe("garbage");
  });
});

describe("phoneToSyntheticEmail", () => {
  it("builds a synthetic email from a valid phone number", () => {
    expect(phoneToSyntheticEmail("650556715")).toBe(`237650556715@${PHONE_EMAIL_DOMAIN}`);
  });

  it("returns null for an invalid phone number", () => {
    expect(phoneToSyntheticEmail("not a phone")).toBeNull();
  });
});

describe("isSyntheticPhoneEmail", () => {
  it("recognizes a synthetic phone-based email", () => {
    expect(isSyntheticPhoneEmail(`237650556715@${PHONE_EMAIL_DOMAIN}`)).toBe(true);
  });

  it("rejects a normal email", () => {
    expect(isSyntheticPhoneEmail("someone@gmail.com")).toBe(false);
  });

  it("rejects null and undefined safely", () => {
    expect(isSyntheticPhoneEmail(null)).toBe(false);
    expect(isSyntheticPhoneEmail(undefined)).toBe(false);
  });
});
