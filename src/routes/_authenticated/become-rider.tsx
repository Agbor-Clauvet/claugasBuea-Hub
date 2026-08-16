import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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

// Common Buea quarters — real place names, so these stay the same across
// every language. Only the "Other" option itself gets translated (see
// OTHER_VALUE below, kept as a stable internal sentinel independent of
// whatever label is displayed for it).
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
];
const OTHER_VALUE = "Other";

type ProfileRow = {
  full_name: string | null;
  phone: string | null;
  locality: string | null;
  is_rider_applicant: boolean;
};

function BecomeRiderPage() {
  const { t } = useTranslation();
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
            setLocality(OTHER_VALUE);
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
    const finalLocality = locality === OTHER_VALUE ? otherLocality.trim() : locality;
    if (!fullName.trim() || !phone.trim() || !finalLocality) {
      toast.error(t("becomeRider.fillRequired"));
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
    toast.success(t("becomeRider.successToast"));
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
        <h1 className="text-2xl font-bold text-primary mb-2">{t("becomeRider.title")}</h1>
        <p className="text-sm text-muted-foreground mb-8">{t("becomeRider.subtitle")}</p>

        {loading ? (
          <p className="text-sm text-muted-foreground">{t("becomeRider.loading")}</p>
        ) : alreadyRider ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("becomeRider.alreadyRiderTitle")}</CardTitle>
              <CardDescription>{t("becomeRider.alreadyRiderBody")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/dashboard" className="text-sm font-medium text-primary hover:underline">
                {t("becomeRider.goDashboard")}
              </Link>
            </CardContent>
          </Card>
        ) : alreadyApplied ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("becomeRider.appliedTitle")}</CardTitle>
              <CardDescription>
                {t("becomeRider.appliedBodyPrefix")}{" "}
                <strong>{locality === OTHER_VALUE ? otherLocality : locality}</strong>.{" "}
                {t("becomeRider.appliedBodySuffix")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => setAlreadyApplied(false)}>
                {t("becomeRider.updateDetails")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName">{t("becomeRider.fullName")}</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t("becomeRider.fullNamePlaceholder")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t("becomeRider.phone")}</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("becomeRider.phonePlaceholder")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="locality">{t("becomeRider.localityLabel")}</Label>
              <Select value={locality} onValueChange={setLocality}>
                <SelectTrigger id="locality">
                  <SelectValue placeholder={t("becomeRider.localityPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {LOCALITIES.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                  <SelectItem value={OTHER_VALUE}>{t("becomeRider.otherOption")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {locality === OTHER_VALUE && (
              <div className="space-y-2">
                <Label htmlFor="otherLocality">{t("becomeRider.otherLocalityLabel")}</Label>
                <Input
                  id="otherLocality"
                  value={otherLocality}
                  onChange={(e) => setOtherLocality(e.target.value)}
                  placeholder={t("becomeRider.otherLocalityPlaceholder")}
                  required
                />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? t("becomeRider.submitting") : t("becomeRider.submit")}
            </Button>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
}
