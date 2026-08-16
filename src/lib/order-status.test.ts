import { describe, it, expect } from "vitest";
import { BOOKING_STAGES, statusI18nKey, stageIndex, statusColor } from "@/lib/order-status";

describe("stageIndex", () => {
  it("maps pending to stage 0", () => {
    expect(stageIndex("pending")).toBe(0);
  });

  it("maps delivered to the last stage", () => {
    expect(stageIndex("delivered")).toBe(BOOKING_STAGES.length - 1);
  });

  it("collapses 'assigned' onto the same stage as 'confirmed'", () => {
    expect(stageIndex("assigned")).toBe(stageIndex("confirmed"));
  });

  it("returns -1 for a cancelled order, never a false stage position", () => {
    expect(stageIndex("cancelled")).toBe(-1);
  });

  it("keeps stages in strictly increasing order through the happy path", () => {
    const happyPath = ["pending", "confirmed", "in_transit", "delivered"] as const;
    const indices = happyPath.map(stageIndex);
    for (let i = 1; i < indices.length; i++) {
      expect(indices[i]).toBeGreaterThan(indices[i - 1]);
    }
  });
});

describe("statusColor", () => {
  it("uses the default/success color for delivered", () => {
    expect(statusColor("delivered")).toBe("default");
  });

  it("uses the destructive color for cancelled", () => {
    expect(statusColor("cancelled")).toBe("destructive");
  });

  it("uses secondary for every in-progress status", () => {
    expect(statusColor("pending")).toBe("secondary");
    expect(statusColor("confirmed")).toBe("secondary");
    expect(statusColor("assigned")).toBe("secondary");
    expect(statusColor("in_transit")).toBe("secondary");
  });
});

describe("statusI18nKey", () => {
  it("builds a namespaced i18n key per status", () => {
    expect(statusI18nKey("delivered")).toBe("order.status.delivered");
    expect(statusI18nKey("cancelled")).toBe("order.status.cancelled");
  });
});
