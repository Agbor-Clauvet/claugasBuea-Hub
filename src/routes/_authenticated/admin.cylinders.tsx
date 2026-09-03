import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/cylinders")({
  head: () => ({ meta: [{ title: "Admin · Cylinder Pricing — ClauGas" }] }),
  component: AdminCylindersPage,
});

type Row = {
  id: string;
  name: string;
  size_kg: number;
  price: number;
  is_active: boolean;
  in_stock: boolean;
  retailer_id?: string | null;
};

function AdminCylindersPage() {
  const { t } = useTranslation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [defaultRetailerId, setDefaultRetailerId] = useState<string | null>(null);

  // New-product form state
  const [newName, setNewName] = useState("");
  const [newSize, setNewSize] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return setIsAdmin(false);
      const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      setIsAdmin(((r ?? []) as { role: string }[]).some((x) => x.role === "admin"));
      const { data } = await supabase
        .from("cylinders")
        .select("id,name,size_kg,price,is_active,in_stock,retailer_id")
        .order("sort_order");
      const fetchedRows = (data ?? []) as unknown as Row[];
      setRows(fetchedRows);
      // Every new cylinder created from this form is linked to the same
      // retailer as your existing cylinders — this is what makes
      // distance-based delivery pricing work correctly for it. A cylinder
      // with no retailer_id can't calculate a real delivery distance and
      // silently falls back to a flat base fee.
      const withRetailer = fetchedRows.find((c) => c.retailer_id);
      if (withRetailer?.retailer_id) setDefaultRetailerId(withRetailer.retailer_id);
    })();
  }, []);

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error(t("admin.invalidImage"));
    if (file.size > 5 * 1024 * 1024) return toast.error(t("admin.imageTooLarge"));
    setNewImageFile(file);
    setNewImagePreview(URL.createObjectURL(file));
  }

  async function createCylinder() {
    const size = Number(newSize);
    const price = Number(newPrice);
    if (!newName.trim()) return toast.error(t("admin.needName"));
    if (!newSize || Number.isNaN(size) || size <= 0) return toast.error(t("admin.invalidSize"));
    if (!newPrice || Number.isNaN(price) || price < 0) return toast.error(t("admin.invalidPrice"));

    setCreating(true);
    try {
      let image_url: string | null = null;
      if (newImageFile) {
        const ext = newImageFile.name.split(".").pop() || "jpg";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("cylinder-images")
          .upload(path, newImageFile, { cacheControl: "3600", upsert: false });
        if (uploadError) throw uploadError;
        const { data: pub } = supabase.storage.from("cylinder-images").getPublicUrl(path);
        image_url = pub.publicUrl;
      }

      const maxSort = rows.reduce((m, r) => Math.max(m, (r as unknown as { sort_order?: number }).sort_order ?? 0), 0);
      const newRow = {
        name: newName.trim(),
        size_kg: size,
        price,
        description: newDescription.trim() || null,
        image_url,
        retailer_id: defaultRetailerId,
        is_active: true,
        in_stock: true,
        sort_order: maxSort + 1,
      };
      const { data: inserted, error } = await supabase
        .from("cylinders")
        .insert(newRow as unknown as { name: string; size_kg: number; price: number })
        .select("id,name,size_kg,price,is_active,in_stock")
        .single();
      if (error) throw error;

      setRows((rs) => [...rs, inserted as Row]);
      setNewName("");
      setNewSize("");
      setNewPrice("");
      setNewDescription("");
      setNewImageFile(null);
      setNewImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success(t("admin.productAdded"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("admin.createFailed"));
    } finally {
      setCreating(false);
    }
  }

  async function savePrice(id: string) {
    const raw = drafts[id];
    const price = Number(raw);
    if (!raw || Number.isNaN(price) || price < 0) return toast.error(t("admin.invalidPrice"));
    const { error } = await supabase.from("cylinders").update({ price }).eq("id", id);
    if (error) return toast.error(error.message);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, price } : r)));
    setDrafts((d) => {
      const n = { ...d };
      delete n[id];
      return n;
    });
    toast.success(t("admin.priceUpdated"));
  }

  async function toggleActive(id: string, v: boolean) {
    const { error } = await supabase.from("cylinders").update({ is_active: v }).eq("id", id);
    if (error) return toast.error(error.message);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, is_active: v } : r)));
    toast.success(t("admin.statusUpdated"));
  }

  async function toggleInStock(id: string, v: boolean) {
    const { error } = await supabase.from("cylinders").update({ in_stock: v }).eq("id", id);
    if (error) return toast.error(error.message);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, in_stock: v } : r)));
    toast.success(t("admin.statusUpdated"));
  }

  if (isAdmin === false)
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="mx-auto max-w-lg flex-1 px-4 py-16 text-center text-sm text-muted-foreground">
          {t("admin.forbidden")}
        </main>
        <Footer />
      </div>
    );

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-bold text-primary mb-4">{t("admin.cylinderPricing")}</h1>

        <Card className="mb-6 border-primary/30">
          <CardHeader>
            <CardTitle className="text-base">{t("admin.addProduct")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="new-name">{t("admin.productName")}</Label>
                <Input
                  id="new-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t("admin.productNamePlaceholder")}
                />
              </div>
              <div>
                <Label htmlFor="new-size">{t("admin.sizeKg")}</Label>
                <Input
                  id="new-size"
                  type="number"
                  min="0"
                  step="0.5"
                  value={newSize}
                  onChange={(e) => setNewSize(e.target.value)}
                  placeholder="12.5"
                />
              </div>
              <div>
                <Label htmlFor="new-price">{t("admin.priceXaf")}</Label>
                <Input
                  id="new-price"
                  type="number"
                  min="0"
                  step="50"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="new-image">{t("admin.productPhoto")}</Label>
                <Input id="new-image" ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} />
              </div>
            </div>
            <div>
              <Label htmlFor="new-description">{t("admin.descriptionOptional")}</Label>
              <Textarea
                id="new-description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={2}
              />
            </div>
            {newImagePreview ? (
              <img src={newImagePreview} alt="" className="h-24 w-24 rounded-md object-cover border" />
            ) : null}
            <Button onClick={createCylinder} disabled={creating}>
              {creating ? t("admin.adding") : t("admin.addProduct")}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  {r.name} <span className="text-xs text-muted-foreground">({r.size_kg} kg)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[180px]">
                  <label className="text-xs text-muted-foreground">{t("admin.priceXaf")}</label>
                  <Input
                    type="number"
                    min="0"
                    step="50"
                    value={drafts[r.id] ?? String(r.price)}
                    onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                  />
                </div>
                <Button
                  onClick={() => savePrice(r.id)}
                  disabled={drafts[r.id] === undefined || Number(drafts[r.id]) === r.price}
                >
                  {t("admin.save")}
                </Button>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={r.in_stock} onCheckedChange={(v) => toggleInStock(r.id, v)} />
                  {r.in_stock ? t("admin.inStock") : t("admin.outOfStock")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={r.is_active} onCheckedChange={(v) => toggleActive(r.id, v)} />
                  {t("admin.listed")}
                </label>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
