import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { loadStoredLanguage } from "@/i18n";
import { initSentry, captureSentryException } from "@/lib/sentry";
import { WhatsAppButton } from "@/components/layout/WhatsAppButton";
import logoUrl from "@/assets/brand/claugas-express-logo.webp";

function NotFoundComponent() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t("notFound.title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("notFound.body")}</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("notFound.goHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  captureSentryException(error);
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t("errorPage.title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("errorPage.body")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("errorPage.tryAgain")}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t("errorPage.goHome")}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ClauGas — Smart Gas Delivery for Buea" },
      {
        name: "description",
        content:
          "Fast, safe and reliable cooking gas cylinder delivery across Buea — Molyko, Great Soppo, GRA, Bonduma and more. Order anytime with live tracking and secure payment.",
      },
      { property: "og:title", content: "ClauGas — Smart Gas Delivery for Buea" },
      {
        property: "og:description",
        content:
          "Fast, safe and reliable cooking gas cylinder delivery across Buea. Order anytime with live tracking and secure payment.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "ClauGas — Smart Gas Delivery for Buea" },
      {
        name: "twitter:description",
        content:
          "Fast, safe and reliable cooking gas cylinder delivery across Buea. Order anytime with live tracking and secure payment.",
      },
      {
        property: "og:image",
        content: `https://claugas-foundation.vercel.app${logoUrl}`,
      },
      {
        name: "twitter:image",
        content: `https://claugas-foundation.vercel.app${logoUrl}`,
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: logoUrl },
      { rel: "canonical", href: "https://claugas-foundation.vercel.app/" },
    ],
    scripts: [
      {
        attrs: { type: "application/ld+json" },
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: "ClauGas",
          description:
            "Fast, safe and reliable cooking gas cylinder delivery across Buea, Cameroon.",
          url: "https://claugas-foundation.vercel.app/",
          image: `https://claugas-foundation.vercel.app${logoUrl}`,
          telephone: "+237650556715",
          email: "www.agborclauvet@gmail.com",
          priceRange: "XAF",
          areaServed: {
            "@type": "City",
            name: "Buea",
          },
          address: {
            "@type": "PostalAddress",
            addressLocality: "Buea",
            addressRegion: "South-West Region",
            addressCountry: "CM",
          },
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        {/* Applies the saved/system theme before first paint to avoid a light/dark flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('claugas-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    initSentry();
  }, []);

  useEffect(() => {
    loadStoredLanguage();
  }, []);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster richColors position="top-right" />
      <WhatsAppButton />
    </QueryClientProvider>
  );
}
