import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/cylinders")({
  head: () => ({ meta: [{ title: "Admin · Cylinder Pricing — ClauGas" }] }),
  component: AdminCylindersPage,
});

type Row = { id: string; name: string; size_kg: number; price: number; is_active: boolean };

function AdminCylindersPage() {
  const { t } = useTranslation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return setIsAdmin(false);
      const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      setIsAdmin(((r ?? []) as { role: string }[]).some((x) => x.role === "admin"));
      const { data } = await supabase.from("cylinders").select("id,name,size_kg,price,is_active").order("sort_order");
      setRows((data ?? []) as Row[]);
    })();
  }, []);

  async function savePrice(id: string) {
    const raw = drafts[id];
    const price = Number(raw);
    if (!raw || Number.isNaN(price) || price < 0) return toast.error(t("admin.invalidPrice"));
    const { error } = await supabase.from("cylinders").update({ price }).eq("id", id);
    if (error) return toast.error(error.message);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, price } : r)));
    setDrafts((d) => { const n = { ...d }; delete n[id]; return n; });
    toast.success(t("admin.priceUpdated"));
  }

  async function toggleActive(id: string, v: boolean) {
    const { error } = await supabase.from("cylinders").update({ is_active: v }).eq("id", id);
    if (error) return toast.error(error.message);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, is_active: v } : r)));
  }

  if (isAdmin === false) return (
    <div className="flex min-h-screen flex-col"><Navbar />
      <main className="mx-auto max-w-lg flex-1 px-4 py-16 text-center text-sm text-muted-foreground">{t("admin.forbidden")}</main><Footer /></div>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-bold text-primary mb-4">{t("admin.cylinderPricing")}</h1>
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardHeader><CardTitle className="text-base">{r.name} <span className="text-xs text-muted-foreground">({r.size_kg} kg)</span></CardTitle></CardHeader>
              <CardContent className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[180px]">
                  <label className="text-xs text-muted-foreground">{t("admin.priceXaf")}</label>
                  <Input type="number" min="0" step="50" value={drafts[r.id] ?? String(r.price)} onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))} />
                </div>
                <Button onClick={() => savePrice(r.id)} disabled={drafts[r.id] === undefined || Number(drafts[r.id]) === r.price}>
                  {t("admin.save")}
                </Button>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={r.is_active} onCheckedChange={(v) => toggleActive(r.id, v)} />
                  {t("admin.active")}
                </label>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
