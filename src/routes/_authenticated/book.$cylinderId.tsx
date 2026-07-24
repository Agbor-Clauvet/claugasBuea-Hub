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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Minus, Plus, Banknote, Smartphone } from "lucide-react";
import { GasCylinderIcon, sizeToColor } from "@/components/icons/GasCylinderIcon";
import { cylinderPhoto } from "@/components/icons/cylinderPhoto";
import { calculateDeliveryFee, haversineDistanceKm, type Coordinates } from "@/lib/delivery-fee";

export const Route = createFileRoute("/_authenticated/book/$cylinderId")({
  head: () => ({ meta: [{ title: "Book Refill — ClauGas" }] }),
  component: BookPage,
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-6 text-sm">Cylinder not found.</div>,
});

type Cylinder = {
  id: string;
  name: string;
  size_kg: number;
  price: number;
  image_url: string | null;
  retailer_id: string | null;
  in_stock: boolean;
};
type Address = {
  id: string;
  label: string | null;
  quarter: string | null;
  line1: string;
  city: string;
};
type PaymentMethod = "cash_on_delivery" | "mobile_money";

// Calling Campay is wrapped so it can NEVER block or break checkout. If the
// Edge Function isn't deployed yet, secrets aren't set, or Campay/network
// hiccups, this just returns ok:false — the order itself was already saved
// before this runs, so the customer still gets a normal order confirmation.
async function initiateMobileMoneyPayment(
  orderId: string,
  phoneNumber: string,
): Promise<{ ok: true; message?: string } | { ok: false }> {
  try {
    const { data, error } = await supabase.functions.invoke("campay-initiate", {
      body: { orderId, phoneNumber },
    });
    if (error) {
      console.warn("Campay initiation failed, order still placed:", error);
      return { ok: false };
    }
    return { ok: true, message: (data as { message?: string })?.message };
  } catch (err) {
    console.warn("Campay initiation threw, order still placed:", err);
    return { ok: false };
  }
}
type QuarterCoord = { quarter: string; lat: number | null; lng: number | null };

function BookPage() {
  const { cylinderId } = Route.useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [cyl, setCyl] = useState<Cylinder | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash_on_delivery");
  const [momoPhone, setMomoPhone] = useState("");
  const [consumerNo, setConsumerNo] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [retailerCoords, setRetailerCoords] = useState<Coordinates | null>(null);
  const [quarterCoords, setQuarterCoords] = useState<QuarterCoord[]>([]);

  useEffect(() => {
    supabase
      .from("cylinders")
      .select("id,name,size_kg,price,image_url,retailer_id,in_stock")
      .eq("id", cylinderId)
      .maybeSingle()
      .then(async ({ data }) => {
        const c = data as Cylinder | null;
        setCyl(c);
        if (c?.retailer_id) {
          const { data: r } = await supabase
            .from("retailers")
            .select("lat,lng")
            .eq("id", c.retailer_id)
            .maybeSingle();
          if (r && r.lat != null && r.lng != null) setRetailerCoords({ lat: r.lat, lng: r.lng });
        }
      });
    supabase
      .from("addresses")
      .select("id,label,quarter,line1,city")
      .order("is_default", { ascending: false })
      .then(({ data }) => {
        const list = (data ?? []) as Address[];
        setAddresses(list);
        if (list[0]) setAddressId(list[0].id);
      });
    supabase
      .from("service_areas")
      .select("quarter,lat,lng")
      .then(({ data }) => setQuarterCoords((data ?? []) as QuarterCoord[]));
    supabase.auth.getUser().then(async ({ data: u }) => {
      if (!u.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone")
        .eq("id", u.user.id)
        .maybeSingle();
      if (profile?.phone) setMomoPhone(profile.phone);
    });
  }, [cylinderId]);

  const unit = cyl ? Number(cyl.price) : 0;
  const subtotal = unit * quantity;

  const selectedAddress = addresses.find((a) => a.id === addressId);
  const selectedQuarterCoord = selectedAddress?.quarter
    ? quarterCoords.find((q) => q.quarter === selectedAddress.quarter)
    : undefined;
  const destCoords: Coordinates | null =
    selectedQuarterCoord?.lat != null && selectedQuarterCoord?.lng != null
      ? { lat: selectedQuarterCoord.lat, lng: selectedQuarterCoord.lng }
      : null;

  const distanceKm =
    retailerCoords && destCoords ? haversineDistanceKm(retailerCoords, destCoords) : null;
  const deliveryResult = distanceKm != null ? calculateDeliveryFee(distanceKm, subtotal) : null;
  // Fallback while a quarter's coordinates haven't been set yet: base fee only, clearly not the final
  // distance-adjusted price. This should become rare once every quarter has coordinates.
  const deliveryFee: number = deliveryResult
    ? deliveryResult.fee
    : calculateDeliveryFee(0, subtotal).fee;
  const total = subtotal + deliveryFee;

  function adjustQty(delta: number) {
    setQuantity((q) => Math.min(30, Math.max(1, q + delta)));
  }

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!cyl || !addressId) return toast.error(t("booking.needAddress"));
    if (!cyl.in_stock) return toast.error(t("booking.outOfStock"));
    if (paymentMethod === "mobile_money" && !momoPhone.trim()) {
      return toast.error(t("booking.needMomoPhone"));
    }
    setSubmitting(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setSubmitting(false);
      return;
    }
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        customer_id: u.user.id,
        address_id: addressId,
        status: "pending",
        subtotal,
        delivery_fee: deliveryFee,
        total,
        notes: notes || null,
        order_type: "cylinder_booking",
        consumer_number: consumerNo || null,
        preferred_delivery_date: preferredDate || null,
        payment_method: paymentMethod,
      } as never)
      .select("id")
      .single();
    if (error || !order) {
      setSubmitting(false);
      return toast.error(error?.message ?? "Failed");
    }
    const { error: itemErr } = await supabase.from("order_items").insert({
      order_id: (order as { id: string }).id,
      cylinder_id: cyl.id,
      quantity,
      unit_price: unit,
    });
    if (itemErr) {
      setSubmitting(false);
      return toast.error(itemErr.message);
    }

    // The order is already saved at this point no matter what happens below —
    // Campay is best-effort and never blocks the customer reaching their order.
    if (paymentMethod === "mobile_money") {
      const result = await initiateMobileMoneyPayment(
        (order as { id: string }).id,
        momoPhone.trim(),
      );
      if (result.ok) {
        toast.success(result.message ?? t("booking.momoPromptSent"));
      } else {
        toast.info(t("booking.momoUnavailable"));
      }
    } else {
      toast.success(t("booking.placed"));
    }

    setSubmitting(false);
    navigate({ to: "/orders/$id", params: { id: (order as { id: string }).id } });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-bold text-primary mb-4">{t("booking.title")}</h1>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{cyl?.name ?? "…"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-square rounded-md bg-muted/40 flex items-center justify-center overflow-hidden">
                {cyl?.image_url ? (
                  <img src={cyl.image_url} alt={cyl.name} className="h-full w-full object-cover" />
                ) : cyl ? (
                  <img
                    src={cylinderPhoto(cyl.name)}
                    alt={cyl.name}
                    className="h-full w-full object-contain p-4"
                  />
                ) : (
                  <GasCylinderIcon color={sizeToColor(13)} className="h-32 w-32" />
                )}
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <div className="text-3xl font-bold text-primary">
                  {cyl ? unit.toLocaleString() : "—"} XAF
                </div>
                <div className="text-sm text-muted-foreground">
                  {cyl?.size_kg} {t("home.featured.kg")}
                </div>
              </div>

              {/* Quantity stepper */}
              <div className="mt-4 space-y-1.5">
                <Label>{t("booking.quantity")}</Label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => adjustQty(-1)}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-10 text-center text-lg font-semibold tabular-nums">
                    {quantity}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => adjustQty(1)}
                    disabled={quantity >= 30}
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {quantity >= 15 ? (
                  <p className="text-xs text-muted-foreground">
                    {t("booking.bulkNote")}{" "}
                    <a href="/#contact" className="text-primary underline">
                      {t("nav.contact")}
                    </a>
                  </p>
                ) : null}
              </div>

              {/* Price breakdown */}
              <div className="mt-4 space-y-1 rounded-md border bg-muted/30 p-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("booking.subtotal")}</span>
                  <span>{subtotal.toLocaleString()} XAF</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>
                    {t("order.delivery")}
                    {distanceKm != null ? ` (${distanceKm.toFixed(1)} km)` : ""}
                  </span>
                  <span>
                    {deliveryFee === 0
                      ? t("booking.freeDelivery")
                      : `${deliveryFee.toLocaleString()} XAF`}
                  </span>
                </div>
                {deliveryResult?.discountApplied ? (
                  <div className="text-xs text-primary">{t("booking.deliveryDiscount")}</div>
                ) : null}
                <div className="flex justify-between font-semibold text-foreground border-t pt-1 mt-1">
                  <span>{t("order.total")}</span>
                  <span>{total.toLocaleString()} XAF</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("booking.details")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBook} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="addr">{t("booking.address")}</Label>
                  {addresses.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      {t("booking.noAddress")}{" "}
                      <a className="text-primary underline" href="/addresses">
                        {t("address.add")}
                      </a>
                    </div>
                  ) : (
                    <Select value={addressId} onValueChange={setAddressId}>
                      <SelectTrigger id="addr">
                        <SelectValue placeholder={t("address.chooseQuarter")} />
                      </SelectTrigger>
                      <SelectContent>
                        {addresses.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {[a.label, a.quarter, a.line1].filter(Boolean).join(" · ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Payment method */}
                <div className="space-y-1.5">
                  <Label>{t("booking.paymentMethod")}</Label>
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                    className="gap-2"
                  >
                    <label
                      htmlFor="pm-cod"
                      className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${paymentMethod === "cash_on_delivery" ? "border-primary bg-primary/5" : "border-input"}`}
                    >
                      <RadioGroupItem value="cash_on_delivery" id="pm-cod" className="mt-0.5" />
                      <Banknote className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium">{t("booking.payCash")}</div>
                        <div className="text-xs text-muted-foreground">
                          {t("booking.payCashDesc")}
                        </div>
                      </div>
                    </label>
                    <label
                      htmlFor="pm-momo"
                      className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${paymentMethod === "mobile_money" ? "border-primary bg-primary/5" : "border-input"}`}
                    >
                      <RadioGroupItem value="mobile_money" id="pm-momo" className="mt-0.5" />
                      <Smartphone className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium">{t("booking.payMomo")}</div>
                        <div className="text-xs text-muted-foreground">
                          {t("booking.payMomoDesc")}
                        </div>
                      </div>
                    </label>
                  </RadioGroup>
                </div>

                {paymentMethod === "mobile_money" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="momoPhone">{t("booking.momoPhone")}</Label>
                    <Input
                      id="momoPhone"
                      type="tel"
                      placeholder="6XXXXXXXX"
                      value={momoPhone}
                      onChange={(e) => setMomoPhone(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">{t("booking.momoPhoneHint")}</p>
                  </div>
                ) : null}

                <div className="space-y-1.5">
                  <Label htmlFor="consumer">{t("booking.consumerNumber")}</Label>
                  <Input
                    id="consumer"
                    placeholder="LPG-XXXXX"
                    value={consumerNo}
                    onChange={(e) => setConsumerNo(e.target.value)}
                    maxLength={40}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pdate">{t("booking.preferredDate")}</Label>
                  <Input
                    id="pdate"
                    type="date"
                    value={preferredDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setPreferredDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bnotes">{t("booking.notes")}</Label>
                  <Input
                    id="bnotes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={280}
                  />
                </div>
                {cyl && !cyl.in_stock ? (
                  <p className="text-sm font-medium text-destructive">{t("booking.outOfStock")}</p>
                ) : null}
                <Button
                  type="submit"
                  disabled={submitting || addresses.length === 0 || (cyl ? !cyl.in_stock : false)}
                  className="w-full"
                >
                  {submitting
                    ? t("booking.placing")
                    : `${t("booking.confirm")} · ${total.toLocaleString()} XAF`}
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
