import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin/finance")({
  head: () => ({ meta: [{ title: "Admin · Finance — ClauGas" }] }),
  component: AdminFinancePage,
});

type Period = "30d" | "90d" | "all";

type OrderRow = {
  id: string;
  total: number;
  payment_method: string;
  created_at: string;
};

type ItemRow = {
  order_id: string;
  quantity: number;
  unit_price: number;
  cylinder_id: string;
};

type CylinderRow = {
  id: string;
  name: string;
  size_kg: number;
};

function formatXAF(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n) + " XAF";
}

function AdminFinancePage() {
  const { t } = useTranslation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("30d");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [cylinders, setCylinders] = useState<CylinderRow[]>([]);

  async function loadData() {
    setLoading(true);

    let orderQuery = supabase
      .from("orders")
      .select("id, total, payment_method, created_at")
      .eq("status", "delivered");

    if (period !== "all") {
      const days = period === "30d" ? 30 : 90;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      orderQuery = orderQuery.gte("created_at", since);
    }

    const { data: orderData } = await orderQuery;
    const deliveredOrders = (orderData ?? []) as OrderRow[];
    setOrders(deliveredOrders);

    const orderIds = deliveredOrders.map((o) => o.id);
    if (orderIds.length > 0) {
      const { data: itemData } = await supabase
        .from("order_items")
        .select("order_id, quantity, unit_price, cylinder_id")
        .in("order_id", orderIds);
      setItems((itemData ?? []) as ItemRow[]);
    } else {
      setItems([]);
    }

    const { data: cylinderData } = await supabase.from("cylinders").select("id, name, size_kg");
    setCylinders((cylinderData ?? []) as CylinderRow[]);

    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return setIsAdmin(false);
      const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      const admin = ((r ?? []) as { role: string }[]).some((x) => x.role === "admin");
      setIsAdmin(admin);
    })();
  }, []);

  useEffect(() => {
    if (isAdmin) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, period]);

  const summary = useMemo(() => {
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const cashRevenue = orders
      .filter((o) => o.payment_method === "cash_on_delivery")
      .reduce((sum, o) => sum + o.total, 0);
    const mobileMoneyRevenue = orders
      .filter((o) => o.payment_method === "mobile_money")
      .reduce((sum, o) => sum + o.total, 0);
    const totalCylindersOut = items.reduce((sum, i) => sum + i.quantity, 0);

    const cylinderMap = new Map(cylinders.map((c) => [c.id, c]));
    const byCylinder = new Map<string, { name: string; sizeKg: number; units: number; revenue: number }>();
    for (const item of items) {
      const cyl = cylinderMap.get(item.cylinder_id);
      const key = item.cylinder_id;
      const existing = byCylinder.get(key) ?? {
        name: cyl?.name ?? t("admin.finance.unknownCylinder"),
        sizeKg: cyl?.size_kg ?? 0,
        units: 0,
        revenue: 0,
      };
      existing.units += item.quantity;
      existing.revenue += item.quantity * item.unit_price;
      byCylinder.set(key, existing);
    }
    const cylinderBreakdown = Array.from(byCylinder.values()).sort((a, b) => b.units - a.units);

    return {
      totalRevenue,
      cashRevenue,
      mobileMoneyRevenue,
      totalCylindersOut,
      deliveredOrderCount: orders.length,
      cylinderBreakdown,
    };
  }, [orders, items, cylinders]);

  if (isAdmin === false) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="mx-auto max-w-lg flex-1 px-4 py-16 text-center">
          <p className="text-muted-foreground">{t("admin.finance.accessDenied")}</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">{t("admin.finance.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("admin.finance.subtitle")}</p>
          </div>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList>
              <TabsTrigger value="30d">{t("admin.finance.period30")}</TabsTrigger>
              <TabsTrigger value="90d">{t("admin.finance.period90")}</TabsTrigger>
              <TabsTrigger value="all">{t("admin.finance.periodAll")}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {loading || isAdmin === null ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>{t("admin.finance.deliveredOrders")}</CardDescription>
                  <CardTitle className="text-2xl">{summary.deliveredOrderCount}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>{t("admin.finance.cylindersOut")}</CardDescription>
                  <CardTitle className="text-2xl">{summary.totalCylindersOut}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>{t("admin.finance.cashOnDelivery")}</CardDescription>
                  <CardTitle className="text-2xl">{formatXAF(summary.cashRevenue)}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>{t("admin.finance.mobileMoney")}</CardDescription>
                  <CardTitle className="text-2xl">{formatXAF(summary.mobileMoneyRevenue)}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("admin.finance.totalRevenueTitle")}</CardTitle>
                <CardDescription>{t("admin.finance.totalRevenueDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary">{formatXAF(summary.totalRevenue)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("admin.finance.byTypeTitle")}</CardTitle>
                <CardDescription>{t("admin.finance.byTypeDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                {summary.cylinderBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("admin.finance.noDeliveries")}</p>
                ) : (
                  <div className="space-y-3">
                    {summary.cylinderBreakdown.map((c) => (
                      <div
                        key={c.name}
                        className="flex items-center justify-between border-b border-border pb-2 last:border-0"
                      >
                        <span className="font-medium">
                          {c.name} {c.sizeKg ? `(${c.sizeKg}kg)` : ""}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {c.units} {t("admin.finance.unitsLabel")} · {formatXAF(c.revenue)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
