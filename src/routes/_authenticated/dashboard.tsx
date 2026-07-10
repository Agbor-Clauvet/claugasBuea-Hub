import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import logoAsset from "@/assets/clautech-logo.png.asset.json";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — ClauGas" }],
  }),
  component: DashboardPage,
});

type ProfileRow = { id: string; full_name: string | null; phone: string | null };
type RoleRow = { role: string };

function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState<string>("");
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [cylindersCount, setCylindersCount] = useState<number | null>(null);
  const [ordersCount, setOrdersCount] = useState<number | null>(null);
  const [rlsCheck, setRlsCheck] = useState<string>("pending");

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;
      setEmail(user.email ?? "");

      const [{ data: p }, { data: r }, { data: cy, count: cyCount }, { data: od, count: odCount }] =
        await Promise.all([
          supabase.from("profiles").select("id, full_name, phone").eq("id", user.id).maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", user.id),
          supabase.from("cylinders").select("id", { count: "exact", head: true }).eq("is_active", true),
          supabase.from("orders").select("id", { count: "exact", head: true }),
        ]);

      setProfile(p as ProfileRow | null);
      setRoles(((r ?? []) as RoleRow[]).map((row) => row.role));
      setCylindersCount(cyCount ?? (cy?.length ?? 0));
      setOrdersCount(odCount ?? (od?.length ?? 0));
      setRlsCheck(p && p.id === user.id ? "ok" : "unexpected");
    })();
  }, []);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success(t("auth.signedOut"));
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoAsset.url} alt="ClauGas" className="h-8 w-auto rounded" />
            <span className="text-lg font-semibold text-primary">ClauGas</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button variant="outline" size="sm" onClick={handleSignOut}>{t("nav.signOut")}</Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold">
            {t("dashboard.welcome")}{profile?.full_name ? `, ${profile.full_name}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">{email}</p>
          <div className="mt-2 flex gap-2">
            {roles.map((r) => (
              <Badge key={r} variant="secondary">{r}</Badge>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <Link to="/addresses" className="font-medium text-primary hover:underline">{t("address.title")} →</Link>
            <Link to="/orders" className="font-medium text-primary hover:underline">{t("order.myOrders")} →</Link>
            {roles.includes("admin") ? (
              <>
                <Link to="/admin/cylinders" className="font-medium text-primary hover:underline">{t("admin.cylinderPricing")} →</Link>
                <Link to="/admin/orders" className="font-medium text-primary hover:underline">{t("admin.orders")} →</Link>
              </>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.profile")}</CardTitle>
              <CardDescription>{t("dashboard.yourAccount")}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <div>{t("dashboard.name")}: {profile?.full_name ?? "—"}</div>
              <div>{t("dashboard.phone")}: {profile?.phone ?? "—"}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.activeCylinders")}</CardTitle>
              <CardDescription>{t("dashboard.publicCatalog")}</CardDescription>
            </CardHeader>
            <CardContent className="text-3xl font-bold text-primary">{cylindersCount ?? "—"}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.myOrders")}</CardTitle>
              <CardDescription>{t("dashboard.rlsScoped")}</CardDescription>
            </CardHeader>
            <CardContent className="text-3xl font-bold text-primary">{ordersCount ?? "—"}</CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.rlsCheck")}</CardTitle>
            <CardDescription>{t("dashboard.rlsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant={rlsCheck === "ok" ? "default" : "destructive"}>
              {rlsCheck === "ok" ? t("dashboard.ok") : rlsCheck === "unexpected" ? t("dashboard.unexpected") : rlsCheck}
            </Badge>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
