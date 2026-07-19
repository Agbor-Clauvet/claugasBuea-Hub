import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Printer, Download, Loader2 } from "lucide-react";
import { BOOKING_STAGES, stageIndex, statusColor, type OrderStatus } from "@/lib/order-status";
import { formatTrackingNumber } from "@/lib/tracking";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import logoUrl from "@/assets/brand/claugas-express-logo.webp";
import clautechLogoUrl from "@/assets/brand/clautech-logo.webp";

export const Route = createFileRoute("/_authenticated/orders_/$id")({
  head: () => ({ meta: [{ title: "Order — ClauGas" }] }),
  component: OrderDetailPage,
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-destructive">{error.message}</div>
  ),
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
type Item = {
  quantity: number;
  unit_price: number;
  cylinder: { name: string; size_kg: number } | null;
};

function OrderDetailPage() {
  const { id } = Route.useParams();
  const { t } = useTranslation();
  const [order, setOrder] = useState<Order | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [generatedAt] = useState(() => new Date());
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    const el = document.getElementById("receipt-printable");
    if (!el || !order) return;
    setDownloading(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 40;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", margin, margin, imgWidth, imgHeight);
      pdf.save(`ClauGas-Receipt-${formatTrackingNumber(order.id)}.pdf`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate PDF");
    } finally {
      setDownloading(false);
    }
  };

  const fetchOrderStatus = useCallback(async () => {
    const { data: o } = await supabase.from("orders").select("status").eq("id", id).maybeSingle();
    if (o)
      setOrder((prev) =>
        prev ? { ...prev, status: (o as { status: OrderStatus }).status } : prev,
      );
  }, [id]);

  useEffect(() => {
    (async () => {
      const { data: o } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
      setOrder(o as Order | null);
      if (o && (o as Order).address_id) {
        const { data: a } = await supabase
          .from("addresses")
          .select("line1,quarter,landmark,city")
          .eq("id", (o as Order).address_id!)
          .maybeSingle();
        setAddress(a as Address | null);
      }
      const { data: it } = await supabase
        .from("order_items")
        .select("quantity,unit_price,cylinder:cylinders(name,size_kg)")
        .eq("order_id", id);
      setItems((it ?? []) as unknown as Item[]);
    })();
  }, [id]);

  // Live status updates: if the retailer marks this order Confirmed / Out for
  // Delivery / Delivered, this page updates instantly without a refresh.
  useEffect(() => {
    const channel = supabase
      .channel(`order-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` },
        (payload) => setOrder(payload.new as Order),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Backstop: browsers can throttle/suspend a backgrounded tab's WebSocket,
  // so a live update can be missed while this tab wasn't in focus. Re-check
  // the status directly whenever the tab becomes visible again, so the page
  // is always correct even if a realtime event slipped through.
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") fetchOrderStatus();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, [fetchOrderStatus]);

  if (!order) return <div className="p-6 text-sm">{t("common.loading")}</div>;
  const idx = stageIndex(order.status);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">{t("order.orderNumber")}</h1>
            <p className="text-sm text-muted-foreground font-mono">
              {formatTrackingNumber(order.id)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusColor(order.status)}>{t(`order.status.${order.status}`)}</Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.print()}
              className="print:hidden"
            >
              <Printer className="mr-1.5 h-4 w-4" /> {t("order.printReceipt")}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("order.tracking")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex items-center justify-between gap-2">
              {BOOKING_STAGES.map((s, i) => {
                const done = idx >= i;
                return (
                  <li key={s} className="flex-1 flex flex-col items-center text-center">
                    {done ? (
                      <CheckCircle2 className="h-6 w-6 text-primary" />
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground" />
                    )}
                    <span
                      className={`mt-1 text-xs ${done ? "font-semibold" : "text-muted-foreground"}`}
                    >
                      {t(`order.status.${s}`)}
                    </span>
                  </li>
                );
              })}
            </ol>
            {order.preferred_delivery_date ? (
              <p className="mt-4 text-sm text-muted-foreground">
                {t("order.eta")}:{" "}
                <span className="font-medium text-foreground">{order.preferred_delivery_date}</span>
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("order.items")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {items.map((it, i) => (
                <div key={i} className="flex justify-between">
                  <span>
                    {it.cylinder?.name ?? "—"} × {it.quantity}
                  </span>
                  <span>{(Number(it.unit_price) * it.quantity).toLocaleString()} XAF</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>{t("order.total")}</span>
                <span>{Number(order.total).toLocaleString()} XAF</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("order.delivery")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {address ? (
                <>
                  <div>
                    {[address.quarter, address.landmark, address.line1, address.city]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </>
              ) : (
                <div className="text-muted-foreground">—</div>
              )}
              <div className="mt-2">
                {t("order.paymentMethod")}:{" "}
                <span className="font-medium">
                  {t(`order.${order.payment_method === "mobile_money" ? "payMomo" : "payCash"}`)}
                </span>
              </div>
              {order.consumer_number ? (
                <div className="mt-2">
                  {t("booking.consumerNumber")}:{" "}
                  <span className="font-medium">{order.consumer_number}</span>
                </div>
              ) : null}
              {order.notes ? <div className="mt-2 text-muted-foreground">{order.notes}</div> : null}
            </CardContent>
          </Card>
        </div>

        {/* Printable receipt — always white background (paper look), even in dark mode */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between print:hidden">
              <CardTitle>{t("order.receipt")}</CardTitle>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => window.print()}>
                  <Printer className="mr-1.5 h-4 w-4" /> {t("order.printReceipt")}
                </Button>
                <Button size="sm" onClick={handleDownloadPdf} disabled={downloading}>
                  {downloading ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-1.5 h-4 w-4" />
                  )}
                  {downloading ? t("order.generating") : t("order.downloadPdf")}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div
              id="receipt-printable"
              className="mx-auto max-w-md space-y-4 rounded-md border bg-white p-6 text-sm text-neutral-900"
            >
              {/* ClauGas logo — centered */}
              <div className="flex flex-col items-center gap-1 border-b border-neutral-200 pb-4 text-center">
                <img src={logoUrl} alt="ClauGas" className="h-14 w-14 rounded-full object-cover" />
                <div className="text-base font-bold text-primary">ClauGas</div>
                <div className="text-xs text-neutral-500">{t("brand.tagline")}</div>
              </div>

              <div className="grid grid-cols-2 gap-y-1">
                <span className="text-neutral-500">{t("order.trackingNumber")}</span>
                <span className="text-right font-mono font-semibold">
                  {formatTrackingNumber(order.id)}
                </span>
                <span className="text-neutral-500">{t("order.date")}</span>
                <span className="text-right">
                  {new Date(order.created_at).toLocaleDateString()}
                </span>
                <span className="text-neutral-500">{t("order.status.label")}</span>
                <span className="text-right">{t(`order.status.${order.status}`)}</span>
              </div>

              <div className="border-t border-neutral-200 pt-3 space-y-1">
                {items.map((it, i) => (
                  <div key={i} className="flex justify-between">
                    <span>
                      {it.cylinder?.name ?? "—"} × {it.quantity}
                    </span>
                    <span>{(Number(it.unit_price) * it.quantity).toLocaleString()} XAF</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-neutral-200 pt-3 space-y-1">
                <div className="flex justify-between text-neutral-500">
                  <span>{t("booking.subtotal")}</span>
                  <span>{Number(order.subtotal).toLocaleString()} XAF</span>
                </div>
                <div className="flex justify-between text-neutral-500">
                  <span>{t("order.delivery")}</span>
                  <span>
                    {Number(order.delivery_fee) === 0
                      ? t("booking.freeDelivery")
                      : `${Number(order.delivery_fee).toLocaleString()} XAF`}
                  </span>
                </div>
                <div className="flex justify-between border-t border-neutral-200 pt-1 mt-1 text-base font-bold">
                  <span>{t("order.total")}</span>
                  <span>{Number(order.total).toLocaleString()} XAF</span>
                </div>
              </div>

              <div className="border-t border-neutral-200 pt-3 space-y-1 text-neutral-500">
                <div>
                  {t("order.paymentMethod")}:{" "}
                  <span className="font-medium text-neutral-900">
                    {t(`order.${order.payment_method === "mobile_money" ? "payMomo" : "payCash"}`)}
                  </span>
                </div>
                {address ? (
                  <div>
                    {t("order.delivery")}:{" "}
                    <span className="text-neutral-900">
                      {[address.quarter, address.landmark, address.line1, address.city]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Thank you message */}
              <div className="border-t border-neutral-200 pt-3 text-center text-xs text-neutral-500">
                {t("order.receiptFooter")}
              </div>

              {/* Generated timestamp */}
              <div className="text-center text-[10px] text-neutral-400">
                {t("order.generatedOn")}: {generatedAt.toLocaleDateString()}{" "}
                {generatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>

              {/* ClauTech Digital Solutions logo — centered footer */}
              <div className="flex flex-col items-center gap-1 border-t border-neutral-200 pt-4">
                <span className="text-[10px] text-neutral-400">{t("order.poweredBy")}</span>
                <img
                  src={clautechLogoUrl}
                  alt="ClauTech Digital Solutions"
                  className="h-8 object-contain"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
