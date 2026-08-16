import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/riders")({
  head: () => ({ meta: [{ title: "Admin · Riders — ClauGas" }] }),
  component: AdminRidersPage,
});

type ApplicantRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  locality: string | null;
  isApprovedRider: boolean;
};

function AdminRidersPage() {
  const { t } = useTranslation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<ApplicantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadApplicants() {
    setLoading(true);
    const { data: applicants } = await supabase
      .from("profiles")
      .select("id, full_name, phone, locality")
      .eq("is_rider_applicant", true)
      .order("full_name");

    const ids = (applicants ?? []).map((a) => a.id);
    const { data: riderRoles } = ids.length
      ? await supabase.from("user_roles").select("user_id").eq("role", "rider").in("user_id", ids)
      : { data: [] as { user_id: string }[] };

    const riderIds = new Set((riderRoles ?? []).map((r) => r.user_id));
    setRows(
      (applicants ?? []).map((a) => ({
        ...a,
        isApprovedRider: riderIds.has(a.id),
      }))
    );
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return setIsAdmin(false);
      const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      const admin = ((r ?? []) as { role: string }[]).some((x) => x.role === "admin");
      setIsAdmin(admin);
      if (admin) await loadApplicants();
    })();
  }, []);

  async function approveRider(userId: string) {
    setBusyId(userId);
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: "rider" });
    setBusyId(null);
    if (error) {
      // Unique constraint violation just means they're already a rider — treat as success.
      if (!error.message.toLowerCase().includes("duplicate")) {
        toast.error(error.message);
        return;
      }
    }
    toast.success(t("admin.riderApplications.approvedToast"));
    setRows((rs) => rs.map((r) => (r.id === userId ? { ...r, isApprovedRider: true } : r)));
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
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="text-2xl font-bold text-primary mb-2">{t("admin.riderApplications.title")}</h1>
        <p className="text-sm text-muted-foreground mb-8">{t("admin.riderApplications.subtitle")}</p>

        {loading || isAdmin === null ? (
          <p className="text-sm text-muted-foreground">{t("admin.riderApplications.loading")}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("admin.riderApplications.none")}</p>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <Card key={row.id}>
                <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
                  <div>
                    <CardTitle className="text-base">
                      {row.full_name || t("admin.riderApplications.noName")}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {row.phone || t("admin.riderApplications.noPhone")}
                    </p>
                  </div>
                  <Badge variant="secondary">{row.locality || t("admin.riderApplications.noLocality")}</Badge>
                </CardHeader>
                <CardContent>
                  {row.isApprovedRider ? (
                    <Badge className="bg-green-600 hover:bg-green-600">
                      {t("admin.riderApplications.approved")}
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => approveRider(row.id)}
                      disabled={busyId === row.id}
                    >
                      {busyId === row.id
                        ? t("admin.riderApplications.approving")
                        : t("admin.riderApplications.approve")}
                    </Button>
                  )}
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
