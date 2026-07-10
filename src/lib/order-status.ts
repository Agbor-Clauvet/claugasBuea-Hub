// Shared LPG booking / order status labels + progression.
// Reuses the existing `order_status` enum in Supabase — no schema change.
// Mapping to LPG-style delivery stages:
//   pending      -> Order Placed
//   confirmed    -> Confirmed
//   assigned     -> Confirmed (rider assigned; treated as still "confirmed" in UI stepper)
//   in_transit   -> Out for Delivery
//   delivered    -> Delivered
//   cancelled    -> Cancelled

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "assigned"
  | "in_transit"
  | "delivered"
  | "cancelled";

export const BOOKING_STAGES: OrderStatus[] = [
  "pending",
  "confirmed",
  "in_transit",
  "delivered",
];

export function statusI18nKey(s: OrderStatus): string {
  return `order.status.${s}`;
}

export function stageIndex(s: OrderStatus): number {
  if (s === "cancelled") return -1;
  if (s === "assigned") return BOOKING_STAGES.indexOf("confirmed");
  return BOOKING_STAGES.indexOf(s);
}

export function statusColor(s: OrderStatus): "default" | "secondary" | "destructive" {
  if (s === "delivered") return "default";
  if (s === "cancelled") return "destructive";
  return "secondary";
}
