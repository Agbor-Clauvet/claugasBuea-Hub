import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  component: Index,
});

type Cylinder = { id: string; name: string; size_kg: number; price: number; description: string | null };

function Index() {
  const navigate = useNavigate();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [cylinders, setCylinders] = useState<Cylinder[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    supabase
      .from("cylinders")
      .select("id, name, size_kg, price, description")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setCylinders((data ?? []) as Cylinder[]));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-xl font-bold text-primary">GasGo</Link>
          {signedIn ? (
            <Button onClick={() => navigate({ to: "/dashboard" })}>Dashboard</Button>
          ) : (
            <Button onClick={() => navigate({ to: "/auth" })}>Sign in</Button>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-16">
        <section className="text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Gas cylinder refills, delivered.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Order LPG refills online and have them dropped at your doorstep — fast, safe, tracked.
          </p>
          <div className="mt-6">
            <Button size="lg" onClick={() => navigate({ to: signedIn ? "/dashboard" : "/auth" })}>
              {signedIn ? "Go to dashboard" : "Get started"}
            </Button>
          </div>
        </section>
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-semibold">Available cylinders</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {cylinders.map((c) => (
              <Card key={c.id}>
                <CardHeader>
                  <CardTitle>{c.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">${Number(c.price).toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">{c.size_kg} kg</div>
                  {c.description ? (
                    <p className="mt-2 text-sm text-muted-foreground">{c.description}</p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
            {cylinders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Loading catalog…</p>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
