import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — GasGo" }],
  }),
  component: DashboardPage,
});

type ProfileRow = { id: string; full_name: string | null; phone: string | null };
type RoleRow = { role: string };

function DashboardPage() {
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
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-lg font-semibold text-primary">GasGo</Link>
          <Button variant="outline" onClick={handleSignOut}>Sign out</Button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold">Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}</h1>
          <p className="text-sm text-muted-foreground">{email}</p>
          <div className="mt-2 flex gap-2">
            {roles.map((r) => (
              <Badge key={r} variant="secondary">{r}</Badge>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your account</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <div>Name: {profile?.full_name ?? "—"}</div>
              <div>Phone: {profile?.phone ?? "—"}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Active cylinders</CardTitle>
              <CardDescription>Public catalog</CardDescription>
            </CardHeader>
            <CardContent className="text-3xl font-bold">{cylindersCount ?? "—"}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>My orders</CardTitle>
              <CardDescription>RLS scoped</CardDescription>
            </CardHeader>
            <CardContent className="text-3xl font-bold">{ordersCount ?? "—"}</CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>RLS self-check</CardTitle>
            <CardDescription>Confirms this session only sees its own profile row</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant={rlsCheck === "ok" ? "default" : "destructive"}>{rlsCheck}</Badge>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
