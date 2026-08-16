import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/admins")({
  head: () => ({ meta: [{ title: "Admin · Manage Admins — ClauGas" }] }),
  component: AdminAdminsPage,
});

type AdminRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  isSuperAdmin: boolean;
};

function AdminAdminsPage() {
  const { t } = useTranslation();
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [adding, setAdding] = useState(false);

  async function loadAdmins() {
    setLoading(true);
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    const { data: superAdminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "super_admin");

    const superIds = new Set((superAdminRoles ?? []).map((r) => r.user_id));
    const ids = (adminRoles ?? []).map((r) => r.user_id);

    if (ids.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, phone")
      .in("id", ids);

    setRows(
      (profiles ?? []).map((p) => ({
        id: p.id,
        full_name: p.full_name,
        phone: p.phone,
        isSuperAdmin: superIds.has(p.id),
      }))
    );
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return setIsSuperAdmin(false);
      setCurrentUserId(u.user.id);
      const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      const superAdmin = ((r ?? []) as { role: string }[]).some((x) => x.role === "super_admin");
      setIsSuperAdmin(superAdmin);
      if (superAdmin) await loadAdmins();
      else setLoading(false);
    })();
  }, []);

  async function handleAddAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!newAdminEmail.trim()) return;
    setAdding(true);

    const { data: userId, error: lookupError } = await supabase.rpc("find_user_id_by_email", {
      _email: newAdminEmail.trim(),
    });

    if (lookupError) {
      setAdding(false);
      toast.error(lookupError.message);
      return;
    }
    if (!userId) {
      setAdding(false);
      toast.error(t("admin.manageAdmins.noAccountFound"));
      return;
    }

    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
    setAdding(false);
    if (error) {
      if (!error.message.toLowerCase().includes("duplicate")) {
        toast.error(error.message);
        return;
      }
    }
    toast.success(t("admin.manageAdmins.addedToast"));
    setNewAdminEmail("");
    await loadAdmins();
  }

  async function toggleSuperAdmin(userId: string, makeSuper: boolean) {
    setBusyId(userId);
    const { error } = makeSuper
      ? await supabase.from("user_roles").insert({ user_id: userId, role: "super_admin" })
      : await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "super_admin");
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      makeSuper ? t("admin.manageAdmins.superAdminGrantedToast") : t("admin.manageAdmins.superAdminRemovedToast")
    );
    await loadAdmins();
  }

  async function removeAdmin(userId: string) {
    setBusyId(userId);
    // Remove both rows — someone who's no longer an admin shouldn't stay
    // a super admin either. The last-super-admin trigger still protects
    // against removing the very last one, so this can't lock you out.
    await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "super_admin");
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("admin.manageAdmins.adminRemovedToast"));
    await loadAdmins();
  }

  if (isSuperAdmin === false) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="mx-auto max-w-lg flex-1 px-4 py-16 text-center">
          <p className="text-muted-foreground">{t("admin.manageAdmins.accessDenied")}</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <h1 className="text-2xl font-bold text-primary mb-2">{t("admin.manageAdmins.title")}</h1>
        <p className="text-sm text-muted-foreground mb-8">{t("admin.manageAdmins.subtitle")}</p>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-base">{t("admin.manageAdmins.addTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddAdmin} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="newAdminEmail">{t("admin.manageAdmins.emailLabel")}</Label>
                <Input
                  id="newAdminEmail"
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder={t("admin.manageAdmins.emailPlaceholder")}
                  required
                />
              </div>
              <Button type="submit" disabled={adding}>
                {adding ? t("admin.manageAdmins.addButtonBusy") : t("admin.manageAdmins.addButton")}
              </Button>
            </form>
            <p className="mt-2 text-xs text-muted-foreground">{t("admin.manageAdmins.addHint")}</p>
          </CardContent>
        </Card>

        {loading || isSuperAdmin === null ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("admin.manageAdmins.none")}</p>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <Card key={row.id}>
                <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
                  <div>
                    <CardTitle className="text-base">
                      {row.full_name || t("admin.manageAdmins.noName")}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {row.phone || t("admin.manageAdmins.noPhone")}
                    </p>
                  </div>
                  {row.isSuperAdmin && <Badge>{t("admin.manageAdmins.superAdminBadge")}</Badge>}
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {row.isSuperAdmin ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === row.id}
                      onClick={() => toggleSuperAdmin(row.id, false)}
                    >
                      {t("admin.manageAdmins.removeSuperAdmin")}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === row.id}
                      onClick={() => toggleSuperAdmin(row.id, true)}
                    >
                      {t("admin.manageAdmins.makeSuperAdmin")}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busyId === row.id || row.id === currentUserId}
                    onClick={() => {
                      if (
                        confirm(
                          `${t("admin.manageAdmins.removeConfirm")} ${row.full_name || t("admin.manageAdmins.noName")}?`
                        )
                      ) {
                        removeAdmin(row.id);
                      }
                    }}
                  >
                    {t("admin.manageAdmins.removeAdmin")}
                  </Button>
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
