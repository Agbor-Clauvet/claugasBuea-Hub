import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Flame, ShieldCheck, Truck, Wallet, CheckCircle2, Phone, Mail, Clock, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const Route = createFileRoute("/")({
  component: Index,
});

type Cylinder = {
  id: string;
  name: string;
  size_kg: number;
  price: number;
  description: string | null;
  brand?: string | null;
  image_url?: string | null;
  in_stock?: boolean | null;
};

function Index() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [signedIn, setSignedIn] = useState(false);
  const [cylinders, setCylinders] = useState<Cylinder[] | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    supabase
      .from("cylinders")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setCylinders((data ?? []) as Cylinder[]));
  }, []);

  const goOrder = () => navigate({ to: signedIn ? "/dashboard" : "/auth" });
  const goBook = (id: string) => navigate({ to: signedIn ? "/book/$cylinderId" : "/auth", params: { cylinderId: id } });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="mx-auto max-w-6xl px-4 py-20 md:py-28 grid gap-10 md:grid-cols-2 items-center">
          <div>
            <Badge className="mb-4 bg-accent/20 text-accent-foreground border-accent/30">{t("brand.tagline")}</Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              {t("home.hero.title")}
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-xl">{t("home.hero.subtitle")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={goOrder} className="shadow-lg shadow-primary/20">
                <Flame className="mr-2 h-4 w-4" /> {t("home.hero.ctaPrimary")}
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#products">{t("home.hero.ctaSecondary")}</a>
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-square rounded-3xl bg-gradient-to-br from-primary to-primary/70 shadow-2xl shadow-primary/30 flex items-center justify-center">
              <Flame className="h-40 w-40 text-accent" strokeWidth={1.2} />
            </div>
            <div className="absolute -bottom-4 -left-4 rounded-2xl border bg-card p-4 shadow-xl">
              <div className="flex items-center gap-2 text-sm font-medium"><Truck className="h-4 w-4 text-primary" /> Molyko · Great Soppo · GRA · Bonduma</div>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCTS */}
      <section id="products" className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold">{t("home.featured.title")}</h2>
          <p className="mt-2 text-muted-foreground">{t("home.featured.subtitle")}</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3">
          {cylinders === null
            ? Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader><Skeleton className="h-40 w-full rounded-md" /></CardHeader>
                  <CardContent className="space-y-2">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-9 w-full" />
                  </CardContent>
                </Card>
              ))
            : cylinders.length === 0
            ? <p className="col-span-full text-center text-sm text-muted-foreground">{t("home.featured.empty")}</p>
            : cylinders.map((c) => (
                <Card key={c.id} className="overflow-hidden group hover:shadow-xl transition-shadow">
                  <div className="aspect-[4/3] bg-gradient-to-br from-primary/10 to-accent/20 flex items-center justify-center">
                    {c.image_url ? (
                      <img src={c.image_url} alt={c.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <Flame className="h-20 w-20 text-primary" strokeWidth={1.4} />
                    )}
                  </div>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-lg">{c.name}</CardTitle>
                      <Badge variant={c.in_stock === false ? "destructive" : "secondary"}>
                        {c.in_stock === false ? t("home.featured.outOfStock") : t("home.featured.inStock")}
                      </Badge>
                    </div>
                    {c.brand ? <p className="text-xs text-muted-foreground">{c.brand}</p> : null}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-baseline justify-between">
                      <div className="text-2xl font-bold text-primary">{Number(c.price).toLocaleString()} XAF</div>
                      <div className="text-sm text-muted-foreground">{c.size_kg} {t("home.featured.kg")}</div>
                    </div>
                    <Button size="sm" className="w-full" onClick={() => goBook(c.id)}>
                      <Flame className="mr-2 h-4 w-4" /> {t("home.featured.bookRefill")}
                    </Button>
                  </CardContent>
                </Card>
              ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-bold text-center mb-10">{t("home.how.title")}</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: Flame, title: t("home.how.s1Title"), desc: t("home.how.s1Desc") },
              { icon: Wallet, title: t("home.how.s2Title"), desc: t("home.how.s2Desc") },
              { icon: Truck, title: t("home.how.s3Title"), desc: t("home.how.s3Desc") },
            ].map((s, i) => (
              <Card key={i} className="text-center">
                <CardContent className="pt-6">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <s.icon className="h-7 w-7" />
                  </div>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* WHY */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-10">{t("home.why.title")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {["f1", "f2", "f3", "f4"].map((k) => (
            <div key={k} className="flex items-start gap-3 rounded-xl border bg-card p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary shrink-0" />
              <span className="text-sm font-medium">{t(`home.why.${k}`)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* SAFETY */}
      <section id="safety" className="bg-accent/10">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex items-center justify-center gap-2 mb-8">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h2 className="text-3xl font-bold text-center">{t("home.safety.title")}</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {["t1", "t2", "t3"].map((k) => (
              <Card key={k}>
                <CardContent className="pt-6 text-sm">{t(`home.safety.${k}`)}</CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-10">{t("home.reviews.title")}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {["r1", "r2", "r3"].map((k) => (
            <Card key={k}>
              <CardContent className="pt-6">
                <div className="flex gap-0.5 text-accent mb-2">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                </div>
                <p className="text-sm italic">"{t(`home.reviews.${k}Text`)}"</p>
                <p className="mt-3 text-xs font-medium text-muted-foreground">— {t(`home.reviews.${k}Name`)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-muted/30">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <h2 className="text-3xl font-bold text-center mb-8">{t("home.faq.title")}</h2>
          <Accordion type="single" collapsible className="w-full">
            {["1", "2", "3"].map((n) => (
              <AccordionItem key={n} value={`q${n}`}>
                <AccordionTrigger>{t(`home.faq.q${n}`)}</AccordionTrigger>
                <AccordionContent>{t(`home.faq.a${n}`)}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold">{t("home.contact.title")}</h2>
          <p className="mt-2 text-muted-foreground">{t("home.contact.subtitle")}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3 max-w-3xl mx-auto">
          <Card><CardContent className="pt-6 text-center">
            <Phone className="mx-auto mb-2 h-6 w-6 text-primary" />
            <div className="text-sm font-semibold">{t("home.contact.phone")}</div>
            <a href="tel:+237650556715" className="text-sm text-muted-foreground hover:text-primary transition-colors">+237 650 556 715</a>
          </CardContent></Card>
          <Card><CardContent className="pt-6 text-center">
            <Mail className="mx-auto mb-2 h-6 w-6 text-primary" />
            <div className="text-sm font-semibold">{t("home.contact.email")}</div>
            <a href="mailto:www.agborclauvet@gmail.com" className="text-sm text-muted-foreground hover:text-primary transition-colors break-all">www.agborclauvet@gmail.com</a>
          </CardContent></Card>
          <Card><CardContent className="pt-6 text-center">
            <Clock className="mx-auto mb-2 h-6 w-6 text-primary" />
            <div className="text-sm font-semibold">{t("home.contact.hours")}</div>
          </CardContent></Card>
        </div>
      </section>

      <Footer />
    </div>
  );
}
