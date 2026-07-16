import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Printer } from "lucide-react";
import { BOOKING_STAGES, stageIndex, statusColor, type OrderStatus } from "@/lib/order-status";
import { formatTrackingNumber } from "@/lib/tracking";
import { Button } from "@/components/ui/button";
import logoUrl from "@/assets/brand/claugas-express-logo.webp";

export const Route = createFileRoute("/_authenticated/orders_/$id")({
  head: () => ({ meta: [{ title: "Order — ClauGas" }] }),
  component: OrderDetailPage,
  errorComponent: ({ error }) => <div className="p-6 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-6 text-sm">Order not found.</div>,
});

type Order = {
  id: string;
  status: OrderStatus;
  total: number;
  subtotal: number;
  delivery_fee: number;
  created_at: string;
  notes: string | null;
  order_type: string;
  consumer_number: string | null;
  preferred_delivery_date: string | null;
  address_id: string | null;
  payment_method: "cash_on_delivery" | "mobile_money";
};
type Address = { line1: string; quarter: string | null; landmark: string | null; city: string };
type Item = { quantity: number; unit_price: number; cylinder: { name: string; size_kg: number } | null };

function OrderDetailPage() {
  const { id } = Route.useParams();
  const { t } = useTranslation();
  const [order, setOrder] = useState<Order | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    (async () => {
      const { data: o } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
      setOrder(o as Order | null);
      if (o && (o as Order).address_id) {
        const { data: a } = await supabase.from("addresses").select("line1,quarter,landmark,city").eq("id", (o as Order).address_id!).maybeSingle();
        setAddress(a as Address | null);
      }
      const { data: it } = await supabase.from("order_items").select("quantity,unit_price,cylinder:cylinders(name,size_kg)").eq("order_id", id);
      setItems((it ?? []) as unknown as Item[]);
    })();
  }, [id]);

  if (!order) return <div className="p-6 text-sm">{t("common.loading")}</div>;
  const idx = stageIndex(order.status);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">{t("order.orderNumber")}</h1>
            <p className="text-sm text-muted-foreground font-mono">{formatTrackingNumber(order.id)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusColor(order.status)}>{t(`order.status.${order.status}`)}</Badge>
            <Button size="sm" variant="outline" onClick={() => window.print()} className="print:hidden">
              <Printer className="mr-1.5 h-4 w-4" /> {t("order.printReceipt")}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>{t("order.tracking")}</CardTitle></CardHeader>
          <CardContent>
            <ol className="flex items-center justify-between gap-2">
              {BOOKING_STAGES.map((s, i) => {
                const done = idx >= i;
                return (
                  <li key={s} className="flex-1 flex flex-col items-center text-center">
                    {done ? <CheckCircle2 className="h-6 w-6 text-primary" /> : <Circle className="h-6 w-6 text-muted-foreground" />}
                    <span className={`mt-1 text-xs ${done ? "font-semibold" : "text-muted-foreground"}`}>{t(`order.status.${s}`)}</span>
                  </li>
                );
              })}
            </ol>
            {order.preferred_delivery_date ? (
              <p className="mt-4 text-sm text-muted-foreground">{t("order.eta")}: <span className="font-medium text-foreground">{order.preferred_delivery_date}</span></p>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>{t("order.items")}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {items.map((it, i) => (
                <div key={i} className="flex justify-between">
                  <span>{it.cylinder?.name ?? "—"} × {it.quantity}</span>
                  <span>{(Number(it.unit_price) * it.quantity).toLocaleString()} XAF</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>{t("order.total")}</span><span>{Number(order.total).toLocaleString()} XAF</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t("order.delivery")}</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              {address ? (
                <>
                  <div>{[address.quarter, address.landmark, address.line1, address.city].filter(Boolean).join(" · ")}</div>
                </>
              ) : <div className="text-muted-foreground">—</div>}
              <div className="mt-2">{t("order.paymentMethod")}: <span className="font-medium">{t(`order.${order.payment_method === "mobile_money" ? "payMomo" : "payCash"}`)}</span></div>
              {order.consumer_number ? <div className="mt-2">{t("booking.consumerNumber")}: <span className="font-medium">{order.consumer_number}</span></div> : null}
              {order.notes ? <div className="mt-2 text-muted-foreground">{order.notes}</div> : null}
            </CardContent>
          </Card>
        </div>

        {/* Printable receipt — hidden on screen inside a normal card, but this is what prints */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t("order.receipt")}</CardTitle>
              <Button size="sm" variant="outline" onClick={() => window.print()} className="print:hidden">
                <Printer className="mr-1.5 h-4 w-4" /> {t("order.printReceipt")}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div id="receipt-printable" className="mx-auto max-w-md space-y-4 rounded-md border p-6 text-sm">
              <div className="flex items-center gap-2 border-b pb-3">
                <img src={logoUrl} alt="ClauGas" className="h-9 w-9 rounded-full object-cover" />
                <div>
                  <div className="font-bold text-primary">ClauGas</div>
                  <div className="text-xs text-muted-foreground">{t("brand.tagline")}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-1">
                <span className="text-muted-foreground">{t("order.trackingNumber")}</span>
                <span className="text-right font-mono font-semibold">{formatTrackingNumber(order.id)}</span>
                <span className="text-muted-foreground">{t("order.date")}</span>
                <span className="text-right">{new Date(order.created_at).toLocaleDateString()}</span>
                <span className="text-muted-foreground">{t("order.status.label")}</span>
                <span className="text-right">{t(`order.status.${order.status}`)}</span>
              </div>

              <div className="border-t pt-3 space-y-1">
                {items.map((it, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{it.cylinder?.name ?? "—"} × {it.quantity}</span>
                    <span>{(Number(it.unit_price) * it.quantity).toLocaleString()} XAF</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3 space-y-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("booking.subtotal")}</span>
                  <span>{Number(order.subtotal).toLocaleString()} XAF</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("order.delivery")}</span>
                  <span>{Number(order.delivery_fee) === 0 ? t("booking.freeDelivery") : `${Number(order.delivery_fee).toLocaleString()} XAF`}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t pt-1 mt-1">
                  <span>{t("order.total")}</span>
                  <span>{Number(order.total).toLocaleString()} XAF</span>
                </div>
              </div>

              <div className="border-t pt-3 space-y-1 text-muted-foreground">
                <div>{t("order.paymentMethod")}: <span className="text-foreground font-medium">{t(`order.${order.payment_method === "mobile_money" ? "payMomo" : "payCash"}`)}</span></div>
                {address ? (
                  <div>{t("order.delivery")}: <span className="text-foreground">{[address.quarter, address.landmark, address.line1, address.city].filter(Boolean).join(" · ")}</span></div>
                ) : null}
              </div>

              <div className="border-t pt-3 text-center text-xs text-muted-foreground">
                {t("order.receiptFooter")}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
