import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/become-rider")({
  head: () => ({ meta: [{ title: "Become a Rider — ClauGas" }] }),
  component: BecomeRiderPage,
});

// Common Buea quarters. "Other" lets someone in a quarter not listed here
// still register — their typed value is saved as-is.
const LOCALITIES = [
  "Molyko",
  "Great Soppo",
  "Small Soppo",
  "GRA",
  "Bonduma",
  "Bokwango",
  "Bomaka",
  "Mile 16",
  "Muea",
  "Check Point",
  "Buea Town",
  "Other",
];

type ProfileRow = {
  full_name: string | null;
  phone: string | null;
  locality: string | null;
  is_rider_applicant: boolean;
};

function BecomeRiderPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [alreadyRider, setAlreadyRider] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [locality, setLocality] = useState("");
  const [otherLocality, setOtherLocality] = useState("");

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return setLoading(false);

      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, phone, locality, is_rider_applicant")
          .eq("id", user.id)
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);

      const p = profile as ProfileRow | null;
      if (p) {
        setFullName(p.full_name ?? "");
        setPhone(p.phone ?? "");
        setAlreadyApplied(p.is_rider_applicant);
        // If their saved locality isn't in the preset list, treat it as "Other".
        if (p.locality) {
          if (LOCALITIES.includes(p.locality)) {
            setLocality(p.locality);
          } else {
            setLocality("Other");
            setOtherLocality(p.locality);
          }
        }
      }
      setAlreadyRider(((roles ?? []) as { role: string }[]).some((r) => r.role === "rider"));
      setLoading(false);
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const finalLocality = locality === "Other" ? otherLocality.trim() : locality;
    if (!fullName.trim() || !phone.trim() || !finalLocality) {
      toast.error("Please fill in your name, phone, and locality.");
      return;
    }

    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        phone: phone.trim(),
        locality: finalLocality,
        is_rider_applicant: true,
      })
      .eq("id", user.id);

    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setAlreadyApplied(true);
    toast.success("Application received! We'll be in touch.");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
        <h1 className="text-2xl font-bold text-primary mb-2">Become a ClauGas Rider</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Tell us your locality so we can match you with deliveries near you.
        </p>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : alreadyRider ? (
          <Card>
            <CardHeader>
              <CardTitle>You're already a rider</CardTitle>
              <CardDescription>Your account already has rider access.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/dashboard" className="text-sm font-medium text-primary hover:underline">
                Go to your dashboard →
              </Link>
            </CardContent>
          </Card>
        ) : alreadyApplied ? (
          <Card>
            <CardHeader>
              <CardTitle>Application received</CardTitle>
              <CardDescription>
                Thanks — we've got your details for <strong>{locality === "Other" ? otherLocality : locality}</strong>.
                We'll reach out once your rider account is approved.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => setAlreadyApplied(false)}>
                Update my details
              </Button>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+237 6XX XXX XXX"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="locality">Which locality are you based in?</Label>
              <Select value={locality} onValueChange={setLocality}>
                <SelectTrigger id="locality">
                  <SelectValue placeholder="Select your locality" />
                </SelectTrigger>
                <SelectContent>
                  {LOCALITIES.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {locality === "Other" && (
              <div className="space-y-2">
                <Label htmlFor="otherLocality">Enter your locality</Label>
                <Input
                  id="otherLocality"
                  value={otherLocality}
                  onChange={(e) => setOtherLocality(e.target.value)}
                  placeholder="e.g. Wonya Mavio"
                  required
                />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Submitting…" : "Submit application"}
            </Button>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
}
