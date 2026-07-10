import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/addresses")({
  head: () => ({
    meta: [
      { title: "Delivery addresses — ClauGas" },
      { name: "description", content: "Save the Buea quarters where you want your ClauGas gas cylinders delivered." },
    ],
  }),
  component: AddressesPage,
});

type ServiceArea = { id: string; city: string; quarter: string; sort_order: number };
type Address = {
  id: string;
  user_id: string;
  label: string | null;
  line1: string;
  line2: string | null;
  city: string;
  quarter: string | null;
  landmark: string | null;
  notes: string | null;
  is_default: boolean;
};

function AddressesPage() {
  const { t } = useTranslation();
  const [areas, setAreas] = useState<ServiceArea[]>([]);
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [label, setLabel] = useState("");
  const [quarter, setQuarter] = useState("");
  const [landmark, setLandmark] = useState("");
  const [street, setStreet] = useState("");
  const [notes, setNotes] = useState("");
  const [makeDefault, setMakeDefault] = useState(false);

  function resetForm() {
    setEditingId(null); setLabel(""); setQuarter(""); setLandmark(""); setStreet(""); setNotes(""); setMakeDefault(false);
  }
  function startEdit(a: Address) {
    setEditingId(a.id);
    setLabel(a.label ?? ""); setQuarter(a.quarter ?? ""); setLandmark(a.landmark ?? "");
    setStreet(a.line1 ?? ""); setNotes(a.notes ?? ""); setMakeDefault(a.is_default);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function loadAddresses() {
    const { data } = await supabase
      .from("addresses")
      .select("*")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    setAddresses((data ?? []) as Address[]);
  }

  useEffect(() => {
    supabase
      .from("service_areas")
      .select("id,city,quarter,sort_order")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setAreas((data ?? []) as ServiceArea[]));
    loadAddresses();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, ServiceArea[]>();
    for (const a of areas) {
      const arr = map.get(a.city) ?? [];
      arr.push(a);
      map.set(a.city, arr);
    }
    return Array.from(map.entries());
  }, [areas]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!quarter) return toast.error(t("address.quarterRequired"));
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return; }
    const selected = areas.find((a) => a.quarter === quarter);
    const line1 = street.trim() || landmark.trim() || quarter;
    const payload = {
      user_id: u.user.id,
      label: label.trim() || null,
      line1,
      line2: null,
      city: selected?.city ?? "Buea",
      region: "South-West",
      quarter,
      landmark: landmark.trim() || null,
      notes: notes.trim() || null,
      is_default: makeDefault,
    };
    const { error } = editingId
      ? await supabase.from("addresses").update(payload).eq("id", editingId)
      : await supabase.from("addresses").insert(payload);
    setSaving(false);
    if (error) return toast.error(t("address.saveFailed"));
    toast.success(t("address.saved"));
    resetForm();
    loadAddresses();
  }

  async function handleDelete(id: string) {
    if (!confirm(t("address.deleteConfirm"))) return;
    const { error } = await supabase.from("addresses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    if (editingId === id) resetForm();
    toast.success(t("address.removed"));
    loadAddresses();
  }


  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-primary">{t("address.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("address.subtitle")}</p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>{t("address.add")}</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="a-label">{t("address.label")}</Label>
                  <Input id="a-label" placeholder={t("address.labelPh")} value={label} onChange={(e) => setLabel(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="a-quarter">{t("address.quarter")}</Label>
                  <select
                    id="a-quarter"
                    required
                    value={quarter}
                    onChange={(e) => setQuarter(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="">{t("address.chooseQuarter")}</option>
                    {grouped.map(([city, list]) => (
                      <optgroup key={city} label={city}>
                        {list.map((q) => (
                          <option key={q.id} value={q.quarter}>{q.quarter}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="a-landmark">{t("address.landmark")}</Label>
                  <Input id="a-landmark" placeholder={t("address.landmarkPh")} value={landmark} onChange={(e) => setLandmark(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="a-street">{t("address.street")}</Label>
                  <Input id="a-street" value={street} onChange={(e) => setStreet(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="a-notes">{t("address.notes")}</Label>
                  <Input id="a-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={makeDefault} onCheckedChange={(v) => setMakeDefault(!!v)} />
                  {t("address.makeDefault")}
                </label>
                <Button type="submit" className="w-full" disabled={saving}>
                  {t("address.add")}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t("address.title")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {addresses === null ? (
                <p className="text-sm text-muted-foreground">{t("address.loading")}</p>
              ) : addresses.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("address.empty")}</p>
              ) : (
                addresses.map((a) => (
                  <div key={a.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{a.label || a.quarter || a.line1}</span>
                        {a.is_default ? <Badge variant="secondary">{t("address.default")}</Badge> : null}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {[a.quarter, a.landmark, a.line1, a.city].filter(Boolean).join(" · ")}
                      </div>
                      {a.notes ? <div className="text-xs text-muted-foreground mt-1">{a.notes}</div> : null}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)} aria-label={t("address.delete")}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
