import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/currency";
import { haversineDistanceKm, type Coordinates } from "@/lib/delivery-fee";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => ({ meta: [{ title: "Admin · Analytics — ClauGas" }] }),
  component: AdminAnalyticsPage,
});

type Period = "30d" | "90d" | "all";

type AddressJoin = { quarter: string | null; latitude: number | null; longitude: number | null } | null;

type OrderRow = {
  id: string;
  total: number;
  status: string;
  created_at: string;
  addresses: AddressJoin;
};

const HISTOGRAM_BUCKETS = [
  { label: "< 2,500", max: 2500 },
  { label: "2,500–5,000", max: 5000 },
  { label: "5,000–10,000", max: 10000 },
  { label: "10,000–20,000", max: 20000 },
  { label: "20,000+", max: Infinity },
];

function heatClass(intensity: number): string {
  if (intensity > 0.75) return "bg-red-600 text-white";
  if (intensity > 0.5) return "bg-red-400 text-white";
  if (intensity > 0.25) return "bg-orange-300 text-black";
  return "bg-yellow-100 text-black dark:bg-yellow-900/40 dark:text-yellow-100";
}

function AdminAnalyticsPage() {
  const { t } = useTranslation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("30d");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [retailerCoords, setRetailerCoords] = useState<Coordinates | null>(null);

  async function loadData() {
    setLoading(true);

    // Every non-cancelled order counts as real demand here — not just
    // "delivered" (that's the Finance page's realized-revenue view).
    // This page is about where demand actually is, so a pending or
    // in-transit order is just as meaningful a signal as a delivered one.
    let orderQuery = supabase
      .from("orders")
      .select("id,total,status,created_at,addresses(quarter,latitude,longitude)")
      .neq("status", "cancelled");

    if (period !== "all") {
      const days = period === "30d" ? 30 : 90;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      orderQuery = orderQuery.gte("created_at", since);
    }

    const { data } = await orderQuery;
    setOrders((data ?? []) as unknown as OrderRow[]);

    const { data: retailerData } = await supabase.from("retailers").select("lat,lng").limit(1).maybeSingle();
    const rc = retailerData as unknown as { lat: number | null; lng: number | null } | null;
    if (rc?.lat != null && rc?.lng != null) setRetailerCoords({ lat: rc.lat, lng: rc.lng });

    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return setIsAdmin(false);
      const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      const admin = ((r ?? []) as { role: string }[]).some(
        (x) => x.role === "admin" || x.role === "super_admin"
      );
      setIsAdmin(admin);
    })();
  }, []);

  useEffect(() => {
    if (isAdmin) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, period]);

  const heatmapData = useMemo(() => {
    const map = new Map<string, { quarter: string; count: number; revenue: number }>();
    for (const o of orders) {
      const q = o.addresses?.quarter?.trim();
      if (!q) continue;
      const existing = map.get(q) ?? { quarter: q, count: 0, revenue: 0 };
      existing.count += 1;
      existing.revenue += o.total;
      map.set(q, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [orders]);

  const histogramData = useMemo(() => {
    const buckets = HISTOGRAM_BUCKETS.map((b) => ({ ...b, count: 0 }));
    for (const o of orders) {
      const bucket = buckets.find((b) => o.total < b.max) ?? buckets[buckets.length - 1];
      bucket.count += 1;
    }
    return buckets.map((b) => ({ label: b.label, count: b.count }));
  }, [orders]);

  const lineData = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders) {
      const day = o.created_at.slice(0, 10);
      map.set(day, (map.get(day) ?? 0) + o.total);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({ date: date.slice(5), revenue }));
  }, [orders]);

  const scatterData = useMemo(() => {
    if (!retailerCoords) return [];
    return orders
      .filter((o) => o.addresses?.latitude != null && o.addresses?.longitude != null)
      .map((o) => ({
        distance: Number(
          haversineDistanceKm(retailerCoords, {
            lat: o.addresses!.latitude!,
            lng: o.addresses!.longitude!,
          }).toFixed(1)
        ),
        value: o.total,
      }));
  }, [orders, retailerCoords]);

  const maxHeatCount = heatmapData[0]?.count ?? 1;

  if (isAdmin === false) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="mx-auto max-w-lg flex-1 px-4 py-16 text-center">
          <p className="text-muted-foreground">{t("admin.analytics.accessDenied")}</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">{t("admin.analytics.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("admin.analytics.subtitle")}</p>
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
        ) : orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("admin.analytics.noData")}</p>
        ) : (
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("admin.analytics.heatmapTitle")}</CardTitle>
                <CardDescription>{t("admin.analytics.heatmapDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                {heatmapData.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("admin.analytics.noLocationData")}</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {heatmapData.map((h) => (
                      <div
                        key={h.quarter}
                        className={`rounded-md p-3 text-sm ${heatClass(h.count / maxHeatCount)}`}
                      >
                        <div className="font-semibold">{h.quarter}</div>
                        <div className="text-xs opacity-90">
                          {h.count} {t("admin.analytics.ordersLabel")} · {formatCurrency(h.revenue)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("admin.analytics.lineTitle")}</CardTitle>
                <CardDescription>{t("admin.analytics.lineDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} width={70} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Line type="monotone" dataKey="revenue" stroke="#dc2626" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("admin.analytics.histogramTitle")}</CardTitle>
                <CardDescription>{t("admin.analytics.histogramDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={histogramData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip formatter={(v: number) => [v, t("admin.analytics.ordersLabel")]} />
                      <Bar dataKey="count" fill="#dc2626" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("admin.analytics.scatterTitle")}</CardTitle>
                <CardDescription>{t("admin.analytics.scatterDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                {scatterData.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("admin.analytics.noLocationData")}</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis
                          dataKey="distance"
                          name={t("admin.analytics.distanceLabel")}
                          unit="km"
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis
                          dataKey="value"
                          name={t("admin.analytics.orderValueLabel")}
                          tick={{ fontSize: 12 }}
                          width={70}
                        />
                        <Tooltip
                          cursor={{ strokeDasharray: "3 3" }}
                          formatter={(v: number, name: string) =>
                            name === t("admin.analytics.orderValueLabel") ? formatCurrency(v) : `${v} km`
                          }
                        />
                        <Scatter data={scatterData} fill="#dc2626" />
                      </ScatterChart>
                    </ResponsiveContainer>
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
