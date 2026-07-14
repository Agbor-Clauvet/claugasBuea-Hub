import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { statusColor, type OrderStatus } from "@/lib/order-status";
import { formatTrackingNumber } from "@/lib/tracking";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({ meta: [{ title: "My Orders — ClauGas" }] }),
  component: OrdersPage,
});

type OrderRow = {
  id: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  order_type: string;
  preferred_delivery_date: string | null;
};

function OrdersPage() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [tab, setTab] = useState<"all" | "cylinder_booking" | "standard">("all");

  useEffect(() => {
    supabase
      .from("orders")
      .select("id,status,total,created_at,order_type,preferred_delivery_date")
      .order("created_at", { ascending: false })
      .then(({ data }) => setOrders((data ?? []) as OrderRow[]));
  }, []);

  const filtered = (orders ?? []).filter((o) => tab === "all" || o.order_type === tab);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-bold text-primary mb-4">{t("order.myOrders")}</h1>
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="all">{t("order.tabAll")}</TabsTrigger>
            <TabsTrigger value="cylinder_booking">{t("order.tabBookings")}</TabsTrigger>
            <TabsTrigger value="standard">{t("order.tabOther")}</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="mt-4 space-y-3">
            {orders === null ? (
              <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("order.empty")}</p>
            ) : (
              filtered.map((o) => (
                <Link key={o.id} to="/orders/$id" params={{ id: o.id }}>
                  <Card className="hover:shadow-md transition">
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium font-mono">{formatTrackingNumber(o.id)}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(o.created_at).toLocaleDateString()}
                          {o.preferred_delivery_date ? ` · ${t("order.eta")}: ${o.preferred_delivery_date}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-semibold">{Number(o.total).toLocaleString()} XAF</div>
                        <Badge variant={statusColor(o.status)}>{t(`order.status.${o.status}`)}</Badge>
                        {o.order_type === "cylinder_booking" ? <Badge variant="outline">{t("order.booking")}</Badge> : null}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
