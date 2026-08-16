import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/commission-settings")({
  head: () => ({ meta: [{ title: "Admin · Commission Settings — ClauGas" }] }),
  component: AdminCommissionSettingsPage,
});

type SettingsRow = {
  id: string;
  retailer_rate: number;
  platform_rate: number;
  rider_rate: number;
  updated_at: string;
};

function AdminCommissionSettingsPage() {
  const { t } = useTranslation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsRow | null>(null);
  const [retailerRate, setRetailerRate] = useState("");
  const [platformRate, setPlatformRate] = useState("");
  const [riderRate, setRiderRate] = useState("");

  async function loadSettings() {
    const { data } = await supabase
      .from("commission_settings")
      .select("id, retailer_rate, platform_rate, rider_rate, updated_at")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const row = data as SettingsRow | null;
    if (row) {
      setSettings(row);
      setRetailerRate(String(row.retailer_rate));
      setPlatformRate(String(row.platform_rate));
      setRiderRate(String(row.rider_rate));
    }
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return setIsAdmin(false);
      const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      const admin = ((r ?? []) as { role: string }[]).some((x) => x.role === "admin");
      setIsAdmin(admin);
      if (admin) await loadSettings();
      else setLoading(false);
    })();
  }, []);

  const total =
    (parseFloat(retailerRate) || 0) + (parseFloat(platformRate) || 0) + (parseFloat(riderRate) || 0);
  const totalIsValid = Math.abs(total - 100) < 0.01;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    if (!totalIsValid) {
      toast.error(`${t("admin.commissionSettings.mustAddTo100")} ${total.toFixed(1)}%.`);
      return;
    }

    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("commission_settings")
      .update({
        retailer_rate: parseFloat(retailerRate),
        platform_rate: parseFloat(platformRate),
        rider_rate: parseFloat(riderRate),
        updated_by: u.user?.id ?? null,
      })
      .eq("id", settings.id);

    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("admin.commissionSettings.savedToast"));
    await loadSettings();
  }

  if (isAdmin === false) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="mx-auto max-w-lg flex-1 px-4 py-16 text-center">
          <p className="text-muted-foreground">{t("admin.riderApplications.accessDenied")}</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
        <h1 className="text-2xl font-bold text-primary mb-2">{t("admin.commissionSettings.title")}</h1>
        <p className="text-sm text-muted-foreground mb-8">{t("admin.commissionSettings.subtitle")}</p>

        {loading || isAdmin === null ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.commissionSettings.cardTitle")}</CardTitle>
              <CardDescription>{t("admin.commissionSettings.cardDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="retailerRate">{t("admin.commissionSettings.retailerShare")}</Label>
                  <Input
                    id="retailerRate"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={retailerRate}
                    onChange={(e) => setRetailerRate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="platformRate">{t("admin.commissionSettings.platformShare")}</Label>
                  <Input
                    id="platformRate"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={platformRate}
                    onChange={(e) => setPlatformRate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="riderRate">{t("admin.commissionSettings.riderShare")}</Label>
                  <Input
                    id="riderRate"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={riderRate}
                    onChange={(e) => setRiderRate(e.target.value)}
                    required
                  />
                </div>

                <p className={`text-sm font-medium ${totalIsValid ? "text-green-600" : "text-destructive"}`}>
                  {t("admin.commissionSettings.total")}: {total.toFixed(1)}%{" "}
                  {totalIsValid ? "✓" : `— ${t("admin.commissionSettings.totalMustEqual")}`}
                </p>

                <Button type="submit" className="w-full" disabled={saving || !totalIsValid}>
                  {saving ? t("admin.commissionSettings.saving") : t("admin.commissionSettings.save")}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}
