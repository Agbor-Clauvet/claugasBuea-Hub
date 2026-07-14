import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BOOKING_STAGES, statusColor, type OrderStatus } from "@/lib/order-status";
import { formatTrackingNumber } from "@/lib/tracking";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  head: () => ({ meta: [{ title: "Admin · Orders — ClauGas" }] }),
  component: AdminOrdersPage,
});

type Row = { id: string; status: OrderStatus; total: number; created_at: string; order_type: string; customer_id: string; payment_method: "cash_on_delivery" | "mobile_money" };

function AdminOrdersPage() {
  const { t } = useTranslation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  async function load() {
    const { data } = await supabase.from("orders")
      .select("id,status,total,created_at,order_type,customer_id,payment_method")
      .order("created_at", { ascending: false }).limit(200);
    setRows((data ?? []) as Row[]);
  }

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return setIsAdmin(false);
      const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      const admin = ((r ?? []) as { role: string }[]).some((x) => x.role === "admin");
      setIsAdmin(admin);
      if (admin) load();
    })();
  }, []);

  async function setStatus(id: string, status: OrderStatus) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    toast.success(t("admin.statusUpdated"));
  }

  if (isAdmin === false) return (
    <div className="flex min-h-screen flex-col"><Navbar />
      <main className="mx-auto max-w-lg flex-1 px-4 py-16 text-center text-sm text-muted-foreground">{t("admin.forbidden")}</main><Footer /></div>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-bold text-primary mb-4">{t("admin.orders")}</h1>
        <div className="space-y-2">
          {rows.map((o) => (
            <Card key={o.id}>
              <CardContent className="p-3 flex flex-wrap items-center gap-3">
                <Link to="/orders/$id" params={{ id: o.id }} className="text-sm font-mono text-primary hover:underline">{formatTrackingNumber(o.id)}</Link>
                <span className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</span>
                <Badge variant={statusColor(o.status)}>{t(`order.status.${o.status}`)}</Badge>
                {o.order_type === "cylinder_booking" ? <Badge variant="outline">{t("order.booking")}</Badge> : null}
                <Badge variant={o.payment_method === "mobile_money" ? "secondary" : "outline"}>
                  {t(`order.${o.payment_method === "mobile_money" ? "payMomo" : "payCash"}`)}
                </Badge>
                <span className="ml-auto text-sm font-semibold">{Number(o.total).toLocaleString()} XAF</span>
                <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value as OrderStatus)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs">
                  {BOOKING_STAGES.map((s) => <option key={s} value={s}>{t(`order.status.${s}`)}</option>)}
                  <option value="cancelled">{t("order.status.cancelled")}</option>
                </select>
              </CardContent>
            </Card>
          ))}
          {rows.length === 0 && <p className="text-sm text-muted-foreground">{t("order.empty")}</p>}
        </div>
      </main>
      <Footer />
    </div>
  );
}
