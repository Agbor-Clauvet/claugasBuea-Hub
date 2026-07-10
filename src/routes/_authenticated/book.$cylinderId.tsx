import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Flame } from "lucide-react";

export const Route = createFileRoute("/_authenticated/book/$cylinderId")({
  head: () => ({ meta: [{ title: "Book Refill — ClauGas" }] }),
  component: BookPage,
  errorComponent: ({ error }) => <div className="p-6 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-6 text-sm">Cylinder not found.</div>,
});

type Cylinder = { id: string; name: string; size_kg: number; price: number; image_url: string | null };
type Address = { id: string; label: string | null; quarter: string | null; line1: string; city: string };

function BookPage() {
  const { cylinderId } = Route.useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [cyl, setCyl] = useState<Cylinder | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState<string>("");
  const [consumerNo, setConsumerNo] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.from("cylinders").select("id,name,size_kg,price,image_url").eq("id", cylinderId).maybeSingle()
      .then(({ data }) => setCyl(data as Cylinder | null));
    supabase.from("addresses").select("id,label,quarter,line1,city").order("is_default", { ascending: false })
      .then(({ data }) => {
        const list = (data ?? []) as Address[];
        setAddresses(list);
        if (list[0]) setAddressId(list[0].id);
      });
  }, [cylinderId]);

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!cyl || !addressId) return toast.error(t("booking.needAddress"));
    setSubmitting(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSubmitting(false); return; }
    const unit = Number(cyl.price);
    const { data: order, error } = await supabase.from("orders").insert({
      customer_id: u.user.id,
      address_id: addressId,
      status: "pending",
      subtotal: unit,
      delivery_fee: 0,
      total: unit,
      notes: notes || null,
      order_type: "cylinder_booking",
      consumer_number: consumerNo || null,
      preferred_delivery_date: preferredDate || null,
    } as never).select("id").single();
    if (error || !order) { setSubmitting(false); return toast.error(error?.message ?? "Failed"); }
    const { error: itemErr } = await supabase.from("order_items").insert({
      order_id: (order as { id: string }).id,
      cylinder_id: cyl.id,
      quantity: 1,
      unit_price: unit,
    });
    setSubmitting(false);
    if (itemErr) return toast.error(itemErr.message);
    toast.success(t("booking.placed"));
    navigate({ to: "/orders/$id", params: { id: (order as { id: string }).id } });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-bold text-primary mb-4">{t("booking.title")}</h1>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>{cyl?.name ?? "…"}</CardTitle></CardHeader>
            <CardContent>
              <div className="aspect-square rounded-md bg-muted/40 flex items-center justify-center overflow-hidden">
                {cyl?.image_url ? <img src={cyl.image_url} alt={cyl.name} className="h-full w-full object-cover" /> : <Flame className="h-20 w-20 text-primary" />}
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <div className="text-3xl font-bold text-primary">{cyl ? Number(cyl.price).toLocaleString() : "—"} XAF</div>
                <div className="text-sm text-muted-foreground">{cyl?.size_kg} {t("home.featured.kg")}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t("booking.details")}</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleBook} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="addr">{t("booking.address")}</Label>
                  {addresses.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      {t("booking.noAddress")}{" "}
                      <a className="text-primary underline" href="/addresses">{t("address.add")}</a>
                    </div>
                  ) : (
                    <select id="addr" required value={addressId} onChange={(e) => setAddressId(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                      {addresses.map((a) => (
                        <option key={a.id} value={a.id}>
                          {[a.label, a.quarter, a.line1].filter(Boolean).join(" · ")}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="consumer">{t("booking.consumerNumber")}</Label>
                  <Input id="consumer" placeholder="LPG-XXXXX" value={consumerNo} onChange={(e) => setConsumerNo(e.target.value)} maxLength={40} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pdate">{t("booking.preferredDate")}</Label>
                  <Input id="pdate" type="date" value={preferredDate} min={new Date().toISOString().slice(0,10)} onChange={(e) => setPreferredDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bnotes">{t("booking.notes")}</Label>
                  <Input id="bnotes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={280} />
                </div>
                <Button type="submit" disabled={submitting || addresses.length === 0} className="w-full">
                  {submitting ? t("booking.placing") : t("booking.confirm")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
