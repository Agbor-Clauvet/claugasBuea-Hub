import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { statusColor, type OrderStatus } from "@/lib/order-status";
import { formatTrackingNumber } from "@/lib/tracking";
import { Check, X, Truck, PackageCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/retailer/orders")({
  head: () => ({ meta: [{ title: "Retailer Dashboard — ClauGas" }] }),
  component: RetailerOrdersPage,
});

type Row = {
  id: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  order_type: string;
  customer_id: string;
  payment_method: "cash_on_delivery" | "mobile_money";
};

type ProfileMap = Record<string, { full_name: string | null; phone: string | null }>;

function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function RetailerOrdersPage() {
  const { t } = useTranslation();
  const [access, setAccess] = useState<"pending" | "granted" | "denied">("pending");
  const [rows, setRows] = useState<Row[]>([]);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [retailerName, setRetailerName] = useState<string>("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase
      .from("orders")
      .select("id,status,total,created_at,order_type,customer_id,payment_method")
      .order("created_at", { ascending: false })
      .limit(200);
    const list = (data ?? []) as Row[];
    setRows(list);

    const ids = Array.from(new Set(list.map((r) => r.customer_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,full_name,phone")
        .in("id", ids);
      const map: ProfileMap = {};
      for (const p of (profs ?? []) as { id: string; full_name: string | null; phone: string | null }[]) {
        map[p.id] = { full_name: p.full_name, phone: p.phone };
      }
      setProfiles(map);
    }
  }

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return setAccess("denied");

      const [{ data: r }, { data: retailer }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", u.user.id),
        supabase.from("retailers").select("id,name").eq("owner_id", u.user.id).maybeSingle(),
      ]);
      const isAdmin = ((r ?? []) as { role: string }[]).some((x) => x.role === "admin");

      if (retailer) {
        setRetailerName(retailer.name);
        setAccess("granted");
        load();
      } else if (isAdmin) {
        // Fallback while ownership isn't wired up yet for a specific account:
        // admins can preview the retailer dashboard against all orders.
        setRetailerName("ClauGas (admin preview)");
        setAccess("granted");
        load();
      } else {
        setAccess("denied");
      }
    })();
  }, []);

  async function updateStatus(id: string, status: OrderStatus) {
    setBusyId(id);
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    setBusyId(null);
    if (error) return toast.error(error.message);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    const key =
      status === "confirmed" ? "retailer.orderAccepted" : status === "cancelled" ? "retailer.orderRejected" : "retailer.orderUpdated";
    toast.success(t(key));
  }

  function reject(id: string) {
    if (!window.confirm(t("retailer.confirmReject"))) return;
    updateStatus(id, "cancelled");
  }

  if (access === "denied") {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="mx-auto max-w-lg flex-1 px-4 py-16 text-center text-sm text-muted-foreground">
          {t("retailer.forbidden")}
        </main>
        <Footer />
      </div>
    );
  }

  if (access === "pending") {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="mx-auto max-w-lg flex-1 px-4 py-16" />
        <Footer />
      </div>
    );
  }

  const todayIso = startOfToday();
  const todaysRows = rows.filter((r) => r.created_at >= todayIso);
  const todaysRevenue = todaysRows
    .filter((r) => r.status !== "cancelled")
    .reduce((sum, r) => sum + Number(r.total), 0);
  const pendingRows = rows.filter((r) => r.status === "pending");

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-primary">{t("retailer.dashboard")}</h1>
          <p className="text-sm text-muted-foreground">{retailerName}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t("retailer.todaysOrders")}</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold">{todaysRows.length}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t("retailer.todaysRevenue")}</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold">{todaysRevenue.toLocaleString()} XAF</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t("retailer.pendingOrders")}</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold">{pendingRows.length}</CardContent>
          </Card>
        </div>

        <div className="space-y-2">
          {rows.map((o) => {
            const p = profiles[o.customer_id];
            return (
              <Card key={o.id}>
                <CardContent className="p-3 flex flex-wrap items-center gap-3">
                  <Link to="/orders/$id" params={{ id: o.id }} className="text-sm font-mono text-primary hover:underline">
                    {formatTrackingNumber(o.id)}
                  </Link>
                  <span className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">
                    {t("retailer.customer")}: {p?.full_name ?? p?.phone ?? "—"}
                  </span>
                  <Badge variant={statusColor(o.status)}>{t(`order.status.${o.status}`)}</Badge>
                  <span className="ml-auto text-sm font-semibold">{Number(o.total).toLocaleString()} XAF</span>

                  {o.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" disabled={busyId === o.id} onClick={() => updateStatus(o.id, "confirmed")}>
                        <Check className="mr-1 h-4 w-4" /> {t("retailer.accept")}
                      </Button>
                      <Button size="sm" variant="outline" disabled={busyId === o.id} onClick={() => reject(o.id)}>
                        <X className="mr-1 h-4 w-4" /> {t("retailer.reject")}
                      </Button>
                    </div>
                  )}
                  {(o.status === "confirmed" || o.status === "assigned") && (
                    <Button size="sm" variant="outline" disabled={busyId === o.id} onClick={() => updateStatus(o.id, "in_transit")}>
                      <Truck className="mr-1 h-4 w-4" /> {t("retailer.markOutForDelivery")}
                    </Button>
                  )}
                  {o.status === "in_transit" && (
                    <Button size="sm" variant="outline" disabled={busyId === o.id} onClick={() => updateStatus(o.id, "delivered")}>
                      <PackageCheck className="mr-1 h-4 w-4" /> {t("retailer.markDelivered")}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {rows.length === 0 && <p className="text-sm text-muted-foreground">{t("retailer.noOrdersToday")}</p>}
        </div>
      </main>
      <Footer />
    </div>
  );
}
