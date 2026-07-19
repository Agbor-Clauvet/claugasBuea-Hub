import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ListOrdered, AlertCircle, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/retailer/customers")({
  head: () => ({ meta: [{ title: "Customers — ClauGas" }] }),
  component: RetailerCustomersPage,
});

const FREQUENT_ORDER_THRESHOLD = 3;

type OrderRow = { customer_id: string; total: number; status: string; created_at: string };
type Profile = { id: string; full_name: string | null; phone: string | null };
type CustomerSummary = {
  customerId: string;
  name: string;
  phone: string | null;
  orderCount: number;
  totalSpend: number;
  lastOrderAt: string;
};

function RetailerCustomersPage() {
  const { t } = useTranslation();
  const [access, setAccess] = useState<"pending" | "granted" | "denied">("pending");
  const [customers, setCustomers] = useState<CustomerSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return setAccess("denied");

      const [{ data: r }, { data: retailer }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", u.user.id),
        supabase.from("retailers").select("id").eq("owner_id", u.user.id).maybeSingle(),
      ]);
      const isAdmin = ((r ?? []) as { role: string }[]).some((x) => x.role === "admin");
      if (!retailer && !isAdmin) return setAccess("denied");
      setAccess("granted");

      const { data: orders, error } = await supabase
        .from("orders")
        .select("customer_id,total,status,created_at")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) {
        setLoadError(error.message);
        return;
      }

      const orderRows = (orders ?? []) as OrderRow[];
      const customerIds = Array.from(new Set(orderRows.map((o) => o.customer_id)));

      const { data: profiles } = customerIds.length
        ? await supabase.from("profiles").select("id,full_name,phone").in("id", customerIds)
        : { data: [] as Profile[] };
      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p as Profile]));

      const grouped = new Map<string, CustomerSummary>();
      for (const o of orderRows) {
        const existing = grouped.get(o.customer_id);
        const spend = o.status === "cancelled" ? 0 : Number(o.total);
        if (existing) {
          existing.orderCount += 1;
          existing.totalSpend += spend;
          if (o.created_at > existing.lastOrderAt) existing.lastOrderAt = o.created_at;
        } else {
          const p = profileMap.get(o.customer_id);
          grouped.set(o.customer_id, {
            customerId: o.customer_id,
            name: p?.full_name ?? p?.phone ?? t("retailer.unknownCustomer"),
            phone: p?.phone ?? null,
            orderCount: 1,
            totalSpend: spend,
            lastOrderAt: o.created_at,
          });
        }
      }

      setCustomers(Array.from(grouped.values()).sort((a, b) => b.totalSpend - a.totalSpend));
    })();
  }, [t]);

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

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-primary">{t("retailer.customers")}</h1>
            <p className="text-sm text-muted-foreground">{t("retailer.customersSubtitle")}</p>
          </div>
          <Link to="/retailer/orders">
            <Button size="sm" variant="outline">
              <ListOrdered className="mr-1.5 h-4 w-4" />
              {t("retailer.viewOrders")}
            </Button>
          </Link>
        </div>

        {loadError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        ) : customers === null ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {t("retailer.noCustomersYet")}
          </p>
        ) : (
          <div className="space-y-2">
            {customers.map((c) => (
              <Card key={c.customerId}>
                <CardContent className="p-3 flex flex-wrap items-center gap-3">
                  <div className="min-w-[140px]">
                    <div className="text-sm font-medium flex items-center gap-1.5">
                      {c.name}
                      {c.orderCount >= FREQUENT_ORDER_THRESHOLD && (
                        <Badge variant="secondary" className="gap-1">
                          <Star className="h-3 w-3" /> {t("retailer.frequentBuyer")}
                        </Badge>
                      )}
                    </div>
                    {c.phone && <div className="text-xs text-muted-foreground">{c.phone}</div>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("retailer.orderCount")}:{" "}
                    <span className="font-medium text-foreground">{c.orderCount}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("retailer.lastOrder")}: {new Date(c.lastOrderAt).toLocaleDateString()}
                  </div>
                  <div className="ml-auto text-sm font-semibold">
                    {t("retailer.totalSpent")}: {c.totalSpend.toLocaleString()} XAF
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
