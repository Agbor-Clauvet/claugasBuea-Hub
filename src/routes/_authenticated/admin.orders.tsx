import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { BOOKING_STAGES, statusColor, type OrderStatus } from "@/lib/order-status";
import { formatTrackingNumber } from "@/lib/tracking";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  head: () => ({ meta: [{ title: "Admin · Orders — ClauGas" }] }),
  component: AdminOrdersPage,
});

type Row = {
  id: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  order_type: string;
  customer_id: string;
  payment_method: "cash_on_delivery" | "mobile_money";
  customer_name: string | null;
  customer_phone: string | null;
};

function AdminOrdersPage() {
  const { t } = useTranslation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");

  async function load() {
    const { data: orders } = await supabase
      .from("orders")
      .select("id,status,total,created_at,order_type,customer_id,payment_method")
      .order("created_at", { ascending: false })
      .limit(200);

    const orderRows = (orders ?? []) as Omit<Row, "customer_name" | "customer_phone">[];
    const customerIds = [...new Set(orderRows.map((o) => o.customer_id))];

    let profileById = new Map<string, { full_name: string | null; phone: string | null }>();
    if (customerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,full_name,phone")
        .in("id", customerIds);
      profileById = new Map(
        ((profiles ?? []) as { id: string; full_name: string | null; phone: string | null }[]).map((p) => [
          p.id,
          { full_name: p.full_name, phone: p.phone },
        ])
      );
    }

    setRows(
      orderRows.map((o) => ({
        ...o,
        customer_name: profileById.get(o.customer_id)?.full_name ?? null,
        customer_phone: profileById.get(o.customer_id)?.phone ?? null,
      }))
    );
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

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (!q) return true;
      return (
        formatTrackingNumber(o.id).toLowerCase().includes(q) ||
        (o.customer_name ?? "").toLowerCase().includes(q) ||
        (o.customer_phone ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, statusFilter]);

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
        <div className="mb-4 flex flex-wrap gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.searchPlaceholder")}
            className="max-w-xs"
          />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as OrderStatus | "all")}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.allStatuses")}</SelectItem>
              {BOOKING_STAGES.map((s) => (
                <SelectItem key={s} value={s}>{t(`order.status.${s}`)}</SelectItem>
              ))}
              <SelectItem value="cancelled">{t("order.status.cancelled")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          {filteredRows.map((o) => (
            <Card key={o.id}>
              <CardContent className="p-3 flex flex-wrap items-center gap-3">
                <Link to="/orders/$id" params={{ id: o.id }} className="text-sm font-mono text-primary hover:underline">{formatTrackingNumber(o.id)}</Link>
                <span className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</span>
                <span className="text-sm">
                  {o.customer_name ?? t("admin.unknownCustomer")}
                  {o.customer_phone ? <span className="text-muted-foreground"> · {o.customer_phone}</span> : null}
                </span>
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
          {rows.length > 0 && filteredRows.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("admin.noOrdersMatch")}</p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
